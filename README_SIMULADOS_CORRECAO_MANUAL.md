# Ajuste — Simulados com correção manual

## O que foi implementado

1. Simulados dissertativos e mistos agora têm painel de correção manual por aluno.
2. O corretor pode abrir cada envio, ver as respostas, anexos, tempo de prova e presença.
3. Cada questão dissertativa tem nota de 0 a 10 e comentário individual do corretor.
4. Objetivas continuam com correção automática por gabarito.
5. O painel de ranking virou também painel de presença, respostas, tempo e correção.
6. Exportação CSV agora leva presença, tempo, respostas e status de correção.

## Permissão

ADM, Staff, Gestor, Monitor e Professor/Orientador podem acessar o painel.

## Arquivos principais

Substituir principalmente:

- `app.js`
- `index.html`

As rules foram mantidas junto no pacote, mas este ajuste não exige mudança obrigatória nas regras se suas regras atuais já permitem leitura/escrita em `sistema_simulados_envios` para equipe pedagógica.
