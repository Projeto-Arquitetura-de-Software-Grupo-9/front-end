# 📊 Diagrama de Sequência — Tela de Resultados

🔎 Passo 4A — Como Analisar e Ler o Diagrama
Regra de ouro: leia sempre de cima para baixo, como se fosse o feed de um celular.

Cenário analisado: Consulta de Desempenho da Prova e Exportação em Excel.

Atores e objetos (o elenco): no topo, os participantes na horizontal (Professor, Frontend, Servidor, BancoDeDados).
Linhas de vida (o tempo passando): as linhas tracejadas verticais que descem de cada objeto representam o tempo correndo — quanto mais abaixo, mais tarde o evento acontece.
Mensagens (os diálogos): setas horizontais mostram o pedido/ação de um objeto para o outro. Setas contínuas = envio de requisição; setas tracejadas = retorno da resposta.
Bloco alt (alternativas/decisões): representa desvios condicionais (o famoso SE/SENÃO) — a geração bem-sucedida do arquivo Excel para download versus a falha na compilação da planilha.

```mermaid
sequenceDiagram
    autonumber
    actor Professor as Professor
    participant Frontend as Frontend (Web)
    participant Servidor as Servidor (API)
    participant BancoDeDados as Banco de Dados

    %% Carregamento
    Professor->>Frontend: Acessa tela de resultados da prova
    Frontend->>Servidor: GET /resultados/{id}
    Servidor->>BancoDeDados: Consulta gabarito, notas e respostas
    BancoDeDados-->>Servidor: Retorna dados consolidados
    Servidor-->>Frontend: Retorna médias, matriz e frequências
    Frontend-->>Professor: Exibe KPIs, tabela e gráficos

    %% Exportação
    Professor->>Frontend: Clica em "Exportar Excel"
    Frontend->>Servidor: POST /exportar-excel {id}
    
    alt Geração com sucesso
        Servidor-->>Frontend: Envia arquivo .xlsx
        Frontend-->>Professor: Inicia download da planilha
    else Falha na geração
        Servidor-->>Frontend: Retorna erro 500
        Frontend-->>Professor: Exibe aviso de falha
    end
```
