import {
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase/config.js';

/**
 * Normaliza e gera um ID amigável e único para um novo produto, caso não possua.
 */
function generateProductId(name) {
  const baseSlug = String(name || 'presente')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);

  const uniqueSuffix = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
  return `${baseSlug}-${uniqueSuffix}`;
}

/**
 * Converte valor numérico em texto formatado em Real (R$ 0,00).
 */
export function formatCurrencyBRL(value) {
  if (value === null || value === undefined || value === '') return '';
  const num = Number(value);
  if (Number.isNaN(num)) return '';
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Resolve e normaliza URLs de imagens para suporte transparente a assets locais e URLs remotas,
 * garantindo compatibilidade com o base URL do Vite (ex: no GitHub Pages).
 * @param {string} rawUrl - URL bruta ou caminho relativo da imagem.
 * @param {string} [baseUrl] - Base URL da aplicação (opcional, padrão import.meta.env.BASE_URL).
 * @returns {string} - URL tratada e pronta para a tag <img>.
 */
export function resolveImageUrl(rawUrl, baseUrl = import.meta.env.BASE_URL || '/') {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  const cleanBase = baseUrl.replace(/\/$/, '');
  if (trimmed.startsWith('/') && !trimmed.startsWith(cleanBase)) {
    return `${cleanBase}${trimmed}`;
  }
  return trimmed;
}

/**
 * Cria ou atualiza um presente diretamente na coleção `products` do Firestore.
 * @param {Object} rawData - Dados do presente preenchidos pelo formulário.
 * @param {string|null} existingId - Se informado, atualiza o documento existente.
 * @returns {Promise<string>} - Retorna o ID do produto gravado.
 */
export async function saveProduct(rawData, existingId = null) {
  if (!rawData.name?.trim()) {
    throw new Error('O nome do presente é obrigatório.');
  }

  const isEditing = Boolean(existingId);
  const productId = isEditing ? existingId : generateProductId(rawData.name);
  const productRef = doc(db, 'products', productId);

  // Tratamento dos campos numéricos
  const parsedPrice = rawData.price !== '' && rawData.price !== null && rawData.price !== undefined
    ? Number(rawData.price)
    : null;

  const parsedQtyDesired = rawData.quantityDesired ? Math.max(1, parseInt(rawData.quantityDesired, 10)) : 1;
  const parsedQtyReceived = rawData.quantityReceived ? Math.max(0, parseInt(rawData.quantityReceived, 10)) : 0;

  // Formatação do label de preço se não informado
  let priceLabel = rawData.priceLabel?.trim() || '';
  if (!priceLabel && parsedPrice !== null && !Number.isNaN(parsedPrice)) {
    priceLabel = formatCurrencyBRL(parsedPrice);
  }

  // Tratamento de listas (podem vir como array ou string separada por vírgulas)
  const parseList = val => {
    if (Array.isArray(val)) return val.map(item => String(item).trim()).filter(Boolean);
    if (typeof val === 'string') return val.split(',').map(item => item.trim()).filter(Boolean);
    return [];
  };

    const isEnabled = rawData.enabled !== false;

  const payload = {
    name: rawData.name.trim(),
    category: rawData.category?.trim() || 'casa',
    subcategory: rawData.subcategory?.trim() || '',
    collection: rawData.collection?.trim() || '',
    price: parsedPrice,
    priceLabel,
    priority: rawData.priority?.trim() || 'alta',
    imageUrl: rawData.imageUrl?.trim() || '',
    imagePosition: rawData.imagePosition?.trim() || 'center',
    imageFit: rawData.imageFit?.trim() || 'cover',
    url: rawData.url?.trim() || '',
    store: rawData.store?.trim() || '',
    description: rawData.description?.trim() || '',
    dream: rawData.dream?.trim() || '',
    story: rawData.story?.trim() || '',
    meanings: parseList(rawData.meanings),
    sizes: parseList(rawData.sizes),
    notes: parseList(rawData.notes),
    quantityDesired: parsedQtyDesired,
    quantityReceived: parsedQtyReceived,
    enabled: isEnabled,
    published: isEnabled,
    visible: isEnabled,
    updatedAt: serverTimestamp(),
  };

  if (!isEditing) {
    payload.id = productId;
    payload.createdAt = serverTimestamp();
    await setDoc(productRef, payload);
  } else {
    await updateDoc(productRef, payload);
  }

  return productId;
}

/**
 * Alterna de forma rápida o status de habilitação (visibilidade no site) de um presente.
 */
export async function toggleProductEnabled(productId, currentEnabled) {
  if (!productId) throw new Error('ID do produto não informado.');
  const newStatus = !currentEnabled;
  const productRef = doc(db, 'products', productId);
  await updateDoc(productRef, {
    enabled: newStatus,
    published: newStatus,
    visible: newStatus,
    updatedAt: serverTimestamp(),
  });
  return newStatus;
}

/**
 * Exclui um produto do Firestore e limpa reservas atreladas.
 * @param {string} productId - ID do produto a ser excluído.
 */
export async function deleteProduct(productId) {
  if (!productId) throw new Error('ID do produto não informado.');

  // Remove o produto do catálogo principal
  const productRef = doc(db, 'products', productId);
  await deleteDoc(productRef);

  // Limpa possíveis reservas associadas para manter consistência
  try {
    await Promise.all([
      deleteDoc(doc(db, 'publicReservations', productId)),
      deleteDoc(doc(db, 'privateReservations', productId)),
    ]);
  } catch (err) {
    console.warn('Aviso: Não foi possível limpar registros de reserva atrelados:', err);
  }
}

/**
 * Altera em lote a visibilidade (habilitado/desabilitado) dos produtos fornecidos no Cloud Firestore.
 * Divide em batches de até 400 documentos para respeitar com folga o limite de 500 do Firestore.
 * @param {Array<Object>} products - Lista de produtos para atualizar.
 * @param {boolean} targetStatus - true para habilitar na vitrine, false para desabilitar/ocultar.
 * @returns {Promise<number>} - Quantidade de produtos atualizados com sucesso.
 */
export async function batchUpdateProductsVisibility(products = [], targetStatus = true) {
  if (!Array.isArray(products) || products.length === 0) return 0;

  const BATCH_SIZE = 400;
  let updatedCount = 0;

  for (let start = 0; start < products.length; start += BATCH_SIZE) {
    const chunk = products.slice(start, start + BATCH_SIZE);
    const batch = writeBatch(db);

    chunk.forEach(prod => {
      if (!prod.id) return;
      const productRef = doc(db, 'products', prod.id);
      batch.update(productRef, {
        enabled: targetStatus,
        published: targetStatus,
        visible: targetStatus,
        updatedAt: serverTimestamp(),
      });
      updatedCount += 1;
    });

    await batch.commit();
  }

  return updatedCount;
}
