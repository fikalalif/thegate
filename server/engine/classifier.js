/**
 * Predictive Intent & Complexity Classifier
 * Analyzes incoming conversation messages to dynamically classify task domain,
 * complexity score, and assign optimal AI Workforce personas.
 */

const TaskDomain = {
  CODING_AND_DEV: "CODING_AND_DEV",
  DEEP_REASONING: "DEEP_REASONING",
  STRUCTURED_DATA: "STRUCTURED_DATA",
  CREATIVE_EDITORIAL: "CREATIVE_EDITORIAL",
  FAST_UTILITY: "FAST_UTILITY",
};

const CODING_PATTERNS = [
  /```/,
  /\bdef\s+/,
  /\bclass\s+/,
  /\bfunction\b/,
  /\bimport\s+/,
  /\bpython\b/i,
  /\bjavascript\b/i,
  /\btypescript\b/i,
  /\bgolang\b/i,
  /\brust\b/i,
  /\bsql\b/i,
  /\bquery\b/i,
  /\bdatabase\b/i,
  /\bendpoint\b/i,
  /\brest\s+api\b/i,
  /\brefactor\b/i,
  /\bdebug\b/i,
  /\berror\s+trace\b/i,
  /\bfrontend\b/i,
  /\bbackend\b/i,
  /\btailwind\b/i,
  /\breact\b/i,
  /\bsvelte\b/i,
  /\bnext\.?js\b/i,
  /\bdocker\b/i,
  /\bcompile\b/i,
  /\bexception\b/i,
  /\bsyntax\b/i,
];

const REASONING_PATTERNS = [
  /\barsitektur\b/i,
  /\barchitecture\b/i,
  /\bdistributed\b/i,
  /\bconcurrency\b/i,
  /\block-free\b/i,
  /\bmemory\s+ordering\b/i,
  /\bbyzantine\b/i,
  /\braft\b/i,
  /\bconsensus\b/i,
  /\balgorithm\b/i,
  /\balgoritma\b/i,
  /\bmathematical\b/i,
  /\bmatematika\b/i,
  /\bproof\b/i,
  /\bpembuktian\b/i,
  /\bquantum\b/i,
  /\bhigh-frequency\b/i,
  /\bdeep\s+analysis\b/i,
  /\banalisis\s+mendalam\b/i,
  /\btrade-off\b/i,
  /\bscalability\b/i,
  /\bkompleksitas\b/i,
  /\bbenchmark\b/i,
  /\bproof\s+of\s+concept\b/i,
];

const STRUCTURED_PATTERNS = [
  /\bjson\b/i,
  /\bschema\b/i,
  /\bekstrak\b/i,
  /\bextract\b/i,
  /\bparse\b/i,
  /\bcsv\b/i,
  /\btabel\b/i,
  /\bkey-value\b/i,
  /\bfield\b/i,
  /\bregex\b/i,
];

const CREATIVE_PATTERNS = [
  /\btulis\b/i,
  /\bbuatkan\s+cerita\b/i,
  /\bpuisi\b/i,
  /\bessay\b/i,
  /\bcopywriting\b/i,
  /\bnarrative\b/i,
  /\bstory\b/i,
  /\bnovel\b/i,
  /\bdialog\b/i,
  /\bpersona\b/i,
  /\bhumor\b/i,
  /\bmetafora\b/i,
  /\bsurat\b/i,
];

function classifyIntent(messages = [], options = {}) {
  const { requiresJson = false, requiresTools = false, estimatedTokens = 0 } = options;

  let combinedText = "";
  for (const m of messages) {
    if (typeof m.content === "string") {
      combinedText += " " + m.content;
    } else if (Array.isArray(m.content)) {
      for (const part of m.content) {
        if (typeof part === "string") combinedText += " " + part;
        else if (part && typeof part.text === "string") combinedText += " " + part.text;
      }
    }
  }

  // 1. Explicit JSON constraint
  if (requiresJson) {
    return {
      domain: TaskDomain.STRUCTURED_DATA,
      confidence: 0.95,
      complexityScore: 0.4,
      recommendedRole: "data-analyst",
      reason: "Structured JSON output schema explicitly required.",
    };
  }

  // 2. Tool / Function calling active
  if (requiresTools) {
    return {
      domain: TaskDomain.CODING_AND_DEV,
      confidence: 0.95,
      complexityScore: 0.85,
      recommendedRole: "fullstack-engineer",
      reason: "Function calling and agent tool orchestration active.",
    };
  }

  // 3. Regex frequency scoring
  const reasoningScore = REASONING_PATTERNS.filter((p) => p.test(combinedText)).length;
  const codingScore = CODING_PATTERNS.filter((p) => p.test(combinedText)).length;
  const structuredScore = STRUCTURED_PATTERNS.filter((p) => p.test(combinedText)).length;
  const creativeScore = CREATIVE_PATTERNS.filter((p) => p.test(combinedText)).length;

  // Deep Reasoning & Architecture
  if (reasoningScore >= 2 || (reasoningScore >= 1 && (combinedText.length > 200 || estimatedTokens > 400))) {
    return {
      domain: TaskDomain.DEEP_REASONING,
      confidence: Math.min(0.98, 0.65 + reasoningScore * 0.1),
      complexityScore: 0.9,
      recommendedRole: "fullstack-engineer",
      reason: `High reasoning density (${reasoningScore} architectural keywords detected).`,
    };
  }

  // Software Development / Coding
  if (codingScore >= 2 || combinedText.includes("```") || (codingScore >= 1 && (combinedText.includes("code") || combinedText.includes("bikin")))) {
    return {
      domain: TaskDomain.CODING_AND_DEV,
      confidence: Math.min(0.98, 0.65 + codingScore * 0.1),
      complexityScore: 0.8,
      recommendedRole: "fullstack-engineer",
      reason: `Software engineering / code generation intent (${codingScore} technical syntax patterns).`,
    };
  }

  // Structured Data Extraction
  if (structuredScore >= 2 || (structuredScore >= 1 && combinedText.toLowerCase().includes("format"))) {
    return {
      domain: TaskDomain.STRUCTURED_DATA,
      confidence: 0.85,
      complexityScore: 0.5,
      recommendedRole: "data-analyst",
      reason: "Data parsing, tabular structure, or entity extraction intent.",
    };
  }

  // Creative & Copywriting
  if (creativeScore >= 2) {
    return {
      domain: TaskDomain.CREATIVE_EDITORIAL,
      confidence: 0.85,
      complexityScore: 0.55,
      recommendedRole: "copywriter",
      reason: "Creative narrative, copywriting, or prose synthesis intent.",
    };
  }

  // Default Fast Utility
  const complexity = Math.min(0.5, Math.max(0.1, estimatedTokens / 1000));
  return {
    domain: TaskDomain.FAST_UTILITY,
    confidence: 0.75,
    complexityScore: complexity,
    recommendedRole: "assistant",
    reason: "Standard conversational inquiry or lightweight utility prompt.",
  };
}

module.exports = {
  TaskDomain,
  classifyIntent,
};
