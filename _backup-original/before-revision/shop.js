/* =========================================================================
   SHOP — boot and shared chrome.

   Wires the catalogue, product sheet and cart together, and owns the one
   piece that belongs to none of them: order tracking.

   Loaded last, after the modules it wires.
   ========================================================================= */

(function () {
    'use strict';

    var $ = UI.$, $$ = UI.$$, esc = UI.escapeHtml, peso = UI.peso;

    function init() {
        UI.watchScroll();
        Store.load();

        paintIcons();
        buildSheets();

        Shop.Catalog.buildChips();
        Shop.Catalog.bindToolbar();

        bindDelegation();
        bindTracking();

        $('#year').textContent = String(new Date().getFullYear());

        renderAll();
        Store.subscribe(onChange);
        Motion.revealOnScroll('.reveal');
    }

    function onChange(reason) {
        if (reason === 'cart') {
            Shop.Cart.renderBadge();
            Shop.Cart.render();
        } else {
            renderAll();
        }
    }

    function renderAll() {
        Shop.Catalog.render();
        Shop.Catalog.renderBest();
        Shop.Cart.renderBadge();
        Shop.Cart.render();
    }

    /* =====================================================================
       CHROME
       ===================================================================== */
    function paintIcons() {
        var glyphs = {
            searchIcon: ['search', 18], searchClear: ['close', 16],
            cartIcon: ['bag', 18], fabIcon: ['bag', 20],
            productClose: ['close', 20], cartClose: ['close', 20],
            doneClose: ['close', 20], cartBack: ['left', 20]
        };
        for (var id in glyphs) {
            if (!Object.prototype.hasOwnProperty.call(glyphs, id)) continue;
            var el = $('#' + id);
            if (el) el.innerHTML = UI.icon(glyphs[id][0], glyphs[id][1]);
        }

        // Straight from the shop's own terms, not invented marketing.
        $('#trustRow').innerHTML =
            '<span>' + UI.icon('sparkle', 16) + 'Pure handmade, every piece</span>' +
            '<span>' + UI.icon('clock', 16) + 'Ready in 2–3 days</span>' +
            '<span>' + UI.icon('store', 16) + 'Pickup &amp; meetup, Lawa</span>' +
            '<span>' + UI.icon('truck', 16) + 'Free inside Brgy. Lawa</span>';

        renderContact();
    }

    /* Contact details come from one place, so there is nothing to keep in
       step by hand. A blank field is simply left out. */
    function renderContact() {
        var host = $('#contactList');
        if (!host) return;

        var rows = [];
        if (DATA.shop.email) {
            rows[rows.length] = '<li><a class="link" href="mailto:' + esc(DATA.shop.email) + '">' +
                                esc(DATA.shop.email) + '</a></li>';
        }
        if (DATA.shop.social) {
            rows[rows.length] = '<li>Facebook &amp; Instagram · ' + esc(DATA.shop.social) + '</li>';
        }
        if (DATA.shop.phone) {
            rows[rows.length] = '<li>Viber · ' + esc(DATA.shop.phone) + '</li>';
        }
        rows[rows.length] = '<li class="mt-3">' + esc(DATA.shop.address) + '</li>';

        host.innerHTML = Algorithms.joinText(rows, '');
    }

    function buildSheets() {
        // The cart slides in from the right on wide screens and up from the
        // bottom on phones, so the dismiss gesture follows suit.
        var sideOnWide = function () {
            return window.matchMedia('(min-width: 48rem)').matches ? 'x' : 'y';
        };

        Shop.sheets = {
            product: new UI.Sheet('#productSheet', { onClose: Shop.Product.clear }),
            cart: new UI.Sheet('#cartSheet', { axis: sideOnWide }),
            done: new UI.Sheet('#doneSheet')
        };

        $('#cartBack').addEventListener('click', Shop.Cart.back);
    }

    /* One delegated listener covers every card, in the grid and in the
       best-seller strip alike — they render the same controls. */
    function bindDelegation() {
        document.addEventListener('click', function (e) {
            var openBtn = e.target.closest('[data-open]');
            if (openBtn) { Shop.Product.open(openBtn.dataset.open); return; }

            var card = e.target.closest('.card-product');
            if (card && !e.target.closest('button')) Shop.Product.open(card.dataset.id);
        });

        $('#cartButton').addEventListener('click', Shop.Cart.open);
        $('#cartFab').addEventListener('click', Shop.Cart.open);
    }

    /* =====================================================================
       ORDER TRACKING
       ===================================================================== */
    function bindTracking() {
        $('#trackForm').addEventListener('submit', function (e) {
            e.preventDefault();

            var order = Store.findOrderByRef($('#trackInput').value);
            var host = $('#trackResult');

            if (!order) {
                host.innerHTML =
                    '<div class="panel" style="border-color:var(--rose-line);background:var(--rose-soft)">' +
                        '<p class="t-callout m-0">No order with that reference. Check the receipt and try again.</p>' +
                    '</div>';
                UI.haptic(UI.HAPTIC.warn);
                return;
            }

            var wait = Store.waitFor(order.id);
            var status = order.status === 'completed'
                ? { label: 'Ready — collected or out for delivery', badge: 'badge-green' }
                : (order.rush ? { label: 'In the rush lane', badge: 'badge-rose' }
                              : { label: 'In the standard queue', badge: '' });

            host.innerHTML =
                '<div class="panel">' +
                    '<div class="row-between mb-3">' +
                        '<p class="receipt-ref m-0">' + esc(order.ref) + '</p>' +
                        '<span class="badge ' + status.badge + '">' + esc(status.label) + '</span>' +
                    '</div>' +
                    '<div class="spec-list t-foot">' +
                        '<div><span class="k">Name</span><span class="v">' + esc(order.name) + '</span></div>' +
                        '<div><span class="k">' + esc(order.modeName) + '</span>' +
                            '<span class="v">' + esc(Shop.Cart.shortDate(order.date)) +
                            ' · ' + esc(order.slot) + '</span></div>' +
                        (wait
                            ? '<div><span class="k">Ahead of you</span><span class="v">' + wait.ahead + ' ' +
                                  UI.plural(wait.ahead, 'order') + '</span></div>' +
                              '<div><span class="k">Estimated wait</span><span class="v">' + wait.minutes + ' minutes</span></div>'
                            : '<div><span class="k">Completed</span><span class="v">Yes</span></div>') +
                        '<div><span class="k">Total</span><span class="v">' + peso(order.totals.total) + '</span></div>' +
                    '</div>' +
                '</div>';
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
