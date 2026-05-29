// Verif headless du runtime NAVIGATEUR : charge l'app, confirme que web-tree-sitter
// s'initialise (WASM), que le moteur produit des sous-titres et que Shiki colore.
// C'est la verif que le coeur (teste en Node) fonctionne aussi cote navigateur.
import { chromium } from 'playwright';

const URL = process.env.URL || 'http://localhost:5173';
const browser = await chromium.launch();
const page = await browser.newPage();

const pageErrors = [];
const consoleErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text());
});

await page.goto(URL, { waitUntil: 'load' });
await page.waitForSelector('.row--subtitle', { timeout: 25000 });

const subs = await page.$$eval('.row--subtitle .subtitle', (els) => els.map((e) => e.textContent ?? ''));
const codeRows = await page.$$eval('.row--code', (els) => els.length);
const colored = await page.$$eval('.row--code .code span[style*="color"]', (els) => els.length);
console.log(`[browser] lignes code: ${codeRows} | sous-titres: ${subs.length} | tokens colorisés: ${colored}`);
console.log('[browser] échantillon:', JSON.stringify(subs.slice(0, 4)));

// Bascule sur un extrait suspect pour verifier les alertes rouges.
await page.fill('#code', "const cp = require('child_process');\neval(payload);\nBuffer.from(x, 'base64');");
await page.waitForTimeout(500);
const alerts = await page.$$eval('.row--subtitle.is-alert .subtitle', (els) => els.map((e) => e.textContent ?? ''));
console.log('[browser] alertes rouges:', JSON.stringify(alerts));

await browser.close();

const ok =
  codeRows > 0 &&
  subs.length >= 8 &&
  colored > 0 &&
  subs.some((t) => t.includes('express')) &&
  alerts.length >= 2 &&
  pageErrors.length === 0;

if (pageErrors.length) console.log('[browser] ERREURS FATALES:', pageErrors);
if (consoleErrors.length) console.log('[browser] (console.error, non bloquant):', consoleErrors.slice(0, 5));
console.log(ok ? '\n[browser] OK ✓ — le runtime navigateur fonctionne' : '\n[browser] ECHEC ✗');
process.exit(ok ? 0 : 1);
