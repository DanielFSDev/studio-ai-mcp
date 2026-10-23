// tools/test-mcp.js — Test the MCP server by sending a tools/list request
const { spawn } = require("child_process");
const path = require("path");

const server = spawn("node", [path.join(__dirname, "..", "src", "index.js")], {
  stdio: ["pipe", "pipe", "pipe"],
});

let output = "";
server.stdout.on("data", (data) => {
  output += data.toString();
  try {
    const parsed = JSON.parse(output);
    console.log("Tools:", parsed.result.tools.map((t) => t.name).join(", "));
    server.kill();
  } catch (e) {
    // incomplete JSON, wait for more data
  }
});

server.stderr.on("data", (data) => {
  console.error("stderr:", data.toString().trim());
});

server.on("close", (code) => {
  process.exit(code || 0);
});

server.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }) + "\n");
server.stdin.end();