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
          src={`${baseUrl}/images/herbarium-wild-left.svg`}
          alt=""
          loading="eager"
        />
      </div>
      <div className="foliage-frame foliage-frame-right" aria-hidden="true">
        <img
          src={`${baseUrl}/images/herbarium-wild-right.svg`}
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

          {/* Menu Prioridades */}
          <div className="nav-item-dropdown">
            <button
              type="button"
              className={`top-nav-link ${priorityFilter !== 'all' ? 'active' : ''}`}
              onClick={() => setOpenSubmenu(prev => prev === 'prioridades' ? null : 'prioridades')}
              aria-expanded={openSubmenu === 'prioridades'}
            >
              Prioridades <span className="nav-arrow" aria-hidden="true">▾</span>
            </button>
            {openSubmenu === 'prioridades' && (
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

                <div className="submenu-divider" aria-hidden="true"></div>
                <span className="submenu-section-label">Ordenar por</span>
                {[
                  ['priority', '⭐ Maior prioridade'],
                  ['priorityAsc', '🌱 Menor prioridade'],
                  ['priceAsc', '♡ Menor valor'],
                  ['priceDesc', '♢ Maior valor'],
                  ['nameAsc', 'Aa Nome de A a Z'],
                  ['default', '↕ Ordem original'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={`submenu-item ${sort === value ? 'active' : ''}`}
                    onClick={() => {
                      setSort(value);
                      setOpenSubmenu(null);
                      document.querySelector('.catalog-section-title')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    {label}
                  </button>
                ))}
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
          <svg className="hero-emblem-svg" viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="mjGold" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#8d7040"/>
                <stop offset=".5" stopColor="#c2a76b"/>
                <stop offset="1" stopColor="#765d34"/>
              </linearGradient>
              <filter id="softInk" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation=".35"/>
              </filter>
            </defs>
            <circle cx="90" cy="90" r="39" fill="#fbf8ef" stroke="url(#mjGold)" strokeWidth="2"/>
            <circle cx="90" cy="90" r="34" stroke="#a48751" strokeWidth=".9" strokeDasharray="1.5 3"/>
            <circle cx="90" cy="90" r="28" stroke="#d2bc88" strokeWidth=".6"/>
            <g fill="#19311f" fontFamily="'Cormorant Garamond', Georgia, serif" fontStyle="italic" fontWeight="700">
              <text x="90" y="101" textAnchor="middle" fontSize="34" letterSpacing="-5">MJ</text>
            </g>
            <!-- heras enroladas -->
            <g stroke="url(#mjGold)" strokeLinecap="round" strokeLinejoin="round">
              <path d="M90 49C56 43 33 57 31 85C29 112 48 134 78 139" strokeWidth="1.7"/>
              <path d="M90 49C124 43 147 57 149 85C151 112 132 134 102 139" strokeWidth="1.7"/>
              <path d="M53 53C42 43 35 33 37 22M127 53C138 43 145 33 143 22" strokeWidth="1.15"/>
              <path d="M68 139C61 149 53 157 42 158M112 139C119 149 127 157 138 158" strokeWidth="1.15"/>
            </g>
            <g fill="#c9d1a9" stroke="#7b7550" strokeWidth=".85">
              <path d="M48 57C34 56 24 49 19 39C34 38 45 43 51 52Z"/>
              <path d="M132 57C146 56 156 49 161 39C146 38 135 43 129 52Z"/>
              <path d="M38 91C24 96 16 105 14 118C28 117 38 108 42 97Z"/>
              <path d="M142 91C156 96 164 105 166 118C152 117 142 108 138 97Z"/>
              <path d="M62 136C49 139 40 146 36 158C50 157 61 151 67 142Z"/>
              <path d="M118 136C131 139 140 146 144 158C130 157 119 151 113 142Z"/>
            </g>
            <!-- pequenos ramos de marcela -->
            <g stroke="#a98a55" strokeWidth=".8" fill="#ead9ad">
              <g transform="translate(28 25) scale(.48)"><circle r="8"/><path d="M0-8v-18M6-6l13-14M8 0h20M6 6l13 14M0 8v18M-6 6l-13 14M-8 0h-20M-6-6l-13-14" fill="none"/></g>
              <g transform="translate(152 25) scale(.48)"><circle r="8"/><path d="M0-8v-18M6-6l13-14M8 0h20M6 6l13 14M0 8v18M-6 6l-13 14M-8 0h-20M-6-6l-13-14" fill="none"/></g>
            </g>
          </svg>
        </div>        </div>
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
