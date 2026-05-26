CORREÇÃO DO UPLOAD DA ABA PLATAFORMA

Esta versão remove a dependência do Apps Script/Google Drive para upload de arquivos da Plataforma.
Agora:
- Metadados do material: Cloud Firestore
- Arquivos e imagens do fórum: Firebase Storage

PASSOS NO FIREBASE:
1. Firebase Console > Build > Storage
2. Clique em Começar / Get started, caso ainda não esteja ativado.
3. Vá em Rules/Regras do Storage.
4. Para teste, cole o conteúdo de storage.rules e publique.

Depois de testar, as regras devem ser fechadas com autenticação real.
