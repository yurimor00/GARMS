# Deploy

- `docker-compose.yml`: MySQL, RabbitMQ, Redis, EAPI, Cloudflare Tunnel e nginx de teste; os outros serviços e o frontend entram depois.
- `mysql/`: init da BD local ([README](mysql/README.md)).
- `rabbitmq/`: configuração e topologia do broker ([README](rabbitmq/README.md)).
- `redis/`: configuração da cache e painel Redis Insight ([README](redis/README.md)).
- `kustomization.yaml` e `k8s/`: manifestos Kubernetes (Redis, RabbitMQ, EAPI, Ingress) e script dos Secrets ([README](k8s/README.md)).
- `traefik/`: values do Helm do Traefik. `/api` e `/ws` → EAPI (e `/` → frontend, quando existir).
