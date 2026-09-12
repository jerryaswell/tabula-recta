import { AZ, chr, digitsOf, idx, N } from './lib/alphabet.js';
import { CIPHERS, DERIVED, ROLE_LETTER, ROLE_WORD } from './lib/ciphers.js';
import { letterAt, nextKeyRow, runCipher } from './lib/run.js';

const table = document.getElementById('grid');
const readout = document.getElementById('readout');
const picksEl = document.getElementById('picks');
const legendEl = document.getElementById('legend');
const tipEl = document.getElementById('tip');
const msgEl = document.getElementById('msg');
const keyEl = document.getElementById('key');
const rname = document.getElementById('rname');
const rplain = document.getElementById('rplain');
const rkey = document.getElementById('rkey');
const rcipher = document.getElementById('rcipher');
const rnote = document.getElementById('rnote');

const HOVER_HINT =
  '<span class="hint">Hover a square, or a letter in the lines above, to read off its working.</span>';

let active = null;
let RUN = null;
let COMPOSE = false;

/* ---------- the table ---------- */
function build() {
  const out = ['<thead><tr><th></th>'];
  for (let c = 0; c < N; c++) out.push('<th data-hc="' + c + '">' + chr(c) + '</th>');
  out.push('</tr></thead><tbody>');
  for (let r = 0; r < N; r++) {
    out.push('<tr><th data-hr="' + r + '">' + chr(r) + '</th>');
    for (let c = 0; c < N; c++)
      out.push('<td data-r="' + r + '" data-c="' + c + '">' + chr((r + c) % 26) + '</td>');
    out.push('</tr>');
  }
  table.innerHTML = out.join('') + '</tbody>';
  mark();
}

function mark() {
  table.classList.remove('cell-p', 'cell-k', 'cell-c');
  if (!RUN) return;
  const [rowRole, colRole, cellRole] = RUN.spec.roles;
  table.classList.add('cell-' + ROLE_LETTER[cellRole]);
  const seen = new Map();

  RUN.steps.forEach((st, n) => {
    const cell = table.querySelector('td[data-r="' + st.row + '"][data-c="' + st.col + '"]');
    if (cell) {
      cell.classList.add('used');
      const k = st.row + ':' + st.col;
      seen.set(k, seen.has(k) ? seen.get(k) + ',' + (n + 1) : String(n + 1));
      cell.dataset.n = seen.get(k);
    }
    table
      .querySelector('th[data-hr="' + st.row + '"]')
      ?.classList.add('use-' + ROLE_LETTER[rowRole]);
    table
      .querySelector('th[data-hc="' + st.col + '"]')
      ?.classList.add('use-' + ROLE_LETTER[colRole]);
  });

  if (COMPOSE) {
    const f = nextKeyRow(RUN, idx(keyEl.value));
    if (f !== null) table.querySelector('th[data-hr="' + f + '"]')?.classList.add('next');
  }
}

/* ---------- hover ---------- */
function stepsAt(r, c) {
  return RUN
    ? RUN.steps.map((s, n) => (s.row === r && s.col === c ? n : -1)).filter((n) => n >= 0)
    : [];
}

function clearHover() {
  table
    .querySelectorAll('.cross, .trail, .at')
    .forEach((el) => el.classList.remove('cross', 'trail', 'at', 'p', 'k', 'c'));
  document.querySelectorAll('.stream code b.cur').forEach((b) => b.classList.remove('cur'));
}

