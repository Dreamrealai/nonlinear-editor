#!/bin/bash

# Documentation Consolidation Script
# Purpose: Automate the documentation consolidation process
# Usage: ./scripts/consolidate-docs.sh [phase]
# Phases: prep, archive, move, merge, links, verify

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the project root
if [ ! -f "package.json" ]; then
    log_error "Must be run from project root"
    exit 1
fi

# Create backup
create_backup() {
    log_info "Creating backup of current documentation..."
    BACKUP_DIR="docs-backup-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$BACKUP_DIR"

    # Copy all markdown files
    find . -name "*.md" -not -path "*/node_modules/*" -not -path "*/.next/*" -exec cp --parents {} "$BACKUP_DIR" \;

    log_success "Backup created at: $BACKUP_DIR"
}

# Phase 0: Preparation
phase_prep() {
    log_info "=== Phase 0: Preparation ==="

    # Create backup
    create_backup

    # Create new directory structure
    log_info "Creating new directory structure..."

    mkdir -p docs/getting-started
    mkdir -p docs/guides
    mkdir -p docs/infrastructure/monitoring
    mkdir -p docs/api/providers/google
    mkdir -p docs/api/video-generation
    mkdir -p docs/project-management
    mkdir -p docs/reference
    mkdir -p docs/reports/2025-10/{agent-sessions,test-coverage,security,specialized}
    mkdir -p docs/reports/archives/{audit-logs,validation,improvements,completed-issues}
    mkdir -p archive/agent-reports/2025-10-24
    mkdir -p archive/deprecated/{bundle-optimization,typescript-reports,verification-reports,test-coverage,security-audits}

    log_success "Directory structure created"

    # Create inventory
    log_info "Creating documentation inventory..."
    find . -name "*.md" -not -path "*/node_modules/*" -not -path "*/.next/*" > docs-inventory.txt
    log_success "Inventory saved to docs-inventory.txt"

    log_success "Phase 0 complete!"
}

# Phase 1: Archive agent reports and deprecated files
phase_archive() {
    log_info "=== Phase 1: Archive Files ==="

    # Archive agent reports from root
    log_info "Archiving agent reports..."
    [ -f "AGENT1_SUMMARY.md" ] && git mv AGENT1_SUMMARY.md archive/agent-reports/2025-10-24/
    [ -f "AGENT5_SUMMARY.md" ] && git mv AGENT5_SUMMARY.md archive/agent-reports/2025-10-24/
    [ -f "AGENT9_SUMMARY.md" ] && git mv AGENT9_SUMMARY.md archive/agent-reports/2025-10-24/
    [ -f "AGENT-9-TEST-STABILITY-REPORT.md" ] && git mv AGENT-9-TEST-STABILITY-REPORT.md archive/agent-reports/2025-10-24/
    [ -f "AGENT-10-TEST-COVERAGE-REPORT.md" ] && git mv AGENT-10-TEST-COVERAGE-REPORT.md archive/agent-reports/2025-10-24/
    [ -f "final-summary.md" ] && git mv final-summary.md archive/agent-reports/2025-10-24/

    # Archive deprecated files
    log_info "Archiving deprecated files..."
    [ -f "BUNDLE_OPTIMIZATION_PLAN.md" ] && git mv BUNDLE_OPTIMIZATION_PLAN.md archive/deprecated/bundle-optimization/
    [ -f "BUNDLE_OPTIMIZATION_SUMMARY.md" ] && git mv BUNDLE_OPTIMIZATION_SUMMARY.md archive/deprecated/bundle-optimization/
    [ -f "TYPESCRIPT_STRICT_MODE_REPORT.md" ] && git mv TYPESCRIPT_STRICT_MODE_REPORT.md archive/deprecated/typescript-reports/
    [ -f "VERIFICATION_AUDIT_REPORT.md" ] && git mv VERIFICATION_AUDIT_REPORT.md archive/deprecated/verification-reports/
    [ -f "VERIFICATION_SUMMARY.md" ] && git mv VERIFICATION_SUMMARY.md archive/deprecated/verification-reports/
    [ -f "TEST_COVERAGE_REPORT.md" ] && git mv TEST_COVERAGE_REPORT.md archive/deprecated/test-coverage/
    [ -f "ERROR_TEST_COVERAGE_REPORT.md" ] && git mv ERROR_TEST_COVERAGE_REPORT.md archive/deprecated/test-coverage/
    [ -f "CSP-AUDIT-REPORT.md" ] && git mv CSP-AUDIT-REPORT.md archive/deprecated/security-audits/
    [ -f "CLEANUP_CONSOLIDATED_REPORT.md" ] && git mv CLEANUP_CONSOLIDATED_REPORT.md archive/deprecated/

    log_success "Phase 1 complete!"
}

