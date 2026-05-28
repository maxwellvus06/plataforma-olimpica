# Ajustes aplicados

Base usada: os arquivos atuais enviados pelo Maxwell (`index(71).html`, `app(71).js`, `database(56).js`).

## Corrigido

1. **Mídias dentro da plataforma**
   - Criado visualizador interno para PDF, Word/Office, imagem, vídeo, áudio, YouTube e links.
   - Botões de mídia deixam de abrir direto em nova aba sempre que possível.

2. **Aulas com ambiente próprio**
   - Botão “Abrir ambiente da aula”.
   - Mostra mídia, descrição/roteiro e comentários da aula dentro da plataforma.

3. **Painéis retráteis corretos**
   - Recolhe painéis grandes de cadastro/importação, não os cards de conteúdo.
   - Exemplos: cadastrar simulado, gerador pelo banco, publicar material, organizar aula, adicionar evento manual e importar via Excel.

4. **Calendário com data início e data final**
   - Cadastro manual agora tem data início e data final.
   - Importação XLSX aceita colunas `DATA INÍCIO` e `DATA FIM`.
   - Modelo XLSX foi atualizado com essas colunas.

## Arquivos principais

- `index.html`
- `app.js`
- `database.js`

Não houve alteração em Firestore Rules nem Storage Rules nesta etapa.
