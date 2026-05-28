# Ajuste — Simulados em tela cheia controlada

## O que foi feito

- Ao iniciar simulado logado, o sistema tenta ativar tela cheia.
- Ao iniciar simulado público, primeiro pede os dados do visitante e só depois abre a prova em tela cheia.
- Se o aluno sair da tela cheia, trocar de aba, minimizar ou abandonar o ambiente, o sistema tenta encerrar automaticamente a prova e salvar o que estiver respondido.
- Ao finalizar normalmente, sai da tela cheia e registra o envio.
- Link público mantém bloqueio por dispositivo após envio.

## Observação técnica importante

Navegador nenhum permite impedir 100% Alt+Tab, minimizar, fechar aba ou trocar de janela. O que foi implementado é o máximo viável em site comum: tela cheia via Fullscreen API + detecção de saída/foco/visibilidade + encerramento automático.
