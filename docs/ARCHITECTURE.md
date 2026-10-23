# 🏛️ Arquitetura do Sistema — Jardim dos Presentes de Michèlé Joohann

## 1. Visão Geral do Sistema

O **Jardim dos Presentes** é uma aplicação web moderna, responsiva e acolhedora que transforma uma lista de desejos em uma experiência visual rica inspirada em um *Herbarium Botânico Vitoriano*. Construída sobre **React 19**, **Vite 7** e **Firebase 12**, a aplicação oferece:

- **100% Cloud Firestore como Fonte Única da Verdade**: Nenhum dado ou imagem de produto é armazenado no código-fonte ou em arquivos estáticos da aplicação (todas as fotos de produtos são servidas via URLs de CDNs oficiais cadastradas no Firestore). Todo o catálogo reside e é atualizado dinamicamente no banco de dados.
- **Painel Gerencial Completo**: Interface administrativa com autenticação segura, permitindo criação de novos presentes, edição, exclusão, controle de visibilidade (habilitado/desabilitado) e sugestões inteligentes de textos acolhedores, prioridades, sonhos e histórias.
- **Backup & Restauração Sob Demanda**: Ferramenta de exportação e importação de backups em formato JSON diretamente pelo navegador, mantendo o repositório 100% limpo e desacoplado dos dados.
- **Navegação Superior Fixa & Filtros Unificados**: Barra de navegação `sticky` com efeito *glassmorphism* botânico sempre acessível durante a rolagem. Concentra o logotipo da marca com rolagem suave ao topo (`window.scrollTo`), botão circular de filtros com badge numérico em ouro antigo indicando filtros ativos, busca retrátil e acesso administrativo. A vitrine permanece limpa e sem barras redundantes de chips.
- **Filtragem Reativa Multi-Coleção**: Menus flutuantes no desktop e gaveta suspensa tátil no celular com contadores de itens em tempo real (`categoryCounts`), seleção cumulativa (múltiplas coleções simultâneas), alternância para desselecionar e contagem de filtros ativos.
- **Controle de Histórico no Celular (`popstate`)**: Sincronização da pilha de histórico do navegador (`window.history.pushState` / `popstate`) com o modal de presentes (`GiftModal`) e gaveta de filtros. Ao pressionar o botão físico "Voltar" ou realizar o gesto de swipe no celular, a janela/gaveta é fechada e o visitante permanece exatamente no catálogo, sem sair do site.
- **Links Diretos para Lojas Oficiais**: Botões e links contextuais com ícone de link (`🔗`) para compra direta na loja oficial (abertos com segurança em nova aba via `target="_blank"` e `rel="noopener noreferrer"`).
- **Tela de Login Administrativa 100% Responsiva & Amigável**: Interface de acesso restrito com hierarquia vertical, inputs empilhados de largura total (touch-friendly), cartão centralizado adaptável para qualquer resolução móvel ou desktop, e tratamento inteligente de erros de autenticação em português (traduzindo códigos técnicos do Firebase para orientações acolhedoras, com detecção de falta de ponto em domínios de e-mail, auto-sanitização com trim e limpeza do erro ao digitar).
- **Controle de Enquadramento & Ponto Focal de Imagens**: Ferramenta integrada ao editor de presentes para ajustar a proporção e o foco de corte (`imagePosition` e `imageFit`), com matriz 3x3 (topo, centro, base e cantos), seletor de preenchimento (Cobrir Card vs Foto Inteira sem Cortes com moldura) e ajuste interativo por clique na prévia ao vivo, propagado reativamente para toda a vitrine.
- **Code-Splitting e Otimização**: Chunks otimizados no Vite com vendor splitting (`vendor-react`, `vendor-firebase`) e carregamento sob demanda (`lazy` + `Suspense`).

---

## 2. Diagrama Arquitetural Geral

