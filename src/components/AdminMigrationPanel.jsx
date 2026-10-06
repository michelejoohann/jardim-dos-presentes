import { useEffect, useMemo, useState } from 'react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, db } from '../firebase/config.js';
import { doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { cancelReservation, subscribeToPrivateReservations } from '../services/reservationService.js';
import { deleteProduct, toggleProductEnabled } from '../services/productService.js';
import ProductEditor from './ProductEditor.jsx';

const ADMIN_UID = '7G4v3hEMtaVzI8MUDsXjVCNXGJz1';

export default function AdminMigrationPanel({
  user,
  firestoreCount = 0,
  onClose,
  onNavigateHome,
  products = [],
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [reservations, setReservations] = useState([]);
  const [reservationsLoading, setReservationsLoading] = useState(true);

  // Controle de abas: 'products' | 'messages' | 'backup'
  const [activeTab, setActiveTab] = useState('products');

  // Estado do modal de criar / editar presente
  const [editingProduct, setEditingProduct] = useState(null);
  const [isCreating, setIsCreating] = useState(false);

  // Filtros internos da lista administrativa de presentes
  const [searchFilter, setSearchFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [visibilityFilter, setVisibilityFilter] = useState('all'); // 'all' | 'enabled' | 'disabled'

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

  function handleExportBackup() {
    try {
      const exportData = JSON.stringify(products, null, 2);
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.href = url;
      downloadAnchor.download = `jardim-dos-presentes-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      URL.revokeObjectURL(url);
      setMessage(`📁 Backup exportado com sucesso contendo ${products.length} presentes!`);
    } catch (err) {
      setError('Não foi possível exportar o backup: ' + err.message);
    }
  }

  async function handleImportBackupFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async e => {
      try {
        setBusy(true);
        setError('');
        setMessage('');
        const content = e.target?.result;
        const importedList = JSON.parse(content);
        if (!Array.isArray(importedList) || importedList.length === 0) {
          throw new Error('O arquivo selecionado não contém uma lista válida de presentes.');
        }

        const confirmed = window.confirm(
          `Importar ${importedList.length} presentes do arquivo para o Firestore?\n\nItens existentes com o mesmo ID serão atualizados e novos itens serão criados.`
        );
        if (!confirmed) return;

        const BATCH_SIZE = 400;
        let count = 0;
        for (let start = 0; start < importedList.length; start += BATCH_SIZE) {
          const chunk = importedList.slice(start, start + BATCH_SIZE);
          const batch = writeBatch(db);
          chunk.forEach(prod => {
            if (!prod.id && !prod.name) return;
            const pid = prod.id || String(prod.name).toLowerCase().replace(/[^a-z0-9]+/g, '-');
            const ref = doc(db, 'products', pid);
            batch.set(
              ref,
              {
                ...prod,
                updatedAt: serverTimestamp(),
              },
              { merge: true }
            );
            count += 1;
          });
          await batch.commit();
        }
        setMessage(`🎉 Sucesso! ${count} presentes foram sincronizados diretamente com o Firestore.`);
      } catch (err) {
        setError('Falha ao importar arquivo JSON: ' + (err?.message || 'Arquivo inválido.'));
      } finally {
        setBusy(false);
        event.target.value = '';
      }
    };
    reader.readAsText(file);
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

  async function handleToggleEnabled(prod) {
    const isCurrentlyEnabled = prod.enabled !== false && prod.published !== false && prod.visible !== false;
    try {
      const newStatus = await toggleProductEnabled(prod.id, isCurrentlyEnabled);
      setMessage(`O presente "${prod.name}" agora está ${newStatus ? '🟢 HABILITADO' : '⚪ DESABILITADO'} para visualização no site.`);
    } catch (err) {
      console.error(err);
      setError(`Não foi possível alterar a visibilidade do presente: ${err.message}`);
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
      const isEnabled = p.enabled !== false && p.published !== false && p.visible !== false;

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

      const matchesVisibility = visibilityFilter === 'all' ||
        (visibilityFilter === 'enabled' && isEnabled) ||
        (visibilityFilter === 'disabled' && !isEnabled);

      return matchesSearch && matchesCat && matchesPrio && matchesStatus && matchesVisibility;
    });
  }, [products, searchFilter, categoryFilter, priorityFilter, statusFilter, visibilityFilter, reservationsByProductId]);

  const totalReceived = useMemo(() => {
    return reservations.filter(r => r.status === 'received').length;
  }, [reservations]);

  const totalReserved = useMemo(() => {
    return reservations.filter(r => r.status === 'reserved').length;
  }, [reservations]);

  const totalEnabled = useMemo(() => {
    return products.filter(p => p.enabled !== false && p.published !== false && p.visible !== false).length;
  }, [products]);

  const totalDisabled = useMemo(() => {
    return products.filter(p => p.enabled === false || p.published === false || p.visible === false).length;
  }, [products]);

  const baseUrl = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');

  // Se estiver criando ou editando um presente, exibe a tela de edição fluída (sem modal)
  if (isCreating || editingProduct) {
    return (
      <ProductEditor
        product={editingProduct}
        onBack={() => {
          setIsCreating(false);
          setEditingProduct(null);
        }}
        onSaved={saved => {
          setMessage(`✨ Presente "${saved.name}" gravado com sucesso no Firestore!`);
          setIsCreating(false);
          setEditingProduct(null);
        }}
        onNavigateHome={onNavigateHome || onClose}
      />
    );
  }

  // Se não estiver logada como administradora, exibe tela de login dedicada
  if (!isAdmin) {
    return (
      <section className="admin-panel admin-panel-login" aria-labelledby="admin-title">
        <div className="admin-header-row">
          <div className="admin-brand-header">
            <img
              src={`${baseUrl}/images/logo-michele-joohann.png`}
              alt="Michèlé Joohann"
              className="admin-header-logo"
              width="48"
              height="48"
            />
            <div>
              <p className="section-kicker">Administração do Jardim</p>
              <h2 id="admin-title">Área Administrativa</h2>
              <p>Entre com a conta da administradora para gerenciar presentes e mensagens com carinho.</p>
            </div>
          </div>
          {(onNavigateHome || onClose) && (
            <button
              type="button"
              className="secondary-button admin-back-to-store-btn"
              onClick={onNavigateHome || onClose}
              title="Voltar para a vitrine pública do catálogo"
            >
              ← Voltar ao Jardim / Vitrine
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
        <div className="admin-brand-header">
          <img
            src={`${baseUrl}/images/logo-michele-joohann.png`}
            alt="Michèlé Joohann"
            className="admin-header-logo"
            width="52"
            height="52"
          />
          <div>
            <p className="section-kicker">Painel da Michèlé</p>
            <h2 id="admin-title">Gestão do Jardim & Catálogo</h2>
            <p className="admin-subtitle">
              Gerencie cada presente com amor, leia os votos dos convidados e mantenha seu Jardim impecável.
            </p>
          </div>
        </div>

        <div className="admin-actions">
          {(onNavigateHome || onClose) && (
            <button
              type="button"
              className="secondary-button admin-back-to-store-btn"
              onClick={onNavigateHome || onClose}
              disabled={busy}
              title="Voltar para a vitrine pública do catálogo"
            >
              ← Voltar ao Jardim / Ver Vitrine
            </button>
          )}
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
        </div>
      </div>

      {/* CARDS DE RESUMO E ESTATÍSTICAS */}
      <div className="admin-metrics-bar">
        <div className="metric-badge">
          <span className="metric-icon">🎁</span>
          <div>
            <strong>{firestoreCount || products.length}</strong>
            <small>Total no banco</small>
          </div>
        </div>
        <div className="metric-badge">
          <span className="metric-icon">🟢</span>
          <div>
            <strong>{totalEnabled}</strong>
            <small>Habilitados no site</small>
          </div>
        </div>
        {totalDisabled > 0 && (
          <div className="metric-badge">
            <span className="metric-icon">⚪</span>
            <div>
              <strong>{totalDisabled}</strong>
              <small>Desabilitados (ocultos)</small>
            </div>
          </div>
        )}
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
            <small>Florescidos</small>
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
          className={`admin-tab-btn ${activeTab === 'backup' ? 'active' : ''}`}
          onClick={() => setActiveTab('backup')}
        >
          📁 Backup & Dados
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
              <select value={visibilityFilter} onChange={e => setVisibilityFilter(e.target.value)}>
                <option value="all">Todas as Visibilidades</option>
                <option value="enabled">🟢 Apenas Habilitados no Site</option>
                <option value="disabled">⚪ Apenas Desabilitados (Ocultos)</option>
              </select>

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
                    <th className="col-item">Item</th>
                    <th className="col-collection">Jardim / Coleção</th>
                    <th className="col-price">Valor</th>
                    <th className="col-priority">Prioridade</th>
                    <th className="col-visibility">Exibição no Site</th>
                    <th className="col-status">Status</th>
                    <th className="col-actions" style={{ textAlign: 'right' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map(prod => {
                    const res = reservationsByProductId[prod.id];
                    const effectiveStatus = res?.status || prod.status || 'available';
                    const isEnabled = prod.enabled !== false && prod.published !== false && prod.visible !== false;
                    const rawImage = prod.imageUrl || prod.image;
                    const imageUrl = rawImage?.startsWith('/') && !rawImage.startsWith(import.meta.env.BASE_URL)
                      ? `${import.meta.env.BASE_URL.replace(/\/$/, '')}${rawImage}`
                      : rawImage;

                    const priorityLower = String(prod.priority || prod.prioridade || '').toLowerCase();

                    return (
                      <tr key={prod.id} className={!isEnabled ? 'row-disabled' : ''}>
                        <td className="product-cell-identity">
                          <div className="product-table-identity">
                            <div className="table-thumb">
                              {imageUrl ? (
                                <img src={imageUrl} alt="" loading="lazy" />
                              ) : (
                                <span>🌿</span>
                              )}
                            </div>
                            <div className="product-table-info">
                              <strong>{prod.name}</strong>
                              {!isEnabled && (
                                <span className="badge-draft">Oculto no site</span>
                              )}
                            </div>
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
                          <button
                            type="button"
                            className={`badge-visibility-toggle ${isEnabled ? 'is-enabled' : 'is-disabled'}`}
                            onClick={() => handleToggleEnabled(prod)}
                            title={isEnabled ? 'Clique para desabilitar da vitrine' : 'Clique para habilitar na vitrine'}
                          >
                            {isEnabled ? '🟢 Habilitado' : '⚪ Desabilitado'}
                          </button>
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

      {/* CONTEÚDO DA ABA 3: BACKUP & DADOS */}
      {activeTab === 'backup' && (
        <div className="admin-tab-content">
          <div className="admin-migration-box">
            <h3>📁 Backup & Carga Externa de Dados (100% Firestore)</h3>
            <p>
              Os presentes do seu Jardim são armazenados <strong>exclusivamente na base de dados (Cloud Firestore)</strong>, garantindo código limpo, seguro e desempenho máximo sem dados embutidos.
            </p>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '16px' }}>
              <button
                type="button"
                className="primary-button"
                onClick={handleExportBackup}
                disabled={busy || products.length === 0}
                style={{ background: '#2d6a4f', borderColor: '#2d6a4f' }}
              >
                📥 Baixar Backup JSON ({products.length} presentes)
              </button>

              <label
                className="secondary-button"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  cursor: busy ? 'not-allowed' : 'pointer',
                  margin: 0,
                }}
              >
                📤 Restaurar / Importar Arquivo JSON
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleImportBackupFile}
                  disabled={busy}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '10px' }}>
              Dica: Você pode guardar o arquivo JSON no seu computador como segurança e restaurá-lo a qualquer momento.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
