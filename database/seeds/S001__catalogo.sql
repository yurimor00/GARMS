-- =============================================================================
-- S001: dados iniciais do catálogo (dw_principal)
-- Idempotente: as chaves únicas (nome / codigo) evitam duplicados.
-- =============================================================================

USE dw_principal;

INSERT INTO Categoria (nome) VALUES
  ('Partes de cima'),
  ('Partes de baixo'),
  ('Casacos'),
  ('Vestidos'),
  ('Calçado')
AS novo
ON DUPLICATE KEY UPDATE nome = novo.nome;

INSERT INTO EtiquetaMeteorologica (codigo, nomeApresentado, grupo) VALUES
  -- Temperatura
  ('frio',         'Frio',         'temperatura'),
  ('fresco',       'Fresco',       'temperatura'),
  ('ameno',        'Ameno',        'temperatura'),
  ('quente',       'Quente',       'temperatura'),
  ('muito_quente', 'Muito quente', 'temperatura'),
  -- Condição
  ('impermeavel',  'Impermeável',  'condicao'),
  ('corta_vento',  'Corta-vento',  'condicao'),
  ('respiravel',   'Respirável',   'condicao'),
  ('isolante',     'Isolante',     'condicao')
AS novo
ON DUPLICATE KEY UPDATE nomeApresentado = novo.nomeApresentado, grupo = novo.grupo;
