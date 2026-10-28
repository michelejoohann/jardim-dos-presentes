import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase/config.js';

export const SETTINGS_DOC_ID = '--garden-settings--';

export const DEFAULT_GARDEN_SETTINGS = {
  // Configurações da seção de Mensagens de Carinho
  messagesSectionEnabled: true,
  publicWallVisible: true,
  autoApproveMessages: true,
  messagesTitle: 'Mensagens de Carinho',
  messagesSubtitle:
    'Deixe uma cartinha, votos de felicidade ou uma mensagem especial para florescer neste Jardim.',

  // Configurações da seção de PIX
  pixEnabled: false,
  pixKey: '',
  pixKeyType: 'E-mail',
  pixHolderName: 'Michèlé Joohann',
  pixBank: '',
  pixTitle: 'Mimo Livre via PIX',
  pixDescription:
    'Caso prefira presentear com qualquer valor livre para ajudar a florir este jardim, sinta-se à vontade para enviar um mimo via PIX.',
  pixQrCodeUrl: '',
};

const LEGACY_PIX_DESCRIPTION =
  'Caso prefira presentear com qualquer valor livre para ajudar a realizar nossos sonhos, sinta-se à vontade para enviar um mimo via PIX.';

/**
 * Escuta em tempo real as configurações gerais do Jardim (PIX e Visibilidade de Mensagens).
 */
export function subscribeToGardenSettings(onData, onError) {
  const settingsRef = doc(db, 'comments', SETTINGS_DOC_ID);
  return onSnapshot(
    settingsRef,
    snapshot => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const merged = {
          ...DEFAULT_GARDEN_SETTINGS,
          ...data,
        };
        if (!merged.pixDescription || merged.pixDescription === LEGACY_PIX_DESCRIPTION) {
          merged.pixDescription = DEFAULT_GARDEN_SETTINGS.pixDescription;
        }
        onData(merged);
      } else {
        onData({ ...DEFAULT_GARDEN_SETTINGS });
      }
    },
    error => {
      console.warn('Não foi possível carregar as configurações do Jardim:', error);
      onData({ ...DEFAULT_GARDEN_SETTINGS });
      if (onError) onError(error);
    }
  );
}

/**
 * Salva as configurações de PIX e Mensagens de Carinho no Firestore (apenas administradora).
 */
export async function saveGardenSettings(newSettings, adminUid) {
  if (!adminUid) throw new Error('Sessão de administradora não identificada.');
  const settingsRef = doc(db, 'comments', SETTINGS_DOC_ID);
  await setDoc(
    settingsRef,
    {
      ...DEFAULT_GARDEN_SETTINGS,
      ...newSettings,
      authorUid: adminUid,
      isSettingsDoc: true,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Escuta em tempo real todas as mensagens de carinho na coleção 'comments' (excluindo o doc de configuração).
 */
export function subscribeToLoveMessages(onData, onError) {
  const commentsRef = collection(db, 'comments');
  return onSnapshot(
    commentsRef,
    snapshot => {
      const list = snapshot.docs
        .filter(docSnap => docSnap.id !== SETTINGS_DOC_ID && !docSnap.data()?.isSettingsDoc)
        .map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));

      list.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || 0;
        return timeB - timeA;
      });

      onData(list);
    },
    error => {
      console.warn('Não foi possível carregar as mensagens de carinho:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Cria uma nova mensagem de carinho enviada por um visitante ou junto a um presente.
 */
export async function createLoveMessage({
  authorUid,
  authorName = '',
  isAnonymous = false,
  message = '',
  giftName = '',
  productId = '',
  isPixNote = false,
  visible = true,
}) {
  if (!authorUid) throw new Error('Aguardando conexão da sessão. Tente novamente em instantes.');
  const cleanMessage = String(message || '').trim();
  if (!cleanMessage) throw new Error('Por favor, escreva uma mensagem de carinho antes de enviar.');

  const cleanName = isAnonymous
    ? 'Amigo(a) Secreto(a)'
    : String(authorName || '').trim() || 'Visitante Querido(a)';

  const commentsRef = collection(db, 'comments');
  await addDoc(commentsRef, {
    authorUid,
    authorName: cleanName,
    isAnonymous: Boolean(isAnonymous),
    message: cleanMessage,
    giftName: String(giftName || '').trim(),
    productId: String(productId || '').trim(),
    isPixNote: Boolean(isPixNote),
    visible: Boolean(visible),
    createdAt: serverTimestamp(),
  });
}

/**
 * Alterna a visibilidade pública de uma mensagem de carinho (apenas administradora).
 * Se a mensagem veio originalmente apenas de privateReservations, cria/atualiza o espelho público em 'comments'.
 */
export async function toggleLoveMessageVisibility(commentId, targetVisible, fallbackData = null, adminUid = '') {
  if (!commentId) throw new Error('ID da mensagem não informado.');
  const commentRef = doc(db, 'comments', commentId);

  if (fallbackData && adminUid) {
    await setDoc(
      commentRef,
      {
        authorUid: adminUid,
        authorName: fallbackData.isAnonymous ? 'Amigo(a) Secreto(a)' : (fallbackData.name || 'Convidado(a)'),
        isAnonymous: Boolean(fallbackData.isAnonymous),
        message: fallbackData.message || '',
        giftName: fallbackData.giftName || '',
        productId: fallbackData.productId || '',
        visible: Boolean(targetVisible),
        createdAt: fallbackData.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    return Boolean(targetVisible);
  }

  await updateDoc(commentRef, {
    visible: Boolean(targetVisible),
    updatedAt: serverTimestamp(),
  });
  return Boolean(targetVisible);
}

/**
 * Exclui uma mensagem do mural (apenas administradora).
 */
export async function deleteLoveMessage(commentId) {
  if (!commentId) throw new Error('ID da mensagem não informado.');
  await deleteDoc(doc(db, 'comments', commentId));
}

