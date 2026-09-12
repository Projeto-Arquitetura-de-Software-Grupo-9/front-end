<div align="center">

# 🚀 Sistema de Correção Automática de Provas

**Sistema web e mobile para geração, randomização e correção automatizada de avaliações via leitura de QR Code e gabarito.**

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white)

![Status](https://img.shields.io/badge/status-em%20desenvolvimento-F5A623?style=flat-square)
![Entrega](https://img.shields.io/badge/entrega%20atual-N1-3D348B?style=flat-square)

</div>

## 👥 Equipe (Identificação dos Integrantes)

| Nome completo | Papel / principais frentes no projeto |
|---|---|
| BRUNO SCHIMIGUEL | Desenvolvedor |
| DAVI SIMPLÍCIO | Desenvolvedor |
| FELIPE SANTOS | Desenvolvedor |
| JONATAS JACKSON GONÇALVES | Desenvolvedor |
| MARIA HELOISA PEREIRA ANDRADE | Desenvolvedor |

## 📑 Sumário

- [1. Objetivo](#1-objetivo)
- [2. Escopo Definido](#2-escopo-definido)
- [3. Requisitos Principais](#3-requisitos-principais)
  - [3.1 Funcionais (RF)](#31-funcionais-rf)
  - [3.2 Não Funcionais (RNF)](#32-não-funcionais-rnf)
- [4. Stack Tecnológica](#4-stack-tecnológica)
- [5. Como Executar o Projeto](#5-como-executar-o-projeto)
- [6. Equipe e Contribuições](#6-equipe-e-contribuições)

---

## 1. Objetivo

O objetivo central do projeto é criar e corrigir as provas do jeito mais fácil, rápido e automatizado possível. O sistema visa resolver o problema de professores que lidam com um grande volume de provas (chegando a até 400 por semana) e precisam otimizar o tempo gasto em correções manuais. Com a automatização, espera-se agilizar a devolução das avaliações para os alunos e facilitar a análise pedagógica através de estatísticas detalhadas.

## 2. Escopo Definido

O projeto abrange o desenvolvimento de uma solução tecnológica completa para gestão de provas, englobando as seguintes etapas:
* **Criação e Gestão de Avaliações:** O sistema permitirá cadastrar questões, definir alternativas e assinalar a resposta correta.
* **Randomização:** Será possível criar provas individualizadas para turmas grandes, onde o sistema embaralhará automaticamente tanto a ordem das questões quanto a posição das alternativas, dificultando fraudes durante a aplicação.
* **Geração de Cadernos e Gabaritos:** O escopo inclui a exportação da prova formatada com layout editável (evitando o corte de questões entre páginas) e a geração de uma folha de respostas separada contendo um QR Code identificador.
* **Leitura Automatizada:** O sistema será capaz de escanear o QR Code da prova juntamente com o gabarito preenchido pelo aluno para realizar a correção instantânea.
* **Análise de Dados e Relatórios:** A aplicação retornará uma matriz de "pergunta X aluno" indicando acertos, erros e qual alternativa foi escolhida. Além disso, analisará as alternativas mais assinaladas e gerará um relatório de notas exportável em Excel para lançamento em sistemas acadêmicos.
* **Gestão de Alunos:** Inclusão de funcionalidade para importar a lista de alunos e atribuir uma prova específica a cada um.

## 3. Requisitos Principais

### 3.1 Funcionais (RF)

| Código | Requisito |
|---|---|
| RF01 | O sistema deve permitir a criação de um banco de questões contendo perguntas, opções de alternativas e a identificação da alternativa correta. |
| RF02 | O sistema deve embaralhar automaticamente a ordem das questões e alternativas para gerar provas únicas para cada aluno da turma. |
| RF03 | O sistema deve permitir a importação de uma lista de alunos para organizar a sala e gerar o caderno de provas com o nome correspondente. |
| RF04 | O sistema deve gerar o caderno de questões e uma folha de respostas separada contendo um QR Code para leitura. |
| RF05 | O sistema deve fornecer ferramentas para customizar o layout do caderno de provas (por exemplo, mover questões para evitar cortes de formatação). |
| RF06 | O sistema deve ler o QR Code e escanear as respostas assinaladas no gabarito, calculando a nota automaticamente. |
| RF07 | O sistema deve gerar estatísticas das respostas, detalhando qual alternativa foi a mais marcada em cada questão. |
| RF08 | O sistema deve gerar um arquivo Excel contendo as correções e relatórios de notas prontos para serem exportados e lançados no sistema acadêmico. |

### 3.2 Não Funcionais (RNF)

| Código | Requisito |
|---|---|
| RNF01 | A interface de correção de provas via aplicativo deve ser ágil, permitindo a leitura e avaliação de 50 alunos em cerca de 30 minutos. |
| RNF02 | O design do software deve ser minimalista, com poucos elementos visuais em tela, focando em ser lógico e amigável para o professor. |

## 4. Stack Tecnológica

![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=flat-square&logo=mysql&logoColor=white)

- **Node.js**: ambiente de execução do back-end.
- **Express**: framework para as rotas e a API REST.
- **MySQL**: banco de dados relacional.

## 5. Como Executar o Projeto

1. `git clone <link-do-repositório>`
2. `cd nome-do-projeto`
3. `npm install`
4. Copiar `.env.example` para `.env` e configurar as variáveis de ambiente (ex.: credenciais do MySQL).
5. `npm run dev`

## 6. Equipe e Contribuições

- **BRUNO SCHIMIGUEL**: Desenvolvimento e documentação.
- **DAVI SIMPLÍCIO**: Desenvolvimento e documentação.
- **FELIPE SANTOS**: Desenvolvimento e documentação.
- **JONATAS JACKSON GONÇALVES**: Desenvolvimento e documentação.
- **MARIA HELOISA PEREIRA ANDRADE**: Desenvolvimento e documentação.
