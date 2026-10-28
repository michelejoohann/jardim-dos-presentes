import { useState } from 'react';
import {
  createLoveMessage,
  toggleLoveMessageVisibility,
} from '../services/gardenConfigService.js';
import { resolveImageUrl } from '../services/productService.js';

const IVY_SEGMENTS = [0, 1, 2, 3, 4, 5, 6, 7];

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
  const [showForm, setShowForm] = useState(false);

  const pixEnabled = settings?.pixEnabled !== false;
  const hasPixData = Boolean(settings?.pixKey?.trim() || settings?.pixQrCodeUrl?.trim());
  const showPixSection = pixEnabled || isAdmin;

  const messagesSectionEnabled = settings?.messagesSectionEnabled !== false;
  const publicWallVisible = settings?.publicWallVisible !== false;
  const autoApprove = settings?.autoApproveMessages !== false;

  const allMessages = loveMessages.length > 0 ? loveMessages : messages;
  const visibleMessages = allMessages.filter(m => m.visible !== false && m.isPublic !== false);

  async function handleCopyPix() {
    const keyToCopy = String(settings?.pixKey || '').trim();
    if (!keyToCopy) return;
    try {
      await navigator.clipboard.writeText(keyToCopy);
      setCopiedPix(true);
      setTimeout(() => setCopiedPix(false), 3200);
    } catch {
      // Fallback para navegadores antigos
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

  return (
    <div className="garden-special-sections">
      {/* ====================================================================
          SEÇÃO 1: MIMO LIVRE VIA PIX
         ==================================================================== */}
      {showPixSection && (
        <section id="secao-pix" className="special-botanical-section pix-section" aria-labelledby="pix-section-title">
          <div className="welcome-ivy-frame special-section-ivy-frame" aria-hidden="true">
            <div className="welcome-ivy-branch-wrap welcome-ivy-branch-left">
              {IVY_SEGMENTS.map(idx => (
                <img
                  key={`pix-left-ivy-${idx}`}
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
                  key={`pix-right-ivy-${idx}`}
                  src={`${baseUrl}/images/ivy-vine.png`}
                  alt=""
                  className="welcome-ivy-watercolor-segment"
                  loading="lazy"
                />
              ))}
            </div>
          </div>

          <div className="special-section-inner">
            {isAdmin && (!pixEnabled || !hasPixData) && (
              <div className="admin-section-preview-banner">
                <span>
                  🔒 <strong>Visível apenas para você (Admin):</strong>{' '}
                  {!pixEnabled
                    ? 'A seção de PIX está desativada para visitantes.'
                    : 'Configure sua chave PIX no painel para exibir esta seção aos convidados.'}
                </span>
                {onNavigateAdminSettings && (
                  <button
                    type="button"
                    className="admin-preview-action-btn"
                    onClick={onNavigateAdminSettings}
                  >
                    ⚙️ Configurar PIX no Painel
                  </button>
                )}
              </div>
            )}

            <div className="special-section-header" data-tour="secao-pix">
              <span className="section-kicker">✨ Gesto Livre de Carinho ✨</span>
              <h2 id="pix-section-title">{settings?.pixTitle || 'Mimo Livre via PIX'}</h2>
              <p className="special-section-subtitle">
                {settings?.pixDescription ||
                  'Caso prefira presentear com qualquer valor livre para ajudar a florir este jardim, sinta-se à vontade para enviar um mimo via PIX.'}
              </p>
            </div>

            {hasPixData ? (
              <div className={`pix-showcase-grid ${qrCodeImageUrl ? 'has-qr' : 'no-qr'}`}>
                <div className="pix-key-card">
                  <div className="pix-meta-badges">
                    {settings?.pixKeyType && (
                      <span className="pix-meta-pill">
                        🔑 Tipo: <strong>{settings.pixKeyType}</strong>
                      </span>
                    )}
                    {settings?.pixHolderName && (
                      <span className="pix-meta-pill">
                        🌿 Titular: <strong>{settings.pixHolderName}</strong>
                      </span>
                    )}
                    {settings?.pixBank && (
                      <span className="pix-meta-pill">
                        🏛️ Instituição: <strong>{settings.pixBank}</strong>
                      </span>
                    )}
                  </div>

                  {settings?.pixKey && (
                    <div className="pix-copy-box">
                      <div className="pix-key-display">
                        <span className="pix-key-label">Chave PIX ou Copia e Cola</span>
                        <code className="pix-key-value">{settings.pixKey}</code>
                      </div>
                      <button
                        type="button"
                        className={`pix-copy-btn ${copiedPix ? 'copied' : ''}`}
                        onClick={handleCopyPix}
                      >
                        {copiedPix ? '✓ Chave Copiada!' : '📋 Copiar Chave PIX'}
                      </button>
                    </div>
                  )}

                  {messagesSectionEnabled && (
                    <div className="pix-message-cta">
                      <button
                        type="button"
                        className="text-link-button pix-leave-note-link"
                        onClick={() => {
                          setShowForm(true);
                          setSubmitSuccess(false);
                          document.getElementById('secao-mensagens')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                      >
                        💌 Enviou um mimo via PIX? Clique aqui para deixar uma mensagem de carinho para a Michèlé →
                      </button>
                    </div>
                  )}
                </div>

                {qrCodeImageUrl && (
                  <div className="pix-qr-card">
                    <div className="pix-qr-frame">
                      <img src={qrCodeImageUrl} alt="QR Code PIX" loading="lazy" />
                    </div>
                    <span className="pix-qr-caption">Aponte a câmera do aplicativo do seu banco</span>
                  </div>
                )}
              </div>
            ) : (
              isAdmin && (
                <div className="pix-empty-admin-box">
                  <p>Nenhuma chave PIX foi preenchida ainda.</p>
                  {onNavigateAdminSettings && (
                    <button type="button" className="primary-button" onClick={onNavigateAdminSettings}>
                      Cadastrar Chave PIX Agora
                    </button>
                  )}
                </div>
              )
            )}
          </div>
        </section>
      )}

      {/* ====================================================================
          SEÇÃO 2: MENSAGENS DE CARINHO & MURAL DE RECADOS
         ==================================================================== */}
      {messagesSectionEnabled && (
        <section
          id="secao-mensagens"
          className="special-botanical-section love-messages-section"
          aria-labelledby="messages-section-title"
        >
          <div className="welcome-ivy-frame special-section-ivy-frame" aria-hidden="true">
            <div className="welcome-ivy-branch-wrap welcome-ivy-branch-left">
              {IVY_SEGMENTS.map(idx => (
                <img
                  key={`msg-left-ivy-${idx}`}
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
                  key={`msg-right-ivy-${idx}`}
                  src={`${baseUrl}/images/ivy-vine.png`}
                  alt=""
                  className="welcome-ivy-watercolor-segment"
                  loading="lazy"
                />
              ))}
            </div>
          </div>

          <div className="special-section-inner">
            {isAdmin && (
              <div className="admin-section-preview-banner">
                <span>
                  💌 <strong>Modo do Mural:</strong>{' '}
                  {publicWallVisible
                    ? 'As mensagens aprovadas estão VISÍVEIS na página para todos os visitantes.'
                    : 'O mural está PRIVADO (visitantes podem enviar mensagens, mas somente você as lê no painel).'}
                </span>
                {onNavigateAdminSettings && (
                  <button
                    type="button"
                    className="admin-preview-action-btn"
                    onClick={onNavigateAdminSettings}
                  >
                    ⚙️ Gerenciar Visibilidade
                  </button>
                )}
              </div>
            )}

            <div className="special-section-header" data-tour="secao-recados">
              <span className="section-kicker">💌 Cartinhas do Jardim 💌</span>
              <h2 id="messages-section-title">{settings?.messagesTitle || 'Mensagens de Carinho'}</h2>
              <p className="special-section-subtitle">
                {settings?.messagesSubtitle ||
                  'Deixe uma cartinha, votos de felicidade ou uma mensagem especial para florescer neste Jardim.'}
              </p>

              {!showForm && !submitSuccess && (
                <button
                  type="button"
                  className="primary-button open-love-form-btn"
                  onClick={() => setShowForm(true)}
                >
                  ✍️ Escrever uma Mensagem de Carinho
                </button>
              )}
            </div>

            {/* Formulário de Envio de Mensagem de Carinho */}
            {(showForm || submitSuccess || !publicWallVisible || visibleMessages.length === 0) && (
              <div className="love-form-container">
                {submitSuccess ? (
                  <div className="love-form-success">
                    <div className="love-success-icon">🌸</div>
                    <h3>Sua mensagem foi entregue com muito carinho!</h3>
                    <p>
                      {publicWallVisible && autoApprove
                        ? 'Muito obrigada pelo afeto! Sua cartinha já está florescendo no mural abaixo.'
                        : 'Muito obrigada pelo afeto! Sua cartinha foi enviada diretamente para a Michèlé.'}
                    </p>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => {
                        setSubmitSuccess(false);
                        setShowForm(false);
                      }}
                    >
                      Escrever outra mensagem
                    </button>
                  </div>
                ) : (
                  <form className="love-message-form" onSubmit={handleSubmitMessage}>
                    <div className="love-form-field">
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

                    <div className="love-form-field">
                      <label htmlFor="love-message-textarea">Sua mensagem de carinho para Michèlé Joohann *</label>
                      <textarea
                        id="love-message-textarea"
                        value={messageText}
                        onChange={e => setMessageText(e.target.value)}
                        placeholder="Escreva votos, memórias ou palavras de carinho para a Michèlé Joohann…"
                        rows={3}
                        required
                      />
                    </div>

                    {submitError && (
                      <p className="notice error" role="alert">
                        {submitError}
                      </p>
                    )}

                    <div className="love-form-actions">
                      {showForm && visibleMessages.length > 0 && publicWallVisible && (
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => setShowForm(false)}
                          disabled={submitting}
                        >
                          Cancelar
                        </button>
                      )}
                      <button type="submit" className="primary-button" disabled={submitting}>
                        {submitting ? 'Enviando com carinho…' : 'Enviar Mensagem de Carinho 💌'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Mural Público de Mensagens (exibido apenas quando publicWallVisible === true) */}
            {publicWallVisible && visibleMessages.length > 0 && (
              <div className="love-wall-grid" aria-live="polite">
                {visibleMessages.map(msg => {
                  const dateStr = msg.createdAt?.toDate
                    ? msg.createdAt.toDate().toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })
                    : 'Recentemente';

                  return (
                    <article key={msg.id} className="love-wall-card">
                      <div className="love-wall-card-top">
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
                            title="Ocultar esta mensagem da página pública (ela continuará salva no seu painel)"
                          >
                            ⚪ Ocultar
                          </button>
                        )}
                      </div>

                      {(msg.giftName || msg.isPixNote) && (
                        <div className="love-wall-badges">
                          {msg.giftName && (
                            <span className="love-gift-badge">🎁 {msg.giftName}</span>
                          )}
                          {msg.isPixNote && (
                            <span className="love-pix-badge">✨ Mimo via PIX</span>
                          )}
                        </div>
                      )}

                      <blockquote className="love-wall-quote">“{msg.message}”</blockquote>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

