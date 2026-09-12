/* Every square of a tabula recta holds row + column, so for each cipher one of
   the three letters is the sum of the other two. `roles` names which letter
   sits on the row, which on the column, and which in the square itself. */

/** Ciphers that generate their own key, so a click only supplies a message letter. */
export const DERIVED = ['trithemius', 'autokey', 'ctautokey'];

export const ROLE_WORD = { plain: 'message', key: 'key', cipher: 'cipher' };
export const ROLE_LETTER = { plain: 'p', key: 'k', cipher: 'c' };

export const CIPHERS = [
  {
    id: 'trithemius',
    name: 'Trithemius progressive',
    sub: 'Polygraphia, 1518 — no key',
    op: 'add',
    roles: ['key', 'plain', 'cipher'],
    formula: 'message + key',
    note: 'The original use of the table. The first letter is enciphered with row A, the second with row B, straight down the tableau, so the key side simply counts through the alphabet. There is no key to guess: the system is the whole secret.',
    stream: (p) => p.map((_, i) => i % 26),
  },

  {
    id: 'vigenere',
    name: 'Repeating keyword',
    sub: 'Bellaso, 1553 — the "Vigenère"',
    op: 'add',
    roles: ['key', 'plain', 'cipher'],
    formula: 'message + key',
    note: "Bellaso added the repeating countersign that later took Vigenère's name. Only as many rows as the keyword has letters are ever used — visible at a glance on the side of the table — and that regularity is what Kasiski published in 1863, a decade after Babbage had quietly done the same and said nothing.",
    stream: (p, k) => p.map((_, i) => k[i % k.length]),
  },

  {
    id: 'autokey',
    name: 'Plaintext autokey',
    sub: 'Vigenère, 1586',
    op: 'add',
    roles: ['key', 'plain', 'cipher'],
    formula: 'message + key',
    note: "Cardano had the idea first and botched it — plaintext keying itself, with no primer, so the recipient could not read it either. Vigenère's fix was a priming key: one agreed letter for him, a short word here. It runs first, then the message itself becomes the key, and the marked rows spread across the whole side of the table instead of clustering on a few.",
    stream: (p, k) => k.concat(p).slice(0, p.length),
  },

  {
    id: 'ctautokey',
    name: 'Ciphertext autokey',
    sub: 'Weaker autokey variant',
    op: 'add',
    roles: ['key', 'plain', 'cipher'],
    formula: 'message + key',
    running: true,
    note: 'Same idea, but each ciphertext letter feeds the next key position. It resynchronises after a garbled letter, which suited noisy channels, and it costs almost everything: past the primer the keystream is the ciphertext, which the attacker already has, so only the short priming key is ever really secret.',
  },

  {
    id: 'beaufort',
    name: 'Beaufort',
    sub: 'Sold as a card, 1857',
    op: 'sub-pk',
    roles: ['cipher', 'plain', 'key'],
    formula: 'key − message',
    note: 'Key minus message, which makes the cipher its own inverse. The table is read differently for it: go down the message column until you meet the key letter, and the row you landed on is the ciphertext — so the cipher letters are marked on the side and the key sits in the squares.',
    stream: (p, k) => p.map((_, i) => k[i % k.length]),
  },

  {
    id: 'variant',
    name: 'Variant Beaufort',
    sub: 'Message minus key',
    op: 'sub-kp',
    roles: ['key', 'cipher', 'plain'],
    formula: 'message − key',
    note: 'The third arrangement of the same three letters, and the decryption step of the repeating-keyword cipher used as an encryption step. Key and cipher are the edges here, and the message is what sits where they cross.',
    stream: (p, k) => p.map((_, i) => k[i % k.length]),
  },

  {
    id: 'gronsfeld',
    name: 'Gronsfeld',
    sub: 'Count Gronsfeld, 1665',
    op: 'add',
    roles: ['key', 'plain', 'cipher'],
    formula: 'message + key',
    digits: true,
    note: 'A digit key rather than a word, easy to memorise and to pass along. Only ten of the twenty-six rows can ever be marked, which is the clearest possible picture of how much it gives away.',
    stream: (p, k, g) => p.map((_, i) => g[i % g.length]),
  },

  {
    id: 'running',
    name: 'Running key',
    sub: 'Book or passage as key',
    op: 'add',
    roles: ['key', 'plain', 'cipher'],
    formula: 'message + key',
    note: 'The key is a long passage — an agreed page and line — so it never repeats. Give it a five-letter word and it is only the repeating keyword again, square for square; type a sentence in and the marked rows scatter across the whole side of the table. Its weakness is that both edges are then ordinary language.',
    stream: (p, k) => p.map((_, i) => k[i % k.length]),
  },
];

/** The one letter a square gives back, once two of the three are fixed. */
export const apply = (op, p, k) =>
  op === 'add' ? (p + k) % 26 : op === 'sub-pk' ? (k - p + 26) % 26 : (p - k + 26) % 26;
