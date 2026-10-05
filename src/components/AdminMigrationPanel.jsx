import { useEffect, useMemo, useState } from 'react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '../firebase/config.js';
import { publishStagedProductsToFirestore } from '../services/stagedMigration.js';
import { cancelReservation, subscribeToPrivateReservations } from '../services/reservationService.js';
import { deleteProduct } from '../services/productService.js';
import ProductEditorModal from './ProductEditorModal.jsx';

const ADMIN_UID = '7G4v3hEMtaVzI8MUDsXjVCNXGJz1';

export default function AdminMigrationPanel({
  user,
  firestoreCount = 0,
  onClose,
  products = [],
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [reservations, setReservations] = useState([]);
  const [reservationsLoading, setReservationsLoading] = useState(true);

  // Controle de abas: 'products' | 'messages' | 'migration'
  const [activeTab, setActiveTab] = useState('products');

  // Estado do modal de criar / editar presente
  const [editingProduct, setEditingProduct] = useState(null);
  const [isCreating, setIsCreating] = useState(false);

  // Filtros internos da lista administrativa de presentes
  const [searchFilter, setSearchFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

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
        throw new Error('Esta conta não possui credenciais de administradora.');
      }
      setPassword('');
      setMessage('Acesso administrativo confirmado com sucesso! Seja bem-vinda, Michèlé.');
    } catch (err) {
      setError(err?.message || 'Não foi possível entrar no painel administrativo.');
    } finally {
      setBusy(false);
    }
  }

  async function handlePublishStaged() {
    const confirmed = window.confirm(
      'Publicar todos os produtos do staging diretamente no Firestore?\n\nSerão gravados 71 itens completos com fotos, prioridades e textos afetivos.'
    );
    if (!confirmed) return;

    setBusy(true);
    setMessage('');
    setError('');
    try {
      const total = await publishStagedProductsToFirestore();
      setMessage(`🎉 Sucesso! ${total} produtos novos foram gravados na coleção products do Firestore!`);
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

  async function handleDeleteProduct(prod) {
    const confirmed = window.confirm(
      `⚠️ Tem certeza de que deseja excluir permanentemente o presente:\n\n"${prod.name}"?\n\nEsta ação removerá o item do catálogo e da base de dados do Firestore.`
    );
    if (!confirmed) return;

    setBusy(true);
    setError('');
    setMessage('');
    try {
      await deleteProduct(prod.id);
      setMessage(`O presente "${prod.name}" foi excluído com sucesso do Firestore.`);
    } catch (err) {
      console.error(err);
      setError(`Erro ao excluir o presente: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  const productsById = useMemo(() => {
    return products.reduce((acc, item) => {
      acc[item.id] = item;
      return acc;
    }, {});
  }, [products]);

  const reservationsByProductId = useMemo(() => {
    return reservations.reduce((acc, res) => {
      acc[res.productId] = res;
      return acc;
    }, {});
  }, [reservations]);

  // Lista filtrada de produtos no painel
  const filteredProducts = useMemo(() => {
    const term = searchFilter.trim().toLowerCase();
    return products.filter(p => {
      const matchesSearch = !term ||
        p.name?.toLowerCase().includes(term) ||
        p.collection?.toLowerCase().includes(term) ||
        p.subcategory?.toLowerCase().includes(term) ||
        p.category?.toLowerCase().includes(term);

      const matchesCat = categoryFilter === 'all' || p.category === categoryFilter;
      const matchesPrio = priorityFilter === 'all' ||
        String(p.priority || p.prioridade || '').toLowerCase() === priorityFilter;

      const res = reservationsByProductId[p.id];
      const effectiveStatus = res?.status || p.status || 'available';
      const matchesStatus = statusFilter === 'all' || effectiveStatus === statusFilter;

      return matchesSearch && matchesCat && matchesPrio && matchesStatus;
    });
  }, [products, searchFilter, categoryFilter, priorityFilter, statusFilter, reservationsByProductId]);

  const totalReceived = useMemo(() => {
    return reservations.filter(r => r.status === 'received').length;
  }, [reservations]);

  const totalReserved = useMemo(() => {
    return reservations.filter(r => r.status === 'reserved').length;
  }, [reservations]);

  // Se não estiver logada como administradora, exibe tela de login
  if (!isAdmin) {
    return (
      <section className="admin-panel admin-panel-login" aria-labelledby="admin-title">
        <div className="admin-header-row">
          <div>
            <p className="section-kicker">Administração</p>
            <h2 id="admin-title">Área Administrativa</h2>
            <p>Entre com a conta da administradora para gerenciar presentes e mensagens com carinho.</p>
          </div>
          {onClose && (
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
              style={{ whiteSpace: 'nowrap', padding: '6px 14px', fontSize: '0.85rem' }}
              title="Ocultar painel administrativo"
            >
              ✕ Ocultar
            </button>
          )}
        </div>

        <form className="admin-login" onSubmit={handleLogin}>
          <label>
            E-mail de Acesso
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="username"
              placeholder="seu-email@exemplo.com"
            />
          </label>
          <label>
            Senha
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </label>
          <button type="submit" disabled={busy}>
            {busy ? 'Entrando…' : 'Entrar como administradora 🔑'}
          </button>
        </form>

        {message && <p className="notice success">{message}</p>}
        {error && <p className="notice error" role="alert">{error}</p>}
      </section>
    );
  }

  return (
    <section className="admin-panel admin-panel-full" aria-labelledby="admin-title">
      {/* CABEÇALHO DO PAINEL GERENCIAL */}
      <div className="admin-header-row">
        <div>
          <p className="section-kicker">Painel da Michèlé</p>
          <h2 id="admin-title">Gestão do Jardim & Catálogo</h2>
          <p className="admin-subtitle">
            Gerencie cada presente com amor, leia os votos dos convidados e mantenha seu Jardim impecável.
          </p>
        </div>

        <div className="admin-actions">
          <button
            type="button"
            className="primary-button admin-create-btn"
            onClick={() => setIsCreating(true)}
            title="Adicionar um novo presente ao catálogo do Firestore"
          >
            ✨ + Novo Presente
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => signOut(auth)}
            disabled={busy}
            title="Encerrar sessão de administradora"
          >
            Sair
          </button>
          {onClose && (
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
              disabled={busy}
              title="Ocultar painel"
            >
              ✕ Ocultar
            </button>
          )}
        </div>
      </div>

      {/* CARDS DE RESUMO E ESTATÍSTICAS */}
      <div className="admin-metrics-bar">
        <div className="metric-badge">
          <span className="metric-icon">🎁</span>
          <div>
            <strong>{firestoreCount || products.length}</strong>
            <small>Presentes no catálogo</small>
          </div>
        </div>
        <div className="metric-badge">
          <span className="metric-icon">💌</span>
          <div>
            <strong>{reservations.length}</strong>
            <small>Gestos recebidos</small>
          </div>
        </div>
        <div className="metric-badge">
          <span className="metric-icon">🌸</span>
          <div>
            <strong>{totalReceived}</strong>
            <small>Florescidos (já comprados)</small>
          </div>
        </div>
        <div className="metric-badge">
          <span className="metric-icon">⏳</span>
          <div>
            <strong>{totalReserved}</strong>
            <small>Planejados (vão comprar)</small>
          </div>
        </div>
      </div>

      {/* ABAS DO PAINEL */}
      <div className="admin-tabs-nav" role="tablist">
        <button
          type="button"
          className={`admin-tab-btn ${activeTab === 'products' ? 'active' : ''}`}
          onClick={() => setActiveTab('products')}
        >
          🎁 Gerenciar Presentes ({products.length})
        </button>
        <button
          type="button"
          className={`admin-tab-btn ${activeTab === 'messages' ? 'active' : ''}`}
          onClick={() => setActiveTab('messages')}
        >
          💌 Mensagens & Recados ({reservations.length})
        </button>
        <button
          type="button"
          className={`admin-tab-btn ${activeTab === 'migration' ? 'active' : ''}`}
          onClick={() => setActiveTab('migration')}
        >
          🚀 Carga em Lote / Staging
        </button>
      </div>

      {message && <p className="notice success">{message}</p>}
      {error && <p className="notice error" role="alert">{error}</p>}

      {/* CONTEÚDO DA ABA 1: GERENCIAR PRESENTES */}
      {activeTab === 'products' && (
        <div className="admin-tab-content">
          {/* BARRA DE FILTROS DA TABELA */}
          <div className="admin-filter-toolbar">
            <div className="admin-search-box">
              <input
                type="search"
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                placeholder="Buscar presente por nome, coleção ou jardim…"
              />
            </div>

            <div className="admin-filter-selects">
              <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
                <option value="all">Todas as Categorias</option>
                <option value="casa">🏡 Casa</option>
                <option value="tecnologia">💻 Tecnologia</option>
                <option value="moda">👗 Vestuário</option>
                <option value="joias">💍 Joias</option>
                <option value="livros">📚 Livros</option>
                <option value="arte">🎨 Arte e espiritualidade</option>
                <option value="jardim">🌳 Jardim externo</option>
                <option value="pets">🐾 Pets</option>
              </select>

              <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}>
                <option value="all">Todas as Prioridades</option>
                <option value="alta">⭐ Alta / Essencial</option>
                <option value="media">🌸 Média</option>
                <option value="baixa">🌰 Baixa</option>
              </select>

              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="all">Todos os Status</option>
                <option value="available">🌿 Disponíveis</option>
                <option value="reserved">⏳ Reservados</option>
                <option value="received">🌸 Florescidos</option>
              </select>

              <button
                type="button"
                className="primary-button"
                style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                onClick={() => setIsCreating(true)}
              >
                + Novo Presente
              </button>
            </div>
          </div>

          <div className="admin-table-container">
            {filteredProducts.length === 0 ? (
              <p className="empty-state" style={{ padding: '36px 0' }}>
                Nenhum presente encontrado com os filtros selecionados.
              </p>
            ) : (
              <table className="admin-products-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Jardim / Coleção</th>
                    <th>Valor</th>
                    <th>Prioridade</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map(prod => {
                    const res = reservationsByProductId[prod.id];
                    const effectiveStatus = res?.status || prod.status || 'available';
                    const rawImage = prod.imageUrl || prod.image;
                    const imageUrl = rawImage?.startsWith('/') && !rawImage.startsWith(import.meta.env.BASE_URL)
                      ? `${import.meta.env.BASE_URL.replace(/\/$/, '')}${rawImage}`
                      : rawImage;

                    const priorityLower = String(prod.priority || prod.prioridade || '').toLowerCase();

                    return (
                      <tr key={prod.id}>
                        <td className="product-table-identity">
                          <div className="table-thumb">
                            {imageUrl ? (
                              <img src={imageUrl} alt="" loading="lazy" />
                            ) : (
                              <span>🌿</span>
                            )}
                          </div>
                          <div>
                            <strong>{prod.name}</strong>
                            {prod.published === false && (
                              <span className="badge-draft">Rascunho / Oculto</span>
                            )}
                          </div>
                        </td>

                        <td>
                          <span className="badge-collection">{prod.collection || prod.category || 'Geral'}</span>
                          {prod.subcategory && <small className="badge-sub">{prod.subcategory}</small>}
                        </td>

                        <td>
                          <span className="table-price">{prod.priceLabel || (prod.price ? `R$ ${prod.price}` : 'Sob consulta')}</span>
                        </td>

                        <td>
                          <span className={`priority-badge priority-${priorityLower}`}>
                            {priorityLower.includes('alta') ? '⭐ ' : ''}
                            {prod.priority || prod.prioridade || 'Média'}
                          </span>
                        </td>

                        <td>
                          {effectiveStatus === 'received' ? (
                            <span className="gift-tag done">🌸 Floresceu</span>
                          ) : effectiveStatus === 'reserved' ? (
                            <span className="gift-tag reserved">⏳ Reservado</span>
                          ) : (
                            <span className="gift-tag available">🌿 Disponível</span>
                          )}
                        </td>

                        <td className="product-table-actions">
                          {prod.url && (
                            <a
                              href={prod.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="table-action-icon"
                              title="Abrir página oficial do produto"
                            >
                              ↗ Loja
                            </a>
                          )}
                          <button
                            type="button"
                            className="table-action-btn edit"
                            onClick={() => setEditingProduct(prod)}
                            title="Editar informações deste presente"
                          >
                            ✏️ Editar
                          </button>
                          <button
                            type="button"
                            className="table-action-btn delete"
                            onClick={() => handleDeleteProduct(prod)}
                            disabled={busy}
                            title="Excluir este presente do catálogo"
                          >
                            🗑️ Excluir
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* CONTEÚDO DA ABA 2: MENSAGENS E RECADOS */}
      {activeTab === 'messages' && (
        <div className="admin-tab-content">
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
      )}

      {/* CONTEÚDO DA ABA 3: CARGA EM LOTE / STAGING */}
      {activeTab === 'migration' && (
        <div className="admin-tab-content">
          <div className="admin-migration-box">
            <h3>🚀 Publicação do Lote Preparado (71 itens)</h3>
            <p>
              Use esta ferramenta caso deseje sobrescrever ou republicar o catálogo completo a partir da base estruturada de 71 presentes (com todas as fotos tratadas, textos e categorização).
            </p>
            <button
              type="button"
              className="primary-button"
              onClick={handlePublishStaged}
              disabled={busy}
              style={{ background: '#b45309', borderColor: '#b45309', marginTop: '12px' }}
            >
              {busy ? 'Publicando…' : '🚀 Publicar Novos Produtos no Firestore (71 itens)'}
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE CRIAÇÃO / EDIÇÃO DE PRESENTE */}
      {(isCreating || editingProduct) && (
        <ProductEditorModal
          product={editingProduct}
          onClose={() => {
            setIsCreating(false);
            setEditingProduct(null);
          }}
          onSaved={saved => {
            setMessage(`✨ Presente "${saved.name}" gravado com sucesso no Firestore!`);
            setIsCreating(false);
            setEditingProduct(null);
          }}
        />
      )}
    </section>
  );
}
