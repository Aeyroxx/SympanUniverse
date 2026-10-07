/* =========================================================================
   APP · simula at routing
   Iisang page lang ang shop at ang order desk kasi nasa memory ang mga
   order at hindi madadala sa ibang page. #admin = desk, iba = shop.
   ========================================================================= */

var SHOP_TITLE = 'Sýmpan Universe — Handcrafted Ribbon Bouquets';

// Sinasara lahat ng bukas na sheet, yung nasa taas muna.
// Time O(n²) · Space O(n)
function closeAllSheets() {
    while (openSheets.length > 0) sheetClose(openSheets[openSheets.length - 1]);
}

// Pakita yung shop.
// Time O(n²) · Space O(n)
function showShop(hash) {
    var wasHidden = $('#shopView').classList.contains('hidden');
    setHidden($('#adminView'), true);
    setHidden($('#shopView'), false);
    document.title = SHOP_TITLE;
    if (!wasHidden) return;
    refreshPrivacyBanner();
    refreshShop();
    var target = hash ? document.getElementById(textPart(hash, 1)) : null;
    if (target) target.scrollIntoView();
    else window.scrollTo(0, 0);
}

// Shop o order desk, depende sa address (#admin).
// Time O(n²) · Space O(n)
function route() {
    closeAllSheets();
    if (location.hash === '#admin') showDesk();
    else showShop(location.hash);
}

// Nilalagay yung icon sa bawat data-icon na button.
// Time O(n) · Space O(n)
function fillIcons() {
    var buttons = $$('[data-icon]');
    for (var i = 0; i < buttons.length; i++) buttons[i].innerHTML = icon(buttons[i].getAttribute('data-icon'));
}

// Kusang ginagawa ng shop kada minuto: sign out ng idle na desk,
// void ng hindi nabayarang quotation, tapos refresh.
// Time O(n²) · Space O(n)
function runAutomation() {
    checkDeskIdle(Date.now());
    var expired = expireQuotes(Date.now());
    if (expired.length === 0) return;
    refreshShop();
    if (deskState.authed && !$('#adminView').classList.contains('hidden')) renderDesk();
}

// Simula ng app: demo history, timers, at lahat ng init.
// Time O(n²) bawat demo event · Space O(n)
function boot() {
    seedShop(Date.now());
    // Tahimik na pinapatakbo ang demo history; mula dito, bawat hakbang
    // ng order may email na sa customer.
    mailEnabled = true;
    runAutomation();
    setInterval(runAutomation, 60000);
    setInterval(drainMail, 1500);
    fillIcons();
    watchScroll();
    initCatalog();
    initProductSheet();
    initBasket();
    initTrack();
    initPrivacy();
    initDesk();
    window.addEventListener('hashchange', route);
    if (location.hash === '#admin') route();
}

document.addEventListener('DOMContentLoaded', boot);
