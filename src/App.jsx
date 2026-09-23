import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { auth, db } from './firebase/config.js';
import ProductCard from './components/ProductCard.jsx';
import AdminMigrationPanel from './components/AdminMigrationPanel.jsx';
import GiftModal from './components/GiftModal.jsx';
import { officialGardenProducts } from './data/officialCatalog.js';
import { gocaseProducts } from './data/gocaseProducts.js';
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
  const [sort, setSort] = useState('priceAsc');
  const [publicReservations, setPublicReservations] = useState({});
  const [giftingProduct, setGiftingProduct] = useState(null);
  const [showAdminPanel, setShowAdminPanel] = useState(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    const adminParam = params.get('admin');
    return adminParam === 'true' || adminParam === '';
  });

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
        setError('Não foi possível consultar o Firestore. O catálogo local está sendo exibido como fallback.');
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
    // Firestore is the sole source of truth when connected and populated.
    // Local catalog is used only as fallback if Firestore is empty or unavailable.
    const rawProducts = firestoreStatus === 'ready'
      ? firestoreProducts
      : [...officialGardenProducts, ...gocaseProducts];

    return rawProducts.filter(product => !isTikTokSource(product));
  }, [firestoreStatus, firestoreProducts]);

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
      if (product.published === false) return false;
      const matchesCategory = category === 'all' || product.category === category;
      const matchesSubcategory = subcategory === 'all' || product.subcategory === subcategory;
      const searchable = `${product.name} ${product.collection || ''} ${product.description || ''} ${product.dream || ''} ${product.story || ''}`.toLocaleLowerCase('pt-BR');
      return matchesCategory && matchesSubcategory && searchable.includes(term);
    });

    if (sort === 'priceAsc') return [...filtered].sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
    if (sort === 'priceDesc') return [...filtered].sort((a, b) => (b.price ?? -Infinity) - (a.price ?? -Infinity));
    if (sort === 'nameAsc') return [...filtered].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    return filtered;
  }, [sourceProducts, search, category, subcategory, sort]);

  function handleCategoryChange(event) {
    setCategory(event.target.value);
    setSubcategory('all');
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <p className="eyebrow">Jardim dos Presentes · versão 2.4</p>
        <h1>O Jardim dos Presentes de Michèlé Joohann</h1>
        <p>Sonhos cultivados com carinho, significado e história.</p>
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

        <section className="catalog-toolbar" aria-label="Controles do catálogo">
          <input
            type="search"
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Buscar por nome, sonho, coleção ou história…"
            aria-label="Buscar presentes"
          />
          <select value={category} onChange={handleCategoryChange} aria-label="Filtrar por ambiente">
            <option value="all">Todos os ambientes</option>
            {availableCategories.map(value => (
              <option key={value} value={value}>{categoryLabels[value] || labelFromValue(value)}</option>
            ))}
          </select>
          <select value={subcategory} onChange={event => setSubcategory(event.target.value)} aria-label="Filtrar por canteiro">
            <option value="all">Todos os canteiros</option>
            {availableSubcategories.map(value => (
              <option key={value} value={value}>{labelFromValue(value)}</option>
            ))}
          </select>
          <select value={sort} onChange={event => setSort(event.target.value)} aria-label="Ordenar presentes">
            <option value="default">Ordem original</option>
            <option value="priceAsc">Menor valor ao maior</option>
            <option value="priceDesc">Maior valor ao menor</option>
            <option value="nameAsc">Nome de A a Z</option>
          </select>
        </section>

        {loading && <p className="notice">Conectando ao Jardim…</p>}
        {firestoreStatus === 'empty' && <p className="notice warning">O Firestore está conectado, mas ainda não possui produtos. O catálogo local está visível como fallback até a importação.</p>}
        {firestoreStatus === 'unavailable' && <p className="notice error" role="alert">O Firestore está indisponível no momento. O catálogo local continua visível como fallback.</p>}
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
