// studio-ai-mcp — MCP server for Roblox Studio
// Entry point: node src/index.js

const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { CallToolRequestSchema, ListToolsRequestSchema } = require("@modelcontextprotocol/sdk/types.js");

const server = new Server(
  { name: "studio-ai-mcp", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

// --- Tool definitions ---
const tools = [
  {
    name: "validate_model",
    description: "Validate a Roblox model's hierarchy, rig, and animation readiness.",
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
    description: "Check the status of the Blender->Roblox asset pipeline.",
    inputSchema: {
      type: "object",
      properties: {
        pipelineDir: { type: "string", description: "Path to the pipeline directory" },
      },
      required: ["pipelineDir"],
    },
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "validate_model") {
    // Placeholder: real implementation will connect to Studio via MCP bridge
    return {
      content: [{ type: "text", text: `validate_model called for: ${args.modelPath}\n(Implementation pending: requires Studio MCP bridge)` }],
    };
  }

  if (name === "pipeline_status") {
    const fs = require("fs");
    const path = require("path");
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

  return { content: [{ type: "text", text: `Unknown tool: ${name}` }] };
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("studio-ai-mcp server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});