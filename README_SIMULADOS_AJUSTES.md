# Ajustes de Simulados — base estável

Esta versão parte dos arquivos de rollback enviados pelo Maxwell:

- `index(71).html`
- `app(71).js`
- `database(56).js`

## Ajustes feitos

1. **Link público visível no card do simulado**
   - Se o simulado estiver marcado como público, o card passa a exibir:
     - link completo;
     - botão **Copiar**;
     - botão **Abrir**.

2. **Edição do simulado até o início**
   - ADM, Staff, Monitor e Professor/Orientador podem editar o simulado enquanto ele ainda não chegou na data/hora de início.
   - Após iniciar, a edição fica bloqueada para preservar ranking, envios e histórico.

3. **Pré-visualização sem registrar tentativa**
   - ADM, Staff, Monitor e Professor/Orientador podem abrir o ambiente do simulado quantas vezes quiserem em modo prévia.
   - Esse modo não cria envio e não conta como tentativa.

4. **Questões manuais com mídias**
   - Questões manuais agora aceitam múltiplas mídias:
     - imagens;
     - PDFs;
     - DOC/DOCX.
   - As mídias aparecem junto do enunciado no ambiente de simulado.

## Arquivos principais

Substituir no GitHub:

- `index.html`
- `app.js`
- `database.js`

As regras do Firestore/Storage não foram alteradas nesta versão.
