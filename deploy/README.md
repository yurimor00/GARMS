# Deploy

- `docker-compose.yml`: MySQL, RabbitMQ, Cloudflare Tunnel e nginx de teste; Redis, serviços e frontend entram depois.
- `mysql/`: init da BD local ([README](mysql/README.md)).
- `rabbitmq/`: configuração e topologia do broker ([README](rabbitmq/README.md)).
- `k8s/`: manifestos Kubernetes (Deployments, Services, Secrets, CronJobs, StatefulSet do RabbitMQ).
- `traefik/`: values do Helm. `/` → frontend, `/api` e `/ws` → EAPI.
