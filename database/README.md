# Base de dados

- `dw_schemas.mwb`: modelo de referência (MySQL Workbench), com `Utilizador.authSub` e sem `TokenRenovacao`.
- `migrations/`: scripts SQL versionados (`V001__descricao.sql`, `V002__...`). Nunca alterar a BD partilhada à mão.
- `seeds/`: dados iniciais (categorias e etiquetas meteorológicas).

Dois schemas: `dw_principal` (User SAPI e Wardrobe SAPI) e `dw_reco` (só o Recommendation Service).
