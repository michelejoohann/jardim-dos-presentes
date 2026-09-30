import { writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config.js';
import stagedProducts from '../../data/stagedProductsForFirestore.json';

const BATCH_SIZE = 400;

export async function publishStagedProductsToFirestore() {
  let publishedCount = 0;

  for (let start = 0; start < stagedProducts.length; start += BATCH_SIZE) {
    const chunk = stagedProducts.slice(start, start + BATCH_SIZE);
    const batch = writeBatch(db);

    chunk.forEach((product, index) => {
      const reference = doc(db, 'products', product.id);
      batch.set(reference, {
        ...product,
        order: 1000 + start + index,
        migratedFrom: 'shein-staging-v1',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });
    });

    await batch.commit();
    publishedCount += chunk.length;
  }

  return publishedCount;
}
