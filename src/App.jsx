import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { auth, db } from './firebase/config.js';
import ProductCard from './components/ProductCard.jsx';
import AdminMigrationPanel from './components/AdminMigrationPanel.jsx';
import GiftModal from './components/GiftModal.jsx';
import { cancelReservation, subscribeToPublicReservations } from './services/reservationService.js';

const categoryLabels = {
  casa: '🏡 Casa',
  moda: '👗 Vestuário',
  joias: '💍 Joias',
  livros: '📚 Livros',
  tecnologia: '💻 Tecnologia',
  arte: '🎨 Arte e espiritualidade',
  jardim: '🌳 Jardim externo',
  pets: '🐾 Pets',
};

function labelFromValue(value) {
  return value
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function isTikTokSource(product) {
  const source = [
    product.store,
    product.source,
    product.url,
    product.sourceUrl,
    product.link,
  ]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase('pt-BR');

  return source.includes('tiktok');
}

export default function App() {
  const [firestoreProducts, setFirestoreProducts] = useState([]);
  const [firestoreStatus, setFirestoreStatus] = useState('loading');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [subcategory, setSubcategory] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sort, setSort] = useState('priority');
  const [publicReservations, setPublicReservations] = useState({});
  const [giftingProduct, setGiftingProduct] = useState(null);
  const [openSubmenu, setOpenSubmenu] = useState(null);
  const [searchVisible, setSearchVisible] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    const adminParam = params.get('admin');
    return adminParam === 'true' || adminParam === '';
  });

  useEffect(() => {
    function handlePointerDown(e) {
      // Menus/diálogos de navegação fecham ao clicar fora da própria caixa.
      // Isso também permite clicar no espaço vazio do cabeçalho sem manter
      // um submenu aberto sobre o conteúdo.
      if (!e.target.closest('.nav-item-dropdown')) {
        setOpenSubmenu(null);
      }

      // A busca é tratada como uma caixa independente e também recolhe
      // quando o usuário clica fora dela.
      if (!e.target.closest('.top-search-bar') && !e.target.closest('.top-action-icon-btn')) {
        setSearchVisible(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  useEffect(() => {
    let active = true;

    const unsubscribeAuth = onAuthStateChanged(auth, currentUser => {
      if (!active) return;
      setUser(currentUser);
      if (!currentUser) {
        signInAnonymously(auth).catch(() => setError('Não foi possível iniciar a sessão do visitante.'));
      }
    });

    const productsQuery = query(collection(db, 'products'), orderBy('name'));
    const unsubscribeProducts = onSnapshot(
      productsQuery,
      snapshot => {
        if (!active) return;
        setFirestoreProducts(snapshot.docs.map(document => ({ id: document.id, ...document.data() })));
        setFirestoreStatus(snapshot.empty ? 'empty' : 'ready');
        setError('');
        setLoading(false);
      },
      () => {
        if (!active) return;
        setFirestoreStatus('unavailable');
        setError('Não foi possível carregar os presentes do Firestore no momento.');
        setLoading(false);
      }
    );

    const unsubscribeReservations = subscribeToPublicReservations(
      map => {
        if (!active) return;
        setPublicReservations(map);
      }
    );

    return () => {
      active = false;
      unsubscribeAuth();
      unsubscribeProducts();
      unsubscribeReservations();
    };
  }, []);

  async function handleCancelReservation(productId) {
    const confirmed = window.confirm('Deseja realmente desfazer sua marcação neste presente?');
    if (!confirmed) return;
    try {
      await cancelReservation(productId);
    } catch (err) {
      alert('Não foi possível cancelar: ' + (err?.message || 'Erro inesperado.'));
    }
  }

  const sourceProducts = useMemo(() => {
    // Firestore é a fonte única da verdade para os presentes
    return firestoreProducts.filter(product => !isTikTokSource(product));
  }, [firestoreProducts]);

  const availableCategories = useMemo(
    () => [...new Set(sourceProducts.map(product => product.category).filter(Boolean))].sort(),
    [sourceProducts]
  );

  const availableSubcategories = useMemo(() => {
    const productsInCategory = category === 'all'
      ? sourceProducts
      : sourceProducts.filter(product => product.category === category);
    return [...new Set(productsInCategory.map(product => product.subcategory).filter(Boolean))].sort();
  }, [sourceProducts, category]);

  const visibleProducts = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    const filtered = sourceProducts.filter(product => {
      if (product.published === false || product.visible === false) return false;
      const matchesCategory = category === 'all' || product.category === category;
      const matchesSubcategory = subcategory === 'all' || product.subcategory === subcategory;
      const matchesPriority = priorityFilter === 'all' || (() => {
        const p = String(product.priority || product.prioridade || '').trim().toLowerCase();
        if (priorityFilter === 'alta') return p === 'alta' || p === 'essencial' || p === 'obra fundamental';
        if (priorityFilter === 'media') return p === 'media' || p === 'média';
        if (priorityFilter === 'baixa') return p === 'baixa';
        return true;
      })();
      const searchable = `${product.name} ${product.collection || ''} ${product.description || ''} ${product.dream || ''} ${product.story || ''}`.toLocaleLowerCase('pt-BR');
      return matchesCategory && matchesSubcategory && matchesPriority && searchable.includes(term);
    });

    const priorityWeights = {
      alta: 3,
      essencial: 3,
      'obra fundamental': 3,
      media: 2,
      média: 2,
      baixa: 1
    };

    if (sort === 'priority') {
      return [...filtered].sort((a, b) => {
        const valA = String(a.priority || a.prioridade || '').trim().toLowerCase();
        const valB = String(b.priority || b.prioridade || '').trim().toLowerCase();
        const weightA = priorityWeights[valA] || 0;
        const weightB = priorityWeights[valB] || 0;
        if (weightB !== weightA) return weightB - weightA;
        return a.name.localeCompare(b.name, 'pt-BR');
      });
    }

    if (sort === 'priorityAsc') {
      return [...filtered].sort((a, b) => {
        const valA = String(a.priority || a.prioridade || '').trim().toLowerCase();
        const valB = String(b.priority || b.prioridade || '').trim().toLowerCase();
        const weightA = priorityWeights[valA] || 0;
        const weightB = priorityWeights[valB] || 0;
        if (weightA !== weightB) return weightA - weightB;
        return a.name.localeCompare(b.name, 'pt-BR');
      });
    }

    if (sort === 'priceAsc') return [...filtered].sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
    if (sort === 'priceDesc') return [...filtered].sort((a, b) => (b.price ?? -Infinity) - (a.price ?? -Infinity));
    if (sort === 'nameAsc') return [...filtered].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    return filtered;
  }, [sourceProducts, search, category, subcategory, priorityFilter, sort]);

  function handleCategoryChange(event) {
    setCategory(event.target.value);
    setSubcategory('all');
  }

  const baseUrl = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');

  return (
    <div className="app-shell">
      {/* Folhagens Botânicas Vitorianas de Fundo */}
      <div className="foliage-frame foliage-frame-left" aria-hidden="true">
        <img
          src={`${baseUrl}/images/foliage-branch-left.svg`}
          alt=""
          loading="eager"
        />
      </div>
      <div className="foliage-frame foliage-frame-right" aria-hidden="true">
        <img
          src={`${baseUrl}/images/foliage-branch-right.svg`}
          alt=""
          loading="eager"
        />
      </div>

      {/* Barra de Topo Estilo Herbarium Vitoriano com Submenus Interativos */}
      <nav className="site-top-bar" aria-label="Navegação superior">
        <div className="site-top-bar-brand">
          <span className="brand-title">O Jardim dos Presentes</span>
          <span className="brand-author">de Michèlé Joohann</span>
        </div>

        <div className="site-top-bar-nav">
          {/* Menu Coleções */}
          <div className="nav-item-dropdown">
            <button
              type="button"
              className={`top-nav-link ${category !== 'all' ? 'active' : ''}`}
              onClick={() => setOpenSubmenu(prev => prev === 'colecoes' ? null : 'colecoes')}
              aria-expanded={openSubmenu === 'colecoes'}
            >
              Coleções <span className="nav-arrow" aria-hidden="true">▾</span>
            </button>
            {openSubmenu === 'colecoes' && (
              <div className="top-submenu-dropdown" role="menu">
                <button
                  type="button"
                  className={`submenu-item ${category === 'all' ? 'active' : ''}`}
                  onClick={() => {
                    setCategory('all');
                    setSubcategory('all');
                    setOpenSubmenu(null);
                    document.querySelector('.catalog-section-title')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  🌿 Todas as coleções
                </button>
                {availableCategories.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    className={`submenu-item ${category === cat ? 'active' : ''}`}
                    onClick={() => {
                      setCategory(cat);
                      setSubcategory('all');
                      setOpenSubmenu(null);
                      document.querySelector('.catalog-section-title')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    {categoryLabels[cat] || labelFromValue(cat)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Menu Novidades */}
          <div className="nav-item-dropdown">
            <button
              type="button"
              className={`top-nav-link ${priorityFilter !== 'all' ? 'active' : ''}`}
              onClick={() => setOpenSubmenu(prev => prev === 'novidades' ? null : 'novidades')}
              aria-expanded={openSubmenu === 'novidades'}
            >
              Novidades <span className="nav-arrow" aria-hidden="true">▾</span>
            </button>
            {openSubmenu === 'novidades' && (
              <div className="top-submenu-dropdown" role="menu">
                <button
                  type="button"
                  className={`submenu-item ${priorityFilter === 'all' ? 'active' : ''}`}
                  onClick={() => {
                    setPriorityFilter('all');
                    setOpenSubmenu(null);
                    document.querySelector('.catalog-section-title')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  ⭐ Todas as prioridades
                </button>
                <button
                  type="button"
                  className={`submenu-item priority-alta ${priorityFilter === 'alta' ? 'active' : ''}`}
                  onClick={() => {
                    setPriorityFilter('alta');
                    setOpenSubmenu(null);
                    document.querySelector('.catalog-section-title')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  🍃 Alta prioridade (Essencial)
                </button>
                <button
                  type="button"
                  className={`submenu-item priority-media ${priorityFilter === 'media' ? 'active' : ''}`}
                  onClick={() => {
                    setPriorityFilter('media');
                    setOpenSubmenu(null);
                    document.querySelector('.catalog-section-title')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  🌸 Média prioridade
                </button>
                <button
                  type="button"
                  className={`submenu-item priority-baixa ${priorityFilter === 'baixa' ? 'active' : ''}`}
                  onClick={() => {
                    setPriorityFilter('baixa');
                    setOpenSubmenu(null);
                    document.querySelector('.catalog-section-title')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  🌰 Baixa prioridade
                </button>
              </div>
            )}
          </div>

          {/* Menu Ocasiões */}
          <div className="nav-item-dropdown">
            <button
              type="button"
              className={`top-nav-link ${subcategory !== 'all' ? 'active' : ''}`}
              onClick={() => setOpenSubmenu(prev => prev === 'ocasioes' ? null : 'ocasioes')}
              aria-expanded={openSubmenu === 'ocasioes'}
            >
              Ocasiões <span className="nav-arrow" aria-hidden="true">▾</span>
            </button>
            {openSubmenu === 'ocasioes' && (
              <div className="top-submenu-dropdown" role="menu">
                <button
                  type="button"
                  className={`submenu-item ${subcategory === 'all' ? 'active' : ''}`}
                  onClick={() => {
                    setSubcategory('all');
                    setOpenSubmenu(null);
                    document.querySelector('.catalog-section-title')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  🌿 Todas as ocasiões
                </button>
                {availableSubcategories.map(sub => (
                  <button
                    key={sub}
                    type="button"
                    className={`submenu-item ${subcategory === sub ? 'active' : ''}`}
                    onClick={() => {
                      setSubcategory(sub);
                      setOpenSubmenu(null);
                      document.querySelector('.catalog-section-title')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    🌱 {labelFromValue(sub)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Menu Sobre */}
          <div className="nav-item-dropdown">
            <button
              type="button"
              className={`top-nav-link ${openSubmenu === 'sobre' ? 'active' : ''}`}
              onClick={() => setOpenSubmenu(prev => prev === 'sobre' ? null : 'sobre')}
              aria-expanded={openSubmenu === 'sobre'}
            >
              Sobre <span className="nav-arrow" aria-hidden="true">▾</span>
            </button>
            {openSubmenu === 'sobre' && (
              <div className="top-submenu-dropdown top-submenu-about" role="menu">
                <p className="submenu-about-text">
                  <strong>O Jardim dos Presentes</strong> de Michèlé Joohann é uma curadoria de desejos e memórias afetivas, onde cada presente é cultivado com carinho, significado e história.
                </p>
              </div>
            )}
          </div>

        {/* Menu Contato — mantém a navegação informativa sem inventar dados de contato */}
        <div className="nav-item-dropdown">
          <button
            type="button"
            className={`top-nav-link ${openSubmenu === 'contato' ? 'active' : ''}`}
            onClick={() => setOpenSubmenu(prev => prev === 'contato' ? null : 'contato')}
            aria-expanded={openSubmenu === 'contato'}
          >
            Contato <span className="nav-arrow" aria-hidden="true">▾</span>
          </button>
          {openSubmenu === 'contato' && (
            <div className="top-submenu-dropdown top-submenu-about" role="menu">
              <p className="submenu-about-text">
                <strong>Jardim dos Presentes</strong><br />
                Para falar comigo sobre o Jardim dos Presentes, escreva para:<br />
                <a className="contact-email-link" href="mailto:michelejoohann@gmail.com">michelejoohann@gmail.com</a>
              </p>
            </div>
          )}
        </div>

        </div>

        <div className={`site-top-bar-actions ${searchVisible ? 'search-open' : ''}`}>
          {searchVisible ? (
            <div className="top-search-bar">
              <input
                type="search"
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Encontre o presente perfeito…"
                aria-label="Buscar presentes"
                className="top-search-input"
                autoFocus
              />
              <button
                type="button"
                className="top-search-close"
                aria-label="Fechar busca"
                title="Fechar busca"
                onClick={() => setSearchVisible(false)}
              >
                ×
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="top-action-icon-btn"
              title="Buscar presentes"
              aria-label="Abrir busca"
              onClick={() => setSearchVisible(true)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </button>
          )}
          <button
            type="button"
            className="top-action-icon-btn"
            title="Painel de Administração"
            aria-label="Administração"
            onClick={() => setShowAdminPanel(prev => !prev)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </button>
        </div>
      </nav>

      {/* Hero Ultra Compacto (Opção 1) */}
      <header className="hero">
        <h1 className="hero-title">O Jardim dos Presentes</h1>
        <p className="hero-subtitle">Curadoria Exclusiva de Sonhos: Onde a Magia do Presente se Revela.</p>
        
        {/* Selo Medalhão Central: MJ em fonte vintage com círculo de Heras Enroladas */}
        <div className="hero-emblem" aria-hidden="true">
          <svg className="hero-emblem-svg" viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="medallionIvyGold" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#c59f5a" />
                <stop offset="50%" stopColor="#b38b45" />
                <stop offset="100%" stopColor="#8a6728" />
              </linearGradient>
              <linearGradient id="medallionLeafFill" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#eaf3e3" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#b9d4ad" stopOpacity="0.5" />
              </linearGradient>
            </defs>

            {/* Selo Base Central com Borda Dupla Nobre */}
            <circle cx="70" cy="70" r="33" fill="#fdfbf7" stroke="url(#medallionIvyGold)" strokeWidth="1.8" />
            <circle cx="70" cy="70" r="28.5" fill="none" stroke="#b38b45" strokeWidth="0.8" strokeDasharray="2.5 2" opacity="0.85" />

            {/* Monograma MJ Vintage em Caligrafia Nobre */}
            <g fontFamily="'Cormorant Garamond', 'Cinzel', Georgia, serif" fontWeight="700">
              <text x="69" y="78" textAnchor="middle" fontSize="24" fontStyle="italic" fill="#183120" letterSpacing="1">
                M<tspan fontSize="15" fill="#b38b45" dy="-3">·</tspan><tspan dy="3">J</tspan>
              </text>
            </g>

            {/* ==============================================================
                 RAMOS DE HERA ENROLADAS (Hedera helix) AO REDOR DO CÍRCULO
                 ============================================================== */}
            {/* Caule de Hera Contornando a Esquerda */}
            <path d="M 70 105 C 44 105, 27 88, 30 68 C 33 46, 50 33, 70 33" stroke="url(#medallionIvyGold)" strokeWidth="1.6" strokeLinecap="round" />
            
            {/* Caule de Hera Contornando a Direita */}
            <path d="M 70 105 C 96 105, 113 88, 110 68 C 107 46, 90 33, 70 33" stroke="url(#medallionIvyGold)" strokeWidth="1.6" strokeLinecap="round" />

            {/* Entrelaçamento de Gavinhas no Topo e Base */}
            <path d="M 64 35 C 70 28, 76 28, 82 35" stroke="url(#medallionIvyGold)" strokeWidth="1.3" />
            <path d="M 63 103 C 70 110, 77 110, 84 103" stroke="url(#medallionIvyGold)" strokeWidth="1.3" />

            {/* Folha de Hera 1 (Inferior Esquerda - 3 lóbulos pontiagudos) */}
            <path d="M 44 96 C 36 102, 26 108, 18 116 C 22 106, 16 100, 12 98 C 20 94, 25 88, 30 82 C 35 88, 41 93, 44 96 Z" fill="url(#medallionLeafFill)" stroke="url(#medallionIvyGold)" strokeWidth="1.1" />
            <path d="M 38 90 L 22 110" stroke="#8a6728" strokeWidth="0.6" opacity="0.8" />

            {/* Folha de Hera 2 (Lateral Esquerda - Lóbulo clássico) */}
            <path d="M 30 68 C 22 67, 12 70, 5 68 C 12 62, 11 53, 7 47 C 17 50, 23 56, 30 62 C 30 65, 30 67, 30 68 Z" fill="url(#medallionLeafFill)" stroke="url(#medallionIvyGold)" strokeWidth="1.1" />
            <path d="M 26 62 L 9 66" stroke="#8a6728" strokeWidth="0.6" opacity="0.8" />

            {/* Folha de Hera 3 (Superior Esquerda) */}
            <path d="M 46 42 C 40 32, 31 25, 24 18 C 28 26, 26 33, 22 38 C 32 38, 39 40, 46 42 Z" fill="url(#medallionLeafFill)" stroke="url(#medallionIvyGold)" strokeWidth="1" />

            {/* Folha de Hera 4 (Topo Central) */}
            <path d="M 70 32 C 67 22, 59 15, 55 7 C 63 15, 68 17, 70 20 C 72 17, 77 15, 85 7 C 81 15, 73 22, 70 32 Z" fill="url(#medallionLeafFill)" stroke="url(#medallionIvyGold)" strokeWidth="1" />

            {/* Folha de Hera 5 (Superior Direita) */}
            <path d="M 94 42 C 100 32, 109 25, 116 18 C 112 26, 114 33, 118 38 C 108 38, 101 40, 94 42 Z" fill="url(#medallionLeafFill)" stroke="url(#medallionIvyGold)" strokeWidth="1" />

            {/* Folha de Hera 6 (Lateral Direita) */}
            <path d="M 110 68 C 118 67, 128 70, 135 68 C 128 62, 129 53, 133 47 C 123 50, 117 56, 110 62 C 110 65, 110 67, 110 68 Z" fill="url(#medallionLeafFill)" stroke="url(#medallionIvyGold)" strokeWidth="1.1" />
            <path d="M 114 62 L 131 66" stroke="#8a6728" strokeWidth="0.6" opacity="0.8" />

            {/* Folha de Hera 7 (Inferior Direita) */}
            <path d="M 96 96 C 104 102, 114 108, 122 116 C 118 106, 124 100, 128 98 C 120 94, 115 88, 110 82 C 105 88, 99 93, 96 96 Z" fill="url(#medallionLeafFill)" stroke="url(#medallionIvyGold)" strokeWidth="1.1" />
            <path d="M 102 90 L 118 110" stroke="#8a6728" strokeWidth="0.6" opacity="0.8" />

            {/* Espirais de Gavinhas Delicadas de Hera */}
            <path d="M 22 84 C 16 86, 12 80, 15 76 C 18 72, 22 75, 20 78" stroke="url(#medallionIvyGold)" strokeWidth="0.9" />
            <path d="M 118 84 C 124 86, 128 80, 125 76 C 122 72, 118 75, 120 78" stroke="url(#medallionIvyGold)" strokeWidth="0.9" />
          </svg>
        </div>
      </header>

      <main className="content">
        {showAdminPanel && (
          <AdminMigrationPanel
            user={user}
            firestoreCount={firestoreProducts.length}
            onClose={() => setShowAdminPanel(false)}
            products={sourceProducts}
          />
        )}

        <h2 className="catalog-section-title">Nossa Curadoria do Sonho</h2>

        {loading && <p className="notice">Conectando ao Jardim…</p>}
        {firestoreStatus === 'empty' && !loading && <p className="notice warning">Nenhum presente cadastrado no Firestore.</p>}
        {firestoreStatus === 'unavailable' && <p className="notice error" role="alert">O catálogo de presentes está indisponível no momento. Por favor, tente recarregar a página.</p>}
        {error && firestoreStatus !== 'unavailable' && <p className="notice error" role="alert">{error}</p>}

        <section className="product-grid" aria-live="polite">
          {visibleProducts.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              reservation={publicReservations[product.id]}
              currentVisitorUid={user?.uid}
              onOpenGift={setGiftingProduct}
              onCancelReservation={handleCancelReservation}
            />
          ))}
        </section>

        {!loading && visibleProducts.length === 0 && <p className="empty-state">Nenhum presente encontrado com esses filtros.</p>}

        {giftingProduct && (
          <GiftModal
            product={giftingProduct}
            user={user}
            onClose={() => setGiftingProduct(null)}
          />
        )}
      </main>
    </div>
  );
}
