/* =========================================================================
   REVIEWER SCREENSHOTS — takes every screenshot the reviewer pages use,
   from the real site running in Chrome.

   Needs Google Chrome and puppeteer-core (install it outside the project
   and point NODE_PATH at it, as for tests/smoke.js).
   Run: node tools/reviewer/shots.js
   ========================================================================= */

var fs = require('fs');
var vm = require('vm');
var ROOT = __dirname + '/../../';
vm.runInThisContext(fs.readFileSync(ROOT + 'js/core.js', 'utf8'), { filename: 'core.js' });
var puppeteer = require('puppeteer-core');
var wait = require('timers/promises').setTimeout;

var CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
var PAGE_URL = 'file:///' + swapText(ROOT, '\\', '/') + 'index.html';
var SHOTS = ROOT + 'docs/reviewer/shots/';

var JPEG = { type: 'jpeg', quality: 82 };   // photographs of the screen stay small in the PDF

/* A screenshot's file and format.         Time O(1) · Space O(1) */
function shotFile(name, extra) {
    return copyRecord(copyRecord(JPEG, { path: SHOTS + name + '.jpg' }), extra || {});
}

/* Let animations settle.                  Time O(1) · Space O(1) */
async function settle(ms) { await wait(ms || 700); }

/* The visible window.                     Time O(1) · Space O(1) */
async function view(page, name) {
    await page.screenshot(shotFile(name));
    console.log('  ' + name);
}

/* One element, scrolled into view.        Time O(1) · Space O(1) */
async function element(page, selector, name) {
    var handle = await page.$(selector);
    await handle.evaluate(function (el) { el.scrollIntoView({ block: 'center' }); });
    await settle(300);
    await handle.screenshot(shotFile(name));
    console.log('  ' + name);
}

/* The top part of a tall element.         Time O(1) · Space O(1) */
async function topOf(page, selector, height, name) {
    await page.$eval(selector, function (el) { el.scrollIntoView({ block: 'start' }); });
    await settle(300);
    var box = await (await page.$(selector)).boundingBox();
    // The box is relative to the window; a clip is relative to the page.
    var scrollY = await page.evaluate(function () { return window.scrollY; });
    await page.screenshot(shotFile(name, { clip: { x: box.x, y: box.y + scrollY, width: box.width,
        height: height < box.height ? height : box.height } }));
    console.log('  ' + name);
}

/*                                         Time O(n) · Space O(1) */
async function typeInto(page, selector, text) {
    await page.click(selector, { clickCount: 3 });
    await page.keyboard.press('Backspace');
    await page.type(selector, text);
}

/* Scroll a sheet's body to an element inside it.  Time O(1) · Space O(1) */
async function scrollSheetTo(page, selector) {
    await page.$eval(selector, function (el) { el.scrollIntoView({ block: 'center' }); });
    await settle(300);
}

