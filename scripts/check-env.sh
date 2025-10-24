#!/bin/bash

# Environment Configuration Checker
# Validates that required environment variables are set

set -e

echo "🔍 Checking environment configuration..."
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo -e "${RED}❌ .env.local not found${NC}"
    echo "   Please copy .env.example to .env.local and configure it"
    echo "   Run: cp .env.example .env.local"
    exit 1
fi

echo -e "${GREEN}✅ .env.local exists${NC}"
echo ""

# Required variables
REQUIRED_VARS=(
    "NEXT_PUBLIC_SUPABASE_URL"
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    "SUPABASE_SERVICE_ROLE_KEY"
    "STRIPE_SECRET_KEY"
    "STRIPE_WEBHOOK_SECRET"
)

# Optional but recommended
RECOMMENDED_VARS=(
    "NEXT_PUBLIC_BASE_URL"
    "STRIPE_PREMIUM_PRICE_ID"
    "GOOGLE_SERVICE_ACCOUNT"
    "AISTUDIO_API_KEY"
)

MISSING_REQUIRED=()
MISSING_RECOMMENDED=()

# Check required variables
echo "Required variables:"
for var in "${REQUIRED_VARS[@]}"; do
    if grep -q "^${var}=" .env.local 2>/dev/null && [ -n "$(grep "^${var}=" .env.local | cut -d= -f2-)" ]; then
        echo -e "  ${GREEN}✅${NC} $var"
    else
        echo -e "  ${RED}❌${NC} $var"
        MISSING_REQUIRED+=("$var")
    fi
done

echo ""
echo "Recommended variables:"
for var in "${RECOMMENDED_VARS[@]}"; do
    if grep -q "^${var}=" .env.local 2>/dev/null && [ -n "$(grep "^${var}=" .env.local | cut -d= -f2-)" ]; then
        echo -e "  ${GREEN}✅${NC} $var"
    else
        echo -e "  ${YELLOW}⚠️${NC}  $var (optional)"
        MISSING_RECOMMENDED+=("$var")
    fi
done

echo ""

# Report results
if [ ${#MISSING_REQUIRED[@]} -eq 0 ]; then
    echo -e "${GREEN}✅ All required environment variables are set${NC}"
else
    echo -e "${RED}❌ Missing required environment variables:${NC}"
    for var in "${MISSING_REQUIRED[@]}"; do
        echo "   - $var"
    done
    echo ""
    echo "Please configure these variables in .env.local"
    exit 1
fi

if [ ${#MISSING_RECOMMENDED[@]} -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Some recommended variables are not set:${NC}"
    for var in "${MISSING_RECOMMENDED[@]}"; do
        echo "   - $var"
    done
    echo ""
    echo "These are optional but recommended for full functionality"
fi

echo ""
echo -e "${GREEN}✨ Environment configuration check complete${NC}"
