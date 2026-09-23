# Migração e Sincronização do Catálogo

A aplicação contém um painel administrativo em `src/components/AdminMigrationPanel.jsx` que permite à administradora autenticada importar e sincronizar os produtos consolidados para a coleção `products` do Firestore.

## 📋 Catálogos Fontes da Migração

A lista de migração (`src/services/productMigration.js`) consolida:
- `officialGardenProducts` (`src/data/officialCatalog.js`): 84 produtos com descrições ricas, valores, histórias e sonhos.
- `gocaseProducts` (`src/data/gocaseProducts.js`): 2 produtos da coleção Gocase.
- **Total consolidado**: 86 produtos únicos (desduplicados por `id`).

## 🔐 Pré-requisitos

- Firebase Authentication ativo com método Email/Senha.
- Conta administrativa criada com o UID `7G4v3hEMtaVzI8MUDsXjVCNXGJz1`.
- Regras de segurança de `firestore.rules` publicadas no Firebase Console.
- Aplicação rodando em ambiente local ou na URL oficial do GitHub Pages.

## 🚀 Procedimento de Migração

1. Abra a aplicação com o parâmetro de administração na URL: `?admin=true`
   - Exemplo no GitHub Pages: `https://michelejoohann.github.io/jardim-dos-presentes/?admin=true`
   - Exemplo em ambiente local: `http://localhost:5173/?admin=true`
2. No painel **Importação inicial do catálogo** que agora estará visível, preencha o e-mail e a senha da administradora.
3. Clique em **Entrar como administradora**.
4. O painel exibirá o contador atual de produtos lidos do Firestore.
5. Clique no botão **Importar catálogo atual** e confirme o diálogo.
6. A função `migrateCatalogToFirestore` gravará os documentos no Firestore em lotes de até 400 itens via `writeBatch`, aplicando IDs estáveis e `merge: true`.
7. Aguarde a mensagem de sucesso indicando o número de produtos gravados/atualizados.

## 🎯 Validação e Fonte da Verdade

- O cabeçalho da aplicação deve exibir a contagem atualizada e a mensagem **"Firestore como fonte oficial"**.
- Uma vez populado o banco, **o Firestore torna-se a fonte única da verdade**:
  - Produtos excluídos no Firebase desaparecem imediatamente da visualização.
  - Produtos novos adicionados no Firebase aparecem imediatamente.
  - Alterações de valores, fotos ou status (`published: false`) refletem em tempo real via listener `onSnapshot`.
- Se o banco estiver vazio ou indisponível, o catálogo local seguro assume como fallback.
