import { useEffect, useMemo, useState } from 'react';
import { formatCurrencyBRL, saveProduct } from '../services/productService.js';
import { generateGiftSuggestions } from '../services/giftSuggestions.js';

const DEFAULT_CATEGORIES = [
  { value: 'casa', label: '🏡 Casa' },
  { value: 'tecnologia', label: '💻 Tecnologia' },
  { value: 'moda', label: '👗 Vestuário' },
  { value: 'calcados', label: '👠 Calçados' },
  { value: 'beleza', label: '✨ Beleza & Autocuidado' },
  { value: 'joias', label: '💍 Joias' },
  { value: 'livros', label: '📚 Livros' },
  { value: 'arte', label: '🎨 Arte e espiritualidade' },
  { value: 'jardim', label: '🌳 Jardim externo' },
  { value: 'pets', label: '🐾 Pets' },
];

export const POSITION_PRESETS = [
  { value: 'left top', label: 'Superior Esquerdo', shortLabel: 'Sup. Esq', icon: '↖' },
  { value: 'top', label: 'Superior / Topo', shortLabel: 'Topo', icon: '⬆' },
  { value: 'right top', label: 'Superior Direito', shortLabel: 'Sup. Dir', icon: '↗' },
  { value: 'left', label: 'Esquerda', shortLabel: 'Esquerda', icon: '⬅' },
  { value: 'center', label: 'Centro (Padrão)', shortLabel: 'Centro', icon: '⏺' },
  { value: 'right', label: 'Direita', shortLabel: 'Direita', icon: '➡' },
  { value: 'left bottom', label: 'Inferior Esquerdo', shortLabel: 'Inf. Esq', icon: '↙' },
  { value: 'bottom', label: 'Inferior / Base', shortLabel: 'Base', icon: '⬇' },
  { value: 'right bottom', label: 'Inferior Direito', shortLabel: 'Inf. Dir', icon: '↘' },
];

export const POSITION_LABELS = {
  'top': '⬆️ Topo (Superior)',
  'center top': '⬆️ Topo (Superior)',
  'bottom': '⬇️ Base (Inferior)',
  'center bottom': '⬇️ Base (Inferior)',
  'center': '⏺️ Centro (Padrão)',
  'left': '⬅️ Esquerda',
  'right': '➡️ Direita',
  'left top': '↖️ Superior Esquerdo',
  'right top': '↗️ Superior Direito',
  'left bottom': '↙️ Inferior Esquerdo',
  'right bottom': '↘️ Inferior Direito',
};

