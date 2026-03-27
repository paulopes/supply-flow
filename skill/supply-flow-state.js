#!/usr/bin/env node
// research-state.js — Supply chain investigation state manager
// Manages per-part-number research state, enforces investigation phases,
// validates completeness, and provides resume checkpoints.
// No dependencies — Node.js built-ins only.
// Dual CLI/module mode: guard CLI code with `if (require.main === module)`
'use strict';
var fs = require('fs');
var path = require('path');

// ── State file path ────────────────────────────────────────────────────
function stateFile(pn) {
  var safe = pn.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(process.cwd(), 'research-' + safe + '.json');
}

function loadState(pn) {
  var f = stateFile(pn);
  if (!fs.existsSync(f)) return null;
  return JSON.parse(fs.readFileSync(f, 'utf8'));
}

function saveState(state) {
  var f = stateFile(state.partNumber);
  fs.writeFileSync(f, JSON.stringify(state, null, 2), 'utf8');
  return f;
}

// ── Part number decomposition ──────────────────────────────────────────
function decompose(pn) {
  var hParts = pn.split('-');
  var numMatch = pn.replace(/-/g, '').match(/\d+/);
  var numeric = numMatch ? numMatch[0] : null;
  var prefixes = [];
  var chars = pn.split('');
  for (var i = chars.length; i >= 1; i--) {
    var p = chars.slice(0, i).join('');
    if (p.length >= 2 && (prefixes.length === 0 || prefixes[prefixes.length - 1] !== p)) {
      prefixes.push(p);
    }
  }
  var meaningful = [pn];
  var last = pn;
  for (var i = 1; i < prefixes.length; i++) {
    if (prefixes[i].length <= last.length - 1) {
      if (last.length - prefixes[i].length >= 2 || last.indexOf('-') !== prefixes[i].indexOf('-')) {
        meaningful.push(prefixes[i]);
        last = prefixes[i];
      }
    }
  }
  if (hParts.length > 1) {
    var accum = '';
    for (var i = 0; i < hParts.length - 1; i++) {
      accum += (i > 0 ? '-' : '') + hParts[i];
      if (meaningful.indexOf(accum) === -1 && meaningful.indexOf(accum + '-') === -1) {
        meaningful.push(accum);
      }
    }
  }
  var stripped = pn.replace(/-/g, '');
  var suffixes = [];
  if (numeric) {
    var numIdx = stripped.indexOf(numeric);
    var afterNum = stripped.substring(numIdx + numeric.length);
    if (afterNum.length >= 2) suffixes.push(afterNum);
    for (var i = 1; i < afterNum.length - 1; i++) {
      var sub = afterNum.substring(i);
      if (sub.length >= 2 && !/^\d+$/.test(sub)) suffixes.push(sub);
    }
    var fullSuffix = stripped.substring(numIdx);
    if (fullSuffix !== numeric && suffixes.indexOf(fullSuffix) === -1) {
      suffixes.unshift(fullSuffix);
    }
  }
  var probPrefix = null;
  if (numeric) {
    var idx = pn.indexOf(numeric);
    if (idx > 0) {
      probPrefix = pn.substring(0, idx).replace(/-+$/, '');
    }
  }
  var probSuffix = null;
  if (numeric && suffixes.length > 0) {
    probSuffix = suffixes[suffixes.length - 1];
    if (suffixes[0].length > numeric.length) probSuffix = suffixes[0].replace(new RegExp('^' + numeric), '');
    if (!probSuffix || probSuffix.length < 2) probSuffix = suffixes[0];
  }
  return {
    raw: pn,
    hyphenParts: hParts,
    numeric: numeric,
    prefixes: meaningful,
    suffixes: suffixes,
    probableDistributorPrefix: probPrefix,
    probableManufacturerSuffix: probSuffix
  };
}

function extractDomain(url) {
  try {
    var match = url.match(/^https?:\/\/(?:www\.)?([^\/]+)/);
    return match ? match[1] : null;
  } catch (e) { return null; }
}

// ── Required search strategies ──────────────────────────────────────────
// Each strategy is a prescribed search approach from the methodology.
// The Phase 1 gate checks that each strategy has at least one logged search.
var STEP1_STRATEGIES = [
  { id: 'dir-distributor',   label: 'Industry directory: "distributor"',             template: '"[CATEGORY]" distributor United States' },
  { id: 'dir-supplier',      label: 'Industry directory: "supplier"',               template: '"[CATEGORY]" supplier United States' },
  { id: 'dir-solutions',     label: 'Industry directory: "solutions provider"',      template: '"[CATEGORY]" "solutions provider" United States' },
  { id: 'dir-integrator',    label: 'Industry directory: "solutions integrator"',    template: '"[CATEGORY]" "solutions integrator" United States' },
  { id: 'dir-reseller',      label: 'Industry directory: "reseller"',               template: '"[CATEGORY]" reseller United States' },
  { id: 'dir-var',           label: 'Industry directory: "value added reseller"',    template: '"[CATEGORY]" "value added reseller" United States' },
  { id: 'dir-vendor',        label: 'Industry directory: "vendor" broadband',        template: '"[CATEGORY]" vendor broadband' }
];

var STEP1A_STRATEGIES = [
  { id: 'prefix-entity',     label: 'Bare prefix as company/entity name (no vertical qualifiers)', template: '"[PREFIX]" company OR corporation OR LLC OR Inc OR electronics' },
  { id: 'suffix-pdf',        label: 'Broad suffix + filetype:pdf search',           template: '[SUFFIX] filetype:pdf [KEYWORDS]' },
  { id: 'gov-procurement',   label: 'Government procurement / grant databases',     template: '[PREFIX] broadband grant procurement' },
  { id: 'import-trade',      label: 'Import/trade record search',                   template: '[PREFIX] import trade record fiber cable' },
  { id: 'regional-assoc',    label: 'Regional telecom association member lists',     template: '"[CATEGORY]" telecom association member' },
  { id: 'linkedin-registry', label: 'LinkedIn / business registry search',          template: '"[PREFIX]" fiber optic company LinkedIn OR "business registry"' }
];

