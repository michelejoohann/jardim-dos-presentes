import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { formatCurrencyBRL, saveProduct } from '../services/productService.js';
import { generateGiftSuggestions } from '../services/giftSuggestions.js';

const DEFAULT_CATEGORIES = [
  { value: 'casa', label: '🏡 Casa' },
  { value: 'tecnologia', label: '💻 Tecnologia' },
  { value: 'moda', label: '👗 Vestuário' },
  { value: 'joias', label: '💍 Joias' },
  { value: 'livros', label: '📚 Livros' },
  { value: 'arte', label: '🎨 Arte e espiritualidade' },
  { value: 'jardim', label: '🌳 Jardim externo' },
  { value: 'pets', label: '🐾 Pets' },
];

export default function ProductEditorModal({ product, onClose, onSaved }) {
  const isEditing = Boolean(product?.id);

  const [formData, setFormData] = useState({
    name: product?.name || '',
    category: product?.category || 'casa',
    subcategory: product?.subcategory || '',
    collection: product?.collection || '',
    price: product?.price != null ? String(product.price) : '',
    priceLabel: product?.priceLabel || '',
    priority: product?.priority || product?.prioridade || 'alta',
    imageUrl: product?.imageUrl || product?.image || '',
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

  // Sugestão gerada dinamicamente com base no nome do produto
  const activeSuggestions = useMemo(() => {
    if (!formData.name.trim()) return null;
    return generateGiftSuggestions(formData.name, formData.category);
  }, [formData.name, formData.category]);

  // Trava scroll da página ao abrir o modal
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Fecha com ESC
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape' && !busy) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [busy, onClose]);

  function handleChange(field, value) {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      // Se alterou o preço e o label estava vazio ou era o formato anterior, sugere label automático
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

  // Aplica todas as sugestões (prioridade, textos afetivos, sonho, história, coleção)
  function handleApplyAllSuggestions() {
    if (!activeSuggestions) return;

    setFormData(prev => ({
      ...prev,
      category: activeSuggestions.category || prev.category,
      subcategory: prev.subcategory || activeSuggestions.subcategory,
      collection: prev.collection || activeSuggestions.collection,
      priority: activeSuggestions.priority || prev.priority,
      description: activeSuggestions.description || prev.description,
      dream: activeSuggestions.dream || prev.dream,
      story: activeSuggestions.story || prev.story,
      meanings: prev.meanings ? prev.meanings : activeSuggestions.meanings.join(', '),
    }));

    setAppliedSuggestionNotice('✨ Sugestões afetivas e prioridade aplicadas com sucesso!');
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

  async function handleSubmit(event) {
    event.preventDefault();
    if (!formData.name.trim()) {
      setError('Por favor, informe o nome do presente.');
      return;
    }

    setBusy(true);
    setError('');

    try {
      const savedId = await saveProduct(formData, product?.id || null);
      if (onSaved) {
        onSaved({ ...formData, id: savedId });
      }
      onClose();
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Erro ao gravar o presente no banco de dados.');
      setBusy(false);
    }
  }

  const modalElement = (
    <div className="modal-backdrop editor-modal-backdrop" onClick={busy ? undefined : onClose} role="dialog" aria-modal="true">
      <div className="modal-card editor-modal-card" onClick={e => e.stopPropagation()}>
        <button
          type="button"
          className="modal-close-button"
          onClick={onClose}
          disabled={busy}
          aria-label="Fechar editor"
        >
          ✕
        </button>

        <div className="modal-header">
          <span className="section-kicker">Gestão do Catálogo</span>
          <h2>{isEditing ? 'Editar Presente' : 'Novo Presente no Jardim'}</h2>
          <p className="editor-modal-subtitle">
            {isEditing
              ? `Atualizando "${product.name}" na base de dados do Firestore.`
              : 'Cadastre um novo desejo que ficará disponível na vitrine.'}
          </p>
        </div>

        {/* STATUS DE HABILITAÇÃO PARA VISUALIZAÇÃO NO SITE */}
        <div className={`editor-status-banner ${formData.enabled ? 'is-enabled' : 'is-disabled'}`}>
          <div className="editor-status-info">
            <span className="editor-status-icon">{formData.enabled ? '🟢' : '⚪'}</span>
            <div>
              <strong>
                {formData.enabled
                  ? 'Produto HABILITADO para visualização no site'
                  : 'Produto DESABILITADO (Oculto no site)'}
              </strong>
              <p>
                {formData.enabled
                  ? 'Este presente é visível normalmente para todos os visitantes do catálogo.'
                  : 'Este presente fica salvo no banco de dados, mas não aparecerá para os visitantes.'}
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

        <form className="editor-form" onSubmit={handleSubmit}>
          {/* SEÇÃO 1: IDENTIFICAÇÃO & SUGESTÃO INTELIGENTE */}
          <fieldset className="editor-fieldset">
            <legend className="editor-legend">1. Identificação do Presente</legend>

            <div className="editor-field-full">
              <label className="editor-label">
                Nome do Presente *
                <div className="editor-input-with-action">
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => handleChange('name', e.target.value)}
                    placeholder="Ex: Cafeteira Nespresso Vertuo, Workstation Branca 1,30m, Jogo de Lençóis 400 Fios…"
                    required
                  />
                  {formData.name.trim() && (
                    <button
                      type="button"
                      className="editor-suggestion-action-btn"
                      onClick={handleApplyAllSuggestions}
                      title="Gerar sugestão automática de prioridade, textos afetivos, sonho e história com base neste produto"
                    >
                      🪄 Sugerir Tudo
                    </button>
                  )}
                </div>
              </label>
            </div>

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
                    Aplicar sugestão padrão completa
                  </button>
                </div>
                <div className="suggestion-pill-preview">
                  <span className="suggestion-tag">Prioridade sugerida: <strong>{activeSuggestions.priority === 'alta' ? '⭐ Alta' : activeSuggestions.priority === 'media' ? '🌸 Média' : '🌰 Baixa'}</strong></span>
                  <span className="suggestion-tag">Jardim: <strong>{activeSuggestions.subcategory}</strong></span>
                  <span className="suggestion-tag">Coleção: <strong>{activeSuggestions.collection}</strong></span>
                </div>
                <small className="suggestion-reason">{activeSuggestions.priorityReason}</small>
              </div>
            )}

            {appliedSuggestionNotice && (
              <p className="notice success" style={{ margin: '6px 0 0' }}>{appliedSuggestionNotice}</p>
            )}

            <div className="editor-grid-3">
              <label className="editor-label">
                Coleção / Categoria
                <select
                  value={formData.category}
                  onChange={e => handleChange('category', e.target.value)}
                >
                  {DEFAULT_CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </label>

              <label className="editor-label">
                Jardim / Subcategoria
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
                Nome da Coleção Afetiva
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
          </fieldset>

          {/* SEÇÃO 2: VALORES, PRIORIDADE E QUANTIDADE */}
          <fieldset className="editor-fieldset">
            <legend className="editor-legend">2. Valores & Prioridade</legend>

            <div className="editor-grid-3">
              <label className="editor-label">
                Valor Numérico (R$)
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
                Texto do Valor Exibido
                <div className="editor-input-with-action">
                  <input
                    type="text"
                    value={formData.priceLabel}
                    onChange={e => handleChange('priceLabel', e.target.value)}
                    placeholder="Ex: R$ 350,00 ou R$ 350,00 no Pix"
                  />
                  {formData.price && (
                    <button
                      type="button"
                      className="editor-mini-action"
                      onClick={handleAutoFormatPrice}
                      title="Gerar formato em Real automaticamente"
                    >
                      🪄 Auto
                    </button>
                  )}
                </div>
              </label>

              <label className="editor-label">
                Prioridade
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
            </div>

            <div className="editor-grid-2">
              <label className="editor-label">
                Quantidade Desejada
                <input
                  type="number"
                  min="1"
                  max="99"
                  value={formData.quantityDesired}
                  onChange={e => handleChange('quantityDesired', e.target.value)}
                  placeholder="1"
                />
              </label>

              <div className="editor-hint-box">
                <small>
                  💡 <strong>Dica de Prioridade:</strong> Itens fundamentais da rotina ou do lar recebem <em>Alta</em>; itens de aconchego e bem-estar recebem <em>Média</em>; mimos complementares recebem <em>Baixa</em>.
                </small>
              </div>
            </div>
          </fieldset>

          {/* SEÇÃO 3: IMAGEM & LOJA */}
          <fieldset className="editor-fieldset">
            <legend className="editor-legend">3. Imagem & Link de Compra</legend>

            <div className="editor-image-row">
              <div className="editor-field-flex">
                <label className="editor-label">
                  URL da Imagem do Presente
                  <input
                    type="url"
                    value={formData.imageUrl}
                    onChange={e => handleChange('imageUrl', e.target.value)}
                    placeholder="https://exemplo.com/foto-do-produto.jpg"
                  />
                </label>
                <span className="editor-hint">
                  Insira uma imagem pública com boa resolução (ou deixe vazio para exibir ícone botânico).
                </span>
              </div>

              <div className="editor-image-preview-box">
                {formData.imageUrl && !previewImageError ? (
                  <img
                    src={formData.imageUrl}
                    alt="Prévia do presente"
                    onError={() => setPreviewImageError(true)}
                  />
                ) : (
                  <span className="editor-image-empty">
                    {previewImageError ? '⚠️ Imagem inválida' : '📷 Prévia'}
                  </span>
                )}
              </div>
            </div>

            <div className="editor-grid-2">
              <label className="editor-label">
                Link da Loja / Compra (URL)
                <input
                  type="url"
                  value={formData.url}
                  onChange={e => handleChange('url', e.target.value)}
                  placeholder="https://amazon.com.br/dp/..."
                />
              </label>

              <label className="editor-label">
                Nome da Loja
                <input
                  type="text"
                  value={formData.store}
                  onChange={e => handleChange('store', e.target.value)}
                  placeholder="Ex: Amazon, Tok&Stok, Zara Home…"
                />
              </label>
            </div>
          </fieldset>

          {/* SEÇÃO 4: TEXTOS AFETIVOS, SONHO & HISTÓRIA */}
          <fieldset className="editor-fieldset">
            <legend className="editor-legend">4. Textos Afetivos, Sonho & História</legend>

            <label className="editor-label">
              <div className="editor-label-with-suggest">
                <span>Descrição Afetiva</span>
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
                placeholder="Breve descrição afetiva dos atributos do item…"
              />
            </label>

            <label className="editor-label">
              <div className="editor-label-with-suggest">
                <span>🌱 O Sonho (Por que este presente é especial para você?)</span>
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
                rows="2"
                value={formData.dream}
                onChange={e => handleChange('dream', e.target.value)}
                placeholder="Ex: Sonho em ter um espaço inspirador para estudar e escrever minhas histórias…"
              />
            </label>

            <label className="editor-label">
              <div className="editor-label-with-suggest">
                <span>📖 A História (Memória, significado ou motivo especial)</span>
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
                rows="2"
                value={formData.story}
                onChange={e => handleChange('story', e.target.value)}
                placeholder="Uma memória, contexto ou motivo carinhoso…"
              />
            </label>

            <div className="editor-grid-3">
              <label className="editor-label">
                <div className="editor-label-with-suggest">
                  <span>Significados</span>
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
                Tamanhos / Medidas (por vírgula)
                <input
                  type="text"
                  value={formData.sizes}
                  onChange={e => handleChange('sizes', e.target.value)}
                  placeholder="M, 1,30 m, Branco"
                />
              </label>

              <label className="editor-label">
                Observações importantes (por vírgula)
                <input
                  type="text"
                  value={formData.notes}
                  onChange={e => handleChange('notes', e.target.value)}
                  placeholder="Preferência por tom carvalho, 110V"
                />
              </label>
            </div>
          </fieldset>

          {error && <p className="notice error" role="alert">{error}</p>}

          <div className="editor-form-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
              disabled={busy}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="primary-button"
              disabled={busy}
            >
              {busy ? 'Gravando no Firestore…' : (isEditing ? 'Salvar Alterações ✨' : 'Adicionar ao Jardim ✨')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalElement, document.body) : modalElement;
}
