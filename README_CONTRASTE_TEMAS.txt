Correção de contraste dos temas

Arquivos principais: index.html e app.js.

O que foi ajustado:
- Tema claro agora aplica contraste também em tabelas, labels, placeholders, selects, inputs, áreas com bg-gray-700 e textos secundários.
- Tema escuro agora também recalcula texto legível caso o ADM escolha uma paleta muito clara no editor.
- Editor de Layout ganhou cores específicas para texto principal/secundário nos temas claro e escuro.
- O app calcula contraste automaticamente e, se a cor escolhida ficar ilegível, usa preto/branco legível como fallback.

Substitua principalmente index.html e app.js.
