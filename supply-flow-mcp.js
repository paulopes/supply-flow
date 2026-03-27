#!/usr/bin/env node
// supply-flow-mcp.js — MCP stdio server for supply-flow investigation tools
// Wraps supply-flow.js (diagram generation) and supply-flow-state.js (state management)
// Exposes 21 tools via JSON-RPC 2.0 over stdin/stdout
'use strict';

var fs = require('fs');
var path = require('path');
var readline = require('readline');

// Import backend modules from skill/ directory
var stateModule = require('./skill/supply-flow-state.js');
var flowModule = require('./skill/supply-flow.js');

// Load SKILL.md for resource serving
var SKILL_PATH = path.join(__dirname, 'skill', 'supply-flow-SKILL.md');
var SKILL_CONTENT = '';
try {
  SKILL_CONTENT = fs.readFileSync(SKILL_PATH, 'utf8');
} catch (err) {
  console.error('Warning: Could not load SKILL.md:', err.message);
}

// Define available resources
var RESOURCES = [
  {
    uri: 'supply-flow://research-methodology',
    name: 'research-methodology',
    description: 'Complete supply chain research methodology for the purpose of supply-flow investigation. Covers 4 phases of investigation, 11 detailed steps, part number decoding techniques (progressive prefix truncation, suffix isolation, punctuation reinsertion, format fingerprinting), corporate hierarchy research, entity screening (state ownership, FCC Covered List, BIS Entity List), and confidence tier assignment. Required reading before beginning part number investigation.',
    mimeType: 'text/markdown'
  }
];

// JSON-RPC message handling
var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

function sendResponse(id, result, error) {
  var response = {
    jsonrpc: '2.0',
    id: id
  };
  if (error) {
    response.error = error;
  } else {
    response.result = result;
  }
  console.log(JSON.stringify(response));
}

// ── Tool Definitions ──────────────────────────────────────────────────

