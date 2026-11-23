-- =============================================================================
-- V002: schema dw_reco (gerado a partir de database/dw_schemas.mwb)
-- Acedido só pelo Recommendation Service.
-- idUtilizador, idConjunto e idPeca são referências lógicas a dw_principal
-- (sem FK física); a limpeza é feita pelo evento user.deleted.
-- Idempotente: pode correr-se de novo sem efeitos.
-- =============================================================================

CREATE DATABASE IF NOT EXISTS dw_reco
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_0900_ai_ci;

USE dw_reco;

-- Cópia local das preferências, atualizada pelo evento user.preferences.updated
CREATE TABLE IF NOT EXISTS PreferenciaCopia (
  idUtilizador      INT  NOT NULL,
  estilos           JSON NOT NULL,
  priorizarFavorito TINYINT(1) NOT NULL DEFAULT 1,
  evitarRepeticao   TINYINT(1) NOT NULL DEFAULT 1,
  aprenderComUso    TINYINT(1) NOT NULL DEFAULT 1,
  dataAtualizacao   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (idUtilizador)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS Sugestao (
  idSugestao    INT NOT NULL AUTO_INCREMENT,
  idUtilizador  INT NOT NULL,
  idConjunto    INT NULL DEFAULT NULL,
  dataAlvo      DATE NOT NULL,
  descricao     VARCHAR(255) NULL DEFAULT NULL,
  condicaoMeteo VARCHAR(45)  NULL DEFAULT NULL,
  temperatura   DECIMAL(4,1) NULL DEFAULT NULL,
  motivos       JSON NULL DEFAULT NULL,
  estado        ENUM('proposta', 'aceite', 'trocada') NOT NULL DEFAULT 'proposta',
  PRIMARY KEY (idSugestao),
  INDEX ix_sugestao_dia (idUtilizador, dataAlvo)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS SugestaoPeca (
  idSugestao INT NOT NULL,
  idPeca     INT NOT NULL,
  PRIMARY KEY (idSugestao, idPeca),
  CONSTRAINT fk_sp_sugestao
    FOREIGN KEY (idSugestao) REFERENCES Sugestao (idSugestao)
    ON DELETE CASCADE
) ENGINE = InnoDB;
