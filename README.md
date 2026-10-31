<div align="center">

# 🚀 Sistema de Correção Automática de Provas (SGP / Correge)

**Sistema web e mobile para geração, randomização e correção automatizada de avaliações via leitura de QR Code e gabarito óptico (OMR).**

![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Python](https://img.shields.io/badge/Python_OpenCV-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)

![Status](https://img.shields.io/badge/status-ativo-10B981?style=flat-square)
![Entrega](https://img.shields.io/badge/Católica_SC-SGP_Correge-9E0B1A?style=flat-square)

</div>

---

## 📚 Documentação Completa e Manuais

- 📘 **[Documentação Técnica Completa (`docs/DOCUMENTACAO_TECNICA.md`)](./docs/DOCUMENTACAO_TECNICA.md)** — Arquitetura Web/Mobile, motor de randomização Fisher-Yates, especificação dos payloads de QR Code, pipeline óptico Python + OpenCV (`omr_scanner.py`) e contratos da API REST.
- 📖 **[Manual do Usuário Passo a Passo (`docs/MANUAL_DO_USUARIO.md`)](./docs/MANUAL_DO_USUARIO.md)** — Guia completo para Professores, Estudantes e uso do Leitor/Corretor de Provas pela câmera nativa do celular.
- 📐 **[Diagrama de Classes UML (`docs/diagramas/classes.md`)](./docs/diagramas/classes.md)**
- 🔄 **Diagramas de Sequência**:
  - [Gestão e Importação de Alunos](./docs/diagramas/sequencia/alunos.md)
  - [Resultados e Correções OMR](./docs/diagramas/sequencia/resultados.md)
  - [Configurações e LGPD](./docs/diagramas/sequencia/configuracoes.md)

---

## 👥 Equipe (Identificação dos Integrantes)

| Nome completo | Papel / principais frentes no projeto |
|---|---|
| BRUNO SCHIMIGUEL | Desenvolvedor |
| DAVI SIMPLÍCIO | Desenvolvedor |
| FELIPE SANTOS | Desenvolvedor |
| JONATAS JACKSON GONÇALVES | Desenvolvedor |
| MARIA HELOISA PEREIRA ANDRADE | Desenvolvedor |

---

## 📑 Sumário

- [1. Objetivo](#1-objetivo)
- [2. Escopo Definido](#2-escopo-definido)
- [3. Requisitos Principais](#3-requisitos-principais)
  - [3.1 Funcionais (RF)](#31-funcionais-rf)
  - [3.2 Não Funcionais (RNF)](#32-não-funcionais-rnf)
- [4. Stack Tecnológica](#4-stack-tecnológica)
- [5. Como Executar o Projeto](#5-como-executar-o-projeto)
- [6. Link do Projeto Hospedado](#6-link-do-projeto-hospedado)

---

## 1. Objetivo

O objetivo central do projeto é criar e corrigir as provas do jeito mais fácil, rápido e automatizado possível. O sistema visa resolver o problema de professores que lidam com um grande volume de provas (chegando a até 400 por semana) e precisam otimizar o tempo gasto em correções manuais. Com a automatização, espera-se agilizar a devolução das avaliações para os alunos e facilitar a análise pedagógica através de estatísticas detalhadas.

## 2. Escopo Definido

O projeto abrange o desenvolvimento de uma solução tecnológica completa para gestão de provas, englobando as seguintes etapas:
* **Autenticação Institucional e LGPD:** Login por perfil (Docente `@catolicasc.org.br` e Estudante `@catolicasc.edu.br`), tela de criação de conta (`/cadastro`), recuperação de senha em 3 etapas (`/recuperar-senha`) e anonimização LGPD.
* **Criação e Gestão de Avaliações:** Cadastro de questões objetivas e discursivas, definição de alternativas e resposta correta.
* **Randomização (Cadernos A, B, C, D):** Criação de provas individualizadas para turmas grandes, embaralhando automaticamente tanto a ordem das questões quanto a posição das alternativas.
* **Geração de Cadernos e Gabaritos A4 (Duplex):** Exportação e impressão da prova formatada em A4 (com compensação automática de verso em branco para impressão frente e verso) e folha de respostas OMR separada contendo QR Code identificador e marcadores fiduciais.
* **Leitura e Correção Automatizada via Smartphone:** Quando aberto no celular, exibe interface dedicada que aciona a **câmera nativa do smartphone** para escanear o QR Code da prova, exibir as questões do caderno correspondente e corrigir automaticamente as respostas marcadas via **Python + OpenCV**.
* **Análise de Dados e Relatórios:** Matriz de acertos/erros por questão e aluno, análise de distratores e exportação de notas.
* **Gestão de Alunos e Turmas:** Importação de alunos em lote via Excel/CSV e sorteio automático de cadernos.

## 3. Requisitos Principais

### 3.1 Funcionais (RF)

| Código | Requisito |
|---|---|
| RF01 | O sistema deve permitir a criação de um banco de questões contendo perguntas, opções de alternativas e a identificação da alternativa correta. |
| RF02 | O sistema deve embaralhar automaticamente a ordem das questões e alternativas para gerar provas únicas para cada aluno da turma. |
| RF03 | O sistema deve permitir a importação de uma lista de alunos para organizar a sala e gerar o caderno de provas com o nome correspondente. |
| RF04 | O sistema deve gerar o caderno de questões e uma folha de respostas separada contendo um QR Code para leitura. |
| RF05 | O sistema deve fornecer ferramentas para customizar o layout do caderno de provas e impressão frente e verso (duplex). |
| RF06 | O sistema deve ler o QR Code pela câmera do celular, exibir a prova correspondente e escanear as respostas assinaladas no gabarito, calculando a nota automaticamente. |
| RF07 | O sistema deve gerar estatísticas das respostas, detalhando qual alternativa foi a mais marcada em cada questão. |
| RF08 | O sistema deve permitir exportar e sincronizar as correções e relatórios de notas com o back-end acadêmico. |

### 3.2 Não Funcionais (RNF)

| Código | Requisito |
|---|---|
| RNF01 | A interface de correção de provas via smartphone deve ser ágil, abrindo diretamente a câmera nativa para leitura de QR Code e correção óptica. |
| RNF02 | O design do software deve ser minimalista, lógico e amigável para o professor, separando automaticamente a visão Desktop/Impressão A4 da visão Mobile. |

## 4. Stack Tecnológica

- **Front-end Web & Mobile**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4.
- **Motor Óptico OMR & QR Code**: Python 3.13 (`opencv-python-headless`, `numpy`, `pillow`), `jsqr`, `qrcode`.
- **Back-end API REST**: Node.js, Express, TypeScript, Prisma ORM, PDFKit.

## 5. Como Executar o Projeto

1. Clone o repositório e acesse a pasta:
   ```bash
   git clone <link-do-repositório>
   cd front-end
   ```
2. Instale as dependências do Node.js e do motor Python OpenCV:
   ```bash
   npm install
   pip install opencv-python-headless numpy pillow
   ```
3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
4. Acesse `http://localhost:3000` no computador (painel completo e impressão A4) ou pelo navegador do smartphone (leitor de QR Code e corretor óptico por câmera).

## 6. Link do Projeto Hospedado
https://front-end-lemon-gamma.vercel.app/
