/**
 * Request Technical Feature & Size Analyzer
 */

function analyzeRequest(payload = {}) {
  const messages = Array.isArray(payload.messages) ? payload.messages : [];
  let totalChars = 0;
  let requiresVision = false;

  for (const msg of messages) {
    const content = msg.content;
    if (typeof content === "string") {
      totalChars += content.length;
    } else if (Array.isArray(content)) {
      for (const part of content) {
        if (typeof part === "string") {
          totalChars += part.length;
        } else if (part && typeof part === "object") {
          if (part.type === "text" && typeof part.text === "string") {
            totalChars += part.text.length;
          } else if (part.type === "image_url") {
            requiresVision = true;
          } else {
            totalChars += JSON.stringify(part).length;
          }
        }
      }
    }

    if (Array.isArray(msg.tool_calls)) {
      for (const tc of msg.tool_calls) {
        if (tc && tc.function) {
          totalChars += String(tc.function.name || "").length;
          totalChars += String(tc.function.arguments || "").length;
        }
      }
    }
  }

  // Standard heuristic: ~4 chars per token + 4 structural tokens per message
  const estimatedTokens = Math.max(1, Math.floor(totalChars / 4) + messages.length * 4);
  const requiresTools = Boolean(Array.isArray(payload.tools) && payload.tools.length > 0);

  let requiresJsonMode = false;
  if (payload.response_format && typeof payload.response_format === "object") {
    const rfType = payload.response_format.type;
    if (rfType === "json_object" || rfType === "json_schema") {
      requiresJsonMode = true;
    }
  }

  return {
    totalChars,
    estimatedTokens,
    requiresTools,
    requiresJsonMode,
    requiresVision,
    messageCount: messages.length,
  };
}

module.exports = {
  analyzeRequest,
};
