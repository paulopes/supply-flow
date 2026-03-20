# supply-flow — Geographic Supply Chain Flow Diagrams

A skill for Claude.ai Projects that generates self-contained, interactive HTML (or SVG) diagrams that map the geographic flow of products through a supply chain.

## What It Does

You provide a part number and optionally a description of the part, or AI agent determines all supply chain pariticpants, their owners and subsidiaries, their risk level, and this tool produces an interactive diagram showing the flow of the product along its supply chain.

Each node represents a supply chain participant (manufacturer, assembler, distributor, etc.) placed at its real-world coordinates on an Americas-centered equirectangular map. Flows are rendered as curved arrows between nodes.

The tool is designed for **supply chain compliance screening** — particularly FCC Covered List, BIS Entity List, and CSL screening under 47 CFR Part 2 and 47 U.S.C. § 1601. It supports risk assessment popovers, FCC/BIS/CSL links, corporate ownership trees, and multiple scenario generation when manufacturer identity is uncertain.

## Files

This skill consists of two files:

| File | Purpose |
|------|---------|
| `supply-flow-SKILL.md` | Skill spec — tells Claude how to structure the data files and run the tool |
| `supply-flow.js` | Node.js script — reads a `.json` config and `.mmd` flowchart, outputs a styled HTML page |

## Setup

1. Open the Claude.ai project page with the chats where you want to be able to use this skill
2. Upload both `supply-flow-SKILL.md` and `supply-flow.js` to the project's sidebar where the project's reference files are listed (if you drag-drop the files you'll see that as you drop the files the landing area is called **Project Knowledge**)

That's it. Claude will recognize supply flow diagram requests automatically and follow the skill spec. At the start of each conversation that uses the skill, Claude copies `supply-flow.js` from the uploads into its working environment and runs it with Node.js.

Alternatively, while in a Claude.ai chat, tell it that you want to use the skill that is in the files `supply-flow-SKILL.md` and `supply-flow.js`, which you will have directly uploaded to the chat. However, this alternate method only makes the skill available to that chat.

## Usage

Ask Claude to create a supply flow diagram. For example:

> "Create a supply flow diagram for part number 123456789 described as a CPE with 4 Gigabit Ethernet ports."

Claude will:

1. Research the relevant online information of the part number  (preferably helped by the description you can optionally provide to narrow down the possible suppliers)
2. Create a `.json` config with all the resulting information
3. Run `supply-flow.js` to generate the HTML
4. Return the interactive HTML file

## How It Works

The skill splits the work into data and rendering:

**Data layer** — Claude creates a JSON file that holds the collected information about the part's supply chain.

**Rendering** — `supply-flow.js` reads the JSON file and assembles a single self-contained HTML page or SVG file, containing no javascript. All the interactivity, such as node pop-ups and suppliers and corporate ownership hierarchy trees' expansion/collapse, is done using CSS.

## Requirements

- A Claude.ai Project with file creation enabled
- Node.js is available in Claude's container environment by default — no additional setup needed
- The generated HTML files work in any modern browser

## Customization

### Role Colors (built-in)

| Role | Color | Hex |
|---|---|---|
| manufacturer | Blue | `#2b6cb0` |
| assembler | Purple | `#6b21a8` |
| oem | Amber | `#b45309` |
| distributor | Teal | `#0e7490` |
| operator | Green | `#15803d` |
| regulatory | Rose | `#9f1239` |

Custom roles can be defined via a top-level `"roles"` object in the config.