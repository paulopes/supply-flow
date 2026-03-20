# supply-flow — Geographic Supply Chain Flow Diagrams

## Purpose

`supply-flow.js` generates self-contained, interactive HTML (or SVG) diagrams that map the geographic flow of products through a supply chain. Each node represents a supply chain participant (manufacturer, assembler, distributor, etc.) placed at its real-world coordinates on an Americas-centered equirectangular map. Flows are rendered as curved arrows between nodes.

The tool is designed for **supply chain compliance investigation and documentation** — particularly FCC Covered List, BIS Entity List, and CSL screening under 47 CFR Part 2 and 47 U.S.C. § 1601. The goal is not to exclude flagged entities but to **include them, research their full corporate ownership and subsidiary structures, and present the findings visually** so that compliance reviewers have a complete, documented picture. It supports risk assessment popovers, FCC/BIS/CSL links, corporate ownership trees with tiered warning highlights, and multiple scenario generation when manufacturer identity is uncertain.

## Required Files

| File | Size | Description |
|---|---|---|
| `supply-flow.js` | ~36 KB | Node.js generator script (no dependencies, land path embedded) |

The land path data (Natural Earth 110m, simplified with RDP eps=5 and small-island filtering, Americas-centered equirectangular projection `+proj=eqc +lon_0=-90` onto a 1400×700 canvas) is embedded directly in the script. No external data files are needed.

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

**Anchor entity rule:** Each entry in the `corporateHierarchies` array must be anchored at an entity that appears as a node on the map — typically a manufacturer, distributor, or assembler identified during the part number investigation. The anchor entity is the starting point: its `owners` array traces the ownership chain *upward* (parent company, ultimate parent, state affiliations), and its `subsidiaries` array traces controlled entities *downward*. Do not anchor at the top of the ownership chain with the map-node entity buried as a subsidiary — that inverts the perspective. For example, if the map shows Precision Optical Technologies as a distributor node, the hierarchy anchor should be Precision Optical Technologies with Belden Inc. in its `owners` array, not Belden Inc. as the anchor with Precision as a subsidiary.

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
| **1 — State Ownership** (highest) | Is this entity directly or ultimately owned or controlled by a foreign state or state-affiliated entity (e.g., SASAC, sovereign wealth fund, state council)? | `{"tier":"state","text":"Ultimate state owner — [country] government"}` or `{"tier":"state","text":"Direct [agency] affiliation"}` | 47 U.S.C. § 1601; BEAD NOFO § IV.C.1 |
| **2 — FCC Covered List** | Is this entity (or any name it operates under) on the FCC's Covered List per 47 CFR § 1.50002? | `{"tier":"fcc","text":"FCC Covered List — [basis]"}` | 47 U.S.C. § 1601(a); 47 CFR Part 2 |
| **3 — DoC Entity List** (lowest) | Is this entity on the BIS Entity List (15 CFR Part 744, Supplement No. 4)? | `{"tier":"doc","text":"BIS Entity List — [basis and date added]"}` | Export Administration Regulations |

### Online Resources for Screening

| Check | Resource | URL |
|---|---|---|
| FCC Covered List | Official FCC Covered List page | `https://www.fcc.gov/supplychain/coveredlist` |
| FCC Covered List (structured) | OpenSanctions mirror (searchable, JSON/CSV) | `https://www.opensanctions.org/datasets/us_fcc_covered_list/` |
| DoC/BIS Entity List + all other U.S. sanctions lists | Consolidated Screening List search | `https://www.trade.gov/data-visualization/csl-search` |
| State ownership (China) | SASAC central enterprise list | `http://www.sasac.gov.cn/n2588035/n2641579/n2641645/index.html` |
| State ownership (China — English) | SASAC central SOE list (English) | `http://en.sasac.gov.cn/directoryofsoes.html` |
| State ownership (cross-country) | OpenOwnership / Beneficial Ownership registers | `https://register.openownership.org/` |
| Corporate hierarchy (HK-listed) | HKEX disclosure filings | `https://www.hkexnews.hk/` |
| Corporate hierarchy (PRC-listed) | CNINFO disclosure platform | `http://www.cninfo.com.cn/new/index` |
| Corporate hierarchy (SEC filings) | EDGAR full-text search | `https://efts.sec.gov/LATEST/search-index?q=` |

**Screening procedure for each hierarchy entity:**

