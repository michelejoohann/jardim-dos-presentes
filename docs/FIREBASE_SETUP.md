# Configuração do Firebase — Jardim dos Presentes v2

## 1. Publicar regras do Firestore

No Firebase Console, abra **Firestore Database → Regras** e substitua o conteúdo pelas regras do arquivo `firestore.rules`. Clique em **Publicar**.

Essas regras permitem:
- Leitura pública dos produtos na coleção `products`.
- Escrita restrita exclusivamente ao UID administrativo (`7G4v3hEMtaVzI8MUDsXjVCNXGJz1`).
- **`publicReservations/{productId}`**: Leitura pública (para atualizar status dos cards para todos os visitantes em tempo real). Criação restrita a visitantes logados (`signedIn`) com status `reserved` ou `received`. Remoção permitida ao próprio autor ou à administradora.
- **`privateReservations/{productId}`**: Criação por visitantes autenticados. Leitura e exclusão restritas **exclusivamente à administradora** (`isAdmin()`), garantindo a privacidade absoluta dos nomes, e-mails e mensagens de carinho.

## 2. Conferir autenticação

Em **Authentication → Método de login**, mantenha ativos:

- **Anônimo**, para visitantes (sessão de leitura e reservas públicas);
- **E-mail/senha**, para a administradora do Jardim.

## 3. Domínios autorizados

Em **Authentication → Configurações → Domínios autorizados**, confirme que estão liberados:

- `michelejoohann.github.io`
- `localhost`

## 4. Fonte de dados e Catálogo de Segurança

- **Firestore como Fonte da Verdade**: Quando o banco está conectado e possui dados (`ready`), os produtos exibidos na tela vêm **exclusivamente do Firestore** em tempo real via `onSnapshot`.
- **Exclusões e Edições Imediatas**: Itens deletados ou modificados no Firebase Console refletem instantaneamente no site para todos os visitantes.
- **Fallback Local**: Caso o Firestore esteja vazio ou inacessível, o aplicativo utiliza o catálogo consolidado em `src/data/officialCatalog.js` e `src/data/gocaseProducts.js` como contingência temporária.

## 5. Migração dos produtos

Pelo painel administrativo integrado na aplicação, a administradora autenticada pode executar a migração que popula ou atualiza a coleção `products` em lote (usando `writeBatch` com IDs estáveis e `merge: true`).

## 6. Segurança da configuração Web

A configuração pública em `src/firebase/config.js` é entregue ao cliente e não concede privilégios administrativos por si só. A proteção de dados é garantida por:

- Firebase Authentication (UID administrativo seguro);
- Firestore Security Rules (`firestore.rules`);
- Domínios autorizados no Console;
- Storage Security Rules.
