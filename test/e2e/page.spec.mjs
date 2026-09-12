import { test, expect } from '@playwright/test';

/** message ATTACKATDAWN under each cipher, with the key the test types in. */
const WORKED = [
  { name: 'Trithemius progressive', key: '', cipher: 'AUVDGPGALJGY' },
  { name: 'Repeating keyword', key: 'LEMON', cipher: 'LXFOPVEFRNHR' },
  { name: 'Plaintext autokey', key: 'LEMON', cipher: 'LXFOPKTMDCGN' },
  { name: 'Ciphertext autokey', key: 'LEMON', cipher: 'LXFOPVXYRPRK' },
  { name: 'Beaufort', key: 'LEMON', cipher: 'LLTOLBETLNPR' },
  { name: 'Variant Beaufort', key: 'LEMON', cipher: 'PPHMPZWHPNLJ' },
  { name: 'Gronsfeld', key: '31415', cipher: 'DUXBHNBXEFZO' },
  { name: 'Running key', key: 'LEMON', cipher: 'LXFOPVEFRNHR' },
];

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('the table is drawn in full', async ({ page }) => {
  await expect(page).toHaveTitle('Tabula recta');
  await expect(page.locator('#grid tbody tr')).toHaveCount(26);
  await expect(page.locator('#grid tbody td')).toHaveCount(26 * 26);
  await expect(page.locator('#grid td[data-r="0"][data-c="0"]')).toHaveText('A');
  await expect(page.locator('#grid td[data-r="25"][data-c="25"]')).toHaveText('Y');
  await expect(page.locator('#picks button')).toHaveCount(WORKED.length);
});

WORKED.forEach(({ name, key, cipher }, i) => {
  test(`${name} enciphers the worked example`, async ({ page }) => {
    const pick = page.locator('#picks button').nth(i);
    await expect(pick).toContainText(name);
    await page.fill('#key', key);
    await pick.click();
    await expect(page.locator('#rcipher')).toHaveText(cipher);
    await expect(page.locator('#rplain')).toHaveText('ATTACKATDAWN');
    await expect(page.locator('#rnote')).not.toBeEmpty();
    await expect(page.locator('#grid td.used').first()).toBeVisible();
  });
});

test('picking a cipher twice puts the table back', async ({ page }) => {
  const pick = page.getByRole('button', { name: 'Repeating keyword' });
  await pick.click();
  await expect(page.locator('#grid td.used').first()).toBeVisible();
  await pick.click();
  await expect(page.locator('#grid td.used')).toHaveCount(0);
  await expect(page.locator('#rname')).toHaveText('Pick a cipher to mark up the table');
});

test('editing the message re-runs the cipher', async ({ page }) => {
  await page.getByRole('button', { name: 'Repeating keyword' }).click();
  await page.fill('#msg', 'MEETMEATMIDNIGHT');
  await expect(page.locator('#rcipher')).toHaveText('XIQHZPEFAVORUUUE');
  await page.fill('#msg', '');
  await expect(page.locator('#rname')).toContainText('enter a message');
});

test('hovering a square reads off its working', async ({ page }) => {
  await page.getByRole('button', { name: 'Repeating keyword' }).click();
  await page.locator('#grid td[data-r="11"][data-c="0"]').hover();
  const readout = page.locator('#readout');
  await expect(readout).toContainText('message');
  await expect(readout).toContainText('key');
  await expect(readout).toContainText('letter 1 of the message');
  await expect(page.locator('#grid td.at')).toHaveCount(1);
});

test('hovering a letter of the message lights its square, and every repeat of it', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Repeating keyword' }).click();
  // T over key M is the third letter of ATTACKATDAWN, and the eighth as well
  await page.locator('#rplain b').nth(2).hover();
  await expect(page.locator('#grid td.at')).toHaveCount(1);
  await expect(page.locator('#rcipher b.cur')).toHaveText(['F', 'F']);
  await expect(page.locator('#readout')).toContainText('letters 3, 8 of the message');
  await expect(page.locator('#grid td.at')).toHaveAttribute('data-n', '3,8');
});

test('composing by clicking builds the message and the key', async ({ page }) => {
  await page.fill('#msg', '');
  await page.fill('#key', '');
  await page.getByRole('button', { name: 'Repeating keyword' }).click();
  await page.getByRole('button', { name: 'Compose by clicking: off' }).click();
  await expect(page.locator('body')).toHaveClass(/composing/);

  await page.locator('#grid td[data-r="11"][data-c="0"]').click(); // key L, message A
  await page.locator('#grid td[data-r="4"][data-c="19"]').click(); // key E, message T
  await expect(page.locator('#msg')).toHaveValue('AT');
  await expect(page.locator('#key')).toHaveValue('LE');
  await expect(page.locator('#rcipher')).toHaveText('LX');

  await page.getByRole('button', { name: 'Undo last' }).click();
  await expect(page.locator('#msg')).toHaveValue('A');
  await expect(page.locator('#key')).toHaveValue('L');
});

test('a derived cipher marks the row the next letter must land on', async ({ page }) => {
  await page.fill('#msg', '');
  await page.getByRole('button', { name: 'Plaintext autokey' }).click();
  await page.getByRole('button', { name: 'Compose by clicking: off' }).click();
  await expect(page.locator('#grid th.next')).toHaveCount(1);
  await expect(page.locator('#grid th.next')).toHaveText('L'); // the seed key LEMON starts here
  await expect(page.locator('#tip')).toContainText('the key is generated');
});