var TOOLS = [
  {
    name: 'init_research',
    description: 'Initialize a supply chain investigation for a part number. Decomposes the part number into searchable segments. Always call show_templates immediately after to get the required search queries for all strategies.',
    inputSchema: {
      type: 'object',
      properties: {
        partNumber: { type: 'string', description: 'Part number to investigate' },
        description: { type: 'string', description: 'Product description (optional)' },
        category: { type: 'string', description: 'Product category (optional)' }
      },
      required: ['partNumber']
    }
  },
  {
    name: 'show_templates',
    description: 'Display pre-built search query templates for every required Step 1 and Step 1a strategy, with coverage status (✓ done / ○ pending). Execute every template query in order, logging each with log_search and its strategy ID. The Phase 1 gate blocks until all strategies show ✓.',
    inputSchema: {
      type: 'object',
      properties: {
        partNumber: { type: 'string', description: 'Part number' }
      },
      required: ['partNumber']
    }
  },
  {
    name: 'resume_research',
    description: 'Get current research state, blockers, strategy gaps, pending leads, and pending domains.',
    inputSchema: {
      type: 'object',
      properties: {
        partNumber: { type: 'string', description: 'Part number' }
      },
      required: ['partNumber']
    }
  },
  {
    name: 'log_search',
    description: 'Record a web search. The strategy parameter must match a strategy ID from show_templates (e.g., "dir-distributor", "suffix-pdf"). Searches without valid strategy IDs do not count toward Phase 1 coverage.',
    inputSchema: {
      type: 'object',
      properties: {
        partNumber: { type: 'string', description: 'Part number' },
        query: { type: 'string', description: 'The search query executed' },
        step: { type: 'string', description: 'Step identifier (1, 1a, etc.)' },
        strategy: { type: 'string', description: 'Strategy ID from show_templates' },
        finding: { type: 'string', description: 'Description of findings from this search' }
      },
      required: ['partNumber', 'query']
    }
  },
  {
    name: 'log_lead',
    description: 'Record a partial finding (potential distributor, URL, company name) before fully investigating it. Persists the finding so it survives context loss. Pending leads block phase advancement until resolved via resolve_lead.',
    inputSchema: {
      type: 'object',
      properties: {
        partNumber: { type: 'string', description: 'Part number' },
        description: { type: 'string', description: 'Description of the lead' },
        step: { type: 'string', description: 'Step identifier (optional)' },
        priority: { type: 'string', enum: ['high', 'normal'], description: 'Priority level' }
      },
      required: ['partNumber', 'description']
    }
  },
  {
    name: 'resolve_lead',
    description: 'Resolve a pending lead. Use result format: "investigated: confirmed as distributor" or "dismissed: wrong vertical".',
    inputSchema: {
      type: 'object',
      properties: {
        partNumber: { type: 'string', description: 'Part number' },
        leadIndex: { type: 'number', description: 'Index of the lead to resolve' },
        result: { type: 'string', description: 'Resolution: "investigated: ..." or "dismissed: ..."' }
      },
      required: ['partNumber', 'leadIndex', 'result']
    }
  },
  {
    name: 'add_entity',
    description: 'Add a supply chain entity. Role must be manufacturer, assembler, oem, distributor, or operator. When the source URL matches a pending domain, that domain is auto-resolved.',
    inputSchema: {
      type: 'object',
      properties: {
        partNumber: { type: 'string', description: 'Part number' },
        name: { type: 'string', description: 'Entity name' },
        role: { type: 'string', enum: ['manufacturer', 'assembler', 'oem', 'distributor', 'operator'], description: 'Entity role' },
        city: { type: 'string', description: 'City (optional)' },
        country: { type: 'string', description: 'Country (optional)' },
        source: { type: 'string', description: 'Source URL (optional)' },
        id: { type: 'string', description: 'Custom entity ID (optional)' }
      },
      required: ['partNumber', 'name', 'role']
    }
  },
  {
    name: 'screen_entity',
    description: 'Screen an entity on state ownership, FCC Covered List, and BIS Entity List.',
    inputSchema: {
      type: 'object',
      properties: {
        partNumber: { type: 'string', description: 'Part number' },
        entityId: { type: 'string', description: 'Entity ID' },
        stateOwnership: { type: 'string', description: 'State ownership screening result (optional)' },
        fcc: { type: 'string', description: 'FCC Covered List result (optional)' },
        bis: { type: 'string', description: 'BIS Entity List result (optional)' }
      },
      required: ['partNumber', 'entityId']
    }
  },
  {
    name: 'add_owner',
    description: 'Add an owner to an entity. Automatically marks ownership research as completed.',
    inputSchema: {
      type: 'object',
      properties: {
        partNumber: { type: 'string', description: 'Part number' },
        entityId: { type: 'string', description: 'Entity ID' },
        name: { type: 'string', description: 'Owner name' },
        role: { type: 'string', description: 'Owner role (optional)' },
        location: { type: 'string', description: 'Owner location (optional)' },
        share: { type: 'string', description: 'Ownership share (optional)' },
        notes: { type: 'string', description: 'Notes (optional)' }
      },
      required: ['partNumber', 'entityId', 'name']
    }
  },
  {
    name: 'add_subsidiary',
    description: 'Add a subsidiary to an entity. Automatically marks ownership research as completed.',
    inputSchema: {
      type: 'object',
      properties: {
        partNumber: { type: 'string', description: 'Part number' },
        entityId: { type: 'string', description: 'Entity ID' },
        name: { type: 'string', description: 'Subsidiary name' },
        role: { type: 'string', description: 'Subsidiary role (optional)' },
        location: { type: 'string', description: 'Subsidiary location (optional)' },
        notes: { type: 'string', description: 'Notes (optional)' }
      },
      required: ['partNumber', 'entityId', 'name']
    }
  },
  {
    name: 'confirm_ownership',
    description: 'Document ownership research when no owners were found. The sources parameter must list registries searched (e.g., "Wisconsin DFI, OpenOwnership, SEC EDGAR, LinkedIn").',
    inputSchema: {
      type: 'object',
      properties: {
        partNumber: { type: 'string', description: 'Part number' },
        entityId: { type: 'string', description: 'Entity ID' },
        sources: { type: 'string', description: 'Registries/sources searched' }
      },
      required: ['partNumber', 'entityId', 'sources']
    }
  },
  {
    name: 'set_opacity',
    description: 'Classify unresolved entity opacity. Only "exhausted" is acceptable for final output. "interrupted" and "partial" indicate incomplete investigation.',
    inputSchema: {
      type: 'object',
      properties: {
        partNumber: { type: 'string', description: 'Part number' },
        entityId: { type: 'string', description: 'Entity ID' },
        tier: { type: 'string', enum: ['exhausted', 'interrupted', 'partial'], description: 'Opacity tier' }
      },
      required: ['partNumber', 'entityId', 'tier']
    }
  },
  {
    name: 'add_flow',
    description: 'Add a supply chain flow between two entities.',
    inputSchema: {
      type: 'object',
      properties: {
        partNumber: { type: 'string', description: 'Part number' },
        from: { type: 'string', description: 'From entity ID' },
        to: { type: 'string', description: 'To entity ID' },
        label: { type: 'string', description: 'Flow label (optional)' },
        color: { type: 'string', description: 'Flow color (optional)' },
        dashed: { type: 'boolean', description: 'Dashed line (optional)' }
      },
      required: ['partNumber', 'from', 'to']
    }
  },
  {
    name: 'add_scenario',
    description: 'Add a supply chain scenario.',
    inputSchema: {
      type: 'object',
      properties: {
        partNumber: { type: 'string', description: 'Part number' },
        id: { type: 'string', description: 'Scenario ID' },
        title: { type: 'string', description: 'Scenario title' },
        tier: { type: 'string', description: 'Scenario tier (A-E)' },
        entities: { type: 'array', items: { type: 'string' }, description: 'Entity IDs in scenario (optional)' }
      },
      required: ['partNumber', 'id', 'title', 'tier']
    }
  },
  {
    name: 'advance_phase',
    description: 'Advance to the next investigation phase. Internally validates — refuses if phase gates are not passed.',
    inputSchema: {
      type: 'object',
      properties: {
        partNumber: { type: 'string', description: 'Part number' }
      },
      required: ['partNumber']
    }
  },
  {
    name: 'validate_research',
    description: 'Validate research completeness. Returns pass/fail with detailed issue list.',
    inputSchema: {
      type: 'object',
      properties: {
        partNumber: { type: 'string', description: 'Part number' }
      },
      required: ['partNumber']
    }
  },
  {
    name: 'extract_domain',
    description: 'Extract domain from URL and track as pending lead if not a known manufacturer. Phase 2 gate blocks until all pending domains are resolved.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to extract domain from' },
        partNumber: { type: 'string', description: 'Part number (optional, for state tracking)' }
      },
      required: ['url']
    }
  },
  {
    name: 'resolve_domain',
    description: 'Resolve a pending domain. Either link it to an existing entity via entity-id, or dismiss with reason.',
    inputSchema: {
      type: 'object',
      properties: {
        partNumber: { type: 'string', description: 'Part number' },
        domain: { type: 'string', description: 'Domain to resolve' },
        entityId: { type: 'string', description: 'Existing entity ID to link to (optional)' },
        reason: { type: 'string', description: 'Reason for dismissal (optional)' }
      },
      required: ['partNumber', 'domain']
    }
  },
  {
    name: 'research_log',
    description: 'Log a research note in the state file.',
    inputSchema: {
      type: 'object',
      properties: {
        partNumber: { type: 'string', description: 'Part number' },
        message: { type: 'string', description: 'Message to log' }
      },
      required: ['partNumber', 'message']
    }
  },
  {
    name: 'get_status',
    description: 'Get full research status summary.',
    inputSchema: {
      type: 'object',
      properties: {
        partNumber: { type: 'string', description: 'Part number' }
      },
      required: ['partNumber']
    }
  },
  {
    name: 'generate_diagram',
    description: 'Generate interactive HTML supply chain flow diagram. Requires Phase 4. Internally validates — refuses if entities are unscreened, ownership is undocumented, pending leads/domains are unresolved, or counterbalance rule is unsatisfied.',
    inputSchema: {
      type: 'object',
      properties: {
        partNumber: { type: 'string', description: 'Part number' },
        scenarioId: { type: 'string', description: 'Scenario ID to diagram' },
        config: { type: 'object', description: 'Diagram configuration (optional)' }
      },
      required: ['partNumber', 'scenarioId']
    }
  }
];

