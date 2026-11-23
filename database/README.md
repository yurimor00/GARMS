# Base de dados

MySQL 8.4, dois schemas: `dw_principal` (User SAPI e Wardrobe SAPI) e `dw_reco` (só o Recommendation Service).

| Ficheiro | O que faz |
| --- | --- |
| `dw_schemas.mwb` | Modelo de referência (MySQL Workbench), com `Utilizador.authSub` e sem `TokenRenovacao` |
| `migrations/V001__dw_principal.sql` | Cria o schema `dw_principal` (12 tabelas) |
| `migrations/V002__dw_reco.sql` | Cria o schema `dw_reco` (3 tabelas) |
| `seeds/S001__catalogo.sql` | Categorias e etiquetas meteorológicas |
| `users/utilizadores_servicos.sql` | Um utilizador MySQL por serviço, com privilégio mínimo e TLS obrigatório |

Todos os scripts são idempotentes: podem correr-se de novo sem estragar nada.
Alterações ao esquema entram como um ficheiro novo (`V003__descricao.sql`, …), nunca editando um já aplicado nem mexendo à mão na BD partilhada.
Quando o modelo `.mwb` mudar, a migração tem de mudar com ele (e vice-versa).

## Ordem de execução

1. `migrations/V001__dw_principal.sql`
2. `migrations/V002__dw_reco.sql`
3. `seeds/S001__catalogo.sql`
4. `users/utilizadores_servicos.sql` (ver as instruções no topo do ficheiro: as passwords definem-se na sessão, nunca no ficheiro)

## Azure Database for MySQL (servidor flexível)

**Antes de correr:**
- **Versão:** o servidor tem de estar em MySQL 8.4 (os seeds usam `INSERT … AS novo`, que precisa de 8.0.19 ou mais recente).
- **Acesso de rede:** em *Networking*, o IP de quem vai correr os scripts tem de estar nas regras de firewall.
- **TLS:** o Azure tem `require_secure_transport = ON` por omissão. Manter assim. No Workbench, em *SSL*, escolher `Require` (ou `Require and Verify CA` com o certificado raiz da Microsoft/DigiCert indicado na documentação do Azure).

**Correr no MySQL Workbench:**
1. Nova ligação: host `<servidor>.mysql.database.azure.com`, porta 3306, utilizador administrador do servidor.
2. Abrir e executar cada script pela ordem acima (*File → Open SQL Script*, depois o raio ⚡).
3. Para o passo 4, escrever primeiro os três `SET @pw_… = '…';` no editor, executá-los, e só depois abrir e executar `utilizadores_servicos.sql` na mesma ligação.

**Verificar:**

```sql
SELECT table_schema, COUNT(*) AS tabelas
FROM information_schema.tables
WHERE table_schema IN ('dw_principal', 'dw_reco')
GROUP BY table_schema;               -- dw_principal 12, dw_reco 3

SELECT COUNT(*) FROM dw_principal.Categoria;              -- 5
SELECT COUNT(*) FROM dw_principal.EtiquetaMeteorologica;  -- 9
SHOW GRANTS FOR 'garms_wardrobe_sapi'@'%';
```

**Nos serviços:** cada SAPI liga com o seu utilizador (`garms_user_sapi`, `garms_wardrobe_sapi`, `garms_reco`) e com TLS ligado. As datas são guardadas em UTC: a ligação deve usar `timezone: 'Z'` (mysql2).

**Custos:** a BD gasta créditos enquanto está ligada (~19 USD/mês). Pode parar-se o servidor no portal do Azure quando não estiver a ser usado (para no máximo 30 dias; depois o Azure volta a ligá-lo).
