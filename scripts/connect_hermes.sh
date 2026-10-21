#!/usr/bin/env bash
# ==============================================================================
# TheGate Switcher for Hermes Agent
# Route Hermes LLM traffic through TheGate Control Plane & Routing Engine
# ==============================================================================

set -e

THEGATE_GATEWAY="http://127.0.0.1:8001/v1"
NINEROUTER_GATEWAY="http://127.0.0.1:20128/v1"
HERMES_CONFIG="$HOME/.hermes/config.yaml"

TARGET="${1:-thegate}"

if [ "$TARGET" = "9router" ] || [ "$TARGET" = "direct" ]; then
    echo "🔄 Switching Hermes directly to 9Router ($NINEROUTER_GATEWAY)..."
    if [ -f "$HERMES_CONFIG" ]; then
        sed -i 's|base_url: http://.*:8001/v1|base_url: http://localhost:20128/v1|g' "$HERMES_CONFIG"
    fi
    export OPENAI_BASE_URL="$NINEROUTER_GATEWAY"
    echo "✓ Hermes is now pointed directly to 9Router."
    exit 0
fi

echo "🚀 Connecting Hermes to TheGate Optimization Layer ($THEGATE_GATEWAY)..."

# Ensure TheGate services are running
if ! curl -s -f "http://127.0.0.1:8001/health" > /dev/null 2>&1; then
    echo "⚡ Starting TheGate Gateway & Operations Cockpit..."
    if command -v thegate > /dev/null 2>&1; then
        thegate start
    else
        node /home/fikal/fikal/thegate/bin/thegate.js start
    fi
fi

# Update Hermes config.yaml
if [ -f "$HERMES_CONFIG" ]; then
    sed -i 's|base_url: http://.*:20128/v1|base_url: http://127.0.0.1:8001/v1|g' "$HERMES_CONFIG"
    echo "✓ Hermes config.yaml updated (base_url -> $THEGATE_GATEWAY)"
fi

export OPENAI_BASE_URL="$THEGATE_GATEWAY"
export OPENAI_API_BASE="$THEGATE_GATEWAY"
export OPENAI_API_KEY="sk-thegate-local"

echo "✓ Hermes is now CONNECTED to TheGate!"
echo "  • Ingress Gateway: $THEGATE_GATEWAY"
echo "  • Web Operations:  http://127.0.0.1:3000"
echo "  • Zero-Prompt Log: ACTIVE"
