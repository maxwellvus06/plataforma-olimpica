# Plataforma Olímpica — versão profissional com Cloud Firestore

## Objetivo
Esta versão mantém o layout atual e coloca os dados principais no banco externo: Cloud Firestore.

## Arquivos para substituir no GitHub
Substitua exatamente estes arquivos no repositório:

- `index.html`
- `database.js`
- `app.js`

## Banco usado
Use **Cloud Firestore** para os dados administrativos.

Coleções usadas:

- `sistema_usuarios`
- `sistema_cidades`
- `sistema_escolas`
- `sistema_olimpiadas`
- `sistema_cronograma`
- `sistema_premiados`
- `sistema_plataforma`
- `sistema_debug`

## O que NÃO é usado
- Não usa `localStorage`.
- Não usa `sessionStorage`.
- Não usa Realtime Database para usuários, cidades, escolas, olimpíadas, cronograma, premiados ou plataforma.

## Passo obrigatório no Firebase
No Firebase Console:

1. Entre no projeto `avanceolimpico`.
2. Vá em **Build > Firestore Database**.
3. Clique em **Rules/Regras**.
4. Cole temporariamente:

```js
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

5. Clique em **Publish/Publicar**.

Atenção: isso é regra aberta apenas para teste. Depois vamos fechar com login seguro.

## Como testar
1. Suba os três arquivos no GitHub.
2. Abra o site em aba anônima ou dê `Ctrl + F5`.
3. Entre com:
   - usuário: `admin`
   - senha: `123`
4. Olhe no Firestore se apareceu:
   - `sistema_debug/ultimo_acesso`
   - `sistema_usuarios`
   - `sistema_cidades`
   - `sistema_escolas`
   - `sistema_olimpiadas`
   - `sistema_cronograma`
   - `sistema_premiados`
   - `sistema_plataforma`

## Observação sobre segurança
O login atual ainda é login próprio da plataforma, salvo em `sistema_usuarios`.
Para produção real, o ideal é depois migrar para Firebase Authentication.
