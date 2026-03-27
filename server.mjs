import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

// Resolve __dirname equivalent for ESM
const __dirname = import.meta.dirname;

// Locate the skill dir — works from both source (server.mjs) and build output
const SKILL_PATH = path.join(__dirname, "skill", "supply-flow-SKILL.md");

// Import the supply-flow generator (CJS module)
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { generateDiagram } = require("./skill/supply-flow.js");

/**
 * Creates a new MCP server instance with the supply-flow tool and UI resource.
 */
export function createServer() {
  const server = new McpServer({
    name: "supply-flow",
    version: "1.0.0",
  });

  const resourceUri = "ui://supply-flow/mcp-app.html";
  const skillGuideUri = "docs://supply-flow/skill-guide";

  // ── Tool: generate-supply-flow-diagram ──────────────────────────────────────────────
  //
  // Accepts a full supply-flow JSON config object and returns the generated
  // self-contained HTML diagram.  When called from an MCP Apps-capable host
  // the UI resource is also rendered inline.

  registerAppTool(
    server,
    "generate-supply-flow-diagram",
    {
      title: "Generate Supply Flow Diagram",
      description:
        "Generate self-contained, interactive HTML (or SVG) diagrams that map " +
        "the geographic flow of products through a supply chain. Each node " +
        "represents a company or facility, and edges represent the flow of " +
        "products between them. The diagram can be used to visualize and " +
        "analyze the supply chain, identify potential bottlenecks, and " +
        "optimize the flow of products.\n\n" +
        "IMPORTANT: Before calling this tool, call read-supply-flow-skill-guide " +
        "(or read the resource docs://supply-flow/skill-guide) for full JSON schema " +
        "details, guidance, potential resources, verification, and examples.\n\n",
      inputSchema: z.object({
        config: z
          .record(z.any())
          .describe(
            "The supply-flow JSON config object. Required fields: title (string), " +
            "product (object with name, category, and specs keys)." +
            "nodes (array of objects with id, label, location, role, " +
            "details, coveredList, coveredNote, and riskAssessment keys)."
          ),
        configDir: z
          .string()
          .optional()
          .describe(
            "Directory for resolving relative file paths. Defaults to cwd."
          ),
      }),
      _meta: { ui: { resourceUri } },
    },
    async ({ config, configDir }) => {
      try {
        const html = generateDiagram(config, configDir || process.cwd());
        return {
          content: [{ type: "text", text: html }],
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error: ${err.message}` }],
          isError: true,
        };
      }
    }
  );


  // ── Tool: read-skill-guide ──────────────────────────────────────────────
  //
  // Returns the full supply-flow SKILL.md as text so that clients which don't
  // support MCP resources can still fetch the schema documentation.

  server.tool(
    "read-supply-flow-skill-guide",
    "Return the full supply-flow skill guide (JSON schemas for all 8 layouts, " +
    "field references, canonical program colors, quality checklists, and " +
    "worked examples). Call this before generate-supply-flow-diagram to learn " +
    "how to structure the config object.",
    {},
    async () => {
      const text = await fs.readFile(SKILL_PATH, "utf-8");
      return { content: [{ type: "text", text }] };
    }
  );

  // ── Resource: skill guide ────────────────────────────────────────────────
  //
  // Exposes the supply-flow SKILL.md as a readable MCP resource so that AI
  // clients can fetch full layout schemas, examples, and quality checklists
  // before calling generate-supply-flow-diagram.

  server.resource(
    "skill-guide",
    skillGuideUri,
    {
      title: "supply-flow Skill Guide",
      description:
        "Complete documentation for the supply-flow diagram generator: " +
        "JSON schemas for all 8 layouts, field references, canonical " +
        "program colors, quality checklists, and worked examples. " +
        "Read this before calling generate-supply-flow-diagram.",
      mimeType: "text/markdown",
    },
    async (uri) => {
      const text = await fs.readFile(SKILL_PATH, "utf-8");
      return {
        contents: [{ uri: uri.toString(), mimeType: "text/markdown", text }],
      };
    }
  );

  // ── UI Resource ─────────────────────────────────────────────────────────
  //
  // Returns the bundled MCP App View HTML that renders diagrams inline
  // in the conversation.

  registerAppResource(
    server,
    resourceUri,
    resourceUri,
    { mimeType: RESOURCE_MIME_TYPE },
    async () => {
      const html = await fs.readFile(
        path.join(__dirname, "dist", "mcp-app.html"),
        "utf-8"
      );
      return {
        contents: [{ uri: resourceUri, mimeType: RESOURCE_MIME_TYPE, text: html }],
      };
    }
  );

  return server;
}
