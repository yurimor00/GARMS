# GARMS — Digital Wardrobe

Projeto de Engenharia de Software do **Grupo 7** (Universidade dos Açores, 2026/27).
Guarda-roupa digital: fotografar peças, criar conjuntos, registar o que se usou e receber uma sugestão diária baseada na meteorologia e nas preferências.

## Estrutura

| Pasta | Conteúdo |
| --- | --- |
| [frontend/](frontend/) | App React (mobile-first) |
| [packages/common/](packages/common/) | Código partilhado pelos serviços Node (logs, erros, health checks…) |
| [services/eapi/](services/eapi/) | EAPI (3000): única porta pública |
| [services/user-sapi/](services/user-sapi/) | User SAPI (3001) |
| [services/wardrobe-sapi/](services/wardrobe-sapi/) | Wardrobe SAPI (3002) |
| [services/weather-sapi/](services/weather-sapi/) | Weather SAPI (3003) |
| [services/account-papi/](services/account-papi/) | Account PAPI (3004) |
| [services/planner-papi/](services/planner-papi/) | Planner PAPI (3005) |
| [services/wardrobe-papi/](services/wardrobe-papi/) | Wardrobe PAPI (3006) |
| [services/ms-recommendation/](services/ms-recommendation/) | Recommendation Service (3007) |
| [contracts/](contracts/) | Contratos OpenAPI 3.1 (fonte de verdade) |
| [database/](database/) | Modelo `dw_schemas.mwb`, migrações e seeds |
| [tests/api/](tests/api/) | Testes de API (pytest) |
| [tests/e2e/](tests/e2e/) | Testes E2E (Playwright) |
| [deploy/](deploy/) | Docker Compose, manifestos Kubernetes, Traefik |
| [.github/workflows/](.github/workflows/) | GitHub Actions: testes em cada PR e build/push das imagens para o GHCR |

## Serviços Node (monorepo com npm workspaces)

Requisito: **Node 24 LTS** (`winget install OpenJS.NodeJS.LTS`). Os serviços usam ES modules (`import`/`export`).

```powershell
npm install                 # na raiz: instala todos os serviços e liga o @garms/common
npm test                    # testes unitários (Vitest) de todos os workspaces
npm run test:coverage       # o mesmo, com relatório de cobertura em <workspace>/coverage/
npm run dev:eapi            # EAPI no Windows, com o .env da raiz e reinício automático
```

- **Código partilhado:** fica em `packages/common` (`import { criarLogger } from '@garms/common'`). Não copiar estes ficheiros para os serviços.
- **Dependência nova num serviço:** `npm install <pacote> -w @garms/eapi` (na raiz; há um só `package-lock.json`).
- **Imagens Docker:** são construídas a partir da raiz (`docker build -f services/eapi/Dockerfile .`). O `.dockerignore` deixa o `.env` de fora.
- **Testes de API:** ver [tests/README.md](tests/README.md).

## Como trabalhar

- **Branches:** `SCRUM-NN-descricao` (ex.: `SCRUM-51-login`). A `main` é protegida: tudo entra por PR.
- **Commits:** `SCRUM-NN: descrição` e, quando aplicável, o código do endpoint (ex.: `ACC-02`).
- **Configuração:** copiar `.env.example` para `.env` e preencher. Nunca fazer commit do `.env`.
