# Kubernetes (Docker Desktop)

Cluster local do Docker Desktop (kubeadm, 1 nó) para a demo de escalabilidade e load balancer.
Tudo no namespace `garms`, exceto o Traefik (namespace `traefik`).

```
http://localhost (ou garms.pt pelo túnel, mais tarde)
        │
   Traefik (Ingress, Helm) ── /api, /ws ──► Service eapi ──► EAPI × 2 réplicas
                                                              │        │
                                               Service redis ◄┘        └► Service rabbitmq
                                               Redis (StatefulSet)        RabbitMQ (StatefulSet)
                                               volume 1 Gi                volume 1 Gi + topologia
```

| Ficheiro | O quê |
| --- | --- |
| `../kustomization.yaml` | Junta tudo (Kustomize). Gera os ConfigMaps a partir dos mesmos ficheiros do compose (`redis/redis.conf`, `rabbitmq/*`) |
| `namespace.yaml` | Namespace `garms` |
| `redis.yaml` | Redis 7.4: StatefulSet, volume persistente, password do Secret, probes `redis-cli ping` |
| `rabbitmq.yaml` | RabbitMQ 3.13: StatefulSet, volume persistente; o container `topologia` importa o `definitions.json` |
| `eapi.yaml` | EAPI: Deployment com 2 réplicas, probes `/health/live` e `/health`, sem root, sistema de ficheiros só de leitura |
| `ingress.yaml` | `/api` e `/ws` → EAPI. O `/health` e os serviços internos não são públicos |
| `secrets.mjs` | Cria os Secrets a partir do `.env` (não estão no Git) |
| `../traefik/values.yaml` | Valores do Helm do Traefik |

## Pré-requisitos (uma vez)

1. **Kubernetes ligado no Docker Desktop:** *Settings → Kubernetes → Enable Kubernetes* (kubeadm) → *Apply & restart*.
   Ligar sempre pela janela: editar o ficheiro de definições à mão é desfeito pela própria janela.
2. **Helm:** `winget install Helm.Helm` (abrir um terminal novo depois).
3. **Traefik** (a partir da raiz):
   ```powershell
   helm repo add traefik https://traefik.github.io/charts
   helm upgrade --install traefik traefik/traefik --version 43.0.0 -n traefik --create-namespace -f deploy/traefik/values.yaml --wait
   ```
   Fica em `http://localhost` (porta 80 do PC). Sem rotas, responde 404.

## Instalar ou atualizar o GARMS (a partir da raiz)

```powershell
node deploy/k8s/secrets.mjs        # Secrets a partir do .env (cria o namespace se não existir)
kubectl apply -k deploy/           # o resto
kubectl -n garms get pods          # esperar por todos "Running" e READY completo (rabbitmq-0 tem 2/2)
```

- **Secrets:** `garms-redis`, `garms-rabbitmq` e `garms-eapi` (`REDIS_URL` e `RABBITMQ_URL` com os hosts do cluster).
  `node deploy/k8s/secrets.mjs --dry-run` mostra só os nomes e as chaves. Depois de mudar o `.env`, voltar a correr o script e
  `kubectl -n garms rollout restart deployment/eapi` (os pods só leem os Secrets ao arrancar).
- **MySQL:** o cluster usa sempre a BD do **Azure** (não há MySQL no cluster). O Secret entra quando houver serviços com BD.
- **Imagens:** por omissão as do GHCR (`ghcr.io/yurimor00/garms-<servico>:latest`), publicadas pela CI a cada merge na `main`.
  Depois de um merge: `kubectl -n garms rollout restart deployment/eapi` (a política `Always` descarrega a nova `latest`).

### Testar uma imagem construída no PC (sem a publicar)

```powershell
docker build -f services/eapi/Dockerfile -t garms-eapi:local .
kubectl -n garms set image deployment/eapi eapi=garms-eapi:local
kubectl -n garms patch deployment eapi --type=json -p='[{"op":"replace","path":"/spec/template/spec/containers/0/imagePullPolicy","value":"Never"}]'
```

Para voltar à imagem do GHCR: `kubectl apply -k deploy/`.

## Verificar

```powershell
curl http://localhost/api/v1/qualquer          # 404 NAO_ENCONTRADO em JSON, vindo da EAPI pelo Traefik
kubectl -n garms exec deploy/eapi -- wget -qO- http://127.0.0.1:3000/health
kubectl -n garms logs -l app=eapi --tail=20    # logs JSON das réplicas
kubectl -n garms logs rabbitmq-0 -c topologia  # "topologia aplicada"
```

**Testes de API contra o cluster:** `kubectl -n garms port-forward svc/eapi 3000:3000` e, noutro terminal, `cd tests; .venv/Scripts/python -m pytest`.

## Demo: escalabilidade e load balancer

```powershell
kubectl -n garms scale deployment/eapi --replicas=4
kubectl -n garms get pods -l app=eapi -w                     # novas réplicas: só recebem pedidos quando /health dá 200
1..20 | % { curl.exe -s -o NUL -H "X-Correlation-Id: demo-$_" http://localhost/api/v1/x }
kubectl -n garms logs -l app=eapi --prefix | Select-String demo-   # cada pedido foi para uma réplica diferente
kubectl -n garms delete pod <uma-réplica-eapi>                # o Deployment cria outra; os pedidos continuam a funcionar
```

Verificado: com 2 réplicas, 20 pedidos dividiram-se 10/10.

## Painéis (só por port-forward, nunca expostos)

| Painel | Comando | Endereço |
| --- | --- | --- |
| RabbitMQ | `kubectl -n garms port-forward svc/rabbitmq 15672` | <http://localhost:15672> |
| Traefik | `kubectl -n traefik port-forward deploy/traefik 8080` | <http://localhost:8080/dashboard/> |

Se o RabbitMQ do compose estiver a correr, a porta 15672 já está ocupada: usar `15673:15672`.

## Notas

- **`enableServiceLinks: false`** em todos os pods: sem isto o Kubernetes injeta `<SERVICO>_PORT=tcp://IP:porta` por cada
  Service (ex.: `EAPI_PORT`, `RABBITMQ_PORT`), o que já partiu o arranque da EAPI. Os serviços encontram-se pelo DNS (`redis`, `rabbitmq`).
- **Compose e cluster ao mesmo tempo:** podem correr lado a lado (o cluster usa a porta 80; o compose usa 3000, 5672, 6379…).
  Cada um tem o seu Redis e o seu RabbitMQ.
- **Apagar tudo do GARMS** (incluindo os volumes): `kubectl delete namespace garms`. O Traefik: `helm uninstall traefik -n traefik`.
- **Ainda por fazer:** Cloudflare Tunnel dentro do cluster (a apontar para o Traefik), frontend, outros serviços, Secret do MySQL (Azure),
  CronJobs (`refresh-forecasts` de 30 em 30 min, limpeza de fotos) e recolha de logs e métricas.
