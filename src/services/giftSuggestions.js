/**
 * Serviço de geração inteligente de sugestões acolhedoras para presentes.
 * Com base no nome e palavras-chave do produto, sugere:
 * - Prioridade recomendada (alta, media, baixa) com justificativa
 * - Categoria sugerida
 * - Descrição acolhedora
 * - 🌱 O Sonho (visão inspiradora do presente)
 * - 📖 A História (memória / significado)
 * - Tags de significado e coleção
 */

const KEYWORD_MAP = [
  // TECNOLOGIA & HOME OFFICE
  {
    keywords: [
      'workstation', 'mesa de trabalho', 'escrivaninha', 'computador', 'notebook', 'laptop',
      'monitor', 'teclado', 'mouse', 'fone', 'headset', 'alexa', 'echo', 'kindle',
      'tablet', 'ipad', 'carregador', 'suporte notebook', 'impressora', 'hub', 'câmera',
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

  // CAFÉ & RITUAIS MATINAIS
  {
    keywords: [
      'cafeteira', 'café', 'nespresso', 'prensa francesa', 'moedor', 'chaleira', 'bule',
      'xícara', 'caneca', 'garrafa térmica', 'copo térmico',
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

  // COZINHA & MESA POSTA
  {
    keywords: [
      'air fryer', 'fritadeira', 'liquidificador', 'batedeira', 'panela', 'faqueiro',
      'talher', 'prato', 'aparelho de jantar', 'taça', 'copo', 'travessa', 'tábua',
      'bowl', 'assadeira', 'fogão', 'micro-ondas', 'forno', 'torradeira', 'grill',
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

  // DORMITÓRIO & CONFORTO (CAMA, BANHO, ACONCHEGO)
  {
    keywords: [
      'lençol', 'lençóis', 'edredom', 'cobertor', 'manta', 'travesseiro', 'colchão',
      'cama', 'fronhas', 'toalha', 'roupão', 'almofada', 'ninho',
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

  // ILUMINAÇÃO & ATMOSFERA
  {
    keywords: [
      'luminária', 'abajur', 'arandela', 'vela', 'difusor', 'pendente', 'lâmpada', 'lustre',
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

  // SALA, MOBILIÁRIO & DECORAÇÃO
  {
    keywords: [
      'sofá', 'poltrona', 'cadeira', 'mesa de centro', 'tapete', 'cortina', 'espelho',
      'estante', 'aparador', 'buffet', 'rack', 'painel', 'quadro', 'escultura', 'vaso',
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

  // LIVROS & CULTURA
  {
    keywords: [
      'livro', 'livros', 'box', 'biografia', 'romance', 'filosofia', 'bíblia', 'leitura',
      'clássico', 'edição especial', 'capa dura', 'literatura',
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

  // ARTE, ESPIRITUALIDADE & AROMAS
  {
    keywords: [
      'incensário', 'cristal', 'oratório', 'terço', 'tarot', 'arte', 'pintura', 'símbolo',
      'óleo essencial', 'aroma', 'espiritualidade', 'altar',
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

  // JARDIM & BOTÂNICA
  {
    keywords: [
      'planta', 'orquídea', 'samambaia', 'vaso de cerâmica', 'cachepot', 'regador',
      'tesoura de poda', 'adubo', 'jardim', 'horta', 'flores',
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

  // PETS
  {
    keywords: [
      'cachorro', 'gato', 'pet', 'caminha pet', 'coleira', 'comedouro', 'arranhador',
      'brinquedo pet', 'tapete higiênico', 'ração',
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

  // VESTUÁRIO & JOIAS
  {
    keywords: [
      'vestido', 'camisa', 'calça', 'casaco', 'bota', 'sapato', 'bolsa', 'mochila',
      'colar', 'brinco', 'anel', 'pulseira', 'joia', 'prata', 'ouro', 'relógio',
    ],
    category: 'moda',
    subcategory: 'Elegância & Guarda-roupa',
    collection: 'Elegância & Delicadeza',
    priority: 'baixa',
    priorityReason: 'Um mimo especial de estilo e beleza para momentos comemorativos.',
    description: (name) => `${name} de estilo atemporal e delicado para expressar elegância em momentos especiais.`,
    dream: 'Celebrar a beleza, a autoestima e os momentos marcantes vestindo peças que carregam carinho e história.',
    story: 'Uma peça escolhida com carinho para marcar ocasiões inesquecíveis e carregar lembranças felizes.',
    meanings: ['Autoestima', 'Elegância', 'Celebração', 'Carinho'],
  },
];

/**
 * Analisa o nome do produto e retorna um conjunto completo de sugestões acolhedoras.
 * @param {string} rawName - Nome digitado do presente.
 * @param {string} currentCategory - Categoria atualmente selecionada (opcional).
 * @returns {Object} Sugestões de prioridade, textos, sonho, história e tags.
 */
export function generateGiftSuggestions(rawName = '', currentCategory = '') {
  const name = String(rawName).trim();
  const lower = name.toLowerCase();

  // Procura pelo match mais específico nas palavras-chave
  let matched = KEYWORD_MAP.find(entry => {
    return entry.keywords.some(kw => lower.includes(kw));
  });

  // Se não encontrou por palavra-chave mas possui categoria selecionada
  if (!matched && currentCategory && currentCategory !== 'all') {
    matched = KEYWORD_MAP.find(entry => entry.category === currentCategory);
  }

  // Fallback inteligente customizado com o nome do produto
  if (!matched) {
    return {
      category: currentCategory || 'casa',
      subcategory: 'Desejos Especiais',
      collection: 'Curadoria do Coração',
      priority: 'media',
      priorityReason: 'Item de valor especial selecionado com carinho para enriquecer o catálogo.',
      description: name
        ? `${name} é um desejo cultivado com carinho, escolhido por sua utilidade, beleza e significado especial para o nosso lar.`
        : 'Um desejo cultivado com carinho para trazer harmonia e aconchego ao nosso dia a dia.',
      dream: name
        ? `Sonho em ter ${name} no nosso cantinho para tornar nossos momentos ainda mais especiais e acolhedores.`
        : 'Sonho em ver este desejo florescer para completar o nosso lar com alegria e conforto.',
      story: name
        ? `Este presente foi escolhido a dedo por representar um passo importante e uma doce lembrança nesta nova fase.`
        : 'Um presente pensado para marcar esta fase tão especial com significado e gratidão.',
      meanings: ['Carinho', 'Aconchego', 'Gratidão', 'Harmonia'],
    };
  }

  return {
    category: matched.category,
    subcategory: matched.subcategory,
    collection: matched.collection,
    priority: matched.priority,
    priorityReason: matched.priorityReason,
    description: matched.description(name || 'este item'),
    dream: matched.dream,
    story: matched.story,
    meanings: matched.meanings,
  };
}
