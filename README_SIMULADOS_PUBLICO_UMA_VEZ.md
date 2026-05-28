# Ajuste — Simulado público uma vez por dispositivo

## O que foi corrigido

1. Link público agora fica limitado a uma tentativa por dispositivo/navegador.
2. Após enviar, a tela vira uma página fixa de agradecimento.
3. Se abrir o mesmo link de novo no mesmo dispositivo, aparece bloqueio informando que já foi realizado.
4. Pontuação do aluno logado não aparece no card imediatamente após envio; só aparece quando o prazo do simulado terminar.

## Observação técnica

O bloqueio por dispositivo usa `localStorage`. Isso dificulta repetição comum no mesmo aparelho/navegador, mas não é uma autenticação forte contra aba anônima, outro navegador ou outro aparelho.
