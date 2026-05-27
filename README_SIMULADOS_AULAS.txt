# Módulos adicionados: Simulados e Aulas

## Simulados
- Nova aba `Simulados`.
- ADM, Monitor e Professor/Orientador podem cadastrar simulados.
- O simulado pode ser objetivo, dissertativo ou misto.
- Aceita arquivo do simulado em PDF/Word/imagem e imagem de apoio.
- Permite registrar gabarito ou critérios de correção.
- Permite direcionar o simulado para:
  - todos;
  - nível;
  - cidades;
  - escolas;
  - alunos específicos.
- Alunos/usuários podem enviar respostas, alternativas, comentários e anexar foto/PDF/arquivo de resolução.
- O envio fica salvo no próprio simulado, com usuário, data e anexo.

Coleção usada por ano:
`anos/{ano}/sistema_simulados`

Arquivos usados no Storage:
`plataforma/{ano}/simulados/`
`plataforma/{ano}/simulados_imagens/`
`plataforma/{ano}/simulados_respostas/`

## Aulas
- Nova aba `Aulas`.
- ADM, Monitor e Professor/Orientador podem publicar aulas.
- Organização por:
  - nível;
  - disciplina;
  - playlist/trilha;
  - tema.
- Aceita aula por YouTube, link externo ou upload de vídeo para Firebase Storage.
- A visualização fica agrupada por nível/disciplina/playlist.

Coleção usada por ano:
`anos/{ano}/sistema_aulas`

Arquivos usados no Storage:
`plataforma/{ano}/aulas_videos/`

## Regras
O arquivo `firestore.rules` foi ajustado para permitir que ADM, Monitor e Professor/Orientador escrevam em:
- sistema_plataforma;
- sistema_simulados;
- sistema_aulas.

O arquivo `storage.rules` continua liberando arquivos dentro de `plataforma/` para usuários autenticados.

## Arquivos principais para subir
- index.html
- app.js
- database.js
- firestore.rules
- storage.rules
