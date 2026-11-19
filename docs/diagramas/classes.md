# Diagrama de Classes UML — SGP / Correge

Modelagem das entidades de domínio persistidas em MySQL/TiDB (`back-end/prisma/schema.prisma`) e do motor óptico OMR (`front-end/lib/omrEngine.ts` + `lib/omrScannerFlow.ts`).

```mermaid
classDiagram
      direction LR

      class Professor {
          +UUID id
          +String nomeCompleto
          +String email
          +String senhaHash
          +DateTime criadoEm
          +autenticar(email, senha) JwtToken
          +alterarSenha(senhaAtual, novaSenha) void
          +anonimizarLGPD() void
      }
      class Configuracao {
          +UUID id
          +UUID idProfessor
          +String nomeInstituicao
          +String departamento
          +Float notaMinima
          +String sensibilidadeOmr
          +Float thresholdOmr
          +Boolean autoRotacionar
      }
      class Disciplina {
          +UUID id
          +UUID idProfessor
          +String codigo
          +String nome
          +String curso
      }
      class Turma {
          +UUID id
          +UUID idProfessor
          +UUID idDisciplina
          +String nome
          +String periodoLetivo
          +String status
      }
      class Prova {
          +UUID id
          +UUID idDisciplina
          +String codigo
          +String titulo
          +String dataAplicacao
          +String duracao
          +JSON instrucoes
          +Boolean incluirBoxNota
          +JSON variacoesJson
          +gerarVersoes(n) List~VersaoProva~
      }
      class Questao {
          +UUID id
          +String idProfessor
          +String codigo
          +String tipo
          +String disciplina
          +String dificuldade
          +String enunciado
          +Char alternativaCorreta
          +Float pontuacao
          +DateTime excluidoEm
      }
      class Alternativa {
          +UUID id
          +UUID idQuestao
          +Char letra
          +String texto
          +Boolean correta
      }
      class Aluno {
          +UUID id
          +UUID idTurma
          +String nome
          +String matricula
          +String email
          +String curso
          +Int provasRealizadas
          +Float mediaGeral
      }
      class VersaoProva {
          +UUID id
          +UUID idProva
          +Char letraVersao
          +JSON layoutQuestoes
          +JSON gabaritoOficial
          +String payloadQrCode
      }
      class QrCode {
          +UUID id
          +String idAplicacao
          +String idVersaoProva
          +Char letraVersao
          +String codigoProva
          +String checksumSha256
          +validarIntegridade(payload) Boolean
      }
      class Correcao {
          +UUID id
          +UUID idVersaoProva
          +UUID idAluno
          +String nomeManuscrito
          +String matriculaManuscrita
          +Float notaTotal
          +JSON respostasLidas
          +Boolean atribuicaoAutomatica
          +Char versaoMarcada
          +DateTime dataConfirmacao
          +vincularAlunoManualmente(idAluno) void
      }
      class MotorOMR {
          +decodeQrFromCanvas(canvas) DecodedQrResult
          +validateCorregeQrRaw(raw) StrictQrValidation
          +resolveExamStrictly(qr, exams) Exam
          +analyzeAnswerSheetPixels(rgba, w, h) OmrAnalysisResult
          +gradeExamDeterministically(respostas, gabarito) GradeOutput
      }

      Professor "1" --> "0..1" Configuracao : configura
      Professor "1" --> "0..*" Disciplina : cria
      Professor "1" --> "0..*" Turma : gerencia
      Professor "1" --> "0..*" Questao : cadastra

      Disciplina "1" --> "0..*" Turma : vincula
      Disciplina "1" --> "0..*" Prova : classifica

      Turma "1" --> "0..*" Aluno : possui
      Prova "0..*" o-- "1..20" Questao : seleciona
      Prova "1" *-- "1..26" VersaoProva : gera (A-Z)
      Questao "1" *-- "2..5" Alternativa : contem

      VersaoProva "1" --> "0..*" QrCode : identifica
      VersaoProva "1" --> "0..*" Correcao : corrige
      Aluno "0..1" <-- "0..*" Correcao : atribuida a
      MotorOMR ..> VersaoProva : valida gabarito
      MotorOMR ..> Correcao : produz leitura
```
