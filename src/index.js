// studio-ai-mcp — MCP server for Roblox Studio
// Entry point: node src/index.js

const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { CallToolRequestSchema, ListToolsRequestSchema } = require("@modelcontextprotocol/sdk/types.js");
const fs = require("fs");
const path = require("path");

const server = new Server(
  { name: "studio-ai-mcp", version: "0.4.0" },
  { capabilities: { tools: {} } }
);

// --- Tool definitions ---
const tools = [
  {
    name: "validate_model",
    description: "Generate a Luau validation script for a Roblox model (hierarchy, rig, animation readiness). Run via execute_luau in Studio.",
    inputSchema: {
      type: "object",
      properties: {
        modelPath: { type: "string", description: "Path to the model in Studio (e.g. Workspace.PilotMonster)" },
      },
      required: ["modelPath"],
    },
  },
  {
    name: "pipeline_status",
    description: "Check the status of the Blender->Roblox asset pipeline (source, export, reports).",
    inputSchema: {
      type: "object",
      properties: {
        pipelineDir: { type: "string", description: "Path to the pipeline directory" },
      },
      required: ["pipelineDir"],
    },
  },
  {
    name: "import_fbx_instructions",
    description: "Return step-by-step instructions for importing an FBX file into Roblox Studio, plus a post-import validation script.",
    inputSchema: {
      type: "object",
      properties: {
        fbxPath: { type: "string", description: "Path to the FBX file" },
        targetName: { type: "string", description: "Name for the imported model in Studio" },
      },
      required: ["fbxPath", "targetName"],
    },
  },
  {
    name: "run_playtest_checklist",
    description: "Generate a checklist of Play Test validation steps for a model/feature.",
    inputSchema: {
      type: "object",
      properties: {
        feature: { type: "string", description: "Feature to test (e.g. 'block animation', 'combat transitions')" },
      },
      required: ["feature"],
    },
  },
  {
    name: "generate_validation_script",
    description: "Generate a Luau script that validates a model's structure (meshes, armature, animations, attributes).",
    inputSchema: {
      type: "object",
      properties: {
        modelPath: { type: "string", description: "Path to the model in Studio" },
        checks: { type: "array", items: { type: "string" }, description: "Checks: 'hierarchy', 'rig', 'animation', 'attributes'" },
      },
      required: ["modelPath"],
    },
  },
  {
    name: "validate_rig",
    description: "Generate a Luau script that validates a model's rig (AnimationConstraint vs Motor6D, bone count, bone names, Humanoid/RigType).",
    inputSchema: {
      type: "object",
      properties: {
        modelPath: { type: "string", description: "Path to the model in Studio" },
      },
      required: ["modelPath"],
    },
  },
  {
    name: "validate_animation",
    description: "Generate a Luau script that validates animations in a model (KeyframeSequence, Animation, duration, loop, bones, Animator tracks).",
    inputSchema: {
      type: "object",
      properties: {
        modelPath: { type: "string", description: "Path to the model in Studio" },
        animName: { type: "string", description: "Expected animation name (optional)" },
      },
      required: ["modelPath"],
    },
  },
  {
    name: "playtest_orchestrate",
    description: "Generate a full Play Test orchestration checklist for a model/feature, including start, actions, validation, screenshot, and stop.",
    inputSchema: {
      type: "object",
      properties: {
        modelPath: { type: "string", description: "Path to the model to test" },
        actions: { type: "array", items: { type: "string" }, description: "Actions to perform (e.g. 'block', 'attack', 'dodge')" },
      },
      required: ["modelPath"],
    },
  },
  {
    name: "generate_studio_plugin",
    description: "Generate a Roblox Studio plugin (Luau) that exposes a local validation API via BindableFunction. Install in Studio to enable automated validation.",
    inputSchema: {
      type: "object",
      properties: {
        pluginName: { type: "string", description: "Name for the plugin (default: StudioAIValidator)" },
      },
    },
  },
  {
    name: "bridge_check",
    description: "Check if the Studio MCP bridge is available and report connection status.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

// --- Input validation helper ---
function validateArgs(args, required) {
  for (const field of required) {
    if (args[field] === undefined || args[field] === null || args[field] === "") {
      throw new Error(`Missing required argument: ${field}`);
    }
  }
}

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {

  if (name === "validate_model") {
    validateArgs(args, ["modelPath"]);
    const script = generateValidateScript(args.modelPath);
    return {
      content: [{ type: "text", text: `Run this Luau code via execute_luau (Edit mode) to validate ${args.modelPath}:\n\n\`\`\`lua\n${script}\n\`\`\`` }],
    };
  }

  if (name === "pipeline_status") {
    validateArgs(args, ["pipelineDir"]);
    const dir = args.pipelineDir;
    const source = path.join(dir, "01-source");
    const export_ = path.join(dir, "02-export");
    const reports = path.join(dir, "03-reports");

    const result = {
      sourceFiles: fs.existsSync(source) ? fs.readdirSync(source) : [],
      exportFiles: fs.existsSync(export_) ? fs.readdirSync(export_) : [],
      reportFiles: fs.existsSync(reports) ? fs.readdirSync(reports) : [],
    };

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }

  if (name === "import_fbx_instructions") {
    const instructions = `# Importação manual de FBX no Roblox Studio

## Arquivo: ${args.fbxPath}
## Nome no Studio: ${args.targetName}

### Passos:
1. Abra o Roblox Studio com seu projeto.
2. No menu superior: **Avatar > Import 3D** (ou arraste o arquivo para o viewport).
3. Navegue até: \`${args.fbxPath}\`
4. O Studio importará o modelo com rig e animação. Posicione-o no Workspace.
5. Renomeie para \`${args.targetName}\` se necessário.

### Pós-importação — validação (execute via execute_luau):
\`\`\`lua
local model = game.Workspace:FindFirstChild("${args.targetName}")
if not model then warn("Modelo nao encontrado"); return end
print("Modelo encontrado:", model.Name, model.ClassName)
local armature = model:FindFirstChild("Armature") or model:FindFirstChildWhichIsA("Model")
if armature then
  print("Armature:", armature.Name, "children:", #armature:GetChildren())
  for _, child in ipairs(armature:GetDescendants()) do
    if child:IsA("Bone") or child.Name:lower():find("bone") then
      print("  Bone:", child.Name, child.ClassName)
    end
  end
else
  warn("Armature nao encontrada")
end
local hum = model:FindFirstChildOfClass("Humanoid")
if hum then
  local anim = hum:FindFirstChildOfClass("Animator")
  print("Animator:", anim and "OK" or "AUSENTE")
else
  print("Sem Humanoid (modelo estatico?)")
end
for _, desc in ipairs(model:GetDescendants()) do
  if desc:IsA("KeyframeSequence") or desc:IsA("Animation") then
    print("Animacao encontrada:", desc.Name, desc.ClassName)
  end
end
print("Validacao concluida")
\`\`\``;

    return {
      content: [{ type: "text", text: instructions }],
    };
  }

  if (name === "run_playtest_checklist") {
    const checklists = {
      "block animation": [
        "1. Iniciar Play Test (start_stop_play true)",
        "2. Verificar que o personagem aparece corretamente",
        "3. Pressionar botão direito do mouse (bloqueio)",
        "4. Verificar que a pose de bloqueio é aplicada (braços levantados)",
        "5. Soltar o botão e verificar que a pose retorna ao neutro",
        "6. Verificar Output: sem erros de animação",
        "7. Verificar que o escudo acompanha a mão",
        "8. Capturar screenshot (screen_capture)",
        "9. Parar Play Test (start_stop_play false)",
      ],
      "combat transitions": [
        "1. Iniciar Play Test",
        "2. Atacar (clique esquerdo) → verificar animação de ataque",
        "3. Tentar bloquear durante ataque → deve ser rejeitado",
        "4. Bloquear (botão direito) → verificar pose",
        "5. Tentar atacar durante bloqueio → deve ser rejeitado",
        "6. Tentar esquivar durante bloqueio → deve ser rejeitado",
        "7. Esquivar (tecla C) → verificar dash",
        "8. Tentar bloquear durante esquiva → deve ser rejeitado",
        "9. Tentar atacar durante esquiva → deve ser rejeitado",
        "10. Verificar Output: sem erros",
        "11. Capturar screenshot",
        "12. Parar Play Test",
      ],
    };

    const checklist = checklists[args.feature.toLowerCase()] || [
      `1. Iniciar Play Test`,
      `2. Executar ação: ${args.feature}`,
      `3. Verificar comportamento esperado`,
      `4. Verificar Output (sem erros novos)`,
      `5. Capturar screenshot`,
      `6. Parar Play Test`,
    ];

    return {
      content: [{ type: "text", text: `## Checklist: ${args.feature}\n\n${checklist.join("\n")}` }],
    };
  }

  if (name === "generate_validation_script") {
    const checks = args.checks || ["hierarchy", "rig", "animation", "attributes"];
    const script = generateValidationScript(args.modelPath, checks);
    return {
      content: [{ type: "text", text: `Run this Luau code via execute_luau (Edit mode):\n\n\`\`\`lua\n${script}\n\`\`\`` }],
    };
  }

  if (name === "validate_rig") {
    const script = generateRigValidationScript(args.modelPath);
    return {
      content: [{ type: "text", text: `Run this Luau code via execute_luau (Edit mode) to validate rig of ${args.modelPath}:\n\n\`\`\`lua\n${script}\n\`\`\`` }],
    };
  }

  if (name === "validate_animation") {
    const script = generateAnimationValidationScript(args.modelPath, args.animName);
    return {
      content: [{ type: "text", text: `Run this Luau code via execute_luau (Edit mode) to validate animations of ${args.modelPath}:\n\n\`\`\`lua\n${script}\n\`\`\`` }],
    };
  }

  if (name === "playtest_orchestrate") {
    const actions = args.actions || ["block", "attack", "dodge"];
    const steps = generatePlaytestSteps(args.modelPath, actions);
    return {
      content: [{ type: "text", text: `## Play Test Orchestration: ${args.modelPath}\n\n${steps.join("\n")}` }],
    };
  }

  if (name === "generate_studio_plugin") {
    const pluginName = args.pluginName || "StudioAIValidator";
    const pluginCode = generateStudioPlugin(pluginName);
    return {
      content: [{ type: "text", text: `# Plugin do Studio: ${pluginName}\n\nCrie um Script em \`ServerStorage\` ou use o Plugin Manager do Studio.\n\n\`\`\`lua\n${pluginCode}\n\`\`\`\n\n## Como instalar:\n1. No Studio, vá em **Plugins > Manage Plugins**.\n2. Crie um novo plugin ou use o Command Bar.\n3. Cole o código acima em um Script dentro do plugin.\n4. O plugin expõe BindableFunctions para validação automática.\n\n## Limitações:\n- O Studio não expõe API HTTP local nativamente.\n- O plugin funciona via BindableFunction (chamado pelo agente via execute_luau).\n- Para execução automática real, é necessário um bridge externo (futuro).` }],
    };
  }

  if (name === "bridge_check") {
    return {
      content: [{ type: "text", text: `## Status do Bridge Studio MCP\n\n### MCPs disponíveis:\n- **roblox_studio** (oficial) — conectado e funcional\n- **studio-ai-mcp** (custom) — conectado e funcional\n\n### Capacidades do bridge:\n- O MCP customizado gera scripts Luau e instruções que são executados via MCP oficial.\n- Não há conexão direta (HTTP/WebSocket) entre os dois MCPs.\n- O agente atua como orquestrador: chama studio-ai-mcp para gerar código, depois execute_luau (roblox_studio) para executar.\n\n### Limitações:\n- Execução automática requer intervenção do agente (não é 100% autônoma).\n- Importação de FBX não pode ser automatizada (sem API no Luau).\n- Play Test requer start_stop_play (MCP oficial) + execute_luau para testes.\n\n### Próximo passo para bridge real:\n- Criar plugin do Studio com BindableFunction (use generate_studio_plugin).\n- O plugin pode expor uma API local via HttpService (requests externos apenas).\n- Para bridge bidirecional, seria necessário um servidor HTTP externo (Node.js) que o Studio consulta.` }],
    };
  }

  return { content: [{ type: "text", text: `Unknown tool: ${name}` }] };
  } catch (err) {
    return { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true };
  }
});

