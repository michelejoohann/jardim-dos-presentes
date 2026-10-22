# 📋 Roteiro & Checklist de Auditoria UX e Responsividade

Use este checklist para validar telas, fluxos e componentes após qualquer refatoração de CSS ou layout.

---

## 📱 1. Resoluções Críticas de Teste

| Dispositivo / Largura | Cenário de Teste | Itens a Verificar |
| :--- | :--- | :--- |
| **320px** (iPhone SE 1st gen / Telas dobráveis fechadas) | Teste de estresse mínimo de largura | Sem quebra de layout, sem barra de rolagem horizontal no `body`, botões visíveis e legíveis |
| **375px — 390px** (iPhone 13/14/15 padrão) | Smartphone padrão da maioria dos usuários | Navegação rápida, filtros confortáveis, modal com botões visíveis |
| **768px** (iPad Portrait / Tablets) | Ponto de transição mobile/desktop | Menus não devem se sobrepor ao conteúdo, grid equilibrado em 2 ou 3 colunas |
| **1024px** (iPad Pro Landscape / Laptops compactos) | Início do desktop completo | Elementos decorativos (folhagens) não invadem o conteúdo central |
| **1440px+** (Monitores Ultra-Wide) | Máximo de largura | Container principal centralizado com `max-width`, evitando linhas de texto excessivamente longas |

---

## 🔍 2. Checklist Detalhado por Elemento

### Navegação & Cabeçalho
- [ ] O logo ou monograma escala harmoniosamente sem invadir os botões laterais.
- [ ] O menu hamburger ou gaveta tátil abre e fecha com transição suave.
- [ ] A rolagem do body é bloqueada (`overflow: hidden` no `body`) quando uma gaveta ou modal estiver aberto em tela cheia.
- [ ] A barra de pesquisa não quebra o alinhamento da navbar no mobile.

### Vitrine & Catálogo de Cards
- [ ] As imagens dos produtos possuem proporção consistente (`aspect-ratio: 4/3` ou similar) e não distorcem (`object-fit: cover`).
- [ ] O badge de status (Disponível, Reservado, Presenteado) é legível e não cobre o título do produto.
- [ ] O preço e o botão "Presentear" ficam alinhados na base de todos os cards de uma mesma linha (`margin-top: auto`).
- [ ] O espaçamento entre os cards (`gap`) é proporcional à largura da tela.

### Modais e Formulários
- [ ] No mobile, o modal se comporta como Bottom Sheet com alça e cantos superiores arredondados.
- [ ] O botão de fechar (X) tem pelo menos 44px de área de toque e fica em posição fixa/visível.
- [ ] Todos os campos de formulário têm `font-size: 16px` para evitar zoom automático no iOS.
- [ ] Ao abrir o teclado virtual, os botões de "Confirmar" ou "Enviar" permanecem acessíveis via rolagem.
- [ ] As mensagens de erro e feedback de sucesso são exibidas próximas ao campo relevante com cores de bom contraste.

### Tipografia e Contraste
- [ ] Nenhuma palavra longa quebra o container (uso de `overflow-wrap: break-word` ou `hyphens: auto`).
- [ ] Contraste de texto respeita WCAG AA (mínimo 4.5:1 para texto normal, 3:1 para títulos grandes).
- [ ] Fontes nobres (Cinzel e Cormorant Garamond) mantêm peso visual suficiente em telas de baixa densidade de pixels.

### Acessibilidade (A11y)
- [ ] Tecla `ESC` fecha modais e gavetas abertas.
- [ ] Foco visível (`:focus-visible`) preservado com anel dourado/verde em navegação por teclado.
- [ ] Imagens possuem atributo `alt` descritivo.
- [ ] Botões com apenas ícones possuem `aria-label`.
