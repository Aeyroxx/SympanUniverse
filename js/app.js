/* =========================================================================
   APP — start-up and routing.

   One page holds both the shop and the order desk, because the orders
   live in this page's memory: a second page could never see them. The
   address decides which one shows — index.html#admin opens the desk's
   sign-in; every other address is the shop.
   Depends on every other script.
   ========================================================================= */

var SHOP_TITLE = 'Sýmpan Universe — Handcrafted Ribbon Bouquets';

/* Close every open sheet, top first.     Time O(n²) · Space O(n) */
function closeAllSheets() {
    while (openSheets.length > 0) sheetClose(openSheets[openSheets.length - 1]);
}

/*                                        Time O(n²) · Space O(n) */
function showShop(hash) {
    var wasHidden = $('#shopView').classList.contains('hidden');
    setHidden($('#adminView'), true);
    setHidden($('#shopView'), false);
    document.title = SHOP_TITLE;
    if (!wasHidden) return;
    refreshShop();
    var target = hash ? document.getElementById(textPart(hash, 1)) : null;
    if (target) target.scrollIntoView();
    else window.scrollTo(0, 0);
}

/*                                        Time O(n²) · Space O(n) */
function route() {
    closeAllSheets();
    if (location.hash === '#admin') showDesk();
    else showShop(location.hash);
}

/* Put each data-icon button's glyph in.  Time O(n)  · Space O(n) */
function fillIcons() {
    var buttons = $$('[data-icon]');
    for (var i = 0; i < buttons.length; i++) buttons[i].innerHTML = icon(buttons[i].getAttribute('data-icon'));
}

/* The shop's own housekeeping, so the owner doesn't have to: void
   quotations left unpaid too long (emailing the customer), then refresh
   what is on screen. Runs on start-up and every minute.
                                          Time O(n²) · Space O(n) */
function runAutomation() {
    var expired = expireQuotes(Date.now());
    if (expired.length === 0) return;
    refreshShop();
    if (deskState.authed && !$('#adminView').classList.contains('hidden')) renderDesk();
}

/*                                        Time O(n²) per demo event replayed · Space O(n) */
function boot() {
    seedShop(Date.now());
    // The demo history is replayed silently; from here on, every order step
    // emails the customer.
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
    initDesk();
    window.addEventListener('hashchange', route);
    if (location.hash === '#admin') route();
}

document.addEventListener('DOMContentLoaded', boot);
