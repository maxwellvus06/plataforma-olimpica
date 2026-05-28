# Plataforma — atividades em contexto interno + avaliações

Alterações feitas em cima da base estável mais recente:

## 1. Atividades abrem dentro da plataforma
- Materiais da aba Plataforma agora abrem em um modal/contexto interno.
- PDF, imagem, vídeo, áudio, YouTube e documentos Office tentam abrir dentro da própria plataforma.
- Links externos continuam podendo abrir em nova aba, mas dentro do contexto aparece o botão de acesso.

## 2. Janela da atividade mais completa
A janela interna da atividade mostra:
- mídia/arquivo/vídeo;
- descrição/orientação;
- gabarito/resolução quando houver;
- progresso “feito/fazer”;
- fórum de comentários/dúvidas/resoluções;
- avaliação por estrelas.

## 3. Avaliação de 0 a 5 estrelas
- Cada usuário pode avaliar cada atividade de 0 a 5.
- O card principal mostra média e quantidade de avaliações.
- O usuário pode atualizar sua própria nota.

## 4. ADM e Staff veem detalhes das avaliações
Dentro da janela da atividade, ADM e Staff veem uma área com:
- usuário que avaliou;
- nível do usuário;
- nota dada;
- data/hora da avaliação.

## 5. Staff
O `database.js` foi ajustado para reconhecer o nível Staff na tabela de permissões, caso seu banco já tenha usuários com esse nível.

## Arquivos principais
- `index.html`
- `app.js`
- `database.js`

Não foram alteradas as rules nesta etapa.
