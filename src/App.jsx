import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { auth, db } from './firebase/config.js';
import ProductCard from './components/ProductCard.jsx';
import WelcomeModal from './components/WelcomeModal.jsx';
import GardenSpecialSections from './components/GardenSpecialSections.jsx';
import { cancelReservation, subscribeToPublicReservations } from './services/reservationService.js';
import {
  DEFAULT_GARDEN_SETTINGS,
  subscribeToGardenSettings,
  subscribeToLoveMessages,
} from './services/gardenConfigService.js';

const AdminMigrationPanel = lazy(() => import('./components/AdminMigrationPanel.jsx'));
const GiftModal = lazy(() => import('./components/GiftModal.jsx'));

const ADMIN_UID = '7G4v3hEMtaVzI8MUDsXjVCNXGJz1';
const WELCOME_STORAGE_KEY = 'jardim_welcome_seen_v2';

const categoryLabels = {
  casa: '🏡 Casa',
  moda: '👗 Vestuário',
  calcados: '👠 Calçados',
  beleza: '✨ Beleza & Autocuidado',
  joias: '💍 Joias',
  livros: '📚 Livros',
  tecnologia: '💻 Tecnologia',
  arte: '🎨 Arte e espiritualidade',
  jardim: '🌳 Jardim externo',
  pets: '🐾 Pets',
};

