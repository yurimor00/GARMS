# RabbitMQ local (Docker)

Levanta o RabbitMQ 3.13 (com o painel de gestão) e aplica a topologia dos eventos do GARMS:
exchange `dw.events` (topic), filas dos consumidores e dead-letter.

| Ficheiro | Para que serve |
| --- | --- |
| `definitions.json` | Topologia: vhost `garms`, exchanges, filas e bindings |
| `10-garms.conf` | Configuração do broker (montada em `/etc/rabbitmq/conf.d/`) |

## 1. Variáveis no `.env` (raiz do repositório)

```dotenv
RABBITMQ_USER=garms
RABBITMQ_PASSWORD=...
RABBITMQ_PORT=5672          # AMQP
RABBITMQ_MGMT_PORT=15672    # painel, só em 127.0.0.1
RABBITMQ_URL=amqp://garms:<password>@localhost:5672/garms
RABBITMQ_EXCHANGE=dw.events
```

O utilizador é criado **só no primeiro arranque** (volume vazio). Para mudar a password depois,
usar `rabbitmqctl change_password` ou recomeçar do zero (ver abaixo).

## 2. Arrancar (a partir da raiz)

```powershell
docker compose --env-file .env -f deploy/docker-compose.yml up -d rabbitmq rabbitmq-init
docker compose --env-file .env -f deploy/docker-compose.yml logs rabbitmq-init
```

O `rabbitmq-init` espera que o broker esteja `healthy`, importa o `definitions.json` pela API de gestão
e termina (estado `exited (0)` é o normal). A importação é idempotente.

**Porquê um container à parte:** se o broker carregar as definições no arranque (`load_definitions`),
deixa de criar o utilizador do `.env` («Will not seed default virtual host and user»), e pôr o
utilizador no `definitions.json` obrigaria a fazer commit do hash da password.

## 3. Topologia

| Fila | Consumidor | Routing keys | Para quê |
| --- | --- | --- | --- |
| `reco.events` | Recommendation Service | `user.#`, `wardrobe.#`, `planner.#`, `weather.#` | Cópia das preferências, novas sugestões, limpeza do `dw_reco` |
| `wardrobe-papi.events` | Wardrobe PAPI | `user.deleted` | Apagar as fotos do utilizador no bucket (PER-08) |
| `weather-sapi.events` | Weather SAPI | `user.location.updated` | Seguir o local e registá-lo no fornecedor de alertas |

Cada fila tem a sua DLQ (`<fila>.dlq`), ligada ao `dw.events.dlx` com o nome da fila como routing key:

```
dw.events (topic) ──user.#, wardrobe.#, planner.#, weather.#──► reco.events ──┐
                  ──user.deleted───────────────────────────────► wardrobe-papi.events ──┤ rejeitada 5 vezes
                  ──user.location.updated──────────────────────► weather-sapi.events ──┘
                                                                                │
dw.events.dlx (direct) ──<nome da fila>──► reco.events.dlq / wardrobe-papi.events.dlq / weather-sapi.events.dlq
```

- **Routing keys:** no exchange topic, `*` corresponde a exatamente uma palavra e `#` a zero ou mais.
  `user.*` apanharia `user.deleted` mas não `user.location.updated`; por isso usa-se `user.#`.
- Filas **quorum** e duráveis: sobrevivem a reinícios e contam as entregas. Ao fim de 5 entregas
  falhadas (`nack`/`reject` com requeue) a mensagem vai para a DLQ, em vez de ficar em ciclo.
- Os serviços publicam com `persistent: true` e fazem `ack` manual só depois de processar.
- **Filas novas:** cada serviço consumidor acrescenta a sua fila (`<servico>.events` + `<servico>.events.dlq`)
  ao `definitions.json`, seguindo o padrão da `reco.events`. No código, usar `checkQueue` (ou um
  `assertQueue` com **exatamente** os mesmos argumentos), senão o RabbitMQ responde `PRECONDITION_FAILED`.
- **Exceção, EAPI:** cada réplica tem de receber todos os `recommendation.ready` e `weather.alert`
  (o WebSocket do utilizador pode estar em qualquer réplica), por isso cria no arranque uma fila
  exclusiva e temporária (`assertQueue('', { exclusive: true })`) ligada ao `dw.events`. Não vai para o `definitions.json`.

## 4. Ligar

- **Painel de gestão:** <http://localhost:15672>, com `RABBITMQ_USER` / `RABBITMQ_PASSWORD`. Só escuta em
  `127.0.0.1` e não passa pelo Cloudflare Tunnel. O `guest` só funciona dentro do container.
- **Serviços (amqplib) a correr no Windows:** `RABBITMQ_URL=amqp://garms:<password>@localhost:5672/garms`.
- Quando os serviços estiverem neste compose: host `rabbitmq` (`amqp://garms:<password>@rabbitmq:5672/garms`).

## 5. Verificar

```powershell
docker exec garms-rabbitmq rabbitmqctl -q -p garms list_queues name type messages
docker exec garms-rabbitmq rabbitmqctl -q -p garms list_bindings source_name destination_name routing_key
# Publicar um evento de teste (deve aparecer 1 mensagem em reco.events)
docker exec garms-rabbitmq rabbitmqadmin -u garms -p <password> -V garms publish exchange=dw.events routing_key=wardrobe.piece.changed payload='{"teste":1}'
```

## Alterar a topologia e recomeçar

- **Depois de editar o `definitions.json`:** `docker compose --env-file .env -f deploy/docker-compose.yml up -d rabbitmq-init`
  (filas e bindings novos são criados; os que já existem ficam iguais). A importação só acrescenta:
  um binding retirado do ficheiro continua no broker até ser apagado (no painel, ou com
  `rabbitmqadmin delete binding`). Mudar os argumentos de uma fila que já existe também não tem efeito:
  é preciso apagá-la e voltar a correr o init.
- **Recomeçar do zero** (apaga mensagens e utilizador, mantém o MySQL):
  `docker compose --env-file .env -f deploy/docker-compose.yml rm -sf rabbitmq`,
  `docker volume rm garms_garms-rabbitmq-data` e depois `up -d rabbitmq rabbitmq-init`.

No Kubernetes vai ser um StatefulSet com 1 réplica e volume persistente; o painel só por `kubectl port-forward`.