1. **Search the FCC Covered List** — check by entity name, parent name, and any known aliases at `fcc.gov/supplychain/coveredlist`. For structured search, use the OpenSanctions mirror.
2. **Search the Consolidated Screening List** — use `trade.gov/data-visualization/csl-search` with the entity name. This covers the BIS Entity List, Denied Persons List, SDN List, and others.
3. **Check state ownership** — for non-U.S. entities, determine whether any owner in the chain is a government agency, state-owned enterprise (SOE), or sovereign wealth fund. For PRC entities, check the SASAC central enterprise list. For other countries, consult OpenOwnership beneficial ownership registers or equivalent national registers. SASAC (State-owned Assets Supervision and Administration Commission) ownership in China is the most common case, but also check for equivalent structures in other countries (e.g., Temasek in Singapore, PIF in Saudi Arabia, Mubadala in UAE).

**When a check is positive**, populate the `highlight` field on that entity's hierarchy node using the text patterns above. If multiple tiers apply to the same entity, use the highest-tier finding.

**Transitivity**: State ownership at the top of an ownership chain implies state control of all entities below it. However, each entity should carry its own `highlight` only for findings that directly apply to it. The tree's ⚠ tab indicator fires if *any* node in the tree has a highlight, so a single SASAC finding at the top will flag the entire Owners tree.

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

When generating a supply chain flow diagram from a part number, follow this structured research process. The goal is to identify the manufacturer, assembly location, and component origins — or, if those cannot be determined, to document the opacity itself as a compliance finding.

### Input

- **Part number** (required): the alphanumeric identifier to investigate
- **Description** (not required, but greatly improves accuracy): a short text describing the product, e.g. "24-port LC duplex fiber adapter panel" or "24 Fiber SA/SJ Gel Free Loose Tube 10,000' reel." Even a few words dramatically narrow the manufacturer universe and enable part number segment decoding.

### Step 1 — Exact Match

Search for the full part number in quotes. If found on a manufacturer's catalog, distributor listing, or datasheet site, the manufacturer is identified.

### Step 2 — Progressive Prefix Truncation

Remove segments from the right and search each prefix:

```
FFA-24B6A1  →  "FFA-24B6A1"  (exact)
                "FFA-24B6"
                "FFA-24"
                "FFA-"
                "FFA"
```

At each level, look for manufacturer catalog pages, ordering guides, or datasheet indexes that use the same prefix structure.

### Step 3 — Internal Segment Search

Extract distinctive sub-strings and search them independently:

```
"24B6A1"  — full suffix
"B6A1"    — trailing segment
```

These may match product family codes, revision codes, or spec encodings.

### Step 4 — Punctuation Reinsertion (Embedded OEM Part Number Recovery)

Distributor and buyer-assigned part numbers frequently embed a recognized OEM part number with punctuation stripped — hyphens, dots, and slashes removed to fit internal inventory systems. Recovering the original punctuation can instantly identify the product's OEM equivalent and dramatically increase confidence.

**Technique:**

1. **Remove the known prefix/suffix.** Strip the buyer prefix (e.g., `FW0-`, `FM0-`) and any brand suffix (e.g., `PIVIT`, `I` for industrial temp).
2. **Identify candidate OEM patterns** in the remaining string. Common OEM part number structures include:
   - Hyphens between product family segments: `DWDM-SFP10G-XX.XX` (Cisco), `AT-3CE12YT-024` (OFS)
   - Dots in wavelength values: `30.33` = 1530.33nm, `61.41` = 1561.41nm
   - Slashes in fiber specs: `B1.3/B6A1` (YOFC)
3. **Re-insert punctuation and search.** Try the most likely OEM format in quotes. For DWDM transceivers, the Cisco format `DWDM-SFP10G-XX.XX` is nearly universal as a compatibility reference.

**Example:**

```
FW0-DWDMSFP10G3033IPIVIT
  ↓ strip prefix FW0- and suffix IPIVIT
DWDMSFP10G3033
  ↓ insert hyphens at known Cisco segment boundaries
DWDM-SFP10G-3033
  ↓ insert dot in wavelength (30.33 → 1530.33nm)
DWDM-SFP10G-30.33
  ↓ search → exact Cisco part number match (ITU C59, 80km)
```

**When this works,** it can upgrade confidence from Tier D to Tier B — the embedded OEM part number confirms the exact product specification even though the manufacturer of this specific unit remains the Chinese ODM, not Cisco.

**Common patterns to try:**
- DWDM/CWDM optics: `DWDM-SFP10G-XX.XX`, `CWDM-SFP-XXXX`, `SFP-10G-LR`, `QSFP-40G-SR4`
- Fiber cable: `GYFY(ALL DRY)-nB1.3/B6A1` (YOFC), `024EUC-T4101D20` (Corning)
- Patch cords: `SC/APC-LC/UPC` connectors embedded as letter codes

