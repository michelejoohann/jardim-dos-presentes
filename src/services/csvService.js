/**
 * Serviço de importação, exportação e geração de templates Excel / CSV
 * para o catálogo de presentes do Jardim dos Presentes de Michèlé Joohann.
 */

// Colunas oficiais do template com identificadores normalizados e descrições
export const CSV_COLUMNS = [
  { key: 'id', header: 'ID (Opcional - deixe vazio para novo presente)' },
  { key: 'name', header: 'Nome do Presente *' },
  { key: 'category', header: 'Categoria (casa, tecnologia, moda, calcados, beleza, joias, livros, arte, jardim, pets)' },
  { key: 'collection', header: 'Coleção' },
  { key: 'subcategory', header: 'Subcategoria / Ambiente' },
  { key: 'price', header: 'Valor (Ex: 159,90)' },
  { key: 'priceLabel', header: 'Texto do Preço (Ex: R$ 159,90)' },
  { key: 'priority', header: 'Prioridade (alta, media, baixa)' },
  { key: 'quantityDesired', header: 'Quantidade Desejada' },
  { key: 'url', header: 'Link da Loja / Compra' },
  { key: 'store', header: 'Nome da Loja' },
  { key: 'imageUrl', header: 'URL da Imagem' },
  { key: 'imagePosition', header: 'Enquadramento da Foto (center, top, bottom, left, right)' },
  { key: 'imageFit', header: 'Modo da Imagem (cover ou contain)' },
  { key: 'dream', header: 'O Sonho' },
  { key: 'story', header: 'A História' },
  { key: 'description', header: 'Descrição' },
  { key: 'meanings', header: 'Significados (separados por vírgula)' },
  { key: 'sizes', header: 'Tamanhos (separados por vírgula)' },
  { key: 'notes', header: 'Observações (separadas por vírgula)' },
  { key: 'enabled', header: 'Visível no Site? (sim ou nao)' },
];

/**
 * Escapa uma célula individual para o formato RFC 4180 CSV
 */
