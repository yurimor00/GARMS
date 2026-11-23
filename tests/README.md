# Testes

- `api/`: pytest, por endpoint, validando contra os contratos. Relatório com `pytest-html`.
- `e2e/`: Playwright (`pytest-playwright`), fluxos dos episódios principais. O estado de login (`storageState`) não vai para o Git.

Nomes com o código do endpoint ou da US: `test_PER01_nome_demasiado_longo`.