async function run() {
    if (!fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS, { recursive: true });
    var browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--allow-file-access-from-files'] });
    var page = await browser.newPage();
    page.setDefaultTimeout(15000);
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
    await page.setViewport({ width: 1280, height: 860 });
    await page.goto(PAGE_URL, { waitUntil: 'networkidle0' });
    // Never send through the shop's real EmailJS account from an automated run.
    await page.evaluate(function () { EMAIL_CONFIG.serviceId = ''; EMAIL_CONFIG.templateId = ''; EMAIL_CONFIG.publicKey = ''; });

    console.log('shop');
    await view(page, 'cover-home');
    var best = await page.evaluateHandle(function () { return document.getElementById('bestSellers').closest('section'); });
    await best.evaluate(function (el) { el.scrollIntoView({ block: 'start' }); });
    await settle(300);
    await best.screenshot(shotFile('m01-best'));
    console.log('  m01-best');
    await element(page, '#catalogGrid .card-product', 'm01-card');
    await page.click('[data-branch="flower-bouquets"]');
    await settle(300);
    await topOf(page, '#catalog', 760, 'm02-chips');
    await page.click('[data-branch=""]');
    await page.type('#searchInput', 'matcha');
    await settle(500);
    // The search bar is sticky; a full-window capture keeps it in the picture.
    await page.$eval('#catalogTitle', function (el) { el.scrollIntoView({ block: 'start' }); });
    await settle(400);
    await view(page, 'm03-search');
    await page.click('#clearFilters');
    await settle(300);

    await page.click('#catalogGrid [data-open-product="101"]');
    await settle();
    await view(page, 'm04-real');
    await page.click('[data-arrangement="layered"]');
    await page.click('[data-color="matcha"]');
    await settle(300);
    await view(page, 'm04-sheet');
    await page.click('[data-arrangement="round"]');
    await page.click('[data-color="red"]');
    await page.click('[data-count="12"]');
    await page.click('#addToCart');
    await settle();

    await page.click('#catalogGrid [data-open-product="201"]');
    await settle();
    await page.type('input[data-field="detail"]', '5870');
    await scrollSheetTo(page, '#billHint');
    await view(page, 'm05-money');
    await page.keyboard.press('Escape');
    await settle();

    await page.click('#catalogGrid [data-open-product="203"]');
    await settle();
    await page.click('#addToCart');
    await settle();
    await page.click('#basketButton');
    await settle();
    await view(page, 'm06-cart');

    await page.click('#basketFoot [data-step="details"]');
    await settle(400);
    await typeInto(page, '[data-form="name"]', 'Lara Mendoza');
    await typeInto(page, '[data-form="email"]', 'lara@gmail.com');
    await typeInto(page, '[data-form="phone"]', '0917 555 7788');
    await scrollSheetTo(page, '#slotWrap');
    await view(page, 'm07-pickup');
    await page.click('[data-mode="delivery"]');
    await page.type('[data-form="address"]', '450 España Blvd.');
    await page.type('[data-form="city"]', 'Manila');
    await page.keyboard.press('Tab');
    await settle(800);
    await page.click('[data-courier="flash"]');
    await scrollSheetTo(page, '#deliveryExtras');
    await view(page, 'm07-delivery');
    await page.click('[data-mode="pickup"]');
    await settle(300);
    await page.click('#basketFoot [data-step="review"]');
    await settle(400);
    await page.type('[data-form="gcash"]', '1234567890123');
    await scrollSheetTo(page, '[data-pay-method="gcash-50"]');
    await view(page, 'm09-pay');
    await page.click('#placeOrder');
    await settle();
    await page.click('#doneFoot [data-receipt]');
    await settle();
    await view(page, 'm09-receipt');
    await page.keyboard.press('Escape');
    await settle();
    await page.keyboard.press('Escape');
    await settle();

    await page.click('#trackButton');
    await settle();
    await page.type('#trackRef', 'SU-201');
    await page.type('#trackPhone', '0917 555 0142');
    await page.click('#trackBody button[type="submit"]');
    await settle(400);
    await view(page, 'm10-track');
    await page.keyboard.press('Escape');
    await settle();

    console.log('order desk');
    await page.evaluate(function () { location.hash = '#admin'; });
    await settle(400);
    var owner = await page.evaluate(function () { return EMAIL_CONFIG.adminEmail; });
    await page.type('#loginEmail', owner);
    await page.type('#passcodeInput', 'admin123');
    await view(page, 'm12-login');
    await page.click('#loginSubmit');
    await settle(400);
    await view(page, 'm12-code');
    var code = await page.$eval('#otpDemo .otp-demo-code', function (el) { return el.textContent; });
    await page.type('#otpInput', code);
    await page.click('#otpSubmit');
    await settle(400);
    await page.click('[data-period-kind="month"]');
    await settle(300);
    await view(page, 'm12-overview');
    await page.click('[data-tab="quotes"]');
    await settle(300);
    await view(page, 'm08-queue');
    await page.click('#adminMain [data-act="quote"]');
    await settle();
    await view(page, 'm08-editor');
    await page.keyboard.press('Escape');
    await settle();
    await page.click('[data-tab="production"]');
    await settle(300);
    await view(page, 'm10-production');
    await page.click('[data-tab="completed"]');
    await settle(300);
    await view(page, 'm11-completed');
    await page.click('[data-tab="voided"]');
    await settle(300);
    await view(page, 'm11-voided');
    await page.click('[data-tab="outbox"]');
    await settle(300);
    await view(page, 'm09-outbox');

    await browser.close();
}

run().then(function () { console.log('done'); }, function (e) { console.log(e); process.exitCode = 1; });
