-- =============================================================================
-- Sistema de Geração e Correção de Provas (SGP Católica SC / Correge)
-- Script DDL de Criação do Banco de Dados em MySQL (8.0+)
-- Alinhado ao Diagrama de Classes (incluindo Disciplina)
-- =============================================================================

CREATE DATABASE IF NOT EXISTS sgp_catolica
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE sgp_catolica;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS Correcao;
DROP TABLE IF EXISTS VersaoProva;
DROP TABLE IF EXISTS ProvaQuestao;
DROP TABLE IF EXISTS Prova;
DROP TABLE IF EXISTS Alternativa;
DROP TABLE IF EXISTS Questao;
DROP TABLE IF EXISTS Aluno;
DROP TABLE IF EXISTS Turma;
DROP TABLE IF EXISTS Disciplina;
DROP TABLE IF EXISTS Professor;

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- 1. TABELA: Professor
-- =============================================================================
CREATE TABLE Professor (
    id CHAR(36) NOT NULL DEFAULT (UUID()),
    nomeCompleto VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    senhaHash VARCHAR(255) NOT NULL,

    PRIMARY KEY (id),
    UNIQUE KEY uq_professor_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 2. TABELA: Disciplina
-- =============================================================================
CREATE TABLE Disciplina (
    id CHAR(36) NOT NULL DEFAULT (UUID()),
    idProfessor CHAR(36) NOT NULL,
    codigo VARCHAR(50) NOT NULL, -- Ex: 'DIR-101'
    nome VARCHAR(100) NOT NULL,   -- Ex: 'Direito Constitucional'
    curso VARCHAR(100) NOT NULL,  -- Ex: 'Direito'

    PRIMARY KEY (id),
    INDEX idx_disciplina_professor (idProfessor),
    CONSTRAINT fk_disciplina_professor FOREIGN KEY (idProfessor)
        REFERENCES Professor (id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 3. TABELA: Turma
-- =============================================================================
CREATE TABLE Turma (
    id CHAR(36) NOT NULL DEFAULT (UUID()),
    idProfessor CHAR(36) NOT NULL,
    idDisciplina CHAR(36) NOT NULL,
    nome VARCHAR(100) NOT NULL,
    periodoLetivo VARCHAR(20) NOT NULL, -- Ex: '2026.1'
    status ENUM('ativa', 'arquivada') NOT NULL DEFAULT 'ativa',

    PRIMARY KEY (id),
    INDEX idx_turma_professor (idProfessor),
    INDEX idx_turma_disciplina (idDisciplina),
    CONSTRAINT fk_turma_professor FOREIGN KEY (idProfessor)
        REFERENCES Professor (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_turma_disciplina FOREIGN KEY (idDisciplina)
        REFERENCES Disciplina (id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 4. TABELA: Aluno
-- =============================================================================
CREATE TABLE Aluno (
    id CHAR(36) NOT NULL DEFAULT (UUID()),
    idTurma CHAR(36) NOT NULL,
    nome VARCHAR(255) NOT NULL,
    matricula VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    curso VARCHAR(100) NOT NULL,

    PRIMARY KEY (id),
    UNIQUE KEY uq_aluno_turma_matricula (idTurma, matricula),
    INDEX idx_aluno_turma (idTurma),
    INDEX idx_aluno_matricula (matricula),
    CONSTRAINT fk_aluno_turma FOREIGN KEY (idTurma)
        REFERENCES Turma (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 5. TABELA: Questao
-- =============================================================================
CREATE TABLE Questao (
    id CHAR(36) NOT NULL DEFAULT (UUID()),
    idProfessor CHAR(36) NOT NULL,
    idDisciplina CHAR(36) NOT NULL,
    codigo VARCHAR(50) NOT NULL, -- Ex: '#Q-1024'
    tipo ENUM('objetiva', 'discursiva') NOT NULL DEFAULT 'objetiva',
    dificuldade ENUM('Fácil', 'Médio', 'Difícil') NOT NULL DEFAULT 'Médio',
    enunciado TEXT NOT NULL,
    pontuacao DECIMAL(4,2) NOT NULL DEFAULT 1.00,

    PRIMARY KEY (id),
    INDEX idx_questao_professor (idProfessor),
    INDEX idx_questao_disciplina (idDisciplina),
    CONSTRAINT fk_questao_professor FOREIGN KEY (idProfessor)
        REFERENCES Professor (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_questao_disciplina FOREIGN KEY (idDisciplina)
        REFERENCES Disciplina (id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 6. TABELA: Alternativa (Composição: Questao 1 *-- 2..5 Alternativa)
-- =============================================================================
CREATE TABLE Alternativa (
    id CHAR(36) NOT NULL DEFAULT (UUID()),
    idQuestao CHAR(36) NOT NULL,
    letra CHAR(1) NOT NULL, -- 'A', 'B', 'C', 'D', 'E'
    texto TEXT NOT NULL,
    correta BOOLEAN NOT NULL DEFAULT FALSE,

    PRIMARY KEY (id),
    INDEX idx_alternativa_questao (idQuestao),
    CONSTRAINT fk_alternativa_questao FOREIGN KEY (idQuestao)
        REFERENCES Questao (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 7. TABELA: Prova
-- =============================================================================
CREATE TABLE Prova (
    id CHAR(36) NOT NULL DEFAULT (UUID()),
    idProfessor CHAR(36) NOT NULL,
    idTurma CHAR(36) NOT NULL,
    idDisciplina CHAR(36) NOT NULL,
    codigo VARCHAR(50) NOT NULL, -- Ex: '#DIR-CONST-2026.1'
    titulo VARCHAR(150) NOT NULL,
    dataAplicacao DATE NOT NULL,
    status ENUM('Pendente', 'Em Andamento', 'Corrigida') NOT NULL DEFAULT 'Pendente',
    embaralharQuestoes BOOLEAN NOT NULL DEFAULT TRUE,
    embaralharAlternativas BOOLEAN NOT NULL DEFAULT TRUE,
    numeroVersoes INT NOT NULL DEFAULT 4,
    notaMaxima DECIMAL(5,2) NOT NULL DEFAULT 10.00,

    PRIMARY KEY (id),
    INDEX idx_prova_professor (idProfessor),
    INDEX idx_prova_turma (idTurma),
    INDEX idx_prova_disciplina (idDisciplina),
    INDEX idx_prova_status (status),
    CONSTRAINT fk_prova_professor FOREIGN KEY (idProfessor)
        REFERENCES Professor (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_prova_turma FOREIGN KEY (idTurma)
        REFERENCES Turma (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_prova_disciplina FOREIGN KEY (idDisciplina)
        REFERENCES Disciplina (id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 8. TABELA ASSOCIATIVA: ProvaQuestao (Agregação: Prova 0..* o-- 1..20 Questao)
-- =============================================================================
CREATE TABLE ProvaQuestao (
    idProva CHAR(36) NOT NULL,
    idQuestao CHAR(36) NOT NULL,
    ordem INT NOT NULL,

    PRIMARY KEY (idProva, idQuestao),
    INDEX idx_prova_questao_questao (idQuestao),
    CONSTRAINT fk_pq_prova FOREIGN KEY (idProva)
        REFERENCES Prova (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_pq_questao FOREIGN KEY (idQuestao)
        REFERENCES Questao (id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 9. TABELA: VersaoProva (Composição: Prova 1 *-- 1..4 VersaoProva)
-- =============================================================================
CREATE TABLE VersaoProva (
    id CHAR(36) NOT NULL DEFAULT (UUID()),
    idProva CHAR(36) NOT NULL,
    letraVersao CHAR(1) NOT NULL, -- 'A', 'B', 'C', 'D'
    layoutQuestoes JSON NOT NULL, -- Ordem impressa das questões e alternativas
    gabaritoOficial JSON NOT NULL, -- Mapa questão -> alternativa correta nesta versão
    payloadQrCode VARCHAR(255) NOT NULL,

    PRIMARY KEY (id),
    UNIQUE KEY uq_prova_versao (idProva, letraVersao),
    UNIQUE KEY uq_versao_qrcode (payloadQrCode),
    INDEX idx_versao_prova (idProva),
    CONSTRAINT fk_versao_prova FOREIGN KEY (idProva)
        REFERENCES Prova (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 10. TABELA: Correcao (Leitura OMR & Lançamento Manual)
-- =============================================================================
CREATE TABLE Correcao (
    id CHAR(36) NOT NULL DEFAULT (UUID()),
    idVersaoProva CHAR(36) NOT NULL,
    idAluno CHAR(36) NULL, -- NULL enquanto pendente de lançamento manual (0..1 Aluno)
    nomeManuscrito VARCHAR(150) NULL,
    matriculaManuscrita VARCHAR(50) NULL,
    notaTotal DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    respostasLidas JSON NOT NULL,
    atribuicaoAutomatica BOOLEAN NOT NULL DEFAULT FALSE,
    dataConfirmacao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    INDEX idx_correcao_versao (idVersaoProva),
    INDEX idx_correcao_aluno (idAluno),
    CONSTRAINT fk_correcao_versao FOREIGN KEY (idVersaoProva)
        REFERENCES VersaoProva (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_correcao_aluno FOREIGN KEY (idAluno)
        REFERENCES Aluno (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
