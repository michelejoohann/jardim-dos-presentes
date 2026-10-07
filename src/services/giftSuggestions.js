/**
 * Serviço de geração inteligente de sugestões acolhedoras para presentes.
 * Com base no nome e palavras-chave do produto, sugere:
 * - Categoria correta (moda, joias, casa, tecnologia, livros, arte, jardim, pets)
 * - Subcategoria / Jardim específico
 * - Coleção especial
 * - Nível de prioridade recomendado com justificativa
 * - Descrição acolhedora
 * - 🌱 O Sonho (visão inspiradora do presente)
 * - 📖 A História (memória / significado)
 * - Tags de significado
 */

/**
 * Normaliza string removendo acentos e convertendo para minúsculas.
 */
function normalizeText(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Verifica se o nome do presente contém a palavra-chave.
 * Para palavras de 4 letras ou menos (ex: "saia", "top", "anel", "cão", "bule", "bota"),
 * utiliza correspondência com limites de palavra para evitar falsos positivos
 * (como "top" dentro de "laptop" ou "anel" dentro de "painel").
 */
function containsKeyword(normalizedName, normalizedKw) {
  if (!normalizedName || !normalizedKw) return false;

  if (normalizedKw.length <= 4) {
    const escaped = normalizedKw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?:^|[^a-z0-9])${escaped}(?:$|[^a-z0-9])`, 'i');
    return regex.test(normalizedName);
  }

  return normalizedName.includes(normalizedKw);
}

const KEYWORD_MAP = [
  // 1. VESTUÁRIO & MODA (BLUSAS, SAIAS, VESTIDOS, CASACOS, CALÇADOS, ETC.)
  {
    keywords: [
      'blusa', 'blusas', 'saia', 'saias', 'minissaia', 'saia midi', 'saia longa',
      'vestido', 'vestidos', 'vestidinho',
      'camisa', 'camisas', 'camiseta', 'camisetas', 't-shirt', 'tshirt', 'regata', 'cropped', 'top', 'body', 'camisete', 'polo',
      'calça', 'calças', 'jeans', 'pantalona', 'pantacourt', 'legging', 'alfaiataria', 'jogger', 'cargo',
      'short', 'shorts', 'bermuda', 'bermudas',
      'macacão', 'macaquinho', 'jardineira', 'salopete', 'conjunto',
      'casaco', 'casacos', 'jaqueta', 'jaquetas', 'blazer', 'cardigan', 'tricot', 'tricô', 'suéter', 'pulôver', 'moletom', 'sobretudo', 'trench coat', 'quimono', 'kimono', 'colete', 'poncho', 'parka',
      'bota', 'botas', 'coturno', 'coturnos', 'sapato', 'sapatos', 'sandália', 'sandálias', 'rasteira', 'rasteirinha', 'chinelo', 'pantufa', 'salto', 'salto alto', 'scarpin', 'mule', 'tamanco', 'tênis', 'sapatilha', 'mocassim', 'espadrille', 'anabela',
      'bolsa', 'bolsas', 'mochila', 'mochilas', 'clutch', 'carteira', 'tote bag', 'ecobag', 'necessaire',
      'cinto', 'cintos', 'luva', 'luvas', 'cachecol', 'echarpe', 'lenço', 'xale',
      'chapéu', 'chapéus', 'boina', 'boné', 'tiara', 'arquinho',
      'lingerie', 'pijama', 'pijamas', 'camisola', 'roupão de seda', 'sutiã', 'calcinha', 'meia', 'meias', 'meia-calça',
      'biquíni', 'biquini', 'maiô', 'canga', 'saída de praia',
      'celta', 'vitoriano', 'vintage', 'linho', 'seda', 'cetim', 'veludo', 'renda', 'organza', 'chiffon',
    ],
    category: 'moda',
    subcategory: 'Guarda-Roupa & Estilo',
    collection: 'Elegância & Delicadeza',
    priority: 'alta',
    priorityReason: 'Peça de estilo e expressão pessoal escolhida para vestir momentos especiais e elevar a autoestima.',
    description: (name) => `${name} de estilo delicado e atemporal para compor looks únicos e expressar elegância no dia a dia.`,
    dream: 'Celebrar a beleza, a autoestima e os momentos marcantes vestindo peças que carregam carinho e história.',
    story: 'Uma peça escolhida com carinho para marcar ocasiões inesquecíveis e vestir a nossa melhor versão.',
    meanings: ['Autoestima', 'Elegância', 'Beleza', 'Expressão'],
  },

  // 2. JOIAS & PRECIOSIDADES
  {
    keywords: [
      'joia', 'jóia', 'joias', 'jóias', 'semijoia', 'semijóia', 'semijoias', 'bijuteria',
      'anel', 'anéis', 'aliança', 'solitário',
      'brinco', 'brincos', 'argola', 'argolas', 'ear cuff', 'earcuff', 'piercing',
      'colar', 'colares', 'choker', 'gargantilha', 'corrente', 'pingente', 'escapulário', 'medalha', 'medalhão',
      'pulseira', 'pulseiras', 'bracelete', 'braceletes', 'tornozeleira',
      'relógio', 'relogio', 'relógios',
      'prata', 'prata 925', 'ouro', 'ouro 18k', 'ouro branco', 'ouro rosé', 'platina',
      'pérola', 'pérolas', 'esmeralda', 'rubi', 'safira', 'diamante', 'zircônia', 'ametista', 'turmalina', 'topázio',
    ],
    category: 'joias',
    subcategory: 'Porta-Joias & Preciosidades',
    collection: 'Brilho & Memórias',
    priority: 'media',
    priorityReason: 'Símbolo duradouro de carinho, celebração e luz para guardar no coração e usar em ocasiões especiais.',
    description: (name) => `${name} em detalhes finos para iluminar o visual e eternizar momentos inesquecíveis.`,
    dream: 'Carregar um símbolo de luz, delicadeza e beleza que atravesse o tempo com significado eterno.',
    story: 'Adornos preciosos guardam memórias queridas e se tornam parte inesquecível da nossa caminhada.',
    meanings: ['Brilho', 'Eternidade', 'Preciosidade', 'Lembrança'],
  },

  // 3. BELEZA & AUTOCUIDADO
  {
    keywords: [
      'perfume', 'colônia', 'colonia', 'body splash', 'hidratante', 'óleo corporal',
      'skincare', 'sérum', 'serum', 'maquiagem', 'batom', 'gloss', 'rímel', 'rimel',
      'paleta de sombra', 'blush', 'pincel de maquiagem', 'creme facial', 'sabonete artesanal',
      'shampoo', 'condicionador', 'máscara capilar', 'secador', 'babyliss', 'escova secadora', 'chapinha',
    ],
    category: 'moda',
    subcategory: 'Autocuidado & Beleza',
    collection: 'Rituais de Beleza',
    priority: 'media',
    priorityReason: 'Cuidados diários para nutrir o bem-estar, a autoestima e renovar as energias.',
    description: (name) => `${name} para enriquecer os rituais de autocuidado e realçar a beleza e o amor-próprio.`,
    dream: 'Reservar momentos diários de pausa para me cuidar com carinho, leveza e bem-estar.',
    story: 'O autocuidado é uma demonstração de amor e respeito à nossa própria trajetória.',
    meanings: ['Autocuidado', 'Bem-Estar', 'Beleza', 'Autoestima'],
  },

  // 4. CAFÉ & RITUAIS MATINAIS
  {
    keywords: [
      'cafeteira', 'café', 'nespresso', 'prensa francesa', 'moedor de café', 'moedor café',
      'chaleira', 'chaleira elétrica', 'bule', 'xícara', 'xicara', 'xícaras', 'caneca', 'canecas',
      'garrafa térmica', 'copo térmico',
    ],
    category: 'casa',
    subcategory: 'Cozinha',
    collection: 'Rituais do Café & Aconchego',
    priority: 'alta',
    priorityReason: 'Item diário de bem-estar que acolhe as manhãs e conecta os momentos de pausa.',
    description: (name) => `Um convite diário para desacelerar com ${name}, saborear bons momentos e começar cada manhã com aconchego e perfume de café.`,
    dream: 'Criar rituais matinais especiais e compartilhar momentos carinhosos ao redor de uma boa xícara com quem mais amamos.',
    story: 'O aroma do café quentinho é a nossa forma favorita de celebrar o dia e acolher visitas queridas com um sorriso sincero.',
    meanings: ['Aconchego', 'Hospitalidade', 'Rituais Diários', 'Paz'],
  },

  // 5. COZINHA & MESA POSTA
  {
    keywords: [
      'air fryer', 'fritadeira', 'liquidificador', 'batedeira', 'jogo de panelas', 'panela', 'panelas',
      'faqueiro', 'talher', 'talheres', 'prato', 'pratos', 'aparelho de jantar', 'taça', 'taças',
      'copo', 'copos', 'travessa', 'tábua de corte', 'tabua', 'bowl', 'assadeira', 'fogão', 'micro-ondas', 'microondas',
      'forno', 'torradeira', 'grill', 'sanduicheira', 'mixer', 'processador', 'porta tempero', 'escorredor', 'refratário',
      'toalha de mesa',
    ],
    category: 'casa',
    subcategory: 'Cozinha',
    collection: 'Banquete & Memórias',
    priority: 'alta',
    priorityReason: 'Item de culinária e alimentação essencial para o funcionamento harmônico do lar.',
    description: (name) => `${name} de alta qualidade para preparar refeições deliciosas e nutrir a família e amigos com amor.`,
    dream: 'Reunir pessoas queridas em volta da mesa farta, criando memórias que alimentam a alma e o coração.',
    story: 'Cozinhar é uma das mais puras linguagens do amor. Cada refeição preparada aqui será uma celebração da nossa união.',
    meanings: ['Nutrição', 'Partilha', 'Celebração', 'União'],
  },

  // 6. DORMITÓRIO & CONFORTO (CAMA, BANHO, DESCANSO)
  {
    keywords: [
      'saia de cama', 'jogo de cama', 'lençol', 'lençóis', 'edredom', 'cobertor', 'cobertores', 'manta', 'mantas',
      'travesseiro', 'travesseiros', 'colchão', 'cama', 'fronhas', 'fronha', 'toalha de banho', 'toalha de rosto',
      'jogo de toalhas', 'roupão de banho', 'almofada', 'almofadas', 'pillow top',
    ],
    category: 'casa',
    subcategory: 'Quarto',
    collection: 'Ninho de Aconchego',
    priority: 'alta',
    priorityReason: 'Item de repouso essencial para a saúde, bem-estar e restauração das energias.',
    description: (name) => `Toque macio e delicado de ${name} para abraçar o descanso e transformar o quarto em um santuário de serenidade.`,
    dream: 'Dormir em um abraço macio e acordar com as energias renovadas em um ninho de paz, carinho e acolhimento.',
    story: 'O descanso é sagrado. Cultivar um refúgio acolhedor transforma qualquer noite de sono em um momento de puro carinho.',
    meanings: ['Descanso', 'Acolhimento', 'Serenidade', 'Renovação'],
  },

  // 7. ILUMINAÇÃO & ATMOSFERA
  {
    keywords: [
      'luminária', 'abajur', 'arandela', 'vela aromática', 'velas aromáticas', 'vela', 'velas',
      'difusor de aromas', 'difusor', 'pendente', 'lâmpada', 'lustre', 'fita led',
    ],
    category: 'casa',
    subcategory: 'Iluminação & Atmosfera',
    collection: 'Luzes do Entardecer',
    priority: 'media',
    priorityReason: 'Traz clima relaxante, harmonia visual e conforto térmico-emocional aos ambientes.',
    description: (name) => `${name} com iluminação aconchegante para banhar os ambientes de calma após um longo dia.`,
    dream: 'Iluminar as noites com uma luz suave e acolhedora, criando uma atmosfera mágica e tranquila.',
    story: 'A luz certa tem o poder de acalmar os pensamentos e transformar momentos simples de leitura em pura poesia.',
    meanings: ['Luz', 'Tranquilidade', 'Intimidade', 'Harmonia'],
  },

  // 8. SALA, MOBILIÁRIO & DECORAÇÃO
  {
    keywords: [
      'sofá', 'poltrona', 'poltronas', 'cadeira', 'cadeiras', 'mesa de centro', 'mesa de jantar', 'mesa lateral',
      'tapete', 'tapetes', 'cortina', 'cortinas', 'espelho', 'espelhos', 'estante', 'aparador', 'buffet',
      'rack', 'painel tv', 'quadro decorativo', 'quadro', 'escultura', 'vaso decorativo', 'centro de mesa',
    ],
    category: 'casa',
    subcategory: 'Sala de Estar',
    collection: 'Refúgio Vitoriano',
    priority: 'media',
    priorityReason: 'Compõe a estética acolhedora e o conforto social do lar para receber e descansar.',
    description: (name) => `${name} selecionado para harmonizar o ambiente com um toque atemporal, acolhedor e sofisticado.`,
    dream: 'Um espaço de convivência caloroso, onde o descanso e as boas conversas encontrem o cenário perfeito.',
    story: 'Cada detalhe do nosso lar é pensado para contar uma história de harmonia, bom gosto e carinho compartilhado.',
    meanings: ['Beleza', 'Harmonia', 'Hospitalidade', 'Conforto'],
  },

  // 9. TECNOLOGIA & HOME OFFICE
  {
    keywords: [
      'workstation', 'mesa de trabalho', 'escrivaninha', 'computador', 'computadores', 'notebook', 'laptop', 'macbook',
      'monitor', 'monitores', 'teclado', 'mouse', 'mousepad', 'fone de ouvido', 'fone', 'headset', 'headphone', 'airpods',
      'alexa', 'echo dot', 'echo show', 'echo', 'kindle', 'tablet', 'ipad', 'carregador', 'power bank',
      'suporte notebook', 'impressora', 'hub usb', 'hub', 'câmera', 'webcam', 'microfone',
    ],
    category: 'tecnologia',
    subcategory: 'Escritório',
    collection: 'Escritório dos Sonhos',
    priority: 'alta',
    priorityReason: 'Item fundamental para o foco profissional, estudos e produtividade no dia a dia.',
    description: (name) => `${name} pensado para transformar a rotina de trabalho e estudos em uma experiência fluida, confortável e inspiradora.`,
    dream: 'Ter um refúgio acolhedor e funcional, onde o foco e a criatividade fluam com serenidade e os projetos se tornem realidade.',
    story: 'Mais do que uma ferramenta, representa a dedicação aos nossos passos profissionais e o amor por um espaço bem estruturado.',
    meanings: ['Foco', 'Crescimento', 'Inspiração', 'Produtividade'],
  },

  // 10. LIVROS & CULTURA
  {
    keywords: [
      'livro', 'livros', 'box de livros', 'box', 'biografia', 'romance', 'filosofia', 'bíblia', 'leitura',
      'clássico', 'edição especial', 'capa dura', 'literatura', 'poesia', 'caderno', 'planner', 'journal', 'moleskine', 'caneta tinteiro',
    ],
    category: 'livros',
    subcategory: 'Biblioteca Particular',
    collection: 'Páginas que Iluminam',
    priority: 'media',
    priorityReason: 'Alimenta o intelecto, a sensibilidade e o desenvolvimento pessoal constante.',
    description: (name) => `Uma obra preciosa para enriquecer o espírito, aguçar a imaginação e inspirar novas reflexões.`,
    dream: 'Cultivar uma biblioteca viva, repleta de memórias, conhecimento e passaportes para novas ideias.',
    story: 'Cada página lida é um diálogo com pensamentos valorosos e um tesouro que carregamos para a vida inteira.',
    meanings: ['Sabedoria', 'Inspiração', 'Memória', 'Imaginação'],
  },

  // 11. ARTE, ESPIRITUALIDADE & AROMAS
  {
    keywords: [
      'incensário', 'incenso', 'cristal', 'cristais', 'oratório', 'terço', 'tarot', 'tarô',
      'pintura', 'símbolo', 'óleo essencial', 'aroma', 'espiritualidade', 'altar', 'sino dos ventos', 'japamala', 'mandala',
    ],
    category: 'arte',
    subcategory: 'Altar & Espiritualidade',
    collection: 'Serenidade & Alma',
    priority: 'media',
    priorityReason: 'Eleva a energia dos ambientes, nutrindo a paz interior e a gratidão.',
    description: (name) => `Peça carregada de significado e sensibilidade para harmonizar e abençoar as energias do lar.`,
    dream: 'Preencher a casa com beleza, boas energias e símbolos que lembrem diariamente da gratidão e do sagrado.',
    story: 'Acreditamos que o lar deve refletir a alma e vibrar sentimentos elevados de paz, amor e equilíbrio.',
    meanings: ['Espiritualidade', 'Sensibilidade', 'Paz Interior', 'Gratidão'],
  },

  // 12. JARDIM & BOTÂNICA
  {
    keywords: [
      'planta', 'plantas', 'orquídea', 'samambaia', 'suculenta', 'suculentas', 'cacto',
      'vaso de cerâmica', 'cachepot', 'cachepô', 'regador', 'tesoura de poda', 'adubo', 'jardim', 'horta', 'flores',
      'semente', 'sementes', 'terrário',
    ],
    category: 'jardim',
    subcategory: 'Jardim Secreto',
    collection: 'Herbarium Vivo',
    priority: 'media',
    priorityReason: 'Traz o frescor da natureza para dentro de casa, cultivando paciência e vitalidade.',
    description: (name) => `Um toque verde e natural com ${name} para conectar nossa rotina aos ciclos generosos da terra.`,
    dream: 'Trazer o frescor da natureza para perto dos olhos e ver a vida florescer em cada brotinho e pétala.',
    story: 'Cultivar plantas nos ensina a respeitar o tempo, a cuidar com paciência e a colher os frutos do amor dedicado.',
    meanings: ['Vitalidade', 'Paciência', 'Vida', 'Renovação'],
  },

  // 13. PETS
  {
    keywords: [
      'cachorro', 'cão', 'gato', 'gatos', 'pet', 'pets', 'caminha pet', 'coleira', 'comedouro',
      'bebedouro pet', 'arranhador', 'brinquedo pet', 'tapete higiênico', 'ração',
    ],
    category: 'pets',
    subcategory: 'Mimos de Pet',
    collection: 'Patas & Coração',
    priority: 'media',
    priorityReason: 'Dedica carinho e conforto aos companheiros de quatro patas que trazem alegria ao lar.',
    description: (name) => `${name} pensado com muito carinho para o conforto, saúde e alegria do nosso fiel companheiro.`,
    dream: 'Proporcionar o máximo de carinho, aconchego e brincadeiras para quem enche nossa casa de amor incondicional.',
    story: 'Nossos bichinhos são parte da família. Cada gesto de cuidado com eles é um abraço no coração do nosso lar.',
    meanings: ['Amor Incondicional', 'Alegria', 'Lealdade', 'Cuidado'],
  },
];

/**
 * Fallbacks inteligentes por categoria quando o nome não coincide com nenhuma palavra-chave específica.
 * Evita que itens desconhecidos de Casa caiam arbitrariamente em Cozinha/Café.
 */
const CATEGORY_FALLBACKS = {
  moda: {
    category: 'moda',
    subcategory: 'Guarda-Roupa & Estilo',
    collection: 'Elegância & Delicadeza',
    priority: 'alta',
    priorityReason: 'Peça especial selecionada para o guarda-roupa e ocasiões marcantes.',
    description: (name) => `${name} escolhido com carinho para enriquecer o estilo pessoal com elegância e conforto.`,
    dream: 'Celebrar momentos felizes vestindo peças que expressam a minha essência.',
    story: 'Uma peça escolhida com carinho para marcar momentos especiais com autenticidade.',
    meanings: ['Elegância', 'Autoestima', 'Estilo', 'Beleza'],
  },
  joias: {
    category: 'joias',
    subcategory: 'Porta-Joias & Preciosidades',
    collection: 'Brilho & Memórias',
    priority: 'media',
    priorityReason: 'Item precioso selecionado com carinho para eternizar momentos.',
    description: (name) => `${name} de acabamento refinado para iluminar ocasiões especiais com brilho e significado.`,
    dream: 'Carregar um símbolo de delicadeza e beleza duradoura.',
    story: 'Joias especiais guardam memórias queridas que atravessam o tempo.',
    meanings: ['Brilho', 'Eternidade', 'Preciosidade', 'Memória'],
  },
  casa: {
    category: 'casa',
    subcategory: 'Decoração & Conforto',
    collection: 'Refúgio Vitoriano',
    priority: 'media',
    priorityReason: 'Item selecionado para trazer harmonia, aconchego e beleza ao lar.',
    description: (name) => `${name} escolhido para compor o nosso lar com harmonia, conforto e encanto.`,
    dream: 'Tornar nosso lar um espaço cada vez mais acolhedor, belo e cheio de vida.',
    story: 'Cada detalhe do nosso cantinho é pensado para contar uma história de paz e união.',
    meanings: ['Harmonia', 'Aconchego', 'Conforto', 'Beleza'],
  },
  tecnologia: {
    category: 'tecnologia',
    subcategory: 'Escritório & Estudos',
    collection: 'Escritório dos Sonhos',
    priority: 'alta',
    priorityReason: 'Item de tecnologia e produtividade para aprimorar os estudos e projetos.',
    description: (name) => `${name} para trazer eficiência, conforto e fluidez às atividades diárias.`,
    dream: 'Ter um espaço de trabalho e estudos moderno, ágil e inspirador.',
    story: 'Uma conquista importante para apoiar projetos, estudos e realizações.',
    meanings: ['Foco', 'Produtividade', 'Crescimento', 'Inspiração'],
  },
  livros: {
    category: 'livros',
    subcategory: 'Biblioteca Particular',
    collection: 'Páginas que Iluminam',
    priority: 'media',
    priorityReason: 'Obra especial para enriquecer a mente, a alma e a imaginação.',
    description: (name) => `${name} para enriquecer a biblioteca com sabedoria, reflexões e encanto.`,
    dream: 'Cultivar uma biblioteca repleta de memórias, inspiração e boas leituras.',
    story: 'Livros especiais são tesouros que guardamos para a vida inteira.',
    meanings: ['Sabedoria', 'Inspiração', 'Memória', 'Imaginação'],
  },
  arte: {
    category: 'arte',
    subcategory: 'Altar & Espiritualidade',
    collection: 'Serenidade & Alma',
    priority: 'media',
    priorityReason: 'Peça sensível para inspirar paz interior, gratidão e equilíbrio no lar.',
    description: (name) => `${name} carregado de beleza e sensibilidade para abençoar as energias do lar.`,
    dream: 'Viver em um espaço cercado de arte, harmonia e boas energias.',
    story: 'A arte e a espiritualidade nos conectam com o sagrado do cotidiano.',
    meanings: ['Espiritualidade', 'Paz Interior', 'Sensibilidade', 'Harmonia'],
  },
  jardim: {
    category: 'jardim',
    subcategory: 'Jardim Secreto',
    collection: 'Herbarium Vivo',
    priority: 'media',
    priorityReason: 'Elemento botânico para conectar a rotina com a natureza e o cultivo paciente.',
    description: (name) => `${name} para trazer o frescor e a vitalidade das plantas para o nosso dia a dia.`,
    dream: 'Ver a vida florescer em cada detalhe verde do nosso jardim.',
    story: 'Cultivar a natureza nos ensina a ter paciência e apreciar a beleza de cada estação.',
    meanings: ['Vitalidade', 'Natureza', 'Paciência', 'Vida'],
  },
  pets: {
    category: 'pets',
    subcategory: 'Mimos de Pet',
    collection: 'Patas & Coração',
    priority: 'media',
    priorityReason: 'Item dedicado ao bem-estar e diversão dos nossos companheiros fiéis.',
    description: (name) => `${name} escolhido com amor para o carinho, saúde e alegria do pet.`,
    dream: 'Proporcionar o melhor cuidado para quem enche o lar de amor incondicional.',
    story: 'Nossos companheiros de quatro patas tornam nossos dias muito mais felizes.',
    meanings: ['Amor Incondicional', 'Cuidado', 'Alegria', 'Lealdade'],
  },
};

/**
 * Analisa o nome do produto e retorna um conjunto completo de sugestões acolhedoras.
 * Prioriza o reconhecimento específico por palavras-chave com base na maior especificidade.
 *
 * @param {string} rawName - Nome digitado do presente.
 * @param {string} currentCategory - Categoria atualmente selecionada (opcional).
 * @returns {Object} Sugestões de categoria, prioridade, textos, sonho, história e tags.
 */
export function generateGiftSuggestions(rawName = '', currentCategory = '') {
  const name = String(rawName).trim();
  const normalizedName = normalizeText(name);

  // Procura pelo match com a palavra-chave mais específica (maior comprimento)
  let bestMatch = null;
  let bestKeywordLength = 0;

  if (normalizedName) {
    for (const entry of KEYWORD_MAP) {
      for (const kw of entry.keywords) {
        const normKw = normalizeText(kw);
        if (containsKeyword(normalizedName, normKw)) {
          if (normKw.length > bestKeywordLength) {
            bestMatch = entry;
            bestKeywordLength = normKw.length;
          }
        }
      }
    }
  }

  // Se encontrou match por palavra-chave no nome do presente
  if (bestMatch) {
    return {
      category: bestMatch.category,
      subcategory: bestMatch.subcategory,
      collection: bestMatch.collection,
      priority: bestMatch.priority,
      priorityReason: bestMatch.priorityReason,
      description: typeof bestMatch.description === 'function' ? bestMatch.description(name || 'este item') : bestMatch.description,
      dream: bestMatch.dream,
      story: bestMatch.story,
      meanings: bestMatch.meanings,
    };
  }

  // Se não houve match por palavra-chave, mas há categoria válida selecionada
  if (currentCategory && CATEGORY_FALLBACKS[currentCategory]) {
    const fallback = CATEGORY_FALLBACKS[currentCategory];
    return {
      category: fallback.category,
      subcategory: fallback.subcategory,
      collection: fallback.collection,
      priority: fallback.priority,
      priorityReason: fallback.priorityReason,
      description: typeof fallback.description === 'function' ? fallback.description(name || 'este item') : fallback.description,
      dream: fallback.dream,
      story: fallback.story,
      meanings: fallback.meanings,
    };
  }

  // Fallback geral neutro (Desejos Especiais do Jardim)
  return {
    category: 'casa',
    subcategory: 'Desejos Especiais',
    collection: 'Curadoria do Coração',
    priority: 'media',
    priorityReason: 'Item especial selecionado com carinho para enriquecer o catálogo.',
    description: name
      ? `${name} é um desejo cultivado com carinho, escolhido por sua utilidade, beleza e significado especial para o nosso lar.`
      : 'Um desejo cultivado com carinho para trazer harmonia e aconchego ao nosso dia a dia.',
    dream: name
      ? `Sonho em conquistar ${name} para tornar nossos momentos ainda mais especiais e acolhedores.`
      : 'Sonho em ver este desejo florescer para completar a nossa vida com alegria e conforto.',
    story: name
      ? `Este presente foi escolhido a dedo por representar um passo importante e uma doce lembrança nesta fase especial.`
      : 'Um presente pensado para marcar esta fase tão especial com significado e gratidão.',
    meanings: ['Carinho', 'Aconchego', 'Gratidão', 'Harmonia'],
  };
}
