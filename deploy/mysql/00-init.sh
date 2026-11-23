#!/bin/bash
# =============================================================================
# Inicializa o MySQL local do GARMS com os scripts de database/:
#   1. migrations/V*.sql  (dw_principal, dw_reco, ...)
#   2. seeds/S*.sql       (catálogo)
#   3. users/utilizadores_servicos.sql (passwords vêm das variáveis de ambiente)
#
# Corre sozinho no primeiro arranque (volume vazio). Como os scripts são
# idempotentes, pode correr-se de novo para aplicar migrações novas:
#   docker compose --env-file .env -f deploy/docker-compose.yml exec mysql bash /docker-entrypoint-initdb.d/00-init.sh
# =============================================================================
set -euo pipefail

DB_DIR=/garms/database
: "${MYSQL_ROOT_PASSWORD:?Falta MYSQL_ROOT_PASSWORD}"
: "${MYSQL_PW_USER_SAPI:?Falta MYSQL_PW_USER_SAPI}"
: "${MYSQL_PW_WARDROBE_SAPI:?Falta MYSQL_PW_WARDROBE_SAPI}"
: "${MYSQL_PW_RECO:?Falta MYSQL_PW_RECO}"

sql() { MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql --protocol=socket -uroot --default-character-set=utf8mb4 "$@"; }

# Escapa \ e ' para usar o valor dentro de uma string SQL
literal() { local v="${1//\\/\\\\}"; v="${v//\'/\'\'}"; printf "'%s'" "$v"; }

for f in "$DB_DIR"/migrations/V*.sql "$DB_DIR"/seeds/S*.sql; do
  echo "[garms-init] $(basename "$f")"
  sql < "$f"
done

echo "[garms-init] utilizadores_servicos.sql"
{
  echo "SET @pw_user_sapi     = $(literal "$MYSQL_PW_USER_SAPI");"
  echo "SET @pw_wardrobe_sapi = $(literal "$MYSQL_PW_WARDROBE_SAPI");"
  echo "SET @pw_reco          = $(literal "$MYSQL_PW_RECO");"
  cat "$DB_DIR/users/utilizadores_servicos.sql"
} | sql

echo "[garms-init] concluído"
