# Ajustes — Simulados

## Corrigido

1. **Hardcore real**
   - O checkbox agora é lido antes do reset do formulário.
   - O simulado salva `hardcore`, `modoHardcore` e `telaCheiaObrigatoria` de forma consistente.
   - Link público mostra claramente se o simulado é normal ou Hardcore.

2. **Link público com dissertativas**
   - Simulados públicos agora exibem campos dissertativos por questão.
   - Ao finalizar com dissertativas pendentes, aparece aviso interno da plataforma.
   - As respostas dissertativas ficam salvas em `respostasDissertativas` junto ao envio público.

3. **Filtros de simulados**
   - Adicionados filtros avançados:
     - Janela: aberto, futuro, encerrado.
     - Envios: com envios, sem envios.
     - Acesso: público, interno.
     - Hardcore: Hardcore, normal.
     - Correção: automática, manual, pendente, corrigida.
   - Mantidos filtros já existentes: disciplina, nível, formato, status e busca.

## Arquivos principais

Substituir principalmente:

- `app.js`
- `index.html`

Não houve necessidade de alterar regras do Firebase nesta etapa.
