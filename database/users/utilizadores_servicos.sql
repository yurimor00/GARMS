-- =============================================================================
-- Utilizadores MySQL dos serviços (privilégio mínimo, só com TLS)
--
-- Cada serviço tem o seu utilizador e só vê as tabelas que lhe pertencem:
--   garms_user_sapi      → dw_principal: Utilizador, PreferenciaUtilizador, EstiloUtilizador
--   garms_wardrobe_sapi  → dw_principal: peças, conjuntos, histórico, eventos (+ ler o catálogo)
--   garms_reco           → dw_reco (tudo)
-- As PAPIs e a EAPI não têm acesso à base de dados.
--
-- COMO CORRER (correr com o utilizador administrador, depois de V001 e V002):
--   1. Na MESMA sessão, antes deste script, definir as passwords:
--        SET @pw_user_sapi     = '...';
--        SET @pw_wardrobe_sapi = '...';
--        SET @pw_reco          = '...';
--   2. Correr este script. Se faltar alguma password, o script falha
--      (erro de sintaxe em IDENTIFIED BY NULL) e não cria esse utilizador.
--   3. Guardar as passwords só no .env / Secrets do Kubernetes. NUNCA neste ficheiro.
--
-- Idempotente: CREATE USER IF NOT EXISTS não muda a password de quem já existe
-- (para a mudar: ALTER USER 'garms_...'@'%' IDENTIFIED BY '...').
-- =============================================================================

-- --- Criar utilizadores -------------------------------------------------------
SET @sql = CONCAT('CREATE USER IF NOT EXISTS ''garms_user_sapi''@''%'' IDENTIFIED BY ', QUOTE(@pw_user_sapi), ' REQUIRE SSL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = CONCAT('CREATE USER IF NOT EXISTS ''garms_wardrobe_sapi''@''%'' IDENTIFIED BY ', QUOTE(@pw_wardrobe_sapi), ' REQUIRE SSL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = CONCAT('CREATE USER IF NOT EXISTS ''garms_reco''@''%'' IDENTIFIED BY ', QUOTE(@pw_reco), ' REQUIRE SSL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = NULL;

-- --- User SAPI ----------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON dw_principal.Utilizador            TO 'garms_user_sapi'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON dw_principal.PreferenciaUtilizador TO 'garms_user_sapi'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON dw_principal.EstiloUtilizador      TO 'garms_user_sapi'@'%';

-- --- Wardrobe SAPI ------------------------------------------------------------
GRANT SELECT ON dw_principal.Categoria             TO 'garms_wardrobe_sapi'@'%';
GRANT SELECT ON dw_principal.EtiquetaMeteorologica TO 'garms_wardrobe_sapi'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON dw_principal.Peca                      TO 'garms_wardrobe_sapi'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON dw_principal.PecaEtiquetaMeteorologica TO 'garms_wardrobe_sapi'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON dw_principal.Conjunto                  TO 'garms_wardrobe_sapi'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON dw_principal.ConjuntoPeca              TO 'garms_wardrobe_sapi'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON dw_principal.RegistoUso                TO 'garms_wardrobe_sapi'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON dw_principal.RegistoUsoPeca            TO 'garms_wardrobe_sapi'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON dw_principal.Evento                    TO 'garms_wardrobe_sapi'@'%';

-- --- Recommendation Service ---------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON dw_reco.* TO 'garms_reco'@'%';
