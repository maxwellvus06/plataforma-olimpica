# Ajustes do módulo Simulados

- Corrige erro `anoSelecionado is not defined`, usando o ano ativo da plataforma (`anoDadosAtivo`).
- ADM, Staff, Monitor e Professor/Orientador podem pré-visualizar, editar e apagar simulados.
- Simulado com link público exibe botões de copiar/abrir link para a equipe.
- Link público exige: nome completo, escola de origem, cidade, e-mail e WhatsApp.
- Respostas públicas ficam em `sistema_simulados_envios` e leads em `sistema_simulados_leads`.
- Aluno só enxerga o simulado quando faltar até 6 horas para o início.
- Ambiente interno cronometrado com aviso antes de iniciar e confirmação ao sair/concluir com pendências.
- Questões dissertativas não exigem gabarito objetivo e permitem anexo de resolução no ambiente.
