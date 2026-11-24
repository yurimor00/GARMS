# Imagem da EAPI. O contexto do build é a RAIZ do repositório (por causa de packages/common):
#   docker build -f services/eapi/Dockerfile -t garms-eapi .

# --- Dependências de produção (só as da EAPI e do @garms/common) ---
FROM node:24-alpine AS dependencias
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/common/package.json packages/common/
COPY services/eapi/package.json services/eapi/
RUN npm ci --omit=dev --workspace @garms/eapi --include-workspace-root=false --no-audit --no-fund

# --- Imagem final ---
FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /app

COPY --from=dependencias --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json ./
COPY --chown=node:node packages/common/package.json packages/common/
COPY --chown=node:node packages/common/src packages/common/src
COPY --chown=node:node services/eapi/package.json services/eapi/
COPY --chown=node:node services/eapi/src services/eapi/src

# Nunca correr como root
USER node
EXPOSE 3000

# O Kubernetes usa as suas probes (/health/live e /health); isto é para o Docker/compose
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO /dev/null http://127.0.0.1:3000/health/live || exit 1

# node diretamente (sem npm) para receber o SIGTERM e encerrar de forma limpa
CMD ["node", "services/eapi/src/server.js"]
