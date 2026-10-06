/* =========================================================================
   ADMIN — the order desk.

   Every waiting order is printed in full: what was bought, in which build
   and colourway, with which add-ons, how the customer is paying, what is
   still owed, and where and when it is being handed over. The counter
   should never have to click to find out what to make.

   No Array.prototype helpers — see the array basics in algorithms.js.
   ========================================================================= */

(function () {
    'use strict';

    var $ = UI.$, $$ = UI.$$, esc = UI.escapeHtml, peso = UI.peso;
    var A = Algorithms;

    var PASSCODE = 'admin123';
    var UNLOCK_KEY = 'sympan_admin_unlocked';

    var sheets = {};
    var draft = null;

    /* =====================================================================
       GATE
       ===================================================================== */
    function init() {
        $('#lockIcon').innerHTML = UI.icon('lock', 24);

        $('#loginForm').addEventListener('submit', function (e) {
            e.preventDefault();
            if ($('#pw').value !== PASSCODE) {
                $('#pwError').classList.remove('hidden');
                $('#pw').select();
                UI.haptic(UI.HAPTIC.warn);
                return;
            }
            try { sessionStorage.setItem(UNLOCK_KEY, '1'); } catch (err) { /* not required */ }
            unlock();
        });

        var already = false;
        try { already = sessionStorage.getItem(UNLOCK_KEY) === '1'; } catch (e) { already = false; }
        if (already) unlock();
    }

    function unlock() {
        $('#loginScreen').classList.add('hidden');
        $('#console').classList.remove('hidden');

        UI.watchScroll();
        Store.load();

        $('#undoIcon').innerHTML = UI.icon('undo', 16);
        $('#editClose').innerHTML = UI.icon('close', 20);
        $('#confirmClose').innerHTML = UI.icon('close', 20);
        $('#year').textContent = String(new Date().getFullYear());

        sheets.edit = new UI.Sheet('#editSheet', {
            axis: function () { return window.matchMedia('(min-width: 48rem)').matches ? 'x' : 'y'; }
        });
        sheets.confirm = new UI.Sheet('#confirmSheet');

        bindActions();
        renderAll();
        Store.subscribe(renderAll);
    }

    function lock() {
        try { sessionStorage.removeItem(UNLOCK_KEY); } catch (e) { /* nothing to clear */ }
        window.location.reload();
    }

    /* =====================================================================
       RENDER
       ===================================================================== */
    function renderAll() {
        renderKpis();
        renderLanes();
        renderHistory();
        renderSlots();
        renderPayments();
        renderPerformance();
        renderCatalogTable();
    }

    function renderKpis() {
        var a = Store.analytics();
        var tiles = [
            { label: 'Completed',      value: String(a.completedCount), note: peso(a.revenue) + ' in finished orders' },
            { label: 'In the queues',  value: String(a.pendingCount),   note: peso(a.pipeline) + ' pending' },
            { label: 'Collected',      value: UI.pesoShort(a.collected), note: peso(a.outstanding) + ' still owed' },
            { label: 'Estimated wait', value: a.waitMinutes + 'm',      note: a.rushCount + ' rush · ' + a.queueCount + ' standard' }
        ];

        $('#kpiGrid').innerHTML = A.collectText(tiles, function (t) {
            return '<div class="kpi">' +
                '<p class="kpi-label t-over m-0">' + esc(t.label) + '</p>' +
                '<p class="kpi-value m-0">' + esc(t.value) + '</p>' +
                '<p class="kpi-note t-caption m-0">' + esc(t.note) + '</p>' +
            '</div>';
        }, '');
    }

    /* ---------------------------------------------------------------------
       The full order card — everything the counter needs, in one place.
       --------------------------------------------------------------------- */
    function orderCard(order, position, isNext) {
        var pay = order.payment;

        var payClass = pay.balance > 0 ? 'badge-amber' : 'badge-green';
        var payLabel = pay.balance > 0
            ? pay.methodName + ' · ' + peso(pay.balance) + ' owing'
            : pay.methodName + ' · paid';

        var items = A.collectText(order.items, function (item) {
            var addons = item.addons && item.addons.length > 0
                ? A.collectText(item.addons, function (a) {
                      return '<span class="chip-pill">' + esc(a.name) + ' +' + UI.pesoShort(a.price) + '</span>';
                  }, '')
                : '';

            var facts = [];
            if (item.style) facts[facts.length] = item.style;
            if (item.flowers) facts[facts.length] = item.flowers + ' ' + UI.plural(item.flowers, 'flower');
            if (item.variant) facts[facts.length] = item.variant;
            if (item.cash) facts[facts.length] = peso(item.cash) + ' cash inside';

            return '<li class="order-item">' +
                '<div class="order-item-media">' +
                    (item.image
                        ? '<img src="' + esc(item.image) + '" alt="" loading="lazy">'
                        : '<span class="card-media-empty" style="height:100%">' + UI.icon('image', 16) + '</span>') +
                '</div>' +
                '<div class="order-item-body">' +
                    '<div class="row-between">' +
                        '<strong class="t-callout">' + esc(item.name) + ' × ' + (item.qty || 1) + '</strong>' +
                        '<span class="t-callout t-num">' + peso(Store.lineTotal(item)) + '</span>' +
                    '</div>' +
                    (facts.length > 0
                        ? '<p class="t-caption dim m-0">' + esc(A.joinText(facts, ' · ')) + '</p>' : '') +
                    (addons ? '<div class="chip-pills">' + addons + '</div>' : '') +
                    (item.note ? '<p class="t-caption rose m-0">“' + esc(item.note) + '”</p>' : '') +
                '</div>' +
            '</li>';
        }, '');

        var settle = pay.balance > 0
            ? '<button class="ui-btn ui-btn-outline ui-btn-sm" type="button" data-settle="' + order.id + '">' +
                  'Mark ' + UI.pesoShort(pay.balance) + ' received</button>'
            : '';

        return '' +
        '<article class="order-card' + (isNext ? ' is-next' : '') + '">' +
            '<header class="order-card-head">' +
                '<span class="pos">' + position + '</span>' +
                '<div class="flex-fill">' +
                    '<div class="row-between">' +
                        '<strong class="t-title3">' + esc(order.name) + '</strong>' +
                        '<span class="t-callout t-num fw-bold">' + peso(order.totals.total) + '</span>' +
                    '</div>' +
                    '<p class="t-caption dim m-0">' + esc(order.ref) + ' · ' + esc(order.phone) + '</p>' +
                '</div>' +
            '</header>' +

            '<div class="order-tags">' +
                (order.rush ? '<span class="badge badge-rose">Rush</span>' : '') +
                '<span class="badge ' + payClass + '">' + esc(payLabel) + '</span>' +
                '<span class="badge">' + esc(order.modeName) +
                    (order.modeId === 'meetup' ? ' · ' + esc(order.zoneName) : '') + '</span>' +
                '<span class="badge">' + esc(dateLabel(order.date)) + ' · ' + esc(order.slot) + '</span>' +
            '</div>' +

            '<ul class="order-items">' + items + '</ul>' +

            '<dl class="order-facts t-foot">' +
                (order.modeId !== 'pickup'
                    ? '<div><dt>Address</dt><dd>' + esc(order.address) + '</dd></div>' : '') +
                '<div><dt>Payment</dt><dd>' + esc(pay.methodName) + ' — ' + peso(pay.paidNow) + ' received' +
                    (pay.balance > 0 ? ', ' + peso(pay.balance) + ' on handover' : ' in full') + '</dd></div>' +
                (pay.reference
                    ? '<div><dt>Reference</dt><dd class="t-mono">' + esc(pay.reference) + '</dd></div>' : '') +
                (order.totals.handling
                    ? '<div><dt>Handling</dt><dd>' + peso(order.totals.handling) + '</dd></div>' : '') +
                (order.totals.discount
                    ? '<div><dt>Discount</dt><dd class="rose">−' + peso(order.totals.discount) + '</dd></div>' : '') +
                (order.giftNote
                    ? '<div><dt>Note</dt><dd>' + esc(order.giftNote) + '</dd></div>' : '') +
                '<div><dt>Placed</dt><dd>' + esc(timeLabel(order.placedAt)) + '</dd></div>' +
            '</dl>' +

            (settle ? '<div class="order-card-foot">' + settle + '</div>' : '') +
        '</article>';
    }

    function dateLabel(iso) {
        return new Date(iso + 'T00:00:00').toLocaleDateString('en-PH', { day: 'numeric', month: 'short' });
    }

    function timeLabel(iso) {
        var d = new Date(iso);
        return d.toLocaleDateString('en-PH', { day: 'numeric', month: 'short' }) + ', ' +
               d.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
    }

    function emptyLane(message) {
        return '<div class="empty" style="padding:var(--s-8) var(--s-4)">' +
            '<p class="t-callout m-0">' + esc(message) + '</p></div>';
    }

    function renderLanes() {
        var queue = Store.queueOrders();
        var rush = Store.rushOrders();

        $('#queueBadge').textContent = queue.length + ' waiting';
        $('#rushBadge').textContent = rush.length + ' waiting';

        $('#queueList').innerHTML = queue.length > 0
            ? A.collectText(queue, function (o, i) { return orderCard(o, i + 1, i === 0); }, '')
            : emptyLane('Nothing in the standard queue.');

        $('#rushList').innerHTML = rush.length > 0
            ? A.collectText(rush, function (o, i) { return orderCard(o, i + 1, i === 0); }, '')
            : emptyLane('No rush orders right now.');

        $('#popQueue').disabled = queue.length === 0;
        $('#popRush').disabled = rush.length === 0;
    }

    function renderHistory() {
        var done = Store.historyOrders();
        $('#undoBtn').disabled = done.length === 0;

        if (done.length === 0) {
            $('#historyList').innerHTML = emptyLane('No orders completed yet.');
            return;
        }

        var shown = A.copyRange(done, 0, 8);
        $('#historyList').innerHTML = A.collectText(shown, function (o, i) {
            var pay = o.payment;
            return '<div class="order-row">' +
                '<span class="pos">' + (i === 0 ? '↑' : i + 1) + '</span>' +
                '<span class="who">' +
                    '<strong class="t-callout">' + esc(o.name) + '</strong>' +
                    '<span>' + esc(o.ref) + ' · ' + (o.rush ? 'rush' : 'standard') +
                        ' · ' + esc(pay.methodName) +
                        (pay.balance > 0 ? ' · ' + peso(pay.balance) + ' owing' : '') + '</span>' +
                '</span>' +
                '<span class="t-foot t-num">' + peso(o.totals.total) + '</span>' +
            '</div>';
        }, '');
    }

    function renderSlots() {
        var today = Store.toISODate(new Date());
        var slots = Store.slotsFor(today);

        $('#slotBars').innerHTML = A.collectText(slots, function (s) {
            var pct = Math.min(100, Math.round((s.used / s.capacity) * 100));
            return '<div class="bar-item">' +
                '<div class="bar-top t-foot">' +
                    '<span>' + esc(s.slot) + '</span>' +
                    '<span class="dim t-num">' + s.used + ' / ' + s.capacity + '</span>' +
                '</div>' +
                '<div class="bar-track"><div class="bar-fill' + (pct >= 100 ? ' rose' : '') +
                    '" style="width:' + pct + '%"></div></div>' +
            '</div>';
        }, '');
    }

    function renderPayments() {
        var rows = Store.paymentBreakdown();
        var most = 0;
        for (var i = 0; i < rows.length; i++) {
            if (rows[i].count > most) most = rows[i].count;
        }
        if (most === 0) most = 1;

        $('#paymentBars').innerHTML = A.collectText(rows, function (r) {
            var pct = Math.round((r.count / most) * 100);
            return '<div class="bar-item">' +
                '<div class="bar-top t-foot">' +
                    '<span>' + esc(r.name) + '</span>' +
                    '<span class="dim t-num">' + r.count + ' · ' + peso(r.value) + '</span>' +
                '</div>' +
                '<div class="bar-track"><div class="bar-fill" style="width:' + pct + '%"></div></div>' +
            '</div>';
        }, '');
    }

    function renderPerformance() {
        var rows = Store.productPerformance();
        var host = $('#performanceBars');

        if (rows.length === 0) {
            host.innerHTML = emptyLane('No orders yet — nothing to chart.');
            return;
        }

        var max = rows[0].units || 1;
        var shown = A.copyRange(rows, 0, 6);
        host.innerHTML = A.collectText(shown, function (r) {
            var pct = Math.round((r.units / max) * 100);
            return '<div class="bar-item">' +
                '<div class="bar-top t-foot">' +
                    '<span>' + esc(r.name) + '</span>' +
                    '<span class="dim t-num">' + r.units + ' · ' + peso(r.revenue) + '</span>' +
                '</div>' +
                '<div class="bar-track"><div class="bar-fill" style="width:' + pct + '%"></div></div>' +
            '</div>';
        }, '');
    }

    function renderCatalogTable() {
        var tree = Store.tree();

        $('#catalogRows').innerHTML = A.collectText(Store.products(), function (p) {
            var node = tree.node(tree.indexOfSlug(p.line));
            var priceLabel = p.pricing === 'sized'
                ? 'from ' + UI.pesoShort(p.price)
                : UI.pesoShort(p.price);

            return '<tr>' +
                '<td><div class="row-center">' +
                    (DATA.coverImage(p)
                        ? '<img src="' + esc(DATA.coverImage(p)) + '" alt="" decoding="async" ' +
                              'style="width:2.5rem;height:2.5rem;object-fit:cover;border-radius:8px">'
                        : '<span class="card-media-empty" style="width:2.5rem;height:2.5rem;border-radius:8px">' +
                              UI.icon('image', 14) + '</span>') +
                    '<span><strong>' + esc(p.name) + '</strong>' +
                        (p.priceProvisional ? ' <span class="badge badge-amber">set price</span>' : '') +
                    '</span>' +
                '</div></td>' +
                '<td class="t-foot dim">' + esc(node ? node.label : p.line) + '</td>' +
                '<td class="t-foot dim">' + esc(p.occasion) + '</td>' +
                '<td class="num">' + priceLabel + '</td>' +
                '<td class="num t-foot dim">' + p.leadDays + 'd</td>' +
                '<td class="num t-foot dim">' + p.sales + '</td>' +
                '<td class="num"><div class="row-center justify-content-end">' +
                    '<button class="ui-btn ui-btn-ghost ui-btn-sm" type="button" data-edit="' + p.id + '">Edit</button>' +
                    '<button class="ui-btn ui-btn-ghost ui-btn-sm" type="button" data-delete="' + p.id + '">Delete</button>' +
                '</div></td>' +
            '</tr>';
        }, '');
    }

    /* =====================================================================
       ACTIONS
       ===================================================================== */
    function bindActions() {
        $('#lockButton').addEventListener('click', lock);
        $('#refreshBtn').addEventListener('click', function () { Store.load(); renderAll(); });

        $('#popQueue').addEventListener('click', function () { complete('standard'); });
        $('#popRush').addEventListener('click', function () { complete('rush'); });

        $('#undoBtn').addEventListener('click', function () {
            var order = Store.undoLast();
            if (!order) { UI.toast({ kind: 'warn', title: 'Nothing to undo' }); return; }
            UI.haptic(UI.HAPTIC.tap);
            UI.toast({
                kind: 'info',
                title: order.ref + ' back in the queue',
                message: order.name + ' returned to the ' + (order.rush ? 'rush lane' : 'standard queue')
            });
        });

        $('#addProduct').addEventListener('click', function () { openEditor(null); });

        document.addEventListener('click', function (e) {
            var settle = e.target.closest('[data-settle]');
            if (settle) {
                var paid = Store.settleBalance(settle.dataset.settle);
                if (paid) {
                    UI.haptic(UI.HAPTIC.commit);
                    UI.toast({ kind: 'success', title: 'Balance received',
                               message: paid.ref + ' is now paid in full.' });
                }
                return;
            }

            var edit = e.target.closest('[data-edit]');
            if (edit) { openEditor(Store.product(edit.dataset.edit)); return; }

            var del = e.target.closest('[data-delete]');
            if (del) confirmDelete(Store.product(del.dataset.delete));
        });

        $('#resetCatalog').addEventListener('click', function () {
            Store.resetProducts();
            UI.toast({ kind: 'success', title: 'Catalogue restored', message: 'Back to the shipped bouquets.' });
        });

        $('#resetAll').addEventListener('click', confirmResetAll);
    }

    function complete(lane) {
        var order = Store.completeNext(lane === 'rush' ? 'rush' : 'standard');
        if (!order) { UI.toast({ kind: 'warn', title: 'That lane is empty' }); return; }

        UI.haptic(UI.HAPTIC.commit);
        UI.toast({
            kind: order.payment.balance > 0 ? 'warn' : 'success',
            title: order.ref + ' completed',
            message: order.payment.balance > 0
                ? 'Collect ' + peso(order.payment.balance) + ' from ' + order.name + '.'
                : order.name + ' · ' + peso(order.totals.total) + ' paid'
        });
    }

    /* ---- Product editor --------------------------------------------------- */
    function openEditor(product) {
        var isNew = !product;
        draft = isNew
            ? {
                id: Store.nextProductId(),
                name: '', line: '', category: 'other-bouquets',
                pricing: 'fixed', type: 'simple', price: 400, sales: 0,
                occasion: DATA.occasions[0], leadDays: 2,
                blurb: '', story: '', variants: [], gallery: []
              }
            : JSON.parse(JSON.stringify(product));

        $('#editTitle').textContent = isNew ? 'New bouquet' : 'Edit ' + product.name;

        var tree = Store.tree();
        var lineOptions = '';
        var branches = tree.childrenOf(tree.root);
        for (var b = 0; b < branches.length; b++) {
            var branch = tree.node(branches[b]);
            lineOptions += '<optgroup label="' + esc(branch.label) + '">';
            var leaves = tree.childrenOf(branches[b]);
            for (var l = 0; l < leaves.length; l++) {
                var leaf = tree.node(leaves[l]);
                lineOptions += '<option value="' + esc(leaf.slug) + '" data-branch="' + esc(branch.slug) + '"' +
                               (draft.line === leaf.slug ? ' selected' : '') + '>' + esc(leaf.label) + '</option>';
            }
            lineOptions += '</optgroup>';
        }

        var occasionOptions = A.collectText(DATA.occasions, function (o) {
            return '<option' + (o === draft.occasion ? ' selected' : '') + '>' + esc(o) + '</option>';
        }, '');

        $('#editBody').innerHTML =
        '<div class="pb-4">' +
            editField('fName', 'Name', '<input class="input" id="fName" value="' + esc(draft.name) + '" data-autofocus>') +
            editField('fLine', 'Category', '<select class="select" id="fLine">' + lineOptions + '</select>') +
            editField('fOccasion', 'Occasion', '<select class="select" id="fOccasion">' + occasionOptions + '</select>') +
            editField('fPrice', draft.pricing === 'sized' ? 'Starting price (from the size table)' : 'Price',
                '<input class="input" id="fPrice" type="number" min="0" step="10" value="' + Number(draft.price) + '"' +
                (draft.pricing === 'sized' ? ' disabled' : '') + '>' +
                (draft.pricing === 'sized'
                    ? '<span class="t-caption dim d-block mt-2">This line is quoted from the flower-count table.</span>'
                    : '')) +
            editField('fLead', 'Lead time in days',
                '<input class="input" id="fLead" type="number" min="1" max="14" value="' + Number(draft.leadDays) + '">') +
            editField('fBlurb', 'One-line description',
                '<input class="input" id="fBlurb" maxlength="120" value="' + esc(draft.blurb) + '">') +
            editField('fStory', 'Full description',
                '<textarea class="textarea" id="fStory">' + esc(draft.story) + '</textarea>') +
            editField('fImages', 'Photo files',
                '<textarea class="textarea" id="fImages" placeholder="assets/products/roses-round-1.jpg">' +
                    esc(A.joinText(draft.gallery || [], '\n')) + '</textarea>' +
                '<span class="t-caption dim d-block mt-2">One path per line. The first becomes the cover.</span>') +
        '</div>';

        $('#editFoot').innerHTML =
            '<div class="d-flex gap-2">' +
                '<button class="ui-btn ui-btn-quiet flex-fill" type="button" id="editCancel">Cancel</button>' +
                '<button class="ui-btn ui-btn-primary flex-fill" type="button" id="saveProduct">Save</button>' +
            '</div>';

        $('#editCancel').addEventListener('click', function () { sheets.edit.close(); });
        $('#saveProduct').addEventListener('click', saveDraft);
        sheets.edit.open();
    }

    function editField(id, label, control) {
        return '<div class="field"><label class="field-label" for="' + id + '">' + label + '</label>' +
               control + '</div>';
    }

    function saveDraft() {
        var name = $('#fName').value.trim();
        if (name.length < 2) {
            UI.toast({ kind: 'warn', title: 'Give it a name first' });
            $('#fName').focus();
            return;
        }

        var price = draft.pricing === 'sized' ? draft.price : Number($('#fPrice').value);
        if (!isFinite(price) || price < 0) {
            UI.toast({ kind: 'warn', title: 'Price must be a positive number' });
            $('#fPrice').focus();
            return;
        }

        var lineSelect = $('#fLine');
        var lineSlug = lineSelect.value;
        var branchSlug = lineSelect.options[lineSelect.selectedIndex].dataset.branch;

        var rawLines = $('#fImages').value.split('\n');
        var images = [], n = 0;
        for (var i = 0; i < rawLines.length; i++) {
            var path = rawLines[i].trim();
            if (path) images[n++] = path;
        }

        // Keep the variants whose photo is still in the gallery; a variant
        // pointing at a deleted file would render as a broken swatch.
        var variants = [], v = 0;
        var existing = draft.variants || [];
        for (var j = 0; j < existing.length; j++) {
            if (A.contains(images, existing[j].img)) variants[v++] = existing[j];
        }
        if (variants.length === 0 && images.length > 0) {
            variants[0] = { name: 'Standard', swatch: '#bbbbbb', img: images[0] };
        }

        var saved = {
            id: draft.id,
            name: name,
            line: lineSlug,
            category: branchSlug,
            pricing: draft.pricing,
            type: draft.type,
            flower: draft.flower,
            styles: draft.styles,
            price: price,
            priceProvisional: false,
            sales: draft.sales || 0,
            occasion: $('#fOccasion').value,
            leadDays: Math.max(1, Number($('#fLead').value) || 1),
            blurb: $('#fBlurb').value.trim(),
            story: $('#fStory').value.trim(),
            variants: variants,
            gallery: images
        };

        Store.saveProduct(saved);
        sheets.edit.close();
        UI.haptic(UI.HAPTIC.commit);
        UI.toast({ kind: 'success', title: 'Saved', message: name + ' is live in the shop.' });
    }

    /* ---- Confirmations ----------------------------------------------------
       Reserved for the two things here that cannot be undone. Everything
       else has an undo, and putting a dialog in front of those would only
       train people to click through them.
       ---------------------------------------------------------------------- */
    function askConfirm(options) {
        $('#confirmTitle').textContent = options.title;
        $('#confirmBody').innerHTML =
            '<div style="max-width:32rem;margin-inline:auto">' +
                '<p class="t-body dim-2">' + esc(options.message) + '</p>' +
            '</div>';
        $('#confirmFoot').innerHTML =
            '<div class="d-flex gap-2" style="max-width:32rem;margin-inline:auto">' +
                '<button class="ui-btn ui-btn-quiet flex-fill" type="button" id="confirmNo" data-autofocus>Cancel</button>' +
                '<button class="ui-btn ui-btn-danger flex-fill" type="button" id="confirmYes">' +
                    esc(options.confirmLabel) + '</button>' +
            '</div>';

        $('#confirmNo').addEventListener('click', function () { sheets.confirm.close(); });
        $('#confirmYes').addEventListener('click', function () {
            sheets.confirm.close();
            options.onConfirm();
        });
        sheets.confirm.open();
    }

    function confirmDelete(product) {
        if (!product) return;
        askConfirm({
            title: 'Delete ' + product.name + '?',
            message: 'It disappears from the shop immediately. Orders already placed keep their copy ' +
                     'of the details, so past receipts stay intact. You can restore the shipped ' +
                     'catalogue at any time.',
            confirmLabel: 'Delete',
            onConfirm: function () {
                Store.deleteProduct(product.id);
                UI.toast({ kind: 'info', title: 'Deleted', message: product.name });
            }
        });
    }

    function confirmResetAll() {
        askConfirm({
            title: 'Reset everything?',
            message: 'Every order, booking, saved bouquet and cart held in this browser is erased and ' +
                     'the sample queue is restored. There is no undo for this one.',
            confirmLabel: 'Reset all data',
            onConfirm: function () {
                Store.reset();
                UI.toast({ kind: 'success', title: 'Demo reset', message: 'Back to a clean board.' });
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
