# Simulados — gabarito objetivo, resposta na plataforma e ranking

Alterações principais:

1. Cadastro de simulado
- Adicionado campo "Questões objetivas".
- Botão "Gerar gabarito" cria grade rápida A/B/C/D/E por questão.
- O gabarito objetivo é salvo em `gabaritoObjetivo`.
- O campo antigo "Gabarito / Chave" continua como critérios/observações, útil para discursivas e mistos.

2. Resposta do aluno
- Para simulados objetivos ou mistos com gabarito preenchido, o aluno responde diretamente na plataforma por cartão-resposta.
- Continua aceitando texto livre e arquivo/foto de resolução.
- O sistema calcula automaticamente:
  - acertos
  - total de questões objetivas
  - questões respondidas
  - percentual

3. Ranking e relatórios
- Administradores, monitores e professores/orientadores veem ranking por simulado.
- Cada card de simulado exibe ranking/resumo de envios.
- Adicionado painel de ranking com seleção de simulado e exportação CSV.

4. Dados salvos no Firestore
Cada envio passa a registrar:
- respostasObjetivas
- acertos
- totalObjetivas
- respondidasObjetivas
- percentual
- alunoId
- alunoNome
- escolaId
- escolaNome
- arquivoUrl, quando houver anexo

Substitua principalmente:
- index.html
- app.js

Pode subir o pacote inteiro para manter tudo alinhado.