function light(r, c, hits) {
  hits = hits || [];
  clearHover();

  for (let i = 0; i < c; i++)
    table.querySelector('td[data-r="' + r + '"][data-c="' + i + '"]')?.classList.add('trail');
  for (let i = 0; i < r; i++)
    table.querySelector('td[data-r="' + i + '"][data-c="' + c + '"]')?.classList.add('trail');
  table.querySelectorAll('td[data-r="' + r + '"], td[data-c="' + c + '"]').forEach((el) => {
    if (!el.classList.contains('trail')) el.classList.add('cross');
  });
  const cell = table.querySelector('td[data-r="' + r + '"][data-c="' + c + '"]');
  cell?.classList.remove('cross');
  cell?.classList.add('at');

  if (!RUN) {
    table.querySelector('th[data-hr="' + r + '"]')?.classList.add('at', 'k');
    table.querySelector('th[data-hc="' + c + '"]')?.classList.add('at', 'p');
    readout.innerHTML =
      '<span class="k">' +
      chr(r) +
      '</span><span class="op">row</span>' +
      '<span class="op">+</span><span class="p">' +
      chr(c) +
      '</span><span class="op">column</span>' +
      '<span class="op">=</span><span class="c">' +
      chr((r + c) % 26) +
      '</span>';
    return;
  }

  const [rowRole, colRole] = RUN.spec.roles;
  table.querySelector('th[data-hr="' + r + '"]')?.classList.add('at', ROLE_LETTER[rowRole]);
  table.querySelector('th[data-hc="' + c + '"]')?.classList.add('at', ROLE_LETTER[colRole]);

  const val = letterAt(RUN.spec, r, c);
  const say = (role) =>
    '<span class="' +
    ROLE_LETTER[role] +
    '">' +
    chr(val[role]) +
    '</span>' +
    '<span class="op">' +
    ROLE_WORD[role] +
    '</span>';
  const sign = RUN.spec.op === 'add' ? '+' : '−';
  const order = RUN.spec.op === 'sub-pk' ? ['key', 'plain'] : ['plain', 'key'];

  readout.innerHTML =
    say(order[0]) +
    '<span class="op">' +
    sign +
    '</span>' +
    say(order[1]) +
    '<span class="op">=</span>' +
    say('cipher') +
    '<span class="hint">' +
    (hits.length
      ? (hits.length > 1 ? 'letters ' : 'letter ') +
        hits.map((n) => n + 1).join(', ') +
        ' of the message'
      : 'not a step in this message — what the table would give for this pair') +
    '</span>' +
    (COMPOSE
      ? '<span class="add">click to add <span class="p">' +
        chr(val.plain) +
        '</span>' +
        (DERIVED.includes(RUN.spec.id)
          ? ' (key follows on its own)'
          : ' and <span class="k">' + (RUN.spec.digits ? val.key : chr(val.key)) + '</span>') +
        '</span>'
      : '');

  hits.forEach((n) => {
    rplain.children[n]?.classList.add('cur');
    rkey.children[n]?.classList.add('cur');
    rcipher.children[n]?.classList.add('cur');
  });
}

table.addEventListener('mouseover', (e) => {
  const cell = e.target.closest('td');
  if (!cell) return;
  light(+cell.dataset.r, +cell.dataset.c, stepsAt(+cell.dataset.r, +cell.dataset.c));
});

table.addEventListener('mouseleave', () => {
  clearHover();
  readout.innerHTML = HOVER_HINT;
});

/* ---------- composing by clicking ---------- */
function addFromCell(r, c) {
  if (!RUN) {
    readout.innerHTML =
      '<span class="hint">Pick a cipher first — the table needs to know what a square means.</span>';
    return;
  }
  const val = letterAt(RUN.spec, r, c);
  const spec = RUN.spec;

  if (DERIVED.includes(spec.id)) {
    msgEl.value = AZ(msgEl.value) + chr(val.plain);
  } else if (spec.digits) {
    if (val.key > 9) {
      readout.innerHTML =
        '<span class="hint">Gronsfeld keys are digits 0–9, so only the first ten rows are available.</span>';
      return;
    }
    msgEl.value = AZ(msgEl.value) + chr(val.plain);
    keyEl.value = keyEl.value.replace(/[^0-9]/g, '') + val.key;
  } else {
    msgEl.value = AZ(msgEl.value) + chr(val.plain);
    keyEl.value = AZ(keyEl.value) + chr(val.key);
  }
  rerun();
}

function undoLast() {
  msgEl.value = AZ(msgEl.value).slice(0, -1);
  const spec = RUN && RUN.spec;
  if (spec && !DERIVED.includes(spec.id)) {
    keyEl.value = spec.digits
      ? keyEl.value.replace(/[^0-9]/g, '').slice(0, -1)
      : AZ(keyEl.value).slice(0, -1);
  }
  rerun();
}

table.addEventListener('click', (e) => {
  if (!COMPOSE) return;
  const cell = e.target.closest('td');
  if (cell) addFromCell(+cell.dataset.r, +cell.dataset.c);
});

function setCompose(on) {
  COMPOSE = on;
  const btn = document.getElementById('compose');
  btn.classList.toggle('on', on);
  btn.textContent = 'Compose by clicking: ' + (on ? 'on' : 'off');
  document.body.classList.toggle('composing', on);
  document.getElementById('undo').hidden = !on;
  setTip();
  // the result line reads differently in compose mode, so re-run rather than
  // only redrawing the table — otherwise it keeps telling you to type while the
  // tip underneath tells you to click
  if (active !== null) rerun();
  else build();
}