function labelFromValue(value) {
  if (String(value).trim().toLowerCase() === 'calcados') return 'Calçados';
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

function scrollToCatalog() {
  document.querySelector('.product-grid')?.scrollIntoView({ behavior: 'smooth' });
}

export default function App() {
  const [firestoreProducts, setFirestoreProducts] = useState([]);
  const [firestoreStatus, setFirestoreStatus] = useState('loading');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sort, setSort] = useState('priority');
  const [publicReservations, setPublicReservations] = useState({});
  const [gardenSettings, setGardenSettings] = useState(DEFAULT_GARDEN_SETTINGS);
  const [loveMessages, setLoveMessages] = useState([]);
  const [adminInitialTab, setAdminInitialTab] = useState('products');
  const [giftingProduct, setGiftingProduct] = useState(null);
  const [openSubmenu, setOpenSubmenu] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const [welcomeModalOpen, setWelcomeModalOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    const hash = window.location.hash;
    if (hash === '#admin' || hash.startsWith('#admin/')) return false;
    const params = new URLSearchParams(window.location.search);
    const adminParam = params.get('admin') || params.get('page');
    if (adminParam === 'true' || adminParam === '' || adminParam === 'admin') return false;
    try {
      return !window.localStorage.getItem(WELCOME_STORAGE_KEY);
    } catch {
      return true;
    }
  });
  const [currentRoute, setCurrentRoute] = useState(() => {
    if (typeof window === 'undefined') return 'catalog';
    const hash = window.location.hash;
    if (hash === '#admin' || hash.startsWith('#admin/')) return 'admin';
    const params = new URLSearchParams(window.location.search);
    const adminParam = params.get('admin') || params.get('page');
    if (adminParam === 'true' || adminParam === '' || adminParam === 'admin') return 'admin';
    return 'catalog';
  });

  function navigateTo(route, tab = 'products') {
    if (route === 'admin' && tab) {
      setAdminInitialTab(tab);
    }
    setCurrentRoute(route);
    if (typeof window !== 'undefined') {
      if (route === 'admin') {
        if (window.location.hash !== '#admin') {
          window.location.hash = '#admin';
        }
      } else {
        if (window.location.hash === '#admin' || window.location.hash.startsWith('#admin/')) {
          history.replaceState(null, '', window.location.pathname);
        }
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  useEffect(() => {
    function handleLocationChange() {
      const hash = window.location.hash;
      if (hash === '#admin' || hash.startsWith('#admin/')) {
        setCurrentRoute('admin');
      } else {
        const params = new URLSearchParams(window.location.search);
        const adminParam = params.get('admin') || params.get('page');
        if (adminParam === 'true' || adminParam === '' || adminParam === 'admin') {
          setCurrentRoute('admin');
        } else {
          setCurrentRoute('catalog');
        }
      }
    }

    window.addEventListener('hashchange', handleLocationChange);
    window.addEventListener('popstate', handleLocationChange);
    return () => {
      window.removeEventListener('hashchange', handleLocationChange);
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  // Intercepta o botão "Voltar" (físico ou gesto) no celular quando o modal de presente estiver aberto,
  // fechando o modal e mantendo o usuário na página do catálogo no mesmo ponto em que estava.
  const isClosingModalByPopstateRef = useRef(false);

  useEffect(() => {
    if (!giftingProduct || typeof window === 'undefined') return;

    const modalKey = 'gift-modal-' + Date.now();
    isClosingModalByPopstateRef.current = false;

    window.history.pushState({ modalKey }, '');

    function handleModalPopState() {
      // O usuário pressionou o botão "Voltar" ou fez o gesto de swipe no celular
      isClosingModalByPopstateRef.current = true;
      setGiftingProduct(null);
    }

    window.addEventListener('popstate', handleModalPopState);

    return () => {
      window.removeEventListener('popstate', handleModalPopState);
      // Se fechou pela interface (botão ✕, backdrop, ESC, cancelar ou concluir) e não pelo botão voltar:
      if (!isClosingModalByPopstateRef.current && window.history.state?.modalKey === modalKey) {
        window.history.back();
      }
      isClosingModalByPopstateRef.current = false;
    };
  }, [Boolean(giftingProduct)]);

  function handleCloseWelcomeModal() {
    setWelcomeModalOpen(false);
    try {
      window.localStorage.setItem(WELCOME_STORAGE_KEY, 'true');
    } catch {
      // Ignora erro caso armazenamento esteja bloqueado
    }
  }

  // Intercepta o botão "Voltar" no celular quando a gaveta de filtros mobile estiver aberta,
  // recolhendo a gaveta em vez de sair do site.
  const isClosingDrawerByPopstateRef = useRef(false);

  useEffect(() => {
    if (!mobileMenuOpen || typeof window === 'undefined') return;

    const drawerKey = 'filters-drawer-' + Date.now();
    isClosingDrawerByPopstateRef.current = false;

    window.history.pushState({ drawerKey }, '');

    function handleDrawerPopState() {
      isClosingDrawerByPopstateRef.current = true;
      setMobileMenuOpen(false);
    }

    window.addEventListener('popstate', handleDrawerPopState);

    return () => {
      window.removeEventListener('popstate', handleDrawerPopState);
      if (!isClosingDrawerByPopstateRef.current && window.history.state?.drawerKey === drawerKey) {
        window.history.back();
      }
      isClosingDrawerByPopstateRef.current = false;
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    function handlePointerDown(e) {
      // Menus/diálogos de navegação fecham ao clicar fora da própria caixa.
      // Isso também permite clicar no espaço vazio do cabeçalho sem manter
      // um submenu aberto sobre o conteúdo.
      if (
        !e.target.closest('.nav-item-dropdown') &&
        !e.target.closest('.top-action-filter-btn') &&
        !e.target.closest('.mobile-submenus-drawer') &&
        !e.target.closest('.category-chip-more')
      ) {
        setOpenSubmenu(null);
        setMobileMenuOpen(false);
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

    const unsubscribeSettings = subscribeToGardenSettings(settings => {
      if (!active) return;
      setGardenSettings(settings);
    });

    const unsubscribeLoveMessages = subscribeToLoveMessages(messages => {
      if (!active) return;
      setLoveMessages(messages);
    });

    return () => {
      active = false;
      unsubscribeAuth();
      unsubscribeProducts();
      unsubscribeReservations();
      unsubscribeSettings();
      unsubscribeLoveMessages();
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

  function handleOpenGift(product) {
    if (mobileMenuOpen) {
      setMobileMenuOpen(false);
    }
    setGiftingProduct(product);
  }

  const sourceProducts = useMemo(() => {
    // Firestore é a fonte única da verdade para os presentes
    return firestoreProducts.filter(product => !isTikTokSource(product));
  }, [firestoreProducts]);

  const availableCategories = useMemo(() => {
    const cats = new Set(sourceProducts.map(product => product.category).filter(Boolean));
    if (sourceProducts.some(p => p.category === 'calcados' || p.subcategory?.toLowerCase() === 'calcados')) {
      cats.add('calcados');
    }
    return [...cats].sort();
  }, [sourceProducts]);

  const categoryCounts = useMemo(() => {
    const counts = {};
    for (const p of sourceProducts) {
      if (p.enabled === false || p.published === false || p.visible === false) continue;
      if (p.category) {
        counts[p.category] = (counts[p.category] || 0) + 1;
      }
      if (p.subcategory?.toLowerCase() === 'calcados' && p.category !== 'calcados') {
        counts['calcados'] = (counts['calcados'] || 0) + 1;
      }
    }
    return counts;
  }, [sourceProducts]);

  const visibleProducts = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    const filtered = sourceProducts.filter(product => {
      if (product.enabled === false || product.published === false || product.visible === false) return false;
      const matchesCategory = selectedCategories.length === 0 || selectedCategories.some(cat => {
        if (cat === 'calcados') {
          return product.category === 'calcados' || product.subcategory?.toLowerCase() === 'calcados';
        }
        return product.category === cat;
      });
      const matchesPriority = priorityFilter === 'all' || (() => {
        const p = String(product.priority || product.prioridade || '').trim().toLowerCase();
        if (priorityFilter === 'alta') return p === 'alta' || p === 'essencial' || p === 'obra fundamental';
        if (priorityFilter === 'media') return p === 'media' || p === 'média';
        if (priorityFilter === 'baixa') return p === 'baixa';
        return true;
      })();
      const searchable = `${product.name} ${product.collection || ''} ${product.description || ''} ${product.dream || ''} ${product.story || ''}`.toLocaleLowerCase('pt-BR');
      return matchesCategory && matchesPriority && searchable.includes(term);
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
  }, [sourceProducts, search, selectedCategories, priorityFilter, sort]);

  function toggleCategory(cat) {
    setSelectedCategories(prev => {
      if (prev.includes(cat)) {
        return prev.filter(c => c !== cat);
      }
      return [...prev, cat];
    });
  }

  function togglePriority(priority) {
    setPriorityFilter(prev => (prev === priority ? 'all' : priority));
  }

  function clearAllFilters() {
    setSelectedCategories([]);
    setPriorityFilter('all');
    setSort('priority');
    setSearch('');
  }

  const activeFilterCount = useMemo(() => {
    let count = 0;
    count += selectedCategories.length;
    if (priorityFilter !== 'all') count++;
    if (sort !== 'priority') count++;
    if (search.trim()) count++;
    return count;
  }, [selectedCategories, priorityFilter, sort, search]);

  const baseUrl = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');

  if (currentRoute === 'admin') {
    return (
      <div className="app-shell admin-page-shell">
        <div className="foliage-frame foliage-frame-left admin-foliage" aria-hidden="true">
          <img src={`${baseUrl}/images/foliage-left.png`} alt="" loading="eager" />
        </div>
        <div className="foliage-frame foliage-frame-right admin-foliage" aria-hidden="true">
          <img src={`${baseUrl}/images/foliage-right.png`} alt="" loading="eager" />
        </div>

        <main className="content admin-page-content">
          <Suspense fallback={
            <div className="admin-loading-screen">
              <p className="notice">Carregando painel de gestão do Jardim…</p>
            </div>
          }>
            <AdminMigrationPanel
              user={user}
              firestoreCount={firestoreProducts.length}
              onNavigateHome={() => navigateTo('catalog')}
              onClose={() => navigateTo('catalog')}
              products={firestoreProducts}
              gardenSettings={gardenSettings}
              loveMessages={loveMessages}
              initialTab={adminInitialTab}
            />
          </Suspense>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      {/* Folhagens Botânicas Vitorianas de Fundo */}
      <div className="foliage-frame foliage-frame-left" aria-hidden="true">
        <img
          src={`${baseUrl}/images/foliage-left.png`}
          alt=""
          loading="eager"
        />
      </div>
      <div className="foliage-frame foliage-frame-right" aria-hidden="true">
        <img
          src={`${baseUrl}/images/foliage-right.png`}
          alt=""
          loading="eager"
        />
      </div>

      {/* Barra de Topo Estilo Herbarium Vitoriano com Submenus Interativos */}
      <nav className="site-top-bar" aria-label="Navegação superior">
        <div className="brand-dropdown-container">
          <a
            href="#top"
            className="site-top-bar-brand"
            onClick={e => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            title="O Jardim dos Presentes de Michèlé Joohann - Início"
          >
            <img
              src={`${baseUrl}/images/logo-michele-joohann.png`}
              alt="Logo Michèlé Joohann"
              className="site-top-bar-logo"
              width="44"
              height="44"
              loading="eager"
            />
            <div className="brand-text">
              <span className="brand-title">O Jardim dos Presentes</span>
              <span className="brand-author">de Michèlé Joohann</span>
            </div>
          </a>

          {/* Submenus escondidos sob a logo superior esquerda no mobile */}
          {mobileMenuOpen && (
            <>
              <div
                className="mobile-drawer-backdrop"
                onClick={() => setMobileMenuOpen(false)}
                aria-hidden="true"
              />
              <div className="mobile-submenus-drawer" role="menu">
                <div className="mobile-drawer-header">
                  <span className="mobile-drawer-title">🌿 Filtros do Jardim</span>
                  <div className="mobile-drawer-header-actions">
                    {activeFilterCount > 0 && (
                      <button
                        type="button"
                        className="mobile-drawer-clear-btn"
                        onClick={clearAllFilters}
                      >
                        Limpar ({activeFilterCount})
                      </button>
                    )}
                    <button
                      type="button"
                      className="mobile-drawer-close"
                      onClick={() => setMobileMenuOpen(false)}
                      aria-label="Fechar menu"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Coleções */}
                <div className="mobile-drawer-section">
                  <span className="mobile-drawer-label">Coleções (selecione uma ou mais)</span>
                  <div className="mobile-drawer-tags">
                    <button
                      type="button"
                      className={`mobile-tag-btn ${selectedCategories.length === 0 ? 'active' : ''}`}
                      onClick={() => setSelectedCategories([])}
                    >
                      🌿 Todas as coleções
                    </button>
                    {availableCategories.map(cat => (
                      <button
                        key={cat}
                        type="button"
                        className={`mobile-tag-btn ${selectedCategories.includes(cat) ? 'active' : ''}`}
                        onClick={() => toggleCategory(cat)}
                      >
                        {selectedCategories.includes(cat) ? '✓ ' : ''}{categoryLabels[cat] || labelFromValue(cat)} ({categoryCounts[cat] || 0})
                      </button>
                    ))}
                  </div>
                </div>

                {/* Ordenação & Prioridades */}
                <div className="mobile-drawer-section">
                  <span className="mobile-drawer-label">Prioridades</span>
                  <div className="mobile-drawer-tags">
                    <button
                      type="button"
                      className={`mobile-tag-btn ${priorityFilter === 'all' ? 'active' : ''}`}
                      onClick={() => setPriorityFilter('all')}
                    >
                      ⭐ Todas
                    </button>
                    <button
                      type="button"
                      className={`mobile-tag-btn priority-alta ${priorityFilter === 'alta' ? 'active' : ''}`}
                      onClick={() => togglePriority('alta')}
                    >
                      {priorityFilter === 'alta' ? '✓ ' : ''}🍃 Alta prioridade
                    </button>
                    <button
                      type="button"
                      className={`mobile-tag-btn priority-media ${priorityFilter === 'media' ? 'active' : ''}`}
                      onClick={() => togglePriority('media')}
                    >
                      {priorityFilter === 'media' ? '✓ ' : ''}🌸 Média prioridade
                    </button>
                    <button
                      type="button"
                      className={`mobile-tag-btn priority-baixa ${priorityFilter === 'baixa' ? 'active' : ''}`}
                      onClick={() => togglePriority('baixa')}
                    >
                      {priorityFilter === 'baixa' ? '✓ ' : ''}🌰 Baixa prioridade
                    </button>
                  </div>

                  <span className="mobile-drawer-label" style={{ marginTop: '14px' }}>Organizar presentes</span>
                  <div className="mobile-drawer-tags">
                    {[
                      ['priority', '⭐ Maior prioridade'],
                      ['priorityAsc', '🌱 Menor prioridade'],
                      ['priceAsc', '♡ Menor valor'],
                      ['priceDesc', '♢ Maior valor'],
                      ['nameAsc', 'Aa Nome A-Z'],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        className={`mobile-tag-btn ${sort === value ? 'active' : ''}`}
                        onClick={() => setSort(value)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Ação Conclusiva Fixa no Rodapé da Gaveta */}
                <div className="mobile-drawer-footer">
                  <button
                    type="button"
                    className="mobile-drawer-apply-btn"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      scrollToCatalog();
                    }}
                  >
                    Ver {visibleProducts.length} presente{visibleProducts.length !== 1 ? 's' : ''} {activeFilterCount > 0 ? `(${activeFilterCount} filtros)` : ''}
                  </button>
                </div>

                {/* Sobre e Guia */}
                <div className="mobile-drawer-section">
                  <span className="mobile-drawer-label">Sobre & Como Usar</span>
                  <p className="mobile-drawer-note">
                    <strong>O Jardim dos Presentes</strong> de Michèlé Joohann é uma curadoria de desejos e memórias especiais, onde cada presente é cultivado com carinho, significado e história.
                  </p>
                  <button
                    type="button"
                    className="mobile-tag-btn welcome-reopen-drawer-btn"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setWelcomeModalOpen(true);
                    }}
                  >
                    ✨ Abrir Boas-Vindas & Tour do Jardim
                  </button>
                  <div className="mobile-drawer-tags" style={{ marginTop: '10px' }}>
                    {gardenSettings.pixEnabled !== false && Boolean(gardenSettings.pixKey?.trim()) && (
                      <button
                        type="button"
                        className="mobile-tag-btn"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          document.getElementById('secao-pix')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                      >
                        💎 Mimo via PIX
                      </button>
                    )}
                    {gardenSettings.messagesSectionEnabled !== false && (
                      <button
                        type="button"
                        className="mobile-tag-btn"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          document.getElementById('secao-mensagens')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                      >
                        💌 Mensagens de Carinho
                      </button>
                    )}
                  </div>
                </div>

                {/* Contato */}
                <div className="mobile-drawer-section">
                  <span className="mobile-drawer-label">Contato</span>
                  <p className="mobile-drawer-note">
                    Para falar comigo sobre o Jardim dos Presentes:<br />
                    <a className="contact-email-link" href="mailto:michelejoohann@gmail.com">michelejoohann@gmail.com</a>
                  </p>
                </div>
              </div>
          </>
        )}
      </div>

        <div className="site-top-bar-nav">
          {/* Menu Coleções */}
          <div className="nav-item-dropdown">
            <button
              type="button"
              data-tour="colecoes"
              className={`top-nav-link ${selectedCategories.length > 0 ? 'active' : ''}`}
              onClick={() => setOpenSubmenu(prev => prev === 'colecoes' ? null : 'colecoes')}
              aria-expanded={openSubmenu === 'colecoes'}
            >
              Coleções {selectedCategories.length > 0 ? `(${selectedCategories.length})` : ''} <span className="nav-arrow" aria-hidden="true">▾</span>
            </button>
            {openSubmenu === 'colecoes' && (
              <div className="top-submenu-dropdown" role="menu">
                <button
                  type="button"
                  className={`submenu-item ${selectedCategories.length === 0 ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedCategories([]);
                    setOpenSubmenu(null);
                    scrollToCatalog();
                  }}
                >
                  🌿 Todas as coleções
                </button>
                {availableCategories.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    className={`submenu-item ${selectedCategories.includes(cat) ? 'active' : ''}`}
                    onClick={() => {
                      toggleCategory(cat);
                      setOpenSubmenu(null);
                      scrollToCatalog();
                    }}
                  >
                    {selectedCategories.includes(cat) ? '✓ ' : ''}{categoryLabels[cat] || labelFromValue(cat)} ({categoryCounts[cat] || 0})
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Menu Ordenação */}
          <div className="nav-item-dropdown">
            <button
              type="button"
              data-tour="ordenacao"
              className={`top-nav-link ${priorityFilter !== 'all' || sort !== 'priority' ? 'active' : ''}`}
              onClick={() => setOpenSubmenu(prev => prev === 'ordenacao' ? null : 'ordenacao')}
              aria-expanded={openSubmenu === 'ordenacao'}
            >
              Ordenação <span className="nav-arrow" aria-hidden="true">▾</span>
            </button>
            {openSubmenu === 'ordenacao' && (
              <div className="top-submenu-dropdown" role="menu">
                <span className="submenu-section-label">Filtrar por prioridade</span>
                <button
                  type="button"
                  className={`submenu-item ${priorityFilter === 'all' ? 'active' : ''}`}
                  onClick={() => {
                    setPriorityFilter('all');
                    setOpenSubmenu(null);
                    scrollToCatalog();
                  }}
                >
                  ⭐ Todas as prioridades
                </button>
                <button
                  type="button"
                  className={`submenu-item priority-alta ${priorityFilter === 'alta' ? 'active' : ''}`}
                  onClick={() => {
                    togglePriority('alta');
                    setOpenSubmenu(null);
                    scrollToCatalog();
                  }}
                >
                  {priorityFilter === 'alta' ? '✓ ' : ''}🍃 Alta prioridade (Essencial)
                </button>
                <button
                  type="button"
                  className={`submenu-item priority-media ${priorityFilter === 'media' ? 'active' : ''}`}
                  onClick={() => {
                    togglePriority('media');
                    setOpenSubmenu(null);
                    scrollToCatalog();
                  }}
                >
                  {priorityFilter === 'media' ? '✓ ' : ''}🌸 Média prioridade
                </button>
                <button
                  type="button"
                  className={`submenu-item priority-baixa ${priorityFilter === 'baixa' ? 'active' : ''}`}
                  onClick={() => {
                    togglePriority('baixa');
                    setOpenSubmenu(null);
                    scrollToCatalog();
                  }}
                >
                  {priorityFilter === 'baixa' ? '✓ ' : ''}🌰 Baixa prioridade
                </button>

                <div className="submenu-divider" aria-hidden="true"></div>
                <span className="submenu-section-label">Organizar presentes</span>
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
                      scrollToCatalog();
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Botão Guia do Jardim */}
          <div className="nav-item-dropdown">
            <button
              type="button"
              className={`top-nav-link ${welcomeModalOpen ? 'active' : ''}`}
              onClick={() => {
                setOpenSubmenu(null);
                setWelcomeModalOpen(true);
              }}
              title="Ver boas-vindas e tour guiado do Jardim"
            >
              Guia do Jardim ✨
            </button>
          </div>

          {/* Atalhos rápidos para PIX e Mensagens de Carinho */}
          {gardenSettings.pixEnabled !== false && Boolean(gardenSettings.pixKey?.trim()) && (
            <div className="nav-item-dropdown">
              <button
                type="button"
                className="top-nav-link"
                onClick={() => {
                  setOpenSubmenu(null);
                  document.getElementById('secao-pix')?.scrollIntoView({ behavior: 'smooth' });
                }}
                title="Ir para a seção de Mimo via PIX"
              >
                PIX 💎
              </button>
            </div>
          )}

          {gardenSettings.messagesSectionEnabled !== false && (
            <div className="nav-item-dropdown">
              <button
                type="button"
                className="top-nav-link"
                onClick={() => {
                  setOpenSubmenu(null);
                  document.getElementById('secao-mensagens')?.scrollIntoView({ behavior: 'smooth' });
                }}
                title="Deixar ou ler Mensagens de Carinho"
              >
                Recados 💌
              </button>
            </div>
          )}

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
                  <strong>O Jardim dos Presentes</strong> de Michèlé Joohann é uma curadoria de desejos e memórias especiais, onde cada presente é cultivado com carinho, significado e história.
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
            <>
              <button
                type="button"
                data-tour="mobile-filter"
                className={`top-action-icon-btn top-action-filter-btn ${activeFilterCount > 0 ? 'has-active-filters' : ''} ${mobileMenuOpen ? 'menu-open' : ''}`}
                title="Filtrar presentes e coleções"
                aria-label="Abrir filtros e coleções"
                aria-expanded={mobileMenuOpen}
                onClick={() => setMobileMenuOpen(prev => !prev)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                </svg>
                {activeFilterCount > 0 && (
                  <span className="top-filter-count-badge" aria-label={`${activeFilterCount} filtros ativos`}>
                    {activeFilterCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                data-tour="search"
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

              <button
                type="button"
                className={`top-action-icon-btn top-action-guide-btn ${welcomeModalOpen ? 'active' : ''}`}
                title="Guia de Boas-Vindas do Jardim"
                aria-label="Abrir guia de boas-vindas e instruções"
                onClick={() => setWelcomeModalOpen(true)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
              </button>
            </>
          )}
          <button
            type="button"
            className="top-action-icon-btn"
            title="Painel de Gestão do Jardim"
            aria-label="Gestão do Jardim"
            onClick={() => navigateTo('admin')}
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
        <p className="hero-subtitle">
          <span className="hero-subtitle-line">Curadoria Exclusiva de Sonhos:</span>
          <span className="hero-subtitle-line">Onde a Magia do Presente se Revela.</span>
        </p>
        
        {/* Selo Medalhão Central: Guirlanda de Galhos e Heras Michèlé Joohann */}
        <div className="hero-emblem" aria-label="Logo Michèlé Joohann">
          <img
            src={`${baseUrl}/images/logo-michele-joohann.png`}
            alt="Michèlé Joohann - O Jardim dos Presentes"
            className="hero-emblem-img"
            width="132"
            height="132"
            loading="eager"
          />
        </div>
      </header>

      <main className="content">


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
              onOpenGift={handleOpenGift}
              onCancelReservation={handleCancelReservation}
            />
          ))}
        </section>

        {!loading && visibleProducts.length === 0 && (
          <p className="empty-state">
            {search || selectedCategories.length > 0 || priorityFilter !== 'all'
              ? 'Nenhum presente encontrado com esses filtros.'
              : 'O Jardim dos Presentes está sendo preparado com muito carinho. Volte em breve para conferir as novidades! 🌿'}
          </p>
        )}

        <GardenSpecialSections
          settings={gardenSettings}
          loveMessages={loveMessages}
          messages={loveMessages}
          user={user}
          isAdmin={user?.uid === ADMIN_UID}
          baseUrl={baseUrl}
          onNavigateAdminSettings={() => navigateTo('admin', 'settings')}
        />
      </main>

      {/* Rodapé Especial com a Logo Michèlé Joohann */}
      <footer className="site-footer">
        <img
          src={`${baseUrl}/images/logo-michele-joohann.png`}
          alt="Michèlé Joohann"
          className="footer-emblem-img"
          width="56"
          height="56"
          loading="lazy"
        />
        <p className="footer-title">O Jardim dos Presentes</p>
        <p className="footer-subtitle">Curadoria feita com carinho por Michèlé Joohann</p>
      </footer>

      {welcomeModalOpen && (
        <WelcomeModal
          baseUrl={baseUrl}
          onClose={handleCloseWelcomeModal}
        />
      )}

      {giftingProduct && (
        <Suspense fallback={null}>
          <GiftModal
            product={giftingProduct}
            user={user}
            gardenSettings={gardenSettings}
            onClose={() => setGiftingProduct(null)}
          />
        </Suspense>
      )}
    </div>
  );
}
