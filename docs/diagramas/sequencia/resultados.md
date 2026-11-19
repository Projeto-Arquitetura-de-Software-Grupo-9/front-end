# Diagrama de Sequência — Correção OMR, Resultados e Exportação

Cenários cobertos: leitura óptica estrita (QR Code + OMR nativo sem chutes), persistência de correção (`POST /api/v1/correcoes`), consulta de estatísticas consolidadas (`GET /api/v1/exams/:id/results`) e exportação oficial em Excel/PDF.

```mermaid
sequenceDiagram
    autonumber
    actor Professor as Professor
    participant Frontend as Front-end (Scanner + Resultados)
    participant OMR as Motor OMR Nativo (TypeScript)
    participant API as Back-end API REST (/api/v1)
    participant DB as Banco MySQL / TiDB (Prisma)

    %% Leitura Óptica & Validação Estrita
    Professor->>Frontend: Fotografa ou envia Cartão-Resposta OMR
    Frontend->>OMR: decodeQrFromCanvas + validateCorregeQrRaw
    OMR->>API: GET /api/v1/exams (se prova não estiver em cache local)
    API->>DB: SELECT provas e versoes_prova
    DB-->>API: Provas cadastradas
    API-->>OMR: Lista de provas reais

    alt QR ausente, não institucional ou prova não encontrada
        OMR-->>Frontend: Erro explícito (EXAM_NOT_FOUND / INVALID_QR)
        Frontend-->>Professor: Exibe alerta e permanece na captura (sem fallback)
    else Prova e Caderno confirmados
        OMR->>OMR: analyzeAnswerSheetPixels (Homografia + Integral Image)
        alt Grade de bolhas ilegível
            OMR-->>Frontend: sheetDetected = false (zero chutes)
            Frontend-->>Professor: Solicita reenquadramento do cartão-resposta
        else Bolhas lidas (marcadas, brancos=null, rasuras sinalizadas)
            OMR-->>Frontend: Prévia anotada + respostas detectadas
            Professor->>Frontend: Confirma leitura e clica em "Salvar Correção"
            Frontend->>API: POST /api/v1/correcoes { idVersaoProva, idAluno, notaTotal, respostasLidas }
            API->>DB: INSERT INTO correcoes (...)
            DB-->>API: Correção salva
            API-->>Frontend: 201 Created
        end
    end

    %% Relatório Consolidado e Exportações
    Professor->>Frontend: Acessa tela de Resultados (/resultados)
    Frontend->>API: GET /api/v1/exams/:id/results
    API->>DB: Agrega correcoes, versoes_prova e alunos
    DB-->>API: Dados reais consolidados
    API-->>Frontend: 200 OK { media, mediana, desvioPadrao, matriz, distratores }
    Frontend-->>Professor: Exibe KPIs, gráficos e tabela de estudantes

    Professor->>Frontend: Clica em "Exportar Excel" ou "Exportar PDF"
    Frontend->>API: GET /api/v1/exams/:id/results/export.xlsx (ou /export.pdf)
    alt Geração concluída
        API-->>Frontend: Binário .xlsx (ExcelJS) ou .pdf (PDFKit)
        Frontend-->>Professor: Inicia download do arquivo
    else Erro ou ausência de dados
        API-->>Frontend: 404 / 500 { error }
        Frontend-->>Professor: Exibe mensagem de aviso
    end
```
