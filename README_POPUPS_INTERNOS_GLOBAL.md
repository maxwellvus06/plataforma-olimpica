# Popups internos globais

Ajuste feito sobre a versão `plataforma-simulados-hardcore-modal-fix`.

## O que mudou

1. Os avisos e erros que usavam `alert()` do navegador agora aparecem como modal interno da plataforma.
2. O modal interno foi criado diretamente pelo `app.js`, sem depender de biblioteca externa.
3. No ambiente de simulados, os avisos críticos de saída, respostas pendentes e publicação sem gabarito/anexo usam confirmação interna da plataforma.
4. O ajuste evita que avisos do navegador derrubem a experiência de tela cheia nos simulados hardcore.

## Arquivos principais

- `app.js`
- `index.html`
- `database.js`

## Observação

As mensagens de aviso/erro deixam de usar popup nativo. Algumas confirmações administrativas antigas ainda podem ser convertidas por módulo nas próximas etapas, mas o núcleo de avisos globais e o ambiente de simulado já ficaram internos.
