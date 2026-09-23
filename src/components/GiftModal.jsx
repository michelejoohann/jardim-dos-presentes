import { useEffect, useState } from 'react';
import { createReservation } from '../services/reservationService.js';

export default function GiftModal({ product, user, onClose, onReserved }) {
  const [intent, setIntent] = useState('reserved'); // 'reserved' (Vou comprar) ou 'received' (Já comprei)
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Fecha modal com tecla ESC
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape' && !busy) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [busy, onClose]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!user?.uid) {
      setError('Aguardando autenticação da sessão. Tente novamente em alguns instantes.');
      return;
    }

    if (!isAnonymous && !name.trim()) {
      setError('Por favor, informe seu nome ou selecione a opção de presente anônimo.');
      return;
    }

    setBusy(true);
    setError('');

    try {
      await createReservation({
        productId: product.id,
        status: intent,
        name: name.trim(),
        email: email.trim(),
        message: message.trim(),
        isAnonymous,
        visitorUid: user.uid,
      });

      setSuccess(true);
      if (onReserved) onReserved(product.id, intent);
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Não foi possível registrar o presente. Tente novamente.');
    } finally {
      setBusy(false);
    }
  }

  const imageUrl = product.imageUrl || product.image;

  return (
    <div className="modal-backdrop" onClick={busy ? undefined : onClose} role="dialog" aria-modal="true">
      <div className="modal-card" onClick={event => event.stopPropagation()}>
        <button
          type="button"
          className="modal-close-button"
          onClick={onClose}
          disabled={busy}
          aria-label="Fechar janela"
        >
          ✕
        </button>

        {success ? (
          <div className="modal-success">
            <div className="modal-success-icon">🌸</div>
            <h2>Que gesto especial!</h2>
            <p>
              {intent === 'received'
                ? 'Você marcou este presente como realizado.'
                : 'Sua intenção de presentear foi registrada com carinho.'}
            </p>
            <p className="modal-success-sub">
              {isAnonymous
                ? 'Seu presente e sua mensagem foram enviados em segredo para a Michèlé.'
                : `Obrigado pelo carinho, ${name || 'amigo(a)'}! Sua mensagem foi enviada para a Michèlé.`}
            </p>
            <button type="button" className="primary-button" onClick={onClose}>
              Voltar ao Jardim
            </button>
          </div>
        ) : (
          <>
            <div className="modal-header">
              <span className="section-kicker">Gesto de Afeto</span>
              <h2>Presentear este item</h2>
            </div>

            <div className="modal-product-summary">
              <div className="modal-product-media">
                {imageUrl ? (
                  <img src={imageUrl} alt={product.name} />
                ) : (
                  <span>{product.icon || '🎁'}</span>
                )}
              </div>
              <div className="modal-product-details">
                <h3>{product.name}</h3>
                <p>{product.priceLabel || 'Consultar valor na loja'}</p>
                {product.collection && <small>{product.collection}</small>}
              </div>
            </div>

            <form className="modal-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Qual é a sua intenção?</label>
                <div className="intent-options">
                  <label className={`intent-card ${intent === 'reserved' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="intent"
                      value="reserved"
                      checked={intent === 'reserved'}
                      onChange={() => setIntent('reserved')}
                    />
                    <div>
                      <strong>⏳ Vou comprar</strong>
                      <span>Avisa aos outros que você planeja dar este presente.</span>
                    </div>
                  </label>

                  <label className={`intent-card ${intent === 'received' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="intent"
                      value="received"
                      checked={intent === 'received'}
                      onChange={() => setIntent('received')}
                    />
                    <div>
                      <strong>🌸 Já comprei</strong>
                      <span>Marca o presente como florescido / adquirido.</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Como deseja se identificar?</label>
                <div className="anon-toggle">
                  <label>
                    <input
                      type="checkbox"
                      checked={isAnonymous}
                      onChange={event => setIsAnonymous(event.target.checked)}
                    />
                    <span>Presentear em modo anônimo (amigo secreto)</span>
                  </label>
                </div>

                {!isAnonymous ? (
                  <div className="form-row">
                    <label>
                      Seu nome ou apelido *
                      <input
                        type="text"
                        value={name}
                        onChange={event => setName(event.target.value)}
                        placeholder="Ex: Tia Maria, Pedro & Amanda…"
                        required={!isAnonymous}
                      />
                    </label>
                    <label>
                      Seu e-mail ou WhatsApp (opcional)
                      <input
                        type="text"
                        value={email}
                        onChange={event => setEmail(event.target.value)}
                        placeholder="Para a Michèlé te agradecer"
                      />
                    </label>
                  </div>
                ) : (
                  <p className="anon-note">
                    🕵️ Seu nome não será revelado. Apenas seu gesto de afeto e a mensagem abaixo serão entregues.
                  </p>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="gift-message">
                  Deixe uma mensagem de carinho (opcional)
                </label>
                <textarea
                  id="gift-message"
                  value={message}
                  onChange={event => setMessage(event.target.value)}
                  placeholder="Escreva uma dedicatória, votos ou uma cartinha carinhosa para a Michèlé…"
                  rows={3}
                />
              </div>

              {error && <p className="notice error" role="alert">{error}</p>}

              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={onClose} disabled={busy}>
                  Cancelar
                </button>
                <button type="submit" className="primary-button" disabled={busy}>
                  {busy ? 'Gravando gesto…' : 'Confirmar presente 🎁'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
