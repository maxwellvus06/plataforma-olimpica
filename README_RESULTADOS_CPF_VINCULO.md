# Ajuste — Resultados com CPF para evitar homônimos

Base usada: última base estável com listas ADM protegidas.

## O que mudou

1. Cadastro manual de resultado agora tem campo **CPF do aluno**.
2. Ao selecionar aluno cadastrado, o CPF é preenchido automaticamente e travado junto com nome/escola/cidade.
3. Resultados importados via XLSX agora aceitam coluna **CPF**.
4. Modelo XLSX de resultados agora vem com colunas:
   - Aluno
   - CPF
   - Escola
   - Município
   - Olimpíada
   - Série
   - Prêmio
   - Observação
5. Edição de resultado também permite ajustar CPF e observação.
6. O dashboard do aluno não vincula mais resultado apenas por **nome + escola**.

## Regra de vínculo

O resultado será vinculado ao aluno quando houver:

- `alunoId`; ou
- `alunoCpf` igual ao CPF cadastrado do aluno.

Se o resultado não tiver CPF nem `alunoId`, ele continua existindo na tabela geral, mas **não aparece automaticamente no painel do aluno**. Isso evita que dois alunos homônimos da mesma escola vejam resultados um do outro.

## Observação técnica

A chave de sobrescrita do resultado agora usa CPF quando disponível. Isso evita que dois alunos com mesmo nome, mesma escola, mesma olimpíada e mesma série sobrescrevam o resultado um do outro.
