import test from 'node:test';
import assert from 'node:assert/strict';

import { AZ, chr, digitsOf, idx, word } from '../../src/lib/alphabet.js';
import { apply, CIPHERS, DERIVED, ROLE_LETTER, ROLE_WORD } from '../../src/lib/ciphers.js';
import { letterAt, nextKeyRow, runCipher } from '../../src/lib/run.js';

const byId = (id) => CIPHERS.find((c) => c.id === id);
const encrypt = (id, message, key) => word(runCipher(byId(id), message, key).cipher);

test('alphabet helpers move between letters and indices', () => {
  assert.equal(chr(0), 'A');
  assert.equal(chr(25), 'Z');
  assert.equal(AZ('attack at dawn!'), 'ATTACKATDAWN');
  assert.deepEqual(idx('abz'), [0, 1, 25]);
  assert.equal(word(idx('Attack, at dawn.')), 'ATTACKATDAWN');
  assert.deepEqual(digitsOf('3 1415 lemon'), [3, 1, 4, 1, 5]);
});

test('square arithmetic wraps and inverts', () => {
  assert.equal(apply('add', 25, 1), 0);
  assert.equal(apply('sub-pk', 19, 4), 11); // key − message
  assert.equal(apply('sub-kp', 4, 19), 11); // message − key
  for (let p = 0; p < 26; p++) {
    for (let k = 0; k < 26; k++) {
      assert.equal(
        apply('sub-kp', apply('add', p, k), k),
        p,
        'add then subtract returns the letter'
      );
      assert.equal(apply('sub-pk', apply('sub-pk', p, k), k), p, 'Beaufort is its own inverse');
    }
  }
});

test('the classic worked examples come out right', () => {
  assert.equal(encrypt('vigenere', 'ATTACKATDAWN', 'LEMON'), 'LXFOPVEFRNHR');
  assert.equal(encrypt('autokey', 'ATTACKATDAWN', 'LEMON'), 'LXFOPKTMDCGN');
  assert.equal(encrypt('ctautokey', 'ATTACKATDAWN', 'LEMON'), 'LXFOPVXYRPRK');
  assert.equal(encrypt('trithemius', 'ATTACKATDAWN', ''), 'AUVDGPGALJGY');
  assert.equal(encrypt('beaufort', 'ATTACKATDAWN', 'LEMON'), 'LLTOLBETLNPR');
  assert.equal(encrypt('variant', 'ATTACKATDAWN', 'LEMON'), 'PPHMPZWHPNLJ');
  assert.equal(encrypt('gronsfeld', 'ATTACKATDAWN', '31415'), 'DUXBHNBXEFZO');
  assert.equal(encrypt('running', 'ATTACKATDAWN', 'LEMON'), 'LXFOPVEFRNHR');
});

test('non-letters are dropped before anything is enciphered', () => {
  assert.equal(encrypt('vigenere', 'attack at dawn!', 'lemon'), 'LXFOPVEFRNHR');
});

test('the keystream is the cipher that produced it', () => {
  assert.equal(word(runCipher(byId('trithemius'), 'ATTACKATDAWN', '').ks), 'ABCDEFGHIJKL');
  assert.equal(word(runCipher(byId('vigenere'), 'ATTACKATDAWN', 'LEMON').ks), 'LEMONLEMONLE');
  assert.equal(word(runCipher(byId('autokey'), 'ATTACKATDAWN', 'LEMON').ks), 'LEMONATTACKA');
  assert.equal(word(runCipher(byId('ctautokey'), 'ATTACKATDAWN', 'LEMON').ks), 'LEMONLXFOPVX');
});

test('the Trithemius key side counts through the alphabet and wraps at 26', () => {
  const run = runCipher(byId('trithemius'), 'A'.repeat(30), '');
  assert.deepEqual(run.ks.slice(24, 28), [24, 25, 0, 1]);
});

test('a Gronsfeld key falls back to letters when no digits are given', () => {
  const spec = byId('gronsfeld');
  assert.deepEqual(runCipher(spec, 'ATTACK', '31415').gron, [3, 1, 4, 1, 5]);
  assert.deepEqual(
    runCipher(spec, 'ATTACK', 'LEMON').gron,
    idx('LEMON').map((k) => k % 10)
  );
  assert.ok(
    runCipher(spec, 'ATTACK', '31415').ks.every((k) => k <= 9),
    'digit keys stay in 0-9'
  );
});