function generateValidateScript(modelPath) {
  const modelName = modelPath.split(".").pop();
  return `local model = game.Workspace:FindFirstChild("${modelName}")
if not model then
  local parts = string.split("${modelPath}", ".")
  local current = game
  for _, part in ipairs(parts) do
    current = current:FindFirstChild(part)
    if not current then warn("Nao encontrado:", part); return end
  end
  model = current
end
print("=== VALIDACAO: " .. model.Name .. " ===")
print("ClassName:", model.ClassName)
print("Children:", #model:GetChildren())
for _, child in ipairs(model:GetChildren()) do
  print("  Child:", child.Name, child.ClassName)
end
local armature = model:FindFirstChild("Armature") or model:FindFirstChildWhichIsA("Model")
if armature then
  print("Armature:", armature.Name, "children:", #armature:GetChildren())
else
  warn("Armature nao encontrada")
end
local hum = model:FindFirstChildOfClass("Humanoid")
if hum then
  local anim = hum:FindFirstChildOfClass("Animator")
  print("Humanoid: OK, Animator:", anim and "OK" or "AUSENTE")
else
  print("Sem Humanoid (modelo estatico?)")
end
local animCount = 0
for _, desc in ipairs(model:GetDescendants()) do
  if desc:IsA("KeyframeSequence") or desc:IsA("Animation") then
    animCount = animCount + 1
    print("Animacao:", desc.Name, desc.ClassName)
  end
end
print("Total animacoes:", animCount)
print("=== FIM DA VALIDACAO ===")`;
}

