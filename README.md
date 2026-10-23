# studio-ai-mcp

Servidor MCP para o Roblox Studio — ferramentas de desenvolvimento de jogos com IA.

## Visão geral

Este servidor MCP fornece ferramentas para o Roblox Studio que vão além do MCP oficial, incluindo:

- **Validação de assets** — validar hierarquia, rig e prontidão de animação de modelos
- **Gerenciamento de pipeline** — verificar status do pipeline Blender → Roblox
- **Orquestração de testes** — gerar checklists de Play Test e scripts de validação
- **Geração de plugins** — criar plugins do Studio para validação automatizada

## Instalação

```bash
npm install
```

## Uso

### Como servidor MCP (stdio)

Adicione ao seu arquivo de configuração do OpenCode (`~/.config/opencode/opencode.json`):

```json
{
  "mcp": {
    "studio-ai-mcp": {
      "type": "local",
      "command": ["node", "caminho/para/studio-ai-mcp/src/index.js"],
      "enabled": true
    }
  }
}
```

### Standalone

```bash
node src/index.js
```

## Ferramentas

### `validate_model`

Gera um script Luau de validação completa de um modelo (hierarquia, rig, animação). Execute o código retornado via `execute_luau` no Studio.

**Parâmetros:**
- `modelPath` (string, obrigatório) — Caminho do modelo no Studio (ex.: `Workspace.PilotMonster`)

### `pipeline_status`

Verifica o status do pipeline Blender → Roblox.

**Parâmetros:**
- `pipelineDir` (string, obrigatório) — Caminho do diretório do pipeline

**Retorno:** JSON com arquivos de origem, exportação e relatórios.

### `import_fbx_instructions`

Retorna instruções passo a passo para importar um arquivo FBX no Roblox Studio, mais um script de validação pós-importação.

**Parâmetros:**
- `fbxPath` (string, obrigatório) — Caminho do arquivo FBX
- `targetName` (string, obrigatório) — Nome do modelo no Studio

### `run_playtest_checklist`

Gera um checklist de validação de Play Test para um modelo ou funcionalidade.

**Parâmetros:**
- `feature` (string, obrigatório) — Funcionalidade a testar (ex.: "block animation", "combat transitions")

### `generate_validation_script`

Gera um script Luau de validação customizável.

**Parâmetros:**
- `modelPath` (string, obrigatório) — Caminho do modelo no Studio
- `checks` (array, opcional) — Verificações a realizar: "hierarchy", "rig", "animation", "attributes"

### `validate_rig`

Gera um script Luau que valida o rig de um modelo (AnimationConstraint vs Motor6D, contagem de bones, nomes, Humanoid/RigType).

**Parâmetros:**
- `modelPath` (string, obrigatório) — Caminho do modelo no Studio

### `validate_animation`

Gera um script Luau que valida animações em um modelo (KeyframeSequence, Animation, duração, loop, bones, tracks do Animator).

**Parâmetros:**
- `modelPath` (string, obrigatório) — Caminho do modelo no Studio
- `animName` (string, opcional) — Nome esperado da animação

### `playtest_orchestrate`

Gera uma orquestração completa de Play Test para um modelo/funcionalidade, incluindo início, ações, validação, captura de tela e parada.

**Parâmetros:**
- `modelPath` (string, obrigatório) — Caminho do modelo a testar
- `actions` (array, opcional) — Ações a executar (ex.: "block", "attack", "dodge")

### `generate_studio_plugin`

Gera um plugin do Roblox Studio (Luau) que expõe uma API de validação local via BindableFunction.

**Parâmetros:**
- `pluginName` (string, opcional) — Nome do plugin (padrão: StudioAIValidator)

### `bridge_check`

Verifica se o bridge do Studio MCP está disponível e reporta status de conexão, capacidades e limitações.

## Pipeline de assets

O pipeline de assets segue esta estrutura:

```
assets/pipeline/
├── 01-source/    # Arquivos .blend originais (nunca sobrescrever)
├── 02-export/    # FBX/glTF exportados, prontos para importação no Roblox
└── 03-reports/   # Relatórios JSON de validação
```

Script de validação: `tools/blender/validate_export.py`

## Limitações conhecidas

- O MCP **não importa FBX automaticamente** (não há API no Luau/MCP para isso). A ferramenta `import_fbx_instructions` fornece instruções manuais + script de validação pós-importação.
- O MCP **não executa Play Test automaticamente** (requer MCP oficial do Studio). A ferramenta `playtest_orchestrate` gera um checklist completo.
- O MCP **não se conecta diretamente** ao MCP oficial do Roblox Studio. Funciona como um "gerador de scripts e instruções" que o agente executa via o MCP oficial.
- Para bridge real (execução automática), é necessário um plugin do Studio (ferramenta `generate_studio_plugin`) + servidor HTTP externo (futuro).

## Roadmap

- [ ] Conectar ao MCP oficial do Studio para execução automática (bridge)
- [ ] Implementar importação de FBX via API (se disponível)
- [ ] Adicionar validação de rig via API do Studio
- [ ] Orquestração de Play Test automatizada (requer bridge)

## Licença

MIT