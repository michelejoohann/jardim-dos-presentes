import fs from 'fs';

export function getStagedProducts() {
  const content = fs.readFileSync('docs/STAGING_LIST.md', 'utf-8');
  const sections = content.split(/^##\s+/m).slice(1);
  const products = [];

  for (const section of sections) {
    const lines = section.trim().split('\n');
    const header = lines[0];
    const matchHeader = header.match(/^(\d+)\.\s*(.*?)(?:\s*—\s*(.*))?$/);
    if (!matchHeader) continue;

    const itemNum = parseInt(matchHeader[1], 10);
    const title = matchHeader[2].trim();
    const brand = (matchHeader[3] || 'SHEIN').trim();

    const linkMatch = section.match(/\[(?:Ver na SHEIN|Link)\]\((https:\/\/[^\s\)]+)\)/i);
    const url = linkMatch ? linkMatch[1] : '';

    const catMatch = section.match(/\(`([a-z0-9-]+)`\s*(?:\/\s*`([a-z0-9-]+)`)?\)/i);
    const category = catMatch ? catMatch[1] : 'moda';
    const subcategory = catMatch && catMatch[2] ? catMatch[2] : 'acessorios';

    const colMatch = section.match(/\*\*(?:Coleção|Ambiente):\*\*\s*(.+)/i);
    const collection = colMatch ? colMatch[1].trim() : 'Estilo & Acessórios';

    const iconMatch = section.match(/Ícone \/ Visual:\*\*\s*([^\n\r]+)/i);
    const icon = iconMatch ? iconMatch[1].trim() : '✨';

    const descMatch = section.match(/Detalhe:\*\*\s*([^\n\r]+)/i) || section.match(/Detalhe:\s*([^\n\r]+)/i);
    const detail = descMatch ? descMatch[1].trim() : title;

    // Individual variant handling
    if (itemNum === 0) {
      products.push({
        id: 'oculos-flame-y2k-violeta',
        name: 'Óculos Sem Armação Flame Y2K com Cristais — Violeta',
        description: 'Óculos estilo Y2K sem aro com lentes em formato de chamas na cor violeta, ponte e hastes metálicas prateadas e aplicação delicada de cristais/strass brilhantes no contorno do fogo.',
        category, subcategory, collection, icon: '🕶️', brand: 'SHEIN', store: 'SHEIN',
        color: 'Violeta', quantityDesired: 1, quantityReceived: 0, price: null, priceLabel: 'Consultar na SHEIN',
        imageUrl: '/images/oculos-flame-violeta.jpg', url, status: 'available', published: true,
        priority: 'alta', visible: true,
        story: 'Um acessório marcante e vibrante para expressar criatividade e estilo.',
        dream: 'Compor produções estéticas cheias de personalidade e brilho.',
        meanings: ['Estilo', 'Criatividade', 'Y2K', 'Ousadia']
      });
    } else if (itemNum === 1) {
      products.push(
        {
          id: 'suspensorio-neon-led-branco',
          name: 'Conjunto Suspensório e Cinta-Liga Neon LED DIY — Branco',
          description: 'Conjunto suspensório e cinta-liga elástica ajustável com iluminação neon LED na cor branca, inclui baterias.',
          category, subcategory, collection, icon: '⚡', brand: 'SHEIN', store: 'SHEIN',
          color: 'Branco', quantityDesired: 1, quantityReceived: 0, price: null, priceLabel: 'Consultar na SHEIN',
          imageUrl: '/images/suspensorio-neon-branco.jpg', url, status: 'available', published: true,
          priority: 'alta', visible: true,
          meanings: ['Cyberpunk', 'Festival', 'Luz', 'Celebração']
        },
        {
          id: 'suspensorio-neon-led-purpura',
          name: 'Conjunto Suspensório e Cinta-Liga Neon LED DIY — Púrpura',
          description: 'Conjunto suspensório e cinta-liga elástica ajustável com iluminação neon LED na cor púrpura/violeta, inclui baterias.',
          category, subcategory, collection, icon: '⚡', brand: 'SHEIN', store: 'SHEIN',
          color: 'Púrpura', quantityDesired: 1, quantityReceived: 0, price: null, priceLabel: 'Consultar na SHEIN',
          imageUrl: '/images/suspensorio-neon-purpura.jpg', url, status: 'available', published: true,
          priority: 'alta', visible: true,
          meanings: ['Cyberpunk', 'Festival', 'Luz', 'Celebração']
        },
        {
          id: 'suspensorio-neon-led-verde',
          name: 'Conjunto Suspensório e Cinta-Liga Neon LED DIY — Verde',
          description: 'Conjunto suspensório e cinta-liga elástica ajustável com iluminação neon LED na cor verde neon, inclui baterias.',
          category, subcategory, collection, icon: '⚡', brand: 'SHEIN', store: 'SHEIN',
          color: 'Verde', quantityDesired: 7, quantityReceived: 0, price: null, priceLabel: 'Consultar na SHEIN',
          imageUrl: '/images/suspensorio-neon-verde.jpg', url, status: 'available', published: true,
          priority: 'alta', visible: true,
          meanings: ['Cyberpunk', 'Festival', 'Luz', 'Celebração']
        }
      );
    } else if (itemNum === 2) {
      products.push(
        {
          id: 'conjunto-halter-maxi-azul-g',
          name: 'Conjunto Cropped Halter & Saia Longa Drapeada — Azul (G)',
          description: 'Conjunto 2 peças elegante com cropped halter tie-dye e saia maxi longa drapeada com fenda fluida.',
          category, subcategory, collection, icon: '👗', brand: 'SHEIN', store: 'SHEIN',
          color: 'Azul', size: 'G', quantityDesired: 1, quantityReceived: 0, price: null, priceLabel: 'Consultar na SHEIN',
          imageUrl: '/images/conjunto-halter-maxi-azul.jpg', url, status: 'available', published: true,
          priority: 'alta', visible: true, meanings: ['Verão', 'Elegância', 'Fluidez']
        },
        {
          id: 'conjunto-halter-maxi-branco-g',
          name: 'Conjunto Cropped Halter & Saia Longa Drapeada — Branco (G)',
          description: 'Conjunto 2 peças elegante com cropped halter e saia maxi longa drapeada na cor branca.',
          category, subcategory, collection, icon: '👗', brand: 'SHEIN', store: 'SHEIN',
          color: 'Branco', size: 'G', quantityDesired: 1, quantityReceived: 0, price: null, priceLabel: 'Consultar na SHEIN',
          imageUrl: '/images/conjunto-halter-maxi-branco.jpg', url, status: 'available', published: true,
          priority: 'alta', visible: true, meanings: ['Verão', 'Elegância', 'Pureza']
        }
      );
    } else if (itemNum === 5) {
      products.push(
        {
          id: 'asas-fada-organza-brancas',
          name: 'Asas de Fada / Borboleta em Organza Translúcida — Branca',
          description: 'Asas de fada em organza iridescente translúcida que reflete tons mágicos na luz, modelo adulto.',
          category, subcategory, collection, icon: '🧚‍♀️', brand: 'SHEIN', store: 'SHEIN',
          color: 'Branca', quantityDesired: 1, quantityReceived: 0, price: null, priceLabel: 'Consultar na SHEIN',
          imageUrl: '/images/asas-fada-organza-brancas.jpg', url, status: 'available', published: true,
          priority: 'alta', visible: true, meanings: ['Fada', 'Fantasia', 'Magia']
        },
        {
          id: 'asas-fada-organza-verde',
          name: 'Asas de Fada / Borboleta em Organza Translúcida — Verde',
          description: 'Asas de fada em organza translúcida em tom verde musgo / floresta encantada.',
          category, subcategory, collection, icon: '🧚‍♀️', brand: 'SHEIN', store: 'SHEIN',
          color: 'Verde', quantityDesired: 1, quantityReceived: 0, price: null, priceLabel: 'Consultar na SHEIN',
          imageUrl: '/images/asas-fada-organza-verde.jpg', url, status: 'available', published: true,
          priority: 'alta', visible: true, meanings: ['Fada', 'Natureza', 'Magia']
        },
        {
          id: 'asas-fada-organza-pretas',
          name: 'Asas de Fada / Borboleta em Organza Translúcida — Preta',
          description: 'Asas de fada em organza escura translúcida para estética dark fairy / mística.',
          category, subcategory, collection, icon: '🧚‍♀️', brand: 'SHEIN', store: 'SHEIN',
          color: 'Preta', quantityDesired: 1, quantityReceived: 0, price: null, priceLabel: 'Consultar na SHEIN',
          imageUrl: '/images/asas-fada-organza-pretas.jpg', url, status: 'available', published: true,
          priority: 'alta', visible: true, meanings: ['Dark Fairy', 'Misticismo', 'Magia']
        }
      );
    } else if (itemNum === 43) {
      products.push(
        {
          id: 'sheglam-lip-tint-baby-face',
          name: 'Lip Tint Take A Hint — SHEGLAM (Baby Face)',
          description: 'Lip tint de longa duração que reage ao pH dos lábios proporcionando um tom rosado natural e hidratante.',
          category, subcategory, collection, icon: '💄', brand: 'SHEGLAM', store: 'SHEIN',
          color: 'Baby Face', quantityDesired: 1, quantityReceived: 0, price: null, priceLabel: 'Consultar na SHEIN',
          url, status: 'available', published: true, priority: 'alta', visible: true,
          meanings: ['Beleza', 'Autocuidado', 'Maquiagem']
        },
        {
          id: 'sheglam-lip-tint-memories',
          name: 'Lip Tint Take A Hint — SHEGLAM (Memories)',
          description: 'Lip tint de longa duração com tonalidade suave e acabamento natural hidratante.',
          category, subcategory, collection, icon: '💄', brand: 'SHEGLAM', store: 'SHEIN',
          color: 'Memories', quantityDesired: 1, quantityReceived: 0, price: null, priceLabel: 'Consultar na SHEIN',
          url, status: 'available', published: true, priority: 'alta', visible: true,
          meanings: ['Beleza', 'Autocuidado', 'Maquiagem']
        },
        {
          id: 'sheglam-lip-tint-mocha-loca',
          name: 'Lip Tint Take A Hint — SHEGLAM (Mocha Loca)',
          description: 'Lip tint de longa duração em tom terroso suave mocha sofisticado.',
          category, subcategory, collection, icon: '💄', brand: 'SHEGLAM', store: 'SHEIN',
          color: 'Mocha Loca', quantityDesired: 1, quantityReceived: 0, price: null, priceLabel: 'Consultar na SHEIN',
          url, status: 'available', published: true, priority: 'alta', visible: true,
          meanings: ['Beleza', 'Autocuidado', 'Maquiagem']
        }
      );
    } else if (itemNum === 51) {
      products.push(
        {
          id: 'oculos-nuvem-raios-y2k-degrade',
          name: 'Óculos Sem Aro Nuvem e Raios Y2K — Degradê',
          description: 'Óculos sem aro em formato de nuvem com pingentes pendurados de raios relâmpago metálicos e correntinha no tom degradê.',
          category, subcategory, collection, icon: '☁️⚡', brand: 'SHEIN', store: 'SHEIN',
          color: 'Degradê', quantityDesired: 1, quantityReceived: 0, price: null, priceLabel: 'Consultar na SHEIN',
          url, status: 'available', published: true, priority: 'alta', visible: true,
          meanings: ['Y2K', 'Estilo', 'Nuvem', 'Fantasia']
        },
        {
          id: 'oculos-nuvem-raios-y2k-preto',
          name: 'Óculos Sem Aro Nuvem e Raios Y2K — Preto',
          description: 'Óculos sem aro em formato de nuvem com pingentes pendurados de raios relâmpago metálicos e correntinha no tom fumê preto.',
          category, subcategory, collection, icon: '☁️⚡', brand: 'SHEIN', store: 'SHEIN',
          color: 'Preto', quantityDesired: 1, quantityReceived: 0, price: null, priceLabel: 'Consultar na SHEIN',
          url, status: 'available', published: true, priority: 'alta', visible: true,
          meanings: ['Y2K', 'Estilo', 'Nuvem', 'Fantasia']
        }
      );
    } else if (itemNum === 52) {
      ['Rosa chiclete', 'Roxo', 'Prata', 'Vermelho'].forEach(cor => {
        const slugColor = cor.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-');
        products.push({
          id: `relogio-floral-cravejado-${slugColor}`,
          name: `Relógio Feminino Quartzo Floral Cravejado — ${cor}`,
          description: `Relógio feminino de quartzo com aro cravejado de detalhes florais coloridos e mostrador redondo na cor ${cor}.`,
          category, subcategory, collection, icon: '⌚🌸', brand: 'SHEIN', store: 'SHEIN',
          color: cor, quantityDesired: 1, quantityReceived: 0, price: null, priceLabel: 'Consultar na SHEIN',
          url, status: 'available', published: true, priority: 'alta', visible: true,
          meanings: ['Flores', 'Relógio', 'Romantismo', 'Elegância']
        });
      });
    } else if (itemNum === 56) {
      products.push(
        {
          id: 'brincos-elficos-borboleta-ouro-antigo',
          name: 'Brincos Ganchos Élficos de Borboleta — Ouro Antigo (1 par)',
          description: 'Brincos esculturais no formato de asas de borboleta e orelha de elfo em acabamento metálico ouro antigo.',
          category, subcategory, collection, icon: '🧝‍♀️🦋', brand: 'SHEIN', store: 'SHEIN',
          color: 'Ouro Antigo', quantityDesired: 1, quantityReceived: 0, price: null, priceLabel: 'Consultar na SHEIN',
          url, status: 'available', published: true, priority: 'alta', visible: true,
          meanings: ['Elfo', 'Fada', 'Fantasia', 'Joias']
        },
        {
          id: 'brincos-elficos-borboleta-prata-antigo',
          name: 'Brincos Ganchos Élficos de Borboleta — Prata Antigo (1 par)',
          description: 'Brincos esculturais no formato de asas de borboleta e orelha de elfo em acabamento metálico prata antigo.',
          category, subcategory, collection, icon: '🧝‍♀️🦋', brand: 'SHEIN', store: 'SHEIN',
          color: 'Prata Antigo', quantityDesired: 1, quantityReceived: 0, price: null, priceLabel: 'Consultar na SHEIN',
          url, status: 'available', published: true, priority: 'alta', visible: true,
          meanings: ['Elfo', 'Fada', 'Fantasia', 'Joias']
        }
      );
    } else {
      // General item
      const id = title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      
      // Quantidade
      let qty = 1;
      const qtyMatch = section.match(/Quantidade(?: desejada)?:\*\*\s*(\d+)/i);
      if (qtyMatch) qty = parseInt(qtyMatch[1], 10);

      // Cor
      let color = null;
      const colorMatch = section.match(/\bCor:\*\*\s*([^\n\r]+)/i);
      if (colorMatch) color = colorMatch[1].trim();

      // Tamanho
      let size = null;
      const sizeMatch = section.match(/\bTamanho:\*\*\s*([^\n\r]+)/i);
      if (sizeMatch) size = sizeMatch[1].trim();

      // Image
      let imageUrl = null;
      const imgMatch = section.match(/Imagem(?:\s*salva)?:\s*`?(\/images\/[^\s`\n]+)`?/i);
      if (imgMatch) imageUrl = imgMatch[1];

      products.push({
        id: `shein-${id}`,
        name: title,
        description: detail,
        category,
        subcategory,
        collection,
        icon,
        brand,
        store: 'SHEIN',
        color,
        size,
        quantityDesired: qty,
        quantityReceived: 0,
        price: null,
        priceLabel: 'Consultar na SHEIN',
        imageUrl,
        url,
        status: 'available',
        published: true,
        priority: 'media',
        visible: true,
        meanings: [collection, brand]
      });
    }
  }

  return products;
}

const list = getStagedProducts();
fs.writeFileSync('data/stagedProductsForFirestore.json', JSON.stringify(list, null, 2), 'utf-8');
console.log(`Gerado data/stagedProductsForFirestore.json com ${list.length} produtos formatados.`);
