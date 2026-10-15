# ⚙️ Diagrama de Sequência — Tela de Configurações

🔎 Passo 4C — Como Analisar e Ler o Diagrama
Regra de ouro: leia sempre de cima para baixo, como se fosse o feed de um celular.

Cenário analisado: Consulta e Atualização das Configurações do Sistema.

Atores e objetos (o elenco): no topo, os participantes na horizontal (Professor, Frontend, Servidor, BancoDeDados).
Linhas de vida (o tempo passando): as linhas tracejadas verticais que descem de cada objeto representam o tempo correndo — quanto mais abaixo, mais tarde o evento acontece.
Mensagens (os diálogos): setas horizontais mostram o pedido/ação de um objeto para o outro. Setas contínuas = envio de requisição; setas tracejadas = retorno da resposta.
Bloco alt (alternativas/decisões): representa desvios condicionais (o famoso SE/SENÃO) — a validação dos parâmetros informados (nota de corte e sensibilidade OMR), salvando no banco ou retornando erro de campos inválidos.

```mermaid
sequenceDiagram
    autonumber
    actor Professor as Professor
    participant Frontend as Frontend (Web)
    participant Servidor as Servidor (API)
    participant BancoDeDados as Banco de Dados

    %% Leitura
    Professor->>Frontend: Acessa tela de configurações
    Frontend->>Servidor: GET /configuracoes
    Servidor->>BancoDeDados: SELECT * FROM configuracoes
    BancoDeDados-->>Servidor: Retorna parâmetros institucionais e OMR
    Servidor-->>Frontend: Retorna configurações atuais
    Frontend-->>Professor: Exibe formulário preenchido

    %% Salvamento
    Professor->>Frontend: Modifica parâmetros e clica em "Salvar"
    Frontend->>Servidor: PUT /configuracoes {instituicao, notaMinima, sensibilidadeOMR}

    alt Parâmetros válidos
        Servidor->>BancoDeDados: UPDATE configuracoes SET ...
        BancoDeDados-->>Servidor: Confirma atualização
        Servidor-->>Frontend: Retorna 200 OK
        Frontend-->>Professor: Exibe toast "Configurações Salvas!"
    else Dados inconsistentes
        Servidor-->>Frontend: Retorna erro 400 Bad Request
        Frontend-->>Professor: Exibe alerta de validação nos campos
    end
```