```mermaid
graph TB
    subgraph Client ["🖥️ Cliente / Navegador"]
        subgraph TopNav ["Navegação Superior Fixa (Sticky) & Responsiva"]
            Brand["Logo Brand MJ (Rolagem ao Topo)"]
            FilterActionBtn["Botão Filtros com Badge Dinâmico"]
            MobileDrawer["Gaveta Tátil de Filtros (Mobile)"]
            DesktopNav["Menus de Topo (Desktop: Coleções, Ordenação)"]
            SearchBtn["Busca Retrátil Integrada"]
            AdminBtn["Acesso Rápido Admin"]
        end

        subgraph HeroSection ["Hero Poético Herbarium"]
            HeroTitle["Título & Subtítulo (Quebra Harmônica no :)"]
            Medallion["Medalhão Central MJ com Respiro Amplo"]
        end

        subgraph PublicUI ["Catálogo & Vitrine de Presentes"]
            Grid["Grade de Presentes (ProductCard)"]
            DirectBuyLink["Links de Compra na Loja Oficial (🔗)"]
            GiftModalUI["Modal de Presentear (GiftModal)"]
            HistorySync["Sincronizador de Histórico (Popstate / Botão Voltar)"]
        end

        subgraph AdminUI ["Painel Administrativo (?admin=true)"]
            AdminLogin["Tela de Login Responsiva"]
            AdminPanel["Gestão Geral (AdminMigrationPanel)"]
            ProductEditor["Editor com Simulador de Enquadramento (ProductEditor)"]
            BackupTool["Planilhas CSV/Excel & Backup JSON Dinâmico"]
        end
    end

    subgraph FirebaseServices ["🔥 Firebase Backend-as-a-Service"]
        Auth["Firebase Authentication<br/>(Visitantes anônimos & Admin Email/Senha)"]
        Firestore["Cloud Firestore Database<br/>(products, publicReservations, privateReservations)"]
        Rules["Security Rules<br/>(firestore.rules)"]
    end

    subgraph HostingPipeline ["🚀 Deploy & Entrega Contínua (CI/CD)"]
        GHRepo["GitHub Repository (main)"]
        GHActions["GitHub Actions (deploy-pages.yml)"]
        GHPages["GitHub Pages CDN"]
    end

    Brand -- "Clique: Rolagem suave ao topo" --> Client
    FilterActionBtn -- "Toque: Abre/Fecha gaveta mobile" --> MobileDrawer
    DesktopNav --> PublicUI
    MobileDrawer --> PublicUI
    SearchBtn --> PublicUI
    AdminBtn --> AdminLogin

    GiftModalUI <--> HistorySync
    MobileDrawer <--> HistorySync
    HistorySync -- "Botão Voltar: Fecha modal/gaveta e mantém catálogo" --> PublicUI

    PublicUI -- "Listener em tempo real (onSnapshot)" --> Firestore
    PublicUI -- "Sessão anônima de visitante" --> Auth
    GiftModalUI -- "Reserva pública e privada (writeBatch)" --> Firestore

    AdminLogin -- "Autenticação segura (email/senha)" --> Auth
    AdminPanel -- "Autenticação restrita (Admin UID)" --> Auth
    AdminPanel -- "CRUD & Visibilidade (productService)" --> Firestore
    ProductEditor -- "Sugestões de carinho (giftSuggestions)" --> ProductEditor
    BackupTool -- "Exportar / Importar JSON" --> Firestore

    GHRepo --> GHActions
    GHActions --> GHPages
    GHPages --> Client
```

---

## 3. Ciclo de Vida dos Dados e Sincronização em Tempo Real

A arquitetura adota o **Cloud Firestore como Fonte Única e Exclusiva da Verdade**:

```mermaid
sequenceDiagram
    autonumber
    actor Visitante as 👤 Visitante
    actor Admin as 🌿 Michèlé (Admin)
    participant App as ⚛️ React App (App.jsx)
    participant Auth as 🔐 Firebase Auth
    participant Firestore as 🔥 Cloud Firestore (products)
    participant AdminPanel as 🛠️ Painel Admin

    Visitante->>App: Acessa o site
    App->>Auth: signInAnonymously() se não autenticado
    Auth-->>App: Sessão de visitante garantida

    App->>Firestore: onSnapshot(query(collection('products'), orderBy('name')))
    Firestore-->>App: Emite Snapshot em tempo real dos produtos cadastrados

    App->>App: Filtra apenas itens com enabled !== false
    App-->>Visitante: Exibe grade fluida com filtros e ordenação

    Note over Admin,Firestore: Fluxo Administrativo: Edição em Tempo Real
    Admin->>AdminPanel: Cria/edita um presente ou alterna visibilidade
    AdminPanel->>Firestore: saveProduct() ou toggleProductEnabled()
    Firestore-->>App: onSnapshot emite lista atualizada instantaneamente
    App-->>Visitante: Interface atualiza em tempo real sem recarregar a página
```

