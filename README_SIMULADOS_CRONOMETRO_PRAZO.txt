VERSÃO — SIMULADOS COM AMBIENTE CRONOMETRADO E GABARITO PÓS-PRAZO

O QUE FOI ALTERADO

1. Gabarito e resolução só aparecem para alunos após o prazo final do simulado.
   - ADM, Monitor e Professor/Orientador continuam podendo visualizar sempre.
   - Aluno vê um aviso de bloqueio até o prazo encerrar.

2. O aluno não responde mais o simulado direto no card da listagem.
   - Agora ele clica em "Entrar no simulado".
   - Antes de iniciar, aparece um aviso explicando o ambiente cronometrado.
   - O aluno precisa clicar em "Iniciar simulado".

3. Ambiente cronometrado.
   - Exibe o arquivo do simulado na própria tela.
   - Exibe imagem de apoio, se existir.
   - Exibe instruções.
   - Exibe cartão-resposta objetivo quando houver gabarito cadastrado.
   - Permite resposta textual e anexo de resolução.
   - Mostra cronômetro regressivo quando houver duração definida.
   - Se não houver duração definida, mostra tempo decorrido.

4. Encerramento.
   - Ao clicar em finalizar, as respostas são enviadas para sistema_simulados_envios.
   - Ao tentar sair do ambiente após iniciar, o sistema avisa que o simulado será encerrado e enviado com o que estiver marcado.
   - Se o tempo acabar, o envio é finalizado automaticamente.

ARQUIVOS PRINCIPAIS
- index.html
- app.js

REGRAS
Mantidas as regras de Firestore/Storage da versão anterior, com envios de simulados em coleção própria:
anos/{ano}/sistema_simulados_envios
