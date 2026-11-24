# eapi (porta 3000)

Experience API: única porta pública. Valida o access token do Auth0, rate limiting (Redis), agregação, WebSocket em /ws e webhooks de alertas.

- Base: `http://localhost:3000/api/v1`
- Contrato: [contracts/openapi.yaml](../../contracts/openapi.yaml)

## Estado

Esqueleto: arranque, ligações ao Redis e ao RabbitMQ, health checks, logs, `correlationId` e erros no formato `Erro`.
Ainda **não** tem a validação do token do Auth0, o rate limiting nem as rotas do contrato.

## Correr

| Como | Comando (na raiz) | Redis e RabbitMQ |
| --- | --- | --- |
| No Windows, a desenvolver | `npm run dev:eapi` (reinicia a cada alteração) | `REDIS_URL` e `RABBITMQ_URL` do `.env` (localhost) |
| No Docker | `docker compose --env-file .env -f deploy/docker-compose.yml up -d --build eapi` | Hosts `redis` e `rabbitmq` do compose |

No Docker a porta fica em `127.0.0.1:3000` (`EAPI_PORT` no `.env` muda a porta publicada no PC). Logs: `docker logs -f garms-eapi`.

## Variáveis de ambiente

| Variável | Obrigatória | Para quê |
| --- | --- | --- |
| `REDIS_URL` | Sim | Cache partilhada (rate limiting, `sub` → `idUtilizador`, catálogo) |
| `RABBITMQ_URL` | Sim | Eventos (`recommendation.ready`, `weather.alert` para o WebSocket) |
| `PORT` | Não (3000) | Porta onde a EAPI escuta. **Não** usar `EAPI_PORT`: o Kubernetes injeta essa variável (`tcp://IP:porta`) para o Service `eapi` |
| `LOG_LEVEL` | Não (`info`) | `error`, `warn`, `info` ou `debug` |
| `TRUST_PROXY` | Não | Número de proxies à frente (1 no cluster, atrás do Traefik); vazio em local |

Se faltar uma obrigatória, a EAPI não arranca e diz qual é.

## Health checks (fora do `/api/v1`, sem Ingress)

| Rota | Probe do Kubernetes | Responde |
| --- | --- | --- |
| `GET /health/live` | `livenessProbe` | 200 enquanto o processo estiver vivo (não verifica dependências) |
| `GET /health` | `readinessProbe` | 200 com `dependencias: { redis: ok, rabbitmq: ok }`; 503 se alguma falhar |

Se o Redis ou o RabbitMQ caírem, a EAPI continua a correr, o `/health` passa a 503 e as ligações
voltam sozinhas. No `SIGTERM` (Docker, Kubernetes) acaba os pedidos em curso e fecha as ligações.

## Estrutura

```
src/
  server.js   arranque: config, ligações, listen, encerramento limpo (sem testes unitários: coberto pelos testes de API)
  app.js      monta o Express (middlewares, rotas, erros); recebe as dependências, por isso é testável
  config.js   lê e valida as variáveis de ambiente
test/         Vitest + supertest
Dockerfile    build a partir da raiz do repositório
```

O que é comum a todos os serviços (logs, erros, `correlationId`, health checks, RabbitMQ) vem de
[`@garms/common`](../../packages/common/).
