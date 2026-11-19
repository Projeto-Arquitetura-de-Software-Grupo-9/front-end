# Diagrama de Sequência — Configurações, Senha e Anonimização LGPD

Cenários cobertos: carregamento e salvamento de preferências institucionais/OMR (`/api/v1/settings`), alteração autenticada de senha (`PUT /api/v1/professores/me/password`) e anonimização irreversível conforme LGPD (`POST /api/v1/professores/me/anonymize`).

```mermaid
sequenceDiagram
    autonumber
    actor Professor as Professor
    participant Frontend as Front-end (/configuracoes)
    participant API as Back-end API REST (/api/v1)
    participant DB as Banco MySQL / TiDB (Prisma)

    %% Carregamento de Configurações
    Professor->>Frontend: Acessa tela de Configurações
    Frontend->>API: GET /api/v1/settings?teacherId={id} (Bearer JWT)
    API->>DB: SELECT * FROM configuracoes WHERE id_professor = ?
    DB-->>API: Parâmetros institucionais e OMR
    API-->>Frontend: 200 OK { data: Settings }
    Frontend-->>Professor: Renderiza formulário preenchido

    %% Atualização de Configurações
    Professor->>Frontend: Altera parâmetros e clica em "Salvar Configurações"
    Frontend->>API: PUT /api/v1/settings?teacherId={id}
    alt Parâmetros válidos (notaMinima 0..10, threshold válido)
        API->>DB: UPSERT configuracoes
        DB-->>API: Registro atualizado
        API-->>Frontend: 200 OK
        Frontend-->>Professor: Exibe confirmação "Configurações Salvas!"
    else Campos inválidos
        API-->>Frontend: 400 Bad Request
        Frontend-->>Professor: Exibe erro de validação
    end

    %% Alteração de Senha Autenticada
    Professor->>Frontend: Informa senha atual e nova senha
    Frontend->>API: PUT /api/v1/professores/me/password (Bearer JWT)
    API->>DB: Busca hash bcrypt atual do professor
    alt Senha atual confere
        API->>DB: UPDATE professores SET senha_hash = bcrypt(novaSenha)
        API-->>Frontend: 200 OK
        Frontend-->>Professor: Exibe "Senha Atualizada!"
    else Senha atual incorreta
        API-->>Frontend: 401 Unauthorized
        Frontend-->>Professor: Exibe erro de credencial
    end

    %% Anonimização LGPD
    Professor->>Frontend: Confirma "Anonimizar Minha Conta"
    Frontend->>API: POST /api/v1/professores/me/anonymize (Bearer JWT)
    API->>DB: Anonimiza nome/e-mail e trava senha mantendo provas e notas
    DB-->>API: Confirma anonimização
    API-->>Frontend: 200 OK
    Frontend-->>Professor: Encerra sessão JWT e redireciona ao Login
```
