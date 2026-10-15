-- =============================================================================
-- Sistema de Geração de Provas (SGP Católica SC)
-- Script DDL de Criação do Banco de Dados em MySQL (8.0+)
-- =============================================================================

CREATE DATABASE IF NOT EXISTS sgp_catolica
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE sgp_catolica;

-- Desativa checagem temporária para recriação limpa, se necessário
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS Correcao;
DROP TABLE IF EXISTS AtribuicaoProvaAluno;
DROP TABLE IF EXISTS VersaoProva;
DROP TABLE IF EXISTS Aplicacao;
DROP TABLE IF EXISTS Prova;
DROP TABLE IF EXISTS Alternativa;
DROP TABLE IF EXISTS Questao;
DROP TABLE IF EXISTS MatriculaTurma;
DROP TABLE IF EXISTS Turma;
DROP TABLE IF EXISTS Usuario;

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- 1. TABELA: Usuario (Base para Professores e Estudantes - Feature 1 & 1.1 LGPD)
-- =============================================================================
CREATE TABLE Usuario (
    id CHAR(36) NOT NULL DEFAULT (UUID()),
    papel ENUM('professor', 'estudante') NOT NULL,
    matricula VARCHAR(50) NULL,
    nomeCompleto VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    senhaHash VARCHAR(255) NOT NULL,
    dataCriacao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    dataAnonimizacao DATETIME NULL,
    
    PRIMARY KEY (id),
    UNIQUE KEY uq_usuario_email (email),
    INDEX idx_usuario_papel (papel),
    INDEX idx_usuario_matricula (matricula)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 2. TABELA: Turma (Feature 3 - Criação e Gestão de Turmas)
-- =============================================================================
CREATE TABLE Turma (
    id CHAR(36) NOT NULL DEFAULT (UUID()),
    idProfessor CHAR(36) NOT NULL,
    nome VARCHAR(100) NOT NULL,
    disciplina VARCHAR(100) NOT NULL,
    periodoLetivo VARCHAR(20) NOT NULL, -- Ex: '2026/1'
    codigoConvite VARCHAR(50) NOT NULL, -- Código único regenerável
    status ENUM('ativa', 'arquivada') NOT NULL DEFAULT 'ativa',
    dataCriacao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (id),
    UNIQUE KEY uq_turma_codigo_convite (codigoConvite),
    INDEX idx_turma_professor (idProfessor),
    CONSTRAINT fk_turma_professor FOREIGN KEY (idProfessor)
        REFERENCES Usuario (id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 3. TABELA: MatriculaTurma (Vínculo Aluno-Turma - Feature 3)
-- =============================================================================
CREATE TABLE MatriculaTurma (
    id CHAR(36) NOT NULL DEFAULT (UUID()),
    idTurma CHAR(36) NOT NULL,
    idAluno CHAR(36) NOT NULL,
    status ENUM('ativa', 'removida') NOT NULL DEFAULT 'ativa',
    canalMatricula ENUM('professor', 'codigo_convite') NOT NULL,
    dataMatricula DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (id),
    UNIQUE KEY uq_matricula_turma_aluno (idTurma, idAluno),
    INDEX idx_matricula_aluno (idAluno),
    CONSTRAINT fk_matricula_turma FOREIGN KEY (idTurma)
        REFERENCES Turma (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_matricula_aluno FOREIGN KEY (idAluno)
        REFERENCES Usuario (id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 4. TABELA: Questao (Feature 2 - Banco de Questões do Docente)
-- =============================================================================
CREATE TABLE Questao (
    id CHAR(36) NOT NULL DEFAULT (UUID()),
    idProfessor CHAR(36) NOT NULL,
    codigo VARCHAR(50) NOT NULL, -- Ex: '#Q-1024'
    tipo ENUM('objetiva', 'discursiva') NOT NULL,
    enunciado TEXT NOT NULL,
    disciplina VARCHAR(100) NOT NULL,
    dificuldade VARCHAR(50) NULL, -- 'Fácil', 'Médio', 'Difícil'
    pontuacaoPadrao DECIMAL(4,2) NOT NULL DEFAULT 1.00,
    dataExclusao DATETIME NULL, -- Soft-delete conforme regra da spec
    dataCriacao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (id),
    INDEX idx_questao_professor (idProfessor),
    INDEX idx_questao_disciplina (disciplina),
    INDEX idx_questao_tipo (tipo),
    CONSTRAINT fk_questao_professor FOREIGN KEY (idProfessor)
        REFERENCES Usuario (id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 5. TABELA: Alternativa (Alternativas de 2 a 5 para Questões Objetivas)
-- =============================================================================
CREATE TABLE Alternativa (
    id CHAR(36) NOT NULL DEFAULT (UUID()),
    idQuestao CHAR(36) NOT NULL,
    letraPadrao CHAR(1) NOT NULL, -- 'A', 'B', 'C', 'D', 'E'
    texto TEXT NOT NULL,
    correta BOOLEAN NOT NULL DEFAULT FALSE,
    
    PRIMARY KEY (id),
    INDEX idx_alternativa_questao (idQuestao),
    CONSTRAINT fk_alternativa_questao FOREIGN KEY (idQuestao)
        REFERENCES Questao (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 6. TABELA: Prova (Feature 4 - Template Reutilizável de Avaliação)
-- =============================================================================
CREATE TABLE Prova (
    id CHAR(36) NOT NULL DEFAULT (UUID()),
    idProfessor CHAR(36) NOT NULL,
    codigo VARCHAR(50) NOT NULL, -- Ex: '#DIR-CONST-2026.1'
    titulo VARCHAR(150) NOT NULL,
    disciplina VARCHAR(100) NOT NULL,
    status ENUM('draft', 'ready', 'closed') NOT NULL DEFAULT 'draft',
    questoesConfig JSON NOT NULL, -- Array: [{questionId, order, score}] (máx 20)
    dataCriacao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (id),
    INDEX idx_prova_professor (idProfessor),
    INDEX idx_prova_status (status),
    CONSTRAINT fk_prova_professor FOREIGN KEY (idProfessor)
        REFERENCES Usuario (id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 7. TABELA: Aplicacao (Features 5 & 6 - Instanciação da Prova em uma Turma)
-- =============================================================================
CREATE TABLE Aplicacao (
    id CHAR(36) NOT NULL DEFAULT (UUID()),
    idProva CHAR(36) NOT NULL,
    idTurma CHAR(36) NOT NULL,
    idProfessor CHAR(36) NOT NULL,
    titulo VARCHAR(150) NOT NULL,
    status ENUM('draft', 'generated', 'closed') NOT NULL DEFAULT 'draft',
    comIdentificacaoAluno BOOLEAN NOT NULL DEFAULT TRUE,
    embaralharQuestoes BOOLEAN NOT NULL DEFAULT TRUE,
    embaralharAlternativas BOOLEAN NOT NULL DEFAULT TRUE,
    quantidadeVersoes INT NOT NULL DEFAULT 1,
    urlPdfConsolidado VARCHAR(500) NULL,
    gabaritoPublicado BOOLEAN NOT NULL DEFAULT FALSE,
    codigoPublicoGabarito VARCHAR(50) NOT NULL, -- Consulta do gabarito por alunos/público
    dataCriacao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (id),
    UNIQUE KEY uq_aplicacao_codigo_publico (codigoPublicoGabarito),
    INDEX idx_aplicacao_prova (idProva),
    INDEX idx_aplicacao_turma (idTurma),
    INDEX idx_aplicacao_professor (idProfessor),
    CONSTRAINT fk_aplicacao_prova FOREIGN KEY (idProva)
        REFERENCES Prova (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_aplicacao_turma FOREIGN KEY (idTurma)
        REFERENCES Turma (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_aplicacao_professor FOREIGN KEY (idProfessor)
        REFERENCES Usuario (id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 8. TABELA: VersaoProva (Cadernos A, B, C, D de uma Aplicação)
-- =============================================================================
CREATE TABLE VersaoProva (
    id CHAR(36) NOT NULL DEFAULT (UUID()),
    idAplicacao CHAR(36) NOT NULL,
    letraVersao CHAR(1) NOT NULL, -- 'A', 'B', 'C', 'D'
    layoutMaterializado JSON NOT NULL, -- Ordem efetiva impressa de questões/alternativas
    gabaritoOficial JSON NOT NULL, -- Respostas corretas mapeadas para este caderno
    payloadQrCode VARCHAR(255) NOT NULL, -- Identificador da versão para o app scanner
    
    PRIMARY KEY (id),
    UNIQUE KEY uq_aplicacao_versao (idAplicacao, letraVersao),
    INDEX idx_versao_aplicacao (idAplicacao),
    CONSTRAINT fk_versao_aplicacao FOREIGN KEY (idAplicacao)
        REFERENCES Aplicacao (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 9. TABELA: AtribuicaoProvaAluno (Feature 6 - Provas Com Identificação)
-- =============================================================================
CREATE TABLE AtribuicaoProvaAluno (
    id CHAR(36) NOT NULL DEFAULT (UUID()),
    idVersaoProva CHAR(36) NOT NULL,
    idAluno CHAR(36) NOT NULL,
    payloadQrCodeIndividual VARCHAR(255) NOT NULL, -- QR Code com Versão + Aluno
    
    PRIMARY KEY (id),
    UNIQUE KEY uq_atribuicao_qrcode (payloadQrCodeIndividual),
    INDEX idx_atribuicao_versao (idVersaoProva),
    INDEX idx_atribuicao_aluno (idAluno),
    CONSTRAINT fk_atribuicao_versao FOREIGN KEY (idVersaoProva)
        REFERENCES VersaoProva (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_atribuicao_aluno FOREIGN KEY (idAluno)
        REFERENCES Usuario (id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 10. TABELA: Correcao (Features 8 & 9 - Leitura Mobile e Lançamento Manual)
-- =============================================================================
CREATE TABLE Correcao (
    id CHAR(36) NOT NULL DEFAULT (UUID()),
    idVersaoProva CHAR(36) NOT NULL,
    idAluno CHAR(36) NULL, -- NULL quando prova sem identificação pendente de lançamento
    nomeManuscrito VARCHAR(150) NULL, -- Nome lido na folha física para apoio
    matriculaManuscrita VARCHAR(50) NULL, -- Matrícula anotada
    notaTotal DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    resultadosObjetivas JSON NULL, -- [{questionId, chosen, isCorrect, score}]
    notasDiscursivas JSON NULL, -- [{questionId, score}]
    atribuicaoAutomatica BOOLEAN NOT NULL DEFAULT FALSE,
    idCorrecaoCliente VARCHAR(100) NOT NULL, -- UUID gerado pelo app móvel para deduplicação
    statusSincronizacao ENUM('pending', 'synced', 'error') NOT NULL DEFAULT 'synced',
    observacoes TEXT NULL,
    dataConfirmacao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (id),
    UNIQUE KEY uq_correcao_cliente (idCorrecaoCliente), -- Garante idempotência e deduplicação
    INDEX idx_correcao_versao (idVersaoProva),
    INDEX idx_correcao_aluno (idAluno),
    CONSTRAINT fk_correcao_versao FOREIGN KEY (idVersaoProva)
        REFERENCES VersaoProva (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_correcao_aluno FOREIGN KEY (idAluno)
        REFERENCES Usuario (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
