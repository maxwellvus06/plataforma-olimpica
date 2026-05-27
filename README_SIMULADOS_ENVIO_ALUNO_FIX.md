# Correção — aluno enviando resposta de simulado

O problema era que o aluno, ao enviar resposta, tentava salvar a coleção inteira `app_simulados` / `sistema_simulados`.

Com Firestore Rules seguras, isso é bloqueado corretamente, porque aluno não deve poder editar o documento oficial do simulado.

## Correção

Agora as respostas dos alunos ficam em uma coleção anual separada:

```txt
anos/{ano}/sistema_simulados_envios
```

Cada envio usa o ID:

```txt
{simuladoId}_{usuarioId}
```

Assim:

- ADM/Monitor/Professor cria e edita o simulado oficial.
- Aluno cria/atualiza apenas a própria resposta.
- Ranking lê os envios dessa coleção separada.

## Importante

Publique o `firestore.rules` deste pacote em Firestore Database > Rules.