export default function ProductEditor({ product, onBack, onSaved, onNavigateHome }) {
  const isEditing = Boolean(product?.id);
  const baseUrl = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');

  const [formData, setFormData] = useState({
    name: product?.name || '',
    category: product?.category || 'casa',
    subcategory: product?.subcategory || '',
    collection: product?.collection || '',
    price: product?.price != null ? String(product.price) : '',
    priceLabel: product?.priceLabel || '',
    priority: product?.priority || product?.prioridade || 'alta',
    imageUrl: product?.imageUrl || product?.image || '',
    imagePosition: product?.imagePosition || 'center',
    imageFit: product?.imageFit || 'cover',
    url: product?.url || '',
    store: product?.store || '',
    description: product?.description || '',
    dream: product?.dream || '',
    story: product?.story || '',
    meanings: Array.isArray(product?.meanings) ? product.meanings.join(', ') : (product?.meanings || ''),
    sizes: Array.isArray(product?.sizes) ? product.sizes.join(', ') : (product?.sizes || ''),
    notes: Array.isArray(product?.notes) ? product.notes.join(', ') : (product?.notes || ''),
    quantityDesired: product?.quantityDesired ? String(product.quantityDesired) : '1',
    enabled: product ? (product.enabled !== false && product.published !== false && product.visible !== false) : true,
  });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [previewImageError, setPreviewImageError] = useState(false);
  const [appliedSuggestionNotice, setAppliedSuggestionNotice] = useState('');
  const [framingViewMode, setFramingViewMode] = useState('card'); // 'card' | 'guides' | 'modal'
  const [showGridRule, setShowGridRule] = useState(true);

  // Coordenadas visuais da mira de ponto focal (em %)
  const focalCoords = useMemo(() => {
    const pos = formData.imagePosition || 'center';
    switch (pos) {
      case 'left top': return { x: 18, y: 18 };
      case 'top':
      case 'center top': return { x: 50, y: 15 };
      case 'right top': return { x: 82, y: 18 };
      case 'left': return { x: 18, y: 50 };
      case 'center': return { x: 50, y: 50 };
      case 'right': return { x: 82, y: 50 };
      case 'left bottom': return { x: 18, y: 82 };
      case 'bottom':
      case 'center bottom': return { x: 50, y: 85 };
      case 'right bottom': return { x: 82, y: 82 };
      default: {
        const parts = pos.split(' ');
        if (parts.length === 2 && parts[0].endsWith('%') && parts[1].endsWith('%')) {
          return { x: parseFloat(parts[0]), y: parseFloat(parts[1]) };
        }
        return { x: 50, y: 50 };
      }
    }
  }, [formData.imagePosition]);

  // Sugestões geradas dinamicamente com base no nome do produto
  const activeSuggestions = useMemo(() => {
    if (!formData.name.trim()) return null;
    return generateGiftSuggestions(formData.name, formData.category);
  }, [formData.name, formData.category]);

  // Rola suavemente ao topo ao abrir o editor
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Atalho de teclado: Ctrl+S ou Cmd+S para salvar rapidamente
  useEffect(() => {
    function handleKeyDown(event) {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        if (!busy) {
          submitForm();
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [formData, busy]);

  function handleChange(field, value) {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'price' && (!prev.priceLabel || prev.priceLabel === formatCurrencyBRL(prev.price))) {
        updated.priceLabel = formatCurrencyBRL(value);
      }
      return updated;
    });
    if (field === 'imageUrl') {
      setPreviewImageError(false);
    }
  }

  function handleAutoFormatPrice() {
    if (formData.price) {
      handleChange('priceLabel', formatCurrencyBRL(formData.price));
    }
  }

  // Aplica todas as sugestões (prioridade, textos carinhosos, sonho, história, coleção)
  function handleApplyAllSuggestions() {
    if (!activeSuggestions) return;

    setFormData(prev => ({
      ...prev,
      category: activeSuggestions.category || prev.category,
      subcategory: activeSuggestions.subcategory || prev.subcategory,
      collection: activeSuggestions.collection || prev.collection,
      priority: activeSuggestions.priority || prev.priority,
      description: activeSuggestions.description || prev.description,
      dream: activeSuggestions.dream || prev.dream,
      story: activeSuggestions.story || prev.story,
      meanings: activeSuggestions.meanings?.length ? activeSuggestions.meanings.join(', ') : prev.meanings,
    }));

    setAppliedSuggestionNotice('✨ Sugestões de carinho e prioridade aplicadas com sucesso!');
    setTimeout(() => setAppliedSuggestionNotice(''), 4500);
  }

  // Aplica sugestão pontual para um único campo
  function handleApplySingle(field) {
    if (!activeSuggestions) return;
    if (field === 'meanings') {
      handleChange('meanings', activeSuggestions.meanings.join(', '));
    } else if (activeSuggestions[field]) {
      handleChange(field, activeSuggestions[field]);
    }
  }

  // Permite clicar diretamente na imagem de prévia para definir o ponto focal de forma interativa
  function handlePreviewMediaClick(e) {
    if (!processedPreviewImage || previewImageError) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relY = (e.clientY - rect.top) / rect.height;
    const relX = (e.clientX - rect.left) / rect.width;

    let vPos = 'center';
    if (relY < 0.33) vPos = 'top';
    else if (relY > 0.67) vPos = 'bottom';

    let hPos = 'center';
    if (relX < 0.33) hPos = 'left';
    else if (relX > 0.67) hPos = 'right';

    let newPos = 'center';
    if (vPos === 'center' && hPos === 'center') newPos = 'center';
    else if (vPos === 'center') newPos = hPos;
    else if (hPos === 'center') newPos = vPos;
    else newPos = `${hPos} ${vPos}`;

    handleChange('imagePosition', newPos);
  }

  async function submitForm() {
    if (!formData.name.trim()) {
      setError('Por favor, informe o nome do presente.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setBusy(true);
    setError('');

    try {
      const savedId = await saveProduct(formData, product?.id || null);
      if (onSaved) {
        onSaved({ ...formData, id: savedId });
      }
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Erro ao gravar o presente no banco de dados.');
      setBusy(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    submitForm();
  }

  // Tratamento da imagem da prévia
  const rawPreviewImage = formData.imageUrl;
  const processedPreviewImage = rawPreviewImage?.startsWith('/') && !rawPreviewImage.startsWith(baseUrl)
    ? `${baseUrl}${rawPreviewImage}`
    : rawPreviewImage;

  return (
    <div className="admin-editor-page" role="region" aria-label="Editor de Presente">
      {/* BARRA SUPERIOR DE NAVEGAÇÃO DO EDITOR */}
      <header className="admin-editor-top-nav">
        <div className="admin-editor-nav-left">
          <button
            type="button"
            className="admin-back-btn"
            onClick={onBack}
            disabled={busy}
            title="Voltar para a lista gerencial de presentes"
          >
            ← Voltar para a Lista
          </button>
          <div className="admin-editor-breadcrumbs">
            <span className="crumb-root">Gestão do Jardim</span>
            <span className="crumb-sep">/</span>
            <span className="crumb-current">{isEditing ? 'Editar Presente' : 'Novo Presente'}</span>
          </div>
        </div>

        <div className="admin-editor-nav-actions">
          {/* TOGGLE RÁPIDO DE STATUS NA BARRA */}
          <button
            type="button"
            className={`admin-editor-status-pill ${formData.enabled ? 'is-enabled' : 'is-disabled'}`}
            onClick={() => handleChange('enabled', !formData.enabled)}
            title="Alternar visibilidade do produto na vitrine pública"
          >
            {formData.enabled ? '🟢 Visível no Site' : '⚪ Oculto no Site'}
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={onBack}
            disabled={busy}
          >
            Cancelar
          </button>

          <button
            type="button"
            className="primary-button admin-save-btn"
            onClick={submitForm}
            disabled={busy}
          >
            {busy ? 'Gravando…' : (isEditing ? 'Salvar Alterações ✨' : 'Adicionar ao Jardim ✨')}
          </button>
        </div>
      </header>

      {/* CABEÇALHO COM TÍTULO E SUBTÍTULO */}
      <div className="admin-editor-headline">
        <div>
          <span className="section-kicker">
            {isEditing ? 'Edição de Presente em Tela Cheia' : 'Novo Presente no Catálogo'}
          </span>
          <h1 className="admin-editor-title">
            {isEditing ? formData.name || 'Editando Presente' : 'Cadastrar Novo Presente'}
          </h1>
          <p className="admin-editor-subtitle">
            {isEditing
              ? `Edição fluída em página inteira sem rolagem horizontal. Suas alterações são salvas diretamente no Firestore.`
              : 'Cadastre com amor e detalhes o item desejado. As sugestões inteligentes ajudam a preencher os textos com carinho.'}
          </p>
        </div>

        {onNavigateHome && (
          <button
            type="button"
            className="admin-view-site-link"
            onClick={onNavigateHome}
            title="Ir para a vitrine pública do catálogo"
          >
            Ver Vitrine do Jardim ↗
          </button>
        )}
      </div>

      {error && <p className="notice error admin-editor-notice" role="alert">{error}</p>}
      {appliedSuggestionNotice && (
        <p className="notice success admin-editor-notice" role="alert">{appliedSuggestionNotice}</p>
      )}

      {/* FORMULÁRIO COM LAYOUT EM PÁGINA INTEIRA (SEM SCROLL HORIZONTAL) */}
      <form onSubmit={handleSubmit} className="admin-editor-layout admin-editor-fullwidth-flow">
        {/* CARD 1: IDENTIFICAÇÃO DO PRESENTE */}
        <section className="admin-card-section">
          <div className="admin-card-header">
            <span className="admin-card-step">1</span>
            <div>
              <h2>Identificação do Presente</h2>
              <p>Nome, categoria botânica e coleção especial a que pertence.</p>
            </div>
          </div>

          <div className="admin-field-group">
            <label className="editor-label">
              <span className="label-text">Nome do Presente *</span>
              <div className="editor-input-with-action">
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => handleChange('name', e.target.value)}
                  placeholder="Ex: Cafeteira Nespresso Vertuo, Workstation Branca 1,30m, Jogo de Lençóis 400 Fios…"
                  required
                  autoFocus={!isEditing}
                  className="admin-input-lg"
                />
                {formData.name.trim() && (
                  <button
                    type="button"
                    className="editor-suggestion-action-btn"
                    onClick={handleApplyAllSuggestions}
                    title="Sugerir automaticamente prioridade, sonho, história e textos inteligentes"
                  >
                    🪄 Sugerir Tudo
                  </button>
                )}
              </div>
            </label>

            {/* CARD DE SUGESTÃO DETECTADA */}
            {activeSuggestions && (
              <div className="editor-smart-suggestion-pill">
                <div className="suggestion-pill-header">
                  <span>🪄 <strong>Sugestão inteligente para "{formData.name}":</strong></span>
                  <button
                    type="button"
                    className="suggestion-pill-apply-btn"
                    onClick={handleApplyAllSuggestions}
                  >
                    Aplicar sugestão completa com 1 clique
                  </button>
                </div>
                <div className="suggestion-pill-preview">
                  <span className="suggestion-tag">
                    Categoria: <strong>{DEFAULT_CATEGORIES.find(c => c.value === activeSuggestions.category)?.label || activeSuggestions.category}</strong>
                  </span>
                  <span className="suggestion-tag">
                    Prioridade: <strong>{activeSuggestions.priority === 'alta' ? '⭐ Alta' : activeSuggestions.priority === 'media' ? '🌸 Média' : '🌰 Baixa'}</strong>
                  </span>
                  <span className="suggestion-tag">
                    Jardim: <strong>{activeSuggestions.subcategory}</strong>
                  </span>
                  <span className="suggestion-tag">
                    Coleção: <strong>{activeSuggestions.collection}</strong>
                  </span>
                </div>
                <small className="suggestion-reason">{activeSuggestions.priorityReason}</small>
              </div>
            )}

            <div className="editor-grid-3">
              <label className="editor-label">
                <span className="label-text">Coleção / Categoria *</span>
                <div className="editor-input-with-action">
                  <select
                    value={formData.category}
                    onChange={e => handleChange('category', e.target.value)}
                  >
                    {DEFAULT_CATEGORIES.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                  {activeSuggestions?.category && formData.category !== activeSuggestions.category && (
                    <button
                      type="button"
                      className="editor-mini-action"
                      onClick={() => handleApplySingle('category')}
                      title={`Sugerir categoria "${DEFAULT_CATEGORIES.find(c => c.value === activeSuggestions.category)?.label || activeSuggestions.category}"`}
                    >
                      🪄
                    </button>
                  )}
                </div>
              </label>

              <label className="editor-label">
                <span className="label-text">Jardim / Subcategoria</span>
                <div className="editor-input-with-action">
                  <input
                    type="text"
                    value={formData.subcategory}
                    onChange={e => handleChange('subcategory', e.target.value)}
                    placeholder="Ex: Cozinha, Quarto, Escritório…"
                  />
                  {activeSuggestions?.subcategory && formData.subcategory !== activeSuggestions.subcategory && (
                    <button
                      type="button"
                      className="editor-mini-action"
                      onClick={() => handleApplySingle('subcategory')}
                      title={`Sugerir "${activeSuggestions.subcategory}"`}
                    >
                      🪄
                    </button>
                  )}
                </div>
              </label>

              <label className="editor-label">
                <span className="label-text">Nome da Coleção Especial</span>
                <div className="editor-input-with-action">
                  <input
                    type="text"
                    value={formData.collection}
                    onChange={e => handleChange('collection', e.target.value)}
                    placeholder="Ex: Escritório dos Sonhos"
                  />
                  {activeSuggestions?.collection && formData.collection !== activeSuggestions.collection && (
                    <button
                      type="button"
                      className="editor-mini-action"
                      onClick={() => handleApplySingle('collection')}
                      title={`Sugerir "${activeSuggestions.collection}"`}
                    >
                      🪄
                    </button>
                  )}
                </div>
              </label>
            </div>
          </div>
        </section>

        {/* CARD 2: VALORES, PRIORIDADE & STATUS NA VITRINE */}
        <section className="admin-card-section">
          <div className="admin-card-header">
            <span className="admin-card-step">2</span>
            <div>
              <h2>Valores, Prioridade & Visibilidade</h2>
              <p>Defina o valor em reais, o formato de exibição, a importância e se o item está visível na vitrine.</p>
            </div>
          </div>

          <div className="admin-field-group">
            <div className="editor-grid-4">
              <label className="editor-label">
                <span className="label-text">Valor Numérico (R$)</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={e => handleChange('price', e.target.value)}
                  placeholder="Ex: 350.00"
                />
              </label>

              <label className="editor-label">
                <span className="label-text">Texto do Valor Exibido</span>
                <div className="editor-input-with-action">
                  <input
                    type="text"
                    value={formData.priceLabel}
                    onChange={e => handleChange('priceLabel', e.target.value)}
                    placeholder="Ex: R$ 350,00 ou Sob consulta"
                  />
                  {formData.price && (
                    <button
                      type="button"
                      className="editor-mini-action"
                      onClick={handleAutoFormatPrice}
                      title="Formatar automaticamente em Real (BRL)"
                    >
                      🪄 Auto
                    </button>
                  )}
                </div>
              </label>

              <label className="editor-label">
                <span className="label-text">Nível de Prioridade</span>
                <div className="editor-input-with-action">
                  <select
                    value={formData.priority}
                    onChange={e => handleChange('priority', e.target.value)}
                  >
                    <option value="alta">⭐ Alta / Essencial</option>
                    <option value="media">🌸 Média prioridade</option>
                    <option value="baixa">🌰 Baixa prioridade</option>
                  </select>
                  {activeSuggestions && formData.priority !== activeSuggestions.priority && (
                    <button
                      type="button"
                      className="editor-mini-action"
                      onClick={() => handleApplySingle('priority')}
                      title={`Sugerir prioridade ${activeSuggestions.priority}`}
                    >
                      🪄
                    </button>
                  )}
                </div>
              </label>

              <label className="editor-label">
                <span className="label-text">Quantidade Desejada</span>
                <input
                  type="number"
                  min="1"
                  max="99"
                  value={formData.quantityDesired}
                  onChange={e => handleChange('quantityDesired', e.target.value)}
                  placeholder="1"
                />
              </label>
            </div>

            {/* BANNER DE VISIBILIDADE INTEGRADO */}
            <div className={`editor-status-banner ${formData.enabled ? 'is-enabled' : 'is-disabled'}`}>
              <div className="editor-status-info">
                <span className="editor-status-icon">{formData.enabled ? '🟢' : '⚪'}</span>
                <div>
                  <strong>{formData.enabled ? 'Item Habilitado para Visitantes' : 'Item Desabilitado (Oculto na Vitrine)'}</strong>
                  <p>
                    {formData.enabled
                      ? 'Este presente fica visível e disponível para escolha de todos os convidados no catálogo.'
                      : 'Este presente fica salvo no banco de dados, mas permanece oculto para visitantes do site.'}
                  </p>
                </div>
              </div>

              <label className="editor-status-toggle">
                <input
                  type="checkbox"
                  checked={formData.enabled}
                  onChange={e => handleChange('enabled', e.target.checked)}
                />
                <span className="editor-toggle-track">
                  <span className="editor-toggle-thumb"></span>
                </span>
                <span className="editor-toggle-text">
                  {formData.enabled ? 'Habilitado' : 'Desabilitado'}
                </span>
              </label>
            </div>
          </div>
        </section>

        {/* CARD 3: MÍDIA, LOJA & PRÉVIA AO VIVO */}
        <section className="admin-card-section">
          <div className="admin-card-header">
            <span className="admin-card-step">3</span>
            <div>
              <h2>Imagem, Loja & Prévia ao Vivo</h2>
              <p>Insira a foto e o link de compra, e acompanhe ao lado como o presente aparecerá na vitrine.</p>
            </div>
          </div>

          <div className="editor-media-preview-grid">
            {/* LADO ESQUERDO: CAMPOS DE MÍDIA E LOJA */}
            <div className="editor-media-fields">
              <label className="editor-label">
                <span className="label-text">URL da Imagem do Presente</span>
                <input
                  type="url"
                  value={formData.imageUrl}
                  onChange={e => handleChange('imageUrl', e.target.value)}
                  placeholder="https://exemplo.com/foto-do-produto.jpg"
                />
                <span className="editor-hint">
                  Link público direto para a foto (JPG, PNG ou WebP).
                </span>
              </label>

              {/* SELEÇÃO DO ENQUADRAMENTO DA IMAGEM COM SIMULADOR AO VIVO */}
              <div className="editor-framing-control">
                <div className="framing-header">
                  <div className="framing-title-group">
                    <span className="label-text">📐 Enquadramento & Ponto Focal</span>
                    <span className="framing-current-badge">
                      {POSITION_LABELS[formData.imagePosition || 'center'] || '⏺️ Centro (Padrão)'}
                    </span>
                  </div>
                  <span className="framing-mode-badge">
                    {formData.imageFit === 'contain' ? '🔲 Sem Cortes' : '🖼️ Preenchido'}
                  </span>
                </div>
                <p className="editor-hint">
                  Ajuste onde a foto é centralizada ou selecione modo sem cortes para exibir a imagem por completo.
                </p>

                {/* MODO DE AJUSTE: COBRIR VS CONTER */}
                <div className="framing-fit-row">
                  <span className="framing-sublabel">Modo de Exibição:</span>
                  <div className="framing-fit-buttons" role="radiogroup" aria-label="Modo de Exibição da Imagem">
                    <button
                      type="button"
                      className={`framing-fit-btn ${(!formData.imageFit || formData.imageFit === 'cover') ? 'active' : ''}`}
                      onClick={() => handleChange('imageFit', 'cover')}
                      title="Preenche todo o card, focando na região escolhida abaixo"
                    >
                      🖼️ Preencher Card (Cover)
                    </button>
                    <button
                      type="button"
                      className={`framing-fit-btn ${formData.imageFit === 'contain' ? 'active' : ''}`}
                      onClick={() => handleChange('imageFit', 'contain')}
                      title="Exibe a foto inteira sem cortar nenhuma borda, com moldura e fundo suave"
                    >
                      🔲 Foto Inteira (Sem Cortes)
                    </button>
                  </div>
                </div>

                {/* PALCO VISUAL DE PRÉ-VISUALIZAÇÃO DIRETA DO ENQUADRAMENTO */}
                <div className="framing-stage-container">
                  <div className="framing-stage-toolbar">
                    <div className="framing-stage-tabs" role="tablist" aria-label="Modo de visualização do enquadramento">
                      <button
                        type="button"
                        role="tab"
                        aria-selected={framingViewMode === 'card'}
                        className={`framing-tab-btn ${framingViewMode === 'card' ? 'active' : ''}`}
                        onClick={() => setFramingViewMode('card')}
                        title="Visualizar recorte exato do card no catálogo (proporção 4:3)"
                      >
                        🖼️ Card (4:3)
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={framingViewMode === 'guides'}
                        className={`framing-tab-btn ${framingViewMode === 'guides' ? 'active' : ''}`}
                        onClick={() => setFramingViewMode('guides')}
                        title="Visualizar a foto completa com máscara do corte ativo"
                      >
                        🔍 Foto Completa + Máscara
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={framingViewMode === 'modal'}
                        className={`framing-tab-btn ${framingViewMode === 'modal' ? 'active' : ''}`}
                        onClick={() => setFramingViewMode('modal')}
                        title="Visualizar formato do modal de presentear (1:1)"
                      >
                        ✨ Modal (1:1)
                      </button>
                    </div>

                    {framingViewMode === 'card' && (
                      <button
                        type="button"
                        className={`framing-grid-toggle ${showGridRule ? 'active' : ''}`}
                        onClick={() => setShowGridRule(prev => !prev)}
                        title="Alternar grade de composição (Regra dos Terços)"
                      >
                        {showGridRule ? '📐 Grade Ativa' : '📐 Grade Oculta'}
                      </button>
                    )}
                  </div>

                  {/* ÁREA DA FOTO INTERATIVA COM MIRA E RETÍCULO */}
                  <div
                    className={`framing-stage-viewport view-${framingViewMode} ${formData.imageFit === 'contain' ? 'is-contain' : ''}`}
                    onClick={handlePreviewMediaClick}
                    title="Toque ou clique em qualquer ponto da imagem para mover o ponto focal"
                  >
                    {processedPreviewImage && !previewImageError ? (
                      <>
                        {framingViewMode === 'guides' ? (
                          <div className="framing-full-with-guides">
                            <img
                              src={processedPreviewImage}
                              alt="Foto completa"
                              className="framing-guide-full-img"
                              onError={() => setPreviewImageError(true)}
                            />
                            {/* Máscara com janela de abertura proporcional */}
                            <div
                              className={`framing-guide-mask pos-${(formData.imagePosition || 'center').replace(' ', '-')}`}
                              aria-hidden="true"
                            >
                              <div className="framing-guide-aperture">
                                <span className="framing-aperture-label">Área Visível no Card (4:3)</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="framing-cropped-view">
                            <img
                              src={processedPreviewImage}
                              alt="Prévia de enquadramento"
                              className="framing-stage-img"
                              style={{
                                objectPosition: formData.imagePosition || 'center',
                                objectFit: formData.imageFit || 'cover',
                              }}
                              onError={() => setPreviewImageError(true)}
                            />

                            {/* GRADE DE REGRA DOS TERÇOS */}
                            {showGridRule && framingViewMode === 'card' && (
                              <div className="framing-thirds-grid" aria-hidden="true">
                                <span className="grid-line line-v1" />
                                <span className="grid-line line-v2" />
                                <span className="grid-line line-h1" />
                                <span className="grid-line line-h2" />
                              </div>
                            )}

                            {/* MIRA VISUAL DE PONTO FOCAL (RETICLE) */}
                            {formData.imageFit !== 'contain' && (
                              <div
                                className="framing-reticle"
                                style={{
                                  left: `${focalCoords.x}%`,
                                  top: `${focalCoords.y}%`,
                                }}
                                aria-hidden="true"
                              >
                                <div className="reticle-pulse" />
                                <div className="reticle-dot" />
                                <div className="reticle-crosshair-h" />
                                <div className="reticle-crosshair-v" />
                                <span className="reticle-badge">
                                  {POSITION_LABELS[formData.imagePosition || 'center'] || 'Centro'}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="framing-stage-empty">
                        <span className="empty-icon">🌿</span>
                        <p>Insira a URL de uma imagem para pré-visualizar o corte ao vivo.</p>
                      </div>
                    )}

                    <div className="framing-stage-footer-hint">
                      <span>🎯 Toque na foto para focar</span>
                      <span className="framing-active-css">
                        object-position: <code>{formData.imagePosition || 'center'}</code>
                      </span>
                    </div>
                  </div>
                </div>

                {/* MATRIZ VISUAL 3x3 DE PONTO FOCAL */}
                <div className="framing-matrix-wrapper">
                  <span className="framing-sublabel">Ponto Focal / Alinhamento do Corte:</span>
                  <div className="framing-matrix" role="radiogroup" aria-label="Ponto focal da imagem">
                    {POSITION_PRESETS.map(pos => {
                      const isActive = (formData.imagePosition || 'center') === pos.value;
                      return (
                        <button
                          key={pos.value}
                          type="button"
                          className={`framing-matrix-cell ${isActive ? 'active' : ''}`}
                          onClick={() => handleChange('imagePosition', pos.value)}
                          title={`Alinhar foto: ${pos.label}`}
                          aria-label={`Foco ${pos.label}`}
                          aria-pressed={isActive}
                        >
                          <span className="matrix-icon">{pos.icon}</span>
                          <span className="matrix-text">{pos.shortLabel}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ATALHOS MAIS FREQUENTES */}
                <div className="framing-quick-actions">
                  <span className="framing-sublabel">Atalhos mais usados:</span>
                  <div className="framing-chips">
                    <button
                      type="button"
                      className={`framing-chip ${formData.imagePosition === 'top' ? 'active' : ''}`}
                      onClick={() => handleChange('imagePosition', 'top')}
                      title="Foco no topo da imagem: ideal para vestidos, calçados altos ou luminárias"
                    >
                      ⬆️ Topo (Roupas & Salto)
                    </button>
                    <button
                      type="button"
                      className={`framing-chip ${(!formData.imagePosition || formData.imagePosition === 'center') ? 'active' : ''}`}
                      onClick={() => handleChange('imagePosition', 'center')}
                    >
                      ⏺️ Centro (Padrão)
                    </button>
                    <button
                      type="button"
                      className={`framing-chip ${formData.imagePosition === 'bottom' ? 'active' : ''}`}
                      onClick={() => handleChange('imagePosition', 'bottom')}
                      title="Foco na base da imagem"
                    >
                      ⬇️ Base (Detalhes Inferiores)
                    </button>
                  </div>
                </div>
              </div>

              <label className="editor-label">
                <span className="label-text">Link da Loja / Compra (URL)</span>
                <input
                  type="url"
                  value={formData.url}
                  onChange={e => handleChange('url', e.target.value)}
                  placeholder="https://amazon.com.br/dp/..."
                />
              </label>

              {formData.url && (
                <a
                  href={formData.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="admin-test-link"
                  title="Abrir o link em uma nova aba para testar"
                >
                  ↗ Testar Link da Loja em Nova Aba
                </a>
              )}

              <label className="editor-label">
                <span className="label-text">Nome da Loja</span>
                <input
                  type="text"
                  value={formData.store}
                  onChange={e => handleChange('store', e.target.value)}
                  placeholder="Ex: Amazon, Tok&Stok, Zara Home…"
                />
              </label>
            </div>

            {/* LADO DIREITO: PRÉVIA AO VIVO DO CARD NO CATÁLOGO */}
            <div className="editor-live-preview-box">
              <div className="preview-header-row">
                <span className="label-text">Prévia ao Vivo na Vitrine</span>
                <span className="preview-pill" title="Enquadramento ativo">
                  {POSITION_LABELS[formData.imagePosition || 'center'] || 'Centro'} · {formData.imageFit === 'contain' ? 'Sem Cortes' : 'Preenchido'}
                </span>
              </div>

              <div className="admin-live-card-wrapper">
                <article className="product-card admin-mock-card">
                  <div
                    className={`product-media ${formData.imageFit === 'contain' ? 'media-contain' : ''} is-clickable-preview`}
                    onClick={handlePreviewMediaClick}
                    title="Toque ou clique em qualquer região da foto para ajustar o foco do enquadramento"
                  >
                    {processedPreviewImage && !previewImageError ? (
                      <img
                        src={processedPreviewImage}
                        alt={formData.name || 'Prévia'}
                        loading="lazy"
                        onError={() => setPreviewImageError(true)}
                        style={{
                          objectPosition: formData.imagePosition || 'center',
                          objectFit: formData.imageFit || 'cover',
                        }}
                      />
                    ) : (
                      <span className="product-icon" aria-hidden="true">🌿</span>
                    )}
                    <span className="status-badge status-available">Disponível</span>
                  </div>

                  <div className="product-body">
                    <p className="collection-name">
                      {formData.collection || 'Coleção'}
                      {formData.subcategory ? ` · ${formData.subcategory}` : ''}
                    </p>
                    <h2>{formData.name || 'Nome do Presente'}</h2>
                    <p className="product-description">
                      {formData.description || 'A descrição acolhedora do presente aparecerá aqui para os convidados.'}
                    </p>

                    {formData.dream && (
                      <section className="dream-section">
                        <span className="dream-label">🌱 O sonho</span>
                        <p>{formData.dream}</p>
                      </section>
                    )}

                    <div className="admin-mock-footer">
                      <span className="table-price">
                        {formData.priceLabel || (formData.price ? `R$ ${formData.price}` : 'Sob consulta')}
                      </span>
                      <span className={`priority-badge priority-${String(formData.priority).toLowerCase()}`}>
                        {String(formData.priority).toLowerCase().includes('alta') ? '⭐ ' : ''}
                        {formData.priority === 'alta' ? 'Alta' : formData.priority === 'media' ? 'Média' : 'Baixa'}
                      </span>
                    </div>
                  </div>
                </article>
              </div>
            </div>
          </div>
        </section>

        {/* CARD 4: NARRATIVA DE CARINHO & HISTÓRIAS */}
        <section className="admin-card-section">
          <div className="admin-card-header">
            <span className="admin-card-step">4</span>
            <div>
              <h2>Narrativa de Carinho, Sonho & História</h2>
              <p>Os textos que encantam os convidados e revelam o significado de cada presente no seu coração.</p>
            </div>
          </div>

          <div className="admin-field-group">
            <label className="editor-label">
              <div className="editor-label-with-suggest">
                <span className="label-text">Descrição Acolhedora</span>
                {activeSuggestions && (
                  <button
                    type="button"
                    className="editor-text-suggest-btn"
                    onClick={() => handleApplySingle('description')}
                  >
                    🪄 Sugerir descrição
                  </button>
                )}
              </div>
              <textarea
                rows="2"
                value={formData.description}
                onChange={e => handleChange('description', e.target.value)}
                placeholder="Breve descrição dos atributos acolhedores do item…"
              />
            </label>

            <label className="editor-label">
              <div className="editor-label-with-suggest">
                <span className="label-text">🌱 O Sonho (Por que este presente é especial para você?)</span>
                {activeSuggestions && (
                  <button
                    type="button"
                    className="editor-text-suggest-btn"
                    onClick={() => handleApplySingle('dream')}
                  >
                    🪄 Sugerir sonho
                  </button>
                )}
              </div>
              <textarea
                rows="3"
                value={formData.dream}
                onChange={e => handleChange('dream', e.target.value)}
                placeholder="Ex: Sonho em ter um espaço inspirador para estudar e escrever minhas histórias…"
              />
            </label>

            <label className="editor-label">
              <div className="editor-label-with-suggest">
                <span className="label-text">📖 A História (Memória, significado ou motivo especial)</span>
                {activeSuggestions && (
                  <button
                    type="button"
                    className="editor-text-suggest-btn"
                    onClick={() => handleApplySingle('story')}
                  >
                    🪄 Sugerir história
                  </button>
                )}
              </div>
              <textarea
                rows="3"
                value={formData.story}
                onChange={e => handleChange('story', e.target.value)}
                placeholder="Uma memória, contexto ou motivo carinhoso…"
              />
            </label>

            <div className="editor-grid-3">
              <label className="editor-label">
                <div className="editor-label-with-suggest">
                  <span className="label-text">Significados (tags)</span>
                  {activeSuggestions && (
                    <button
                      type="button"
                      className="editor-text-suggest-btn"
                      onClick={() => handleApplySingle('meanings')}
                    >
                      🪄 Sugerir
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={formData.meanings}
                  onChange={e => handleChange('meanings', e.target.value)}
                  placeholder="Conforto, Harmonia, Criatividade"
                />
              </label>

              <label className="editor-label">
                <span className="label-text">Tamanhos / Medidas</span>
                <input
                  type="text"
                  value={formData.sizes}
                  onChange={e => handleChange('sizes', e.target.value)}
                  placeholder="M, 1,30 m, Branco"
                />
              </label>

              <label className="editor-label">
                <span className="label-text">Observações Importantes</span>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={e => handleChange('notes', e.target.value)}
                  placeholder="Tom carvalho, 110V, etc."
                />
              </label>
            </div>
          </div>
        </section>
      </form>

      {/* BARRA FIXA DE SALVAMENTO NO RODAPÉ */}
      <div className="admin-editor-sticky-bar">
        <div className="sticky-bar-info">
          <span className="sticky-bar-icon">🎁</span>
          <div>
            <strong>{formData.name || (isEditing ? 'Presente sem nome' : 'Novo Presente')}</strong>
            <small>
              {formData.enabled ? '🟢 Habilitado na vitrine' : '⚪ Desabilitado (oculto)'} · {formData.category} · (Ctrl + S para salvar)
            </small>
          </div>
        </div>

        <div className="sticky-bar-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={onBack}
            disabled={busy}
          >
            Descartar / Voltar
          </button>

          <button
            type="button"
            className="primary-button admin-save-btn"
            onClick={submitForm}
            disabled={busy}
          >
            {busy ? 'Gravando no Firestore…' : (isEditing ? 'Salvar Alterações ✨' : 'Adicionar ao Jardim ✨')}
          </button>
        </div>
      </div>
    </div>
  );
}
