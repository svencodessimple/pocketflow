# ==========================================
# 01-dev.mk - Development & Setup Commands
# ==========================================

.PHONY: setup dev build start clean reset env

## setup: Initialize the project (copy .env, install dependencies)
setup: check-deps
	@echo "$(CYAN)Copying environment variables...$(RESET)"
	@[ -f .env ] || cp .env.example .env
	@echo "$(CYAN)Installing dependencies...$(RESET)"
	@pnpm install
	@echo "$(GREEN)✨ Setup complete! Run 'make dev' to start.$(RESET)"

## dev: Start the Next.js development server
dev:
	@pnpm dev

## build: Create a local production build (next build)
build:
	@pnpm build

## start: Start the production build locally
start:
	@NODE_ENV=production node .next/standalone/server.js

## env: Sync .env.example with .env
env:
	@[ -f .env ] && echo "$(YELLOW).env file already exists.$(RESET)" || cp .env.example .env

## clean: Remove build artifacts (.next, dist, coverage)
clean:
	@echo "$(YELLOW)Cleaning build artifacts...$(RESET)"
	@rm -rf .next dist out coverage .turbo
	@echo "$(GREEN)✓ Clean complete.$(RESET)"

## reset: [Nuclear] Remove node_modules & build files, then reinstall fresh
reset: clean
	@echo "$(RED)Removing node_modules...$(RESET)"
	@rm -rf node_modules pnpm-lock.yaml
	@pnpm install
	@echo "$(GREEN)✓ Complete reset executed.$(RESET)"