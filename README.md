<div align="center">

# Sistema de Geração e Correção Automática de Provas (SGP / Correge)

**Plataforma web e mobile para elaboração, randomização (Cadernos A–Z), impressão A4 Duplex e correção óptica (OMR) via câmera e QR Code.**

![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma_ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white)

![Status](https://img.shields.io/badge/status-ativo-10B981?style=flat-square)
![Entrega](https://img.shields.io/badge/Católica_SC-SGP_Correge-9E0B1A?style=flat-square)

</div>

---

## Documentação Completa e Manuais

- **[Documentação Técnica Completa (`docs/DOCUMENTACAO_TECNICA.md`)](./docs/DOCUMENTACAO_TECNICA.md)** — Arquitetura Web/Mobile, autenticação JWT + bcrypt, motor de randomização Fisher-Yates, especificação dos payloads de QR Code, motor óptico nativo em TypeScript (`lib/omrEngine.ts`), validação estrita (`lib/omrScannerFlow.ts`), MER/DER e contratos da API REST.
- **[Manual do Usuário Passo a Passo (`docs/MANUAL_DO_USUARIO.md`)](./docs/MANUAL_DO_USUARIO.md)** — Guia operacional para Docentes no Desktop e no Leitor Óptico OMR pelo Smartphone.
- **[Diagrama de Classes UML (`docs/diagramas/classes.md`)](./docs/diagramas/classes.md)**
- **Diagramas de Sequência**:
  - [Gestão e Importação de Alunos](./docs/diagramas/sequencia/alunos.md)
  - [Resultados, Exportação e Correções OMR](./docs/diagramas/sequencia/resultados.md)
  - [Configurações, Segurança e LGPD](./docs/diagramas/sequencia/configuracoes.md)

---

## Equipe (Integrantes)

| Nome completo | Papel no projeto |
|---|---|
| BRUNO SCHIMIGUEL | Desenvolvedor |
| DAVI SIMPLÍCIO | Desenvolvedor |
| FELIPE SANTOS | Desenvolvedor |
| JONATAS JACKSON GONÇALVES | Desenvolvedor |
| MARIA HELOISA PEREIRA ANDRADE | Desenvolvedor |

---

## 1. Objetivo

Automatizar todo o ciclo de avaliação acadêmica para docentes que corrigem dezenas ou centenas de provas por semana: cadastro de questões, geração de múltiplos cadernos embaralhados, impressão A4 otimizada com cartão-resposta OMR, leitura real de QR Code e bolhas pela câmera (ou upload de foto) e geração de relatórios estatísticos detalhados em PDF e Excel.

## 2. Escopo Implementado (100% Dados Reais — Sem Mocks)

- **Autenticação Docente Real (JWT + bcrypt + LGPD):** Cadastro e login exclusivos para docentes (`@catolicasc.org.br`) validados diretamente na API REST e banco MySQL/TiDB, persistência e verificação de sessão no recarregamento (`/professores/me`), alteração autenticada de senha e anonimização irreversível conforme a LGPD.
- **Banco de Questões (Objetivas e Discursivas):** Cadastro, edição, filtros por disciplina/dificuldade/etiquetas e exclusão lógica (*soft-delete*).
- **Randomização (Cadernos A–Z):** Embaralhamento via *Fisher-Yates* ou *Rotação Cíclica* para ordem de questões e alternativas, preservando o gabarito individualizado de cada caderno.
- **Impressão A4 Duplex & Cartão-Resposta OMR:** Diagramação A4 com compensação automática de verso em branco, 4 marcadores fiduciais (incluindo marcador assimétrico de orientação) e QR Code institucional com `examId`, código da prova, versão do caderno e identificação nominal ou avulsa.
- **Leitura Óptica Real (OMR) e Validação Estrita de Prova:**
  - Motor de visão computacional nativo em **TypeScript puro (`lib/omrEngine.ts`)** que roda diretamente no navegador (Desktop e Mobile, inclusive offline e na Vercel, sem depender de Python instalado).
  - **Validação estrita:** se a foto não tiver QR Code, se o QR não pertencer ao Correge ou se a prova/caderno não existir no banco de dados, o leitor retorna erro explícito e **nunca** assume outra prova ou gabarito alternativo.
  - **Zero chutes:** questões sem marcação permanecem `em branco (null)`, duplas marcações/rasuras são sinalizadas em âmbar para revisão docente e imagens sem grade de bolhas legível são rejeitadas com erro claro.
  - Prévia visual anotada sobre a foto capturada (verde = marcada, âmbar = rasura/dupla marcação).
- **Relatórios e Exportações:** Média, mediana, desvio padrão, taxa de aprovação, análise de distratores por questão, atribuição manual de folhas avulsas e exportação `.xlsx` e `.pdf`.
- **Gestão de Disciplinas, Turmas e Alunos:** Cadastro manual e importação em lote via planilha Excel/CSV com modelo oficial do back-end.

## 3. Stack Tecnológica

- **Front-end Web & Mobile**: Next.js 16 (App Router / Turbopack), React 19, TypeScript 5, Tailwind CSS 4, Lucide Icons.
- **Leitor de QR Code & Motor Óptico OMR**: Motor nativo TypeScript (`lib/omrEngine.ts`: integral image imune a sombras, detecção de 4 fiduciais + homografia 3×3, detecção de bolhas circulares e contraste de núcleo interno), `jsqr`, `BarcodeDetector API`, `qrcode`.
- **Back-end API REST**: Node.js, Express, TypeScript, Prisma ORM (MySQL / TiDB Cloud), bcryptjs, JWT, PDFKit, ExcelJS.

## 4. Como Executar o Projeto

1. Instale as dependências:
   ```bash
   npm install
   ```
2. Configure `.env.local` apontando para o back-end:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
   ```
   *(Em produção ou sem back-end local, o padrão aponta para `https://back-end-coral-eta.vercel.app/api/v1`.)*
3. Execute os testes automatizados e o build de validação:
   ```bash
   npm test
   npm run build
   ```
4. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
5. Acesse `http://localhost:3000` no computador (painel docente completo e impressão A4) ou no smartphone (leitor óptico móvel pela câmera nativa).

## 5. Links do Projeto Hospedado

- **Front-end (Vercel):** https://front-end-lemon-gamma.vercel.app/
- **Back-end API (Vercel):** https://back-end-coral-eta.vercel.app/api/v1/health
