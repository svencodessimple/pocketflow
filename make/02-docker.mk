# ==========================================
# 02-docker.mk - Docker & Local Container Ops
# ==========================================

# Default environment is set to 'dev'.
# Override with: make <target> ENV=prod
ENV ?= dev

ifeq ($(ENV),prod)
    COMPOSE = docker compose -f docker/docker-compose.yaml
else
    COMPOSE = docker compose -f docker/docker-compose.yaml -f docker/docker-compose.dev.yaml
endif

.PHONY: up down restart rebuild logs shell status

## up: Start all Docker containers in background mode
up:
	@echo "$(CYAN)Starting Docker containers ($(ENV) mode)...$(RESET)"
	@$(COMPOSE) up -d

## down: Stop and remove all Docker containers
down:
	@echo "$(YELLOW)Stopping Docker containers ($(ENV) mode)...$(RESET)"
	@$(COMPOSE) exec -T app rm -rf .next 2>/dev/null || true
	@$(COMPOSE) down
	@$(MAKE) clean

## restart: Execute 'down' followed by 'up'
restart: down up

## rebuild: Force a clean Docker rebuild without cache
rebuild:
	@echo "$(CYAN)Rebuilding Docker containers without cache ($(ENV) mode)...$(RESET)"
	@$(COMPOSE) build --no-cache
	@$(COMPOSE) up -d

## logs: Stream real-time Docker container logs (Ctrl+C to exit)
logs:
	@$(COMPOSE) logs -f --tail=100

## shell: Open an interactive shell inside the running app container
shell:
	@$(COMPOSE) exec app sh

## status: Display current status of all Docker containers
status:
	@$(COMPOSE) ps