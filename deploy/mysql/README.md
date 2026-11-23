# MySQL local (Docker)

Levanta o MySQL 8.4 com os schemas `dw_principal` e `dw_reco`, o catálogo e os utilizadores dos serviços,
usando os mesmos scripts de [`database/`](../../database/) que se correm no Azure.

## 1. Variáveis no `.env` (raiz do repositório)

```dotenv
MYSQL_PORT=3306                 # 3307 se já tiveres um MySQL instalado no Windows
MYSQL_ROOT_PASSWORD=...
MYSQL_PW_USER_SAPI=...
MYSQL_PW_WARDROBE_SAPI=...
MYSQL_PW_RECO=...
```

## 2. Arrancar (a partir da raiz)

```powershell
docker compose --env-file .env -f deploy/docker-compose.yml up -d
docker compose --env-file .env -f deploy/docker-compose.yml ps     # esperar por "healthy"
docker compose --env-file .env -f deploy/docker-compose.yml logs mysql
```

Nos logs devem aparecer as linhas `[garms-init] V001__dw_principal.sql` … `[garms-init] concluído`.

## 3. Ligar

- **MySQL Workbench:** host `127.0.0.1`, porta `MYSQL_PORT`, utilizador `root`. Em *SSL*, `Require`
  (o container gera um certificado próprio; não usar `Verify CA`).
- **Serviços (mysql2):** `MYSQL_HOST=localhost`, `MYSQL_PORT`, utilizador do serviço
  (`garms_user_sapi`, `garms_wardrobe_sapi` ou `garms_reco`), `timezone: 'Z'` e TLS ligado.
  Os utilizadores têm `REQUIRE SSL`; em local o certificado é autoassinado, por isso
  `ssl: { rejectUnauthorized: false }` só em desenvolvimento.
- Quando os serviços estiverem neste compose: host `mysql`, porta `3306`.

## 4. Verificar

```sql
SELECT table_schema, COUNT(*) FROM information_schema.tables
WHERE table_schema IN ('dw_principal', 'dw_reco') GROUP BY table_schema;  -- 12 e 3
SELECT COUNT(*) FROM dw_principal.Categoria;                              -- 5
SELECT COUNT(*) FROM dw_principal.EtiquetaMeteorologica;                  -- 9
```

## Migrações novas e reset

- **Migração nova** (`V003__...sql` em `database/migrations/`): os scripts são idempotentes, basta correr
  `docker compose --env-file .env -f deploy/docker-compose.yml exec mysql bash /docker-entrypoint-initdb.d/00-init.sh`
- **Recomeçar do zero** (apaga os dados locais):
  `docker compose --env-file .env -f deploy/docker-compose.yml down -v` e depois `up -d`.
