PLATAFORMA OLÍMPICA — CADASTRO DE ALUNOS + RESULTADOS VINCULADOS

Arquivos principais:
- index.html
- database.js
- app.js
- firestore.rules

O que foi adicionado nesta versão:

1) Nova aba: Alunos
- Cadastro individual de aluno.
- Importação em lote via XLSX.
- Modelo XLSX com listas suspensas para escola, série e sexo.
- Tabela de alunos cadastrados por ano.
- Edição e exclusão de aluno.

2) Campos do aluno
- Nome completo obrigatório.
- E-mail institucional e e-mail pessoal: pelo menos um obrigatório.
- CPF obrigatório.
- Data de nascimento com idade calculada.
- Sexo obrigatório via lista suspensa.
- Escola puxada das escolas já cadastradas.
- Série via lista suspensa.
- Turno/turma obrigatório.
- Contato do aluno.
- Mãe, pai e responsável acadêmico: pelo menos um obrigatório.
- Contato do pai/responsável.

3) Firestore
Os alunos ficam separados por ano, junto com os outros dados anuais:

anos/2026/sistema_alunos
anos/2025/sistema_alunos
anos/2024/sistema_alunos
...

4) Resultados
Na aba de resultados, agora há um campo "Aluno cadastrado".
- Se selecionar um aluno, nome, cidade, escola e série são preenchidos automaticamente.
- Cidade e escola ficam travadas para evitar erro de vínculo.
- Se escolher digitação manual, continua sendo possível digitar o nome e selecionar cidade/escola.

5) Observação
Usuários continuam globais em sistema_usuarios.
Alunos são dados anuais, porque podem ser analisados junto aos resultados de cada ciclo.
