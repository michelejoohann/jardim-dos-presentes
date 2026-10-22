# 📱 Guia de Ergonomia ao Toque & Mobile UX

Este documento detalha as diretrizes de usabilidade tátil, zonas de alcance do polegar e microinterações para o **Jardim dos Desejos**.

---

## 1. Regra das Zonas do Polegar (Thumb Zone)

Ao segurar um smartphone com uma mão, o usuário alcança certas áreas da tela com facilidade e outras com grande esforço:

```text
┌────────────────────────┐
│     ZONA DIFÍCIL       │  <- Acesso raro, logos, metadados secundários
│   (Requer 2 mãos)      │
├────────────────────────┤
│     ZONA CONFORTÁVEL   │  <- Conteúdo principal, leitura, cards
│       (Alcance fácil)  │
├────────────────────────┤
│     ZONA NATURAL       │  <- Ações primárias (Presentear, Confirmar, Filtros)
│  (Movimento natural)   │
└────────────────────────┘
```

### Decisões de Design para o Jardim:
1. **Botões de Ação Fixos / Destacados**: O botão principal de "Presentear" ou "Reservar" em modais deve ficar na parte inferior acessível, nunca isolado no topo.
2. **Gavetas e Menus**: Se a gaveta abre na lateral ou a partir da logo superior, ela deve ter botões grandes de fechamento e itens espaçados para toque ágil.

---

## 2. Padrão de Bottom Sheet para Modais no Mobile

Em telas `< 768px`, substituir modais flutuantes centralizados por **Bottom Sheets**:

```css
@media (max-width: 767px) {
  .gift-modal,
  .product-editor-modal {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    width: 100%;
    max-height: 88dvh;
    border-radius: 24px 24px 0 0;
    margin: 0;
    padding: 20px 18px;
    padding-bottom: max(24px, env(safe-area-inset-bottom));
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    transform: translateY(0);
    animation: slideUpSheet 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  /* Puxador tátil (Handle) */
  .modal-drag-handle {
    width: 38px;
    height: 4px;
    background: var(--gold-antique, #b38b45);
    opacity: 0.5;
    border-radius: 999px;
    margin: 0 auto 14px auto;
  }
}

@keyframes slideUpSheet {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
```

---

## 3. Alvos de Toque (Touch Target Minimums)

- **Tamanho Mínimo**: `44px × 44px` (padrão Apple HIG e WCAG 2.5.5).
- Se o ícone visual for pequeno (ex.: 20px), use padding transparente ou pseudo-elementos (`::after`) com tamanho de toque de 44px:
  ```css
  .icon-button {
    min-width: 44px;
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 8px;
    touch-action: manipulation; /* Evita delay de 300ms do duplo toque */
  }
  ```

---

## 4. Prevenção de Zoom Involuntário no iOS Safari

- No iOS, qualquer input com `font-size` menor que `16px` provoca zoom automático da página ao focar, quebrando a diagramação.
- **Regra**: Todos os `<input>`, `<textarea>` e `<select>` em mobile devem ter:
  ```css
  font-size: 16px; /* ou clamp(16px, 1rem, ...) */
  ```
- No `<meta name="viewport">` mantenha:
  ```html
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  ```
