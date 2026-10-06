/* =========================================================================
   BROWSER — the platform suite.

   smoke.js covers the shopping journey. This one covers the things that
   journey sits on top of and that no amount of static analysis can prove:

     · Bootstrap namespace collisions
     · accessibility — labels, dialogs, focus, the keyboard
     · reduced motion
     · mobile layout and reachability
     · opening the site straight from the filesystem

   Several of these assertions exist because the bug actually happened.
   ========================================================================= */
const puppeteer = require('puppeteer-core');
const path = require('path');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://127.0.0.1:8777';
const SHOTS = path.join(__dirname, 'shots');
require('fs').mkdirSync(SHOTS, { recursive: true });

const problems = [];
const sleep = ms => new Promise(r => setTimeout(r, ms));
let step = 0;

function watch(page, label) {
  page.on('console', m => {
    if (m.type() !== 'error' && m.type() !== 'warning') return;
    const t = m.text();
    if (/favicon/i.test(t)) return;
    problems.push(`[${label}] console.${m.type()}: ${t}`);
  });
  page.on('pageerror', e => problems.push(`[${label}] pageerror: ${e.message}`));
  page.on('requestfailed', r => {
    if (r.url().includes('favicon')) return;
    problems.push(`[${label}] requestfailed: ${r.url()} — ${r.failure()?.errorText}`);
  });
}

