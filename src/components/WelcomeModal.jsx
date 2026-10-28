import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const IVY_SEGMENTS = [0, 1, 2, 3, 4, 5];

const TOUR_STEPS = [
  {
    id: 'colecoes',
    icon: '🌿',
    badge: 'Passo 1 de 4 • Canteiros',
    title: 'Filtros e Coleções',
    desktopSelector: '[data-tour="colecoes"]',
    mobileSelector: '[data-tour="mobile-filter"]',
    description:
      'Filtre os presentes por categorias como Casa, Vestuário, Calçados, Beleza e Joias para explorar apenas os canteiros do seu interesse.',
  },
  {
    id: 'ordenacao',
    icon: '✨',
    badge: 'Passo 2 de 4 • Organização',
    title: 'Ordenação e Prioridades',
    desktopSelector: '[data-tour="ordenacao"]',
    mobileSelector: '[data-tour="mobile-filter"]',
    description:
      'Organize os desejos por nível de Prioridade (🍃 Alta/Essencial, 🌸 Média ou 🌰 Baixa), por Menor/Maior Valor ou de A a Z.',
  },
  {
    id: 'busca',
    icon: '🔍',
    badge: 'Passo 3 de 4 • Pesquisa',
    title: 'Busca Instantânea',
    desktopSelector: '[data-tour="search"]',
    mobileSelector: '[data-tour="search"]',
    description:
      'Já tem uma ideia em mente? Clique na lupa para buscar rapidamente qualquer presente pelo nome, coleção ou história.',
  },
  {
    id: 'presentear',
    icon: '🎁',
    badge: 'Passo 4 de 4 • Gesto de Carinho',
    title: 'Marcação de Presentes e Lojas',
    desktopSelector: '.product-card .product-footer, .product-card',
    mobileSelector: '.product-card .product-footer, .product-card',
    description:
      'Use "Ver na loja ↗" para abrir a loja sugerida. Em "Presentear", marque "⏳ Vou comprar" (para reservar) ou "🌸 Já comprei", podendo assinar seu nome ou enviar como amigo secreto com uma mensagem!',
  },
];

function findVisibleTarget(step) {
  if (typeof document === 'undefined' || !step) return null;
  const isMobile = window.innerWidth < 768;
  const primarySelector = isMobile ? step.mobileSelector : step.desktopSelector;
  const fallbackSelector = isMobile ? step.desktopSelector : step.mobileSelector;

  const trySelectors = [primarySelector, fallbackSelector].filter(Boolean);
  for (const selectorList of trySelectors) {
    const selectors = selectorList.split(',').map(s => s.trim());
    for (const sel of selectors) {
      const elements = document.querySelectorAll(sel);
      for (const el of elements) {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        if (rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden') {
          return el;
        }
      }
    }
  }
  return null;
}

