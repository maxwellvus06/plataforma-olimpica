# Ajustes consolidados

Inclui:

- Moderação preventiva local para textos de materiais, comentários, questões, soluções e simulados.
- Explicação e reforço do botão **Gerar peça** em Relatórios.
- Gráficos adicionais em Relatórios e na peça gerada.
- Simulados com data + horário de abertura e encerramento.
- Simulados com tempo em horas e minutos.
- Questões manuais dentro do cadastro de simulado, além do upload de arquivo.
- Gerador de simulados com múltiplos temas/subtemas e distribuição controlada por dificuldade.
- Contador que impede distribuir mais questões do que o total.
- Geração de link público para simulado, inclusive simulados criados pelo Banco de Questões.
- Leads de visitantes salvos em `sistema_simulados_leads`.
- Banco de Questões com taxonomia ampliada de temas/subtemas e sugestões via datalist.
- Aviso antigo de Firebase na Monitoria ocultado.

Publique também o `firestore.rules`, pois ele libera `sistema_questoes`, `sistema_simulados_envios` e `sistema_simulados_leads` com as permissões corretas.
