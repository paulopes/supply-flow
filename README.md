# supply-flow

Generate self-contained, interactive HTML (or SVG) diagrams that map the geographic flow of products through a supply chain. Each node represents a supply chain participant (manufacturer, assembler, distributor, etc.) placed at its real-world coordinates on an Americas-centered equirectangular map. Flows are rendered as curved arrows between nodes.

The tool is designed for **supply chain compliance screening** — particularly FCC Covered List, BIS Entity List, and CSL screening under 47 CFR Part 2 and 47 U.S.C. § 1601. It supports risk assessment popovers, FCC/BIS/CSL links, corporate ownership trees, and multiple scenario generation when manufacturer identity is uncertain.

## Install

```bash
git clone git@github.com:paulopes/supply-flow.git && cd supply-flow
npm install
npm link
```

This makes `supply-flow` and `mcp-supply-flow` available as global commands.

## Usage

```bash
supply-flow <config.json> [--output <file.html>]
```

Options:
  - `-o, --output` <file>   Output HTML file (default: derived from config filename)           Show usage help

    > **Note:** If `--output` (or `-o`) is omitted, the output filename is derived from the part number and a scenario letter to separate each potential alternative scenario for the supply flow of a particular produt's part number.
    > **Note 2:** The `output` field in the config.json file controls the format (`"html"` or `"svg"`) and is not controlled by a command line argument.

### Example

```bash
supply-flow contributions.json
```

## Config File

The JSON config defines the diagram type, content, and metadata. Please see the [supply-flow-SKILL.md](skill/supply-flow-SKILL.md) file for details.

## Output

A self-contained HTML file with:

- An interactive diagram that is partially rendered client-side
- Clickable nodes that display supply-flow reference popups and acronym tooltips

## Claude Code Skill

You can install supply-flow as a [Claude Code skill](https://docs.anthropic.com/en/docs/claude-code) so that `/supply-flow` generates new diagram sets from a description.

Copy the `skill/supply-flow-SKILL.md` file into your Claude Code skills directory inside a `supply-flow` subdirectory:

**macOS / Linux:**
```bash
mkdir -p ~/.claude/skills/supply-flow
cp skill/supply-flow-SKILL.md ~/.claude/skills/supply-flow/SKILL.md
```

**Windows (PowerShell):**
```powershell
mkdir -Force "$env:USERPROFILE\.claude\skills\supply-flow"
copy skill\supply-flow-SKILL.md "$env:USERPROFILE\.claude\skills\supply-flow\SKILL.md"
```

> **Note:** You don't need to copy the supply-flow.js file because after typing `npm link` you made two globaly available commands:
- `supply-flow` to run the generator script from any directory;
- `mcp-supply-flow` to create a local project .mcp.json file for generic MCP clients or optionally to add this tool as an MCP server to popular MCP clients.

## Claude.ai Project Skill

You can also use supply-flow as a skill in a [Claude.ai](https://claude.ai) chat project (the online version, not Claude Code). See [INSTALLING-ONLINE-PROJECT-SKILL.md](INSTALLING-ONLINE-PROJECT-SKILL.md) for setup and usage instructions in a chat browser environment.


## MCP Tool

supply-flow is also available as an [MCP](https://modelcontextprotocol.io/) server, exposing a `generate-supply-flow-diagram` tool that any MCP-compatible client can call.

You may be asking: Why would you want to use the MCP tool in Claude Code instead of the skill? The reason is that the MCP tools is also an MCP app, which means that the result will be rendered in line with the chat.

### Setup

```bash
git clone git@github.com:paulopes/supply-flow.git && cd supply-flow
npm install
npm run build
```

### Running

**stdio transport** (for native MCP clients):
```bash
node supply-flow-mcp.js --stdio
```

For HTTP transport or other server variants, see `main.mjs` or `server.mjs`.

### Connecting from web apps on the same machine

When the server is running in HTTP mode, any web application on the same machine can connect to it at `http://localhost:3001/mcp` using the Streamable HTTP transport. CORS is enabled, so browser-based apps can call the `generate-supply-flow-diagram` tool directly.

> **Note:** For native MCP clients like Claude Code and Claude Desktop, use the automated installer (`npm run install-mcp`) which handles stdio transport configuration automatically.

### Installing in native MCP clients

For native desktop clients like Claude Code, Claude Desktop, VS Code, Cursor, Windsurf, Gemini CLI, Antigravity, and others, the server runs over stdio and is registered in each client's configuration file. An automated installer is provided:

```bash
npm run install-mcp                  # local .mcp.json (default)
npm run install-mcp:claude-code
npm run install-mcp:claude-desktop
npm run install-mcp:vscode
npm run install-mcp:cursor
npm run install-mcp:windsurf
npm run install-mcp:antigravity
npm run install-mcp:antigravity-global
npm run install-mcp:gemini-cli
npm run install-mcp:gemini-cli-global
```

See [INSTALLING-MCP-SERVER-TOOL.md](INSTALLING-MCP-SERVER-TOOL.md) for full details, manual setup steps, config file locations, and instructions for other clients (including Goose).

The `generate-supply-flow-diagram` tool accepts a `config` parameter (the same JSON schema described in [supply-flow-SKILL.md](skill/supply-flow-SKILL.md)) and returns a self-contained HTML diagram.

## MCP App

When used with an [MCP Apps](https://apps.extensions.modelcontextprotocol.io/api/)-capable host (Claude, ChatGPT, VS Code, etc.), the generated diagram renders **inline in the conversation** as an interactive view — no need to open a separate file.

The MCP App view is built automatically by `npm run build` and served as a `ui://` resource alongside the tool.

### Development

```bash
npm start
```

This starts both the MCP server and a Vite watcher that rebuilds the App view on changes.

## License

This project is licensed under the [Apache License 2.0](LICENSE).