test('every cipher agrees with its own formula, square by square', () => {
  for (const spec of CIPHERS) {
    const run = runCipher(spec, 'MEETMEATMIDNIGHT', spec.digits ? '2718' : 'CIPHER');
    assert.equal(run.ready, true, spec.id);
    assert.equal(run.steps.length, run.plain.length, spec.id);
    run.steps.forEach((st, n) => {
      assert.equal(st.c, apply(spec.op, st.p, st.k), spec.id + ' step ' + n);
      assert.equal((st.row + st.col) % 26, letterAt(spec, st.row, st.col)[spec.roles[2]], spec.id);
      const val = { plain: st.p, key: st.k, cipher: st.c };
      assert.equal(st.row, val[spec.roles[0]], spec.id + ' row role');
      assert.equal(st.col, val[spec.roles[1]], spec.id + ' column role');
      assert.equal((st.row + st.col) % 26, val[spec.roles[2]], spec.id + ' square role');
    });
  }
});

test('a run with nothing to work on is empty but still shaped', () => {
  const spec = byId('vigenere');
  for (const [message, key] of [
    ['', 'LEMON'],
    ['ATTACK', ''],
    ['!!!', 'LEMON'],
    ['ATTACK', '...'],
  ]) {
    const run = runCipher(spec, message, key);
    assert.equal(run.ready, false, JSON.stringify([message, key]));
    assert.deepEqual(run.steps, []);
    assert.deepEqual(run.cipher, []);
    assert.equal(run.spec, spec);
  }
});

test('Trithemius needs no key, the others do', () => {
  assert.equal(runCipher(byId('trithemius'), 'ATTACK', '').ready, true);
  assert.equal(runCipher(byId('vigenere'), 'ATTACK', '').ready, false);
  assert.equal(runCipher(byId('gronsfeld'), 'ATTACK', '7').haveKey, true);
});

test('the derived ciphers say where the next letter has to land', () => {
  const seed = idx('LEMON');

  const trithemius = runCipher(byId('trithemius'), 'ATTA', '');
  assert.equal(nextKeyRow(trithemius, []), 4);

  const autokey = runCipher(byId('autokey'), 'ATTACKA', 'LEMON');
  assert.equal(
    nextKeyRow(autokey, seed),
    autokey.plain[2],
    'past the seed, the message is the key'
  );

  const ctautokey = runCipher(byId('ctautokey'), 'ATTACKA', 'LEMON');
  assert.equal(
    nextKeyRow(ctautokey, seed),
    ctautokey.cipher[2],
    'past the seed, the cipher is the key'
  );

  const short = runCipher(byId('autokey'), 'AT', 'LEMON');
  assert.equal(nextKeyRow(short, seed), seed[2], 'inside the seed, the seed is the key');

  assert.equal(nextKeyRow(runCipher(byId('vigenere'), 'ATTACK', 'LEMON'), seed), null);
  assert.equal(nextKeyRow(null, seed), null);
});

test('a square names one letter per role', () => {
  assert.deepEqual(letterAt(byId('vigenere'), 11, 0), { key: 11, plain: 0, cipher: 11 });
  assert.deepEqual(letterAt(byId('beaufort'), 11, 0), { cipher: 11, plain: 0, key: 11 });
  assert.deepEqual(letterAt(byId('variant'), 11, 0), { key: 11, cipher: 0, plain: 11 });
});

test('the cipher list is well formed', () => {
  const ids = CIPHERS.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length, 'ids are unique');
  for (const spec of CIPHERS) {
    assert.ok(spec.name && spec.sub && spec.note && spec.formula, spec.id + ' is described');
    assert.deepEqual(
      [...spec.roles].sort(),
      ['cipher', 'key', 'plain'],
      spec.id + ' uses each role once'
    );
    assert.ok(['add', 'sub-pk', 'sub-kp'].includes(spec.op), spec.id + ' has a known operation');
    assert.ok(spec.stream || spec.running, spec.id + ' can produce a keystream');
    for (const role of spec.roles) {
      assert.ok(ROLE_WORD[role] && ROLE_LETTER[role], role + ' is named');
    }
  }
  for (const id of DERIVED) assert.ok(ids.includes(id), id + ' is a real cipher');
});
