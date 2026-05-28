# Ajustes — mídias internas, itens retráteis e soluções avançadas

Base usada: arquivos atuais estáveis enviados pelo usuário + ajustes recentes de simulado.

## Alterações principais

1. **Mídias dentro da própria plataforma**
   - PDFs, imagens, vídeos, áudios, arquivos Office e YouTube passam a abrir em um visualizador interno.
   - Links de mídia com `target=_blank` são interceptados e exibidos no modal da plataforma.
   - Há botão de baixar no visualizador para caso o navegador não consiga incorporar o arquivo.

2. **Itens retráteis/expansíveis**
   - Cards de Plataforma, Simulados, Aulas e Banco de Questões ficam mais compactos.
   - O usuário clica no cabeçalho do card para abrir/recolher.
   - A ideia é reduzir rolagem e deixar as telas mais limpas.

3. **Soluções do Banco de Questões mais sofisticadas**
   - Substitui o prompt simples por um modal maior.
   - Permite adicionar:
     - texto/comentário;
     - link de vídeo;
     - imagens;
     - PDF;
     - DOC/DOCX;
     - PPT/PPTX;
     - áudio;
     - vídeo curto.
   - As mídias das soluções abrem no visualizador interno.

## Arquivos para substituir

- `index.html`
- `app.js`
- `database.js`

Não houve necessidade de alterar Rules nessa etapa.
