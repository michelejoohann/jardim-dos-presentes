import { signInWithEmailAndPassword } from 'firebase/auth';
import { writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../src/firebase/config.js';
import fs from 'fs';

const stagedProducts = JSON.parse(fs.readFileSync('data/stagedProductsForFirestore.json', 'utf-8'));
const [,, email, password] = process.argv;

if (!email || !password) {
  console.log('Uso: node scripts/publishToFirestore.mjs <seu-email-admin> <sua-senha-admin>');
  process.exit(1);
}

const ADMIN_UID = '7G4v3hEMtaVzI8MUDsXjVCNXGJz1';

async function run() {
  console.log(`🔐 Autenticando com ${email}...`);
  const cred = await signInWithEmailAndPassword(auth, email, password);
  
  if (cred.user.uid !== ADMIN_UID) {
    console.error(`❌ O UID autenticado (${cred.user.uid}) não coincide com o UID admin (${ADMIN_UID}).`);
    process.exit(1);
  }
  
  console.log(`✅ Administradora autenticada com sucesso! UID: ${cred.user.uid}`);
  console.log(`🚀 Publicando ${stagedProducts.length} produtos no Firestore...`);

  const BATCH_SIZE = 400;
  let count = 0;

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
    count += chunk.length;
    console.log(`📦 Lote gravado: ${count}/${stagedProducts.length}`);
  }

  console.log(`🎉 Sucesso total! Todos os ${count} produtos foram publicados diretamente no Firestore!`);
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Falha na publicação:', err);
  process.exit(1);
});
