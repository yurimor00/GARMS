-- =============================================================================
-- V001: schema dw_principal (gerado a partir de database/dw_schemas.mwb)
-- Acedido só pela User SAPI e pela Wardrobe SAPI.
-- Idempotente: pode correr-se de novo sem efeitos (CREATE ... IF NOT EXISTS).
-- Datas de negócio em DATE; instantes em DATETIME (UTC).
-- =============================================================================

CREATE DATABASE IF NOT EXISTS dw_principal
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_0900_ai_ci;

USE dw_principal;

-- -----------------------------------------------------------------------------
-- Utilizador: a identidade é do Auth0 (authSub = sub do token). Sem passwords.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS Utilizador (
  idUtilizador INT NOT NULL AUTO_INCREMENT,
  email        VARCHAR(255) NOT NULL,
  authSub      VARCHAR(255) NOT NULL COMMENT 'sub do Auth0 (identificador da conta no fornecedor de identidade)',
  nome         VARCHAR(45)  NOT NULL,
  fotoPerfil   VARCHAR(255) NULL DEFAULT NULL,
  dataCriado   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (idUtilizador),
  UNIQUE INDEX uq_utilizador_email (email),
  UNIQUE INDEX uq_utilizador_authsub (authSub)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS PreferenciaUtilizador (
  idPreferenciaUtilizador INT NOT NULL AUTO_INCREMENT,
  idUtilizador            INT NOT NULL,
  localizacaoAtiva        TINYINT(1) NOT NULL DEFAULT 0,
  cidade                  VARCHAR(45) NULL DEFAULT NULL,
  latitude                DECIMAL(8,6) NULL DEFAULT NULL,
  longitude               DECIMAL(9,6) NULL DEFAULT NULL,
  notificacoesAtivas      TINYINT(1) NOT NULL DEFAULT 0,
  priorizarFavorito       TINYINT(1) NOT NULL DEFAULT 1,
  evitarRepeticao         TINYINT(1) NOT NULL DEFAULT 1,
  aprenderComUso          TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (idPreferenciaUtilizador),
  UNIQUE INDEX uq_preferencia_utilizador (idUtilizador),
  CONSTRAINT fk_preferencia_utilizador
    FOREIGN KEY (idUtilizador) REFERENCES Utilizador (idUtilizador)
    ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS EstiloUtilizador (
  idEstiloUtilizador INT NOT NULL AUTO_INCREMENT,
  idUtilizador       INT NOT NULL,
  estilo ENUM('casual', 'minimalista', 'classico', 'elegante', 'desportivo', 'streetwear', 'boho') NOT NULL,
  PRIMARY KEY (idEstiloUtilizador),
  UNIQUE INDEX uq_estilo_utilizador (idUtilizador, estilo),
  CONSTRAINT fk_estilo_utilizador
    FOREIGN KEY (idUtilizador) REFERENCES Utilizador (idUtilizador)
    ON DELETE CASCADE
) ENGINE = InnoDB;

-- -----------------------------------------------------------------------------
-- Catálogo (dados fixos, ver database/seeds)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS Categoria (
  idCategoria INT NOT NULL AUTO_INCREMENT,
  nome        VARCHAR(45) NOT NULL,
  PRIMARY KEY (idCategoria),
  UNIQUE INDEX uq_categoria_nome (nome)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS EtiquetaMeteorologica (
  idEtiquetaMeteorologica INT NOT NULL AUTO_INCREMENT,
  nomeApresentado         VARCHAR(45) NOT NULL,
  codigo                  VARCHAR(45) NOT NULL,
  grupo ENUM('temperatura', 'condicao') NOT NULL,
  PRIMARY KEY (idEtiquetaMeteorologica),
  UNIQUE INDEX uq_etiqueta_codigo (codigo)
) ENGINE = InnoDB;

-- -----------------------------------------------------------------------------
-- Peças: eliminação lógica (eliminadaData)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS Peca (
  idPeca        INT NOT NULL AUTO_INCREMENT,
  idCategoria   INT NOT NULL,
  idUtilizador  INT NOT NULL,
  nome          VARCHAR(45)  NOT NULL,
  foto          VARCHAR(255) NOT NULL,
  estadoFoto    ENUM('pendente', 'processada', 'falhou') NOT NULL DEFAULT 'pendente',
  corNome       VARCHAR(45) NOT NULL,
  corCodigo     CHAR(7)     NOT NULL,
  estacao       SET('primavera', 'verao', 'outono', 'inverno') NOT NULL,
  favorita      TINYINT(1)  NOT NULL DEFAULT 0,
  dataCriado    DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  eliminadaData DATETIME    NULL DEFAULT NULL,
  PRIMARY KEY (idPeca),
  INDEX ix_peca_catalogo (idUtilizador, eliminadaData),
  INDEX ix_peca_categoria (idCategoria),
  CONSTRAINT fk_peca_categoria
    FOREIGN KEY (idCategoria) REFERENCES Categoria (idCategoria)
    ON DELETE RESTRICT,
  CONSTRAINT fk_peca_utilizador
    FOREIGN KEY (idUtilizador) REFERENCES Utilizador (idUtilizador)
    ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS PecaEtiquetaMeteorologica (
  idPeca                  INT NOT NULL,
  idEtiquetaMeteorologica INT NOT NULL,
  PRIMARY KEY (idPeca, idEtiquetaMeteorologica),
  INDEX ix_pe_etiqueta (idEtiquetaMeteorologica),
  CONSTRAINT fk_pe_peca
    FOREIGN KEY (idPeca) REFERENCES Peca (idPeca)
    ON DELETE CASCADE,
  CONSTRAINT fk_pe_etiqueta
    FOREIGN KEY (idEtiquetaMeteorologica) REFERENCES EtiquetaMeteorologica (idEtiquetaMeteorologica)
    ON DELETE RESTRICT
) ENGINE = InnoDB;

-- -----------------------------------------------------------------------------
-- Conjuntos
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS Conjunto (
  idConjunto       INT NOT NULL AUTO_INCREMENT,
  idUtilizador     INT NOT NULL,
  nome             VARCHAR(45) NOT NULL,
  codigoEstilo     ENUM('casual', 'minimalista', 'classico', 'elegante', 'desportivo', 'streetwear', 'boho') NULL DEFAULT NULL,
  conjuntoFavorito TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (idConjunto),
  INDEX ix_conjunto_utilizador (idUtilizador),
  CONSTRAINT fk_conjunto_utilizador
    FOREIGN KEY (idUtilizador) REFERENCES Utilizador (idUtilizador)
    ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS ConjuntoPeca (
  idConjunto INT NOT NULL,
  idPeca     INT NOT NULL,
  PRIMARY KEY (idConjunto, idPeca),
  INDEX ix_cp_peca (idPeca),
  CONSTRAINT fk_cp_conjunto
    FOREIGN KEY (idConjunto) REFERENCES Conjunto (idConjunto)
    ON DELETE CASCADE,
  CONSTRAINT fk_cp_peca
    FOREIGN KEY (idPeca) REFERENCES Peca (idPeca)
    ON DELETE CASCADE
) ENGINE = InnoDB;

-- -----------------------------------------------------------------------------
-- Histórico: fotografia do dia (copia nome, peças e tempo). Sem PATCH.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS RegistoUso (
  idRegistoUso  INT NOT NULL AUTO_INCREMENT,
  idUtilizador  INT NOT NULL,
  idConjunto    INT NULL DEFAULT NULL,
  dataUso       DATE NOT NULL,
  nomeConjunto  VARCHAR(45) NOT NULL,
  condicaoMeteo VARCHAR(45) NULL DEFAULT NULL,
  temperatura   DECIMAL(4,1) NULL DEFAULT NULL,
  origem        ENUM('sugestao', 'manual', 'evento') NOT NULL DEFAULT 'manual',
  PRIMARY KEY (idRegistoUso),
  INDEX ix_registo_data (idUtilizador, dataUso),
  INDEX ix_registo_conjunto (idConjunto),
  CONSTRAINT fk_registo_utilizador
    FOREIGN KEY (idUtilizador) REFERENCES Utilizador (idUtilizador)
    ON DELETE CASCADE,
  CONSTRAINT fk_registo_conjunto
    FOREIGN KEY (idConjunto) REFERENCES Conjunto (idConjunto)
    ON DELETE SET NULL
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS RegistoUsoPeca (
  idRegistoUso INT NOT NULL,
  idPeca       INT NOT NULL,
  PRIMARY KEY (idRegistoUso, idPeca),
  INDEX ix_rup_peca (idPeca),
  CONSTRAINT fk_rup_registo
    FOREIGN KEY (idRegistoUso) REFERENCES RegistoUso (idRegistoUso)
    ON DELETE CASCADE,
  CONSTRAINT fk_rup_peca
    FOREIGN KEY (idPeca) REFERENCES Peca (idPeca)
    ON DELETE CASCADE
) ENGINE = InnoDB;

-- -----------------------------------------------------------------------------
-- Calendário
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS Evento (
  idEvento     INT NOT NULL AUTO_INCREMENT,
  idUtilizador INT NOT NULL,
  idConjunto   INT NULL DEFAULT NULL,
  titulo       VARCHAR(45) NOT NULL,
  dataEvento   DATE NOT NULL,
  horaInicio   TIME NULL DEFAULT NULL,
  local        VARCHAR(100) NULL DEFAULT NULL,
  nota         VARCHAR(255) NULL DEFAULT NULL,
  PRIMARY KEY (idEvento),
  INDEX ix_evento_data (idUtilizador, dataEvento),
  INDEX ix_evento_conjunto (idConjunto),
  CONSTRAINT fk_evento_utilizador
    FOREIGN KEY (idUtilizador) REFERENCES Utilizador (idUtilizador)
    ON DELETE CASCADE,
  CONSTRAINT fk_evento_conjunto
    FOREIGN KEY (idConjunto) REFERENCES Conjunto (idConjunto)
    ON DELETE SET NULL
) ENGINE = InnoDB;