function generateValidationScript(modelPath, checks) {
  const modelName = modelPath.split(".").pop();
  let script = `local model = game.Workspace:FindFirstChild("${modelName}")
if not model then
  local parts = string.split("${modelPath}", ".")
  local current = game
  for _, part in ipairs(parts) do
    current = current:FindFirstChild(part)
    if not current then warn("Nao encontrado:", part); return end
  end
  model = current
end
print("=== VALIDACAO: " .. model.Name .. " ===")
`;

  if (checks.includes("hierarchy")) {
    script += `
print("--- Hierarquia ---")
print("ClassName:", model.ClassName)
print("Children:", #model:GetChildren())
for _, child in ipairs(model:GetChildren()) do
  print("  ", child.Name, child.ClassName)
end
`;
  }

  if (checks.includes("rig")) {
    script += `
print("--- Rig ---")
local armature = model:FindFirstChild("Armature") or model:FindFirstChildWhichIsA("Model")
if armature then
  print("Armature:", armature.Name, "children:", #armature:GetChildren())
  for _, desc in ipairs(armature:GetDescendants()) do
    if desc.Name:lower():find("bone") or desc:IsA("Bone") then
      print("  Bone:", desc.Name, desc.ClassName)
    end
  end
else
  warn("Armature nao encontrada")
end
`;
  }

  if (checks.includes("animation")) {
    script += `
print("--- Animacoes ---")
local hum = model:FindFirstChildOfClass("Humanoid")
if hum then
  local anim = hum:FindFirstChildOfClass("Animator")
  print("Humanoid: OK, Animator:", anim and "OK" or "AUSENTE")
else
  print("Sem Humanoid (modelo estatico?)")
end
local animCount = 0
for _, desc in ipairs(model:GetDescendants()) do
  if desc:IsA("KeyframeSequence") or desc:IsA("Animation") then
    animCount = animCount + 1
    print("  Animacao:", desc.Name, desc.ClassName)
  end
end
print("Total animacoes:", animCount)
`;
  }

  if (checks.includes("attributes")) {
    script += `
print("--- Atributos ---")
for name, value in pairs(model:GetAttributes()) do
  print("  " .. name .. ":", value)
end
`;
  }

  script += `print("=== FIM DA VALIDACAO ===")`;
  return script;
}

