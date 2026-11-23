# Contratos v2: Auth0, Redis e domínio

Mudam 4 dos 8 contratos (versão 1.0.0 → 2.0.0). `wardrobe-papi` e `planner-papi` passam a 1.0.1: só muda a descrição do cabeçalho `X-User-Id` (vem do `sub` do token do Auth0, não do JWT próprio). `wardrobe-sapi` e `recommendation-service` ficam iguais (1.0.0).

## openapi.yaml (EAPI)

- **Saem:** `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout` e `PUT /me/password`. Passam a ser feitos no Auth0.
- **Segurança:** `bearerAuth` (JWT próprio) é substituído por `auth0` (`openIdConnect`). O URL do tenant é um exemplo e tem de ser trocado pelo real.
- **Servidor:** `https://api.{dominio}/api/v1`, com a variável `dominio` (por omissão `garms.pt`).
- **`GET /me`:** passa a cobrir também o ACC-01 (cria a conta no primeiro pedido). Novo 409 `EMAIL_JA_REGISTADO`.
- **`PATCH /me`:** só altera o `nome`. Sai o 409.
- **`DELETE /me`:** já não tem corpo (sem password). Exige um login com menos de 5 minutos (401 `REAUTENTICACAO_NECESSARIA`). Novo 502 `AUTH_INDISPONIVEL`.
- **Schemas que saem:** `Registar`, `Entrar`, `RefreshToken`, `Sessao`, `MudarPassword`, `ConfirmarPassword`. `ContaAlterar` fica só com `nome`.
- **Descrição geral:** explica o fluxo OAuth, as claims da Action do Auth0 e o rate limiting com Redis.

## account-papi.yaml

- **Saem:** `/auth/*` e `/me/password`.
- **Novo `POST /accounts` (ACC-01):** obtém ou cria a conta a partir do `authSub`, do nome e do email do token. É idempotente: responde 200 ou 201, e 409 se o email já pertencer a outra conta.
- **`DELETE /me`:** apaga primeiro no Auth0 (Management API) e só depois na BD. Se o Auth0 falhar, responde 502 e não apaga nada.
- **`PATCH /me`:** só o `nome`.

## user-sapi.yaml

- **Saem:** `/users/{id}/credentials`, `/users/{id}/refresh-tokens`, `/refresh-tokens` e `/refresh-tokens/{id}`, e a tag «Credenciais e tokens».
- **`GET /users`:** procura por `?authSub=` (antes era por email).
- **`POST /users`:** recebe `authSub`, `nome` e `email` (sem `palavraPasseHash`).
- **`PATCH /users/{id}`:** só `nome` e `fotoPerfil`.
- **Schemas:** `UtilizadorRegisto` ganha `authSub`. Saem `UtilizadorComHash`, `Credenciais`, `TokenRenovacao` e `TokenRenovacaoCriar`.

## weather-sapi.yaml

- **Cache:** a cache da previsão, os locais seguidos e os alertIds vistos passam da memória para o Redis (partilhado pelas réplicas).
- **Novo `POST /jobs/refresh-forecasts`:** é chamado pelo CronJob do Kubernetes de 30 em 30 minutos e publica `weather.updated`.

## Fora dos contratos (por atualizar)

- **`dw_schemas.mwb`:**
  - sai a tabela `TokenRenovacao` e a coluna `Utilizador.palavraPasseHash`
  - entra a coluna `Utilizador.authSub VARCHAR(255) UNIQUE NOT NULL`
  - o `email` continua `UNIQUE`
- **«Explicação da BD»:** dicionário de dados e tabela de FKs (`TokenRenovacao`).
- **Folha de endpoints (Google Sheets):** linhas ACC-01 a ACC-03, PER-03, PER-08 e PER-09.
