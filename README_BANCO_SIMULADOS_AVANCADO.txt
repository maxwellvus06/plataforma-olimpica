ALTERAÇÕES PRINCIPAIS

1. Banco de Questões restrito
- A aba Banco de Questões agora deve aparecer apenas para ADM, Monitor e Professor/Orientador.
- As rules também restringem leitura/escrita de sistema_questoes/sistema_banco_questoes para equipe pedagógica.

2. Cadastro de questões ampliado
- Questões com metadados: disciplina, nível, tema, subtema, dificuldade, tipo, fonte/olimpíada, ano, alternativa correta, tags, enunciado e múltiplos arquivos.
- Questões podem ter múltiplas soluções.
- ADM, Monitor e Professor/Orientador podem adicionar soluções complementares.

3. Gerador de simulados pelo Banco de Questões
- Na aba Simulados, equipe pedagógica pode gerar simulado filtrando questões por disciplina, nível, dificuldade, tema e quantidade.
- O simulado gerado leva as questões para o ambiente cronometrado e monta o gabarito objetivo a partir da alternativa correta cadastrada.

4. Ambiente do simulado mais legível
- A área de visualização ficou maior.
- Quando o simulado é gerado pelo banco de questões, as questões aparecem diretamente na tela.
- No ambiente de simulado, seleção, cópia, recorte e menu de contexto são bloqueados pela interface.
- Observação: PDF aberto dentro do visualizador do navegador pode ter limitações técnicas; a proteção reduz cópia pela interface, mas não é DRM.

5. Login
- Campo de senha agora tem botão para mostrar/ocultar senha.

ARQUIVOS A SUBSTITUIR
- index.html
- app.js
- database.js
- firestore.rules
- storage.rules

IMPORTANTE
Publique firestore.rules em Firestore Database > Rules.
Publique storage.rules em Storage > Rules.
