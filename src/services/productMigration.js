import { writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config.js';
import { officialGardenProducts } from '../data/officialCatalog.js';
import { gocaseProducts } from '../data/gocaseProducts.js';

/**
 * Single source used by the initial catalog migration.
 * Every product exposed by the application must be included here.
 */
export const migrationCatalog = [
  ...officialGardenProducts,
  ...gocaseProducts,
];

// Firestore limits a single write batch to 500 operations. Keep a safety
// margin so future metadata writes can be added without reaching the limit.
const MIGRATION_BATCH_SIZE = 400;

export async function migrateCatalogToFirestore() {
  const uniqueProducts = Array.from(
    new Map(migrationCatalog.map(product => [product.id, product])).values()
  );

  let migratedCount = 0;

  for (let start = 0; start < uniqueProducts.length; start += MIGRATION_BATCH_SIZE) {
    const productsBatch = uniqueProducts.slice(start, start + MIGRATION_BATCH_SIZE);
    const batch = writeBatch(db);

    productsBatch.forEach((product, index) => {
      const reference = doc(db, 'products', product.id);
      batch.set(reference, {
        ...product,
        order: start + index,
        migratedFrom: 'catalog-v2.4',
        updatedAt: serverTimestamp(),
      }, { merge: true });
    });

    await batch.commit();
    migratedCount += productsBatch.length;
  }

  return migratedCount;
}