// ── Tool Call Handlers ────────────────────────────────────────────────

function handleExtractDomain(params) {
  var domain = stateModule.extractDomain(params.url);
  if (!domain) return { error: 'Could not extract domain from URL' };
  
  var result = { domain: domain };
  
  if (params.partNumber) {
    var state = stateModule.loadState(params.partNumber);
    if (state) {
      var match = state.entities.find(function(e) {
        return e.source && e.source.toLowerCase().indexOf(domain.toLowerCase()) !== -1;
      });
      if (match) {
        result.matchedEntity = { id: match.id, name: match.name, role: match.role };
        result.message = 'Domain matches known entity: ' + match.name + ' (' + match.role + ')';
      } else {
        if (!state.pendingDomains) state.pendingDomains = [];
        var existing = state.pendingDomains.find(function(d) { return d.domain === domain; });
        if (!existing) {
          state.pendingDomains.push({
            domain: domain,
            url: params.url,
            resolved: false,
            resolvedTo: null,
            timestamp: new Date().toISOString()
          });
          stateModule.saveState(state);
        }
        result.newPendingDomain = !existing;
        result.message = 'Domain does NOT match any known entity — tracked as pending domain. Phase 2 gate will block until resolved via add_entity (auto-resolves when source URL contains the domain) or resolve_domain --reason.';
      }
    }
  }
  return result;
}

