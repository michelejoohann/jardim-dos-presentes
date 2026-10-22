---
name: ux-webdesign
description: >-
  Expert guide for UI/UX engineering, modern responsive web design, mobile-first architecture,
  touch ergonomics, fluid typography, and aesthetic fidelity. Use this skill whenever designing,
  refactoring, auditing, or implementing responsive layouts, mobile interactions, touch targets,
  design system tokens, drawer/modal sheets, or visual hierarchy across screen sizes.
---

# 🌿 Skill: UX & Web Design Responsivo (Jardim dos Desejos)

Esta skill estabelece os princípios de arquitetura de interface, boas práticas de experiência do usuário (UX), design visual (UI) e padrões de responsividade mobile-first para o projeto **Jardim dos Presentes** e aplicações web ricas modernas.

---

## 🎯 1. Filosofia Central de Design & UX

1. **Aparência Nobre sem Sacrifício de Usabilidade**:
   - Preservar o encanto estético do *Herbarium Botânico Vitoriano* (papéis artesanais, bordas douradas, tipografia clássica) em **qualquer dispositivo**, mantendo leitura ágil e navegação sem atrito.
2. **Mobile-First & Fluididade Absoluta**:
   - Não pensar apenas em "quebras bruscas" (breakpoints), mas em **comportamento elástico** usando `clamp()`, `min()`, `max()` e unidades relativas (`rem`, `ch`, `%`, `vw`, `dvh`).
   - Dispositivos móveis são a principal forma de acesso dos convidados: tudo deve ser operável perfeitamente com uma mão só (polegar).
3. **Ergonomia ao Toque (Touch-First)**:
   - Alvos de toque (touch targets) mínimos de **44 × 44px** (recomendado **48 × 48px** para ações críticas).
   - Espaçamento de segurança mínimo de 8px entre controles clicáveis adjacentes para evitar toques acidentais.
4. **Sem Overflow Horizontal Involuntário**:
   - Regra de ouro: `overflow-x: hidden` no `body` é salva-vidas, mas o layout intrínseco não deve vazar. `max-width: 100%`, `box-sizing: border-box`, `min-width: 0` em flex children e `word-break: break-word` em textos longos.
5. **Feedback Visual Imediato**:
   - Estados visuais claros para `:hover`, `:active`, `:focus-visible` e estados desabilitados/carregando.

---

## 📐 2. Sistema Padronizado de Breakpoints

Evite quebras aleatórias (ex.: 760px em um lugar, 768px em outro, 980px em outro). Adote a grade canônica:

| Nome do Token | Intervalo de Resolução | Dispositivo Típico | Comportamento Principal |
| :--- | :--- | :--- | :--- |
| **`xs` (Mobile Compacto)** | `320px — 479px` | iPhone SE, Galaxy A, telas estreitas | 1 coluna, gaveta colapsada, padding lateral enxuto (12-16px), botões full-width, bottom sheets |
| **`sm` (Mobile Grande)** | `480px — 767px` | iPhone Pro Max, Pixel, telas grandes | 1 a 2 colunas elásticas, cards arejados |
| **`md` (Tablet / Foldable)** | `768px — 1023px` | iPad Portrait, Surface, tablets | Transição de menus, 2 colunas no catálogo, filtros horizontais colapsáveis |
| **`lg` (Desktop / Laptop)** | `1024px — 1439px` | MacBooks, Laptops HD, Telas comuns | Navegação de topo expandida, 3 a 4 colunas, folhagens decorativas completas |
| **`xl` (Ultra-Wide)** | `≥ 1440px` | Monitores 2K/4K | Container máximo contido (`max-width: 1360px` a `1440px`), centralizado com margens generosas |

> 📖 **Consulte os detalhes técnicos em**: [responsive-breakpoints.md](./references/responsive-breakpoints.md)

---

## 🪟 3. Padrões Específicos para Componentes Críticos

