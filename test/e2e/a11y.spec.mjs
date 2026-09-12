import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/** WCAG 2.0/2.1/2.2 A and AA, which is the bar the page is held to. */
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

const audit = (page) => new AxeBuilder({ page }).withTags(TAGS).analyze();

/** Readable failure output: rule, impact and the elements that tripped it. */
const summarise = (violations) =>
  violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    nodes: v.nodes.map((n) => n.target.join(' ')).slice(0, 6),
  }));

test('the page has no accessibility violations, cold', async ({ page }) => {
  await page.goto('/');
  const { violations } = await audit(page);
  expect(summarise(violations)).toEqual([]);
});

test('no violations with a cipher marked up', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Beaufort', exact: false }).first().click();
  await page.locator('#grid td[data-r="11"][data-c="0"]').hover();
  const { violations } = await audit(page);
  expect(summarise(violations)).toEqual([]);
});

test('no violations while composing', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Clear both' }).click();
  await page.locator('#picks button').nth(1).click();
  await page.locator('#grid td[data-r="11"][data-c="0"]').click();
  const { violations } = await audit(page);
  expect(summarise(violations)).toEqual([]);
});

test('no violations on the 404 page', async ({ page }) => {
  await page.goto('/nowhere');
  const { violations } = await audit(page);
  expect(summarise(violations)).toEqual([]);
});
