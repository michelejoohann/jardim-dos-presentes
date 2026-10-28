import { useEffect, useMemo, useState } from 'react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, db } from '../firebase/config.js';
import { doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { cancelReservation, subscribeToPrivateReservations } from '../services/reservationService.js';
import {
  batchUpdateProductsVisibility,
  deleteProduct,
  resolveImageUrl,
  toggleProductEnabled,
} from '../services/productService.js';
import ProductEditor from './ProductEditor.jsx';
import {
  downloadFile,
  exportProductsToCsv,
  generateCsvTemplate,
  parseCsvToProducts,
} from '../services/csvService.js';
import {
  DEFAULT_GARDEN_SETTINGS,
  createLoveMessage,
  deleteLoveMessage,
  saveGardenSettings,
  toggleLoveMessageVisibility,
} from '../services/gardenConfigService.js';

const ADMIN_UID = '7G4v3hEMtaVzI8MUDsXjVCNXGJz1';

/**
 * Traduz e formata erros de autenticação do Firebase para mensagens amigáveis,
 * acolhedoras e compreensíveis em português, com dicas úteis para erros comuns de digitação.
 */
function formatAuthError(err, enteredEmail = '') {
  if (!err) return '';

  const code = (err?.code || '').toLowerCase();
  const rawMessage = (err?.message || '').toLowerCase();
  const cleanEmail = String(enteredEmail || '').trim();

  // Erro de usuário autenticado sem privilégio administrativo
  if (err?.message === 'Esta conta não possui credenciais de administradora.' || code === 'auth/unauthorized-admin') {
    return 'Esta conta não possui autorização de administradora do Jardim.';
  }

  // Detecta se o e-mail digitado parece ter esquecido o ponto no provedor (ex: @gmailcom)
  const atIndex = cleanEmail.indexOf('@');
  const domainPart = atIndex !== -1 ? cleanEmail.slice(atIndex + 1).trim() : '';
  const isMissingDomainDot = domainPart && !domainPart.includes('.');
  const suggestedDomain = domainPart.toLowerCase().startsWith('gmail')
    ? 'gmail.com'
    : domainPart.toLowerCase().startsWith('hotmail')
      ? 'hotmail.com'
      : domainPart.toLowerCase().startsWith('outlook')
        ? 'outlook.com'
        : `${domainPart}.com`;

  // Código auth/invalid-email
  if (code.includes('invalid-email') || rawMessage.includes('auth/invalid-email')) {
    if (isMissingDomainDot) {
      return `O e-mail parece estar incompleto (faltou o ponto no provedor: use @${suggestedDomain} em vez de @${domainPart}). Por favor, revise o endereço digitado.`;
    }
    return 'O formato do e-mail digitado parece inválido. Exemplo correto: seu-nome@exemplo.com.';
  }

  // Códigos auth/invalid-credential, auth/wrong-password, auth/user-not-found
  if (
    code.includes('invalid-credential') ||
    code.includes('invalid-login-credentials') ||
    code.includes('wrong-password') ||
    code.includes('user-not-found') ||
    rawMessage.includes('auth/invalid-credential') ||
    rawMessage.includes('auth/wrong-password') ||
    rawMessage.includes('auth/user-not-found')
  ) {
    if (isMissingDomainDot) {
      return `E-mail ou senha incorretos. Note que o e-mail "${cleanEmail}" parece estar sem o ponto no provedor (ex: @${suggestedDomain}). Por favor, confira a digitação.`;
    }
    return 'E-mail ou senha incorretos. Por favor, confira os dados digitados e tente novamente com carinho.';
  }

  // Muitas tentativas consecutivas
  if (code.includes('too-many-requests') || rawMessage.includes('auth/too-many-requests')) {
    return 'Muitas tentativas de acesso seguidas. Por segurança, aguarde alguns minutinhos antes de tentar novamente.';
  }

  // Sem conexão com a internet
  if (code.includes('network-request-failed') || rawMessage.includes('auth/network-request-failed')) {
    return 'Não foi possível conectar ao servidor. Por favor, verifique sua conexão com a internet e tente novamente.';
  }

  // Conta desativada
  if (code.includes('user-disabled') || rawMessage.includes('auth/user-disabled')) {
    return 'Este acesso de administradora foi temporariamente desativado.';
  }

  // Mensagem customizada interna que não seja erro cru do Firebase
  if (err?.message && !err.message.includes('Firebase:')) {
    return err.message;
  }

  return 'Não foi possível entrar no momento. Por favor, confira seus dados e tente novamente.';
}

export default function AdminMigrationPanel({
  user,
  firestoreCount = 0,
  onClose,
  onNavigateHome,
  products = [],
  gardenSettings = DEFAULT_GARDEN_SETTINGS,
  loveMessages = [],
  initialTab = 'products',
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [reservations, setReservations] = useState([]);
  const [reservationsLoading, setReservationsLoading] = useState(true);

  // Controle de abas: 'products' | 'messages' | 'settings' | 'backup'
  const [activeTab, setActiveTab] = useState(initialTab || 'products');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Estado editável para Configurações de PIX e Mensagens de Carinho
  const [settingsForm, setSettingsForm] = useState(() => ({
    ...DEFAULT_GARDEN_SETTINGS,
    ...(gardenSettings || {}),
  }));

  useEffect(() => {
    if (gardenSettings) {
      setSettingsForm(prev => ({
        ...prev,
        ...gardenSettings,
      }));
    }
  }, [gardenSettings]);

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
    const cleanEmail = email.trim();
    try {
      const credential = await signInWithEmailAndPassword(auth, cleanEmail, password);
      if (credential.user.uid !== ADMIN_UID) {
        await signOut(auth);
        throw new Error('Esta conta não possui credenciais de administradora.');
      }
      setPassword('');
      setMessage('Acesso administrativo confirmado com sucesso! Seja bem-vinda, Michèlé.');
    } catch (err) {
      setError(formatAuthError(err, cleanEmail));
    } finally {
      setBusy(false);
    }
  }


  function handleDownloadCsvTemplate() {
    try {
      const csvContent = generateCsvTemplate();
      downloadFile(csvContent, 'template-jardim-dos-presentes.csv', 'text/csv;charset=utf-8;');
      setMessage('📄 Template padrão em CSV baixado com sucesso! Preencha no Excel e importe quando desejar.');
      setError('');
    } catch (err) {
      setError('Erro ao gerar template CSV: ' + err.message);
    }
  }

  function handleExportCsv() {
    try {
      const csvContent = exportProductsToCsv(products);
      const dateStr = new Date().toISOString().slice(0, 10);
      downloadFile(csvContent, `jardim-dos-presentes-catalogo-${dateStr}.csv`, 'text/csv;charset=utf-8;');
      setMessage(`📊 Planilha exportada com sucesso contendo ${products.length} presentes!`);
      setError('');
    } catch (err) {
      setError('Erro ao exportar planilha CSV: ' + err.message);
    }
  }

  async function handleImportCsvFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async e => {
      try {
        setBusy(true);
        setError('');
        setMessage('');
        const content = e.target?.result;
        const { products: importedList } = parseCsvToProducts(content);

        const confirmed = window.confirm(
          `Foram identificados ${importedList.length} presentes válidos na planilha CSV.\n\nDeseja sincronizar e gravar estes itens diretamente no Cloud Firestore?\n\n(Itens existentes com o mesmo ID serão atualizados e novos itens serão criados).`
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
        setMessage(`🎉 Sucesso! ${count} presentes da planilha CSV foram sincronizados diretamente com o Firestore.`);
      } catch (err) {
        setError('Falha ao importar planilha CSV: ' + (err?.message || 'Arquivo inválido.'));
      } finally {
        setBusy(false);
        event.target.value = '';
      }
    };
    reader.readAsText(file, 'UTF-8');
  }

  function handleExportBackup() {
    try {
      const exportData = JSON.stringify(products, null, 2);
      const dateStr = new Date().toISOString().slice(0, 10);
      downloadFile(exportData, `jardim-dos-presentes-backup-${dateStr}.json`, 'application/json;charset=utf-8;');
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

  async function handleBatchVisibility(targetStatus) {
    const countToChange = targetStatus ? totalDisabled : totalEnabled;
    if (countToChange === 0) {
      alert(
        targetStatus
          ? 'Todos os presentes já estão habilitados na vitrine do site.'
          : 'Todos os presentes já estão ocultos da vitrine do site.'
      );
      return;
    }

    const confirmPrompt = targetStatus
      ? `🌿 Deseja tornar todos os presentes (${products.length}) visíveis na vitrine do site para os visitantes?`
      : `⚠️ Deseja ocultar todos os ${countToChange} presentes ativos da vitrine do site?\n\nEles continuarão salvos com segurança no banco de dados, mas ficarão invisíveis para os visitantes.\n\nVocê poderá reexibi-los a qualquer momento clicando em "Habilitar Todos".`;

    const confirmed = window.confirm(confirmPrompt);
    if (!confirmed) return;

    setBusy(true);
    setError('');
    setMessage('');

    try {
      const targetProducts = products.filter(p => {
        const isCurrentlyEnabled = p.enabled !== false && p.published !== false && p.visible !== false;
        return targetStatus ? !isCurrentlyEnabled : isCurrentlyEnabled;
      });

      const updated = await batchUpdateProductsVisibility(targetProducts, targetStatus);
      setMessage(
        targetStatus
          ? `🎉 Sucesso! ${updated} presentes foram HABILITADOS e estão visíveis na vitrine do site.`
          : `🔒 Sucesso! ${updated} presentes foram OCULTADOS da vitrine do site (continuam salvos no banco).`
      );
    } catch (err) {
      console.error(err);
      setError(`Não foi possível alterar a visibilidade em lote: ${err.message}`);
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

  const loveMessagesById = useMemo(() => {
    return loveMessages.reduce((acc, msg) => {
      acc[msg.id] = msg;
      return acc;
    }, {});
  }, [loveMessages]);

  async function handleSaveSettings(event, customNotice = '✨ Configurações de PIX e Mural de Carinho salvas com sucesso!') {
    if (event?.preventDefault) event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await saveGardenSettings(settingsForm, user?.uid || ADMIN_UID);
      setMessage(customNotice);
    } catch (err) {
      setError('Não foi possível salvar as configurações: ' + (err?.message || 'Erro inesperado.'));
    } finally {
      setBusy(false);
    }
  }

  function handleQrCodeFileUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione um arquivo de imagem válido (PNG, JPG, WebP).');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = e => {
      const rawDataUrl = e.target?.result;
      if (typeof rawDataUrl !== 'string') return;

      const img = new Image();
      img.onload = () => {
        try {
          const MAX_SIDE = 520;
          let width = img.naturalWidth || img.width || 400;
          let height = img.naturalHeight || img.height || 400;

          if (width > MAX_SIDE || height > MAX_SIDE) {
            if (width >= height) {
              height = Math.round((height * MAX_SIDE) / width);
              width = MAX_SIDE;
            } else {
              width = Math.round((width * MAX_SIDE) / height);
              height = MAX_SIDE;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          let optimizedDataUrl = canvas.toDataURL('image/webp', 0.9);
          if (optimizedDataUrl.length > 650000) {
            optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          }

          setSettingsForm(prev => ({
            ...prev,
            pixQrCodeUrl: optimizedDataUrl,
          }));
          setMessage('📷 Imagem do QR Code carregada! Clique em "Salvar Configurações de PIX" para publicar.');
          setError('');
        } catch {
          setSettingsForm(prev => ({
            ...prev,
            pixQrCodeUrl: rawDataUrl,
          }));
          setMessage('📷 Imagem do QR Code carregada! Clique em "Salvar Configurações de PIX" para publicar.');
          setError('');
        }
      };
      img.onerror = () => {
        setError('Não foi possível ler a imagem selecionada. Tente outro arquivo.');
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  }

  async function handleQuickSettingToggle(field, value, labelMsg) {
    const nextForm = {
      ...settingsForm,
      [field]: value,
    };
    setSettingsForm(nextForm);
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await saveGardenSettings(nextForm, user?.uid || ADMIN_UID);
      setMessage(labelMsg);
    } catch (err) {
      setError('Não foi possível atualizar a configuração: ' + (err?.message || 'Erro inesperado.'));
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleLoveMessage(msg) {
    const nextPublic = msg.isPublic === false;
    try {
      await toggleLoveMessageVisibility(msg.id, nextPublic);
      setMessage(
        nextPublic
          ? `🟢 A mensagem de "${msg.isAnonymous ? 'Amigo(a) Secreto(a)' : msg.authorName}" agora está VISÍVEL para todos na página.`
          : `⚪ A mensagem de "${msg.isAnonymous ? 'Amigo(a) Secreto(a)' : msg.authorName}" agora está OCULTA da página (visível só para você).`
      );
    } catch (err) {
      setError('Erro ao alterar visibilidade da mensagem: ' + err.message);
    }
  }

  async function handleDeleteLoveMsg(msg) {
    const confirmed = window.confirm(
      `Deseja remover esta mensagem de "${msg.isAnonymous ? 'Amigo(a) Secreto(a)' : msg.authorName}" do mural?`
    );
    if (!confirmed) return;
    try {
      await deleteLoveMessage(msg.id);
      setMessage('Mensagem removida do mural com sucesso.');
    } catch (err) {
      setError('Erro ao excluir mensagem: ' + err.message);
    }
  }

  async function handleToggleGiftMessageOnWall(res, product) {
    const wallDocId = `gift_${res.id}`;
    const existingWallMsg = loveMessagesById[wallDocId];

    try {
      if (existingWallMsg) {
        const nextPublic = existingWallMsg.isPublic === false;
        await toggleLoveMessageVisibility(wallDocId, nextPublic);
        setMessage(
          nextPublic
            ? '🟢 Recado do presente publicado no Mural de Carinho da página!'
            : '⚪ Recado do presente ocultado do Mural público (continua salvo aqui para você).'
        );
      } else {
        await createLoveMessage(
          {
            authorUid: user?.uid || ADMIN_UID,
            authorName: res.name || 'Pessoa querida',
            isAnonymous: Boolean(res.isAnonymous),
            message: res.message,
            giftName: product?.name || res.productId,
            sentPix: false,
            isPublic: true,
          },
          wallDocId
        );
        setMessage('🟢 Recado do presente publicado no Mural de Carinho da página!');
      }
    } catch (err) {
      setError('Não foi possível atualizar o recado no mural: ' + err.message);
    }
  }

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
        <div className="admin-login-header">
          <img
            src={`${baseUrl}/images/logo-michele-joohann.png`}
            alt="Michèlé Joohann"
            className="admin-login-logo"
            width="64"
            height="64"
          />
          <span className="section-kicker">Administração do Jardim</span>
          <h2 id="admin-title">Área Administrativa</h2>
          <p className="admin-login-subtitle">
            Entre com as credenciais da administradora para gerenciar os presentes com carinho.
          </p>
        </div>

        <form className="admin-login-form" onSubmit={handleLogin}>
          <label className="admin-login-field">
            <span>E-mail de Acesso</span>
            <input
              type="email"
              value={email}
              onChange={e => {
                setEmail(e.target.value);
                if (error) setError('');
              }}
              required
              autoComplete="username"
              placeholder="seu-email@exemplo.com"
            />
          </label>
          <label className="admin-login-field">
            <span>Senha</span>
            <input
              type="password"
              value={password}
              onChange={e => {
                setPassword(e.target.value);
                if (error) setError('');
              }}
              required
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </label>
          <button type="submit" className="admin-login-submit" disabled={busy}>
            {busy ? 'Entrando…' : 'Entrar como administradora 🔑'}
          </button>
        </form>

        {(onNavigateHome || onClose) && (
          <button
            type="button"
            className="admin-login-back-btn"
            onClick={onNavigateHome || onClose}
            title="Voltar para a vitrine pública do catálogo"
          >
            ← Voltar ao Jardim / Vitrine
          </button>
        )}

        {message && (
          <p className="notice success" role="status">
            {message}
          </p>
        )}
        {error && (
          <p className="notice error admin-login-error" role="alert">
            <span className="notice-icon" aria-hidden="true">⚠️</span>
            <span>{error}</span>
          </p>
        )}
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
          💌 Mensagens & Recados ({reservations.length + loveMessages.length})
        </button>
        <button
          type="button"
          className={`admin-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          💎 PIX & Mural de Carinho
        </button>
        <button
          type="button"
          className={`admin-tab-btn ${activeTab === 'backup' ? 'active' : ''}`}
          onClick={() => setActiveTab('backup')}
        >
          📊 Planilhas & Backup
        </button>
      </div>

      {message && <p className="notice success">{message}</p>}
      {error && <p className="notice error" role="alert">{error}</p>}

      {/* CONTEÚDO DA ABA 1: GERENCIAR PRESENTES */}
      {activeTab === 'products' && (
        <div className="admin-tab-content">
          {/* BARRA DE AÇÕES RÁPIDAS: NOVO PRESENTE, TEMPLATE CSV E IMPORTAÇÃO */}
          <div className="admin-actions-hero-bar">
            <div className="admin-hero-actions-group">
              <button
                type="button"
                className="primary-button admin-hero-action-btn"
                onClick={() => setIsCreating(true)}
                title="Cadastrar um novo presente manualmente"
              >
                ✨ + Novo Presente
              </button>

              <button
                type="button"
                className="secondary-button admin-hero-action-btn highlight-template"
                onClick={handleDownloadCsvTemplate}
                disabled={busy}
                title="Baixar planilha modelo em CSV com todos os 21 campos oficiais para abrir no Excel"
              >
                📄 Baixar Modelo CSV / Excel
              </button>

              <label
                className="secondary-button admin-hero-action-btn highlight-upload"
                style={{ cursor: busy ? 'not-allowed' : 'pointer', margin: 0 }}
                title="Enviar planilha CSV preenchida para sincronizar múltiplos presentes no Firestore"
              >
                <span>📤 Importar Planilha CSV</span>
                <input
                  type="file"
                  accept=".csv,text/csv,text/plain"
                  onChange={handleImportCsvFile}
                  disabled={busy}
                  style={{ display: 'none' }}
                />
              </label>

              <button
                type="button"
                className="secondary-button admin-hero-action-btn highlight-hide-all"
                onClick={() => handleBatchVisibility(false)}
                disabled={busy || totalEnabled === 0}
                title="Ocultar todos os presentes ativos da vitrine do site com 1 clique (continuam salvos no banco de dados)"
              >
                ⚪ Ocultar Todos ({totalEnabled})
              </button>

              <button
                type="button"
                className="secondary-button admin-hero-action-btn highlight-show-all"
                onClick={() => handleBatchVisibility(true)}
                disabled={busy || totalDisabled === 0}
                title="Habilitar todos os presentes na vitrine do site para os visitantes com 1 clique"
              >
                🟢 Habilitar Todos ({totalDisabled})
              </button>

              <button
                type="button"
                className="text-link-button admin-hero-action-link"
                onClick={() => setActiveTab('backup')}
                title="Ir para a aba completa de planilhas e backup estrutural"
              >
                📊 Aba Planilhas & Backup →
              </button>
            </div>

            <div className="admin-hero-hint-pill">
              <span>💡 Dica: Para ver a <strong>pré-visualização e o simulador de enquadramento da foto</strong>, clique em <strong>📐 Enquadramento</strong> ou <strong>✏️ Editar</strong> em qualquer item da tabela abaixo.</span>
            </div>
          </div>

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
                    const imageUrl = resolveImageUrl(prod.imageUrl || prod.image);

                    const priorityLower = String(prod.priority || prod.prioridade || '').toLowerCase();

                    return (
                      <tr key={prod.id} className={!isEnabled ? 'row-disabled' : ''}>
                        <td className="product-cell-identity">
                          <div className="product-table-identity">
                            <div
                              className={`table-thumb ${prod.imageFit === 'contain' ? 'media-contain' : ''} is-clickable`}
                              onClick={() => setEditingProduct(prod)}
                              title="Clique para ver a pré-visualização e ajustar o enquadramento desta foto"
                            >
                              {imageUrl ? (
                                <img
                                  src={imageUrl}
                                  alt=""
                                  loading="lazy"
                                  style={{
                                    objectPosition: prod.imagePosition || 'center',
                                    objectFit: prod.imageFit || 'cover',
                                  }}
                                />
                              ) : (
                                <span>🌿</span>
                              )}
                              <span className="table-thumb-badge" aria-hidden="true" title="Ajustar enquadramento">📐</span>
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
                            className="table-action-btn framing"
                            onClick={() => setEditingProduct(prod)}
                            title="Abrir simulador visual e ajustar enquadramento da foto"
                          >
                            📐 Foto
                          </button>
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
          {/* BARRA DE CONTROLE RÁPIDO DE VISIBILIDADE DO MURAL */}
          <div className="admin-wall-quick-bar">
            <div className="admin-wall-quick-info">
              <span className="admin-wall-quick-icon">💌</span>
              <div>
                <h4>Visibilidade do Mural de Carinho na Página</h4>
                <p>
                  Escolha se as mensagens deixadas pelos convidados ficam visíveis na página pública para todos lerem ou se ficam privadas apenas para você neste painel.
                </p>
              </div>
            </div>
            <div className="admin-wall-quick-actions">
              <button
                type="button"
                disabled={busy}
                className={`badge-visibility-toggle ${settingsForm.publicWallVisible !== false ? 'is-enabled' : 'is-disabled'}`}
                onClick={() =>
                  handleQuickSettingToggle(
                    'publicWallVisible',
                    settingsForm.publicWallVisible === false,
                    settingsForm.publicWallVisible === false
                      ? '🟢 O Mural de Carinho agora está VISÍVEL na página para todos!'
                      : '🔒 O Mural de Carinho agora está PRIVADO (visível apenas para você no painel).'
                  )
                }
              >
                {settingsForm.publicWallVisible !== false
                  ? '🟢 Mural Visível para Todos na Página'
                  : '🔒 Mural Privado (Só para mim)'}
              </button>

              <button
                type="button"
                className="secondary-button"
                style={{ padding: '8px 14px', fontSize: '0.82rem' }}
                onClick={() => setActiveTab('settings')}
              >
                ⚙️ Configurar Seção & PIX →
              </button>
            </div>
          </div>

          {/* SEÇÃO 1: MURAL DE MENSAGENS DE CARINHO (AVULSAS E DO MURAL) */}
          <div className="admin-gifts-header" style={{ marginTop: '20px' }}>
            <h3>🌸 Cartinhas da Seção &ldquo;Mensagens de Carinho&rdquo; ({loveMessages.length})</h3>
            <p>
              Mensagens deixadas diretamente na seção de carinho da página (ou sincronizadas dos presentes). Você pode escolher individualmente quais aparecem no mural público:
            </p>
          </div>

          {loveMessages.length === 0 ? (
            <p className="empty-state" style={{ padding: '20px 0' }}>
              Nenhuma mensagem avulsa deixada no mural ainda. Assim que alguém escrever um recadinho na página, ele aparecerá aqui! 💌
            </p>
          ) : (
            <div className="admin-gifts-list">
              {loveMessages.map(msg => {
                const dateStr = msg.createdAt?.toDate
                  ? msg.createdAt.toDate().toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Recentemente';
                const isMsgPublic = msg.isPublic !== false;

                return (
                  <article key={msg.id} className="admin-gift-card">
                    <div className="admin-gift-card-header">
                      <div>
                        <div className="admin-msg-badges-row">
                          <span className={`gift-tag ${isMsgPublic ? 'available' : 'reserved'}`}>
                            {isMsgPublic ? '🟢 Visível no Mural Público' : '🔒 Privada (Só para você)'}
                          </span>
                          {msg.sentPix && (
                            <span className="gift-tag done">💎 Enviou Mimo via PIX</span>
                          )}
                          {msg.giftName && (
                            <span className="gift-tag reserved">🎁 Presente: {msg.giftName}</span>
                          )}
                        </div>
                        <h4>
                          {msg.isAnonymous ? '🕵️ Amigo(a) Secreto(a) (Anônimo)' : (msg.authorName || 'Pessoa querida')}
                        </h4>
                        <span className="donor-date">{dateStr}</span>
                      </div>

                      <div className="admin-msg-card-actions">
                        <button
                          type="button"
                          className={`badge-visibility-toggle ${isMsgPublic ? 'is-enabled' : 'is-disabled'}`}
                          onClick={() => handleToggleLoveMessage(msg)}
                          title={isMsgPublic ? 'Ocultar esta mensagem da página pública' : 'Tornar esta mensagem visível na página para todos'}
                        >
                          {isMsgPublic ? '🟢 Visível na página' : '⚪ Oculta da página'}
                        </button>
                        <button
                          type="button"
                          className="table-action-btn delete"
                          onClick={() => handleDeleteLoveMsg(msg)}
                          title="Excluir esta mensagem"
                        >
                          🗑️ Excluir
                        </button>
                      </div>
                    </div>

                    <blockquote className="admin-gift-message">
                      “{msg.message}”
                    </blockquote>
                  </article>
                );
              })}
            </div>
          )}

          {/* SEÇÃO 2: PRESENTES MARCADOS E VOTOS DOS PRESENTES */}
          <div className="admin-gifts-header" style={{ marginTop: '36px' }}>
            <h3>🎁 Presentes Marcados & Recados de Presentes ({reservations.length})</h3>
            <p>Veja quem marcou ou comprou presentes da lista e os votos enviados junto com a escolha:</p>
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
                const wallDoc = loveMessagesById[`gift_${res.id}`];
                const isPublishedOnWall = wallDoc ? wallDoc.isPublic !== false : false;

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
                      <div className="admin-msg-card-actions">
                        {res.message && (
                          <button
                            type="button"
                            className={`badge-visibility-toggle ${isPublishedOnWall ? 'is-enabled' : 'is-disabled'}`}
                            onClick={() => handleToggleGiftMessageOnWall(res, product)}
                            title="Exibir ou ocultar este recado no Mural de Carinho da página"
                          >
                            {isPublishedOnWall ? '🟢 No Mural Público' : '⚪ Exibir no Mural'}
                          </button>
                        )}
                        <button
                          type="button"
                          className="text-link-button"
                          onClick={() => handleCancelGift(res.productId, product?.name || res.productId)}
                          title="Liberar presente de volta ao catálogo"
                        >
                          Liberar item ↺
                        </button>
                      </div>
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

      {/* CONTEÚDO DA ABA 3: PIX & MURAL DE CARINHO (CONFIGURAÇÕES FÁCEIS) */}
      {activeTab === 'settings' && (
        <div className="admin-tab-content">
          <form className="admin-settings-grid" onSubmit={handleSaveSettings}>
            {/* CARD 1: CONFIGURAÇÃO DA SEÇÃO DE PIX */}
            <div className="admin-data-card highlight">
              <div className="admin-data-card-header">
                <span className="admin-data-card-icon">💎</span>
                <div>
                  <h3>Configuração da Seção de PIX</h3>
                  <p>
                    Configure facilmente sua chave PIX para que os convidados possam copiar com 1 clique e enviar um mimo livre diretamente para você.
                  </p>
                </div>
              </div>

              <div className="admin-settings-toggles-list">
                <label className="admin-setting-switch-row">
                  <input
                    type="checkbox"
                    checked={settingsForm.pixEnabled !== false}
                    onChange={e =>
                      setSettingsForm(prev => ({ ...prev, pixEnabled: e.target.checked }))
                    }
                  />
                  <div className="admin-setting-switch-text">
                    <strong>Exibir seção de PIX na página pública</strong>
                    <span>Quando ativado, a seção &ldquo;Mimo Livre via PIX&rdquo; aparece no Jardim com botão de copiar chave.</span>
                  </div>
                </label>
              </div>

              <div className="admin-settings-fields-grid">
                <label className="admin-setting-field">
                  <span>Tipo de Chave PIX</span>
                  <select
                    value={settingsForm.pixKeyType || 'Chave PIX'}
                    onChange={e =>
                      setSettingsForm(prev => ({ ...prev, pixKeyType: e.target.value }))
                    }
                  >
                    <option value="E-mail">📧 E-mail</option>
                    <option value="Celular / WhatsApp">📱 Celular / WhatsApp</option>
                    <option value="CPF">🪪 CPF</option>
                    <option value="Chave Aleatória">🔑 Chave Aleatória</option>
                    <option value="PIX Copia e Cola">📋 Código PIX Copia e Cola</option>
                  </select>
                </label>

                <label className="admin-setting-field">
                  <span>Sua Chave PIX *</span>
                  <input
                    type="text"
                    value={settingsForm.pixKey || ''}
                    onChange={e =>
                      setSettingsForm(prev => ({ ...prev, pixKey: e.target.value }))
                    }
                    placeholder="Ex: michelejoohann@gmail.com, celular ou chave aleatória"
                  />
                </label>

                <label className="admin-setting-field">
                  <span>Nome do Favorecido (Titular)</span>
                  <input
                    type="text"
                    value={settingsForm.pixHolderName || ''}
                    onChange={e =>
                      setSettingsForm(prev => ({ ...prev, pixHolderName: e.target.value }))
                    }
                    placeholder="Ex: Michèlé Joohann"
                  />
                </label>

                <label className="admin-setting-field">
                  <span>Instituição / Banco (Opcional)</span>
                  <input
                    type="text"
                    value={settingsForm.pixBank || ''}
                    onChange={e =>
                      setSettingsForm(prev => ({ ...prev, pixBank: e.target.value }))
                    }
                    placeholder="Ex: Nubank, Itaú, Inter..."
                  />
                </label>

                <label className="admin-setting-field full-width">
                  <span>Título da Seção de PIX</span>
                  <input
                    type="text"
                    value={settingsForm.pixTitle || ''}
                    onChange={e =>
                      setSettingsForm(prev => ({ ...prev, pixTitle: e.target.value }))
                    }
                    placeholder="Ex: Mimo Livre via PIX"
                  />
                </label>

                <label className="admin-setting-field full-width">
                  <span>Texto de convite da seção de PIX</span>
                  <textarea
                    rows={3}
                    value={settingsForm.pixDescription || ''}
                    onChange={e =>
                      setSettingsForm(prev => ({ ...prev, pixDescription: e.target.value }))
                    }
                    placeholder="Caso prefira presentear com qualquer valor livre para ajudar a florir este jardim, sinta-se à vontade para enviar um mimo via PIX."
                  />
                </label>

                <div className="admin-setting-field full-width">
                  <span>Imagem do QR Code PIX (Opcional — envie do seu computador)</span>
                  <div className="admin-qr-upload-box">
                    {settingsForm.pixQrCodeUrl ? (
                      <div className="admin-qr-preview-wrap">
                        <div className="admin-qr-preview-thumb">
                          <img
                            src={resolveImageUrl(settingsForm.pixQrCodeUrl)}
                            alt="Prévia do QR Code PIX"
                          />
                        </div>
                        <div className="admin-qr-preview-actions">
                          <p className="admin-qr-status-text">
                            ✅ QR Code carregado e pronto para exibição na seção de PIX.
                          </p>
                          <div className="admin-qr-buttons-row">
                            <label className="secondary-button admin-qr-upload-btn">
                              <span>📤 Trocar Imagem do Computador</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleQrCodeFileUpload}
                                disabled={busy}
                                style={{ display: 'none' }}
                              />
                            </label>
                            <button
                              type="button"
                              className="table-action-btn delete"
                              onClick={() =>
                                setSettingsForm(prev => ({ ...prev, pixQrCodeUrl: '' }))
                              }
                              disabled={busy}
                            >
                              🗑️ Remover QR Code
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="admin-qr-empty-upload">
                        <label className="secondary-button admin-qr-upload-btn">
                          <span>📤 Escolher Imagem do QR Code no Computador</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleQrCodeFileUpload}
                            disabled={busy}
                            style={{ display: 'none' }}
                          />
                        </label>
                        <small className="admin-qr-upload-hint">
                          Formatos aceitos: PNG, JPG ou WebP. Deixe sem imagem caso prefira exibir apenas a chave PIX com botão de copiar.
                        </small>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="admin-data-actions-row">
                <button
                  type="submit"
                  className="primary-button"
                  disabled={busy}
                >
                  {busy ? 'Salvando…' : '💾 Salvar Configurações de PIX'}
                </button>
              </div>
            </div>

            {/* CARD 2: CONFIGURAÇÃO DA SEÇÃO DE MENSAGENS DE CARINHO */}
            <div className="admin-data-card highlight">
              <div className="admin-data-card-header">
                <span className="admin-data-card-icon">💌</span>
                <div>
                  <h3>Configuração da Seção &ldquo;Mensagens de Carinho&rdquo;</h3>
                  <p>
                    Defina se você quer deixar o mural de mensagens visível na página para todos os visitantes ou se prefere que os recados fiquem visíveis apenas para você no painel administrativo.
                  </p>
                </div>
              </div>

              <div className="admin-settings-toggles-list">
                <label className="admin-setting-switch-row">
                  <input
                    type="checkbox"
                    checked={settingsForm.messagesSectionEnabled !== false}
                    onChange={e =>
                      setSettingsForm(prev => ({
                        ...prev,
                        messagesSectionEnabled: e.target.checked,
                      }))
                    }
                  />
                  <div className="admin-setting-switch-text">
                    <strong>Exibir seção para envio de Mensagens de Carinho na página</strong>
                    <span>Permite que qualquer pessoa querida deixe uma cartinha de afeto para você no Jardim.</span>
                  </div>
                </label>

                <label className="admin-setting-switch-row">
                  <input
                    type="checkbox"
                    checked={settingsForm.publicWallVisible !== false}
                    onChange={e =>
                      setSettingsForm(prev => ({
                        ...prev,
                        publicWallVisible: e.target.checked,
                      }))
                    }
                  />
                  <div className="admin-setting-switch-text">
                    <strong>Deixar as mensagens visíveis na página para todos (Mural Público)</strong>
                    <span>
                      Se marcado, os visitantes poderão ler o Mural de Carinho na página. Se desmarcado, os visitantes ainda poderão enviar recados pelo formulário, mas somente você lerá aqui no painel.
                    </span>
                  </div>
                </label>

                <label className="admin-setting-switch-row">
                  <input
                    type="checkbox"
                    checked={settingsForm.autoApproveMessages !== false}
                    onChange={e =>
                      setSettingsForm(prev => ({
                        ...prev,
                        autoApproveMessages: e.target.checked,
                      }))
                    }
                  />
                  <div className="admin-setting-switch-text">
                    <strong>Publicar novas mensagens automaticamente no mural</strong>
                    <span>
                      Se desmarcado, novas mensagens chegam ocultas por padrão e só aparecem no mural público quando você clicar em &ldquo;Visível na página&rdquo; na aba Mensagens.
                    </span>
                  </div>
                </label>
              </div>

              <div className="admin-settings-fields-grid">
                <label className="admin-setting-field full-width">
                  <span>Título da Seção de Mensagens</span>
                  <input
                    type="text"
                    value={settingsForm.messagesTitle || ''}
                    onChange={e =>
                      setSettingsForm(prev => ({ ...prev, messagesTitle: e.target.value }))
                    }
                    placeholder="Ex: Mensagens de Carinho"
                  />
                </label>

                <label className="admin-setting-field full-width">
                  <span>Subtítulo / Convite da Seção</span>
                  <textarea
                    rows={3}
                    value={settingsForm.messagesSubtitle || ''}
                    onChange={e =>
                      setSettingsForm(prev => ({ ...prev, messagesSubtitle: e.target.value }))
                    }
                    placeholder="Deixe um recadinho especial, votos de felicidade ou uma palavra de afeto..."
                  />
                </label>
              </div>

              <div className="admin-data-actions-row">
                <button
                  type="submit"
                  className="primary-button"
                  disabled={busy}
                >
                  {busy ? 'Salvando…' : '💾 Salvar Configurações de Mensagens'}
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setActiveTab('messages')}
                >
                  💌 Ver Recados Recebidos ({loveMessages.length})
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* CONTEÚDO DA ABA 3: PLANILHAS & BACKUP */}
      {activeTab === 'backup' && (
        <div className="admin-tab-content">
          <div className="admin-data-management-grid">
            {/* CARD 1: EXCEL / CSV EM LOTE */}
            <div className="admin-data-card highlight">
              <div className="admin-data-card-header">
                <span className="admin-data-card-icon">📊</span>
                <div>
                  <h3>Importação & Exportação via Planilha (Excel / CSV)</h3>
                  <p>
                    Cadastre, edite ou sincronize múltiplos presentes de uma só vez usando o Microsoft Excel, Google Planilhas ou LibreOffice.
                    O template padrão já vem com todos os 21 campos oficiais e exemplos práticos para você preencher com facilidade.
                  </p>
                </div>
              </div>

              <div className="admin-data-actions-row">
                <button
                  type="button"
                  className="secondary-button admin-btn-csv-template"
                  onClick={handleDownloadCsvTemplate}
                  disabled={busy}
                  title="Baixar planilha modelo em CSV pronta para abrir no Excel"
                >
                  📄 Baixar Template Padrão (CSV / Excel)
                </button>

                <button
                  type="button"
                  className="secondary-button admin-btn-csv-export"
                  onClick={handleExportCsv}
                  disabled={busy || products.length === 0}
                  title="Exportar todos os presentes cadastrados em formato de planilha Excel"
                >
                  📊 Exportar Catálogo Atual em CSV ({products.length})
                </button>

                <label
                  className="admin-btn-csv-upload"
                  style={{ cursor: busy ? 'not-allowed' : 'pointer', margin: 0 }}
                  title="Enviar planilha preenchida para gravar os presentes diretamente no Firestore"
                >
                  <span>📤 Enviar Planilha CSV para o Firestore</span>
                  <input
                    type="file"
                    accept=".csv,text/csv,text/plain"
                    onChange={handleImportCsvFile}
                    disabled={busy}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>

              <details className="admin-data-card-columns">
                <summary>ℹ️ Ver os 21 campos predefinidos suportados na planilha</summary>
                <ul>
                  <li><strong>Nome do Presente *</strong> (obrigatório)</li>
                  <li><strong>Categoria</strong> (casa, tecnologia, moda, calcados, beleza, joias, livros, arte, jardim, pets)</li>
                  <li><strong>Coleção</strong> (ex: Cantinho do Café, Magia da Fada, etc.)</li>
                  <li><strong>Subcategoria</strong> (ex: Cozinha, Quarto, etc.)</li>
                  <li><strong>Valor</strong> (ex: 159,90 ou 159.90)</li>
                  <li><strong>Texto do Preço</strong> (ex: R$ 159,90 ou Sob Consulta)</li>
                  <li><strong>Prioridade</strong> (alta, media, baixa)</li>
                  <li><strong>Quantidade Desejada</strong> (ex: 1)</li>
                  <li><strong>Link da Loja / Compra</strong> (URL da loja oficial)</li>
                  <li><strong>Nome da Loja</strong> (ex: Amazon, Schutz, Shein)</li>
                  <li><strong>URL da Imagem</strong> (link direto da foto)</li>
                  <li><strong>Enquadramento da Foto</strong> (center, top, bottom, left, right)</li>
                  <li><strong>Modo da Imagem</strong> (cover ou contain)</li>
                  <li><strong>O Sonho</strong> (texto do sonho)</li>
                  <li><strong>A História</strong> (história ou motivo do desejo)</li>
                  <li><strong>Descrição</strong> (descrição acolhedora)</li>
                  <li><strong>Significados</strong> (tags separadas por vírgula)</li>
                  <li><strong>Tamanhos</strong> (separados por vírgula)</li>
                  <li><strong>Observações</strong> (notas separadas por vírgula)</li>
                  <li><strong>Visível no Site?</strong> (sim ou nao)</li>
                  <li><strong>ID</strong> (opcional: deixe vazio para novo presente)</li>
                </ul>
              </details>
            </div>

            {/* CARD 2: BACKUP JSON COMPLETO */}
            <div className="admin-data-card">
              <div className="admin-data-card-header">
                <span className="admin-data-card-icon">📁</span>
                <div>
                  <h3>Backup Estrutural do Banco (Formato JSON)</h3>
                  <p>
                    Exporta e restaura o snapshot completo de segurança do Cloud Firestore em formato de dados bruto (.json).
                    Recomendado para guardar cópias de segurança integrais no seu computador.
                  </p>
                </div>
              </div>

              <div className="admin-data-actions-row">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={handleExportBackup}
                  disabled={busy || products.length === 0}
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
                  📤 Restaurar Arquivo JSON
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={handleImportBackupFile}
                    disabled={busy}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
            </div>

            {/* CARD 3: CONTROLE GERAL DE VISIBILIDADE DA VITRINE */}
            <div className="admin-data-card">
              <div className="admin-data-card-header">
                <span className="admin-data-card-icon">👁️</span>
                <div>
                  <h3>Controle Geral de Visibilidade da Vitrine</h3>
                  <p>
                    Oculte ou reexiba todos os presentes da vitrine pública de uma só vez com 1 clique, sem precisar
                    editar planilhas ou código. Atualmente há <strong>{totalEnabled}</strong> presentes visíveis no site
                    e <strong>{totalDisabled}</strong> desabilitados (ocultos).
                  </p>
                </div>
              </div>

              <div className="admin-data-actions-row">
                <button
                  type="button"
                  className="secondary-button admin-hero-action-btn highlight-hide-all"
                  onClick={() => handleBatchVisibility(false)}
                  disabled={busy || totalEnabled === 0}
                  title="Ocultar todos os presentes da vitrine pública"
                >
                  ⚪ Ocultar Todos da Vitrine ({totalEnabled})
                </button>

                <button
                  type="button"
                  className="secondary-button admin-hero-action-btn highlight-show-all"
                  onClick={() => handleBatchVisibility(true)}
                  disabled={busy || totalDisabled === 0}
                  title="Habilitar todos os presentes na vitrine pública"
                >
                  🟢 Habilitar Todos na Vitrine ({totalDisabled})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
