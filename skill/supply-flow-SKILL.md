# supply-flow — Geographic Supply Chain Flow Diagrams

## Purpose

`supply-flow.js` generates self-contained, interactive HTML (or SVG) diagrams that map the geographic flow of products through a supply chain. Each node represents a supply chain participant (manufacturer, assembler, distributor, etc.) placed at its real-world coordinates on an Americas-centered equirectangular map. Flows are rendered as curved arrows between nodes.

The tool is designed for **supply chain compliance investigation and documentation** — particularly FCC Covered List, BIS Entity List, and CSL screening under 47 CFR Part 2 and 47 U.S.C. § 1601. The goal is not to exclude flagged entities but to **include them, research their full corporate ownership and subsidiary structures, and present the findings visually** so that compliance reviewers have a complete, documented picture. It supports risk assessment popovers, FCC/BIS/CSL links, corporate ownership trees with tiered warning highlights, and multiple scenario generation when manufacturer identity is uncertain.

## Required Files

| File | Size | Description |
|---|---|---|
| `supply-flow.js` | ~36 KB | Node.js generator script (no dependencies, land path embedded) |
| `research-state.js` | ~18 KB | Research state manager — enforces investigation phases, tracks per-part-number state, validates completeness |

The land path data (Natural Earth 110m, simplified with RDP eps=5 and small-island filtering, Americas-centered equirectangular projection `+proj=eqc +lon_0=-90` onto a 1400×700 canvas) is embedded directly in `supply-flow.js`. No external data files are needed. `research-state.js` creates per-part-number JSON state files in the working directory.

## Usage

```bash
node supply-flow.js <config.json> [-o output.html]
```

If `-o` is omitted, the output filename is derived from the config filename. The `output` field in the config controls the format (`"html"` or `"svg"`).

## Design Principles

- **No JavaScript in output** — all interactivity is pure CSS (`:hover`, `:focus`, `:has()`)
- **No company names in tool code** — all entity data comes from the JSON config
- **Self-contained output** — single HTML file, no external dependencies
- **SVG balloon popovers** — rounded-rect + triangle pointer as a single SVG `<path>` with `<feDropShadow>` filter, `<foreignObject>` for HTML text content inside
- **Popover z-order** — all popovers rendered in a separate `<g class="sf-popovers">` group at end of SVG (paints last), connected to node `:focus` state via CSS `:has()` selectors
- **WCAG-accessible colors** — six role colors meeting AA contrast on both the map and white backgrounds

## JSON Config Schema

```json
{
  "title": "Scenario title (rendered as small info line below the main header)",
  "subtitle": "Scenario subtitle (appended to title on the info line)",
  "product": {
    "name": "Part Number",
    "description": "Line-item description from the BOM or purchase order",
    "category": "passive | active | cable | module",
    "specs": "Detailed technical specs shown in node popover"
  },
  "output": "html",
  "map": {
    "autoCrop": true,
    "showGrid": true,
    "gridInterval": 30
  },
  "nodes": [ "..." ],
  "flows": [ "..." ],
  "corporateHierarchies": [ "..." ]
}
```

**Header rendering order:** The SVG header displays three lines: (1) `product.name` + " Supply Flow" as the bold title, (2) `product.description` as the subtitle if provided, (3) `title` and `subtitle` combined as a small scenario-info line. If no `product` is defined, `title` is used as the main title instead.

### Node Schema

```json
{
  "id": "unique-node-id",
  "label": "Display Name\nOptional Second Line",
  "location": {
    "city": "City Name",
    "country": "XX",
    "lat": 35.7,
    "lon": 139.7
  },
  "role": "manufacturer | assembler | oem | distributor | operator | regulatory",
  "details": "Free-text description shown in popover.",
  "coveredList": false,
  "coveredNote": "Optional note when coveredList is true.",
  "riskAssessment": {
    "geopoliticalRisk": "Free text.",
    "stateOwnership": "Free text.",
    "ownershipAffiliations": "Free text.",
    "fccCoveredList": "Not listed. | Listed — description.",
    "bisEntityList": "Not listed. | Listed — description.",
    "cslSearchName": "Entity name for CSL search link"
  }
}
```

- `coveredList: true` renders a dashed red circle and "⚠ Covered" badge
- `cslSearchName` generates a clickable link to `trade.gov/data-visualization/csl-search`
- Labels support `\n` for multi-line display on the map
- **Every node must represent a physical supply chain participant** — an entity that manufactures, assembles, distributes, sells, or operates the product. Regulatory bodies (FCC, USAC, NTIA, etc.) are not supply chain participants and must not appear as nodes. Regulatory authority is referenced via CFR citations in node details and corporate hierarchy sources, not as flow diagram nodes.

### Flow Schema

```json
{
  "from": "source-node-id",
  "to": "target-node-id",
  "label": "Optional flow label (shown on hover)",
  "color": "#hex",
  "dashed": false
}
```

Dashed flows conventionally indicate heritage/historical relationships or alternate paths.

### Corporate Hierarchy Schema