**Critical distinction — compatibility reference vs. provenance:** When an embedded OEM part number is recovered (e.g., Cisco `DWDM-SFP10G-30.33` inside a PivIT-branded transceiver), it identifies *what the product is equivalent to*, not *who made it*. Third-party compatible optics distributors like PivIT Global, Approved Networks, ProLabs, and FS.com source from Chinese ODM manufacturers who program the transceiver EEPROM for Cisco/Juniper/Arista compatibility. The OEM (Cisco) is never in the supply chain for these units — they are not resold OEM products. The OEM part number should **not** appear as a node in the supply chain flow diagram. Instead, document it in the product specs field as an equivalence reference. This distinction matters for compliance: the OEM's own sourcing controls do not apply to third-party compatible modules, making manufacturer opacity a higher-severity finding on active equipment.

### Step 5 — Format Fingerprinting

Compare the part number structure against known manufacturer ordering schemas. Use the description to narrow the comparison set. For example, if the description says "loose tube cable," compare against Corning (`024EUC-T4101D20`), AFL (`LE024xC5101N1D`), OFS (`AT-3CE12YT-024`), etc.

A structural mismatch (different prefix, different separator, different segment lengths) rules out that manufacturer even if some characters overlap.

### Step 6 — Distributor / Seller Identification

Search for the part number on distributor sites, procurement portals, and e-commerce platforms. Identify who sells the product, then investigate:

- Who manufactures for that distributor?
- Has the distributor acquired any manufacturers recently?
- Does the distributor's website reference a specific assembly partner?

### Step 7 — Corporate Tree Search & Entity Screening

For each entity identified in Step 6, map the full corporate hierarchy:

- **Parent company** — who owns the distributor or manufacturer? Trace the ownership chain upward to the ultimate parent.
- **Subsidiaries** — did they acquire assembly or component companies?
- **JV partners** — any joint ventures with foreign entities?

Repeat Steps 1–5 against each subsidiary's product catalogs and part number formats.

**After mapping, screen every entity in the tree** (owners, subsidiaries, and the anchor entity) using the three-tier Entity Screening process described in the Corporate Hierarchy Schema section above. Populate the `highlight` field for every positive finding. This step is mandatory — no hierarchy entity should go unscreened.

**When screening finds a listed or flagged entity, do not stop — go deeper.** A positive finding on any entity demands expanded investigation of that entity's owners and subsidiaries. For example, if a manufacturer's parent appears on the BIS Entity List, research *that parent's* ownership chain (who are its owners? is it state-affiliated?) and its subsidiaries (what other companies does it control?). Add every discovered entity to the appropriate tree with its own screening results. The diagram's value lies in presenting the complete, documented chain — not in filtering entities out.

### Step 8 — Component Sourcing Investigation

Even if the final assembly location is domestic, trace upstream:

- Who makes the ferrules, fiber, connectors, or other key components?
- Are raw materials (e.g., nano-zirconia powder, specialty glass) sourced from entities in countries of concern?
- Does the assembler advertise "custom labeling" — suggesting the part number may be buyer-assigned rather than manufacturer-assigned?

### Step 9 — Confidence Tier Assignment

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

When the actual manufacturer behind a distributor-branded product is unknown, **do not default to a single assumed origin** (e.g., "Chinese ODM"). Instead, enumerate the full range of plausible manufacturers across geographies and business models, then generate a separate scenario for each materially different supply chain path.

**Why this matters:** A 10G DWDM SFP+ transceiver could equally plausibly come from an anonymous Shenzhen white-label shop, a major Chinese branded manufacturer like Innolight, a Norwegian company like Smartoptics that offers verified non-Chinese COO options, or a U.S.-based firm like Lumentum or Coherent. Each path has radically different compliance implications. Presenting only the cheapest/most-common path as "the" scenario is misleading — it biases the compliance assessment toward worst-case without acknowledging that the distributor may have legitimate Western sourcing.

**How to identify the plausible manufacturer set:**

1. **Start from the product specification** — what class of manufacturer can produce this exact product? For a 10G DWDM SFP+ at 80km, the answer includes dozens of firms across China, Japan, the US, and Europe.
2. **Consider the distributor's positioning** — a budget-focused reseller is more likely to source from low-cost ODMs; a distributor emphasizing quality, lifetime warranties, or TAA compliance may source from Western or major branded manufacturers.
3. **Check for country-of-origin indicators** — some distributors offer COO documentation, TAA compliance statements, or BABA self-certification. These narrow the field.
4. **Search for the distributor's known supplier relationships** — press releases, partnership announcements, certification pages, and trade show co-appearances can reveal sourcing partners.
5. **Consider that sourcing may change over time** — a distributor may use different manufacturers for the same SKU depending on pricing, availability, and customer requirements.

**Scenario generation guidance:**

| # of scenarios | When |
|---|---|
| 1 scenario | Manufacturer is confirmed (Tier A/B) |
| 2 scenarios | Two materially different paths: e.g., domestic assembly with imported subcomponents vs. fully imported |
| 3+ scenarios | Manufacturer unknown and product category is served by manufacturers with different compliance profiles (e.g., anonymous Chinese ODM vs. Western manufacturer vs. major Chinese branded firm with screenable ownership) |