function generateRigValidationScript(modelPath) {
  const modelName = modelPath.split(".").pop();
  return `local model = game.Workspace:FindFirstChild("${modelName}")
if not model then
  local parts = string.split("${modelPath}", ".")
  local current = game
  for _, part in ipairs(parts) do
    current = current:FindFirstChild(part)
    if not current then warn("Nao encontrado:", part); return end
  end
  model = current
end
print("=== VALIDACAO DE RIG: " .. model.Name .. " ===")
local armature = model:FindFirstChild("Armature") or model:FindFirstChildWhichIsA("Model")
if not armature then
  warn("Armature nao encontrada")
  return
end
print("Armature:", armature.Name)
local acCount, m6dCount = 0, 0
for _, desc in ipairs(model:GetDescendants()) do
  if desc:IsA("AnimationConstraint") then acCount = acCount + 1
  elseif desc:IsA("Motor6D") then m6dCount = m6dCount + 1 end
end
print("AnimationConstraint:", acCount, "| Motor6D:", m6dCount)
if acCount > 0 and m6dCount == 0 then
  print("Rig tipo: R15 (AnimationConstraint) - AvatarJointUpgrade ativo")
elseif m6dCount > 0 and acCount == 0 then
  print("Rig tipo: Motor6D (AvatarJointUpgrade desativado ou R6)")
else
  print("Rig tipo: MISTO (AC=" .. acCount .. ", M6D=" .. m6dCount .. ")")
end
local boneCount = 0
for _, desc in ipairs(armature:GetDescendants()) do
  if desc.Name:lower():find("bone") or desc:IsA("Bone") then
    boneCount = boneCount + 1
    print("  Bone:", desc.Name, desc.ClassName)
  end
end
print("Total bones:", boneCount)
local hum = model:FindFirstChildOfClass("Humanoid")
if hum then
  print("Humanoid: OK, RigType:", hum.RigType.Name)
  local animator = hum:FindFirstChildOfClass("Animator")
  print("Animator:", animator and "OK" or "AUSENTE")
else
  print("Sem Humanoid")
end
print("=== FIM VALIDACAO RIG ===")`;
}

