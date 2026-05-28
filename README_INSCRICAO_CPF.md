# Ajuste — Autoinscrição por CPF + CPF válido

Esta versão foi feita em cima da base estável atual.

## O que mudou

1. O cadastro de aluno não exige mais e-mail institucional ou pessoal.
2. A tela de login ganhou o botão **Inscreva-se**.
3. O aluno informa o CPF; se houver cadastro, a plataforma abre uma tela para ele informar e-mail e senha.
4. A conta é criada no Firebase Auth e o perfil é salvo em `sistema_usuarios` como nível `Aluno`.
5. Campos de CPF agora formatam automaticamente no padrão `XXX.XXX.XXX-XX`.
6. CPF inválido bloqueia o cadastro/importação/edição quando o campo for obrigatório ou preenchido.
7. Foi criada a coleção de apoio `anos/{ano}/sistema_alunos_lookup` para consulta segura por CPF, sem expor a coleção completa de alunos.

## Importante

Publique o arquivo `firestore.rules`, pois a autoinscrição precisa ler apenas um documento de lookup por CPF antes do login.

Depois de subir os arquivos, entre uma vez como ADM/Staff para o sistema sincronizar os alunos atuais para `sistema_alunos_lookup`.
