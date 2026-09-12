import { digitsOf, idx } from './alphabet.js';
import { apply, DERIVED } from './ciphers.js';

/**
 * Work a message through one cipher.
 *
 * Returns the three letter streams plus the square each letter lands on:
 * `steps[n].row` / `.col` are the table coordinates, which is all the marking
 * and the hover readout need. `ready` is false when there is nothing to run
 * yet — no message, or no key for a cipher that needs one — and the rest of the
 * shape stays valid so callers can render an empty run without special cases.
 *
 * @param {object} spec one of CIPHERS
 * @param {string} message the plaintext, in any shape; non-letters are dropped
 * @param {string} key the keyword, passage or digit key
 */
export function runCipher(spec, message, key) {
  const plain = idx(message);
  const letters = idx(key);
  const digits = digitsOf(key);
  const gron = digits.length ? digits : letters.map((k) => k % 10);
  // a digit key only counts for the cipher that reads digits; every other cipher
  // indexes into the letters, and an empty letter key would run off the end of it
  const haveKey =
    spec.id === 'trithemius' || letters.length > 0 || (spec.digits === true && digits.length > 0);

  if (!plain.length || !haveKey) {
    return { spec, steps: [], plain: [], ks: [], cipher: [], gron, haveKey, ready: false };
  }

  const cipher = [];
  const ks = [];

  if (spec.running) {
    // ciphertext autokey: each letter out becomes a letter of key further on
    const seed = letters.slice();
    for (let n = 0; n < plain.length; n++) {
      const k = n < seed.length ? seed[n] : cipher[n - seed.length];
      ks.push(k);
      cipher.push(apply(spec.op, plain[n], k));
    }
  } else {
    const s = spec.stream(plain, letters, gron);
    for (let n = 0; n < plain.length; n++) {
      ks.push(s[n]);
      cipher.push(apply(spec.op, plain[n], s[n]));
    }
  }

  const [rowRole, colRole] = spec.roles;
  const steps = plain.map((_, n) => {
    const val = { plain: plain[n], key: ks[n], cipher: cipher[n] };
    return { p: plain[n], k: ks[n], c: cipher[n], row: val[rowRole], col: val[colRole] };
  });

  return { spec, steps, plain, ks, cipher, gron, haveKey, ready: true };
}

/**
 * The row the next keystream letter must land on, for the ciphers that derive
 * their own key. Null for the rest, where the key is free.
 *
 * @param {object} run a result from runCipher
 * @param {number[]} seed the priming key, as alphabet indices
 */
export function nextKeyRow(run, seed) {
  if (!run || !DERIVED.includes(run.spec.id)) return null;
  const n = run.plain.length;
  if (run.spec.id === 'trithemius') return n % 26;
  if (run.spec.id === 'autokey') return n < seed.length ? seed[n] : run.plain[n - seed.length];
  return n < seed.length ? seed[n] : run.cipher[n - seed.length];
}

/** The letters a square holds, named by the role each plays in this cipher. */
export function letterAt(spec, r, c) {
  const [rowRole, colRole, cellRole] = spec.roles;
  const val = {};
  val[rowRole] = r;
  val[colRole] = c;
  val[cellRole] = (r + c) % 26;
  return val;
}
