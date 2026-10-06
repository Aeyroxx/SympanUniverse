/* =========================================================================
   SMOKE — the whole site in a real browser, as a customer and as staff.

   Needs Google Chrome and the puppeteer-core package (it is not part of
   the site; install it anywhere and point NODE_PATH at it). Set SHOTS to
   a folder to save screenshots along the way.
   Run: node tests/smoke.js
   ========================================================================= */

var t = require('./harness');
var check = t.check, section = t.section;
var puppeteer = require('puppeteer-core');
var wait = require('timers/promises').setTimeout;

var CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
var PAGE_URL = 'file:///' + swapText(t.ROOT, '\\', '/') + 'index.html';
var SHOTS = process.env.SHOTS || '';
var ADMIN_EMAIL = 'kurlchester31feliciano@gmail.com';   // replaced by the owner account's email once the page loads

/*                                         Time O(1) · Space O(1) */
async function shot(page, name) {
    if (SHOTS) await page.screenshot({ path: SHOTS + '/' + name + '.png' });
}

/* Let springs and debounces settle.       Time O(1) · Space O(1) */
async function settle(ms) {
    await wait(ms || 650);
}

/*                                         Time O(n) · Space O(n) */
async function textOf(page, selector) {
    return page.$eval(selector, function (el) { return el.textContent; });
}

/* Clear a field and type into it.         Time O(n) · Space O(1) */
async function typeInto(page, selector, text) {
    await page.click(selector, { clickCount: 3 });
    await page.keyboard.press('Backspace');
    await page.type(selector, text);
}

/* Is an element shown?                    Time O(1) · Space O(1) */
async function shown(page, selector) {
    return page.$eval(selector, function (el) { return el.offsetParent !== null; });
}

/* Fill in the customer's details at checkout.  Time O(n) · Space O(1) */
async function fillDetails(page, email, phone) {
    await typeInto(page, '[data-form="name"]', 'Lara Mendoza');
    await typeInto(page, '[data-form="email"]', email);
    await typeInto(page, '[data-form="phone"]', phone);
}

/* Tick one of the two agreements at checkout.  Time O(1) · Space O(1) */
async function agree(page, field) {
    await page.$eval('[data-form="' + field + '"]', function (box) { if (!box.checked) box.click(); });
    await settle(150);
}

/* Sign in to the order desk, through both steps.  Time O(1) · Space O(1) */
async function signIn(page) {
    await page.evaluate(function () { location.hash = '#admin'; });
    await settle(300);
    if (await shown(page, '#adminConsole')) return;
    await typeInto(page, '#loginEmail', ADMIN_EMAIL);
    await typeInto(page, '#passcodeInput', 'admin123');
    await page.click('#loginSubmit');
    await settle(300);
    var code = await page.$eval('#otpDemo .otp-demo-code', function (el) { return el.textContent; });
    await typeInto(page, '#otpInput', code);
    await page.click('#otpSubmit');
    await settle(300);
}

/* Run the journey; whatever happens, take a picture and close Chrome. */
async function run() {
    var browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--allow-file-access-from-files'] });
    var page = await browser.newPage();
    try {
        await journey(page);
    } catch (e) {
        await shot(page, 'zz-failure');
        check('the journey ran to the end', false, e.message);
    } finally {
        await browser.close();
    }
}

