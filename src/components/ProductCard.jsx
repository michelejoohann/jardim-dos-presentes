import { useEffect, useState } from 'react';

export default function ProductCard({
  product,
  reservation,
  currentVisitorUid,
  onOpenGift,
  onCancelReservation,
}) {
  const effectiveStatus = reservation?.status || product.status || 'available';
  const isMyReservation = Boolean(
    reservation && currentVisitorUid && reservation.visitorUid === currentVisitorUid
  );

  const quantityDesired = Number(product.quantityDesired || 1);
  const quantityReceived = Number(product.quantityReceived || (effectiveStatus === 'received' ? 1 : 0));
  const isComplete = effectiveStatus === 'received' || (quantityDesired > 1 && quantityReceived >= quantityDesired);
  const isReserved = effectiveStatus === 'reserved';

  const statusLabel = isComplete
    ? 'Floresceu 🌸'
    : isReserved
      ? 'Reservado'
      : 'Disponível';

  const statusBadgeClass = isComplete
    ? 'status-received'
    : isReserved
      ? 'status-reserved'
      : 'status-available';

  const imageUrl = product.imageUrl || product.image;
  const [imageFailed, setImageFailed] = useState(false);
  const meanings = Array.isArray(product.meanings) ? product.meanings : [];
  const sizes = Array.isArray(product.sizes) ? product.sizes : [];
  const notes = Array.isArray(product.notes) ? product.notes : [];

  useEffect(() => {
    setImageFailed(false);
  }, [imageUrl]);

  return (
    <article className="product-card">
      <div className="product-media">
        {imageUrl && !imageFailed ? (
          <img
            src={imageUrl}
            alt={product.name}
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <span className="product-icon" aria-hidden="true">{product.icon || '🌿'}</span>
        )}
        <span className={`status-badge ${statusBadgeClass}`}>{statusLabel}</span>
      </div>

      <div className="product-body">
        <p className="collection-name">
          {product.collection}
          {product.subcategory ? ` · ${product.subcategory}` : ''}
        </p>
        <h2>{product.name}</h2>
        <p className="product-description">{product.description}</p>

        {product.dream && (
          <section className="dream-section" aria-label="O sonho deste presente">
            <span className="dream-label">🌱 O sonho</span>
            <p>{product.dream}</p>
          </section>
        )}

        {meanings.length > 0 && (
          <div className="meaning-tags" aria-label="Significados">
            {meanings.map(meaning => <span key={meaning}>{meaning}</span>)}
          </div>
        )}

        {sizes.length > 0 && (
          <p className="product-meta"><strong>Tamanho desejado:</strong> {sizes.join(', ')}</p>
        )}

        {product.priority && (
          <p className="product-meta"><strong>Prioridade:</strong> {product.priority}</p>
        )}

        {product.purchaseDecision && (
          <p className="product-meta"><strong>Decisão de compra:</strong> {product.purchaseDecision}</p>
        )}

        {product.unitPrice != null && product.totalPrice != null && (
          <p className="product-meta">
            <strong>Valores:</strong> {quantityDesired} × {product.unitPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} = {product.totalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        )}

        {notes.length > 0 && (
          <details className="story-details">
            <summary>📝 Observações importantes</summary>
            <ul>
              {notes.map(note => <li key={note}>{note}</li>)}
            </ul>
          </details>
        )}

        {quantityDesired > 1 && (
          <div className="quantity-progress" aria-label={`${quantityReceived} de ${quantityDesired} recebidos`}>
            <div className="quantity-progress__text">
              <strong>🌱 {quantityReceived} de {quantityDesired} recebidos</strong>
              <span>{isComplete ? 'Este sonho floresceu 🌸' : `Ainda podem florescer ${Math.max(quantityDesired - quantityReceived, 0)}`}</span>
            </div>
            <progress value={Math.min(quantityReceived, quantityDesired)} max={quantityDesired} />
          </div>
        )}

        {product.story && (
          <details className="story-details">
            <summary>📖 A história</summary>
            <blockquote>{product.story}</blockquote>
          </details>
        )}

        {isMyReservation && (
          <div className="reservation-notice">
            <span>✨ Você marcou este presente ({effectiveStatus === 'received' ? 'Já comprei' : 'Vou comprar'})</span>
            <button
              type="button"
              className="text-link-button"
              onClick={() => onCancelReservation(product.id)}
            >
              Desfazer marcação
            </button>
          </div>
        )}

        <div className="product-footer">
          <strong>{product.priceLabel || 'Consultar valor na loja'}</strong>
          <div className="product-footer-actions">
            {product.url && (
              <a
                href={product.url}
                target="_blank"
                rel="noopener noreferrer"
                className="store-link-button"
                title="Abrir página oficial do produto na loja"
              >
                Ver loja ↗
              </a>
            )}

            {isComplete ? (
              <span className="gift-tag done" title="Este presente já foi realizado">
                🌸 Floresceu
              </span>
            ) : isReserved && !isMyReservation ? (
              <span className="gift-tag reserved" title="Alguém já planeja presentear este item">
                ⏳ Reservado
              </span>
            ) : (
              <button
                type="button"
                className="gift-action-button"
                onClick={() => onOpenGift(product)}
                title="Marcar que vai comprar ou já comprou este presente"
              >
                🎁 Presentear
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
