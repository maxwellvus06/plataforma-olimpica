# Fix — Simulado público com cronômetro real

Ajustes feitos:

1. O simulado público agora exibe cronômetro visível no topo da prova.
2. O cronômetro começa no clique em “Iniciar simulado”.
3. O envio público salva:
   - `iniciadoEm`
   - `enviadoEm`
   - `encerradoEm`
   - `tempoGastoSegundos`
   - `tempoGastoTexto`
4. Se houver duração definida, mostra tempo restante e encerra automaticamente ao zerar.
5. Se não houver duração definida, mostra tempo decorrido.
6. Funciona em modo normal e em modo Hardcore.

Substitua principalmente `app.js`.