# Phase 2: Move files to new locations (no merging)
phase_move() {
    log_info "=== Phase 2: Move Files ==="

    # Move reference docs
    log_info "Moving reference documentation..."
    [ -f "MOCK_PATTERNS_DOCUMENTATION.md" ] && git mv MOCK_PATTERNS_DOCUMENTATION.md docs/reference/MOCK_PATTERNS.md
    [ -f "DOCUMENTATION_REVIEW_REPORT.md" ] && git mv DOCUMENTATION_REVIEW_REPORT.md docs/reports/2025-10/
    [ -f "test-documentation-review.md" ] && git mv test-documentation-review.md docs/reports/2025-10/

    # Move architecture docs
    log_info "Moving architecture documentation..."
    [ -f "docs/ARCHITECTURE_OVERVIEW.md" ] && git mv docs/ARCHITECTURE_OVERVIEW.md docs/architecture/
    [ -f "docs/SERVICE_LAYER_GUIDE.md" ] && git mv docs/SERVICE_LAYER_GUIDE.md docs/architecture/
    [ -f "docs/API_VERSIONING.md" ] && git mv docs/API_VERSIONING.md docs/api/
    [ -f "docs/RATE_LIMITING.md" ] && git mv docs/RATE_LIMITING.md docs/api/

    # Move security docs
    log_info "Moving security documentation..."
    [ -f "docs/SECURITY_DEPLOYMENT_GUIDE.md" ] && git mv docs/SECURITY_DEPLOYMENT_GUIDE.md docs/security/
    [ -f "docs/SECURITY_TEST_COVERAGE.md" ] && git mv docs/SECURITY_TEST_COVERAGE.md docs/security/
    [ -f "docs/MEMORY_OPTIMIZATION_GUIDE.md" ] && git mv docs/MEMORY_OPTIMIZATION_GUIDE.md docs/guides/
    [ -f "docs/PRODUCTION_MONITORING_MEMORY_LEAKS.md" ] && git mv docs/PRODUCTION_MONITORING_MEMORY_LEAKS.md docs/infrastructure/monitoring/memory-leaks.md

    # Move infrastructure docs
    log_info "Moving infrastructure documentation..."
    [ -f "docs/SUPABASE_SETUP.md" ] && git mv docs/SUPABASE_SETUP.md docs/infrastructure/
    [ -f "docs/AXIOM_SETUP.md" ] && git mv docs/AXIOM_SETUP.md docs/infrastructure/
    [ -f "docs/INFRASTRUCTURE.md" ] && git mv docs/INFRASTRUCTURE.md docs/infrastructure/

    # Move setup docs to infrastructure
    [ -f "docs/setup/STRIPE_SETUP.md" ] && git mv docs/setup/STRIPE_SETUP.md docs/infrastructure/
    [ -f "docs/setup/RESEND_SETUP.md" ] && git mv docs/setup/RESEND_SETUP.md docs/infrastructure/
    [ -f "docs/setup/SUBSCRIPTION_SETUP.md" ] && git mv docs/setup/SUBSCRIPTION_SETUP.md docs/infrastructure/
    [ -f "docs/setup/VERCEL_CONFIGURATION.md" ] && git mv docs/setup/VERCEL_CONFIGURATION.md docs/infrastructure/

    # Move setup docs to getting-started
    [ -f "docs/setup/CONFIGURATION.md" ] && git mv docs/setup/CONFIGURATION.md docs/getting-started/

    # Move project management
    [ -f "docs/issues/ISSUETRACKING.md" ] && git mv docs/issues/ISSUETRACKING.md docs/project-management/

    # Move testing docs
    [ -f "docs/E2E_TESTING_GUIDE.md" ] && git mv docs/E2E_TESTING_GUIDE.md docs/guides/

    # Move video generation APIs
    log_info "Moving video generation API docs..."
    [ -f "docs/api/fal-kling.md" ] && git mv docs/api/fal-kling.md docs/api/video-generation/kling.md
    [ -f "docs/api/fal-minimax.md" ] && git mv docs/api/fal-minimax.md docs/api/video-generation/minimax.md
    [ -f "docs/api/fal-pixverse.md" ] && git mv docs/api/fal-pixverse.md docs/api/video-generation/pixverse.md
    [ -f "docs/api/fal-sora-2.md" ] && git mv docs/api/fal-sora-2.md docs/api/video-generation/sora.md
    [ -f "docs/api/minimax.md" ] && git mv docs/api/minimax.md docs/api/video-generation/

    # Archive old reports
    log_info "Archiving old reports..."
    [ -f "docs/reports/AUDIT_LOGGING_IMPLEMENTATION.md" ] && git mv docs/reports/AUDIT_LOGGING_IMPLEMENTATION.md docs/reports/archives/audit-logs/
    [ -f "docs/reports/AUDIT_LOGGING_SUMMARY.md" ] && git mv docs/reports/AUDIT_LOGGING_SUMMARY.md docs/reports/archives/audit-logs/
    [ -f "docs/reports/AUDIT_LOG_INTEGRATION_EXAMPLES.md" ] && git mv docs/reports/AUDIT_LOG_INTEGRATION_EXAMPLES.md docs/reports/archives/audit-logs/
    [ -f "docs/reports/VALIDATION_REPORT.md" ] && git mv docs/reports/VALIDATION_REPORT.md docs/reports/archives/validation/
    [ -f "docs/reports/VALIDATION_GAPS_REPORT.md" ] && git mv docs/reports/VALIDATION_GAPS_REPORT.md docs/reports/archives/validation/
    [ -f "docs/reports/QUALITY_VALIDATION_REPORT.md" ] && git mv docs/reports/QUALITY_VALIDATION_REPORT.md docs/reports/archives/validation/

    log_success "Phase 2 complete!"
}

