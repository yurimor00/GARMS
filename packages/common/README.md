# @garms/common

Código partilhado pelos serviços Node do GARMS. Cada serviço importa-o como uma biblioteca
(`"@garms/common": "*"` nas dependências; o npm workspaces liga-o à pasta).

| Módulo | Exporta | Para quê |
| --- | --- | --- |
| `contexto.js` | `correlationIdMiddleware`, `obterCorrelationId`, `comCorrelationId` | `X-Correlation-Id`: reutiliza o recebido ou cria um UUID, devolve-o na resposta e torna-o disponível em todo o código do pedido |
| `logger.js` | `criarLogger`, `registoPedidos` | Logs JSON (pino): `level`, `time` (UTC), `servico`, `correlationId`, `msg`. Uma linha por pedido HTTP. Oculta `authorization`, cookies, chave interna, `password`, `token`, `email` |
| `erros.js` | `ErroApi`, `naoEncontrado`, `validacao`, …, `rotaInexistente`, `tratarErros` | Formato `Erro` dos contratos (`{ codigo, mensagem, campos? }`); 500 `ERRO_INTERNO` sem detalhes para fora, com o stack no log |
| `chaveInterna.js` | `exigirChaveInterna` | `X-Internal-Api-Key` nos serviços internos (401 `NAO_AUTORIZADO`); o `/health` fica de fora |
| `health.js` | `rotasHealth` | `GET /health/live` (liveness) e `GET /health` (readiness, verifica as dependências, 503 se alguma falhar) |
| `rabbitmq.js` | `criarLigacaoRabbit` | Ligação ao RabbitMQ com reconexão (espera crescente até 30 s). Publicar e consumir eventos entram aqui depois |

## Montar um serviço novo (ordem dos middlewares)

```js
import express from 'express';
import { correlationIdMiddleware, registoPedidos, exigirChaveInterna, rotasHealth,
         rotaInexistente, tratarErros, criarLogger } from '@garms/common';

const logger = criarLogger({ servico: 'user-sapi', nivel: process.env.LOG_LEVEL });
const app = express();
app.use(correlationIdMiddleware());          // 1.º: o correlationId tem de estar em todos os logs
app.use(registoPedidos(logger));
app.use(exigirChaveInterna(process.env.INTERNAL_API_KEY));   // só nos serviços internos, não na EAPI
app.use(express.json());
app.use(rotasHealth({ servico: 'user-sapi', verificacoes: { mysql: () => pool.query('SELECT 1') } }));
app.use('/api/v1', rotas);
app.use(rotaInexistente());                  // penúltimo
app.use(tratarErros(logger));                // último
```

Nas rotas, lançar (ou passar a `next`) um `ErroApi`: `throw naoEncontrado()`. No Express 5 os erros de
funções `async` chegam sozinhos ao `tratarErros`.

## Testes

`npm test -w @garms/common` (Vitest). Cobertura: `npm run test:coverage -w @garms/common`.