function handleGenerateDiagram(params) {
  var pn = params.partNumber;
  var scenarioId = params.scenarioId;
  if (!pn || !scenarioId) {
    return { error: 'partNumber and scenarioId required' };
  }
  
  var state = stateModule.loadState(pn);
  if (!state) return { error: 'No state file for ' + pn };
  
  // Run validation
  var validation = stateModule.validate({ partNumber: pn });
  if (!validation.success) {
    return { 
      error: 'Validation failed — cannot generate diagram',
      details: validation.data.issues
    };
  }
  
  if (state.phase < 4) {
    return { error: 'Phase 4 required for diagram generation — currently at phase ' + state.phase };
  }
  
  var scenario = state.scenarios.find(function(s) { return s.id === scenarioId; });
  if (!scenario) {
    return { error: 'Scenario not found: ' + scenarioId };
  }
  
  // Build config from state and scenario
  var config = params.config || {};
  config.nodes = state.entities.map(function(e) {
    return {
      id: e.id,
      label: e.name,
      role: e.role,
      location: e.location
    };
  });
  config.flows = state.flows;
  
  try {
    var html = flowModule.generateDiagram(config);
    return { html: html, message: 'Diagram generated successfully' };
  } catch (err) {
    return { error: 'Diagram generation failed: ' + err.message };
  }
}

