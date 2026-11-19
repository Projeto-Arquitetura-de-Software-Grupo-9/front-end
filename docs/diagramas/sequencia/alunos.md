# Diagrama de Sequência — Gestão e Importação de Alunos

Cenários cobertos: listagem autenticada, cadastro individual com verificação de matrícula única e importação em lote via Excel/CSV (`/api/v1/students`).

```mermaid
sequenceDiagram
    autonumber
    actor Professor as Professor
    participant Frontend as Front-end (Web)
    participant API as Back-end API REST (/api/v1)
    participant DB as Banco MySQL / TiDB (Prisma)

    %% Listagem
    Professor->>Frontend: Acessa tela de Alunos (/alunos)
    Frontend->>API: GET /api/v1/students (Bearer JWT)
    API->>DB: SELECT * FROM alunos ORDER BY criado_em DESC
    DB-->>API: Lista de registros reais
    API-->>Frontend: 200 OK { data: Student[] }
    Frontend-->>Professor: Exibe tabela de estudantes

    %% Cadastro Individual
    Professor->>Frontend: Preenche formulário e clica em "Salvar"
    Frontend->>API: POST /api/v1/students { name, registration, email, course, classGroup }
    API->>DB: Verifica duplicidade por matrícula (registration)

    alt Matrícula disponível
        API->>DB: INSERT INTO alunos (...)
        DB-->>API: Registro persistido com UUID
        API-->>Frontend: 201 Created { data: Student }
        Frontend-->>Professor: Sincroniza UUID e exibe sucesso
    else Matrícula duplicada ou inválida
        API-->>Frontend: 400 / 409 { error: "..." }
        Frontend-->>Professor: Exibe alerta de erro
    end

    %% Importação Excel/CSV
    Professor->>Frontend: Seleciona arquivo .xlsx / .csv no modal de importação
    Frontend->>API: POST /api/v1/students/import (multipart/form-data)
    API->>API: Valida colunas obrigatórias via ExcelJS
    API->>DB: Persiste registros válidos ignorando duplicatas
    DB-->>API: Contagem de importados e ignorados
    API-->>Frontend: 200 OK { importedCount, skippedCount, errors }
    Frontend-->>Professor: Atualiza lista de alunos com resumo da importação
```
