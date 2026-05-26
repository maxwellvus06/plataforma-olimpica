PLATAFORMA — BIBLIOTECA + FÓRUM DE MATERIAIS

O que mudou nesta versão:

1. Aba Plataforma reorganizada
- Materiais agora são filtrados e agrupados por Disciplina, Nível e Tipo de material.
- Cada material funciona como um tópico de fórum.

2. Permissão de postagem
- Administradores e Monitores podem publicar materiais.
- A permissão do nível Monitor foi ajustada para plataforma.podeGerenciar = true.

3. Registro de auditoria
- Cada material salva no Firestore:
  - criadoPor
  - criadoPorId
  - criadoPorNivel
  - criadoEm
  - atualizadoEm

4. Tipos de material
- Lista de exercícios
- Apostila
- Livro
- Videoaula
- Áudio
- Simulado
- Gabarito
- Resolução comentada
- Apresentação / Slides
- Link útil
- Outro

5. Fórum por material
- Usuários podem interagir em cada material marcando a postagem como:
  - Dúvida
  - Resolução
  - Comentário
  - Correção sugerida
- Também podem anexar imagem, útil para dúvidas, soluções e fotos de resolução.

6. Onde os dados ficam
- Os registros dos materiais ficam no Firestore:
  anos/{ANO_ATIVO}/sistema_plataforma
- Arquivos e imagens continuam sendo enviados pelo Apps Script/Google Drive já usado pela plataforma.

Arquivos principais alterados:
- index.html
- app.js
- database.js

Após subir no GitHub:
1. Substitua index.html, app.js e database.js.
2. Dê Ctrl+F5 ou teste em aba anônima.
3. Entre como ADM ou Monitor.
4. Vá na aba Plataforma.
5. Publique um material.
6. Teste uma interação no fórum do material.