async function journey(page) {
    page.setDefaultTimeout(15000);
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }, { name: 'prefers-reduced-motion', value: 'no-preference' }]);
    await page.setViewport({ width: 1280, height: 900 });
    var errors = [];
    page.on('pageerror', function (e) { listAdd(errors, 'pageerror: ' + e.message); });
    page.on('console', function (m) { if (m.type() === 'error') listAdd(errors, 'console: ' + m.text()); });
    page.on('dialog', function (d) { listAdd(errors, 'dialog opened: ' + d.message()); d.dismiss(); });

    await page.goto(PAGE_URL, { waitUntil: 'networkidle0' });
    // Never send through the shop's real EmailJS account from an automated run.
    await page.evaluate(function () {
        EMAIL_CONFIG.serviceId = ''; EMAIL_CONFIG.templateId = ''; EMAIL_CONFIG.publicKey = '';
    });
    // The owner's account was built from js/email-config.js when the page started.
    ADMIN_EMAIL = await page.evaluate(function () { return accountById(1).email; });
    await shot(page, '01-home');

    /* ------------------------------------------------------------------ */
    section('homepage and navigation');
    var home = await page.evaluate(function () {
        var visibleAdminLinks = 0, links = document.querySelectorAll('a, button');
        for (var i = 0; i < links.length; i++) {
            var el = links[i], href = el.getAttribute('href') || '';
            if (el.offsetParent !== null && (textHas(toLower(href), 'admin') || textHas(toLower(el.textContent), 'admin'))) visibleAdminLinks++;
        }
        var body = document.getElementById('shopView').textContent;
        return { cards: document.querySelectorAll('#catalogGrid .card-product').length,
                 trackSection: document.getElementById('track') !== null, occasion: document.getElementById('occasionChips') !== null,
                 adminLinks: visibleAdminLinks, cart: textHas(document.getElementById('basketButton').textContent, 'Cart'),
                 request: textHas(document.getElementById('basketButton').textContent, 'Request'),
                 startsAt: textHas(body, 'Starts at ₱55'), picture: textHas(body, '₱650'), customized: textHas(body, 'Customized Pricing'),
                 from: textHas(body, 'From ₱'), given: textHas(toLower(body), 'given so far'), custom: textHas(body, 'Custom Bouquet') };
    });
    check('ten products, no Custom Bouquet', home.cards === 10 && !home.custom, home.cards);
    check('no Track section, no occasion filter, no visible admin link', !home.trackSection && !home.occasion && home.adminLinks === 0);
    check('the button says Cart, not Request', home.cart && !home.request);
    check('flowers "Starts at", the picture bouquet ₱650, gifts Customized Pricing', home.startsAt && home.picture && home.customized && !home.from);
    check('"Sold", not "Given so far"', !home.given);
    var bannerUp = function () { return page.$eval('#privacyBanner', function (b) { return !b.classList.contains('hidden'); }); };
    check('a privacy banner cites the Data Privacy Act', await bannerUp() &&
          textHas(await textOf(page, '#privacyBanner'), 'Data Privacy Act of 2012'));
    await page.click('#privacyBanner [data-privacy-open="notice"]');
    await settle();
    var noticeText = await textOf(page, '#privacyBody');
    check('the Privacy Notice opens, with your rights and who to contact', textHas(noticeText, 'Your rights') &&
          textHas(noticeText, 'National Privacy Commission') && textHas(noticeText, 'How to reach us'));
    await page.click('[data-privacy-doc="terms"]');
    await settle(150);
    check('the order terms are one tap away', textHas(await textOf(page, '#privacyBody'), 'non-refundable'));
    await shot(page, '00-privacy');
    await page.keyboard.press('Escape');
    await settle();
    await page.click('#privacyDismiss');
    await settle(150);
    check('"Got it" puts the banner away', !(await bannerUp()));
    var samples = await page.$$eval('#catalogGrid .badge-sample', function (els) { return els.length; });
    check('every product has a photo; the two from the web say "Sample photo"', samples === 2 &&
          (await page.$$('#catalogGrid .card-media-empty')).length === 0, samples);
    await page.click('#catalogGrid [data-open-product="302"]');
    await settle();
    var beerCaption = await textOf(page, '.ref-caption');
    check('a sample photo is credited, with its licence', textHas(beerCaption, 'Sample photo') && textHas(beerCaption, 'CC BY-SA 4.0') &&
          textHas(await textOf(page, '#productBody'), 'not the shop\'s own work'));
    await page.keyboard.press('Escape');
    await settle();

    /* ------------------------------------------------------------------ */
    section('flower customisation');
    await page.click('#catalogGrid [data-open-product="101"]');
    await settle();
    var refSrc = function () { return page.$eval('#refFrame img', function (img) { return img.getAttribute('src'); }); };
    check('red round shows the real photograph', (await refSrc()) === 'assets/products/roses-round-1.jpg');
    await page.click('[data-color="emerald-green"]');
    await page.click('[data-arrangement="layered"]');
    check('layered emerald shows its preview', (await refSrc()) === 'assets/colors/rose-layered-emerald-green.jpg');
    await page.click('[data-arrangement="round"]');
    await page.click('[data-color="red"]');
    await page.click('[data-count="12"]');
    var roseSheet = await textOf(page, '#productSheet');
    check('flowers have a price, not a quote request', !textHas(roseSheet, 'quote request') && !textHas(roseSheet, 'quotation') &&
          textHas(await textOf(page, '#productFoot'), '₱555.00'));
    check('the button says Add to cart', textHas(await textOf(page, '#addToCart'), 'Add to cart'));
    await shot(page, '02-rose');
    await page.click('#addToCart');
    await settle();
    check('added to the cart', (await textOf(page, '#basketCount')) === '1');

    /* ------------------------------------------------------------------ */
    section('a flower cart is paid at checkout, pickup by date only');
    await page.click('#basketButton');
    await settle();
    check('the cart is called a cart', (await textOf(page, '#basketTitle')) === 'Your cart');
    await page.click('#basketFoot [data-step="details"]');
    await settle(300);
    await fillDetails(page, 'lara.flowers@gmail.com', '0917 555 7788');
    check('pickup asks for a date, with no time slots', (await page.$$('#basketBody [data-slot]')).length === 0 &&
          textHas(await textOf(page, '#slotWrap'), 'pickup place'));
    await page.click('#basketFoot [data-step="review"]');
    await settle(300);
    check('without agreeing, checkout stops at the agreement', textHas(await textOf(page, '#basketBody'), 'tick the box') &&
          (await page.$$('#basketBody .consent-check.is-invalid')).length === 2);
    await agree(page, 'consent');
    check('ticking a box clears its error at once', (await page.$$('#basketBody .consent-check.is-invalid')).length === 1);
    await agree(page, 'terms');
    check('the pickup date is called an estimate', textHas(await textOf(page, '#basketBody .schedule-note'), 'Pickup dates are estimates'));
    await page.click('#basketFoot [data-step="review"]');
    await settle(300);
    check('review shows the total and the two GCash options', textHas(await textOf(page, '#basketBody'), 'Total') &&
          (await page.$$('[data-pay-method]')).length === 2);
    await page.click('[data-pay-method="gcash-100"]');
    check('the button shows what is due now', textHas(await textOf(page, '#placeOrder'), '₱555.00'));
    await page.type('[data-form="gcash"]', '1234567890123');
    await shot(page, '03-pay');
    await page.click('#placeOrder');
    await settle();
    var done = await textOf(page, '#doneBody');
    check('order confirmed at once, with the tracking number', (await textOf(page, '#doneTitle')) === 'Order confirmed' && textHas(done, 'SU-223'));
    check('the confirmation says the date is an estimate', textHas(done, 'Pickup dates are estimates'));
    var confirmMail = await page.evaluate(function () { var m = outbox[outbox.length - 1]; return { to: m.to, subject: m.subject, body: m.body }; });
    check('a confirmation email with the tracking number is written', confirmMail.to === 'lara.flowers@gmail.com' &&
          confirmMail.subject === 'Order confirmed: SU-223' && textHas(confirmMail.body, 'Tracking number: SU-223'));
    await shot(page, '04-confirmed');
    await page.click('#doneFoot [data-track-ref]');
    await settle();
    check('tracking shows it being made', textHas(await textOf(page, '#trackBody'), 'In production'));
    await page.keyboard.press('Escape');
    await settle();

    /* ------------------------------------------------------------------ */
    section('a quote product becomes a quote request');
    await page.click('#catalogGrid [data-open-product="201"]');
    await settle();
    check('the money bouquet is a quote request', textHas(await textOf(page, '.pricing-block'), 'Customized Pricing') &&
          textHas(await textOf(page, '#productFoot'), 'Quote request'));
    await page.type('input[data-field="detail"]', '5000');
    await page.click('[data-use-bills]');
    check('greedy bill count', await page.$eval('input[data-field="count"]', function (el) { return el.value; }) === '5');
    await page.click('#addToCart');
    await settle();
    await page.click('#basketButton');
    await settle();
    check('the cart explains it needs a quote', textHas(await textOf(page, '#basketFoot'), 'quote request'));
    await page.click('#basketFoot [data-step="details"]');
    await settle(300);
    await fillDetails(page, 'lara.gifts@gmail.com', '0917 555 8899');
    await page.click('[data-mode="delivery"]');
    await page.type('[data-form="address"]', '450 España Blvd.');
    await page.type('[data-form="city"]', 'Manila');
    await page.keyboard.press('Tab');
    await settle(800);
    check('Manila needs a courier', (await page.$$('[data-courier]')).length === 2);
    check('delivery dates and times can move with the weather', textHas(await textOf(page, '#basketBody .schedule-note'), 'weather'));
    await page.click('[data-courier="flash"]');
    await page.click('[data-slot]:not([disabled])');
    await agree(page, 'consent');
    await agree(page, 'terms');
    await page.click('#basketFoot [data-step="review"]');
    await settle(300);
    check('no payment is taken for a quote request', (await page.$$('[data-pay-method]')).length === 0);
    await page.click('#sendRequest');
    await settle();
    check('quote request sent as SU-224', (await textOf(page, '#doneTitle')) === 'Quote request sent' && textHas(await textOf(page, '#doneBody'), 'SU-224'));
    await page.click('#doneFoot [data-sheet-done]');
    await settle();

    /* ------------------------------------------------------------------ */
    section('order desk: email, password, then a code');
    await page.evaluate(function () { location.hash = '#admin'; });
    await settle(300);
    check('the desk asks for an email and a password', await shown(page, '#loginEmail') && await shown(page, '#passcodeInput') &&
          !(await shown(page, '#adminConsole')));
    await page.type('#loginEmail', ADMIN_EMAIL);
    await page.type('#passcodeInput', 'wrong');
    await page.click('#loginSubmit');
    check('a wrong password is refused', textHas(await textOf(page, '#loginError'), 'email or password'));
    await typeInto(page, '#passcodeInput', 'admin123');
    await page.click('#loginSubmit');
    await settle(300);
    check('the right password asks for a code', await shown(page, '#otpForm') && !(await shown(page, '#adminConsole')));
    await shot(page, '05-code');
    await page.type('#otpInput', '000000');
    await page.click('#otpSubmit');
    var otpError = await textOf(page, '#otpError');
    var code = await page.$eval('#otpDemo .otp-demo-code', function (el) { return el.textContent; });
    check('a wrong code is refused', code === '000000' || textHas(otpError, 'not right'));
    await typeInto(page, '#otpInput', code);
    await page.click('#otpSubmit');
    await settle(300);
    check('the right code opens the desk', await shown(page, '#adminConsole'));

    section('overview by day, month and year');
    check('opens on today', textHas(await textOf(page, '#adminMain'), 'Orders placed') && (await page.$('input[type="date"][data-period-pick]')) !== null);
    await page.click('[data-period-kind="month"]');
    await settle(200);
    check('monthly shows the days', (await page.$('input[type="month"][data-period-pick]')) !== null && textHas(await textOf(page, '#adminMain'), 'Day by day'));
    await shot(page, '06-month');
    await page.click('[data-period-kind="year"]');
    await settle(200);
    check('yearly shows the months', textHas(await textOf(page, '#adminMain'), 'Month by month') && (await page.$$('.period-table tbody tr')).length === 12);
    await page.click('[data-period-step="-1"]');
    await settle(200);
    check('previous and next move the period', textHas(await textOf(page, '#adminMain h2'), '2025'));
    await page.click('[data-period-kind="day"]');
    await page.click('[data-period-today]');

    section('quotation');
    await page.click('[data-tab="quotes"]');
    var queue = await page.$$eval('#adminMain .order-card .t-mono', function (els) {
        var out = [];
        for (var i = 0; i < els.length; i++) listAdd(out, els[i].textContent);
        return out;
    });
    check('quote requests are first in, first out', queue[0] === 'SU-220' && queue[queue.length - 1] === 'SU-224', glue(queue, ','));
    check('flower orders never reach the quote queue', !isIn(queue, 'SU-223'));
    await page.click('#adminMain [data-act="quote"][data-id="224"]');
    await settle();
    var quoteText = await textOf(page, '#deskBody');
    check('the quotation is pre-filled from past quotes', textHas(quoteText, 'Filled in from your last') &&
          await page.$eval('[data-q-line="0"][data-q-part="labor"]', function (el) { return el.value; }) !== '0');
    await shot(page, '07-quote');
    await page.click('#deskFoot [data-desk="send-quote"]');
    await settle();
    check('quotation sent', textHas(await textOf(page, '#deskBody'), 'Awaiting payment'));
    var quoteMail = await page.evaluate(function () { var m = outbox[outbox.length - 1]; return m.to + ' | ' + m.subject; });
    check('the customer is emailed that it is approved', quoteMail === 'lara.gifts@gmail.com | Your quotation for SU-224 is ready', quoteMail);
    await page.keyboard.press('Escape');
    await settle();

    section('the customer accepts with a 50% GCash down payment');
    await page.evaluate(function () { location.hash = '#top'; });
    await settle(300);
    await page.click('#trackButton');
    await settle();
    await page.type('#trackRef', 'su-224');
    await page.type('#trackPhone', 'Lara.Gifts@gmail.com');
    await page.click('#trackBody button[type="submit"]');
    await settle(200);
    check('tracking by email finds the order', textHas(await textOf(page, '#trackBody'), '50% Down Payment via GCash'));
    await page.click('[data-pay-method="gcash-50"]');
    await page.type('#gcashRef', '1234567890123');
    await page.click('#trackPay');
    await settle(200);
    check('a GCash reference cannot pay twice', textHas(await textOf(page, '#trackBody'), 'already on receipt'));
    await typeInto(page, '#gcashRef', '1234567890999');
    await page.click('#trackPay');
    await settle();
    var receiptText = await textOf(page, '#receiptBody');
    check('receipt shows paid and outstanding', textHas(receiptText, 'PARTIALLY PAID') && textHas(receiptText, 'Remaining balance'));
    await page.keyboard.press('Escape');
    await settle();
    await page.keyboard.press('Escape');
    await settle();

    section('production: mark ready, balances, undo');
    await signIn(page);
    await page.click('[data-tab="production"]');
    check('the release button says Mark ready', textHas(await textOf(page, '#adminMain [data-act="complete-next"]'), 'Mark ready'));
    // SU-218 (a demo customer, never emailed) is first; SU-217 still owes, so
    // the second press releases SU-223.
    for (var press = 0; press < 3 && !(await page.evaluate(function () { return orderById(223).status === 'completed'; })); press++) {
        await page.click('#adminMain [data-act="complete-next"]');
        await settle(200);
    }
    var readyMail = await page.evaluate(function () {
        var m = outbox[outbox.length - 1];
        return m.to + ' | ' + m.subject;
    });
    check('marking ready emails the customer', readyMail === 'lara.flowers@gmail.com | Your order SU-223 is ready for pickup', readyMail);
    await page.click('#adminMain [data-act="undo-complete"]');
    await settle(200);
    check('undo puts it back', await page.evaluate(function () { return orderById(223).status === 'paid'; }));

    section('editing, voiding, products, outbox');
    await page.click('#findInput');
    await page.type('#findInput', 'SU-224');
    await page.keyboard.press('Enter');
    await settle();
    await page.click('#deskFoot [data-act="edit"]');
    await settle(300);
    await typeInto(page, '[data-item="0"][data-item-field="quantity"]', '2');
    await page.click('#deskFoot [data-desk="save-edit"]');
    await settle();
    check('changes are logged', textHas(await textOf(page, '#deskBody'), 'Item 1 quantity: 1 → 2'));
    check('the order lists its emails', textHas(await textOf(page, '#deskBody'), 'Emails to the customer') &&
          textHas(await textOf(page, '#deskBody'), 'Your quotation for SU-224 is ready'));
    await page.keyboard.press('Escape');
    await settle();
    await page.click('[data-tab="payment"]');
    await page.click('#adminMain [data-act="void"][data-id="219"]');
    await settle();
    await page.type('#confirmReason', 'Customer no longer needs it');
    await page.click('#confirmGo');
    await settle();
    await page.click('[data-tab="voided"]');
    check('voided orders are kept and marked', textHas(await textOf(page, '#adminMain'), 'SU-219') &&
          textHas(await textOf(page, '#adminMain'), 'VOIDED – NON-REFUNDABLE'));
    await page.click('[data-tab="products"]');
    await page.click('#adminMain [data-act="product-toggle"][data-id="103"]');
    await settle();
    await page.click('#confirmGo');
    await settle();
    await page.click('[data-tab="outbox"]');
    var outboxText = await textOf(page, '#adminMain');
    check('the outbox lists the emails and says email is not set up', textHas(outboxText, 'Email is not connected yet') &&
          textHas(outboxText, 'Order confirmed: SU-223') && textHas(outboxText, 'Your order desk sign-in code'));
    check('sign-in codes are not shown in the outbox', await page.evaluate(function () {
        var codes = keepWhere(outbox, function (m) { return m.kind === 'otp'; });
        return codes.length > 0 && !textHas(document.getElementById('adminMain').textContent, cutText(codes[0].body, '\n')[2]);
    }));
    await shot(page, '08-outbox');
    await page.evaluate(function () { location.hash = '#catalog'; });
    await settle(300);
    check('a disabled product leaves the shop', (await page.$$('#catalogGrid .card-product')).length === 9);
    await signIn(page);
    await page.click('[data-tab="products"]');
    await page.click('#adminMain [data-act="product-toggle"][data-id="103"]');
    await settle(200);
    await page.click('#logoutButton');
    await settle(300);
    await page.evaluate(function () { location.hash = '#admin'; });
    await settle(300);
    check('signing out needs the full sign-in again', await shown(page, '#loginForm') && !(await shown(page, '#adminConsole')));

    section('desk accounts: a staff member signs in');
    await page.evaluate(function () { location.hash = '#admin'; });
    await settle(300);
    await typeInto(page, '#loginEmail', 'bea.cruz@example.com');
    await typeInto(page, '#passcodeInput', 'Staff2026');
    await page.click('#loginSubmit');
    await settle(300);
    check('a staff account\'s password leads to its own code step', await shown(page, '#otpForm') &&
          (await page.$('#otpDemo .otp-demo-code')) !== null);
    var staffCode = await page.$eval('#otpDemo .otp-demo-code', function (el) { return el.textContent; });
    await typeInto(page, '#otpInput', staffCode);
    await page.click('#otpSubmit');
    await settle(300);
    check('the header names who is signed in', textHas(await textOf(page, '#deskUser'), 'Bea Cruz · Staff'));
    var staffTabs = await textOf(page, '#adminTabs');
    check('staff see "My account" but not the logs', textHas(staffTabs, 'My account') && !textHas(staffTabs, 'Logs'));
    await page.click('[data-tab="account"]');
    await settle(200);
    check('staff can change their own password but not see other accounts', (await page.$('[data-account-form="password"]')) !== null &&
          (await page.$('[data-account-form="add"]')) === null);
    await page.click('[data-tab="outbox"]');
    await settle(200);
    var staffOutbox = await textOf(page, '#adminMain');
    check('staff never see the desk accounts\' emails in the Outbox', !textHas(staffOutbox, 'sign-in code') &&
          !textHas(staffOutbox, 'password reset code') && textHas(staffOutbox, 'ready for pickup'));
    await page.click('#logoutButton');
    await settle(300);
    await signIn(page);
    await page.click('[data-tab="account"]');
    await settle(200);
    check('an owner sees every account', textHas(await textOf(page, '#adminMain'), 'bea.cruz@example.com') &&
          (await page.$('[data-account-form="add"]')) !== null);
    await typeInto(page, '#newName', 'Lia Reyes');
    await typeInto(page, '#newEmail', 'lia.reyes@gmail.com');
    await typeInto(page, '#newPassword', 'Temp2026x');
    await typeInto(page, '#newConfirm', 'Temp2026x');
    await shot(page, '13-accounts');
    await page.click('[data-account-form="add"] button[type="submit"]');
    await settle(300);
    check('an owner adds an account to the array', textHas(await textOf(page, '#adminMain'), 'lia.reyes@gmail.com') &&
          await page.evaluate(function () { return staffAccounts.length === 3 && accountByEmail('lia.reyes@gmail.com').role === 'staff'; }));
    await page.click('#logoutButton');
    await settle(300);
    await page.evaluate(function () { location.hash = '#admin'; });
    await settle(300);

    /* ------------------------------------------------------------------ */
    section('password reset');
    await page.click('#forgotButton');
    await settle(200);
    check('"Forgot password?" asks for the email', await shown(page, '#resetForm'));
    await typeInto(page, '#resetEmail', ADMIN_EMAIL);
    await page.click('#resetSubmit');
    await settle(300);
    check('the next step asks for the code and a new password, without confirming the email',
          await shown(page, '#resetCodeForm') && textHas(await textOf(page, '#resetNote'), 'If '));
    var resetCode = await page.$eval('#resetDemo .otp-demo-code', function (el) { return el.textContent; });
    await typeInto(page, '#resetCode', resetCode);
    await typeInto(page, '#resetPassword', 'short');
    await typeInto(page, '#resetConfirm', 'short');
    await page.click('#resetCodeSubmit');
    await settle(200);
    check('a weak password is refused', textHas(await textOf(page, '#resetCodeError'), '8 to 64'));
    await typeInto(page, '#resetPassword', 'Ribbon2026');
    await typeInto(page, '#resetConfirm', 'Ribbon2026');
    await shot(page, '10-reset');
    await page.click('#resetCodeSubmit');
    await settle(300);
    check('the password changes, and the sign-in form says so', await shown(page, '#loginForm') &&
          textHas(await textOf(page, '#loginNotice'), 'password was changed'));
    await typeInto(page, '#loginEmail', ADMIN_EMAIL);
    await typeInto(page, '#passcodeInput', 'admin123');
    await page.click('#loginSubmit');
    await settle(200);
    check('the old password no longer works', textHas(await textOf(page, '#loginError'), 'email or password'));
    await typeInto(page, '#passcodeInput', 'Ribbon2026');
    await page.click('#loginSubmit');
    await settle(300);
    var newCode = await page.$eval('#otpDemo .otp-demo-code', function (el) { return el.textContent; });
    await typeInto(page, '#otpInput', newCode);
    await page.click('#otpSubmit');
    await settle(300);
    check('the new password signs in (still with the emailed code)', await shown(page, '#adminConsole'));

    section('security and audit logs');
    await page.click('[data-tab="logs"]');
    await settle(200);
    var logsText = await textOf(page, '#adminMain');
    check('the Logs tab shows security and audit entries', textHas(logsText, 'Password reset code sent') &&
          textHas(logsText, 'changed with a reset code') && textHas(logsText, 'Wrong email or password') && textHas(logsText, 'Quotation sent'));
    await shot(page, '11-logs');
    await page.type('#logsSearch', 'SU-224');
    await settle(200);
    var su224 = await page.$$eval('#adminMain .log-row', function (rows) {
        var all = rows.length > 0;
        for (var i = 0; i < rows.length; i++) if (!textHas(rows[i].textContent, 'SU-224')) all = false;
        return all;
    });
    check('searching narrows the log to one order', su224);
    await typeInto(page, '#logsSearch', ' ');
    await page.click('[data-log-kind="security"]');
    await settle(200);
    var kinds = await page.$$eval('#adminMain .log-kind', function (cells) {
        var only = cells.length > 0;
        for (var i = 0; i < cells.length; i++) if (cells[i].textContent !== 'Security') only = false;
        return only;
    });
    check('the Security filter shows only security entries', kinds);
    check('the shown entries download as CSV', beginsWith(await page.$eval('#adminMain a[download]', function (a) { return a.getAttribute('href'); }),
          'data:text/csv'));

    section('courier tracking');
    var shippedPhone = await page.evaluate(function () { return orderById(205).customer.phone; });
    await page.click('#findInput');
    await page.type('#findInput', 'SU-205');
    await page.keyboard.press('Enter');
    await settle();
    await page.click('#deskFoot [data-act="tracking"]');
    await settle(300);
    await page.select('[data-track-field="courier"]', 'flash');
    await typeInto(page, '[data-track-field="number"]', 'P0123 N5WX P8EA');
    await typeInto(page, '[data-track-field="link"]', 'javascript:alert(1)');
    await page.click('#deskFoot [data-desk="save-tracking"]');
    await settle(200);
    check('an unsafe link is refused', textHas(await textOf(page, '#deskBody'), 'must start with https://'));
    await typeInto(page, '[data-track-field="link"]', ' ');
    await shot(page, '12-tracking');
    await page.click('#deskFoot [data-desk="save-tracking"]');
    await settle();
    check('the tracking shows on the order', textHas(await textOf(page, '#deskBody'), 'Flash Express · P0123N5WXP8EA') &&
          textHas(await textOf(page, '#deskBody'), 'Courier tracking added'));
    await page.keyboard.press('Escape');
    await settle();
    await page.click('#logoutButton');
    await settle(300);
    await page.click('#trackButton');
    await settle();
    await page.type('#trackRef', 'SU-205');
    await page.type('#trackPhone', shippedPhone);
    await page.click('#trackBody button[type="submit"]');
    await settle(200);
    var trackText = await textOf(page, '#trackBody');
    check('the customer can follow the parcel', textHas(trackText, 'Follow your parcel') && textHas(trackText, 'P0123N5WXP8EA') &&
          (await page.$eval('#trackBody .tracking-card a', function (a) { return a.getAttribute('href') + '|' + a.getAttribute('rel'); })) ===
          'https://www.flashexpress.ph|noopener noreferrer');
    check('Track order says dates are estimates', textHas(trackText, 'weather'));
    await page.keyboard.press('Escape');
    await settle();

    /* ------------------------------------------------------------------ */
    section('phone layout');
    await page.evaluate(function () { location.hash = '#top'; });
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await settle(300);
    check('no sideways scrolling at 390px', await page.evaluate(function () { return document.documentElement.scrollWidth <= window.innerWidth + 1; }));
    await shot(page, '09-phone-home');

    section('console');
    check('no errors, warnings or dialogs', errors.length === 0, glue(errors, ' | '));
}

run().then(function () { t.finish('smoke'); }, function (e) {
    console.log(e);
    process.exitCode = 1;
});
