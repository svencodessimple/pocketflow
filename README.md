# Makeflow Toolkit 🚀

A production-ready **Next.js 16 & React 19** starter toolkit powered by modular **Makefile** automation, **Docker** and **pnpm 11**.

Makeflow Toolkit provides a structured development environment with consistent commands, automated quality checks and containerized development and production workflows.

## ✨ Features

- ⚡ **Next.js 16 & React 19** — App Router, Server Components and optimized performance.
- 🛠️ **Makefile DX Automation** — Standardized commands for setup, development, Docker and quality checks.
- 📦 **pnpm 11** — Strict dependency management and build-script permissions.
- 🎨 **Tailwind CSS 4** — Modern CSS-first configuration.
- 🛡️ **TypeScript 6** — Strict type checking.
- 🧪 **Quality Assurance** — Vitest, ESLint 9 and Prettier.
- 🐳 **Docker** — Multi-stage production builds using Next.js standalone output.

## 📁 Project Structure

```text
.
├── docker/
│   ├── Dockerfile
│   ├── Dockerfile.dev
│   ├── docker-compose.yaml
│   └── docker-compose.dev.yaml
├── make/
│   ├── 00-base.mk
│   ├── 01-dev.mk
│   ├── 02-docker.mk
│   └── 03-quality.mk
├── src/
│   ├── app/
│   └── styles/
├── Makefile
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
└── tsconfig.json
```

## 🚀 Quick Start

### Prerequisites

- **Node.js:** `>=20.9.0` (Node 26 used in CI and Docker)
- **pnpm:** `>=11.0.0`
- **Make**
- **Docker:** Required for containerized workflows

### 1. Clone the repository

```bash
git clone https://github.com/svencodessimple/makeflow-toolkit.git
cd makeflow-toolkit
```

### 2. Initialize the project

```bash
make setup
```

This checks the required system tools, copies `.env.example` to `.env` if necessary and installs dependencies.

### 3. Start development

```bash
make dev
```

Open [http://localhost:3000](http://localhost:3000).

## 🛠️ Makefile Commands

| Command            | Description                                     |
| ------------------ | ----------------------------------------------- |
| `make help`        | Display all available commands                  |
| `make check-deps`  | Check required system tools                     |
| `make setup`       | Initialize environment and install dependencies |
| `make dev`         | Start the local Next.js development server      |
| `make build`       | Build the application locally                   |
| `make start`       | Start the standalone production server          |
| `make check`       | Run type-check, lint and tests                  |
| `make lint`        | Run ESLint                                      |
| `make format`      | Format files using Prettier                     |
| `make type-check`  | Run TypeScript type checking                    |
| `make test`        | Run Vitest                                      |
| `make clean`       | Remove local build artifacts                    |
| `make reset`       | Remove dependencies and reinstall               |
| `make up`          | Start Docker development containers             |
| `make up ENV=prod` | Start Docker production containers              |
| `make down`        | Stop and remove Docker containers               |
| `make rebuild`     | Rebuild Docker images without cache             |
| `make logs`        | Follow container logs                           |
| `make shell`       | Open a shell in the app container               |
| `make status`      | Show Docker container status                    |

## 🐳 Docker

### Development

```bash
make up
```

Starts the development Compose configuration with source-code bind mounts and hot reloading.

### Production

```bash
make up ENV=prod
```

Uses the multi-stage production Dockerfile and Next.js standalone output.

Stop the containers with:

```bash
make down
```

## 🧪 Quality Checks

Run the complete quality suite:

```bash
make check
```

This executes:

1. TypeScript type checking
2. ESLint
3. Vitest

The same command is used by the GitHub Actions CI workflow.

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

Crafted with ❤️ by **SvenCodesSimple**