test('clearing both fields drops into composing', async ({ page }) => {
  await page.getByRole('button', { name: 'Repeating keyword' }).click();
  await page.getByRole('button', { name: 'Clear both' }).click();
  await expect(page.locator('#msg')).toHaveValue('');
  await expect(page.locator('#key')).toHaveValue('');
  await expect(page.locator('body')).toHaveClass(/composing/);
  await expect(page.locator('#rname')).toContainText('click squares to build the message and key');
  await expect(page.locator('#tip')).toContainText('each click adds one letter');
});

test('turning composing on re-reads the result line, not just the table', async ({ page }) => {
  await page.getByRole('button', { name: 'Repeating keyword' }).click();
  await page.fill('#msg', '');
  await expect(page.locator('#rname')).toContainText('enter a message');
  await page.getByRole('button', { name: 'Compose by clicking: off' }).click();
  // the instruction must agree with the tip below it
  await expect(page.locator('#rname')).toContainText('click squares to build the message');
  await expect(page.locator('#rname')).not.toContainText('enter a message');
});

test('the page loads nothing from the network but itself', async ({ page }) => {
  const requests = [];
  page.on('request', (r) => requests.push(r.url()));
  await page.goto('/');
  await expect(page.locator('#grid tbody tr')).toHaveCount(26);
  const extra = requests.filter((url) => !url.endsWith('/') && !url.endsWith('favicon.svg'));
  expect(extra).toEqual([]);
});

test('the 404 page points back at the table', async ({ page }) => {
  const response = await page.goto('/nowhere');
  expect(response.status()).toBe(404);
  await expect(page.getByRole('link', { name: 'the front page' })).toBeVisible();
});

test('a marked square keeps its fill when the hover crossing runs over it', async ({ page }) => {
  await page.getByRole('button', { name: 'Repeating keyword' }).click();
  await page.locator('#grid td[data-r="11"][data-c="0"]').hover();
  const fills = await page.evaluate(() =>
    [...document.querySelectorAll('#grid td.used.trail, #grid td.used.cross')].map(
      (el) => getComputedStyle(el).backgroundColor
    )
  );
  expect(fills.length).toBeGreaterThan(0);
  expect([...new Set(fills)]).toEqual(['rgb(223, 234, 227)']); // --cipher-soft, not the trail tint
});

test('the shaded squares are the colour the legend says they are', async ({ page }) => {
  // the square holds a different one of the three letters depending on the cipher
  const cases = [
    { name: 'Repeating keyword', role: 'cipher', fill: 'rgb(223, 234, 227)' },
    { name: 'Beaufort', role: 'key', fill: 'rgb(221, 231, 243)' },
    { name: 'Variant Beaufort', role: 'message', fill: 'rgb(243, 227, 210)' },
  ];
  for (const { name, role, fill } of cases) {
    await page.locator('#picks button').filter({ hasText: name }).first().click();
    await expect(page.locator('#legend')).toContainText('shaded squares: ' + role);
    const used = page.locator('#grid td.used').first();
    await expect(used).toHaveCSS('background-color', fill);
    await page.locator('#picks button').filter({ hasText: name }).first().click(); // deselect
  }
});

test('Gronsfeld says which rows it cannot key before you click them', async ({ page }) => {
  await page.fill('#key', '31415');
  await page.getByRole('button', { name: 'Gronsfeld' }).click();
  await page.getByRole('button', { name: 'Compose by clicking: off' }).click();

  await page.locator('#grid td[data-r="3"][data-c="0"]').hover(); // row D: digit 3, reachable
  await expect(page.locator('#readout .add')).toContainText('click to add');

  await page.locator('#grid td[data-r="14"][data-c="0"]').hover(); // row O: digit 14, out of reach
  await expect(page.locator('#readout .add')).toContainText('a Gronsfeld key stops at 9');
  // the working for the square is still there to read
  await expect(page.locator('#readout')).toContainText('message');
  await expect(page.locator('#readout')).toContainText('key');
});

test('the table does not move while you read across it', async ({ page }) => {
  const gridTop = () =>
    page.evaluate(() =>
      Math.round(document.getElementById('grid').getBoundingClientRect().top + window.scrollY)
    );

  const cold = await gridTop();
  const tops = [];
  for (let i = 0; i < 8; i++) {
    await page.locator('#picks button').nth(i).click();
    tops.push(await gridTop());
    await page.locator('#picks button').nth(i).click();
  }
  expect([...new Set(tops)]).toEqual([cold]); // every cipher reserves the same block

  await page.locator('#picks button').nth(1).click();
  await page.locator('#grid td[data-r="11"][data-c="0"]').hover(); // a marked square
  const onPath = await gridTop();
  await page.locator('#grid td[data-r="2"][data-c="3"]').hover(); // an unmarked one, longer annotation
  expect(await gridTop()).toBe(onPath);
});

test('clicking the same square twice adds the same letter twice', async ({ page }) => {
  // the readout used to change height under the pointer, sliding a different
  // square beneath a stationary cursor between clicks
  await page.getByRole('button', { name: 'Clear both' }).click();
  await page.locator('#picks button').nth(1).click();
  const cell = page.locator('#grid td[data-r="11"][data-c="0"]');
  await cell.scrollIntoViewIfNeeded(); // mouse.click uses viewport coordinates
  const box = await cell.boundingBox();
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  for (let i = 0; i < 3; i++) await page.mouse.click(x, y);
  await expect(page.locator('#msg')).toHaveValue('AAA');
  await expect(page.locator('#key')).toHaveValue('LLL');
});
