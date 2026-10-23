# studio-ai-mcp

MCP server for Roblox Studio — AI-powered game development tools.

## Overview

This MCP server provides tools for Roblox Studio that go beyond the official MCP, including:
- **Asset validation** — validate model hierarchy, rig, and animation readiness
- **Pipeline management** — check status of the Blender → Roblox asset pipeline
- *(Planned)* Automated FBX import, rig validation, and Play Test orchestration

## Installation

```bash
npm install
```

## Usage

### As MCP server (stdio)

Add to your OpenCode config (`~/.config/opencode/opencode.json`):

```json
{
  "mcp": {
    "studio-ai-mcp": {
      "type": "local",
      "command": ["node", "path/to/studio-ai-mcp/src/index.js"],
      "enabled": true
    }
  }
}
```

### Standalone

```bash
node src/index.js
```

## Tools

### `validate_model`

Generate a Luau validation script for a Roblox model (hierarchy, rig, animation readiness). Run the returned code via `execute_luau` in Studio.

**Parameters:**
- `modelPath` (string, required) — Path to the model in Studio (e.g. `Workspace.PilotMonster`)

### `pipeline_status`

Check the status of the Blender → Roblox asset pipeline.

**Parameters:**
- `pipelineDir` (string, required) — Path to the pipeline directory

### `import_fbx_instructions`

Return step-by-step instructions for importing an FBX file into Roblox Studio, plus a post-import validation script.

**Parameters:**
- `fbxPath` (string, required) — Path to the FBX file
- `targetName` (string, required) — Name for the imported model in Studio

### `run_playtest_checklist`

Generate a checklist of Play Test validation steps for a model/feature.

**Parameters:**
- `feature` (string, required) — Feature to test (e.g. "block animation", "combat transitions")

### `generate_validation_script`

Generate a Luau script that validates a model's structure (meshes, armature, animations, attributes).

**Parameters:**
- `modelPath` (string, required) — Path to the model in Studio
- `checks` (array, optional) — Checks to perform: "hierarchy", "rig", "animation", "attributes"

### `validate_rig`

Generate a Luau script that validates a model's rig (AnimationConstraint vs Motor6D, bone count, bone names, Humanoid/RigType).

**Parameters:**
- `modelPath` (string, required) — Path to the model in Studio

### `validate_animation`

Generate a Luau script that validates animations in a model (KeyframeSequence, Animation instances, duration, loop, bones, Animator tracks).

**Parameters:**
- `modelPath` (string, required) — Path to the model in Studio
- `animName` (string, optional) — Expected animation name

### `playtest_orchestrate`

Generate a full Play Test orchestration checklist for a model/feature, including start, actions, validation, screenshot, and stop.

**Parameters:**
- `modelPath` (string, required) — Path to the model to test
- `actions` (array, optional) — Actions to perform (e.g. "block", "attack", "dodge")

### `generate_studio_plugin`

Generate a Roblox Studio plugin (Luau) that exposes a local validation API via BindableFunction. Install in Studio to enable automated validation.

**Parameters:**
- `pluginName` (string, optional) — Name for the plugin (default: StudioAIValidator)

### `bridge_check`

Check if the Studio MCP bridge is available and report connection status, capabilities, and limitations.

**Returns:** JSON with source files, export files, and report files.

## Pipeline

The asset pipeline follows this structure:

```
assets/pipeline/
├── 01-source/    # Original .blend files (never overwrite)
├── 02-export/    # Exported FBX/glTF ready for Roblox import
└── 03-reports/   # JSON validation reports
```

Validation script: `tools/blender/validate_export.py`

## Roadmap

- [ ] FBX import via Studio bridge
- [ ] Rig validation (AnimationConstraint/Motor6D detection)
- [ ] Animation playback verification
- [ ] Play Test orchestration with screenshot capture
- [ ] Integration with official Roblox Studio MCP

## License

MIT