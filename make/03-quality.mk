# ==========================================
# 03-quality.mk - Linting, Formatting & Testing
# ==========================================

.PHONY: check lint format type-check test

## check: ⭐ Run ALL quality checks (type-check, lint, test) - ideal for CI
check: type-check lint test
	@echo "$(GREEN)🎉 All quality checks passed successfully!$(RESET)"

## lint: Run ESLint
lint:
	@echo "$(CYAN)Running ESLint...$(RESET)"
	@pnpm lint

## format: Format code automatically with Prettier
format:
	@echo "$(CYAN)Formatting code with Prettier...$(RESET)"
	@pnpm prettier --write .

## type-check: Verify TypeScript types without emitting build files
type-check:
	@echo "$(CYAN)Checking TypeScript types...$(RESET)"
	@pnpm tsc --noEmit

## test: Run unit and integration tests (Vitest / Jest)
test:
	@echo "$(CYAN)Running tests...$(RESET)"
	@pnpm test