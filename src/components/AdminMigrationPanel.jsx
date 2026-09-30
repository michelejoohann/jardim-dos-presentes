import { useEffect, useState } from 'react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '../firebase/config.js';
import { migrateCatalogToFirestore } from '../services/productMigration.js';
import { publishStagedProductsToFirestore } from '../services/stagedMigration.js';
import { cancelReservation, subscribeToPrivateReservations } from '../services/reservationService.js';

const ADMIN_UID = '7G4v3hEMtaVzI8MUDsXjVCNXGJz1';

export default function AdminMigrationPanel({ user, firestoreCount, onClose, products = [] }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [reservations, setReservations] = useState([]);
  const [reservationsLoading, setReservationsLoading] = useState(true);

  const isAdmin = user?.uid === ADMIN_UID;

  useEffect(() => {
    if (!isAdmin) return;

    setReservationsLoading(true);
    const unsubscribe = subscribeToPrivateReservations(
      list => {
        setReservations(list);
        setReservationsLoading(false);
      },
      () => setReservationsLoading(false)
    );

    return () => unsubscribe();
  }, [isAdmin]);

  async function handleLogin(event) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      if (credential.user.uid !== ADMIN_UID) {
        await signOut(auth);
        throw new Error('Esta conta não possui acesso administrativo.');
      }
      setPassword('');
      setMessage('Acesso administrativo confirmado.');
    } catch (err) {
      setError(err?.message || 'Não foi possível entrar no painel.');
    } finally {
      setBusy(false);
    }
  }

  async function handleMigration() {
    const confirmed = window.confirm(
      `Importar os produtos atuais para o Firestore?\n\nO processo usa os IDs existentes e pode ser executado novamente sem duplicar documentos.`
    );
    if (!confirmed) return;

    setBusy(true);
    setMessage('');
    setError('');
    try {
      const total = await migrateCatalogToFirestore();
      setMessage(`${total} produtos foram gravados ou atualizados no Firestore.`);
    } catch (err) {
      setError(err?.message || 'A migração não pôde ser concluída.');
    } finally {
      setBusy(false);
    }
  }

  async function handlePublishStaged() {
    const confirmed = window.confirm(
      `Publicar todos os novos produtos do staging diretamente no Firestore?\n\nSerão gravados 71 itens com dados completos, prioridades e imagens.`
    );
    if (!confirmed) return;

    setBusy(true);
    setMessage('');
    setError('');
    try {
      const total = await publishStagedProductsToFirestore();
      setMessage(`🎉 Sucesso! ${total} produtos novos foram gravados diretamente na coleção products do Firestore!`);
    } catch (err) {
      setError(err?.message || 'A publicação dos produtos não pôde ser concluída.');
    } finally {
      setBusy(false);
    }
  }

  async function handleCancelGift(productId, productName) {
    const confirmed = window.confirm(
      `Deseja realmente desmarcar o presente "${productName}"?\n\nO item voltará a ficar disponível para outros convidados.`
    );
    if (!confirmed) return;

    try {
      await cancelReservation(productId);
      setMessage(`O presente "${productName}" foi liberado.`);
    } catch (err) {
      setError('Não foi possível cancelar a marcação: ' + err.message);
    }
  }

  const productsById = products.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {});

  if (!isAdmin) {
    return (
      <section className="admin-panel" aria-labelledby="admin-title">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
          <div>
            <p className="section-kicker">Administração</p>
            <h2 id="admin-title">Área Administrativa</h2>
            <p>Entre com a conta da administradora para ver as mensagens e gerenciar o Jardim.</p>
          </div>
          {onClose && (
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
              style={{ whiteSpace: 'nowrap', padding: '6px 12px', fontSize: '0.82rem' }}
              title="Ocultar painel administrativo"
            >
              ✕ Ocultar
            </button>
          )}
        </div>
        <form className="admin-login" onSubmit={handleLogin}>
          <label>
            E-mail
            <input type="email" value={email} onChange={event => setEmail(event.target.value)} required autoComplete="username" />
          </label>
          <label>
            Senha
            <input type="password" value={password} onChange={event => setPassword(event.target.value)} required autoComplete="current-password" />
          </label>
          <button type="submit" disabled={busy}>{busy ? 'Entrando…' : 'Entrar como administradora'}</button>
        </form>
        {message && <p className="notice success">{message}</p>}
        {error && <p className="notice error" role="alert">{error}</p>}
      </section>
    );
  }

  return (
    <section className="admin-panel" aria-labelledby="migration-title">
      <div>
        <p className="section-kicker">Painel da Michèlé</p>
        <h2 id="migration-title">Gestão do Jardim & Mensagens</h2>
        <p>O banco possui atualmente <strong>{firestoreCount}</strong> produtos cadastrados.</p>
      </div>
      <div className="admin-actions">
        <button
          type="button"
          onClick={handlePublishStaged}
          disabled={busy}
          style={{ background: '#b45309', borderColor: '#b45309' }}
          title="Grava todos os 71 novos produtos preparados diretamente na coleção products do Firestore"
        >
          {busy ? 'Publicando…' : '🚀 Publicar Novos Produtos no Firestore (71 itens)'}
        </button>
        <button type="button" onClick={handleMigration} disabled={busy}>{busy ? 'Sincronizando…' : 'Sincronizar catálogo legado'}</button>
        <button type="button" className="secondary-button" onClick={() => signOut(auth)} disabled={busy}>Sair</button>
        {onClose && (
          <button type="button" className="secondary-button" onClick={onClose} disabled={busy}>Ocultar</button>
        )}
      </div>

      {message && <p className="notice success">{message}</p>}
      {error && <p className="notice error" role="alert">{error}</p>}

      <div className="admin-gifts-section">
        <div className="admin-gifts-header">
          <h3>💌 Mensagens e Presentes Recebidos ({reservations.length})</h3>
          <p>Veja quem marcou ou comprou presentes e leia os recados especiais deixados para você:</p>
        </div>

        {reservationsLoading && <p className="notice">Carregando mensagens com carinho…</p>}

        {!reservationsLoading && reservations.length === 0 && (
          <p className="empty-state" style={{ padding: '24px 0' }}>
            Nenhum presente foi marcado ainda. As mensagens dos convidados aparecerão aqui em tempo real! ✨
          </p>
        )}

        {!reservationsLoading && reservations.length > 0 && (
          <div className="admin-gifts-list">
            {reservations.map(res => {
              const product = productsById[res.productId];
              const dateStr = res.createdAt?.toDate
                ? res.createdAt.toDate().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                : 'Recentemente';

              return (
                <article key={res.id} className="admin-gift-card">
                  <div className="admin-gift-card-header">
                    <div>
                      <span className={`gift-tag ${res.status === 'received' ? 'done' : 'reserved'}`}>
                        {res.status === 'received' ? '🌸 Já comprou' : '⏳ Vai comprar'}
                      </span>
                      <h4>{product?.name || res.productId}</h4>
                      {product?.priceLabel && <span className="gift-price">{product.priceLabel}</span>}
                    </div>
                    <button
                      type="button"
                      className="text-link-button"
                      onClick={() => handleCancelGift(res.productId, product?.name || res.productId)}
                      title="Liberar presente de volta ao catálogo"
                    >
                      Liberar item ↺
                    </button>
                  </div>

                  <div className="admin-gift-donor">
                    <p>
                      <strong>Quem deu:</strong> {res.isAnonymous ? '🕵️ Amigo(a) Secreto(a) (Anônimo)' : (res.name || 'Não informado')}
                      {res.email && <span className="donor-contact"> · {res.email}</span>}
                      <span className="donor-date"> · {dateStr}</span>
                    </p>
                  </div>

                  {res.message ? (
                    <blockquote className="admin-gift-message">
                      “{res.message}”
                    </blockquote>
                  ) : (
                    <p className="admin-gift-no-message">Sem mensagem de texto.</p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
