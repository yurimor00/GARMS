// Cria (ou atualiza) os Secrets do GARMS no cluster a partir do .env da raiz.
// Os segredos nunca vão para o Git nem para o terminal: são enviados ao kubectl pelo stdin.
//
//   node deploy/k8s/secrets.mjs                 # usa ./.env
//   node deploy/k8s/secrets.mjs --env outro.env
//   node deploy/k8s/secrets.mjs --dry-run       # mostra só os nomes e as chaves, sem valores
//
// Secrets criados (namespace garms):
//   garms-redis     password
//   garms-rabbitmq  user, password
//   garms-eapi      REDIS_URL, RABBITMQ_URL (com os hosts internos do cluster: redis, rabbitmq)
// O do MySQL (Azure) entra quando houver serviços com BD.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const NAMESPACE = 'garms';
const args = process.argv.slice(2);
const ficheiro = args.includes('--env') ? args[args.indexOf('--env') + 1] : '.env';
const simulacao = args.includes('--dry-run');

function lerEnv(caminho) {
  const valores = {};
  for (const linha of readFileSync(caminho, 'utf8').split(/\r?\n/)) {
    const m = linha.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    let valor = m[2];
    if (/^(['"]).*\1$/.test(valor)) valor = valor.slice(1, -1);
    valores[m[1]] = valor;
  }
  return valores;
}

const env = lerEnv(ficheiro);
const obrigatorias = ['REDIS_PASSWORD', 'RABBITMQ_USER', 'RABBITMQ_PASSWORD'];
const emFalta = obrigatorias.filter((nome) => !env[nome]);
if (emFalta.length) {
  console.error(`Faltam no ${ficheiro}: ${emFalta.join(', ')} (ver .env.example)`);
  process.exit(1);
}

const cod = encodeURIComponent; // passwords com @ : / # também funcionam nos URLs
const secrets = {
  'garms-redis': { password: env.REDIS_PASSWORD },
  'garms-rabbitmq': { user: env.RABBITMQ_USER, password: env.RABBITMQ_PASSWORD },
  'garms-eapi': {
    REDIS_URL: `redis://:${cod(env.REDIS_PASSWORD)}@redis:6379/0`,
    RABBITMQ_URL: `amqp://${cod(env.RABBITMQ_USER)}:${cod(env.RABBITMQ_PASSWORD)}@rabbitmq:5672/garms`,
  },
};

if (simulacao) {
  for (const [nome, dados] of Object.entries(secrets)) console.log(`${nome}: ${Object.keys(dados).join(', ')}`);
  process.exit(0);
}

// JSON é YAML válido: uma lista com o namespace e os Secrets, aplicada de uma vez
const lista = {
  apiVersion: 'v1',
  kind: 'List',
  items: [
    { apiVersion: 'v1', kind: 'Namespace', metadata: { name: NAMESPACE } },
    ...Object.entries(secrets).map(([nome, dados]) => ({
      apiVersion: 'v1',
      kind: 'Secret',
      type: 'Opaque',
      metadata: { name: nome, namespace: NAMESPACE, labels: { 'app.kubernetes.io/part-of': 'garms' } },
      stringData: dados,
    })),
  ],
};

const resultado = spawnSync('kubectl', ['apply', '-f', '-'], {
  input: JSON.stringify(lista),
  encoding: 'utf8',
  shell: process.platform === 'win32',
});
process.stdout.write(resultado.stdout ?? '');
process.stderr.write(resultado.stderr ?? '');
process.exit(resultado.status ?? 1);