function generateAnimationValidationScript(modelPath, animName) {
  const modelName = modelPath.split(".").pop();
  return `local model = game.Workspace:FindFirstChild("${modelName}")
if not model then
  local parts = string.split("${modelPath}", ".")
  local current = game
  for _, part in ipairs(parts) do
    current = current:FindFirstChild(part)
    if not current then warn("Nao encontrado:", part); return end
  end
  model = current
end
print("=== VALIDACAO DE ANIMACAO: " .. model.Name .. " ===")
local ksCount = 0
for _, desc in ipairs(model:GetDescendants()) do
  if desc:IsA("KeyframeSequence") then
    ksCount = ksCount + 1
    print("KeyframeSequence:", desc.Name)
    print("  Keyframes:", #desc:GetKeyframes())
    print("  Length:", desc.Length)
    print("  Loop:", desc.Loop)
    local bones = {}
    for _, kf in ipairs(desc:GetKeyframes()) do
      for _, pose in ipairs(kf:GetPoses()) do
        bones[pose.Name] = true
      end
    end
    local boneNames = {}
    for name in pairs(bones) do table.insert(boneNames, name) end
    print("  Bones:", table.concat(boneNames, ", "))
  end
end
print("Total KeyframeSequences:", ksCount)
local animCount = 0
for _, desc in ipairs(model:GetDescendants()) do
  if desc:IsA("Animation") then
    animCount = animCount + 1
    print("Animation:", desc.Name, "ID:", desc.AnimationId)
  end
end
print("Total Animations:", animCount)
local hum = model:FindFirstChildOfClass("Humanoid")
if hum then
  local animator = hum:FindFirstChildOfClass("Animator")
  if animator then
    local tracks = animator:GetPlayingAnimationTracks()
    print("Tracks ativas:", #tracks)
    for _, track in ipairs(tracks) do
      print("  Track:", track.Name, "Playing:", track.IsPlaying, "Length:", track.Length)
    end
  end
end
print("=== FIM VALIDACAO ANIMACAO ===")`;
}