export default function WelcomeModal({ onClose, initialStage = 'welcome', baseUrl = '' }) {
  const [stage, setStage] = useState(initialStage); // 'welcome' | 'tour'
  const [stepIndex, setStepIndex] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState(null);
  const [tooltipStyle, setTooltipStyle] = useState({});
  const [arrowStyle, setArrowStyle] = useState({});
  const [tooltipPlacement, setTooltipPlacement] = useState('bottom');
  const tooltipRef = useRef(null);

  // Trava a rolagem apenas durante a Modal de Boas-Vindas inicial;
  // durante o Tour Guiado Contextual, permite rolar suavemente até os elementos destacados.
  useEffect(() => {
    if (stage !== 'welcome') return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [stage]);

  // Fecha com tecla ESC ou avança com setas durante o tour
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose();
      } else if (stage === 'tour' && event.key === 'ArrowRight') {
        if (stepIndex < TOUR_STEPS.length - 1) {
          setStepIndex(prev => prev + 1);
        } else {
          onClose();
        }
      } else if (stage === 'tour' && event.key === 'ArrowLeft') {
        if (stepIndex > 0) {
          setStepIndex(prev => prev - 1);
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stage, stepIndex, onClose]);

  const updateTourPosition = useCallback(() => {
    if (stage !== 'tour') return;
    const currentStep = TOUR_STEPS[stepIndex];
    const targetEl = findVisibleTarget(currentStep);

    if (!targetEl) {
      setSpotlightRect(null);
      setTooltipStyle({
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      });
      setTooltipPlacement('center');
      return;
    }

    const rect = targetEl.getBoundingClientRect();
    const pad = currentStep.id === 'presentear' ? 10 : 8;
    const spRect = {
      top: rect.top - pad,
      left: rect.left - pad,
      width: rect.width + pad * 2,
      height: rect.height + pad * 2,
      centerX: rect.left + rect.width / 2,
    };
    setSpotlightRect(spRect);

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 14;
    const maxTooltipWidth = Math.min(360, vw - margin * 2);
    const estimatedHeight = tooltipRef.current?.offsetHeight || 235;

    // Decide se o tooltip abre abaixo ou acima do elemento destacado
    const spaceBelow = vh - (spRect.top + spRect.height);
    const spaceAbove = spRect.top;
    const placeAbove = spaceBelow < estimatedHeight + 24 && spaceAbove > spaceBelow;

    const placement = placeAbove ? 'top' : 'bottom';
    setTooltipPlacement(placement);

    // Calcula posição horizontal mantendo dentro da tela
    let left = spRect.centerX - maxTooltipWidth / 2;
    left = Math.max(margin, Math.min(left, vw - maxTooltipWidth - margin));

    // Calcula posição vertical segura
    let top;
    if (placement === 'bottom') {
      top = Math.min(vh - estimatedHeight - margin, Math.max(margin, spRect.top + spRect.height + 14));
    } else {
      top = Math.max(margin, spRect.top - estimatedHeight - 14);
    }

    // Posição da setinha apontando para o centro do alvo
    const arrowLeft = Math.max(22, Math.min(maxTooltipWidth - 22, spRect.centerX - left));

    setTooltipStyle({
      top: `${Math.round(top)}px`,
      left: `${Math.round(left)}px`,
      width: `${Math.round(maxTooltipWidth)}px`,
    });
    setArrowStyle({
      left: `${Math.round(arrowLeft)}px`,
    });
  }, [stage, stepIndex]);

  // Rola suavemente até o elemento do passo atual quando o passo muda
  useEffect(() => {
    if (stage !== 'tour') return;
    const currentStep = TOUR_STEPS[stepIndex];
    const targetEl = findVisibleTarget(currentStep);

    if (targetEl) {
      if (currentStep.id === 'presentear') {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }

    // Atualiza posições imediatamente e durante a animação de scroll
    updateTourPosition();
    const t1 = setTimeout(updateTourPosition, 120);
    const t2 = setTimeout(updateTourPosition, 350);
    const t3 = setTimeout(updateTourPosition, 600);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [stage, stepIndex, updateTourPosition]);

  // Atualiza posição em tempo real ao rolar ou redimensionar a tela
  useEffect(() => {
    if (stage !== 'tour') return;
    window.addEventListener('resize', updateTourPosition, { passive: true });
    window.addEventListener('scroll', updateTourPosition, { passive: true });
    return () => {
      window.removeEventListener('resize', updateTourPosition);
      window.removeEventListener('scroll', updateTourPosition);
    };
  }, [stage, updateTourPosition]);

  function handleStartTour() {
    setStepIndex(0);
    setStage('tour');
  }

  function handleNextStep() {
    if (stepIndex < TOUR_STEPS.length - 1) {
      setStepIndex(prev => prev + 1);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      onClose();
    }
  }

  function handlePrevStep() {
    if (stepIndex > 0) {
      setStepIndex(prev => prev - 1);
    } else {
      setStage('welcome');
    }
  }

  // ============================================================================
  // ESTÁGIO 2: TOUR GUIADO CONTEXTUAL (SPOTLIGHT + TOOLTIPS FLUTUANTES)
  // ============================================================================
  if (stage === 'tour') {
    const currentStep = TOUR_STEPS[stepIndex];
    const isLastStep = stepIndex === TOUR_STEPS.length - 1;

    const tourElement = (
      <div className="tour-overlay-root" role="dialog" aria-modal="true" aria-label={currentStep.title}>
        {/* Camada clicável para fechar/pular se clicar fora */}
        <div className="tour-click-catcher" onClick={onClose} aria-hidden="true" />

        {/* Recorte Iluminado (Spotlight) ao redor do elemento real da página */}
        {spotlightRect && (
          <div
            className="tour-spotlight-ring"
            style={{
              top: `${spotlightRect.top}px`,
              left: `${spotlightRect.left}px`,
              width: `${spotlightRect.width}px`,
              height: `${spotlightRect.height}px`,
            }}
            aria-hidden="true"
          />
        )}

        {/* Tooltip Contextual Estilo Herbário Vitoriano */}
        <div
          ref={tooltipRef}
          className={`tour-tooltip-card placement-${tooltipPlacement}`}
          style={tooltipStyle}
          onClick={e => e.stopPropagation()}
        >
          {tooltipPlacement !== 'center' && (
            <div className="tour-tooltip-arrow" style={arrowStyle} aria-hidden="true" />
          )}

          {/* Adorno da Hera em Aquarela na lateral do Tooltip */}
          <img
            src={`${baseUrl}/images/ivy-vine.png`}
            alt=""
            className="tour-tooltip-ivy-watercolor"
            aria-hidden="true"
          />

          <button
            type="button"
            className="tour-tooltip-close"
            onClick={onClose}
            aria-label="Fechar tour guiado"
            title="Fechar tour"
          >
            ✕
          </button>

          <div className="tour-tooltip-header">
            <span className="tour-tooltip-icon" aria-hidden="true">{currentStep.icon}</span>
            <div>
              <span className="tour-tooltip-badge">{currentStep.badge}</span>
              <h3 className="tour-tooltip-title">{currentStep.title}</h3>
            </div>
          </div>

          <p className="tour-tooltip-desc">{currentStep.description}</p>

          <div className="tour-tooltip-footer">
            {/* Indicadores de progresso em pílulas douradas */}
            <div className="tour-progress-dots" aria-label={`Passo ${stepIndex + 1} de ${TOUR_STEPS.length}`}>
              {TOUR_STEPS.map((s, idx) => (
                <button
                  key={s.id}
                  type="button"
                  className={`tour-dot ${idx === stepIndex ? 'active' : ''} ${idx < stepIndex ? 'done' : ''}`}
                  onClick={() => setStepIndex(idx)}
                  aria-label={`Ir para passo ${idx + 1}: ${s.title}`}
                />
              ))}
            </div>

            <div className="tour-tooltip-actions">
              <button
                type="button"
                className="tour-btn-secondary"
                onClick={handlePrevStep}
              >
                {stepIndex === 0 ? '← Início' : '← Anterior'}
              </button>
              <button
                type="button"
                className="tour-btn-primary"
                onClick={handleNextStep}
              >
                {isLastStep ? 'Começar a Explorar 🌿' : 'Próximo →'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );

    return typeof document !== 'undefined' ? createPortal(tourElement, document.body) : tourElement;
  }

  // ============================================================================
  // ESTÁGIO 1: MODAL MÁGICA DE BOAS-VINDAS COM HERAS EM AQUARELA CONECTADAS
  // ============================================================================
  const modalElement = (
    <div
      className="modal-backdrop welcome-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-modal-title"
    >
      <div className="modal-card welcome-modal-card" onClick={event => event.stopPropagation()}>
        <button
          type="button"
          className="modal-close-button welcome-close-button"
          onClick={onClose}
          aria-label="Fechar boas-vindas"
          title="Fechar"
        >
          ✕
        </button>

        {/* Container rolável que envolve tanto o texto quanto a moldura de heras conectadas */}
        <div className="welcome-modal-scroll">
          <div className="welcome-modal-inner">
            {/* Partículas luminosas mágicas ao redor */}
            <div className="welcome-magic-sparkles" aria-hidden="true">
              <span className="magic-sparkle s1" />
              <span className="magic-sparkle s2" />
              <span className="magic-sparkle s3" />
              <span className="magic-sparkle s4" />
              <span className="magic-sparkle s5" />
              <span className="magic-sparkle s6" />
            </div>

            {/* Moldura de Heras Botânicas Conectadas Cobrindo 100% das Laterais */}
            <div className="welcome-ivy-frame" aria-hidden="true">
              <div className="welcome-ivy-branch-wrap welcome-ivy-branch-left">
                {IVY_SEGMENTS.map(idx => (
                  <img
                    key={`left-ivy-${idx}`}
                    src={`${baseUrl}/images/ivy-vine.png`}
                    alt=""
                    className="welcome-ivy-watercolor-segment"
                    loading="eager"
                  />
                ))}
              </div>
              <div className="welcome-ivy-branch-wrap welcome-ivy-branch-right">
                {IVY_SEGMENTS.map(idx => (
                  <img
                    key={`right-ivy-${idx}`}
                    src={`${baseUrl}/images/ivy-vine.png`}
                    alt=""
                    className="welcome-ivy-watercolor-segment"
                    loading="eager"
                  />
                ))}
              </div>
            </div>

            <div className="modal-drag-handle" aria-hidden="true" />

            <div className="welcome-modal-header">
              <div className="welcome-crest-wrapper">
                <img
                  src={`${baseUrl}/images/logo-michele-joohann.png`}
                  alt="Monograma Michèlé Joohann"
                  className="welcome-crest-img"
                  width="76"
                  height="76"
                />
              </div>
              <span className="section-kicker welcome-kicker">✨ Bem-vindo(a) ao Herbário ✨</span>
              <h2 id="welcome-modal-title">
                <span className="welcome-title-line">Que alegria receber você</span>
                <span className="welcome-title-line">no Jardim dos Presentes!</span>
              </h2>
              <div className="welcome-gratitude-block">
                <p className="welcome-greeting-highlight">
                  Olá seu lindo, muito obrigada por visitar este cantinho tão especial!
                </p>
                <p className="welcome-gratitude-text">
                  Cada item deste jardim foi cultivado com amor, significado e carinho para celebrar esta fase.
                  Sua presença e o seu afeto já tornam este momento inesquecível.
                </p>
              </div>
            </div>

            <div className="welcome-ornament-divider" aria-hidden="true">
              <span className="ornament-line" />
              <span className="ornament-icon">🌿 Passeio Guiado pelo Jardim 🌿</span>
              <span className="ornament-line" />
            </div>

            <p className="welcome-tour-teaser">
              Preparamos um <strong>tour rápido e interativo</strong> diretamente na página para mostrar onde ficam os{' '}
              <strong>filtros de coleções</strong>, a <strong>ordenação por prioridades</strong> e como funciona a{' '}
              <strong>marcação dos presentes</strong>.
            </p>

            <div className="welcome-modal-footer">
              <button
                type="button"
                className="primary-button welcome-enter-button"
                onClick={handleStartTour}
              >
                <span>Fazer Tour Rápido pelo Jardim</span>
                <span aria-hidden="true">✨</span>
              </button>

              <button
                type="button"
                className="welcome-skip-button"
                onClick={onClose}
              >
                Já conheço, quero explorar o Jardim agora 🌿
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalElement, document.body) : modalElement;
}
