ALTERAÇÃO: RESET DE SENHAS EM LOTE

Arquivos principais alterados:
- index.html
- app.js

O que foi adicionado:
- Painel na aba Gerenciar Usuários para resetar senhas em lote.
- Apenas usuários ADM visualizam e executam a ferramenta.
- O reset pode ser feito por:
  1) Nível de acesso
  2) Cidade
  3) Escola
- O sistema pede nova senha e confirmação.
- Antes de executar, mostra a quantidade de usuários atingidos e pede confirmação.
- O campo senha é salvo em sistema_usuarios no Cloud Firestore.
- Cada usuário alterado recebe metadados:
  senhaRedefinidaEm
  senhaRedefinidaPorId
  senhaRedefinidaPorNome

Observação:
- Se o alvo incluir o próprio ADM logado, o sistema avisa antes de confirmar.
