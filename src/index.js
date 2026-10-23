// studio-ai-mcp — MCP server for Roblox Studio
// Entry point: node src/index.js

const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { CallToolRequestSchema, ListToolsRequestSchema } = require("@modelcontextprotocol/sdk/types.js");
const fs = require("fs");
const path = require("path");

const server = new Server(
  { name: "studio-ai-mcp", version: "0.2.0" },
  { capabilities: { tools: {} } }
);

// --- Tool definitions ---
const tools = [
  {
    name: "validate_model",
    description: "Generate a Luau validation script for a Roblox model (hierarchy, rig, animation readiness). Run the returned code via execute_luau in Studio.",
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
        fbxPath: { type: "string", description: "Path to the FBX file (e.g. assets/pipeline/02-export/pilot_monster.fbx)" },
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
        checks: { type: "array", items: { type: "string" }, description: "Checks to perform: 'hierarchy', 'rig', 'animation', 'attributes'" },
      },
      required: ["modelPath"],
    },
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "validate_model") {
    const script = generateValidateScript(args.modelPath);
    return {
      content: [{ type: "text", text: `Run this Luau code via execute_luau (Edit mode) to validate ${args.modelPath}:\n\n\`\`\`lua\n${script}\n\`\`\`` }],
    };
  }

  if (name === "pipeline_status") {
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
-- Verificar armature/rig
local armature = model:FindFirstChild("Armature") or model:FindFirstChildWhichIsA("Model")
if armature then
  print("Armature:", armature.Name, "children:", #armature:GetChildren())
  for _, child in ipairs(armature:GetDescendants()) do
    if child:IsA("Bone") or child.Name:find("Bone") then
      print("  Bone:", child.Name, child.ClassName)
    end
  end
else
  warn("Armature nao encontrada")
end
-- Verificar Animator
local hum = model:FindFirstChildOfClass("Humanoid")
if hum then
  local anim = hum:FindFirstChildOfClass("Animator")
  print("Animator:", anim and "OK" or "AUSENTE")
else
  print("Sem Humanoid (modelo estatico?)")
end
-- Verificar animacoes (KeyframeSequence)
for _, desc in ipairs(model:GetDescendants()) do
  if desc:IsA("KeyframeSequence") then
    print("Animacao encontrada:", desc.Name, "frames:", #desc:GetKeyframes())
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

  return { content: [{ type: "text", text: `Unknown tool: ${name}` }] };
});

function generateValidateScript(modelPath) {
  return `local model = game.Workspace:FindFirstChild("${modelPath.split(".")[1] || modelPath}")
if not model then
  -- tentar caminho completo
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
-- Verificar armature/rig
local armature = model:FindFirstChild("Armature") or model:FindFirstChildWhichIsA("Model")
if armature then
  print("Armature encontrada:", armature.Name)
  local boneCount = 0
  for _, desc in ipairs(armature:GetDescendants()) do
    if desc.Name:lower():find("bone") or desc:IsA("Bone") then
      boneCount = boneCount + 1
    end
  end
  print("Bones/Parts de rig:", boneCount)
else
  warn("Armature nao encontrada")
end
-- Verificar Animator
local hum = model:FindFirstChildOfClass("Humanoid")
if hum then
  local anim = hum:FindFirstChildOfClass("Animator")
  print("Humanoid: OK, Animator:", anim and "OK" or "AUSENTE")
else
  print("Sem Humanoid (modelo estatico?)")
end
-- Verificar animacoes
local animCount = 0
for _, desc in ipairs(model:GetDescendants()) do
  if desc:IsA("KeyframeSequence") or desc:IsA("Animation") then
    animCount = animCount + 1
    print("Animacao:", desc.Name, desc.ClassName)
  end
end
print("Total de animacoes encontradas:", animCount)
print("=== FIM DA VALIDACAO ===")`;
}

function generateValidationScript(modelPath, checks) {
  let script = `local model = game.Workspace:FindFirstChild("${modelPath.split(".").pop()}")
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
-- Hierarchy check
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
-- Rig check
print("--- Rig ---")
local armature = model:FindFirstChild("Armature") or model:FindFirstChildWhichIsA("Model")
if armature then
  print("Armature:", armature.Name, "children:", #armature:GetChildren())
  for _, desc in ipairs(armature:GetDescendants()) do
    if desc.Name:lower():find("bone") then
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
-- Animation check
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
-- Attributes check
print("--- Atributos ---")
for name, value in pairs(model:GetAttributes()) do
  print("  " .. name .. ":", value)
end
`;
  }

  script += `print("=== FIM DA VALIDACAO ===")`;
  return script;
}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("studio-ai-mcp server running on stdio (v0.2.0)");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});