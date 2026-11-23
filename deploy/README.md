# Deploy

- `docker-compose.yml` (a criar): MySQL, RabbitMQ, Redis, serviços e frontend num só comando.
- `k8s/`: manifestos Kubernetes (Deployments, Services, Secrets, CronJobs, StatefulSet do RabbitMQ).
- `traefik/`: values do Helm. `/` → frontend, `/api` e `/ws` → EAPI.