async function shot(page, name, full = false) {
  step++;
  await page.screenshot({ path: path.join(SHOTS, `${String(step).padStart(2, '0')}-${name}.png`), fullPage: full });
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--force-color-profile=srgb'],
    defaultViewport: { width: 1440, height: 950 },
  });

  // ================= BOOTSTRAP COLLISION GUARDS =================
  // Bootstrap styles its own components with state selectors whose
  // specificity beats a single-class override. While our components shared
  // those names the primary button reverted to Bootstrap blue on hover and
  // every toast was display:none. Assert the rendered result, not the cascade.
  const page = await browser.newPage();
  watch(page, 'shop');
  await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle2' });
  await sleep(700);

  const toast = await page.evaluate(() => {
    UI.toast({ kind: 'success', title: 'Regression probe' });
    const node = document.querySelector('.ui-toast');
    if (!node) return { found: false };
    const cs = getComputedStyle(node);
    const r = node.getBoundingClientRect();
    return { found: true, display: cs.display, width: Math.round(r.width) };
  });
  console.log('toast:', JSON.stringify(toast));
  if (!toast.found) problems.push('toast element was never created');
  else if (toast.display === 'none' || toast.width === 0) {
    problems.push(`toast is invisible (display:${toast.display}, width:${toast.width})`);
  }

  const btnBox = await page.evaluate(() => {
    const r = document.querySelector('.ui-btn-primary').getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  await page.mouse.move(btnBox.x, btnBox.y);
  await sleep(250);
  const hover = await page.evaluate(() => {
    const cs = getComputedStyle(document.querySelector('.ui-btn-primary'));
    return { bg: cs.backgroundColor, color: cs.color };
  });
  console.log('primary button hover:', JSON.stringify(hover));
  const BOOTSTRAP_BLUES = ['rgb(13, 110, 253)', 'rgb(11, 94, 215)', 'rgb(10, 88, 202)'];
  if (BOOTSTRAP_BLUES.includes(hover.bg)) {
    problems.push(`primary button hover fell back to Bootstrap blue (${hover.bg})`);
  }
  if (hover.bg === hover.color) problems.push('button text is the same colour as its background on hover');
  await page.mouse.move(5, 5);
  await sleep(200);

  // A toast must never cover a sheet's primary action — it accepts clicks,
  // so any overlap swallows the tap.
  //
  // Open a bouquet that adds without further input. The first card in the
  // best-seller strip is the Paper Bills bouquet, which rightly refuses to
  // be added until a cash amount is given, and would leave the cart empty
  // and this check passing on nothing.
  await page.evaluate(() => {
    [...document.querySelectorAll('#catalogGrid .card-product')]
      .find(c => c.dataset.id === '101').querySelector('[data-open]').click();
  });
  await sleep(800);
  await page.evaluate(() => document.getElementById('addToCart').click());
  await sleep(600);
  await page.click('#cartButton');
  await sleep(700);

  const cartReady = await page.evaluate(() => ({
    open: document.getElementById('cartSheet').classList.contains('is-open'),
    lines: document.querySelectorAll('#cartBody .cart-line').length,
    action: (document.querySelector('#cartFoot button') || {}).id,
  }));
  console.log('cart before the overlap probe:', JSON.stringify(cartReady));
  if (!cartReady.open) problems.push('cart sheet did not open for the overlap probe');
  if (cartReady.lines !== 1) problems.push('nothing was added to the cart before the overlap probe');
  if (cartReady.action !== 'toDetails') {
    problems.push(`expected the Checkout action, got "${cartReady.action}"`);
  }

  const overlap = await page.evaluate(() => {
    UI.toast({ kind: 'info', title: 'Overlap probe', message: 'Checking the action button is clear' });
    const t = document.querySelector('.ui-toast').getBoundingClientRect();
    const a = document.querySelector('#cartFoot button').getBoundingClientRect();
    const hit = !(t.right < a.left || t.left > a.right || t.bottom < a.top || t.top > a.bottom);
    const at = document.elementFromPoint(a.left + a.width / 2, a.top + a.height / 2);
    return { hit, receives: at ? (at.id || at.className) : null };
  });
  console.log('toast/action overlap:', JSON.stringify(overlap));
  if (overlap.hit) problems.push('a toast overlaps the sheet primary action');
  if (String(overlap.receives).includes('ui-toast')) {
    problems.push('a toast intercepts clicks meant for the primary action');
  }
  await shot(page, 'cart-with-toast');

  // ================= LIGHT ONLY =================
  // The shop is light in every environment. A visitor whose operating
  // system is set to dark must still get the light palette, and Bootstrap
  // must be told the same thing so its own components do not flip.
  await page.keyboard.press('Escape');
  await sleep(600);

  async function paletteUnder(scheme) {
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
    await sleep(350);
    return page.evaluate(() => {
      const body = getComputedStyle(document.body);
      const root = getComputedStyle(document.documentElement);
      return {
        bg: body.backgroundColor,
        fg: body.color,
        surface: root.getPropertyValue('--surface').trim(),
        colorScheme: root.colorScheme,
        bs: document.documentElement.getAttribute('data-bs-theme'),
      };
    });
  }

  const underLight = await paletteUnder('light');
  const underDark = await paletteUnder('dark');
  console.log('OS light:', JSON.stringify(underLight));
  console.log(' OS dark:', JSON.stringify(underDark));

  if (JSON.stringify(underLight) !== JSON.stringify(underDark)) {
    problems.push('the palette changed with the operating system; the shop should be light only');
  }
  if (underDark.bg !== 'rgb(251, 251, 253)') {
    problems.push(`background under a dark OS is ${underDark.bg}, expected the light canvas`);
  }
  if (underDark.surface !== '#ffffff') {
    problems.push(`--surface under a dark OS is ${underDark.surface}, expected #ffffff`);
  }
  if (underDark.bs !== 'light') {
    problems.push(`Bootstrap theme is "${underDark.bs}" under a dark OS, expected "light"`);
  }
  if (underDark.colorScheme !== 'light') {
    problems.push(`color-scheme is "${underDark.colorScheme}", expected "light" so form controls stay light`);
  }

  const stale = await page.evaluate(() => ({
    toggle: !!document.getElementById('themeToggle'),
    syncTheme: typeof UI.syncTheme,
  }));
  if (stale.toggle) problems.push('the removed theme toggle is still in the markup');
  if (stale.syncTheme !== 'undefined') problems.push('UI.syncTheme survived the light-only change');

  await shot(page, 'light-under-dark-os');
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
  await sleep(300);
  await page.close();

  // ================= ACCESSIBILITY =================
  const a11y = await browser.newPage();
  watch(a11y, 'a11y');
  await a11y.goto(`${BASE}/index.html`, { waitUntil: 'networkidle2' });
  await sleep(700);

  const labels = await a11y.evaluate(() => ({
    imgsMissingAlt: [...document.images].filter(i => !i.hasAttribute('alt')).length,
    unlabelledButtons: [...document.querySelectorAll('button')].filter(b =>
      !(b.textContent || '').trim() && !b.getAttribute('aria-label') && !b.getAttribute('title')
    ).map(b => b.id || b.className),
    dialogsWithoutLabel: [...document.querySelectorAll('[role="dialog"]')]
      .filter(d => !d.getAttribute('aria-labelledby')).length,
    liveRegions: document.querySelectorAll('[aria-live]').length,
    inputsWithoutLabel: [...document.querySelectorAll('input:not([type=hidden]), select, textarea')]
      .filter(el => !el.id || !document.querySelector(`label[for="${el.id}"]`))
      .filter(el => !el.getAttribute('aria-label') && !el.closest('label'))
      .map(el => el.id || el.name || el.tagName),
  }));
  console.log('a11y:', JSON.stringify(labels));
  if (labels.imgsMissingAlt) problems.push(`${labels.imgsMissingAlt} images without alt`);
  if (labels.unlabelledButtons.length) problems.push(`unlabelled buttons: ${labels.unlabelledButtons.join(', ')}`);
  if (labels.dialogsWithoutLabel) problems.push(`${labels.dialogsWithoutLabel} dialogs without aria-labelledby`);
  if (labels.inputsWithoutLabel.length) problems.push(`unlabelled fields: ${labels.inputsWithoutLabel.join(', ')}`);

  // Opening a sheet must move focus into it; Escape must close it and give
  // focus back. A closed sheet used `visibility`, which is inherited and
  // does not propagate in the same tick, so the focus call was refused.
  await a11y.evaluate(() => document.querySelector('[data-open]').focus());
  await a11y.evaluate(() => document.querySelector('[data-open]').click());
  await sleep(700);
  const focusIn = await a11y.evaluate(() =>
    document.getElementById('productSheet').contains(document.activeElement));
  await a11y.keyboard.press('Escape');
  await sleep(700);
  const afterEscape = await a11y.evaluate(() => ({
    closed: document.getElementById('productSheet').getAttribute('aria-hidden'),
    focusRestored: !!document.activeElement.closest('.card-product'),
    scrollUnlocked: document.body.style.position !== 'fixed',
  }));
  console.log('keyboard: focus entered sheet =', focusIn, '| after Escape:', JSON.stringify(afterEscape));
  if (!focusIn) problems.push('opening a sheet did not move focus into it');
  if (afterEscape.closed !== 'true') problems.push('Escape did not close the sheet');
  if (!afterEscape.focusRestored) problems.push('focus was not returned to the trigger');
  if (!afterEscape.scrollUnlocked) problems.push('page scroll stayed locked after closing');
  await a11y.close();

  // ================= REDUCED MOTION =================
  const calm = await browser.newPage();
  watch(calm, 'reduced-motion');
  await calm.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await calm.goto(`${BASE}/index.html`, { waitUntil: 'networkidle2' });
  await sleep(700);

  const calmState = await calm.evaluate(() => ({
    cards: document.querySelectorAll('#catalogGrid .card-product').length,
    // Reveal animations must not leave content stuck invisible.
    hidden: [...document.querySelectorAll('.card-product')]
      .filter(c => parseFloat(getComputedStyle(c).opacity) < 0.9).length,
  }));
  await calm.evaluate(() => document.querySelector('[data-open]').click());
  await sleep(400);
  const calmSheet = await calm.evaluate(() => ({
    open: document.getElementById('productSheet').classList.contains('is-open'),
    focused: document.getElementById('productSheet').contains(document.activeElement),
  }));
  console.log('reduced motion:', JSON.stringify(calmState), JSON.stringify(calmSheet));
  if (calmState.hidden) problems.push(`${calmState.hidden} cards stayed invisible under reduced motion`);
  if (!calmSheet.open) problems.push('sheet did not open under reduced motion');
  if (!calmSheet.focused) problems.push('focus did not move into the sheet under reduced motion');
  await shot(calm, 'reduced-motion');
  await calm.close();

  // ================= MOBILE =================
  const phone = await browser.newPage();
  watch(phone, 'mobile');
  await phone.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await phone.goto(`${BASE}/index.html`, { waitUntil: 'networkidle2' });
  await sleep(800);

  const overflow = await phone.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  console.log('mobile horizontal overflow:', overflow, 'px');
  if (overflow > 2) problems.push(`mobile page scrolls horizontally by ${overflow}px`);

  // The header nav collapses below the md breakpoint, so the footer has to
  // carry the routes.
  const reachable = await phone.evaluate(() => {
    const visible = el => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
    };
    const hrefs = [...document.querySelectorAll('a[href]')].filter(visible)
      .map(a => a.getAttribute('href'));
    return {
      admin: hrefs.some(h => h && h.includes('admin.html')),
      track: hrefs.some(h => h === '#track'),
      // The removed page must not be linked from anywhere.
      removedPage: hrefs.some(h => h && h.includes('structures.html')),
    };
  });
  console.log('mobile reachability:', JSON.stringify(reachable));
  if (!reachable.admin) problems.push('the order desk is unreachable on a phone');
  if (!reachable.track) problems.push('order tracking is unreachable on a phone');
  if (reachable.removedPage) problems.push('a link to the removed Under-the-Hood page survives');

  await phone.evaluate(() => document.querySelector('#catalog').scrollIntoView());
  await sleep(600);
  await shot(phone, 'mobile-catalog');

  await phone.evaluate(() => document.querySelector('[data-open]').click());
  await sleep(900);
  const sheetOverflow = await phone.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (sheetOverflow > 2) problems.push(`mobile sheet overflows by ${sheetOverflow}px`);
  await shot(phone, 'mobile-product');
  await phone.close();

  // ================= file:// =================
  // The site must work when opened straight from the filesystem, which is
  // why the scripts are classic <script src> tags rather than ES modules.
  const local = await browser.newPage();
  watch(local, 'file');
  const fileUrl = 'file:///' + path.join(__dirname, '..', 'index.html').replace(/\\/g, '/');
  await local.goto(fileUrl, { waitUntil: 'networkidle2' });
  await sleep(900);
  const fileCards = await local.evaluate(() =>
    document.querySelectorAll('#catalogGrid .card-product').length);
  console.log('cards when opened from the filesystem:', fileCards);
  if (fileCards !== 11) problems.push(`file:// render gave ${fileCards} cards`);
  await local.close();

  await browser.close();

  console.log('\n================ PROBLEMS ================');
  console.log(problems.length ? problems.map(p => ' - ' + p).join('\n') : 'none');
  console.log(`\nscreenshots in ${SHOTS}`);
  process.exit(problems.length ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR:', e); process.exit(2); });
