# 📐 Guia de Breakpoints, Unidades Fluídas & Container Queries

Este documento estabelece as regras matemáticas e arquiteturais para layouts responsivos no **Jardim dos Desejos**.

---

## 1. Tokens Canônicos de Media Queries

Para manter o CSS previsível e fácil de manter, padronizamos as seguintes faixas:

```css
/* Mobile Extra Pequeno (iPhone SE, telas ultra estreitas) */
@media (max-width: 479px) {
  /* Ajustes finos para telas < 480px */
}

/* Mobile Geral (Smartphones em modo retrato) */
@media (max-width: 767px) {
  /* Regras de navegação móvel, gavetas e bottom sheets */
}

/* Tablets e Telas Médias (Retrato e telas dobráveis) */
@media (min-width: 768px) and (max-width: 1023px) {
  /* Transição de catálogo, 2 a 3 colunas */
}

/* Desktop Padrão e Laptops */
@media (min-width: 1024px) {
  /* Navegação completa, folhagens botânicas completas */
}

/* Telas Ultra-Wide (Monitores grandes) */
@media (min-width: 1440px) {
  /* Alinhamento contido, leitura confortável */
}
```

---

## 2. Tipografia Fluida com `clamp()`

Em vez de fixar fontes que exigem dezenas de media queries, aplicamos o padrão de interpolação elástica:

```css
:root {
  /* Título Principal (Hero Display) */
  --font-size-hero: clamp(2rem, 5vw + 1rem, 3.75rem);
  
  /* Título de Seção (H2) */
  --font-size-title: clamp(1.5rem, 3vw + 0.5rem, 2.5rem);
  
  /* Título de Card (H3) */
  --font-size-card: clamp(1.15rem, 1.8vw + 0.5rem, 1.45rem);
  
  /* Corpo de Texto */
  --font-size-body: clamp(0.9375rem, 0.4vw + 0.85rem, 1.0625rem);
  
  /* Legendas e Metadados */
  --font-size-small: clamp(0.75rem, 0.3vw + 0.7rem, 0.875rem);
}
```

### Regras de Ouro da Tipografia:
1. **Line-height proporcional**: Títulos grandes devem ter `line-height: 1.15` a `1.25`. Textos corridos de leitura devem ter `line-height: 1.5` a `1.65`.
2. **Largura Máxima de Leitura**: Parágrafos nunca devem ultrapassar `65ch` a `75ch` de largura, evitando cansaço visual.
3. **Quebras de Linha Intencionais**: No título principal do Jardim, evitar palavras órfãs com `text-wrap: balance` ou `text-wrap: pretty`.

---

## 3. Espaçamentos Fluidos (Spacing Scale)

```css
:root {
  --space-3xs: clamp(0.25rem, 0.2vw + 0.2rem, 0.375rem); /* 4px - 6px */
  --space-2xs: clamp(0.5rem, 0.3vw + 0.4rem, 0.75rem);   /* 8px - 12px */
  --space-xs:  clamp(0.75rem, 0.5vw + 0.6rem, 1rem);     /* 12px - 16px */
  --space-sm:  clamp(1rem, 0.8vw + 0.8rem, 1.5rem);      /* 16px - 24px */
  --space-md:  clamp(1.5rem, 1.2vw + 1.2rem, 2.25rem);   /* 24px - 36px */
  --space-lg:  clamp(2rem, 2vw + 1.5rem, 3.5rem);        /* 32px - 56px */
  --space-xl:  clamp(3rem, 3.5vw + 2rem, 5rem);          /* 48px - 80px */
}
```

---

## 4. Unidades de Viewport Modernas

- **Nunca use `height: 100vh`** para modais e overlays em dispositivos móveis. A barra de navegação retrátil dos navegadores (Safari iOS e Chrome Android) altera a altura visível, cortando botões no rodapé.
- **Use `100dvh` (Dynamic Viewport Height)** ou `min(100vh, 100dvh)` com fallback para navegadores antigos:
  ```css
  .modal-overlay {
    min-height: 100vh;
    min-height: 100dvh;
  }
  ```
- Para preenchimento seguro de telas com entalhes (Notch / Dynamic Island):
  ```css
  padding-bottom: max(16px, env(safe-area-inset-bottom));
  padding-top: max(16px, env(safe-area-inset-top));
  ```
