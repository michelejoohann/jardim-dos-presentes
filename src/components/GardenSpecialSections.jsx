import { useEffect, useState } from 'react';
import {
  createLoveMessage,
  toggleLoveMessageVisibility,
} from '../services/gardenConfigService.js';
import { resolveImageUrl } from '../services/productService.js';

const IVY_SEGMENTS = Array.from({ length: 28 }, (_, idx) => idx);

export default function GardenSpecialSections({
  settings,
  loveMessages = [],
  messages = [],
  user,
  isAdmin = false,
  onNavigateAdminSettings,
  baseUrl = '',
}) {
  const [name, setName] = useState('');
  const [messageText, setMessageText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [copiedPix, setCopiedPix] = useState(false);
  const [bookActiveTab, setBookActiveTab] = useState('pix'); // 'pix' | 'message'

  const pixEnabled = settings?.pixEnabled !== false;
  const hasPixData = Boolean(settings?.pixKey?.trim() || settings?.pixQrCodeUrl?.trim());
  const showPixSection = pixEnabled || isAdmin;

  const messagesSectionEnabled = settings?.messagesSectionEnabled !== false;
  const publicWallVisible = settings?.publicWallVisible !== false;
  const autoApprove = settings?.autoApproveMessages !== false;

  const allMessages = loveMessages.length > 0 ? loveMessages : messages;
  const visibleMessages = allMessages.filter(m => m.visible !== false && m.isPublic !== false);

  useEffect(() => {
    function handleGuestbookTab(event) {
      const tab = event?.detail;
      if (tab === 'pix' || tab === 'message') {
        setBookActiveTab(tab);
      }
    }
    window.addEventListener('garden:guestbook-tab', handleGuestbookTab);
    return () => window.removeEventListener('garden:guestbook-tab', handleGuestbookTab);
  }, []);

  async function handleCopyPix() {
    const keyToCopy = String(settings?.pixKey || '').trim();
    if (!keyToCopy) return;
    try {
      await navigator.clipboard.writeText(keyToCopy);
      setCopiedPix(true);
      setTimeout(() => setCopiedPix(false), 3200);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = keyToCopy;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedPix(true);
      setTimeout(() => setCopiedPix(false), 3200);
    }
  }

  async function handleSubmitMessage(event) {
    event.preventDefault();
    if (!user?.uid) {
      setSubmitError('Aguardando conexão da sessão. Tente novamente em alguns segundos.');
      return;
    }
    if (!name.trim()) {
      setSubmitError('Por favor, informe seu nome ou apelido.');
      return;
    }
    if (!messageText.trim()) {
      setSubmitError('Escreva sua mensagem de carinho antes de enviar.');
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      await createLoveMessage({
        authorUid: user.uid,
        authorName: name.trim(),
        isAnonymous: false,
        message: messageText.trim(),
        isPixNote: false,
        visible: publicWallVisible && autoApprove,
      });

      setSubmitSuccess(true);
      setMessageText('');
    } catch (err) {
      setSubmitError(err?.message || 'Não foi possível enviar sua mensagem agora. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleQuickHideMessage(msg) {
    try {
      await toggleLoveMessageVisibility(msg.id, false);
    } catch (err) {
      alert('Não foi possível ocultar a mensagem: ' + (err?.message || 'Erro inesperado.'));
    }
  }

  const qrCodeImageUrl = settings?.pixQrCodeUrl ? resolveImageUrl(settings.pixQrCodeUrl) : '';

  if (!showPixSection && !messagesSectionEnabled) {
    return null;
  }

  const pixDescriptionText =
    settings?.pixDescription ||
    'Caso prefira presentear com qualquer valor livre para ajudar a florir este jardim, sinta-se à vontade para enviar um mimo via PIX.';

  const messagesSubtitleText =
    settings?.messagesSubtitle ||
    'Deixe uma cartinha, votos de felicidade ou uma mensagem especial para florescer neste Jardim.';

  return (
    <div className="garden-special-sections">
      {isAdmin && (!pixEnabled || !hasPixData) && (
        <div className="admin-section-preview-banner">
          <span>
            🔒 <strong>Visível para você (Admin):</strong>{' '}
            {!pixEnabled
              ? 'A seção de PIX está desativada para visitantes.'
              : 'Configure sua chave PIX no painel para exibir aos convidados.'}
          </span>
          {onNavigateAdminSettings && (
            <button type="button" className="admin-preview-action-btn" onClick={onNavigateAdminSettings}>
              ⚙️ Configurar PIX e Mural
            </button>
          )}
        </div>
      )}

      {/* ====================================================================
          LIVRO DE VISITAS & OFERENDAS DO JARDIM (OPÇÃO 2 DEFINITIVA)
         ==================================================================== */}
      <section
        id="secao-pix"
        className="product-card herbarium-guestbook-card"
        aria-label="Mimo Livre via PIX e Mensagens de Carinho"
      >
        <div id="secao-mensagens" className="guestbook-scroll-anchor" aria-hidden="true" />

        <div className="welcome-ivy-frame special-section-ivy-frame" aria-hidden="true">
          <div className="welcome-ivy-branch-wrap welcome-ivy-branch-left">
            {IVY_SEGMENTS.map(idx => (
              <img
                key={`book-left-ivy-${idx}`}
                src={`${baseUrl}/images/ivy-vine.png`}
                alt=""
                className="welcome-ivy-watercolor-segment"
                loading="lazy"
              />
            ))}
          </div>
          <div className="welcome-ivy-branch-wrap welcome-ivy-branch-right">
            {IVY_SEGMENTS.map(idx => (
              <img
                key={`book-right-ivy-${idx}`}
                src={`${baseUrl}/images/ivy-vine.png`}
                alt=""
                className="welcome-ivy-watercolor-segment"
                loading="lazy"
              />
            ))}
          </div>
        </div>

        <div className="herbarium-guestbook-inner">
          {/* Cabeçalho Nobre do Livro */}
          <div className="herbarium-guestbook-header">
            <img
              src={`${baseUrl}/images/logo-michele-joohann.png`}
              alt="Michèlé Joohann"
              className="herbarium-guestbook-crest"
              width="58"
              height="58"
              loading="lazy"
            />
            <p className="collection-name">LIVRO DE OURO DO HERBÁRIO</p>
            <h2>Mimo Livre & Mensagens de Carinho</h2>
            <p className="herbarium-guestbook-subtitle">
              Envie um mimo de valor livre para ajudar a florir este jardim ou deixe uma cartinha especial para a Michèlé Joohann.
            </p>

            {/* Abas Táteis (visíveis no mobile para alternar sem rolagem longa) */}
            {showPixSection && messagesSectionEnabled && (
              <div className="herbarium-guestbook-tabs" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={bookActiveTab === 'pix'}
                  className={`guestbook-tab-btn ${bookActiveTab === 'pix' ? 'active' : ''}`}
                  onClick={() => setBookActiveTab('pix')}
                >
                  💎 Mimo via PIX
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={bookActiveTab === 'message'}
                  className={`guestbook-tab-btn ${bookActiveTab === 'message' ? 'active' : ''}`}
                  onClick={() => setBookActiveTab('message')}
                >
                  💌 Deixar Cartinha
                </button>
              </div>
            )}
          </div>

          {/* Páginas Abertas do Livro (Lado a Lado no Desktop, Abas no Mobile) */}
          <div className="herbarium-guestbook-spread">
            {/* PÁGINA ESQUERDA: MIMO LIVRE VIA PIX */}
            {showPixSection && (
              <div
                data-tour="secao-pix"
                className={`guestbook-page guestbook-page-left ${
                  bookActiveTab === 'pix' || !messagesSectionEnabled ? 'is-active-tab' : 'is-hidden-mobile-tab'
                }`}
              >
                <div className="guestbook-page-heading">
                  <span className="status-badge status-available guestbook-inline-badge">Mimo Livre 💎</span>
                  <h3>{settings?.pixTitle || 'Mimo Livre via PIX'}</h3>
                  <p>“{pixDescriptionText}”</p>
                </div>

                {hasPixData ? (
                  <div className="guestbook-pix-content">
                    {qrCodeImageUrl && (
                      <div className="guestbook-qr-box">
                        <div className="herbarium-qr-pedestal guestbook-qr-pedestal">
                          <img src={qrCodeImageUrl} alt="QR Code PIX" loading="lazy" />
                        </div>
                        <span className="guestbook-qr-caption">Aponte a câmera do aplicativo do seu banco</span>
                      </div>
                    )}

                    <div className="herbarium-pix-editorial-meta">
                      {settings?.pixHolderName && (
                        <p className="herbarium-pix-holder">
                          <strong>{settings.pixHolderName}</strong>
                        </p>
                      )}
                      <p className="herbarium-pix-bank-line">
                        {[
                          settings?.pixBank,
                          settings?.pixKeyType
                            ? /^chave\b/i.test(String(settings.pixKeyType).trim())
                              ? String(settings.pixKeyType).trim()
                              : `Chave ${String(settings.pixKeyType).trim()}`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>

                      {settings?.pixKey && (
                        <div className="herbarium-pix-key-pill">
                          <span className="herbarium-pix-key-label">Chave PIX ou Copia e Cola</span>
                          <code className="herbarium-pix-key-code">{settings.pixKey}</code>
                        </div>
                      )}
                    </div>

                    {settings?.pixKey && (
                      <div className="product-footer herbarium-plate-footer">
                        <button
                          type="button"
                          className={`gift-action-button herbarium-full-btn ${copiedPix ? 'copied' : ''}`}
                          onClick={handleCopyPix}
                        >
                          {copiedPix ? '✓ Chave PIX Copiada!' : '📋 Copiar Chave PIX'}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  isAdmin && (
                    <div className="pix-empty-admin-box">
                      <p>Nenhuma chave PIX foi preenchida ainda.</p>
                      {onNavigateAdminSettings && (
                        <button type="button" className="gift-action-button" onClick={onNavigateAdminSettings}>
                          Cadastrar Chave PIX Agora
                        </button>
                      )}
                    </div>
                  )
                )}
              </div>
            )}

            {/* Costura Central Dourada do Livro (Desktop) */}
            {showPixSection && messagesSectionEnabled && (
              <div className="guestbook-spine-divider" aria-hidden="true">
                <span className="spine-line" />
                <span className="spine-leaf">🌿</span>
                <span className="spine-line" />
              </div>
            )}

            {/* PÁGINA DIREITA: CARTINHA DE CARINHO */}
            {messagesSectionEnabled && (
              <div
                data-tour="secao-recados"
                className={`guestbook-page guestbook-page-right ${
                  bookActiveTab === 'message' || !showPixSection ? 'is-active-tab' : 'is-hidden-mobile-tab'
                }`}
              >
                <div className="guestbook-page-heading">
                  <span className="status-badge status-received guestbook-inline-badge">Cartinhas de Afeto 💌</span>
                  <h3>{settings?.messagesTitle || 'Mensagens de Carinho'}</h3>
                  <p>“{messagesSubtitleText}”</p>
                </div>

                <div className="herbarium-plate-form-wrap">
                  {submitSuccess ? (
                    <div className="herbarium-love-success">
                      <div className="love-success-icon">🌸</div>
                      <h3>Sua cartinha foi entregue com muito carinho!</h3>
                      <p>
                        {publicWallVisible && autoApprove
                          ? 'Muito obrigada pelo afeto! Sua mensagem já está florescendo no mural abaixo.'
                          : 'Muito obrigada pelo afeto! Sua cartinha foi enviada diretamente para a Michèlé.'}
                      </p>
                      <button
                        type="button"
                        className="store-link-button"
                        onClick={() => setSubmitSuccess(false)}
                      >
                        ✍️ Escrever outra mensagem
                      </button>
                    </div>
                  ) : (
                    <form className="herbarium-love-form" onSubmit={handleSubmitMessage}>
                      <div className="herbarium-field">
                        <label htmlFor="love-author-name">Seu nome ou apelido *</label>
                        <input
                          id="love-author-name"
                          type="text"
                          value={name}
                          onChange={e => setName(e.target.value)}
                          placeholder="Ex: Tia Maria, Família Silva, Pedro & Ana…"
                          required
                          autoComplete="name"
                        />
                      </div>

                      <div className="herbarium-field">
                        <label htmlFor="love-message-textarea">Sua mensagem de carinho para Michèlé Joohann *</label>
                        <textarea
                          id="love-message-textarea"
                          value={messageText}
                          onChange={e => setMessageText(e.target.value)}
                          placeholder="Escreva votos, memórias ou palavras de carinho para a Michèlé Joohann…"
                          rows={4}
                          required
                        />
                      </div>

                      {submitError && (
                        <p className="notice error" role="alert">
                          {submitError}
                        </p>
                      )}

                      <div className="product-footer herbarium-plate-footer">
                        <div className="product-footer-actions" style={{ width: '100%' }}>
                          <button
                            type="submit"
                            className="gift-action-button herbarium-full-btn"
                            disabled={submitting}
                          >
                            {submitting ? 'Enviando com carinho…' : '💌 Enviar Mensagem de Carinho'}
                          </button>
                        </div>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Mural Público de Cartinhas (exibido quando publicWallVisible === true e há mensagens) */}
      {publicWallVisible && visibleMessages.length > 0 && (
        <div className="herbarium-wall-section" aria-live="polite">
          <div className="herbarium-wall-divider">
            <span className="ornament-line" />
            <span className="ornament-icon">🌸 Mural de Afeto ({visibleMessages.length}) 🌸</span>
            <span className="ornament-line" />
          </div>

          <div className="herbarium-wall-grid">
            {visibleMessages.map(msg => {
              const dateStr = msg.createdAt?.toDate
                ? msg.createdAt.toDate().toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })
                : 'Recentemente';

              return (
                <article key={msg.id} className="product-card herbarium-postcard">
                  <div className="herbarium-postcard-top">
                    <div className="love-author-info">
                      <span className="love-author-avatar" aria-hidden="true">
                        {msg.isAnonymous ? '🕵️' : '🌸'}
                      </span>
                      <div>
                        <strong className="love-author-name">
                          {msg.isAnonymous ? 'Amigo(a) Secreto(a)' : msg.authorName || 'Visitante Querido(a)'}
                        </strong>
                        <span className="love-message-date">{dateStr}</span>
                      </div>
                    </div>

                    {isAdmin && (
                      <button
                        type="button"
                        className="love-admin-hide-btn"
                        onClick={() => handleQuickHideMessage(msg)}
                        title="Ocultar esta mensagem da página pública"
                      >
                        ⚪ Ocultar
                      </button>
                    )}
                  </div>

                  {(msg.giftName || msg.isPixNote) && (
                    <div className="love-wall-badges">
                      {msg.giftName && <span className="love-gift-badge">🎁 {msg.giftName}</span>}
                      {msg.isPixNote && <span className="love-pix-badge">✨ Mimo via PIX</span>}
                    </div>
                  )}

                  <blockquote className="love-wall-quote">“{msg.message}”</blockquote>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
