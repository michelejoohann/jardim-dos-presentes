# 🌿 Gestão de Dados e Cargas em Lote — Jardim dos Presentes v2.0

O **Jardim dos Presentes** adota uma arquitetura **100% Cloud Firestore** como fonte única da verdade para todos os presentes, reservas e mídias. Nenhum catálogo estático fica embutido no código-fonte ou no pacote compilado (`bundle`).

---

## 🏛️ Arquitetura de Dados (100% Nuvem)

- **Coleção `products`**:
  - Armazena todos os presentes do Jardim.
  - Leitura pública em tempo real via listener `onSnapshot` no Firestore (`src/services/productService.js`).
  - Escrita, edição, exclusão e importação em lote restritas exclusivamente ao UID administrativo autenticado (`7G4v3hEMtaVzI8MUDsXjVCNXGJz1`), conforme as regras em `firestore.rules`.
- **Coleções `publicReservations` e `privateReservations`**:
  - Separação estrita de privacidade: os visitantes veem apenas o status do item (`Disponível`, `Reservado`, `Floresceu 🌸`), enquanto dados pessoais (nome, e-mail, recado carinhoso) ficam salvos na coleção privada acessível exclusivamente à administradora.

---

## 📊 1. Carga e Gestão em Lote via Planilha Excel / CSV

Para facilitar a inserção, atualização e manutenção em massa de presentes sem precisar preencher formulários um a um, o painel administrativo disponibiliza uma ferramenta integrada de **Planilhas CSV/Excel** (`src/services/csvService.js`).

### Como Usar:
1. Acesse o Painel Administrativo (`?admin=true`) e faça o login seguro.
2. Na aba **Planilhas & Backup**, clique no botão **"📄 Baixar Modelo CSV / Excel"**.
3. Abra o arquivo `.csv` baixado no Microsoft Excel, Google Sheets, LibreOffice Calc ou bloco de notas.
4. Preencha as linhas com os seus presentes seguindo as colunas do cabeçalho:
   - `id` *(opcional: deixe em branco para itens novos, ou preencha com o ID existente para atualizar um presente já cadastrado)*
   - `name` *(obrigatório)*: Nome do presente.
   - `category` *(obrigatório)*: Categoria (ex: `casa`, `tecnologia`, `moda`, `calcados`, `beleza`, `joias`, `livros`, `arte`, `jardim`, `pets`).
   - `subcategory`: Subcategoria (ex: `Iluminação`, `Decoração`, `Cozinha`).
   - `collection`: Coleção temática (ex: `Noite Encantada`, `Refúgio Botânico`).
   - `price`: Valor numérico (ex: `189.90` ou `189,90`).
   - `priceLabel`: Rótulo de preço amigável (ex: `R$ 189,90` ou `Sob consulta`).
   - `priority`: Nível de prioridade (`alta`, `media`, `baixa`).
   - `imageUrl`: Link direto da foto do presente (JPG, PNG ou WebP).
   - `imagePosition`: Ponto focal do corte (`center`, `top`, `bottom`, `left`, `right`, `left top`, etc.).
   - `imageFit`: Modo de exibição (`cover` para preencher o card ou `contain` para foto inteira sem cortes).
   - `url`: Link oficial da loja para compra.
   - `store`: Nome da loja (ex: `Amazon`, `Tok&Stok`, `Zara Home`).
   - `description`: Descrição acolhedora do item.
   - `dream`: O sonho ou significado especial de ter esse item no Jardim.
   - `story`: Pequena história ou detalhe emotivo.
   - `meanings`: Tags ou palavras-chave separadas por vírgula.
   - `sizes`: Tamanhos ou medidas (ex: `M`, `38`, `110V`).
   - `notes`: Observações adicionais.
   - `quantityDesired`: Quantidade desejada (padrão: `1`).
   - `enabled`: Visibilidade na vitrine pública (`true` para visível, `false` para oculto).
5. Salve a planilha como **CSV (delimitado por vírgulas ou ponto e vírgula)**.
6. No painel, clique em **"📤 Importar Planilha CSV para Firestore"** e selecione seu arquivo.
7. O sistema valida os campos, formata os valores, detecta automaticamente o delimitador e grava os dados em lotes transacionais seguros (`writeBatch`) exibindo uma barra de progresso em tempo real.

---

## 💾 2. Backup Estrutural do Banco (Snapshot JSON)

Na mesma aba **Planilhas & Backup**, a administradora conta com salvaguarda completa de contingência:

- **Baixar Backup JSON**: Gera e descarrega um snapshot completo de todos os produtos do Firestore em arquivo `.json`. Guarde este arquivo em seu computador como garantia de segurança.
- **Restaurar Arquivo JSON**: Lê um arquivo de backup previamente exportado e grava os documentos no banco com preservação dos IDs estáveis originais.

---

## 📐 3. Enquadramento e Ponto Focal de Imagens

No editor de presentes (`src/components/ProductEditor.jsx`), a administradora dispõe de um simulador visual interativo de enquadramento:
- **Modo Cover vs Contain**: Escolha entre preencher todo o card com corte inteligente (`cover`) ou exibir a foto inteira sem nenhum corte (`contain`).
- **Simulador Visual com Modos de Exibição**:
  - `Card (4:3)`: Exibe o corte exato de como os visitantes veem o presente na vitrine.
  - `Foto Completa + Máscara`: Mostra a foto original integral com uma abertura iluminada indicando a área visível vs a área descartada no corte.
  - `Modal (1:1)`: Exibe o formato quadrado do modal de detalhes.
- **Mira Visual e Grade de Terços**: Uma mira tátil acompanha o ponto focal escolhido e permite clicar diretamente em qualquer ponto da foto para reorientar o enquadramento.
