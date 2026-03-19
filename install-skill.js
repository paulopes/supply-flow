#!/usr/bin/env node
/**
 * install-skill.js — Install the supply-flow skill for Claude Code
 *
 * Copies skill/supply-flow-SKILL.md to ~/.claude/skills/supply-flow/SKILL.md
 * so that Claude Code can use it as a project-independent skill.
 *
 * Usage:
 *   npm run install-skill
 *   node install-skill.js
 */

"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");

const ROOT = __dirname;
const SKILL_SRC = path.join(ROOT, "skill", "supply-flow-SKILL.md");

function ok(msg) { console.log(`\x1b[32m✓\x1b[0m ${msg}`); }
function warn(msg) { console.log(`\x1b[33m!\x1b[0m ${msg}`); }
function fail(msg) { console.error(`\x1b[31m✗\x1b[0m ${msg}`); process.exit(1); }

function home() {
  return process.env.HOME || process.env.USERPROFILE || os.homedir();
}

const SKILL_DIR = path.join(home(), ".claude", "skills", "supply-flow");
const SKILL_DEST = path.join(SKILL_DIR, "SKILL.md");

console.log("\n  supply-flow Skill Installer  →  Claude Code\n");

if (!fs.existsSync(SKILL_SRC)) {
  fail("Skill source not found at " + SKILL_SRC);
}

fs.mkdirSync(SKILL_DIR, { recursive: true });
fs.copyFileSync(SKILL_SRC, SKILL_DEST);
ok(`Skill installed → ${SKILL_DEST}`);

console.log(`\n\x1b[32mDone!\x1b[0m The supply-flow skill is now available in Claude Code.\n`);
console.log("  Claude Code will use this skill to guide diagram generation.");
console.log("  To use the MCP server instead, run: npm run install-mcp\n");