### A. Cabeçalho e Brand (Michèlé Joohann)
- **Desktop**: Título, brasão com respiro amplo e barra de navegação/ações visíveis.
- **Mobile (< 768px)**:
  - Brasão MJ e monograma redimensionados suavemente (`clamp(40px, 8vw, 64px)`).
  - Gaveta de submenus (gaveta suspensa tátil) acessível via toque na marca ou botão hamburger dedicado com alvo mínimo de 48px.
  - Barra de busca retrátil sem empurrar layout ou quebrar linha bruscamente.

### B. Folhagens Laterais de Fundo (`.foliage-frame`)
- **Desktop**: Moldura botânica artística com opacidade equilibrada nas laterais (`fixed`, `pointer-events: none`).
- **Telas Médias (≤ 1024px)**: Reduzir largura e afastar da área de leitura central.
- **Mobile (≤ 768px)**: Desativar ou reduzir opacidade para `<= 0.12` / ocultar, garantindo que o texto e os cards tenham 100% de legibilidade e zero interferência de clique.

### C. Cards de Produtos (`.product-card`)
- **Proporção de Imagem**: Usar `aspect-ratio: 4 / 3` ou `1 / 1` com `object-fit: cover` para evitar Content Layout Shift (CLS).
- **Conteúdo Flexível**: Títulos longos não devem quebrar a altura dos cards vizinhos. Usar display `flex` com `flex-direction: column` e `margin-top: auto` nas ações (botões).
- **Mobile Grid**: No mobile, card com largura cheia ou `grid-template-columns: 1fr` (ou `repeat(auto-fill, minmax(280px, 1fr))`).

### D. Modais e Diálogos (`GiftModal`, `ProductEditorModal`)
- **Desktop**: Modal centralizado flutuante com backdrop blur suave (`max-width: 620px` a `800px`).
- **Mobile (< 768px)**: Padrão **Bottom Sheet** (folha que sobe do rodapé):
  - `position: fixed; bottom: 0; left: 0; right: 0; width: 100%;`
  - Borda arredondada no topo (`border-radius: 24px 24px 0 0;`)
  - Alça tátil de puxar (drag handle indicator) no topo.
  - Altura máxima `max-height: 90dvh` com scroll interno suave (`-webkit-overflow-scrolling: touch`).
  - Prevenção do bug do teclado virtual usando `100dvh` em vez de `100vh`.

---

## 📋 4. Checklist de Auditoria UX & Responsividade

Antes de considerar qualquer melhoria de interface pronta, execute o seguinte checklist:

- [ ] **Teste 320px**: A tela do menor smartphone (ex: iPhone SE antigo / Galaxy Fold fechado) não gera scroll horizontal?
- [ ] **Teste 375px - 414px**: Textos, títulos e botões têm quebras harmônicas de linha?
- [ ] **Touch Targets**: Todos os botões, links e ícones têm pelo menos 44x44px de área de clique?
- [ ] **Safe Areas**: Modais, barras de navegação e rodapés respeitam `env(safe-area-inset-bottom)` e `env(safe-area-inset-top)` para iPhones com notch/Dynamic Island?
- [ ] **Tipografia Fluida**: Títulos usam `clamp(min, preferred, max)` sem ultrapassar o container?
- [ ] **Contraste & Cores**: Relação de contraste mínima de 4.5:1 para texto normal sobre fundo pergaminho?
- [ ] **Teclado Virtual**: Modais de formulário deixam os botões de ação e campos visíveis ao abrir o teclado no mobile?

> 📖 **Checklist completo e detalhado**: [audit-checklist.md](./references/audit-checklist.md)

---

## 🛠️ 5. Ferramentas e Procedimentos do Agente

1. **Inspecione o CSS antes de alterar**: Verifique se variáveis e tokens globais já existem em [global.css](file:///c:/Users/miche/OneDrive/Área%20de%20Trabalho/JardimDosDesejos/src/styles/global.css).
2. **Consolide Media Queries**: Agrupe estilos responsivos por bloco de componente ou mantenha as regras sob os breakpoints padronizados (480px, 768px, 1024px, 1440px).
3. **Valide no Navegador**: Use o subagente de navegação (`browser_subagent`) para testar resoluções de 375px (mobile) e 1280px (desktop) e conferir visualmente as mudanças.