function toolCall(name, params) {
  switch (name) {
    case 'init_research':
      return stateModule.init(params);
    case 'show_templates':
      return stateModule.showTemplates(params);
    case 'resume_research':
      return stateModule.resume(params);
    case 'log_search':
      return stateModule.logSearch(params);
    case 'log_lead':
      return stateModule.logLead(params);
    case 'resolve_lead':
      return stateModule.resolveLead(params);
    case 'add_entity':
      return stateModule.addEntity(params);
    case 'screen_entity':
      return stateModule.screen(params);
    case 'add_owner':
      return stateModule.addOwner(params);
    case 'add_subsidiary':
      return stateModule.addSubsidiary(params);
    case 'confirm_ownership':
      return stateModule.confirmOwnership(params);
    case 'set_opacity':
      return stateModule.setOpacity(params);
    case 'add_flow':
      return stateModule.addFlow(params);
    case 'add_scenario':
      return stateModule.addScenario(params);
    case 'advance_phase':
      return stateModule.advancePhase(params);
    case 'validate_research':
      return stateModule.validate(params);
    case 'extract_domain':
      return handleExtractDomain(params);
    case 'resolve_domain':
      return stateModule.resolveDomain(params);
    case 'research_log':
      return stateModule.log(params);
    case 'get_status':
      return stateModule.status(params);
    case 'generate_diagram':
      return handleGenerateDiagram(params);
    default:
      return { error: 'Unknown tool: ' + name };
  }
}

// ── JSON-RPC Message Handler ──────────────────────────────────────────

function handleMessage(line) {
  if (!line || !line.trim()) return;
  
  var message;
  try {
    message = JSON.parse(line);
  } catch (err) {
    sendResponse(null, null, { code: -32700, message: 'Parse error' });
    return;
  }
  
  var id = message.id;
  var method = message.method;
  var params = message.params || {};
  
  if (!method) {
    sendResponse(id, null, { code: -32600, message: 'Invalid request' });
    return;
  }
  
  switch (method) {
    case 'initialize':
      sendResponse(id, {
        protocolVersion: '2024-11-05',
        capabilities: {
          resources: {}
        },
        serverInfo: {
          name: 'supply-flow-mcp',
          version: '1.0.0'
        },
        instructions: 'supply-flow MCP Server implements a 4-phase supply chain investigation workflow for compliance screening under 47 CFR Part 2 and 47 U.S.C. § 1601. PHASE 1 (Distributor Identification): Use show_templates to display required search queries across 7 prescribed strategies (industry directories: distributor, supplier, solutions provider, solutions integrator, reseller, value-added reseller, vendor). Complete all Step 1 searches for Phase 1 gate. PHASE 2 (Supply Chain Tracing): Trace from distributor to manufacturer via distributor-hosted documentation. PHASE 3 (Entity Screening): Screen every entity on state ownership, FCC Covered List, and BIS Entity List using three-tier screening. Research corporate ownership chains. PHASE 4 (Scenario Generation): Generate supply chain diagrams with corporate hierarchy trees. Read the research-methodology resource for detailed 11-step investigation process, part number decoding techniques (progressive prefix truncation, suffix isolation, punctuation reinsertion, format fingerprinting), and confidence tier assignment. Always begin with init_research, then show_templates. Use resume_research to checkpoint across interruptions. Phase gates mechanically enforce completeness.'
      });
      break;
    
    case 'tools/list':
      sendResponse(id, { tools: TOOLS });
      break;
    
    case 'tools/call':
      var toolName = params.name;
      var toolParams = params.arguments || {};
      var result = toolCall(toolName, toolParams);
      sendResponse(id, result);
      break;
    
    case 'resources/list':
      sendResponse(id, { resources: RESOURCES });
      break;
    
    case 'resources/read':
      var resourceUri = params.uri;
      if (resourceUri === 'supply-flow://research-methodology') {
        if (SKILL_CONTENT) {
          sendResponse(id, {
            contents: [{
              uri: resourceUri,
              mimeType: 'text/markdown',
              text: SKILL_CONTENT
            }]
          });
        } else {
          sendResponse(id, null, {
            code: -32600,
            message: 'Resource not available: SKILL.md could not be loaded'
          });
        }
      } else {
        sendResponse(id, null, {
          code: -32600,
          message: 'Unknown resource: ' + resourceUri
        });
      }
      break;
    
    default:
      sendResponse(id, null, { code: -32601, message: 'Method not found' });
  }
}

// ── Main ──────────────────────────────────────────────────────────────

rl.on('line', handleMessage);