---

## 4. Estrutura de Diretórios Atual

```text
JardimDosPresentes/
├── .github/
│   └── workflows/
│       └── deploy-pages.yml          # CI/CD: build e deploy automático no GitHub Pages
├── docs/
│   ├── ARCHITECTURE.md               # Este documento de arquitetura e decisões técnicas
│   ├── DATA_MANAGEMENT.md            # Guia completo de gestão de dados, planilhas CSV e backups
│   ├── FIREBASE_SETUP.md             # Guia de configuração do Firebase Console
│   └── PRODUCT_BACKLOG.md            # Histórico de requisitos e melhorias
├── public/
│   ├── favicon.svg                   # Ícone oficial do site
│   ├── og-image.jpg                  # Imagem otimizada de compartilhamento social (<150KB)
│   └── images/                       # Ilustrações botânicas vetoriais e logotipo MJ
├── src/
│   ├── components/
│   │   ├── AdminMigrationPanel.jsx   # Painel de gestão da Michèlé (CRUD, recados, planilhas e backup)
│   │   ├── GiftModal.jsx             # Modal interativo de presente com dedicatória
│   │   ├── ProductCard.jsx           # Card editorial de presente (status, tags, sonho e links)
│   │   └── ProductEditor.jsx         # Editor com simulador de enquadramento, retículo e sugestões
│   ├── firebase/
│   │   └── config.js                 # Inicialização do Firebase (Auth, Firestore, Storage)
│   ├── services/
│   │   ├── csvService.js             # Motor de importação, exportação e template padronizado Excel/CSV
│   │   ├── giftSuggestions.js        # Motor de sugestões contextuais (histórias, prioridades, sonhos)
│   │   ├── productService.js         # Serviço de persistência, alternância e exclusão no Firestore
│   │   └── reservationService.js     # Serviço de reservas públicas e privadas no Firestore
│   ├── styles/
│   │   └── global.css                # Folha de estilos Herbarium Vitoriano e responsividade
│   ├── App.jsx                       # Componente raiz: topo, busca, hero, filtros reativos e catálogo
│   └── main.jsx                      # Ponto de entrada React 19
├── firestore.rules                   # Regras de segurança do Cloud Firestore
├── index.html                        # Template HTML com meta tags SEO e viewport
├── package.json                      # Dependências do projeto (React 19, Vite 7, Firebase 12)
├── vite.config.js                    # Configuração Vite com base URL e code-splitting
└── README.md                         # Documentação central do projeto
```

---

## 5. Dicionário de Dados (`products/{productId}`)

Cada documento na coleção `products` do Cloud Firestore possui a seguinte estrutura oficial:

| Campo | Tipo | Descrição | Exemplo |
|---|---|---|---|
| `id` | `string` | Identificador único e legível (slug) | `"asas-de-fada-luxo-01"` |
| `name` | `string` | Nome carinhoso e comercial do produto | `"Asas de Fada / Borboleta em Tecido"` |
| `category` | `string` | Categoria principal (Coleção) | `"moda"`, `"casa"`, `"arte"`, `"joias"` |
| `subcategory` | `string` | Canteiro / Subcategoria | `"acessorios"`, `"fantasia"`, `"decoracao"` |
| `collection` | `string` | Coleção temática do Jardim | `"Magia das Fadas"`, `"Herbarium"` |
| `price` | `number \| null` | Valor numérico de referência | `89.90` |
| `priceLabel` | `string` | Formatação em moeda amigável | `"R$ 89,90"`, `"Consultar na loja"` |
| `priority` | `string` | Nível de prioridade / importância | `"alta"`, `"media"`, `"baixa"` |
| `enabled` | `boolean` | Flag de visibilidade ativa no site | `true` (visível) ou `false` (oculto) |
| `published` | `boolean` | Espelhamento de visibilidade para compatibilidade | `true` ou `false` |
| `visible` | `boolean` | Espelhamento de visibilidade para compatibilidade | `true` ou `false` |
| `imageUrl` | `string` | URL direta da fotografia principal | `"https://..."` |
| `url` | `string` | Link direto para a loja onde comprar | `"https://..."` |
| `store` | `string` | Nome da loja fornecedora | `"SHEIN"`, `"Amazon"`, `"Ateliê"` |
| `description` | `string` | Descrição técnica ou estética do item | `"Asas artesanais em organza furta-cor..."` |
| `dream` | `string` | O sonho ou intenção associada ao presente | `"Incorporar o espírito das fadas e a leveza..."` |
| `story` | `string` | História de carinho ou memória conectada | `"Desde a infância o fascínio por asas e seres mágicos..."` |
| `meanings` | `string[]` | Tags simbólicas de significado | `["Liberdade", "Magia", "Sonho"]` |
| `sizes` | `string[]` | Tamanhos ou especificações | `["Único", "Ajustável"]` |
| `notes` | `string[]` | Observações adicionais | `["Preferência por tons translúcidos"]` |
| `quantityDesired` | `number` | Quantidade almejada | `1` |
| `quantityReceived` | `number` | Quantidade já conquistada / florescida | `0` |
| `status` | `string` | Estado calculado ou atribuído | `"available"`, `"reserved"`, `"received"` |
| `createdAt` | `timestamp` | Data de criação no Firestore | `ServerTimestamp` |
| `updatedAt` | `timestamp` | Data da última alteração no Firestore | `ServerTimestamp` |

---

## 6. Segurança e Regras de Controle de Acesso

As regras declaradas em `firestore.rules` asseguram:

1. **Leitura Pública**: Qualquer visitante (anônimo ou autenticado) pode consultar a coleção `products` e a coleção `publicReservations`.
2. **Escrita Administrativa Exclusiva**: Apenas a conta autenticada correspondente ao `ADMIN_UID` (`7G4v3hEMtaVzI8MUDsXjVCNXGJz1`) possui permissão para executar `create`, `update` ou `delete` na coleção `products`.
3. **Privacidade das Dedicatórias**: A coleção `privateReservations` (que guarda nomes, e-mails e mensagens confidenciais dos convidados) pode ser criada por qualquer visitante no momento do presente, mas **somente a administradora autenticada pode ler e listar** as mensagens.
4. **Isolamento de Código**: Nenhum dado confidencial ou lista de produtos estática trafega no repositório. O banco de dados é a autoridade máxima e única.
---

## 7. Arquitetura de Navegação Mobile & Controle de Histórico (`popstate`)

Em aplicações de página única (SPA), abrir modais ou gavetas sem atualizar a pilha de histórico do navegador faz com que o botão "Voltar" (físico ou por gesto no Android e iOS) feche a aba ou saia do site. Para proporcionar uma experiência verdadeiramente nativa, a aplicação implementa **sincronização de histórico atômica**:

1. **Empilhamento de Estado (`pushState`)**:
   - Ao abrir o modal de presente (`giftingProduct`) ou a gaveta de filtros (`mobileMenuOpen`), um identificador único com carimbo temporal (`gift-modal-${Date.now()}` / `filters-drawer-${Date.now()}`) é inserido no histórico via `window.history.pushState`.
2. **Interceptação do Evento `popstate`**:
   - Um listener dedicado escuta o evento `popstate`. Se disparado pelo gesto de voltar ou botão físico do dispositivo, a flag `isClosingByPopstateRef` é ativada e o modal/gaveta é fechado imediatamente.
   - O usuário permanece **exatamente na mesma altura de rolagem do catálogo**, sem qualquer salto visual ou recarregamento.
3. **Fechamento Programático Seguro**:
   - Caso o usuário feche a interface via botão **✕**, clique no backdrop, botão **Cancelar**, tecla **ESC** ou conclusão do fluxo ("Voltar ao Jardim"), a rotina de limpeza do efeito verifica se o estado ativo do histórico ainda pertence ao modal (`window.history.state?.modalKey === modalKey`) e executa `window.history.back()`.
   - Essa verificação impede o acúmulo de entradas órfãs na pilha de navegação, mantendo o histórico sempre limpo.

---

## 8. Sistema de Filtros Reativo & Multi-Coleção na Barra Superior

