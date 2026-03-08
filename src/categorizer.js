/**
 * Motore di categorizzazione transazioni
 * Basato su pattern nelle descrizioni (remittanceInformationUnstructured)
 */

const CATEGORIES = {
  alimentari: {
    label: 'Alimentari',
    icon: '🛒',
    patterns: [
      'conad', 'esselunga', 'carrefour', 'lidl', 'aldi', 'eurospin', 'coop', 'bennet',
      'billa', 'pam', 'supermercato', 'supermarket', 'grocery', 'alimentari',
      'food', 'pizza', 'ristorante', 'ristorante', 'trattoria', 'osteria', 'bar ',
      'caffè', 'caffe', 'bar ', 'mc donald', 'mcdonald', 'burger', 'kfc',
      'deliveroo', 'glovo', 'just eat', 'ubereats', 'food delivery',
    ],
  },
  trasporti: {
    label: 'Trasporti',
    icon: '🚗',
    patterns: [
      'eni', 'esso', 'tamoil', 'q8', 'repsol', 'benzina', 'gasolio', 'carburante',
      'atm', 'trenitalia', 'italo', 'trenord', 'flixbus', 'blablacar',
      'uber', 'bolt', 'taxi', 'parking', 'parcheggio', 'autostrada', 'via',
      'poste italiane', 'dhl', 'ups', 'fedex', 'sda', 'brt', 'gls',
    ],
  },
  abbigliamento: {
    label: 'Abbigliamento',
    icon: '👕',
    patterns: [
      'zara', 'h&m', 'hm ', 'uniqlo', 'primark', 'decathlon', 'nike', 'adidas',
      'bershka', 'pull&bear', 'mango', 'ovs', 'benetton', 'intimissimi',
    ],
  },
  casa: {
    label: 'Casa & Utenze',
    icon: '🏠',
    patterns: [
      'enel', 'a2a', 'a2a', 'eni', 'gas', 'luce', 'acqua', 'bolletta',
      'tim', 'vodafone', 'wind', 'tre', 'iliad', 'fastweb', 'internet',
      'affitto', 'mutuo', 'condominio', 'assicurazione',
    ],
  },
  salute: {
    label: 'Salute',
    icon: '💊',
    patterns: [
      'farmacia', 'pharmacy', 'farmacie', 'medico', 'ospedale', 'clinica',
      'dentista', 'optometrista', 'ottica', 'parafarmacia',
    ],
  },
  svago: {
    label: 'Svago',
    icon: '🎬',
    patterns: [
      'netflix', 'spotify', 'disney', 'prime video', 'amazon prime',
      'cinema', 'teatro', 'concerto', 'musica', 'libri', 'gaming',
      'playstation', 'xbox', 'steam', 'nintendo', 'apple', 'google play',
    ],
  },
  tecnologia: {
    label: 'Tecnologia',
    icon: '💻',
    patterns: [
      'amazon', 'apple', 'mediaworld', 'euronics', 'unieuro', 'samsung',
      'pc', 'laptop', 'software', 'subscription', 'saas',
    ],
  },
  bancomat: {
    label: 'Prelievo',
    icon: '💵',
    patterns: [
      'prelievo', 'bancomat', 'atm', 'cash', 'contanti', 'pag bancomat',
    ],
  },
  trasferimento: {
    label: 'Trasferimento',
    icon: '↔️',
    patterns: [
      'bonifico', 'transfer', 'trasp', 'accredito', 'addebito',
      'stipendio', 'pensione', 'rimborso',
    ],
  },
};

function normalize(s) {
  if (!s || typeof s !== 'string') return '';
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function matchCategory(text) {
  const n = normalize(text);
  for (const [catId, config] of Object.entries(CATEGORIES)) {
    for (const p of config.patterns) {
      if (n.includes(p)) {
        return { id: catId, label: config.label, icon: config.icon };
      }
    }
  }
  return { id: 'altro', label: 'Altro', icon: '📦' };
}

/**
 * Categorizza una singola transazione
 * @param {object} tx - Transazione con remittanceInformationUnstructured, debtorName, ecc.
 */
export function categorizeTransaction(tx) {
  const texts = [
    tx.remittanceInformationUnstructured,
    tx.remittanceInformationStructured,
    tx.debtorName,
    tx.creditorName,
    tx.additionalInformation,
  ].filter(Boolean).join(' ');
  return matchCategory(texts || 'Transazione');
}

/**
 * Categorizza un array di transazioni
 */
export function categorizeTransactions(transactions) {
  const booked = (transactions.booked || []).map((tx) => ({
    ...tx,
    category: categorizeTransaction(tx),
  }));
  const pending = (transactions.pending || []).map((tx) => ({
    ...tx,
    category: categorizeTransaction(tx),
  }));
  return { booked, pending };
}

/**
 * Raggruppa transazioni per categoria
 */
export function groupByCategory(transactions) {
  const booked = transactions.booked || [];
  const groups = {};
  for (const tx of booked) {
    const cat = tx.category || categorizeTransaction(tx);
    const id = cat.id || 'altro';
    if (!groups[id]) groups[id] = { category: cat, total: 0, count: 0, items: [] };
    const amount = parseFloat(tx.transactionAmount?.amount || '0') || 0;
    groups[id].total += Math.abs(amount);
    groups[id].count += 1;
    groups[id].items.push(tx);
  }
  return Object.values(groups).sort((a, b) => b.total - a.total);
}

export { CATEGORIES };