function escapeCsvCell(value, delimiter = ';') {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(delimiter) || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Dispara o download de um arquivo gerado no navegador
 */
export function downloadFile(content, filename, mimeType = 'text/csv;charset=utf-8;') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/**
 * Gera o conteúdo do template padrão CSV com exemplos pré-preenchidos e UTF-8 BOM
 */
export function generateCsvTemplate() {
  const delimiter = ';';
  const headers = CSV_COLUMNS.map(col => escapeCsvCell(col.header, delimiter)).join(delimiter);

  // Exemplos ilustrativos práticos
  const exampleRows = [
    [
      '', // ID vazio para criar novo item
      'Cafeteira Nespresso Vertuo Pop Branca',
      'casa',
      'Cantinho do Café',
      'Cozinha & Café',
      '489,90',
      'R$ 489,90',
      'alta',
      '1',
      'https://www.amazon.com.br/dp/B0BY2R5Y4Z',
      'Amazon',
      'https://m.media-amazon.com/images/I/61pmF5YFmQL._AC_SX679_.jpg',
      'center',
      'cover',
      'Começar manhãs ensolaradas com o aroma de um café acolhedor.',
      'Sempre tive o carinho de receber amigos com um cafezinho fresco com espuma cremosa.',
      'Cafeteira automática Nespresso Vertuo Pop compacta e elegante.',
      'Café, Conforto, Energia, Manhãs',
      '110V',
      'Cor branca preferencial',
      'sim',
    ],
    [
      '', // ID vazio
      'Sapato Oxford Couro Marrom Salto Bloco',
      'calcados',
      'Estilo & Romantismo',
      'Calçados Botânicos',
      '299,00',
      'R$ 299,00',
      'media',
      '1',
      'https://www.schutz.com.br',
      'Schutz',
      'https://secure-static.schutz.com.br/medias/oxford.jpg',
      'top',
      'cover',
      'Caminhar com elegância clássica nos passeios de outono.',
      'Adoro calçados atemporais com estética vintage que combinam com vestidos florais.',
      'Sapato Oxford em couro legítimo marrom vintage com solado reforçado.',
      'Estilo, Elegância, Conforto',
      '37',
      'Couro legítimo',
      'sim',
    ],
  ];

  const rows = exampleRows.map(row => row.map(cell => escapeCsvCell(cell, delimiter)).join(delimiter));

  // Inclui UTF-8 BOM (\uFEFF) para garantir abertura 100% perfeita no Excel (Windows/Mac)
  return '\uFEFF' + [headers, ...rows].join('\r\n') + '\r\n';
}

/**
 * Converte a lista de produtos atual para CSV compatível com Excel
 */
export function exportProductsToCsv(products = []) {
  const delimiter = ';';
  const headers = CSV_COLUMNS.map(col => escapeCsvCell(col.header, delimiter)).join(delimiter);

  const rows = products.map(prod => {
    const meaningsStr = Array.isArray(prod.meanings) ? prod.meanings.join(', ') : (prod.meanings || '');
    const sizesStr = Array.isArray(prod.sizes) ? prod.sizes.join(', ') : (prod.sizes || '');
    const notesStr = Array.isArray(prod.notes) ? prod.notes.join(', ') : (prod.notes || '');
    const priceFormatted = prod.price != null && !Number.isNaN(Number(prod.price))
      ? String(prod.price).replace('.', ',')
      : '';
    const isEnabledStr = prod.enabled !== false && prod.published !== false && prod.visible !== false ? 'sim' : 'nao';

    const values = [
      prod.id || '',
      prod.name || '',
      prod.category || 'casa',
      prod.collection || '',
      prod.subcategory || '',
      priceFormatted,
      prod.priceLabel || '',
      prod.priority || 'media',
      prod.quantityDesired || '1',
      prod.url || '',
      prod.store || '',
      prod.imageUrl || prod.image || '',
      prod.imagePosition || 'center',
      prod.imageFit || 'cover',
      prod.dream || '',
      prod.story || '',
      prod.description || '',
      meaningsStr,
      sizesStr,
      notesStr,
      isEnabledStr,
    ];

    return values.map(val => escapeCsvCell(val, delimiter)).join(delimiter);
  });

  return '\uFEFF' + [headers, ...rows].join('\r\n') + '\r\n';
}

/**
 * Parser RFC 4180 robusto para CSV que lida com aspas, quebras de linha e delimitadores
 */
export function parseCsvTextToRows(csvText) {
  if (!csvText) return [];

  // Remove UTF-8 BOM se presente
  const cleanText = csvText.replace(/^\uFEFF/, '');

  // Detecta o delimitador na primeira linha (; ou , ou \t)
  const firstLine = cleanText.split(/\r?\n/)[0] || '';
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;

  let delimiter = ';';
  if (commaCount > semicolonCount && commaCount > tabCount) delimiter = ',';
  else if (tabCount > semicolonCount && tabCount > commaCount) delimiter = '\t';

  const rows = [];
  let currentRow = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++; // Pula a aspa escapada
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === delimiter && !insideQuotes) {
      currentRow.push(currentField);
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // Pula \n de \r\n
      }
      currentRow.push(currentField);
      currentField = '';
      if (currentRow.some(cell => cell.trim() !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
    } else {
      currentField += char;
    }
  }

  if (currentField !== '' || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.some(cell => cell.trim() !== '')) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Normaliza o cabeçalho para facilitar o casamento flexível
 */
function normalizeHeaderName(headerStr) {
  return String(headerStr || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Mapa de sinonímias aceitas para cada campo do produto
 */
const HEADER_KEY_MAP = {
  id: ['id', 'identificador', 'codigo'],
  name: ['nome', 'nomedopresente', 'name', 'titulo', 'item', 'presente', 'produto'],
  category: ['categoria', 'category', 'categoriabotanica'],
  collection: ['colecao', 'collection', 'colecaotematica', 'jardimtematico'],
  subcategory: ['subcategoria', 'subcategory', 'jardim', 'ambiente', 'espaco'],
  price: ['preco', 'price', 'valor', 'valornumerico', 'valoremreais'],
  priceLabel: ['texto_do_preco', 'precolabel', 'pricelabel', 'textodovalor', 'valorexibido', 'precodeexibicao'],
  priority: ['prioridade', 'priority', 'nivelprioridade'],
  quantityDesired: ['quantidadedesejada', 'quantitydesired', 'quantidade', 'qtd', 'qtddesejada'],
  url: ['linkdaloja', 'linkdecompra', 'link', 'url', 'urldaloja', 'sitedaloja'],
  store: ['loja', 'store', 'nomedaloja'],
  imageUrl: ['urldaimagem', 'imageurl', 'imagem', 'foto', 'linkdafoto', 'linkdaimagem', 'image'],
  imagePosition: ['enquadramento', 'imageposition', 'pontofocal', 'alinhamento', 'focodafoto'],
  imageFit: ['mododaimagem', 'imagefit', 'ajustedaimagem', 'preenchimento', 'proporcao'],
  dream: ['osonho', 'sonho', 'dream'],
  story: ['ahistoria', 'historia', 'story'],
  description: ['descricao', 'description', 'detalhes'],
  meanings: ['significados', 'meanings', 'tags', 'palavraschave'],
  sizes: ['tamanhos', 'sizes', 'tamanho', 'medidas', 'voltagem'],
  notes: ['observacoes', 'observacao', 'notas', 'notes'],
  enabled: ['visivelnosite', 'enabled', 'visivel', 'habilitado', 'ativo', 'publicado'],
};

/**
 * Converte o texto bruto do CSV nos objetos de presente prontos para salvar no Firestore
 */
export function parseCsvToProducts(csvText) {
  const rows = parseCsvTextToRows(csvText);
  if (rows.length < 2) {
    throw new Error('A planilha está vazia ou não contém linhas de dados.');
  }

  const rawHeaders = rows[0];
  const headerIndices = {};

  rawHeaders.forEach((rawH, idx) => {
    // Remove textos entre parênteses e caracteres como * para focar no nome da coluna
    const cleanHeader = String(rawH || '').replace(/\(.*?\)/g, '').replace(/[*_]/g, '').trim();
    const normalized = normalizeHeaderName(cleanHeader);

    for (const [key, aliases] of Object.entries(HEADER_KEY_MAP)) {
      const match = aliases.some(alias => {
        const normAlias = normalizeHeaderName(alias);
        return normalized === normAlias || normalized.startsWith(normAlias);
      });

      if (match && headerIndices[key] === undefined) {
        headerIndices[key] = idx;
      }
    }
  });

  if (headerIndices.name === undefined) {
    throw new Error('Coluna de "Nome do Presente" não foi encontrada no cabeçalho da planilha.');
  }

  const parseList = val => {
    if (!val) return [];
    return String(val)
      .split(/[,;]/)
      .map(item => item.trim())
      .filter(Boolean);
  };

  const parsePrice = val => {
    if (val === null || val === undefined || val === '') return null;
    const cleanStr = String(val)
      .replace(/[R$\s]/g, '')
      .replace(/\.(?=\d{3})/g, '') // remove pontos de milhar (ex: 1.250,00)
      .replace(',', '.'); // troca vírgula decimal por ponto
    const num = parseFloat(cleanStr);
    return Number.isNaN(num) ? null : num;
  };

  const parseBoolean = val => {
    if (val === null || val === undefined || val === '') return true;
    const str = String(val).trim().toLowerCase();
    if (['nao', 'não', 'false', '0', 'desabilitado', 'oculto', 'n'].includes(str)) return false;
    return true;
  };

  const products = [];
  const errors = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const getVal = key => {
      const idx = headerIndices[key];
      return idx !== undefined && row[idx] !== undefined ? row[idx].trim() : '';
    };

    const name = getVal('name');
    if (!name) {
      continue;
    }

    const priceNum = parsePrice(getVal('price'));
    const isEnabled = parseBoolean(getVal('enabled'));

    // Geração do ID estável se não fornecido
    const existingId = getVal('id');
    const baseSlug = String(name)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 45);

    const id = existingId || `${baseSlug}-${r}`;

    const productPayload = {
      id,
      name,
      category: getVal('category') || 'casa',
      collection: getVal('collection') || '',
      subcategory: getVal('subcategory') || '',
      price: priceNum,
      priceLabel: getVal('priceLabel') || (priceNum !== null ? `R$ ${priceNum.toFixed(2).replace('.', ',')}` : ''),
      priority: getVal('priority')?.toLowerCase() || 'media',
      quantityDesired: parseInt(getVal('quantityDesired'), 10) || 1,
      quantityReceived: 0,
      url: getVal('url') || '',
      store: getVal('store') || '',
      imageUrl: getVal('imageUrl') || '',
      imagePosition: getVal('imagePosition') || 'center',
      imageFit: getVal('imageFit') || 'cover',
      dream: getVal('dream') || '',
      story: getVal('story') || '',
      description: getVal('description') || '',
      meanings: parseList(getVal('meanings')),
      sizes: parseList(getVal('sizes')),
      notes: parseList(getVal('notes')),
      enabled: isEnabled,
      published: isEnabled,
      visible: isEnabled,
    };

    products.push(productPayload);
  }

  if (products.length === 0) {
    throw new Error('Nenhum presente válido com nome foi encontrado na planilha.');
  }

  return { products, errors };
}
