# Redis local (Docker)

Cache partilhada por todas as réplicas dos serviços (ver a secção «Cache» do projeto). Um só Redis.

| Chave (exemplo) | Serviço | TTL |
| --- | --- | --- |
| Previsão do tempo (lat/lon arredondadas a 2 casas) | Weather SAPI | 30 min |
| `alertId` já vistos e locais seguidos | Weather SAPI | 24 h |
| Contadores de rate limiting (`rate-limit-redis`) | EAPI | janela do limite |
| `sub` do Auth0 → `idUtilizador` | EAPI | algumas horas |
| Catálogo (categorias e etiquetas) | EAPI | 1 h |

Peças, conjuntos, histórico e eventos **não** vão para o Redis.

## 1. Variáveis no `.env` (raiz do repositório)

```dotenv
REDIS_PASSWORD=...                       # obrigatória
REDIS_PORT=6379
REDIS_URL=redis://:<password>@localhost:6379/0
```

Gerar uma password forte, por exemplo: `node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"`.
Se tiver caracteres especiais (`@`, `:`, `/`…), no `REDIS_URL` vai com URL-encoding.

## 2. Arrancar (a partir da raiz)

```powershell
docker compose --env-file .env -f deploy/docker-compose.yml up -d redis
docker compose --env-file .env -f deploy/docker-compose.yml ps redis      # esperar por "healthy"
```

## 3. Configuração (`redis.conf`)

- **Password:** passada no arranque a partir de `REDIS_PASSWORD` (não fica no ficheiro nem no `docker inspect`).
  Ao contrário do RabbitMQ, mudar a password é só mudar o `.env` e recriar o container.
- **Memória:** `maxmemory 256mb` com `volatile-lru`. Se encher, saem primeiro as chaves com TTL menos usadas.
  **Todas as chaves do GARMS têm de ter TTL** (`SET … EX …`); uma chave sem TTL nunca sai.
- **Persistência:** AOF com `fsync` a cada segundo, no volume `garms_garms-redis-data`. A cache sobrevive a reinícios.
- **Comandos desligados:** `FLUSHALL`, `FLUSHDB`, `CONFIG` e `DEBUG`.
- **Porta** só em `127.0.0.1`: não é acessível de fora do PC nem pelo túnel.

## 4. Ligar

- **Serviços a correr no Windows** (`redis` / `ioredis`): `REDIS_URL` do `.env`.
- **Quando os serviços estiverem neste compose:** host `redis` (`redis://:<password>@redis:6379/0`).
- **Prefixo das chaves por serviço:** `eapi:…`, `weather:…`, para não haver colisões (ex.: `weather:forecast:37.74:-25.67`).

## 5. Verificar e depurar

```powershell
docker exec garms-redis redis-cli ping                    # PONG (a password vem de REDISCLI_AUTH)
docker exec garms-redis redis-cli --scan --pattern 'weather:*'
docker exec garms-redis redis-cli ttl <chave>
docker exec garms-redis redis-cli info memory
```

## Recomeçar do zero

Como o `FLUSHALL` está desligado, para limpar a cache apaga-se o volume:
`docker compose --env-file .env -f deploy/docker-compose.yml rm -sf redis`,
`docker volume rm garms_garms-redis-data` e depois `up -d redis`.

No Kubernetes vai ser um Deployment (ou StatefulSet) com 1 réplica e um Service interno, sem Ingress.
