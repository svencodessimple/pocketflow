# ==========================================
# 00-base.mk - Core, Helper & Styling
# ==========================================

# ANSI color codes for terminal output
CYAN    := \033[36m
GREEN   := \033[32m
YELLOW  := \033[33m
RED     := \033[31m
RESET   := \033[0m

.PHONY: help check-deps

## help: Display this help menu with all available commands
help:
	@echo ""
	@echo " $(CYAN)🚀 Makeflow Toolkit - Command Overview$(RESET)"
	@echo " =========================================="
	@echo ""
	@sed -n 's/^##//p' $(MAKEFILE_LIST) | column -t -s ':' | sed -e 's/^/  /'
	@echo ""

## check-deps: Verify that required CLI tools are installed (node, pnpm, docker)
check-deps:
	@echo "$(CYAN)Checking system requirements...$(RESET)"
	@command -v node >/dev/null 2>&1 || { echo "$(RED)❌ Node.js is missing!$(RESET)"; exit 1; }
	@command -v pnpm >/dev/null 2>&1 || { echo "$(YELLOW)⚠️ pnpm is missing! Recommended for Next.js setups.$(RESET)"; }
	@command -v docker >/dev/null 2>&1 || { echo "$(YELLOW)⚠️ Docker is not installed or running.$(RESET)"; }
	@echo "$(GREEN)✓ All critical tools found.$(RESET)"