function setTip() {
  if (!COMPOSE) {
    tipEl.textContent = '';
    return;
  }
  if (!RUN) {
    tipEl.textContent = 'pick a cipher, then click squares';
    return;
  }
  tipEl.textContent = DERIVED.includes(RUN.spec.id)
    ? 'the key is generated — the black row shows where the next letter must land'
    : 'each click adds one letter to the message and one to the key';
}

/* ---------- rendering a run ---------- */
function stream(el, arr, labels) {
  el.innerHTML = arr
    .map((v, n) => '<b data-n="' + n + '">' + (labels ? labels[n] : chr(v)) + '</b>')
    .join('');
  el.querySelectorAll('b').forEach((b) =>
    b.addEventListener('mouseenter', () => {
      if (!RUN) return;
      const st = RUN.steps[+b.dataset.n];
      light(st.row, st.col, stepsAt(st.row, st.col));
    })
  );
}

function setLegend() {
  if (!RUN || !RUN.steps.length) {
    legendEl.innerHTML = '';
    return;
  }
  const [rowRole, colRole, cellRole] = RUN.spec.roles;
  legendEl.innerHTML =
    '<span class="' +
    ROLE_LETTER[colRole] +
    '">top: <b>' +
    ROLE_WORD[colRole] +
    '</b></span>' +
    '<span class="' +
    ROLE_LETTER[rowRole] +
    '">side: <b>' +
    ROLE_WORD[rowRole] +
    '</b></span>' +
    '<span class="' +
    ROLE_LETTER[cellRole] +
    '">shaded squares: <b>' +
    ROLE_WORD[cellRole] +
    '</b>, numbered by position</span>';
}

function clearRun(msg) {
  RUN = null;
  rname.textContent = msg;
  rplain.innerHTML = rkey.innerHTML = rcipher.innerHTML = '';
  rnote.textContent = '';
  setLegend();
  setTip();
  build();
}

function run(i) {
  picksEl.querySelectorAll('button').forEach((b) => b.classList.remove('on'));
  if (active === i) {
    active = null;
    clearRun('Pick a cipher to mark up the table');
    return;
  }
  active = i;
  picksEl.querySelector('[data-btn="' + i + '"]').classList.add('on');

  const spec = CIPHERS[i];
  RUN = runCipher(spec, msgEl.value, keyEl.value);

  if (!RUN.ready) {
    const haveMessage = idx(msgEl.value).length > 0;
    // a key of bare digits is a key for Gronsfeld and for nothing else, so say which
    // kind is wanted rather than repeating 'enter a key' at someone who just did
    const wrongKind = !spec.digits && !idx(keyEl.value).length && digitsOf(keyEl.value).length > 0;
    rname.innerHTML =
      spec.name +
      ' <span class="formula">· ' +
      (COMPOSE
        ? 'click squares to build the message' + (RUN.haveKey ? '' : ' and key')
        : wrongKind
          ? 'this cipher keys on letters — digits are only a key for Gronsfeld'
          : haveMessage
            ? 'enter a key'
            : 'enter a message') +
      '</span>';
    rplain.innerHTML = rkey.innerHTML = rcipher.innerHTML = '';
    rnote.textContent = spec.note;
    setLegend();
    setTip();
    build();
    return;
  }

  rname.innerHTML =
    spec.name +
    ' <span class="formula">· ' +
    spec.sub +
    ' · every square is ' +
    spec.formula +
    '</span>';
  stream(rplain, RUN.plain);
  stream(
    rkey,
    RUN.ks,
    spec.digits ? RUN.ks.map((_, n) => String(RUN.gron[n % RUN.gron.length])) : null
  );
  stream(rcipher, RUN.cipher);
  rnote.textContent = spec.note;

  setLegend();
  setTip();
  build();
}

function renderPicks() {
  picksEl.innerHTML = CIPHERS.map(
    (s, i) =>
      '<button data-btn="' + i + '">' + s.name + '<span class="sub">' + s.sub + '</span></button>'
  ).join('');
  picksEl
    .querySelectorAll('button')
    .forEach((b) => b.addEventListener('click', () => run(+b.dataset.btn)));
}

function rerun() {
  if (active !== null) {
    const k = active;
    active = null;
    run(k);
  }
}

msgEl.addEventListener('input', rerun);
keyEl.addEventListener('input', rerun);

document.getElementById('compose').addEventListener('click', () => setCompose(!COMPOSE));
document.getElementById('undo').addEventListener('click', undoLast);
document.getElementById('clear').addEventListener('click', () => {
  msgEl.value = '';
  keyEl.value = '';
  rerun();
  if (!COMPOSE) setCompose(true);
});

renderPicks();
build();
