# Plataforma — Ajustes consolidados + Relatórios inteligentes Etapa 1

## O que esta versão inclui

- Observação livre em resultados, no cadastro e na edição.
- Relatórios com análise local inteligente e gráficos, sem IA externa.
- Aba Reunião com gráficos de evolução e distribuição de prêmios.
- Novo nível `Staff`, com poderes equivalentes ao ADM, exceto criar/editar/excluir contas `ADM`.
- Plataforma: ADM, Staff, Monitor e Professor/Orientador podem postar/editar materiais.
- Simulados:
  - tempo em horas + minutos;
  - link público para visitantes;
  - captação de leads com nome, e-mail, cidade e WhatsApp;
  - gerador por banco de questões com múltiplos temas/subtemas;
  - distribuição por dificuldade: Fácil, Médio, Difícil, Muito difícil, Olímpica e Vestibular.
- Banco de Questões:
  - acesso restrito a ADM, Staff, Monitor e Professor/Orientador;
  - taxonomia ampla de temas e subtemas;
  - edição e exclusão de questões;
  - múltiplas soluções com texto, imagem, documento ou vídeo curto;
  - triagem local preventiva para conteúdo sexual explícito.

## Publicar regras

Publique `firestore.rules` em Firestore Database > Rules.
Publique `storage.rules` em Storage > Rules.

## Arquivos principais

Substitua no GitHub:

- `index.html`
- `app.js`
- `database.js`

E atualize as regras do Firebase.
