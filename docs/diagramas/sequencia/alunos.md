# 👥 Diagrama de Sequência — Tela de Alunos

🔎 Passo 4B — Como Analisar e Ler o Diagrama
Regra de ouro: leia sempre de cima para baixo, como se fosse o feed de um celular.

Cenário analisado: Listagem e Cadastro de Novo Aluno.

Atores e objetos (o elenco): no topo, os participantes na horizontal (Professor, Frontend, Servidor, BancoDeDados).
Linhas de vida (o tempo passando): as linhas tracejadas verticais que descem de cada objeto representam o tempo correndo — quanto mais abaixo, mais tarde o evento acontece.
Mensagens (os diálogos): setas horizontais mostram o pedido/ação de um objeto para o outro. Setas contínuas = envio de requisição; setas tracejadas = retorno da resposta.
Bloco alt (alternativas/decisões): representa desvios condicionais (o famoso SE/SENÃO) — a validação de matrícula única no banco, confirmando a inserção ou acusando duplicidade.

```mermaid
sequenceDiagram
    autonumber
    actor Professor as Professor
    participant Frontend as Frontend (Web)
    participant Servidor as Servidor (API)
    participant BancoDeDados as Banco de Dados

    %% Listagem
    Professor->>Frontend: Acessa tela de alunos
    Frontend->>Servidor: GET /alunos
    Servidor->>BancoDeDados: SELECT * FROM alunos
    BancoDeDados-->>Servidor: Retorna lista de alunos
    Servidor-->>Frontend: Retorna dados dos alunos
    Frontend-->>Professor: Exibe tabela de alunos cadastrados

    %% Cadastro
    Professor->>Frontend: Preenche formulário e clica em "Cadastrar"
    Frontend->>Servidor: POST /alunos {nome, matricula, turma}
    Servidor->>BancoDeDados: Verifica duplicidade de matrícula

    alt Matrícula disponível
        Servidor->>BancoDeDados: INSERT INTO alunos (...)
        BancoDeDados-->>Servidor: Confirma inserção
        Servidor-->>Frontend: Retorna 201 Created
        Frontend-->>Professor: Exibe mensagem de sucesso e atualiza tabela
    else Matrícula já existente
        BancoDeDados-->>Servidor: Matrícula duplicada
        Servidor-->>Frontend: Retorna erro 409 Conflict
        Frontend-->>Professor: Exibe alerta "Matrícula já cadastrada"
    end
```