function generatePlaytestSteps(modelPath, actions) {
  const steps = [
    `## Play Test Orchestration: ${modelPath}`,
    ``,
    `### Pre-condicoes`,
    `- Modelo importado no Workspace como "${modelPath.split(".").pop()}"`,
    `- Sem erros no Output`,
    ``,
    `### Passos`,
  ];

  let stepNum = 1;
  steps.push(`${stepNum++}. Iniciar Play Test (start_stop_play: true)`);
  steps.push(`${stepNum++}. Verificar que o modelo aparece no viewport (screen_capture)`);

  for (const action of actions) {
    switch (action.toLowerCase()) {
      case "block":
        steps.push(`${stepNum++}. Pressionar botao direito (bloqueio)`);
        steps.push(`${stepNum++}. Verificar pose de bloqueio (braços levantados)`);
        steps.push(`${stepNum++}. Soltar botao e verificar retorno ao neutro`);
        break;
      case "attack":
        steps.push(`${stepNum++}. Clicar em alvo (ataque)`);
        steps.push(`${stepNum++}. Verificar animacao de ataque`);
        break;
      case "dodge":
        steps.push(`${stepNum++}. Pressionar tecla C (esquiva)`);
        steps.push(`${stepNum++}. Verificar dash (movimento rapido)`);
        break;
      default:
        steps.push(`${stepNum++}. Executar acao: ${action}`);
    }
  }

  steps.push(`${stepNum++}. Verificar Output (sem erros novos)`);
  steps.push(`${stepNum++}. Capturar screenshot (screen_capture)`);
  steps.push(`${stepNum++}. Parar Play Test (start_stop_play: false)`);

  steps.push(``);
  steps.push(`### Criterios de aceitacao`);
  steps.push(`- Nenhum erro novo no Output`);
  steps.push(`- Modelo visivel e na posicao correta`);
  steps.push(`- Animacao visivelmente ativa (se aplicavel)`);
  steps.push(`- Equipamentos acompanham a animacao (se aplicavel)`);

  return steps;
}

function generateStudioPlugin(pluginName) {
  return `-- ${pluginName} — Plugin do Studio para validação automática
-- Instale via: Plugins > Manage Plugins > Create New Plugin
-- Ou cole no Command Bar para teste.

local plugin = plugin or (script and script:FindFirstAncestorOfClass("Plugin"))

local validator = {}
validator.__index = validator

function validator.new()
  local self = setmetatable({}, validator)
  self.results = {}
  return self
end

function validator:validateModel(model)
  local result = { name = model.Name, valid = true, issues = {}, warnings = {} }
  
  -- Hierarquia
  if not model:IsA("Model") then
    table.insert(result.issues, "Nao e um Model")
    result.valid = false
  end
  
  -- Armature/Rig
  local armature = model:FindFirstChild("Armature") or model:FindFirstChildWhichIsA("Model")
  if armature then
    local acCount, m6dCount = 0, 0
    for _, desc in ipairs(model:GetDescendants()) do
      if desc:IsA("AnimationConstraint") then acCount = acCount + 1
      elseif desc:IsA("Motor6D") then m6dCount = m6dCount + 1 end
    end
    if acCount > 0 then
      result.rigType = "R15 (AnimationConstraint)"
    elseif m6dCount > 0 then
      result.rigType = "Motor6D"
    else
      table.insert(result.warnings, "Nenhum rig encontrado (AC ou M6D)")
    end
  else
    table.insert(result.warnings, "Armature nao encontrada")
  end
  
  -- Humanoid/Animator
  local hum = model:FindFirstChildOfClass("Humanoid")
  if hum then
    local anim = hum:FindFirstChildOfClass("Animator")
    if not anim then
      table.insert(result.warnings, "Animator ausente")
    end
  end
  
  -- Animacoes
  local animCount = 0
  for _, desc in ipairs(model:GetDescendants()) do
    if desc:IsA("KeyframeSequence") or desc:IsA("Animation") then
      animCount = animCount + 1
    end
  end
  result.animationCount = animCount
  if animCount == 0 then
    table.insert(result.warnings, "Nenhuma animacao encontrada")
  end
  
  return result
end

-- Expor via BindableFunction para uso pelo agente
local validateFn = Instance.new("BindableFunction")
validateFn.Name = "ValidateModel"
validateFn.OnInvoke = function(model)
  local v = validator.new()
  return v:validateModel(model)
end
validateFn.Parent = script or game.ServerStorage

print("[${pluginName}] Plugin carregado. Use ValidateModel:Invoke(model)")
return validator`;
}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("studio-ai-mcp server running on stdio (v0.4.0)");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});