Each scenario should represent a **materially different compliance outcome**, not just a different company name. If two candidate manufacturers would produce the same screening results (e.g., two privately-founded Chinese firms both clean on all tiers), they belong in the same scenario with both listed as candidates.

**Physical inspection as a resolution path:** For active optical transceivers, the module's EEPROM contains vendor ID fields (bytes 20–35 of the SFF-8472 A0 page) that typically identify the actual manufacturer regardless of branding. Recommending physical inspection of the unit — reading the EEPROM with an SFP+ diagnostic tool — is a valid finding that can resolve manufacturer opacity without relying solely on public research.

### Opacity as a Finding

If a part number cannot be traced to a manufacturer through public sources, that opacity is itself a compliance-relevant finding. Document it explicitly:

- The part number is not indexed by any known manufacturer
- The format does not match any documented ordering schema
- The prefix may be buyer-assigned or distributor-assigned
- Manufacturer identity requires direct inquiry to the seller

**Severity varies by product category:**
- **Active equipment** (transceivers, switches, routers — anything with firmware): Manufacturer opacity is a high-severity finding because FCC Covered List screening cannot be completed. The inability to rule out Huawei/ZTE/HiSilicon components in the supply chain is a specific, documentable risk.
- **Passive components** (cables, patch cords, CWDM filters, splitters): Manufacturer opacity is a lower-severity finding — the FCC Covered List does not apply to passive devices. However, state ownership and BIS Entity List screening still require manufacturer identification for BEAD/BABA purposes.

When manufacturer identity is opaque, follow the Manufacturer Provenance Diversity guidance above to generate scenarios spanning the plausible range of origins rather than defaulting to a single assumption. For active equipment, recommend EEPROM inspection (SFF-8472/SFF-8636 vendor ID fields) as a resolution path.

This is particularly relevant for BEAD/BABA compliance where domestic-origin documentation is required.

## Workflow

1. **Research phase**: follow the Part Number Research Methodology above
2. **Config authoring**: create a JSON config with nodes, flows, risk assessments, and corporate hierarchies populated from research findings
3. **Generation**: `node supply-flow.js config.json -o /mnt/user-data/outputs/PARTNUMBER-scenario-a.html`
4. **Review**: open in browser, click nodes to verify popover content, check flow labels, verify corporate tree sources
5. **Iterate**: update config and regenerate as needed

Output filenames always follow the pattern `PARTNUMBER-scenario-#.html`, using a letter or number suffix (a, b, c…) even when there is only one scenario. For uncertain provenance, generate multiple scenario configs (e.g., `PARTNUMBER-scenario-a.json`, `PARTNUMBER-scenario-b.json`) representing different plausible supply chain paths.

## Quality Checklist

- [ ] Every node has `lat`/`lon` placing it at the correct city
- [ ] Every node has a `riskAssessment` with at least `geopoliticalRisk` and `fccCoveredList`
- [ ] Every node where `coveredList: true` has a `coveredNote` explaining the basis
- [ ] `cslSearchName` is populated for every non-U.S. entity
- [ ] Flows connect in the correct direction (upstream → downstream)
- [ ] Dashed flows are used for heritage/historical relationships, not active product flows
- [ ] Corporate hierarchy uses `owners` (upward) and `subsidiaries` (downward), not `children`
- [ ] **Each hierarchy anchor is a map-node entity** (manufacturer, distributor, assembler) — not a top-level parent with the map-node buried as a subsidiary
- [ ] Corporate hierarchy `source` fields link to verifiable public sources (press releases, SEC filings, stock exchange profiles)
- [ ] **Every hierarchy entity (owners and subsidiaries) has been screened** against: (1) state ownership, (2) FCC Covered List, (3) DoC/BIS Entity List
- [ ] Positive screening findings are documented in the entity's `highlight` field using the standard text patterns
- [ ] Owner entities include a `share` field where ownership percentage is publicly known
- [ ] Part number confidence tier is documented in the subtitle or product specs
- [ ] Product category (`active` or `passive`) is correctly set — this determines whether FCC Covered List screening applies
- [ ] When manufacturer is unknown, multiple scenarios cover the plausible range of provenance (not just cheapest-path assumption) per Manufacturer Provenance Diversity guidance
- [ ] For active equipment with opaque manufacturer, EEPROM vendor ID inspection is recommended as a resolution path
- [ ] Output filename follows the convention `PARTNUMBER-scenario-#.html` (e.g., `FM0-PA1002CZBEZB001M-scenario-a.html`), even for single-scenario cases (use `-scenario-a`)
- [ ] No JavaScript in the output HTML