# Phase 3: Merge duplicate files (requires manual review)
phase_merge() {
    log_info "=== Phase 3: Merge Files ==="
    log_warning "This phase requires manual intervention to merge files properly"

    # Performance docs
    if [ -f "docs/PERFORMANCE.md" ] && [ -f "docs/PERFORMANCE_OPTIMIZATION.md" ]; then
        log_info "Merging performance documentation..."
        log_warning "Manual merge required: docs/PERFORMANCE.md + docs/PERFORMANCE_OPTIMIZATION.md"
        log_info "After merging manually, move result to: docs/guides/PERFORMANCE.md"
    fi

    # Caching docs
    if [ -f "docs/CACHING.md" ]; then
        log_info "Consolidating caching documentation..."
        log_warning "Manual merge required: docs/CACHING.md + docs/reports/CACHING_*.md"
        log_info "After merging manually, move result to: docs/guides/CACHING.md"
    fi

    # Environment variables
    if [ -f "docs/setup/ENVIRONMENT_VARIABLES.md" ] && [ -f "docs/setup/ENV_VARIABLES_SUMMARY.md" ]; then
        log_info "Merging environment variables docs..."
        log_warning "Manual merge required: docs/setup/ENVIRONMENT_VARIABLES.md + ENV_VARIABLES_SUMMARY.md"
        log_info "After merging manually, move result to: docs/getting-started/ENVIRONMENT_VARIABLES.md"
    fi

    log_info "Creating merge checklist..."
    cat > merge-checklist.md << 'EOF'
# Documentation Merge Checklist

## Performance Documentation
- [ ] Merge PERFORMANCE.md + PERFORMANCE_OPTIMIZATION.md
- [ ] Review for duplicate content
- [ ] Consolidate sections logically
- [ ] Move to docs/guides/PERFORMANCE.md
- [ ] Delete originals

## Caching Documentation
- [ ] Merge CACHING.md + reports/CACHING_STRATEGY.md + CACHING_IMPLEMENTATION.md + CACHING_SUMMARY.md
- [ ] Remove redundant sections
- [ ] Update examples
- [ ] Move to docs/guides/CACHING.md
- [ ] Delete originals

## Environment Variables
- [ ] Merge ENVIRONMENT_VARIABLES.md + ENV_VARIABLES_SUMMARY.md
- [ ] Ensure all variables documented
- [ ] Add usage examples
- [ ] Move to docs/getting-started/ENVIRONMENT_VARIABLES.md
- [ ] Delete originals

## Security Documentation
- [ ] Review SECURITY_AUDIT.md vs SECURITY_AUDIT_REPORT.md
- [ ] Keep latest version
- [ ] Archive older version
- [ ] Move to docs/security/SECURITY_AUDIT.md

## Google API Documentation
- [ ] Consolidate google-ai-apis/* files
- [ ] Merge with api/GEMINI*, VEO*, IMAGEN* files
- [ ] Organize by service
- [ ] Move to docs/api/providers/google/

## ElevenLabs Documentation
- [ ] Merge elevenlabs-api-docs.md + ELEVENLABS_TTS_*.md
- [ ] Consolidate examples
- [ ] Move to docs/api/providers/elevenlabs.md

## Suno/Comet Documentation
- [ ] Merge comet-suno-api-docs.md + SUNO_AUDIO_COMET_DOCUMENTATION.md
- [ ] Update API endpoints
- [ ] Move to docs/api/providers/comet-suno.md

---

Complete each item before proceeding to Phase 4 (Link Updates)
EOF

    log_success "Merge checklist created: merge-checklist.md"
    log_warning "Complete manual merges before proceeding to Phase 4"
    log_success "Phase 3 complete (manual work required)!"
}

# Phase 4: Update internal links
phase_links() {
    log_info "=== Phase 4: Update Links ==="

    log_info "Updating internal documentation links..."

    # Update links in all markdown files
    find docs -name "*.md" -type f -exec sed -i '' \
        -e 's|/docs/PERFORMANCE\.md|/docs/guides/PERFORMANCE.md|g' \
        -e 's|/docs/PERFORMANCE_OPTIMIZATION\.md|/docs/guides/PERFORMANCE.md|g' \
        -e 's|/docs/CACHING\.md|/docs/guides/CACHING.md|g' \
        -e 's|/docs/setup/ENVIRONMENT_VARIABLES\.md|/docs/getting-started/ENVIRONMENT_VARIABLES.md|g' \
        -e 's|/docs/ARCHITECTURE_OVERVIEW\.md|/docs/architecture/ARCHITECTURE_OVERVIEW.md|g' \
        -e 's|/docs/SERVICE_LAYER_GUIDE\.md|/docs/architecture/SERVICE_LAYER_GUIDE.md|g' \
        -e 's|/docs/API_VERSIONING\.md|/docs/api/API_VERSIONING.md|g' \
        -e 's|/docs/RATE_LIMITING\.md|/docs/api/RATE_LIMITING.md|g' \
        -e 's|/docs/SUPABASE_SETUP\.md|/docs/infrastructure/SUPABASE_SETUP.md|g' \
        -e 's|/docs/AXIOM_SETUP\.md|/docs/infrastructure/AXIOM_SETUP.md|g' \
        -e 's|/docs/issues/ISSUETRACKING\.md|/docs/project-management/ISSUETRACKING.md|g' \
        {} +

    # Update README.md
    if [ -f "README.md" ]; then
        log_info "Updating main README.md..."
        sed -i '' \
            -e 's|docs/SUPABASE_SETUP\.md|docs/infrastructure/SUPABASE_SETUP.md|g' \
            -e 's|docs/INFRASTRUCTURE\.md|docs/infrastructure/INFRASTRUCTURE.md|g' \
            -e 's|docs/api/API_QUICK_REFERENCE\.md|docs/api/API_QUICK_REFERENCE.md|g' \
            README.md
    fi

    # Update CLAUDE.md
    if [ -f "CLAUDE.md" ]; then
        log_info "Updating CLAUDE.md..."
        sed -i '' \
            -e 's|/docs/CODING_BEST_PRACTICES\.md|/docs/guides/CODING_BEST_PRACTICES.md|g' \
            -e 's|/docs/STYLE_GUIDE\.md|/docs/guides/STYLE_GUIDE.md|g' \
            -e 's|/docs/ARCHITECTURE_OVERVIEW\.md|/docs/architecture/ARCHITECTURE_OVERVIEW.md|g' \
            -e 's|/docs/SERVICE_LAYER_GUIDE\.md|/docs/architecture/SERVICE_LAYER_GUIDE.md|g' \
            CLAUDE.md
    fi

    log_success "Phase 4 complete!"
}

# Phase 5: Verification
phase_verify() {
    log_info "=== Phase 5: Verification ==="

    # Check for broken links (requires markdown-link-check)
    if command -v markdown-link-check &> /dev/null; then
        log_info "Checking for broken links..."
        find docs -name "*.md" -exec markdown-link-check -q {} \; 2>&1 | grep -i "error" || log_success "No broken links found"
    else
        log_warning "markdown-link-check not installed. Install with: npm install -g markdown-link-check"
    fi

    # Check file count
    log_info "Counting documentation files..."
    TOTAL_DOCS=$(find . -name "*.md" -not -path "*/node_modules/*" -not -path "*/.next/*" | wc -l)
    ROOT_DOCS=$(ls -1 *.md 2>/dev/null | wc -l)
    DOCS_DIR=$(find docs -name "*.md" | wc -l)

    log_info "Documentation statistics:"
    echo "  Total .md files: $TOTAL_DOCS"
    echo "  Root directory: $ROOT_DOCS"
    echo "  docs/ directory: $DOCS_DIR"

    # Check for expected structure
    log_info "Verifying directory structure..."
    REQUIRED_DIRS=(
        "docs/getting-started"
        "docs/guides"
        "docs/architecture"
        "docs/api/providers"
        "docs/infrastructure"
        "docs/security"
        "docs/reports"
        "archive/agent-reports"
    )

    MISSING_DIRS=0
    for dir in "${REQUIRED_DIRS[@]}"; do
        if [ ! -d "$dir" ]; then
            log_error "Missing directory: $dir"
            MISSING_DIRS=$((MISSING_DIRS + 1))
        fi
    done

    if [ $MISSING_DIRS -eq 0 ]; then
        log_success "All required directories present"
    else
        log_error "Missing $MISSING_DIRS required directories"
    fi

    # Check for README files
    log_info "Checking for README.md files..."
    MISSING_READMES=0
    for dir in "${REQUIRED_DIRS[@]}"; do
        if [ ! -f "$dir/README.md" ]; then
            log_warning "Missing README.md in: $dir"
            MISSING_READMES=$((MISSING_READMES + 1))
        fi
    done

    if [ $MISSING_READMES -eq 0 ]; then
        log_success "All directories have README.md"
    else
        log_warning "$MISSING_READMES directories missing README.md"
    fi

    log_success "Phase 5 complete!"
}

# Main execution
main() {
    PHASE=${1:-"help"}

    case $PHASE in
        prep|preparation)
            phase_prep
            ;;
        archive)
            phase_archive
            ;;
        move)
            phase_move
            ;;
        merge)
            phase_merge
            ;;
        links)
            phase_links
            ;;
        verify)
            phase_verify
            ;;
        all)
            log_warning "Running all phases. This will take time and requires manual intervention."
            read -p "Continue? (y/N) " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                phase_prep
                phase_archive
                phase_move
                phase_merge
                log_warning "Complete manual merges, then run: ./scripts/consolidate-docs.sh links"
            fi
            ;;
        help|*)
            echo "Documentation Consolidation Script"
            echo ""
            echo "Usage: $0 [phase]"
            echo ""
            echo "Phases:"
            echo "  prep      - Create directory structure and backup"
            echo "  archive   - Archive agent reports and deprecated files"
            echo "  move      - Move files to new locations"
            echo "  merge     - Generate merge checklist (manual step)"
            echo "  links     - Update internal links"
            echo "  verify    - Verify consolidation"
            echo "  all       - Run all phases (requires manual intervention)"
            echo "  help      - Show this help message"
            echo ""
            echo "Recommended workflow:"
            echo "  1. $0 prep"
            echo "  2. $0 archive"
            echo "  3. $0 move"
            echo "  4. $0 merge (then complete manual merges)"
            echo "  5. $0 links"
            echo "  6. $0 verify"
            echo ""
            ;;
    esac
}

# Run main function
main "$@"