Rendered as nested tree cards below the map on the page background (not inside the map's white box). Each entity has two optional tree directions: `owners` (upward chain toward ultimate parent/state) and `subsidiaries` (downward chain toward controlled entities).

**Anchor entity rule:** Each entry in the `corporateHierarchies` array must be anchored at an entity that appears as a node on the map — typically a manufacturer, distributor, or assembler identified during the part number investigation. The anchor entity is the starting point: its `owners` array traces the ownership chain *upward* (parent company, ultimate parent, state affiliations), and its `subsidiaries` array traces controlled entities *downward*. Do not anchor at the top of the ownership chain with the map-node entity buried as a subsidiary — that inverts the perspective. For example, if the map shows a distributor as a node, the hierarchy anchor should be that distributor with its parent company in its `owners` array, not the parent as the anchor with the distributor buried as a subsidiary.

Both trees grow downward visually. The **Subsidiaries** tree uses left-side L-connectors; the **Owners** tree uses right-side mirrored connectors and is right-aligned. The trees are toggled via three CSS-only radio buttons per entity:

- **SHOW SUBSIDIARIES** (left) / **SHOW OWNERS** (right) — expand that tree
- **COLLAPSE TREE** (center) — appears when a tree is open; its clickable area expands to cover the active tree's tab position, and its text changes to match the active tree's name ("OWNERS" or "SUBSIDIARIES")
- When both trees are collapsed, only the two "SHOW" labels are visible

If an entity has no owners (or the JSON omits `owners`), the Owners panel shows a dashed placeholder card "No publicly known owners" as a tree child. Same for missing subsidiaries. Both tabs are always shown.

When any node in a tree has a `highlight` field, the corresponding tab label turns brown (`#b45309`) with a ⚠ symbol appended, signaling a compliance finding inside that tree without requiring expansion.

```json
{
  "name": "Entity Name",
  "role": "Ultimate Parent | Subsidiary (acquired YYYY) | JV Partner",
  "location": "City, State, Country",
  "share": "28.63%",
  "notes": "Stock code, employee count, product lines, etc.",
  "highlight": "Compliance finding — see Entity Screening below.",
  "source": {
    "url": "https://example.com/press-release",
    "label": "Source Name"
  },
  "owners": [ "...recursive, each with its own owners..." ],
  "subsidiaries": [ "...recursive, each with its own subsidiaries..." ]
}
```

- `share` — ownership percentage, shown in parentheses after the entity name
- `source` — accepts either a plain URL string (hostname extracted as label) or an object with `url` and `label`; every ownership claim should have a source
- `owners` — array of parent entities (each can recursively have their own `owners`)
- `subsidiaries` — array of child entities (each can recursively have their own `subsidiaries`)
- `highlight` — tiered warning paragraphs rendered at the bottom of the card; triggers ⚠ warning on the tree's tab label colored to match the highest-severity finding. Accepts a plain string (renders as info-level green) or an array of `{tier, text}` objects where `tier` is `"state"`, `"fcc"`, `"doc"`, or omitted for info-level.

### Entity Screening (Three-Tier)

**The purpose of entity screening is documentation, not exclusion.** When screening reveals that an entity appears on the FCC Covered List, the BIS Entity List, or has state ownership ties, the correct response is to **include that entity in the corporate hierarchy tree, research its owners and subsidiaries in depth, and document each finding as a tiered `highlight`** on the relevant tree node. A covered or listed entity is the *starting point* of deeper investigation — trace ownership upward (who owns the listed entity? is the parent state-affiliated?) and trace subsidiaries downward (which controlled entities are also implicated?). The resulting owners and subsidiaries trees, populated with highlight annotations, give compliance reviewers the full picture.

**Every entity in the corporate hierarchy — owners, subsidiaries, and the anchor entity itself — must be screened** against three watchlists, in descending order of severity:

| Tier | Check | `highlight` text pattern | Basis |
|---|---|---|---|
| **1 — State Ownership** (highest) | Is this entity directly or ultimately owned or controlled by a foreign state or state-affiliated entity (e.g., state asset supervision agency, sovereign wealth fund, state council, government holding company)? | `{"tier":"state","text":"Ultimate state owner — [country] government"}` or `{"tier":"state","text":"Direct [agency] affiliation"}` | 47 U.S.C. § 1601; BEAD NOFO § IV.C.1 |
| **2 — FCC Covered List** | Is this entity (or any name it operates under) on the FCC's Covered List per 47 CFR § 1.50002? | `{"tier":"fcc","text":"FCC Covered List — [basis]"}` | 47 U.S.C. § 1601(a); 47 CFR Part 2 |
| **3 — DoC Entity List** (lowest) | Is this entity on the BIS Entity List (15 CFR Part 744, Supplement No. 4)? | `{"tier":"doc","text":"BIS Entity List — [basis and date added]"}` | Export Administration Regulations |

### Online Resources for Screening

| Check | Resource | URL |
|---|---|---|
| FCC Covered List | Official FCC Covered List page | `https://www.fcc.gov/supplychain/coveredlist` |
| FCC Covered List (structured) | OpenSanctions mirror (searchable, JSON/CSV) | `https://www.opensanctions.org/datasets/us_fcc_covered_list/` |
| DoC/BIS Entity List + all other U.S. sanctions lists | Consolidated Screening List search | `https://www.trade.gov/data-visualization/csl-search` |
| State ownership (cross-country) | OpenOwnership / Beneficial Ownership registers | `https://register.openownership.org/` |
| Corporate hierarchy (SEC filings) | EDGAR full-text search | `https://efts.sec.gov/LATEST/search-index?q=` |

For state ownership checks, use the relevant country's official SOE registry or state asset supervision agency website. For corporate hierarchy research on foreign-listed entities, use the disclosure platform of the relevant stock exchange.

**Screening procedure for each hierarchy entity:**

1. **Search the FCC Covered List** — check by entity name, parent name, and any known aliases at `fcc.gov/supplychain/coveredlist`. For structured search, use the OpenSanctions mirror.
2. **Search the Consolidated Screening List** — use `trade.gov/data-visualization/csl-search` with the entity name. This covers the BIS Entity List, Denied Persons List, SDN List, and others.
3. **Check state ownership** — for non-U.S. entities, determine whether any owner in the chain is a government agency, state-owned enterprise (SOE), or sovereign wealth fund. Consult the relevant country's state asset supervision agency, SOE registry, or beneficial ownership register. OpenOwnership provides cross-country coverage. State asset supervision structures exist in many countries — look for the equivalent agency in the country where the entity is domiciled.

**When a check is positive**, populate the `highlight` field on that entity's hierarchy node using the text patterns above. If multiple tiers apply to the same entity, use the highest-tier finding.

**Transitivity**: State ownership at the top of an ownership chain implies state control of all entities below it. However, each entity should carry its own `highlight` only for findings that directly apply to it. The tree's ⚠ tab indicator fires if *any* node in the tree has a highlight, so a single state-ownership finding at the top will flag the entire Owners tree.

**Note on passive components**: Passive fiber optic components (cables, patch cords, adapters) are generally not subject to FCC Covered List restrictions, which target active network equipment with routable firmware. However, state ownership and Entity List presence are still compliance-relevant findings for BEAD/BABA purposes, and should always be documented.

### Highlight Visual Tiers

Each highlight `tier` renders with a distinct color scheme in both the card paragraph and the tree's tab ⚠ indicator:

| Tier | Card text | Card background | Tab ⚠ color | JSON `tier` value |
|---|---|---|---|---|
| Info (default) | `#15803d` dark green | `#f0fdf4` light green | `#15803d` green | omitted or `"info"` |
| DoC Entity List | `#7e22ce` dark purple | `#faf5ff` light purple | `#7e22ce` purple | `"doc"` |
| FCC Covered List | `#b45309` amber | `#fffbeb` warm yellow | `#b45309` amber | `"fcc"` |
| State Ownership (highest) | `#dc2626` bright red | `#fef2f2` light red | `#dc2626` red | `"state"` |

The tab ⚠ indicator always uses the color of the highest-severity finding in that tree. If a tree contains both a state-ownership finding and a DoC finding, the tab shows red.

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

## Map Projection

Americas-centered equirectangular (`lon_0 = -90`). Coordinate conversion:

```
x = (lon > 90 ? lon - 360 : lon + 270) / 360 × 1400
y = (90 - lat) / 180 × 700
```

Auto-crop computes a `viewBox` centered on the midpoint of all node positions, with asymmetric padding (more below than above to accommodate balloon popovers and the legend).

## Part Number Research Methodology

When generating a supply chain flow diagram from a part number, follow this structured research process. The goal is to **map the complete supply chain from the point of sale back to the point of manufacture, screening every entity at every level** — distributors, intermediaries, assemblers, and manufacturers alike. Each entity in the chain is a compliance-relevant node that requires ownership research and three-tier screening. The manufacturer is the leaf node of the investigation, not the starting point. When the manufacturer cannot be determined, the opacity itself is a compliance finding.

**Investigation direction:** Work from the buyer's perspective inward. The part number was encountered on a purchase order, quote, or BOM — meaning someone is selling it. Start by identifying *who is selling* (the distributor or reseller), then trace their supply chain upstream to the manufacturer. Do not skip the distributor to search directly for the manufacturer — the distributor's own identity, ownership, sourcing relationships, and hosted documentation are primary research leads, and the distributor itself requires the same compliance screening as the manufacturer.

### Input

- **Part number** (required): the alphanumeric identifier to investigate
- **Description** (not required, but greatly improves accuracy): a short text describing the product, e.g. "24-port LC duplex fiber adapter panel" or "24 Fiber SA/SJ Gel Free Loose Tube 10,000' reel." Even a few words dramatically narrow the manufacturer universe and enable part number segment decoding.

### Research Flow — Phased Model

Investigation proceeds through four phases enforced by `research-state.js`. **Phase gates prevent skipping ahead** — you cannot generate scenario configs until all entities are screened, and you cannot screen entities until you've identified both the distributor and the manufacturer.

| Phase | Name | Gate (must pass to advance) |
|---|---|---|
| **1** | Distributor Identification | At least one non-placeholder distributor identified by name, location, and corporate details |
| **2** | Supply Chain Tracing | At least one manufacturer identified by tracing upstream from the distributor |
| **3** | Entity Screening | Every entity (distributor, intermediary, manufacturer) screened on all three tiers |
| **4** | Scenario Generation | Counterbalance rule satisfied if any entity is in a country of concern; no regulatory bodies as nodes |

**Begin every investigation by initializing state:**

```bash
node research-state.js init "XYZ-72M5N6" --description "72 Fiber Conventional Cable SA/SJ Gel Free Loose Tube 10,000' reel" --category passive
```

This decomposes the part number into searchable segments (prefixes, suffixes, probable distributor prefix, probable manufacturer suffix) and sets the investigation to Phase 1.

**The state file is the checkpoint.** If the conversation is interrupted (tool limits, "continue" prompts, session breaks), run `resume` to see exactly where to pick up:

```bash
node research-state.js resume "XYZ-72M5N6"
```

This shows the current phase, what's blocking advancement, which entities have been identified, which are unscreened, and which part number segments haven't been searched yet. **On every "continue" or conversation resumption, run `resume` before doing anything else.**

**Investigation direction: distributor first, manufacturer last.** The part number was encountered on a purchase order or BOM — someone is selling it. Phase 1 identifies the seller. Phase 2 traces the seller's supply chain upstream to the manufacturer. The manufacturer is the leaf node of the investigation tree, not the starting point. Do not skip to manufacturer search before completing Phase 1.

**Record every step in the state file.** As you perform web searches, record them with `log-search`. As you identify entities, add them with `add-entity`. As you discover ownership, add it with `add-owner`/`add-subsidiary`. As you screen entities, record results with `screen`. The state file serves as both the checkpoint and the audit trail.

**Step ordering follows the investigation direction: distributor first, then part number decoding, then manufacturer tracing, then screening.** Steps 1–2 identify the distributor. Steps 3–7 decode the part number. Step 8 traces the distributor's supply chain to the manufacturer. Steps 9–11 screen, investigate components, and assign confidence.

### Step 1 — Distributor Landscape Search (Phase 1)

**Before searching for this specific part number anywhere, first build a candidate list of distributors who operate in this product's vertical.** You cannot search a distributor's website if you don't know the distributor exists. Use the product description to determine the product category (e.g., FTTX outside plant cable, data center structured cabling, DWDM optical transceivers), then research who distributes products in that category:

1. **Industry directory search** — search for intermediaries in the product category using multiple role terms. Companies in the supply chain between manufacturer and deployer use varied terminology to describe themselves — **do not search only for "distributor."** Run searches using each of the following terms:
   - `"[product category]" distributor United States`
   - `"[product category]" supplier United States`
   - `"[product category]" "solutions provider" United States`
   - `"[product category]" "solutions integrator" United States`
   - `"[product category]" "network solutions" United States`
   - `"[product category]" reseller United States`
   - `"[product category]" "value added reseller" United States`
   - `"[product category]" vendor broadband`
   
   **Why multiple terms matter:** Small and mid-size intermediaries — the ones most likely to assign their own part number prefixes — often describe themselves as "solutions providers," "solutions integrators," or "suppliers" rather than "distributors." A search limited to the word "distributor" will find only large traditional distributors who typically use manufacturer part numbers unchanged. The rebranding intermediaries use different self-descriptions and require different search terms to discover.
2. **Trade show exhibitor lists** — major industry trade shows publish exhibitor directories. Search for exhibitor lists from recent events in the relevant vertical. Exhibitors in the product category are candidate distributors.
3. **Industry association member directories** — broadband, fiber optic, and telecommunications industry associations maintain member directories that include distributors and solutions providers.
4. **State broadband office and federal program vendor lists** — for products related to BEAD, RUS, or other federal broadband programs, state broadband offices and USDA/RUS may publish lists of qualified or approved vendors.
5. **B2B platform supplier search** — search B2B procurement platforms for the product description to find suppliers who list that product category.

The goal is a candidate list of 5–15 intermediaries (distributors, suppliers, solutions providers, resellers) who could plausibly sell this type of product. **Record each candidate** in your research notes. Then proceed to Step 2 to search each candidate's website for the specific part number.

```bash
# Record the landscape search
node research-state.js log-search "PARTNUMBER" "[product category] distributor United States" --step 1 --finding "Found candidates: Distributor A, Distributor B, Distributor C"
```

**Why this step is first:** Small and mid-size supply chain intermediaries in specialized verticals are not household names and do not always call themselves "distributors." They may be solutions providers, integrators, or suppliers. They won't appear in a search for the part number itself because they assign their own catalog prefixes. They are findable through industry directories, trade shows, and vertical-specific searches using varied role terminology — but only if you search for the product *category* and *multiple intermediary role terms* before searching for the specific part number.

### Step 1a — Deep Distributor Search (escalation when Step 1 + Step 2 produce no match)

**This step runs only when Step 1 landscape candidates cannot be matched to the part number prefix in Step 2.** The smallest intermediaries — regional solutions providers, buying cooperatives, newly founded integrators — may be invisible to landscape searches because they don't appear in industry directories, don't exhibit at major trade shows, and don't use the word "distributor" in their web presence. These are precisely the companies most likely to assign their own part number prefixes.

**Before escalating here, confirm that Step 2 was genuinely exhausted** — all landscape candidates were searched, and the prefix did not match any of them. Then proceed with these deeper techniques:

1. **Bare prefix as company/entity name** — search the distributor prefix as a standalone company name **without any product-category or vertical qualifiers**. Use a query like `"PREFIX" company OR corporation OR LLC OR Inc OR electronics`. This catches companies that use the prefix as their name or abbreviation but operate in a different vertical than the product under investigation — a failure mode where every other search strategy adds vertical keywords (e.g., "broadband," "fiber optic") that filter out the actual entity. If a company matching the prefix is found in a different industry (e.g., vehicle electronics, industrial controls), document it as investigated and dismissed with a reason. If a company matching the prefix is found in a related industry, investigate whether they also distribute the product category under investigation.
   ```bash
   node research-state.js log-search "PARTNUMBER" "\"PREFIX\" company OR corporation OR LLC OR Inc OR electronics" --step 1a --strategy prefix-entity --finding "Found PREFIX Corp — vehicle electronics manufacturer, not broadband. Dismissed: wrong vertical."
   ```

2. **Broad suffix + filetype search** — search the manufacturer spec code suffix (from the part number decomposition) combined with `filetype:pdf` and product-category keywords, without restricting to any specific domain. When results return PDFs hosted on third-party domains, **record every hosting domain** — these are distributor leads. The domain of the site hosting a manufacturer's spec sheet is the most reliable signal for identifying the distributor.
   ```bash
   node research-state.js log-search "PARTNUMBER" "M5N6 filetype:pdf gel free loose tube" --step 1a --finding "PDF found on domainname.com"
   node research-state.js extract-domain "https://domainname.com/uploads/spec-sheet.pdf" "PARTNUMBER"
   ```
   `extract-domain` automatically tracks the domain as a **pending lead** in the state file. It will appear as a blocker in `resume` and `advance-phase` until resolved via `add-entity` (auto-resolves when source URL contains the domain) or `resolve-domain --reason` (explicit dismissal).

3. **Government procurement and grant databases** — search state broadband office award lists, USDA/RUS borrower filings, NTIA BEAD subgrantee lists, and government RFQ/RFP portals for the part number prefix or the full part number. Small regional suppliers often appear in government procurement records even when they have no web presence in industry directories.

4. **Import/trade record search** — search trade databases and customs record aggregators for the part number prefix. Import records often identify both the shipper (foreign manufacturer) and the consignee (U.S. importer/distributor).

5. **Regional telecom association member lists** — the smallest intermediaries serve specific geographic regions and are members of state or regional telecommunications associations. Search member directories of associations in the regions where the product category is deployed.

6. **LinkedIn and business registry search** — search LinkedIn for company profiles that mention both the product category keywords and the part number prefix or suffix. Search state business registries (Secretary of State filings) for company names matching the prefix.

**Checkpoint:** Step 1a involves multiple sequential searches that may hit tool limits. Record each technique attempted and each domain discovered:

```bash
# Record each deep search attempt
node research-state.js log-search "PARTNUMBER" "suffix filetype:pdf product keywords" --step 1a --finding "PDF at domainname.com — investigating"
node research-state.js log-search "PARTNUMBER" "state broadband grant prefix" --step 1a --finding "No results"
```

On interruption/resume, `research-state.js resume` will show which Step 1a techniques have been attempted (by examining logged searches with `--step 1a`) and which domains were discovered but not yet investigated. **Resume from the next unattempted technique, not from the beginning of Step 1a.**

If Step 1a identifies a distributor, record it and advance Phase 1 as normal. If Step 1a exhausts all techniques without identifying the distributor, document the distributor opacity as a finding — but note that the prefix remains a lead for the buyer to investigate through direct inquiry to the seller.

### Step 2 — Part-Number-Specific Distributor Search (Phase 1 gate)

With the candidate list from Step 1, search for the specific part number or prefix on each candidate's website, plus procurement portals and e-commerce platforms. **Phase 1 cannot be passed until a distributor is identified by name.** If no candidate from Step 1 matches the prefix, **escalate to Step 1a before proceeding** — do not skip to Part Number Decoding.

1. **Search each candidate distributor's site** for the part number prefix, product description keywords, or suffix segments. Use `site:candidatesite.com "[prefix]"` or `site:candidatesite.com "[product description keywords]"`
2. **Search the prefix on its own** — the distributor's catalog prefix (e.g., the first 2–4 characters before the fiber count) may appear on their website, line cards, trade show materials, or procurement portals
3. **Search the full part number on procurement and quoting platforms** — government RFQ portals, trade databases, and B2B platforms often identify the seller by name
4. **Cross-reference the candidate list with hosted documentation** — check whether any candidate distributor hosts manufacturer spec sheets that contain the suffix or product description from the part number under investigation

**Distributor identification is a research step, not a placeholder.** If the part number prefix appears to be distributor-assigned (i.e., it doesn't match any manufacturer schema), identifying the specific distributor is mandatory — not optional. An "Unidentified Distributor" node in a supply chain diagram is a research failure, not a finding.

Once the distributor is identified by name, record it in the state file and advance to Phase 2:

```bash
node research-state.js add-entity "PARTNUMBER" --name "Distributor Name" --role distributor --city "City" --country US --source "source URL"
node research-state.js advance-phase "PARTNUMBER"  # Phase 1 → 2
```

### Step 3 — Exact Part Number Match

Search for the full part number in quotes. Results may identify a manufacturer's catalog, a distributor's product listing, or a third-party datasheet site. **All of these are valuable leads.** A distributor listing identifies a supply chain node. A manufacturer listing may resolve the investigation directly.

### Step 4 — Progressive Prefix Truncation

Remove segments from the right and search each prefix:

```
XYZ-24M5N6  →  "XYZ-24M5N6"  (exact)
                "XYZ-M5"
                "XYZ-24"
                "XYZ-"
                "XYZ"
```

At each level, look for manufacturer catalog pages, ordering guides, or datasheet indexes that use the same prefix structure. **Also look for distributor websites, line cards, or procurement portals** — the prefix is often the distributor's catalog code, not the manufacturer's.

### Step 5 — Internal Segment Search (Suffix Isolation)

Extract distinctive sub-strings and search them independently — **not just as generic queries, but specifically against manufacturer technical specifications and distributor-hosted catalogs**:

```
"XXYYY"   — full suffix after the fiber count
"YYY"     — trailing segment (potential manufacturer spec code)
"XX"      — prefix in isolation (potential distributor catalog prefix)
```

**Critical: suffixes are often more diagnostic than prefixes.** Distributors assign prefixes; manufacturers embed their own specification codes as suffixes. A trailing segment that appears meaningless in isolation may be a manufacturer's internal cable specification, fiber type designator, or product family code. Search each suffix segment:

1. **Against manufacturer technical specification PDFs** — search the suffix with `filetype:pdf` and product-category keywords
2. **Against distributor websites that sell the product** — search the identified distributor's domain specifically for the suffix, or browse their uploaded product documentation for PDFs whose filenames contain the suffix
3. **Against foreign-standard product designations** — products sold in the U.S. market under distributor-assigned part numbers may be manufactured abroad under the origin country's standard type codes. Search the suffix combined with those standard designations, as the manufacturer's spec code often carries through into the distributor's part number unchanged

**Why this step matters:** When a distributor assigns its own prefix to a rebranded product, prefix truncation (Step 4) will never reach the manufacturer. The manufacturer's identity is encoded in the suffix, not the prefix. Suffix isolation combined with distributor-hosted documentation search (Step 8) is the primary path for resolving these cases.

### Step 6 — Punctuation Reinsertion (Embedded OEM Part Number Recovery)

Distributor and buyer-assigned part numbers frequently embed a recognized OEM part number with punctuation stripped — hyphens, dots, and slashes removed to fit internal inventory systems. Recovering the original punctuation can instantly identify the product's OEM equivalent and dramatically increase confidence.

**Technique:**

1. **Remove the known prefix/suffix.** Strip the buyer prefix (e.g., `FW0-`, `FM0-`) and any brand suffix that identifies the distributor or temperature rating.
2. **Identify candidate OEM patterns** in the remaining string. Common OEM part number structures include:
   - Hyphens between product family segments: e.g., `DWDM-SFP10G-XX.XX` or `AT-3CE12YT-024`
   - Dots in wavelength values: `30.33` = 1530.33nm, `61.41` = 1561.41nm
   - Slashes in fiber specs: a spec code like `B1.3/M5N6` may appear in the PN as `B13M5N6` with slashes stripped
3. **Re-insert punctuation and search.** Try the most likely OEM format in quotes. For DWDM transceivers, well-known OEM format strings are nearly universal as compatibility references.

**Example:**

```
FW0-DWDMSFP10G3033IACME
  ↓ strip prefix FW0- and suffix IACME
DWDMSFP10G3033
  ↓ insert hyphens at known OEM segment boundaries
DWDM-SFP10G-3033
  ↓ insert dot in wavelength (30.33 → 1530.33nm)
DWDM-SFP10G-30.33
  ↓ search → exact OEM part number match (ITU C59, 80km)
```

**When this works,** it can upgrade confidence from Tier D to Tier B — the embedded OEM part number confirms the exact product specification even though the manufacturer of this specific unit remains the third-party ODM, not the OEM whose format was embedded.

**Common patterns to try:**
- DWDM/CWDM optics: `DWDM-SFP10G-XX.XX`, `CWDM-SFP-XXXX`, `SFP-10G-LR`, `QSFP-40G-SR4`
- Fiber cable: manufacturer standard designation with appended spec codes (slashes and dots stripped), domestic ordering guide format codes
- Patch cords: connector type codes embedded as letter sequences (e.g., `SC/APC-LC/UPC` → `SCAPCLCUPC`)

**Critical distinction — compatibility reference vs. provenance:** When an embedded OEM part number is recovered, it identifies *what the product is equivalent to*, not *who made it*. Third-party compatible optics distributors source from ODM manufacturers who program the transceiver EEPROM for major-OEM host platform compatibility. The OEM is never in the supply chain for these units — they are not resold OEM products. The OEM part number should **not** appear as a node in the supply chain flow diagram. Instead, document it in the product specs field as an equivalence reference. This distinction matters for compliance: the OEM's own sourcing controls do not apply to third-party compatible modules, making manufacturer opacity a higher-severity finding on active equipment.

### Step 7 — Format Fingerprinting

Compare the part number structure against known manufacturer ordering schemas. Use the description to narrow the comparison set. For example, if the description says "loose tube cable," compare against known domestic manufacturers' ordering guide formats — each has a distinctive prefix structure, separator pattern, and segment length that can rule out or confirm a match.

A structural mismatch (different prefix, different separator, different segment lengths) rules out that manufacturer even if some characters overlap.

**Include foreign manufacturer schemas in the comparison set.** When the product is passive cable and the part number does not match any domestic manufacturer schema, check whether any segment matches a foreign manufacturer's specification coding. Products sold under distributor-assigned part numbers in the U.S. market may originate from manufacturers in countries whose national standards define different cable type designation systems. A distributor part number may embed a foreign manufacturer's spec code as a suffix — a segment that is invisible to a comparison limited to domestic manufacturer schemas.

### Step 8 — Distributor-Hosted Documentation Search (Phase 2 gate)

Once a distributor is identified (Steps 1–2), search their website for manufacturer technical specifications, datasheets, and PDF catalogs. This step traces the supply chain from the distributor upstream to the manufacturer. **Phase 2 cannot be passed until at least one manufacturer is identified.**

1. **Search the distributor's domain for PDFs**: `site:distributorname.com filetype:pdf` combined with product keywords from the description (e.g., `"loose tube" "gel free"`)
2. **Browse the distributor's product pages for linked documentation**: technical specification PDFs, installation guides, and compliance certificates often identify the manufacturer
3. **Check PDF filenames**: distributor-hosted PDFs frequently embed the manufacturer name and spec code in the filename, even when the product page itself only shows the distributor's branding. A filename like `manufacturer-product-type-technical-specification-standard-designation-speccodes.pdf` can reveal both the manufacturer identity and the specification code embedded in the distributor's part number
4. **Search the distributor's uploads directory**: some websites expose their uploads path (e.g., `/wp-content/uploads/`) — browsing this can reveal documentation that isn't linked from product pages
5. **Treat the hosting domain as a distributor identification**: when a manufacturer's spec sheet is found hosted on a third-party domain (not the manufacturer's own site), that domain is almost certainly the distributor or a strong lead to the distributor. The domain name of the site hosting the PDF is as valuable as the content of the PDF itself — read the URL, not just the document.

**Why this matters:** Small and mid-size distributors (buying cooperatives, regional integrators, solutions providers) often assign their own part number prefixes to rebranded products but host the original manufacturer's spec sheets unmodified. The manufacturer's identity may be one click away on the distributor's own site even when it cannot be found through general web search for the part number itself.

**Two entities per spec sheet discovery.** When a manufacturer spec sheet is found on a third-party domain, two entities are discovered simultaneously: the manufacturer (from the spec sheet content) and the distributor or intermediary (from the hosting domain). **Both must be added via `add-entity` before advancing.** Run `extract-domain` on the URL — this tracks the hosting domain as a pending lead in the state file. Then add both entities. The `add-entity` call for the hosting distributor auto-resolves the pending domain when the source field contains the domain name. If only the manufacturer is added, the Phase 2 gate will block advancement until the hosting domain is resolved.

A common failure mode is recording the domain as a search finding (prose in a `log-search` call) but only promoting the manufacturer to entity status — the hosting distributor then drops out of the investigation entirely and never appears in the diagram. The pending domain system in `research-state.js` prevents this by making the domain a tracked blocker rather than narrative text.

### Step 9 — Corporate Tree Search & Entity Screening (Phase 3, all entities, all levels)

**This step applies to every entity identified in the supply chain — distributors, intermediaries, assemblers, and manufacturers alike.** Do not defer screening to the manufacturer alone. A state-affiliated distributor, an entity-listed intermediary, or a sanctioned parent company of a seemingly clean reseller are all compliance-relevant findings.

**The Phase 3 gate enforces this mechanically.** `advance-phase` will block until every entity has documented ownership research — either via `add-owner`/`add-subsidiary` (which auto-mark ownership as researched) or via `confirm-ownership --sources "..."` (which documents the registries searched when no owners were found). A U.S. distributor that "looks clean" still requires a search of the relevant Secretary of State business filings, SEC EDGAR, and/or LinkedIn before the gate will open. Writing "self-owned" in a screening field without actually searching is insufficient.

For each entity in the supply chain, map the full corporate hierarchy:

- **Parent company** — who owns the distributor or manufacturer? Trace the ownership chain upward to the ultimate parent.
- **Subsidiaries** — did they acquire assembly or component companies?
- **JV partners** — any joint ventures with foreign entities?

Repeat Steps 3–7 against each subsidiary's product catalogs and part number formats.

**After mapping, screen every entity in every tree** (owners, subsidiaries, and the anchor entity itself — at every level of the supply chain, from distributor through manufacturer) using the three-tier Entity Screening process described in the Corporate Hierarchy Schema section above. Populate the `highlight` field for every positive finding. This step is mandatory — no entity in the supply chain should go unscreened, regardless of its role.

**When screening finds a listed or flagged entity, do not stop — go deeper.** A positive finding on any entity demands expanded investigation of that entity's owners and subsidiaries. For example, if a manufacturer's parent appears on the BIS Entity List, research *that parent's* ownership chain (who are its owners? is it state-affiliated?) and its subsidiaries (what other companies does it control?). Add every discovered entity to the appropriate tree with its own screening results. The diagram's value lies in presenting the complete, documented chain — not in filtering entities out.

### Step 10 — Component Sourcing Investigation

Even if the final assembly location is domestic, trace upstream:

- Who makes the ferrules, fiber, connectors, or other key components?
- Are raw materials (e.g., nano-zirconia powder, specialty glass) sourced from entities in countries of concern?
- Does the assembler advertise "custom labeling" — suggesting the part number may be buyer-assigned rather than manufacturer-assigned?

### Step 11 — Confidence Tier Assignment

Rate each scenario based on how many steps of indirection were required:

| Tier | Meaning |
|---|---|
| **A — Confirmed** | Exact part number found in manufacturer's public catalog |
| **B — High confidence** | Prefix match + description match + format fingerprint consistent, or embedded OEM part number recovered via punctuation reinsertion |
| **C — Probable** | Distributor identified, manufacturer inferred from subsidiary/catalog analysis |
| **D — Speculative** | No prefix match; manufacturer inferred from product category + geographic analysis |
| **E — Opaque** | Part number not publicly indexed anywhere; manufacturer cannot be determined without direct inquiry |

When confidence is Tier C or below, generate multiple scenario diagrams showing alternate supply chain paths.

### Manufacturer Provenance Diversity

When the actual manufacturer behind a distributor-branded product is unknown, **do not default to a single assumed origin** (e.g., "low-cost overseas ODM"). Instead, enumerate the full range of plausible manufacturers across geographies and business models, then generate a separate scenario for each materially different supply chain path.

**Why this matters:** A given product specification could equally plausibly come from an anonymous overseas white-label shop, a major branded manufacturer in a country of concern with screenable state ownership, a manufacturer in a treaty-ally country, or a domestic firm. Each path has radically different compliance implications. Presenting only the lowest-cost path as "the" scenario is misleading — it biases the compliance assessment toward worst-case without acknowledging that the distributor may have legitimate domestic or allied-country sourcing.

**How to identify the plausible manufacturer set:**

1. **Start from the product specification** — what class of manufacturer can produce this exact product? The answer often spans firms across multiple countries and ownership structures.
2. **Consider the distributor's positioning** — a budget-focused reseller is more likely to source from low-cost ODMs; a distributor emphasizing quality, lifetime warranties, or TAA compliance may source from domestic or allied-country manufacturers.
3. **Check for country-of-origin indicators** — some distributors offer COO documentation, TAA compliance statements, or BABA self-certification. These narrow the field.
4. **Search for the distributor's known supplier relationships** — press releases, partnership announcements, certification pages, and trade show co-appearances can reveal sourcing partners.
5. **Consider that sourcing may change over time** — a distributor may use different manufacturers for the same SKU depending on pricing, availability, and customer requirements.

**Scenario generation guidance:**

| # of scenarios | When |
|---|---|
| 1 scenario | Manufacturer is confirmed (Tier A) — single known manufacturer |
| 1 per candidate | Manufacturer is probable or speculative — one scenario per plausible candidate manufacturer, each with its own corporate hierarchy |
| +1 counterbalance | When any scenario involves a manufacturer in a country of concern, add at least one domestic or allied-country alternative scenario |

Each scenario should represent a **single candidate manufacturer with its own fully documented corporate hierarchy.** Do not combine multiple candidate manufacturers in a single scenario or entity box — even when their compliance outcomes appear similar. Each manufacturer has a distinct ownership chain, subsidiary structure, and screening profile that must be individually documented in the corporate hierarchy cards. A scenario with "Manufacturer A or B or C" in one box is a research shortcut that prevents the compliance reviewer from seeing the ownership trees for any of them.

**One manufacturer per scenario, one scenario per manufacturer.** If the plausible set includes four domestic manufacturers, generate four scenarios — each with the manufacturer's own corporate hierarchy, ownership chain, and screening results rendered in full. The scenarios may all show clean compliance outcomes, but the reviewer needs to see *why* each one is clean (who owns them, what subsidiaries they control, where they manufacture).

**Adversarial-country counterbalance rule:** When any scenario resolves to a manufacturer in a country of concern (state-affiliated ownership, entity list presence, or BABA non-compliant origin), at least one additional scenario must document the plausible domestic or allied-country alternative — the manufacturer(s) whose product description, cable construction, and specifications could also match the part number. This is not speculative padding; it gives the compliance reviewer the full decision space: "the evidence points to [flagged manufacturer], but if the seller can demonstrate [clean-path manufacturer] sourcing, here is the alternative compliance outcome." Without this counterbalance, the assessment biases toward worst-case and fails to document the resolution path.

**Physical inspection as a resolution path:** For active optical transceivers, the module's EEPROM contains vendor ID fields (bytes 20–35 of the SFF-8472 A0 page) that typically identify the actual manufacturer regardless of branding. Recommending physical inspection of the unit — reading the EEPROM with an SFP+ diagnostic tool — is a valid finding that can resolve manufacturer opacity without relying solely on public research.

### Opacity as a Finding

If a part number cannot be traced to a manufacturer through public sources, that opacity is itself a compliance-relevant finding. Document it explicitly:

- The part number is not indexed by any known manufacturer
- The format does not match any documented ordering schema
- The prefix may be buyer-assigned or distributor-assigned
- Manufacturer identity requires direct inquiry to the seller

**Before declaring opacity, verify that Steps 5 (suffix isolation) and 8 (distributor-hosted documentation) have been exhausted.** A common failure mode is searching only manufacturer catalogs for the full part number or its prefix, while the manufacturer's identity is encoded in the suffix and documented on the distributor's own website. Opacity should mean "we searched everywhere including the distributor's hosted documentation and found nothing," not "we searched manufacturer catalogs for the prefix and stopped."

**Severity varies by product category:**
- **Active equipment** (transceivers, switches, routers — anything with firmware): Manufacturer opacity is a high-severity finding because FCC Covered List screening cannot be completed. The inability to rule out components from covered or listed entities in the supply chain is a specific, documentable risk.
- **Passive components** (cables, patch cords, CWDM filters, splitters): Manufacturer opacity is a lower-severity finding — the FCC Covered List does not apply to passive devices. However, state ownership and BIS Entity List screening still require manufacturer identification for BEAD/BABA purposes.

When manufacturer identity is opaque, follow the Manufacturer Provenance Diversity guidance above to generate scenarios spanning the plausible range of origins rather than defaulting to a single assumption. For active equipment, recommend EEPROM inspection (SFF-8472/SFF-8636 vendor ID fields) as a resolution path.

This is particularly relevant for BEAD/BABA compliance where domestic-origin documentation is required.

## Workflow

### 1. Initialize state

```bash
cp /mnt/user-data/uploads/research-state.js /home/claude/research-state.js  # if not already present
node research-state.js init "PARTNUMBER" --description "product description" --category passive
```

Review the decomposition output. Note the probable distributor prefix and manufacturer suffix. Then **immediately review the generated query templates:**

```bash
node research-state.js show-templates "PARTNUMBER"
```

This displays the pre-built search queries for every required Step 1 and Step 1a strategy, derived from the product description and part number decomposition. **Execute every template query, in order, logging each with its strategy ID.** Do not skip templates or substitute freeform queries — the Phase 1 gate will block advancement until every strategy has a logged search.

The templates are deterministic: the same part number and description always produce the same queries. This eliminates query-formulation variance as a source of inconsistent search coverage across investigation runs.

### 2. Phase 1 — Distributor Identification

Execute every Step 1 query template from `show-templates`, logging each with its strategy ID:

```bash
node research-state.js log-search "PARTNUMBER" "[query from template]" --step 1 --strategy dir-distributor --finding "Found candidates: X, Y, Z"
node research-state.js log-search "PARTNUMBER" "[query from template]" --step 1 --strategy dir-supplier --finding "No new candidates"
node research-state.js log-search "PARTNUMBER" "[query from template]" --step 1 --strategy dir-solutions --finding "Found: Company A"
node research-state.js log-search "PARTNUMBER" "[query from template]" --step 1 --strategy dir-integrator --finding "No new candidates"
node research-state.js log-search "PARTNUMBER" "[query from template]" --step 1 --strategy dir-reseller --finding "No new candidates"
node research-state.js log-search "PARTNUMBER" "[query from template]" --step 1 --strategy dir-var --finding "No new candidates"
node research-state.js log-search "PARTNUMBER" "[query from template]" --step 1 --strategy dir-vendor --finding "No new candidates"
```

**All 7 Step 1 strategies are required.** The Phase 1 gate will not advance until every strategy has a logged search. If no distributor is found after all Step 1 strategies, execute all Step 1a templates:

```bash
node research-state.js log-search "PARTNUMBER" "[query]" --step 1a --strategy prefix-entity --finding "Found PREFIX Corp — wrong vertical (vehicle electronics). Dismissed."
node research-state.js log-search "PARTNUMBER" "[query]" --step 1a --strategy suffix-pdf --finding "PDF found on example.com"
node research-state.js log-search "PARTNUMBER" "[query]" --step 1a --strategy gov-procurement --finding "No results"
node research-state.js log-search "PARTNUMBER" "[query]" --step 1a --strategy import-trade --finding "No results"
node research-state.js log-search "PARTNUMBER" "[query]" --step 1a --strategy regional-assoc --finding "No results"
node research-state.js log-search "PARTNUMBER" "[query]" --step 1a --strategy linkedin-registry --finding "No results"
```

**All 6 Step 1a strategies are also required** before a distributor can be declared opaque.

**Log every partial lead immediately.** When a search result mentions a company that *might* be the distributor but hasn't been confirmed, log it as a pending lead — do not hold it in working memory:

```bash
node research-state.js log-lead "PARTNUMBER" --description "Company X (example.com) — sells matching product category, Green Bay WI" --step 1 --priority high
```

Pending leads block phase advancement until each is investigated or dismissed:

```bash
node research-state.js resolve-lead "PARTNUMBER" 0 --result "investigated: confirmed as distributor"
node research-state.js resolve-lead "PARTNUMBER" 1 --result "dismissed: content aggregator, not a supply chain participant"
```

When a distributor is confirmed:

```bash
node research-state.js add-entity "PARTNUMBER" --name "Distributor Name" --role distributor --city "City" --country US --source "source URL"
node research-state.js advance-phase "PARTNUMBER"  # Phase 1 → 2
```

**When the distributor truly cannot be identified** after all strategies are exhausted, add a placeholder and classify the opacity:

```bash
node research-state.js add-entity "PARTNUMBER" --name "Unresolved Distributor (PREFIX)" --role distributor --city "Unknown" --country US --source "Exhaustive search — see logged strategies"
node research-state.js set-opacity "PARTNUMBER" "unresolved-distributor-prefix" --tier exhausted
node research-state.js advance-phase "PARTNUMBER"  # Phase 1 → 2
```

Opacity tiers:
- **`exhausted`** — All prescribed search strategies attempted. Entity genuinely not findable through public sources.
- **`interrupted`** — Search was interrupted by tool limits or session break. Strategies remain unattempted.
- **`partial`** — Some strategies attempted, others skipped. Search coverage is incomplete.

Only `exhausted` allows advancement without warnings. `interrupted` and `partial` require completing the remaining strategies first.

### 3. Phase 2 — Supply Chain Tracing

Search distributor-hosted documentation (Step 8) to identify the manufacturer. When a manufacturer spec sheet is found on a third-party domain, use `extract-domain` to confirm the distributor:

```bash
node research-state.js extract-domain "https://distributorsite.com/uploads/manufacturer-spec.pdf" "PARTNUMBER"
```

**`extract-domain` now tracks unresolved domains as pending leads.** The Phase 2 gate will not pass until every pending domain is resolved. When a spec sheet is found on a third-party domain, **two entities are discovered simultaneously**: the manufacturer (from the spec sheet content) and the distributor/intermediary (from the hosting domain). Both must be added:

```bash
# Add BOTH entities — the manufacturer AND the hosting distributor
node research-state.js add-entity "PARTNUMBER" --name "Distributor Name" --role distributor --city "City" --country US --source "https://distributorsite.com — hosts manufacturer spec sheets, sells matching product category"
# ↑ add-entity auto-resolves the pending domain when the source URL contains the domain

node research-state.js add-entity "PARTNUMBER" --name "Manufacturer Name" --role manufacturer --city "City" --country XX --source "spec sheet URL"
node research-state.js advance-phase "PARTNUMBER"  # Phase 2 → 3
```

If a pending domain is not a supply chain participant (e.g., a content aggregator or unrelated hosting provider), dismiss it explicitly:

```bash
node research-state.js resolve-domain "PARTNUMBER" "domainname.com" --reason "Content aggregator, not a supply chain participant"
```

**A common failure mode is adding the manufacturer but forgetting the hosting distributor.** The pending domain system prevents this: `advance-phase` will block until `distributorsite.com` is either added as an entity (auto-resolved) or explicitly dismissed with a documented reason.

### 4. Phase 3 — Entity Screening

Screen every entity on all three tiers. **Do not skip any entity regardless of role.** Research corporate ownership for **every** entity — the Phase 3 gate blocks advancement until ownership is documented for all entities, including U.S. distributors:

```bash
node research-state.js screen "PARTNUMBER" distributor-id --state-ownership "..." --fcc "..." --bis "..."
node research-state.js screen "PARTNUMBER" manufacturer-id --state-ownership "..." --fcc "..." --bis "..."
node research-state.js add-owner "PARTNUMBER" manufacturer-id --name "Parent Corp" --share "51%" --location "Country"
```

**Ownership research is required for every entity.** Two paths satisfy the gate:

```bash
# Path A — owners/subsidiaries found: add-owner auto-marks ownership as researched
node research-state.js add-owner "PARTNUMBER" manufacturer-id --name "Parent Corp" --share "51%" --location "Country"

# Path B — no owners found after searching: confirm-ownership documents the search
node research-state.js confirm-ownership "PARTNUMBER" distributor-id --sources "Wisconsin DFI business filings, OpenOwnership, SEC EDGAR, LinkedIn"
```

The `--sources` flag on `confirm-ownership` is mandatory — it documents which registries and databases were actually searched. Writing "self-owned" in a screening field without searching is not sufficient; the gate requires either `add-owner`/`add-subsidiary` calls (which auto-mark the entity) or an explicit `confirm-ownership` with documented sources.

```bash
node research-state.js advance-phase "PARTNUMBER"  # Phase 3 → 4
```

### 5. Phase 4 — Scenario Generation

Define scenarios and validate before generating configs:

```bash
node research-state.js add-scenario "PARTNUMBER" --id a --title "Scenario Title" --tier B
node research-state.js validate "PARTNUMBER"  # Check all gates and rules
```

Then author JSON configs and generate HTML:

```bash
node supply-flow.js PARTNUMBER-scenario-a.json -o /mnt/user-data/outputs/PARTNUMBER-scenario-a.html
```

### On interruption or "continue"

**Always run `resume` first** before continuing any research:

```bash
node research-state.js resume "PARTNUMBER"
```

This shows the current phase, what's blocking, unscreened entities, unsearched segments, **unresolved pending domain leads**, **unresolved pending leads (partial findings from search results)**, and **strategy coverage gaps** (which Step 1 / Step 1a search strategies have not yet been executed). Pending leads are created by `log-lead` and block phase advancement until resolved. Strategy gaps show exactly which prescribed queries remain unattempted. Resume from the specific blocker identified — do not restart or skip to generation.

**Context loss across interruptions is a known failure mode.** When a conversation hits tool limits or a "continue" boundary, partial findings held in working memory (candidate names noticed in search results but not yet logged, URLs that looked promising) are lost. The `pendingLeads` system mitigates this: **log every partial finding immediately** via `log-lead`, even before investigating it. This ensures the finding survives context loss and surfaces as a blocker on resume.

Output filenames always follow the pattern `PARTNUMBER-scenario-#.html`, using a letter or number suffix (a, b, c…) even when there is only one scenario. For uncertain provenance, generate multiple scenario configs representing different plausible supply chain paths.

## Quality Checklist

- [ ] Every node has `lat`/`lon` placing it at the correct city
- [ ] Every node has a `riskAssessment` with at least `geopoliticalRisk` and `fccCoveredList`
- [ ] Every node where `coveredList: true` has a `coveredNote` explaining the basis
- [ ] `cslSearchName` is populated for every non-U.S. entity
- [ ] **No regulatory body (FCC, USAC, NTIA, etc.) appears as a supply chain node** — regulatory bodies do not manufacture, distribute, sell, or physically handle products; they belong in citation references, not in the flow diagram
- [ ] Flows connect in the correct direction (upstream → downstream)
- [ ] Dashed flows are used for heritage/historical relationships, not active product flows
- [ ] Corporate hierarchy uses `owners` (upward) and `subsidiaries` (downward), not `children`
- [ ] **Each hierarchy anchor is a map-node entity** (manufacturer, distributor, assembler) — not a top-level parent with the map-node buried as a subsidiary
- [ ] Corporate hierarchy `source` fields link to verifiable public sources (press releases, SEC filings, stock exchange profiles)
- [ ] **Every hierarchy entity (owners and subsidiaries) has been screened** against: (1) state ownership, (2) FCC Covered List, (3) DoC/BIS Entity List
- [ ] **Every supply chain entity has documented ownership research** — either `add-owner`/`add-subsidiary` was called (auto-marks ownership as researched), or `confirm-ownership --sources "..."` was called documenting which registries were searched (e.g., state Secretary of State filings, OpenOwnership, SEC EDGAR, LinkedIn). This applies to **all** entities regardless of country — a U.S. distributor requires the same ownership research documentation as a foreign manufacturer. Run `node research-state.js advance-phase` to verify the gate passes.
- [ ] Positive screening findings are documented in the entity's `highlight` field using the standard text patterns
- [ ] Owner entities include a `share` field where ownership percentage is publicly known
- [ ] Part number confidence tier is documented in the subtitle or product specs
- [ ] Product category (`active` or `passive`) is correctly set — this determines whether FCC Covered List screening applies
- [ ] When manufacturer is unknown, multiple scenarios cover the plausible range of provenance (not just cheapest-path assumption) per Manufacturer Provenance Diversity guidance
- [ ] When any scenario resolves to a manufacturer in a country of concern, at least one additional scenario documents the plausible domestic or allied-country alternative per the adversarial-country counterbalance rule
- [ ] When manufacturer is unknown and a distributor is identified, distributor's website has been searched for hosted manufacturer datasheets, specification PDFs, and compliance certificates (Step 8)
- [ ] **No distributor node is a generic placeholder** (e.g., "Unidentified Distributor") when the part number prefix provides a researchable lead — Steps 1–2 require identifying the specific distributor by name, location, and corporate details
- [ ] **All Step 1 search strategies have logged entries** — run `node research-state.js show-templates` to verify all 7 strategies show ✓. If any show ○, the strategy was not executed and the gate will block.
- [ ] **All Step 1a search strategies have logged entries** when distributor was not found in Step 1 — all 6 deep search strategies must be attempted before declaring opacity.
- [ ] **Bare prefix entity search was executed** — the `prefix-entity` strategy (searching the prefix as a company name without vertical qualifiers) must be logged before declaring a distributor prefix opaque. This catches companies that use the prefix as their name but operate in a different vertical than the product under investigation.
- [ ] **Every `log-search` call includes a `--strategy` ID** matching one of the prescribed strategy templates. Freeform searches without strategy IDs do not count toward coverage.
- [ ] **No pending leads remain unresolved** — run `node research-state.js resume` and verify no ⚡ leads are listed. Every partial finding from search results must be either investigated (resolve-lead --result "investigated: ...") or dismissed (resolve-lead --result "dismissed: ...").
- [ ] **Opacity-declared distributors have a tier classification** — if a distributor is labeled "Unresolved" or "Unknown", it must have an opacity tier set via `set-opacity --tier exhausted|interrupted|partial`. Only `exhausted` is acceptable for final output; `interrupted` or `partial` indicate incomplete research.
- [ ] **Every `extract-domain` result has been resolved** — no pending domain leads remain in the state file. Each domain that hosted a manufacturer spec sheet must appear as a supply chain entity in the diagram, or be explicitly dismissed via `resolve-domain --reason`. Run `node research-state.js resume` to verify no pending domains remain.
- [ ] **No scenario combines multiple candidate manufacturers in one entity box** — each candidate manufacturer has its own scenario with individually documented corporate hierarchy, ownership chain, and screening results
- [ ] For active equipment with opaque manufacturer, EEPROM vendor ID inspection is recommended as a resolution path
- [ ] Output filename follows the convention `PARTNUMBER-scenario-#.html` (e.g., `FM0-PA1002CZBEZB001M-scenario-a.html`), even for single-scenario cases (use `-scenario-a`)
- [ ] No JavaScript in the output HTML
