# Testes

| Tipo | Onde | Ferramenta | Corre na CI |
| --- | --- | --- | --- |
| Unitários | `packages/*/test/`, `services/*/test/` | Vitest (+ supertest), cobertura v8 | Sim, em cada PR |
| API | `tests/api/` | pytest + Playwright (`APIRequestContext`), relatório `pytest-html` | Sim, em cada PR (contra a EAPI no compose) |
| E2E | `tests/e2e/` | Playwright (`pytest-playwright`), fluxos dos episódios principais | Ainda não há testes |

Nomes com o código do endpoint ou da US: `test_PER01_nome_demasiado_longo`. O comportamento comum da EAPI
(health checks, formato `Erro`, `correlationId`) usa o prefixo `test_EAPI_`.

## Unitários (na raiz do repositório)

```powershell
npm test                    # todos os workspaces
npm run test:coverage       # com cobertura: relatório HTML em packages/common/coverage/ e services/eapi/coverage/
npm test -w @garms/eapi     # só um serviço
```

## API (pytest)

Uma vez, criar o ambiente Python:

```powershell
python -m venv tests/.venv
tests/.venv/Scripts/pip install -r tests/requirements.txt
```

Com a EAPI a correr (`docker compose --env-file .env -f deploy/docker-compose.yml up -d eapi`, ou `npm run dev:eapi`):

```powershell
cd tests
.venv/Scripts/python -m pytest              # relatório em tests/reports/api.html
$env:EAPI_URL="http://localhost:3000"       # outro endereço, se for preciso
```

Os testes de API não precisam de browser: o Playwright só faz os pedidos HTTP. Os testes E2E vão precisar de
`playwright install chromium`. O estado de login (`storageState`) não vai para o Git.

## Evidência para o relatório

- **Na CI:** cada execução do workflow «Testes» guarda os artefactos `cobertura` e `relatorio-api` (separador *Actions* do GitHub).
- **Em local:** `tests/reports/` e `*/coverage/` estão no `.gitignore`.