1. **Unificação na Barra Superior**:
   - Os controles de filtragem e busca estão integrados à barra superior fixa (`.site-top-bar`), eliminando barras secundárias ou faixas de chips redundantes sobre o catálogo e maximizando a área útil da vitrine.
2. **Seleção Cumulativa**:
   - O estado `selectedCategories` aceita um array de coleções (`[]`). Quando múltiplas coleções são selecionadas, o catálogo exibe qualquer presente pertencente a pelo menos uma das coleções ativas (`selectedCategories.includes(product.category)`).
3. **Alternância para Desselecionar**:
   - Clicar em uma categoria já selecionada a desativa. Quando a última categoria for desmarcada, a aplicação retorna automaticamente ao estado de "Todas as coleções".
4. **Contadores Dinâmicos de Itens**:
   - Um `useMemo` dedicado calcula em tempo real o número de presentes disponíveis para cada coleção (`categoryCounts`), exibindo `Coleção (N)` nos menus suspensos e na gaveta mobile.
5. **Indicador Visual na Barra Superior**:
   - O botão de filtro na barra superior exibe um badge numérico (`.top-filter-count-badge`) dourado sempre que houver 1 ou mais filtros aplicados, e a gaveta mobile oferece botão direto de "Limpar".

---

## 9. Arquitetura e Responsividade da Tela de Login Administrativo

Para garantir acessibilidade ergonômica total em smartphones e telas estreitas:

1. **Card Centralizado e Focado**:
   - O componente `.admin-panel-login` utiliza layout vertical centrado com `max-width: 440px` e largura flexível `100%`, prevenindo colisões ou sobreposição de colunas em telas de qualquer tamanho.
2. **Hierarquia Vertical Fluida**:
   - **Cabeçalho**: Selo heráldico circular MJ centralizado, acompanhado do kicker em borgonha e título com tipografia clássica serifada.
3. **Formulário**: Inputs de e-mail e senha empilhados verticalmente com altura mínima de toque (`min-height: 48px`), preenchimento confortável e largura de 100%.
4. **Ações**: Botão primário de submissão com gradiente botânico e botão secundário inferior para retorno seguro à vitrine pública.

---

## 10. Importação e Exportação em Lote via Planilhas (Excel / CSV)

Para permitir que a administradora gerencie o catálogo em escala sem depender de digitação manual item a item:

1. **Template Padrão Pré-Formatado (`template-jardim-dos-presentes.csv`)**:
   - Cabeçalho padronizado com **21 colunas canônicas** alinhadas aos campos do Firestore.
   - Gerado com **BOM UTF-8 (`\uFEFF`)** e delimitador ponto-e-vírgula (`;`), garantindo que o Microsoft Excel (Windows e Mac), Google Planilhas e LibreOffice abram o arquivo diretamente em colunas estruturadas, sem corrupção de caracteres especiais em português (`ã`, `é`, `ç`).
   - Contém linhas de exemplo realistas demonstrando formatação de categorias, enquadramento de foto, preços e valores múltiplos.

2. **Parser Resiliente (`csvService.js`)**:
   - **Autodetecção de Delimitador**: Inspeciona a linha de cabeçalho para identificar automaticamente `;`, `,` ou `\t`.
   - **Mapeamento de Sinônimos**: Reconhece aliases naturais em português e inglês (ex: `Nome do Presente`, `Produto`, `Item`, `Title` -> `name`).
   - **Sanitização de Preços**: Converte notações brasileiras (`R$ 159,90`, `159,90`) e internacionais (`159.90`) em números de ponto flutuante válidos, preservando o rótulo amigável em `priceLabel`.
   - **Multi-linha e Aspas**: Compatível com RFC 4180 para campos com quebras de linha e aspas duplas escapadas (`""`).

3. **Gravação Atômica em Lotes (`writeBatch`)**:
   - Como o Cloud Firestore impõe um limite estrito de 500 operações por batch, o serviço divide as gravações em lotes seguros de 400 documentos (`CHUNK_SIZE = 400`).
   - Se o campo `id` estiver preenchido, ele é preservado (atualização/merge); se estiver vazio, um slug único é gerado a partir do nome do presente.
   - Aplica `serverTimestamp()` no campo `updatedAt` para garantir integridade temporal.


