#!/bin/bash
# Code Validator - Automated validation script
# Part of the Code Validator Claude Skill

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Code Validator - Starting validation...${NC}\n"

# Track validation status
VALIDATION_PASSED=true

# Step 1: TypeScript Check
echo -e "${BLUE}📝 Step 1: TypeScript Strict Mode Check${NC}"
if npx tsc --noEmit; then
  echo -e "${GREEN}✅ TypeScript check passed${NC}\n"
else
  echo -e "${RED}❌ TypeScript check failed${NC}\n"
  VALIDATION_PASSED=false
fi

# Step 2: Check for 'any' types
echo -e "${BLUE}🔎 Step 2: Checking for 'any' types${NC}"
ANY_COUNT=$(grep -rn ": any" app/ components/ lib/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v node_modules | wc -l | tr -d ' ')
if [ "$ANY_COUNT" -eq 0 ]; then
  echo -e "${GREEN}✅ No 'any' types found${NC}\n"
else
  echo -e "${YELLOW}⚠️  Found $ANY_COUNT instances of 'any' type${NC}"
  echo -e "${YELLOW}First 5 occurrences:${NC}"
  grep -rn ": any" app/ components/ lib/ --include="*.ts" --include="*.tsx" 2>/dev/null | head -5
  echo ""
  VALIDATION_PASSED=false
fi

# Step 3: ESLint
echo -e "${BLUE}🔧 Step 3: Running ESLint${NC}"
if npm run lint; then
  echo -e "${GREEN}✅ ESLint check passed${NC}\n"
else
  echo -e "${RED}❌ ESLint check failed${NC}\n"
  VALIDATION_PASSED=false
fi

# Step 4: Check for duplicate functions
echo -e "${BLUE}🔍 Step 4: Checking for duplicate code${NC}"
DUPLICATES=$(find . -path ./node_modules -prune -o \( -name "*.ts" -o -name "*.tsx" \) -print | \
  xargs grep -h "^\s*\(export \)\?function \w\+" 2>/dev/null | \
  sed 's/export //' | sed 's/function //' | cut -d'(' -f1 | \
  sort | uniq -c | sort -rn | awk '$1 > 1' | wc -l | tr -d ' ')

if [ "$DUPLICATES" -eq 0 ]; then
  echo -e "${GREEN}✅ No duplicate functions found${NC}\n"
else
  echo -e "${YELLOW}⚠️  Found $DUPLICATES duplicate function names${NC}"
  find . -path ./node_modules -prune -o \( -name "*.ts" -o -name "*.tsx" \) -print | \
    xargs grep -h "^\s*\(export \)\?function \w\+" 2>/dev/null | \
    sed 's/export //' | sed 's/function //' | cut -d'(' -f1 | \
    sort | uniq -c | sort -rn | awk '$1 > 1' | head -5
  echo ""
fi

# Step 5: Build check
echo -e "${BLUE}🏗️  Step 5: Building project${NC}"
if npm run build; then
  echo -e "${GREEN}✅ Build successful${NC}\n"
else
  echo -e "${RED}❌ Build failed${NC}\n"
  VALIDATION_PASSED=false
fi

# Final summary
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if [ "$VALIDATION_PASSED" = true ]; then
  echo -e "${GREEN}✅ VALIDATION PASSED${NC}"
  echo -e "${GREEN}All checks completed successfully!${NC}"
  exit 0
else
  echo -e "${RED}❌ VALIDATION FAILED${NC}"
  echo -e "${RED}Some checks did not pass. Please review the errors above.${NC}"
  exit 1
fi