// Generate concrete query templates from product metadata
function generateQueryTemplates(state) {
  var desc = state.description || '';
  var prefix = (state.decomposition && state.decomposition.probableDistributorPrefix) || '';
  var suffix = (state.decomposition && state.decomposition.probableManufacturerSuffix) || '';
  // Extract category keywords from description
  var keywords = desc.replace(/[0-9,.'"/]+/g, ' ').replace(/\s+/g, ' ').trim();
  // Infer short category from description
  var category = 'fiber optic cable';
  if (/loose tube/i.test(desc)) category = 'fiber optic loose tube cable';
  if (/ribbon/i.test(desc)) category = 'fiber optic ribbon cable';
  if (/drop/i.test(desc)) category = 'fiber optic drop cable';
  if (/ADSS/i.test(desc)) category = 'ADSS fiber optic cable';
  if (/transceiver|SFP|QSFP/i.test(desc)) category = 'optical transceiver';
  var templates = { step1: [], step1a: [], step2: [] };
  STEP1_STRATEGIES.forEach(function(s) {
    templates.step1.push({
      strategy: s.id,
      query: s.template.replace('[CATEGORY]', category)
    });
  });
  STEP1A_STRATEGIES.forEach(function(s) {
    var keywordsShort = keywords.split(' ').slice(0, 4).join(' ');
    templates.step1a.push({
      strategy: s.id,
      query: s.template
        .replace('[SUFFIX]', suffix)
        .replace('[PREFIX]', prefix)
        .replace('[KEYWORDS]', keywordsShort)
        .replace('[CATEGORY]', category)
    });
  });
  return templates;
}

// ── Opacity tiers for unresolved entities ──────────────────────────────
var OPACITY_TIERS = {
  'exhausted':   'All prescribed search strategies attempted — entity genuinely not findable through public sources.',
  'interrupted': 'Search was interrupted by tool limits or session break — strategies remain unattempted.',
  'partial':     'Some strategies attempted, others skipped — search coverage is incomplete.'
};

// ── Phase definitions ──────────────────────────────────────────────────
var PHASES = {
  1: {
    name: 'Distributor Identification',
    description: 'Identify the distributor/seller by name, location, and corporate details. If landscape search (Step 1) and candidate matching (Step 2) fail, escalate to deep distributor search (Step 1a).',
    gate: function(state) {
      var distributors = state.entities.filter(function(e) { return e.role === 'distributor'; });

      // Check for unresolved pending leads — these block advancement
      var unresolvedLeads = (state.pendingLeads || []).filter(function(l) { return !l.resolved && l.phase === 1; });
      if (unresolvedLeads.length > 0) {
        return 'Unresolved leads from Phase 1 must be investigated or dismissed before advancing:\n    ' +
          unresolvedLeads.map(function(l) { return l.description + ' (logged ' + l.timestamp + ')'; }).join('\n    ') +
          '\n  Use: resolve-lead <partNumber> <leadIndex> --result "investigated: ...|dismissed: ..."';
      }

      // Check strategy coverage for Step 1
      var step1Strategies = STEP1_STRATEGIES.map(function(s) { return s.id; });
      var attemptedStep1 = {};
      state.searches.forEach(function(s) {
        if (s.strategy && step1Strategies.indexOf(s.strategy) !== -1) {
          attemptedStep1[s.strategy] = true;
        }
      });
      var missingStep1 = step1Strategies.filter(function(id) { return !attemptedStep1[id]; });

      if (distributors.length === 0) {
        if (missingStep1.length > 0) {
          var missingLabels = missingStep1.map(function(id) {
            var s = STEP1_STRATEGIES.find(function(x) { return x.id === id; });
            return s ? s.label : id;
          });
          return 'Step 1 incomplete — ' + missingStep1.length + '/' + step1Strategies.length + ' required search strategies not yet attempted:\n    ' +
            missingLabels.join('\n    ') +
            '\n  Use: log-search <pn> "<query>" --step 1 --strategy <strategy-id> --finding "..."' +
            '\n  Run: node research-state.js show-templates <pn> to see pre-built queries for each strategy.';
        }
        // Step 1 done, check Step 1a
        var step1aStrategies = STEP1A_STRATEGIES.map(function(s) { return s.id; });
        var attemptedStep1a = {};
        state.searches.forEach(function(s) {
          if (s.strategy && step1aStrategies.indexOf(s.strategy) !== -1) {
            attemptedStep1a[s.strategy] = true;
          }
        });
        var missingStep1a = step1aStrategies.filter(function(id) { return !attemptedStep1a[id]; });
        if (missingStep1a.length > 0) {
          var missingLabels1a = missingStep1a.map(function(id) {
            var s = STEP1A_STRATEGIES.find(function(x) { return x.id === id; });
            return s ? s.label : id;
          });
          return 'Step 1a incomplete — ' + missingStep1a.length + '/' + step1aStrategies.length + ' deep search strategies not yet attempted:\n    ' +
            missingLabels1a.join('\n    ') +
            '\n  Use: log-search <pn> "<query>" --step 1a --strategy <strategy-id> --finding "..."';
        }
        // All strategies exhausted, no distributor — allow advancement but only with opacity tier
        return null;
      }

      // Distributor exists — check if it's a placeholder
      var placeholders = distributors.filter(function(e) { return /unidentified|unknown|placeholder|unresolved/i.test(e.name); });
      if (placeholders.length > 0 && placeholders.length === distributors.length) {
        // Check opacity tier
        var hasOpacityTier = placeholders.every(function(e) { return e.opacityTier; });
        if (!hasOpacityTier) {
          return 'Distributor "' + placeholders[0].name + '" requires an opacity tier classification.\n  Use: set-opacity <pn> <entityId> --tier exhausted|interrupted|partial';
        }
        var partialOrInterrupted = placeholders.filter(function(e) { return e.opacityTier === 'interrupted' || e.opacityTier === 'partial'; });
        if (partialOrInterrupted.length > 0) {
          // Check if all step 1 + 1a strategies are covered
          if (missingStep1.length > 0) {
            return 'Opacity tier is "' + partialOrInterrupted[0].opacityTier + '" but Step 1 strategies are incomplete. Complete all strategies before accepting opacity, or change tier to "exhausted" after completing them.';
          }
          var step1aStrategies2 = STEP1A_STRATEGIES.map(function(s) { return s.id; });
          var attemptedStep1a2 = {};
          state.searches.forEach(function(s) {
            if (s.strategy && step1aStrategies2.indexOf(s.strategy) !== -1) {
              attemptedStep1a2[s.strategy] = true;
            }
          });
          var missingStep1a2 = step1aStrategies2.filter(function(id) { return !attemptedStep1a2[id]; });
          if (missingStep1a2.length > 0) {
            return 'Opacity tier is "' + partialOrInterrupted[0].opacityTier + '" but Step 1a strategies are incomplete (' + missingStep1a2.length + ' remaining). Complete all strategies or document why each was skipped.';
          }
        }
      }
      return null;
    }
  },
  2: {
    name: 'Supply Chain Tracing',
    description: 'Trace each distributor\'s supply chain upstream to the manufacturer. Search distributor-hosted documentation (Step 8), identify intermediaries.',
    gate: function(state) {
      var manufacturers = state.entities.filter(function(e) { return e.role === 'manufacturer' || e.role === 'assembler'; });
      if (manufacturers.length === 0) return 'No manufacturer identified. Search distributor-hosted documentation (Step 8) and trace supply chain upstream.';
      if (state.pendingDomains) {
        var unresolved = state.pendingDomains.filter(function(d) { return !d.resolved; });
        if (unresolved.length > 0) {
          return 'Unresolved pending domain leads:\n    ' + unresolved.map(function(d) {
            return d.domain + ' (from ' + d.url + ')';
          }).join('\n    ') + '\n  Each pending domain must be resolved before advancing. For each domain, either:\n    — add-entity to add the domain owner as a supply chain participant (auto-resolves the domain), OR\n    — resolve-domain <partNumber> <domain> --entity-id <id> to link to an existing entity, OR\n    — resolve-domain <partNumber> <domain> --reason "..." to dismiss with a documented reason.';
        }
      }
      return null;
    }
  },
  3: {
    name: 'Entity Screening',
    description: 'Screen every entity (distributor, intermediary, manufacturer) on all three tiers: state ownership, FCC Covered List, BIS Entity List. Research corporate ownership for every entity.',
    gate: function(state) {
      var unscreened = [];
      var missingOwnership = [];
      state.entities.forEach(function(e) {
        if (e.role === 'operator') return;
        var s = e.screening;
        var missing = [];
        if (!s.stateOwnership) missing.push('state-ownership');
        if (!s.fccCoveredList) missing.push('fcc');
        if (!s.bisEntityList) missing.push('bis');
        if (missing.length > 0) unscreened.push(e.name + ' (' + e.role + '): missing ' + missing.join(', '));
        // Ownership research gate: every entity must have ownership researched,
        // either via add-owner/add-subsidiary (auto-marks searched) or via
        // explicit confirm-ownership --sources documenting which registries were checked.
        var or = e.ownershipResearch || { searched: false, sources: null };
        if (!or.searched) {
          var country = (e.location && e.location.country) ? e.location.country : '??';
          missingOwnership.push(e.name + ' (' + e.role + ', ' + country + '): ownership not researched — either add-owner/add-subsidiary to record findings, or confirm-ownership --sources "..." to document registries searched (e.g., state SoS filings, OpenOwnership, SEC EDGAR, LinkedIn)');
        } else if (e.location && e.location.country && e.location.country !== 'US') {
          // Stricter check for non-US entities: must have at least one owner recorded,
          // UNLESS confirm-ownership was explicitly called with documented sources
          // (indicating the researcher searched and found no public ownership info).
          if (e.corporateHierarchy.owners.length === 0 && !or.sources) {
            missingOwnership.push(e.name + ' (' + e.role + ', ' + e.location.country + '): ownership researched but no owners recorded for non-US entity — trace ownership chain to ultimate parent, or confirm-ownership --sources "..." to document that no public ownership info was found');
          }
        }
      });
      var issues = [];
      if (unscreened.length > 0) issues.push('Unscreened entities:\n    ' + unscreened.join('\n    '));
      if (missingOwnership.length > 0) issues.push('Missing ownership research:\n    ' + missingOwnership.join('\n    '));
      return issues.length > 0 ? issues.join('\n  ') : null;
    }
  },
  4: {
    name: 'Scenario Generation',
    description: 'Generate supply-flow.js config JSON for each scenario.',
    gate: function(state) {
      var hasConcern = state.entities.some(function(e) {
        var s = e.screening;
        return (s.stateOwnership && !/no|none|clean|not|n\/a/i.test(s.stateOwnership)) ||
               (s.bisEntityList && !/not listed|no|none|clean|n\/a/i.test(s.bisEntityList));
      });
      if (hasConcern && state.scenarios.length < 2) {
        return 'Adversarial-country counterbalance rule: at least one scenario with a manufacturer in a country of concern requires at least one additional scenario documenting a plausible domestic or allied-country alternative.';
      }
      var regulatory = state.entities.filter(function(e) { return e.role === 'regulatory'; });
      if (regulatory.length > 0) return 'Regulatory bodies cannot be supply chain nodes: ' + regulatory.map(function(e) { return e.name; }).join(', ');
      return null;
    }
  }
};

// ── Exported Command Functions (module mode) ───────────────────────────

function init(params) {
  var pn = params.partNumber;
  if (!pn) return { success: false, message: 'partNumber required' };
  var existing = loadState(pn);
  if (existing) {
    return { success: false, message: 'State file already exists for ' + pn, data: { file: stateFile(pn) } };
  }
  var state = {
    partNumber: pn,
    description: params.description || null,
    category: params.category || null,
    phase: 1,
    decomposition: decompose(pn),
    entities: [],
    flows: [],
    scenarios: [],
    searches: [],
    pendingDomains: [],
    pendingLeads: [],
    queryTemplates: null,
    log: [
      { timestamp: new Date().toISOString(), action: 'init', details: 'Investigation initialized for ' + pn }
    ]
  };
  state.queryTemplates = generateQueryTemplates(state);
  var f = saveState(state);
  return { success: true, message: 'Initialized ' + pn, data: { file: f, state: state } };
}

function status(params) {
  var pn = params.partNumber;
  if (!pn) return { success: false, message: 'partNumber required' };
  var state = loadState(pn);
  if (!state) return { success: false, message: 'No state file for ' + pn };
  var gateResult = PHASES[state.phase].gate(state);
  return { 
    success: true, 
    message: 'State for ' + pn,
    data: { state: state, phaseGate: gateResult }
  };
}

function resume(params) {
  var pn = params.partNumber;
  if (!pn) return { success: false, message: 'partNumber required' };
  var state = loadState(pn);
  if (!state) return { success: false, message: 'No state file for ' + pn };
  var gateResult = PHASES[state.phase].gate(state);
  var landscapeSearches = state.searches.filter(function(s) { return s.step === '1' || s.step === 'landscape'; });
  var step2Searches = state.searches.filter(function(s) { return s.step === '2' || s.step === 'candidate'; });
  var deepSearches = state.searches.filter(function(s) { return s.step === '1a' || s.step === 'deep'; });

  // Strategy coverage
  var covered = {};
  state.searches.forEach(function(s) { if (s.strategy) covered[s.strategy] = true; });
  var step1Missing = STEP1_STRATEGIES.filter(function(s) { return !covered[s.id]; });
  var step1aMissing = STEP1A_STRATEGIES.filter(function(s) { return !covered[s.id]; });

  // Pending leads
  var unresolvedLeads = (state.pendingLeads || []).filter(function(l) { return !l.resolved; });

  return {
    success: true,
    message: 'Resume checkpoint for ' + pn,
    data: {
      phase: state.phase,
      phaseName: PHASES[state.phase].name,
      phaseGate: gateResult,
      entities: state.entities,
      flows: state.flows,
      scenarios: state.scenarios,
      pendingDomains: state.pendingDomains,
      pendingLeads: unresolvedLeads,
      searchProgress: { landscape: landscapeSearches.length, step2: step2Searches.length, deep: deepSearches.length },
      strategyCoverage: {
        step1: { done: STEP1_STRATEGIES.length - step1Missing.length, total: STEP1_STRATEGIES.length, missing: step1Missing.map(function(s) { return s.id; }) },
        step1a: { done: STEP1A_STRATEGIES.length - step1aMissing.length, total: STEP1A_STRATEGIES.length, missing: step1aMissing.map(function(s) { return s.id; }) }
      }
    }
  };
}

function addEntity(params) {
  var pn = params.partNumber;
  if (!pn || !params.name || !params.role) return { success: false, message: 'partNumber, name, role required' };
  var state = loadState(pn);
  if (!state) return { success: false, message: 'No state file for ' + pn };
  var validRoles = ['manufacturer', 'assembler', 'oem', 'distributor', 'operator'];
  if (validRoles.indexOf(params.role) === -1) {
    if (params.role === 'regulatory') {
      return { success: false, message: 'Regulatory bodies cannot be supply chain nodes' };
    }
    return { success: false, message: 'Invalid role: ' + params.role };
  }
  var id = params.id || params.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
  if (state.entities.some(function(e) { return e.id === id; })) {
    return { success: false, message: 'Entity "' + id + '" already exists' };
  }
  var entity = {
    id: id,
    name: params.name,
    role: params.role,
    location: (params.city || params.country) ? {
      city: params.city || null,
      country: params.country || null,
      lat: params.lat ? parseFloat(params.lat) : null,
      lon: params.lon ? parseFloat(params.lon) : null
    } : null,
    source: params.source || null,
    screening: {
      stateOwnership: null,
      fccCoveredList: null,
      bisEntityList: null
    },
    corporateHierarchy: {
      owners: [],
      subsidiaries: []
    },
    ownershipResearch: {
      searched: false,
      sources: null
    },
    details: params.details || null
  };
  state.entities.push(entity);
  state.log.push({ timestamp: new Date().toISOString(), action: 'add-entity', details: params.role + ': ' + params.name });
  if (params.source && state.pendingDomains) {
    state.pendingDomains.forEach(function(d) {
      if (!d.resolved && params.source.toLowerCase().indexOf(d.domain.toLowerCase()) !== -1) {
        d.resolved = true;
        d.resolvedTo = id;
        state.log.push({ timestamp: new Date().toISOString(), action: 'auto-resolve-domain', details: d.domain + ' → entity ' + id });
      }
    });
  }
  if (!state.pendingLeads) state.pendingLeads = [];
  saveState(state);
  return { success: true, message: 'Added ' + params.role + ': ' + params.name, data: { entity: entity } };
}

function screen(params) {
  var pn = params.partNumber;
  var entityId = params.entityId;
  if (!pn || !entityId) return { success: false, message: 'partNumber, entityId required' };
  var state = loadState(pn);
  if (!state) return { success: false, message: 'No state file for ' + pn };
  var entity = state.entities.find(function(e) { return e.id === entityId; });
  if (!entity) return { success: false, message: 'Entity not found: ' + entityId };
  var updated = [];
  if (params.stateOwnership !== undefined) { entity.screening.stateOwnership = params.stateOwnership; updated.push('state-ownership'); }
  if (params.fcc !== undefined) { entity.screening.fccCoveredList = params.fcc; updated.push('fcc'); }
  if (params.bis !== undefined) { entity.screening.bisEntityList = params.bis; updated.push('bis'); }
  if (updated.length === 0) return { success: false, message: 'No screening fields provided' };
  state.log.push({ timestamp: new Date().toISOString(), action: 'screen', details: entityId + ': ' + updated.join(', ') });
  saveState(state);
  var count = (entity.screening.stateOwnership ? 1 : 0) + (entity.screening.fccCoveredList ? 1 : 0) + (entity.screening.bisEntityList ? 1 : 0);
  return { success: true, message: 'Screened ' + entity.name + ': ' + updated.join(', '), data: { entity: entity, screenCount: count } };
}

function addFlow(params) {
  var pn = params.partNumber;
  if (!pn || !params.from || !params.to) return { success: false, message: 'partNumber, from, to required' };
  var state = loadState(pn);
  if (!state) return { success: false, message: 'No state file for ' + pn };
  var fromEntity = state.entities.find(function(e) { return e.id === params.from; });
  var toEntity = state.entities.find(function(e) { return e.id === params.to; });
  if (!fromEntity) return { success: false, message: 'Entity not found: ' + params.from };
  if (!toEntity) return { success: false, message: 'Entity not found: ' + params.to };
  var flow = {
    from: params.from,
    to: params.to,
    label: params.label || null,
    color: params.color || null,
    dashed: !!params.dashed
  };
  state.flows.push(flow);
  state.log.push({ timestamp: new Date().toISOString(), action: 'add-flow', details: params.from + ' → ' + params.to });
  saveState(state);
  return { success: true, message: 'Added flow', data: { flow: flow } };
}

function addOwner(params) {
  var pn = params.partNumber;
  var entityId = params.entityId;
  if (!pn || !entityId || !params.name) return { success: false, message: 'partNumber, entityId, name required' };
  var state = loadState(pn);
  if (!state) return { success: false, message: 'No state file for ' + pn };
  var entity = state.entities.find(function(e) { return e.id === entityId; });
  if (!entity) return { success: false, message: 'Entity not found: ' + entityId };
  var owner = {
    name: params.name,
    role: params.role || null,
    location: params.location || null,
    share: params.share || null,
    notes: params.notes || null
  };
  entity.corporateHierarchy.owners.push(owner);
  if (!entity.ownershipResearch) entity.ownershipResearch = { searched: false, sources: null };
  entity.ownershipResearch.searched = true;
  state.log.push({ timestamp: new Date().toISOString(), action: 'add-owner', details: entityId + ' ← ' + params.name });
  saveState(state);
  return { success: true, message: 'Added owner', data: { owner: owner } };
}

function addSubsidiary(params) {
  var pn = params.partNumber;
  var entityId = params.entityId;
  if (!pn || !entityId || !params.name) return { success: false, message: 'partNumber, entityId, name required' };
  var state = loadState(pn);
  if (!state) return { success: false, message: 'No state file for ' + pn };
  var entity = state.entities.find(function(e) { return e.id === entityId; });
  if (!entity) return { success: false, message: 'Entity not found: ' + entityId };
  var subsidiary = {
    name: params.name,
    role: params.role || null,
    location: params.location || null,
    notes: params.notes || null
  };
  entity.corporateHierarchy.subsidiaries.push(subsidiary);
  if (!entity.ownershipResearch) entity.ownershipResearch = { searched: false, sources: null };
  entity.ownershipResearch.searched = true;
  state.log.push({ timestamp: new Date().toISOString(), action: 'add-subsidiary', details: entityId + ' → ' + params.name });
  saveState(state);
  return { success: true, message: 'Added subsidiary', data: { subsidiary: subsidiary } };
}

function confirmOwnership(params) {
  var pn = params.partNumber;
  var entityId = params.entityId;
  if (!pn || !entityId) return { success: false, message: 'partNumber, entityId required' };
  if (!params.sources) return { success: false, message: '--sources required: document which registries/databases were searched (e.g., "Wisconsin DFI, OpenOwnership, SEC EDGAR, LinkedIn")' };
  var state = loadState(pn);
  if (!state) return { success: false, message: 'No state file for ' + pn };
  var entity = state.entities.find(function(e) { return e.id === entityId; });
  if (!entity) return { success: false, message: 'Entity not found: ' + entityId };
  if (!entity.ownershipResearch) entity.ownershipResearch = { searched: false, sources: null };
  entity.ownershipResearch.searched = true;
  entity.ownershipResearch.sources = params.sources;
  state.log.push({ timestamp: new Date().toISOString(), action: 'confirm-ownership', details: entityId + ' — sources: ' + params.sources });
  saveState(state);
  var ownerCount = entity.corporateHierarchy.owners.length;
  var subCount = entity.corporateHierarchy.subsidiaries.length;
  var summary = ownerCount + ' owner(s), ' + subCount + ' subsidiary(ies) recorded';
  if (ownerCount === 0 && subCount === 0) summary = 'No owners or subsidiaries found after searching: ' + params.sources;
  return { success: true, message: 'Ownership research confirmed for ' + entity.name + ' — ' + summary, data: { entity: entity } };
}

function logSearch(params) {
  var pn = params.partNumber;
  var query = params.query;
  if (!pn || !query) return { success: false, message: 'partNumber, query required' };
  var state = loadState(pn);
  if (!state) return { success: false, message: 'No state file for ' + pn };
  // Validate strategy ID if provided
  if (params.strategy) {
    var allStrategies = STEP1_STRATEGIES.concat(STEP1A_STRATEGIES);
    var valid = allStrategies.find(function(s) { return s.id === params.strategy; });
    if (!valid) {
      var validIds = allStrategies.map(function(s) { return s.id; }).join(', ');
      return { success: false, message: 'Unknown strategy: ' + params.strategy + '. Valid strategies: ' + validIds };
    }
  }
  var search = {
    query: query,
    step: params.step || null,
    strategy: params.strategy || null,
    timestamp: new Date().toISOString(),
    finding: params.finding || null
  };
  state.searches.push(search);
  state.log.push({ timestamp: new Date().toISOString(), action: 'log-search', details: (params.strategy ? '[' + params.strategy + '] ' : '') + query });
  saveState(state);
  // Report strategy coverage progress
  var coverageMsg = '';
  if (params.step === '1' || params.step === 'landscape') {
    var covered = {};
    state.searches.forEach(function(s) { if (s.strategy) covered[s.strategy] = true; });
    var step1Done = STEP1_STRATEGIES.filter(function(s) { return covered[s.id]; }).length;
    coverageMsg = ' [Step 1 strategy coverage: ' + step1Done + '/' + STEP1_STRATEGIES.length + ']';
  } else if (params.step === '1a' || params.step === 'deep') {
    var covered1a = {};
    state.searches.forEach(function(s) { if (s.strategy) covered1a[s.strategy] = true; });
    var step1aDone = STEP1A_STRATEGIES.filter(function(s) { return covered1a[s.id]; }).length;
    coverageMsg = ' [Step 1a strategy coverage: ' + step1aDone + '/' + STEP1A_STRATEGIES.length + ']';
  }
  return { success: true, message: 'Logged search' + coverageMsg, data: { search: search, totalSearches: state.searches.length } };
}

function addScenario(params) {
  var pn = params.partNumber;
  if (!pn || !params.id || !params.title || !params.tier) {
    return { success: false, message: 'partNumber, id, title, tier required' };
  }
  var state = loadState(pn);
  if (!state) return { success: false, message: 'No state file for ' + pn };
  var scenario = {
    id: params.id,
    title: params.title,
    tier: params.tier,
    entities: params.entities ? (Array.isArray(params.entities) ? params.entities : params.entities.split(',')) : []
  };
  state.scenarios.push(scenario);
  state.log.push({ timestamp: new Date().toISOString(), action: 'add-scenario', details: params.id + ': ' + params.title });
  saveState(state);
  return { success: true, message: 'Added scenario', data: { scenario: scenario } };
}

function advancePhase(params) {
  var pn = params.partNumber;
  if (!pn) return { success: false, message: 'partNumber required' };
  var state = loadState(pn);
  if (!state) return { success: false, message: 'No state file for ' + pn };
  if (state.phase >= 4) {
    return { success: false, message: 'Already at final phase' };
  }
  var gate = PHASES[state.phase].gate(state);
  if (gate) {
    return { success: false, message: 'Phase ' + state.phase + ' gate blocked', data: { blocker: gate } };
  }
  state.phase++;
  state.log.push({ timestamp: new Date().toISOString(), action: 'advance-phase', details: 'Advanced to phase ' + state.phase });
  saveState(state);
  return { success: true, message: 'Advanced to phase ' + state.phase, data: { phase: state.phase, phaseName: PHASES[state.phase].name } };
}

function validate(params) {
  var pn = params.partNumber;
  if (!pn) return { success: false, message: 'partNumber required' };
  var state = loadState(pn);
  if (!state) return { success: false, message: 'No state file for ' + pn };
  var issues = [];
  for (var p = 1; p <= state.phase; p++) {
    var gate = PHASES[p].gate(state);
    if (gate) issues.push('Phase ' + p + ' (' + PHASES[p].name + '): ' + gate);
  }
  state.entities.forEach(function(e) {
    if (e.role === 'distributor' && /unidentified|unknown|placeholder/i.test(e.name)) {
      if (state.decomposition.probableDistributorPrefix) {
        issues.push('Placeholder distributor "' + e.name + '" — prefix "' + state.decomposition.probableDistributorPrefix + '" is researchable');
      }
    }
    if (e.role === 'regulatory') {
      issues.push('Regulatory body "' + e.name + '" cannot be a supply chain node');
    }
    if (!e.location && e.role !== 'operator') {
      issues.push('Entity "' + e.name + '" has no location');
    }
    if (e.role !== 'operator') {
      var or = e.ownershipResearch || { searched: false, sources: null };
      if (!or.searched) {
        issues.push('Entity "' + e.name + '" (' + e.role + '): ownership not researched — use add-owner, add-subsidiary, or confirm-ownership --sources');
      }
    }
  });
  if (state.pendingDomains) {
    var unresolved = state.pendingDomains.filter(function(d) { return !d.resolved; });
    unresolved.forEach(function(d) {
      issues.push('Unresolved pending domain: ' + d.domain);
    });
  }
  var hasConcern = state.entities.some(function(e) {
    var s = e.screening;
    return (s.stateOwnership && !/no|none|clean|not|n\/a/i.test(s.stateOwnership)) ||
           (s.bisEntityList && !/not listed|no|none|clean|n\/a/i.test(s.bisEntityList));
  });
  if (hasConcern && state.scenarios.length < 2) {
    issues.push('Counterbalance rule: entity in country of concern found, fewer than 2 scenarios');
  }
  return {
    success: issues.length === 0,
    message: issues.length === 0 ? 'Validation passed' : issues.length + ' issues found',
    data: { issues: issues, passed: issues.length === 0 }
  };
}

function log(params) {
  var pn = params.partNumber;
  var message = params.message;
  if (!pn || !message) return { success: false, message: 'partNumber, message required' };
  var state = loadState(pn);
  if (!state) return { success: false, message: 'No state file for ' + pn };
  state.log.push({ timestamp: new Date().toISOString(), action: 'note', details: message });
  saveState(state);
  return { success: true, message: 'Logged note', data: { note: message } };
}

function logLead(params) {
  var pn = params.partNumber;
  if (!pn || !params.description) return { success: false, message: 'partNumber, description required' };
  var state = loadState(pn);
  if (!state) return { success: false, message: 'No state file for ' + pn };
  if (!state.pendingLeads) state.pendingLeads = [];
  var lead = {
    index: state.pendingLeads.length,
    description: params.description,
    phase: state.phase,
    step: params.step || null,
    priority: params.priority || 'normal',
    resolved: false,
    resolution: null,
    timestamp: new Date().toISOString()
  };
  state.pendingLeads.push(lead);
  state.log.push({ timestamp: new Date().toISOString(), action: 'log-lead', details: params.description });
  saveState(state);
  return { success: true, message: 'Logged lead #' + lead.index + ' (phase ' + lead.phase + ', ' + lead.priority + ')', data: { lead: lead } };
}

function resolveLead(params) {
  var pn = params.partNumber;
  var leadIndex = parseInt(params.leadIndex, 10);
  if (!pn || isNaN(leadIndex)) return { success: false, message: 'partNumber, leadIndex required' };
  if (!params.result) return { success: false, message: '--result required: "investigated: ..." or "dismissed: ..."' };
  var state = loadState(pn);
  if (!state) return { success: false, message: 'No state file for ' + pn };
  if (!state.pendingLeads || leadIndex >= state.pendingLeads.length) {
    return { success: false, message: 'Lead #' + leadIndex + ' not found' };
  }
  var lead = state.pendingLeads[leadIndex];
  lead.resolved = true;
  lead.resolution = params.result;
  state.log.push({ timestamp: new Date().toISOString(), action: 'resolve-lead', details: '#' + leadIndex + ': ' + params.result });
  saveState(state);
  return { success: true, message: 'Resolved lead #' + leadIndex, data: { lead: lead } };
}

function setOpacity(params) {
  var pn = params.partNumber;
  var entityId = params.entityId;
  if (!pn || !entityId) return { success: false, message: 'partNumber, entityId required' };
  if (!params.tier || !OPACITY_TIERS[params.tier]) {
    return { success: false, message: '--tier required: exhausted | interrupted | partial\n' +
      Object.keys(OPACITY_TIERS).map(function(k) { return '  ' + k + ': ' + OPACITY_TIERS[k]; }).join('\n') };
  }
  var state = loadState(pn);
  if (!state) return { success: false, message: 'No state file for ' + pn };
  var entity = state.entities.find(function(e) { return e.id === entityId; });
  if (!entity) return { success: false, message: 'Entity not found: ' + entityId };
  entity.opacityTier = params.tier;
  entity.opacityDescription = OPACITY_TIERS[params.tier];
  state.log.push({ timestamp: new Date().toISOString(), action: 'set-opacity', details: entityId + ' → ' + params.tier });
  saveState(state);
  return { success: true, message: 'Set opacity tier for ' + entity.name + ': ' + params.tier + ' — ' + OPACITY_TIERS[params.tier], data: { entity: entity } };
}

function showTemplates(params) {
  var pn = params.partNumber;
  if (!pn) return { success: false, message: 'partNumber required' };
  var state = loadState(pn);
  if (!state) return { success: false, message: 'No state file for ' + pn };
  if (!state.queryTemplates) {
    state.queryTemplates = generateQueryTemplates(state);
    saveState(state);
  }
  // Check which strategies have been covered
  var covered = {};
  state.searches.forEach(function(s) { if (s.strategy) covered[s.strategy] = true; });
  return {
    success: true,
    message: 'Query templates for ' + pn,
    data: {
      templates: state.queryTemplates,
      coverage: covered,
      step1Total: STEP1_STRATEGIES.length,
      step1Done: STEP1_STRATEGIES.filter(function(s) { return covered[s.id]; }).length,
      step1aTotal: STEP1A_STRATEGIES.length,
      step1aDone: STEP1A_STRATEGIES.filter(function(s) { return covered[s.id]; }).length
    }
  };
}

// ── Argument parsing (for CLI mode) ────────────────────────────────────
function parseArgs(argv) {
  var result = { _: [] };
  for (var i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      var key = argv[i].substring(2);
      if (i + 1 >= argv.length || argv[i + 1].startsWith('--')) {
        result[key] = true;
      } else {
        result[key] = argv[++i];
      }
    } else {
      result._.push(argv[i]);
    }
  }
  return result;
}

// ── CLI Entry Point (guarded for dual CLI/module mode) ────────────────

if (require.main === module) {
  // Wrap command functions for CLI output
  function cmdInit(args) {
    var result = init({ partNumber: args._[0], description: args.description, category: args.category });
    if (!result.success) { console.error(result.message); process.exit(1); }
    console.log('✓ ' + result.message);
    console.log('  File: ' + result.data.file);
    var d = result.data.state.decomposition;
    console.log('  Probable distributor prefix: ' + (d.probableDistributorPrefix || '(none)'));
    console.log('  Probable manufacturer suffix: ' + (d.probableManufacturerSuffix || '(none)'));
  }
  
  function cmdStatus(args) {
    var result = status({ partNumber: args._[0] });
    if (!result.success) { console.error(result.message); process.exit(1); }
    var state = result.data.state;
    console.log('═══ Research State: ' + state.partNumber + ' ═══');
    if (state.description) console.log('Description: ' + state.description);
    console.log('Current phase: ' + state.phase + ' — ' + PHASES[state.phase].name);
    console.log('\nEntities (' + state.entities.length + '):');
    state.entities.forEach(function(e) {
      var s = e.screening;
      var count = (s.stateOwnership ? 1 : 0) + (s.fccCoveredList ? 1 : 0) + (s.bisEntityList ? 1 : 0);
      console.log('  [' + e.role + '] ' + e.name + ' (' + count + '/3 screened)');
    });
    if (result.data.phaseGate) {
      console.log('\n⛔ Phase ' + state.phase + ' gate BLOCKED:\n  ' + result.data.phaseGate.split('\n').join('\n  '));
    } else {
      console.log('\n✓ Phase ' + state.phase + ' gate PASSED');
    }
  }
  
  function cmdResume(args) {
    var result = resume({ partNumber: args._[0] });
    if (!result.success) { console.error(result.message); process.exit(1); }
    var d = result.data;
    console.log('═══ Resume Checkpoint: ' + args._[0] + ' ═══');
    console.log('Phase: ' + d.phase + ' — ' + d.phaseName);
    console.log('Entities: ' + d.entities.length + ' identified');
    if (d.strategyCoverage) {
      var sc = d.strategyCoverage;
      console.log('\nStrategy coverage:');
      console.log('  Step 1:  ' + sc.step1.done + '/' + sc.step1.total + (sc.step1.missing.length > 0 ? ' — missing: ' + sc.step1.missing.join(', ') : ' ✓'));
      console.log('  Step 1a: ' + sc.step1a.done + '/' + sc.step1a.total + (sc.step1a.missing.length > 0 ? ' — missing: ' + sc.step1a.missing.join(', ') : ' ✓'));
    }
    if (d.pendingLeads && d.pendingLeads.length > 0) {
      console.log('\n⚡ Unresolved leads (' + d.pendingLeads.length + '):');
      d.pendingLeads.forEach(function(l) { console.log('  #' + l.index + ' [' + l.priority + '] ' + l.description); });
    }
    if (d.pendingDomains && d.pendingDomains.length > 0) {
      var unresolved = d.pendingDomains.filter(function(x) { return !x.resolved; });
      if (unresolved.length > 0) console.log('\n⚡ Pending domains: ' + unresolved.length);
    }
    if (d.phaseGate) {
      console.log('\nBLOCKED:\n  ' + d.phaseGate.split('\n').join('\n  '));
    }
  }

  function cmdLogLead(args) {
    if (!args.description) { console.error('--description required'); process.exit(1); }
    var result = logLead({ partNumber: args._[0], description: args.description, step: args.step, priority: args.priority });
    if (!result.success) { console.error(result.message); process.exit(1); }
    console.log('✓ ' + result.message);
  }

  function cmdResolveLead(args) {
    if (!args.result) { console.error('--result required'); process.exit(1); }
    var result = resolveLead({ partNumber: args._[0], leadIndex: args._[1], result: args.result });
    if (!result.success) { console.error(result.message); process.exit(1); }
    console.log('✓ ' + result.message);
  }

  function cmdSetOpacity(args) {
    if (!args.tier) { console.error('--tier required: exhausted | interrupted | partial'); process.exit(1); }
    var result = setOpacity({ partNumber: args._[0], entityId: args._[1], tier: args.tier });
    if (!result.success) { console.error(result.message); process.exit(1); }
    console.log('✓ ' + result.message);
  }

  function cmdResolveDomain(args) {
    if (!args._[1]) { console.error('domain required'); process.exit(1); }
    if (!args['entity-id'] && !args.reason) { console.error('Either --entity-id or --reason required'); process.exit(1); }
    var result = resolveDomain({ partNumber: args._[0], domain: args._[1], entityId: args['entity-id'], reason: args.reason });
    if (!result.success) { console.error(result.message); process.exit(1); }
    console.log('✓ ' + result.message);
  }

  function cmdShowTemplates(args) {
    var result = showTemplates({ partNumber: args._[0] });
    if (!result.success) { console.error(result.message); process.exit(1); }
    var d = result.data;
    console.log('═══ Query Templates: ' + args._[0] + ' ═══');
    console.log('\nStep 1 — Distributor Landscape (' + d.step1Done + '/' + d.step1Total + ' covered):');
    d.templates.step1.forEach(function(t) {
      var done = d.coverage[t.strategy] ? '✓' : '○';
      console.log('  ' + done + ' [' + t.strategy + '] ' + t.query);
    });
    console.log('\nStep 1a — Deep Distributor Search (' + d.step1aDone + '/' + d.step1aTotal + ' covered):');
    d.templates.step1a.forEach(function(t) {
      var done = d.coverage[t.strategy] ? '✓' : '○';
      console.log('  ' + done + ' [' + t.strategy + '] ' + t.query);
    });
  }
  
  function cmdAddEntity(args) {
    if (!args.name || !args.role) { console.error('--name and --role required'); process.exit(1); }
    var result = addEntity({ partNumber: args._[0], name: args.name, role: args.role, city: args.city, country: args.country, source: args.source, id: args.id });
    if (!result.success) { console.error(result.message); process.exit(1); }
    console.log('✓ ' + result.message);
  }
  
  function cmdScreen(args) {
    if (!args['state-ownership'] && !args.fcc && !args.bis) { console.error('At least one screening field required'); process.exit(1); }
    var result = screen({ partNumber: args._[0], entityId: args._[1], stateOwnership: args['state-ownership'], fcc: args.fcc, bis: args.bis });
    if (!result.success) { console.error(result.message); process.exit(1); }
    console.log('✓ ' + result.message);
  }
  
  function cmdAddFlow(args) {
    if (!args.from || !args.to) { console.error('--from and --to required'); process.exit(1); }
    var result = addFlow({ partNumber: args._[0], from: args.from, to: args.to, label: args.label, color: args.color, dashed: args.dashed });
    if (!result.success) { console.error(result.message); process.exit(1); }
    console.log('✓ ' + result.message);
  }
  
  function cmdAddOwner(args) {
    if (!args.name) { console.error('--name required'); process.exit(1); }
    var result = addOwner({ partNumber: args._[0], entityId: args._[1], name: args.name, role: args.role, location: args.location, share: args.share, notes: args.notes });
    if (!result.success) { console.error(result.message); process.exit(1); }
    console.log('✓ ' + result.message);
  }
  
  function cmdAddSubsidiary(args) {
    if (!args.name) { console.error('--name required'); process.exit(1); }
    var result = addSubsidiary({ partNumber: args._[0], entityId: args._[1], name: args.name, role: args.role, location: args.location, notes: args.notes });
    if (!result.success) { console.error(result.message); process.exit(1); }
    console.log('✓ ' + result.message);
  }
  
  function cmdConfirmOwnership(args) {
    if (!args.sources) { console.error('--sources required: document which registries/databases were searched'); process.exit(1); }
    var result = confirmOwnership({ partNumber: args._[0], entityId: args._[1], sources: args.sources });
    if (!result.success) { console.error(result.message); process.exit(1); }
    console.log('✓ ' + result.message);
  }
  
  function cmdLogSearch(args) {
    var result = logSearch({ partNumber: args._[0], query: args._[1], step: args.step, strategy: args.strategy, finding: args.finding });
    if (!result.success) { console.error(result.message); process.exit(1); }
    console.log('✓ ' + result.message + ' (total: ' + result.data.totalSearches + ')');
  }
  
  function cmdAddScenario(args) {
    if (!args.id || !args.title || !args.tier) { console.error('--id, --title, --tier required'); process.exit(1); }
    var result = addScenario({ partNumber: args._[0], id: args.id, title: args.title, tier: args.tier, entities: args.entities });
    if (!result.success) { console.error(result.message); process.exit(1); }
    console.log('✓ ' + result.message);
  }
  
  function cmdAdvancePhase(args) {
    var result = advancePhase({ partNumber: args._[0] });
    if (!result.success) {
      if (result.data && result.data.blocker) {
        console.log('⛔ Cannot advance:\n  ' + result.data.blocker.split('\n').join('\n  '));
      } else {
        console.error(result.message);
      }
      process.exit(1);
    }
    console.log('✓ ' + result.message);
  }
  
  function cmdValidate(args) {
    var result = validate({ partNumber: args._[0] });
    if (result.data.passed) {
      console.log('✓ ' + result.message);
    } else {
      console.log('⛔ Validation issues (' + result.data.issues.length + '):');
      result.data.issues.forEach(function(i, idx) { console.log('  ' + (idx + 1) + '. ' + i); });
      process.exit(1);
    }
  }
  
  function cmdLog(args) {
    var result = log({ partNumber: args._[0], message: args._[1] });
    if (!result.success) { console.error(result.message); process.exit(1); }
    console.log('✓ Logged: ' + result.data.note);
  }

  // CLI dispatcher
  var argv = process.argv.slice(2);
  if (argv.length === 0) {
    console.log('research-state.js — Supply chain investigation state manager');
    console.log('\nCommands:');
    console.log('  init <pn> [--description "..."] [--category passive|active]');
    console.log('  status <pn>');
    console.log('  resume <pn>');
    console.log('  add-entity <pn> --name "..." --role <role> [--city --country --source]');
    console.log('  screen <pn> <entityId> [--state-ownership --fcc --bis]');
    console.log('  add-flow <pn> --from <id> --to <id> [--label --dashed --color]');
    console.log('  add-owner <pn> <entityId> --name "..." [--role --location --share --notes]');
    console.log('  add-subsidiary <pn> <entityId> --name "..." [--role --location --notes]');
    console.log('  confirm-ownership <pn> <entityId> --sources "registries searched"');
    console.log('  log-search <pn> "<query>" [--step --strategy --finding]');
    console.log('  log-lead <pn> --description "..." [--step --priority high|normal]');
    console.log('  resolve-lead <pn> <leadIndex> --result "investigated: ...|dismissed: ..."');
    console.log('  resolve-domain <pn> <domain> [--entity-id <id> | --reason "..."]');
    console.log('  set-opacity <pn> <entityId> --tier exhausted|interrupted|partial');
    console.log('  show-templates <pn>');
    console.log('  add-scenario <pn> --id <letter> --title "..." --tier <A-E>');
    console.log('  advance-phase <pn>');
    console.log('  validate <pn>');
    console.log('  log <pn> "<message>"');
    process.exit(0);
  }

  var cmd = argv[0];
  var args = parseArgs(argv.slice(1));

  switch (cmd) {
    case 'init': cmdInit(args); break;
    case 'status': cmdStatus(args); break;
    case 'resume': cmdResume(args); break;
    case 'add-entity': cmdAddEntity(args); break;
    case 'screen': cmdScreen(args); break;
    case 'add-flow': cmdAddFlow(args); break;
    case 'add-owner': cmdAddOwner(args); break;
    case 'add-subsidiary': cmdAddSubsidiary(args); break;
    case 'confirm-ownership': cmdConfirmOwnership(args); break;
    case 'log-search': cmdLogSearch(args); break;
    case 'log-lead': cmdLogLead(args); break;
    case 'resolve-lead': cmdResolveLead(args); break;
    case 'resolve-domain': cmdResolveDomain(args); break;
    case 'set-opacity': cmdSetOpacity(args); break;
    case 'show-templates': cmdShowTemplates(args); break;
    case 'add-scenario': cmdAddScenario(args); break;
    case 'advance-phase': cmdAdvancePhase(args); break;
    case 'validate': cmdValidate(args); break;
    case 'log': cmdLog(args); break;
    default:
      console.error('Unknown command: ' + cmd);
      process.exit(1);
  }
}

function resolveDomain(params) {
  var pn = params.partNumber;
  var domain = params.domain;
  if (!pn || !domain) return { success: false, message: 'partNumber, domain required' };
  var state = loadState(pn);
  if (!state) return { success: false, message: 'No state file for ' + pn };
  if (!state.pendingDomains) return { success: false, message: 'No pending domains tracked' };
  var entry = state.pendingDomains.find(function(d) { 
    return d.domain.toLowerCase() === domain.toLowerCase() && !d.resolved; 
  });
  if (!entry) return { success: false, message: 'No unresolved pending domain: ' + domain };
  
  if (params.entityId) {
    var entity = state.entities.find(function(e) { return e.id === params.entityId; });
    if (!entity) return { success: false, message: 'Entity not found: ' + params.entityId };
    entry.resolved = true;
    entry.resolvedTo = params.entityId;
  } else if (params.reason) {
    entry.resolved = true;
    entry.resolvedTo = null;
    entry.dismissReason = params.reason;
  } else {
    return { success: false, message: 'Either entityId or reason required' };
  }
  state.log.push({ timestamp: new Date().toISOString(), action: 'resolve-domain', 
    details: domain + (params.entityId ? ' → ' + params.entityId : ' dismissed: ' + params.reason) });
  saveState(state);
  return { success: true, message: 'Resolved domain: ' + domain, data: { entry: entry } };
}

// ── Module exports
module.exports = {
  init, status, resume, addEntity, screen, addFlow, addOwner, addSubsidiary,
  confirmOwnership, addScenario, advancePhase, validate, log, logSearch,
  logLead, resolveLead, setOpacity, showTemplates, resolveDomain,
  loadState, saveState, decompose, extractDomain,
  PHASES, STEP1_STRATEGIES, STEP1A_STRATEGIES, OPACITY_TIERS
};
