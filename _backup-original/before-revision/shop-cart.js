/* =========================================================================
   SHOP · CART — the cart drawer, the four-step checkout and the receipt.

   One sheet holds every step. `step` decides what its body renders, so going
   back never loses what was already typed.

     0  cart        what you are buying
     1  details     who, where and when
     2  payment     cash, GCash or a 50% downpayment
     3  review      confirm and place

   No Array.prototype helpers — see the array basics in algorithms.js.
   ========================================================================= */

window.Shop = window.Shop || {};

Shop.Cart = (function () {
    'use strict';

    var $ = UI.$, $$ = UI.$$, esc = UI.escapeHtml, peso = UI.peso;
    var A = Algorithms;

    var STEPS = ['Your cart', 'Details', 'Payment', 'Review'];

    var step = 0;
    var errors = {};
    var form = {
        name: '', phone: '',
        modeId: 'pickup', zoneId: 'lawa', address: '',
        slot: '', date: '',
        giftNote: '', rush: false,
        paymentId: 'cash', reference: ''
    };

    /* =====================================================================
       BADGES
       ===================================================================== */
    function renderBadge() {
        var count = Store.cartCount();
        var total = Store.subtotal();

        var dot = $('#cartCount');
        dot.textContent = count > 99 ? '99+' : String(count);
        dot.classList.toggle('hidden', count === 0);
        $('#cartLabel').textContent = count ? UI.pesoShort(total) : 'Cart';

        $('#cartFab').classList.toggle('hidden', count === 0);
        $('#fabTotal').textContent = UI.pesoShort(total);
    }

    function open() {
        step = 0;
        render();
        Shop.sheets.cart.open();
    }

    function back() {
        step = Math.max(0, step - 1);
        render();
    }

    /* =====================================================================
       ROUTER
       ===================================================================== */
    function render() {
        var entries = Store.cartEntries();
        $('#cartBack').classList.toggle('hidden', step === 0);
        $('#cartSheetTitle').textContent = STEPS[step];

        if (entries.length === 0) {
            $('#cartBody').innerHTML =
                '<div class="empty">' +
                    '<div class="empty-glyph">' + UI.icon('bag', 26) + '</div>' +
                    '<h3 class="t-title3">Your cart is empty</h3>' +
                    '<p class="t-callout m-0">Pick a bouquet and it will appear here.</p>' +
                '</div>';
            $('#cartFoot').innerHTML =
                '<button class="ui-btn ui-btn-quiet ui-btn-block" type="button" id="cartKeepBrowsing">Keep browsing</button>';
            $('#cartKeepBrowsing').addEventListener('click', function () { Shop.sheets.cart.close(); });
            return;
        }

        if (step === 0) renderList(entries);
        else if (step === 1) renderDetails();
        else if (step === 2) renderPayment();
        else renderReview();
    }

    function stepBar(current) {
        var html = '';
        for (var i = 0; i < STEPS.length; i++) {
            var cls = i < current ? ' is-done' : (i === current ? ' is-now' : '');
            html += '<span class="step' + cls + '"></span>';
        }
        return '<div class="steps" aria-hidden="true">' + html + '</div>';
    }

    /* =====================================================================
       STEP 0 — the cart
       ===================================================================== */
    function renderList(entries) {
        var lines = A.collectText(entries, function (entry) {
            var line = entry.value;
            return '' +
            '<div class="cart-line" data-node="' + entry.index + '">' +
                '<div class="cart-line-media">' + thumbHtml(line) + '</div>' +
                '<div>' +
                    '<div class="cart-line-head">' +
                        '<span class="cart-line-name t-callout">' + esc(line.name) + '</span>' +
                        '<span class="cart-line-price t-callout">' + peso(Store.lineTotal(line)) + '</span>' +
                    '</div>' +
                    (line.summary ? '<p class="cart-line-notes t-caption m-0">' + esc(line.summary) + '</p>' : '') +
                    (line.note ? '<p class="cart-line-notes t-caption m-0">“' + esc(line.note) + '”</p>' : '') +
                    '<div class="cart-line-foot">' +
                        '<div class="stepper" role="group" aria-label="Quantity for ' + esc(line.name) + '">' +
                            '<button type="button" data-line-qty="-1" data-node="' + entry.index + '" ' +
                                'aria-label="One fewer"' + (line.qty <= 1 ? ' disabled' : '') + '>' +
                                UI.icon('minus', 14) + '</button>' +
                            '<span class="qty">' + line.qty + '</span>' +
                            '<button type="button" data-line-qty="1" data-node="' + entry.index + '" ' +
                                'aria-label="One more">' + UI.icon('plus', 14) + '</button>' +
                        '</div>' +
                        '<button class="ui-btn ui-btn-ghost ui-btn-sm" type="button" data-remove="' + entry.index + '">Remove</button>' +
                    '</div>' +
                '</div>' +
            '</div>';
        }, '');

        $('#cartBody').innerHTML = stepBar(0) + lines +
            '<p class="t-caption dim mt-4">Ready in ' + esc(longDate(Store.earliestDate(form.modeId))) +
            ' at the earliest, based on what is in your cart.</p>';

        var sums = Store.totals({ modeId: 'pickup', rush: false, paymentId: form.paymentId });
        $('#cartFoot').innerHTML =
            '<div class="summary t-callout mb-3">' +
                '<div><span class="k">Subtotal</span><span class="v">' + peso(sums.goods) + '</span></div>' +
            '</div>' +
            '<button class="ui-btn ui-btn-primary ui-btn-block ui-btn-lg" type="button" id="toDetails">Checkout</button>';

        bindList();
    }

    function thumbHtml(line) {
        if (!line.image) {
            return '<div class="card-media-empty" style="height:100%">' + UI.icon('image', 18) + '</div>';
        }
        return '<img src="' + esc(line.image) + '" alt="" loading="lazy">';
    }

    function bindList() {
        var body = $('#cartBody');

        bindAll($$('[data-line-qty]', body), function (btn) {
            var node = parseInt(btn.dataset.node, 10);
            var line = Store.state.cart.get(node);
            if (!line) return;
            Store.setQuantity(node, (line.qty || 1) + parseInt(btn.dataset.lineQty, 10));
        });

        bindAll($$('[data-remove]', body), function (btn) {
            var node = parseInt(btn.dataset.remove, 10);
            var line = Store.state.cart.get(node);
            Store.removeFromCart(node);
            UI.toast({ kind: 'info', title: 'Removed', message: line ? line.name : '' });
        });

        $('#toDetails').addEventListener('click', function () {
            if (!form.date) form.date = Store.earliestDate(form.modeId);
            step = 1;
            render();
        });
    }

    /* =====================================================================
       STEP 1 — who, where, when
       ===================================================================== */
    function renderDetails() {
        if (!form.date) form.date = Store.earliestDate(form.modeId);
        var mode = DATA.findMode(form.modeId);
        var slots = Store.slotsFor(form.date);

        var modeButtons = A.collectText(DATA.fulfilmentModes, function (option) {
            return '<button type="button" data-mode="' + esc(option.id) + '" role="tab" ' +
                   'aria-selected="' + (form.modeId === option.id) + '">' + esc(option.name) + '</button>';
        }, '');

        var zonePicker = '';
        if (mode.id === 'meetup') {
            var zoneOptions = A.collectText(DATA.meetupZones, function (zone) {
                return '<option value="' + esc(zone.id) + '"' + (form.zoneId === zone.id ? ' selected' : '') + '>' +
                       esc(zone.name) + ' · ' + (zone.fee ? UI.pesoShort(zone.fee) : 'free') + '</option>';
            }, '');
            zonePicker = '<div class="field">' +
                '<label class="field-label" for="coZone">Meetup area</label>' +
                '<select class="select" id="coZone">' + zoneOptions + '</select>' +
                '<span class="t-caption dim d-block mt-2">Free in Brgy. Lawa; ' +
                    '₱20–₱50 handling elsewhere.</span>' +
            '</div>';
        }

        var addressField = mode.id === 'pickup'
            ? '<p class="t-foot dim">Collect at ' + esc(DATA.shop.address) + '.</p>'
            : field('coAddress', mode.id === 'delivery' ? 'Delivery address' : 'Where shall we meet?', errors.address,
                '<textarea class="textarea" id="coAddress" autocomplete="street-address" ' +
                    'placeholder="' + (mode.id === 'delivery'
                        ? 'House number, street, Brgy. Lawa'
                        : 'Landmark, street or station') + '">' + esc(form.address) + '</textarea>');

        var slotGrid = A.collectText(slots, function (s) {
            var left = s.capacity - s.used;
            return '<button class="slot" type="button" data-slot="' + esc(s.slot) + '" ' +
                   'aria-pressed="' + (form.slot === s.slot) + '"' + (s.open ? '' : ' disabled') + '>' +
                   '<span class="slot-time t-callout">' + esc(s.slot) + '</span>' +
                   '<span class="slot-left">' +
                       (s.open ? left + ' ' + UI.plural(left, 'slot') + ' left' : 'Fully booked') +
                   '</span></button>';
        }, '');

        $('#cartBody').innerHTML = stepBar(1) +
        field('coName', 'Name on the order', errors.name,
            '<input class="input" id="coName" value="' + esc(form.name) + '" autocomplete="name" data-autofocus>') +

        field('coPhone', 'Mobile number', errors.phone,
            '<input class="input" id="coPhone" value="' + esc(form.phone) + '" ' +
                   'inputmode="tel" autocomplete="tel" placeholder="0917 000 0000">') +

        '<div class="field">' +
            '<span class="field-label">How would you like it?</span>' +
            '<div class="segmented" role="tablist">' + modeButtons + '</div>' +
            '<span class="t-caption dim d-block mt-2">' + esc(mode.blurb) + '</span>' +
        '</div>' +

        zonePicker + addressField +

        field('coDate', 'Date', errors.date,
            '<input class="input" id="coDate" type="date" value="' + esc(form.date) + '" ' +
                   'min="' + esc(Store.earliestDate(form.modeId)) + '">' +
            '<span class="t-caption dim d-block mt-2">' +
                (mode.restrictedDays
                    ? esc(mode.name + 's run on ' + DATA.deliveryDayNames + ' only.')
                    : 'Earliest we can have everything ready.') +
            '</span>') +

        '<div class="field' + (errors.slot ? ' is-invalid' : '') + '">' +
            '<span class="field-label">Time slot</span>' +
            '<div class="slot-grid">' + slotGrid + '</div>' +
            (errors.slot ? '<span class="field-error">' + esc(errors.slot) + '</span>' : '') +
        '</div>' +

        '<label class="check mt-2">' +
            '<input type="checkbox" id="coRush"' + (form.rush ? ' checked' : '') + '>' +
            '<span class="box">' + UI.icon('check', 14) + '</span>' +
            '<span class="check-body">' +
                '<span class="check-title">Rush priority · +' + UI.pesoShort(DATA.RUSH_FEE) + '</span>' +
                '<span class="check-note">Jumps the standard queue. Prepared in 15 minutes instead of 30.</span>' +
            '</span>' +
        '</label>' +

        '<div class="field mb-5">' +
            '<label class="field-label" for="coNote">Note for the shop <span class="dim">(optional)</span></label>' +
            '<textarea class="textarea" id="coNote" maxlength="240">' + esc(form.giftNote) + '</textarea>' +
        '</div>';

        $('#cartFoot').innerHTML =
            '<button class="ui-btn ui-btn-primary ui-btn-block ui-btn-lg" type="button" id="toPayment">Continue to payment</button>';

        bindDetails();
    }

    function field(id, label, error, control) {
        return '<div class="field' + (error ? ' is-invalid' : '') + '">' +
            '<label class="field-label" for="' + id + '">' + label + '</label>' + control +
            (error ? '<span class="field-error">' + esc(error) + '</span>' : '') +
        '</div>';
    }

    function bindValue(id, key, root) {
        var el = $('#' + id, root);
        if (el) el.addEventListener('input', function () { form[key] = el.value; });
    }

    function bindAll(nodes, handler) {
        for (var i = 0; i < nodes.length; i++) {
            (function (node) {
                node.addEventListener('click', function () { handler(node); });
            })(nodes[i]);
        }
    }

    function bindDetails() {
        var body = $('#cartBody');

        bindValue('coName', 'name', body);
        bindValue('coPhone', 'phone', body);
        bindValue('coAddress', 'address', body);
        bindValue('coNote', 'giftNote', body);

        bindAll($$('[data-mode]', body), function (btn) {
            form.modeId = btn.dataset.mode;
            // Meetups and deliveries only run Friday to Sunday, so a date
            // chosen for a pickup may no longer be valid.
            var earliest = Store.earliestDate(form.modeId);
            if (!form.date || form.date < earliest) form.date = earliest;
            var mode = DATA.findMode(form.modeId);
            if (mode.restrictedDays && !DATA.isDeliveryDay(form.date)) form.date = earliest;
            form.slot = '';
            renderDetails();
        });

        var zone = $('#coZone', body);
        if (zone) zone.addEventListener('change', function () { form.zoneId = zone.value; });

        var date = $('#coDate', body);
        if (date) {
            date.addEventListener('change', function () {
                form.date = date.value;
                form.slot = '';                 // availability differs per day
                renderDetails();
            });
        }

        bindAll($$('[data-slot]', body), function (btn) {
            form.slot = btn.dataset.slot;
            var all = $$('[data-slot]', body);
            for (var i = 0; i < all.length; i++) {
                all[i].setAttribute('aria-pressed', all[i] === btn ? 'true' : 'false');
            }
        });

        var rush = $('#coRush', body);
        if (rush) rush.addEventListener('change', function () { form.rush = rush.checked; });

        $('#toPayment').addEventListener('click', function () {
            errors = onlyFor(Store.validateOrder(form), ['name', 'phone', 'address', 'date', 'slot', 'cart']);
            if (hasAny(errors)) {
                renderDetails();
                warnFirst();
                return;
            }
            step = 2;
            render();
        });
    }

    /* Keep only the errors that belong to the step being shown, so a missing
       GCash reference does not light up the details form. */
    function onlyFor(all, keys) {
        var out = {};
        for (var i = 0; i < keys.length; i++) {
            if (all[keys[i]]) out[keys[i]] = all[keys[i]];
        }
        return out;
    }

    function hasAny(map) {
        for (var key in map) {
            if (Object.prototype.hasOwnProperty.call(map, key)) return true;
        }
        return false;
    }

    function firstMessage(map) {
        for (var key in map) {
            if (Object.prototype.hasOwnProperty.call(map, key)) return map[key];
        }
        return '';
    }

    function warnFirst() {
        UI.haptic(UI.HAPTIC.warn);
        UI.toast({ kind: 'warn', title: 'Almost there', message: firstMessage(errors) });
        var bad = $('.is-invalid .input, .is-invalid .textarea', $('#cartBody'));
        if (bad) bad.focus();
    }

    /* =====================================================================
       STEP 2 — payment

       The shop takes full payment or a 50% downpayment to confirm, and the
       downpayment is non-refundable once production starts. Both of those
       are said plainly here rather than buried in the terms.
       ===================================================================== */
    function renderPayment() {
        var sums = Store.totals({
            modeId: form.modeId, zoneId: form.zoneId,
            rush: form.rush, paymentId: form.paymentId
        });
        var method = DATA.findPayment(form.paymentId);

        var options = A.collectText(DATA.paymentMethods, function (option) {
            var chosen = form.paymentId === option.id;
            var due = Math.round(sums.total * option.share);
            return '<button class="pay-option" type="button" data-payment="' + esc(option.id) + '" ' +
                   'aria-pressed="' + (chosen ? 'true' : 'false') + '">' +
                   '<span class="pay-mark">' + (chosen ? UI.icon('check', 14) : '') + '</span>' +
                   '<span class="pay-body">' +
                       '<span class="pay-name">' + esc(option.name) + '</span>' +
                       '<span class="pay-blurb">' + esc(option.blurb) + '</span>' +
                   '</span>' +
                   '<span class="pay-due">' + UI.pesoShort(due) +
                       (option.share < 1 ? '<span class="pay-now">now</span>' : '') +
                   '</span></button>';
        }, '');

        var referenceField = method.needsReference
            ? field('coReference', 'GCash reference number', errors.reference,
                '<input class="input" id="coReference" inputmode="numeric" autocomplete="off" ' +
                       'placeholder="0000 000 000 000" value="' + esc(form.reference) + '">' +
                '<span class="t-caption dim d-block mt-2">' + esc(method.note) + '</span>')
            : '<p class="t-caption dim">' + esc(method.note) + '</p>';

        $('#cartBody').innerHTML = stepBar(2) +
            '<p class="t-over dim mb-2">How would you like to pay?</p>' +
            '<div class="pay-grid mb-4">' + options + '</div>' +
            referenceField +

            '<div class="panel mt-4">' +
                '<div class="summary t-callout">' +
                    '<div><span class="k">Order total</span><span class="v">' + peso(sums.total) + '</span></div>' +
                    '<div><span class="k">Due now</span><span class="v">' + peso(sums.dueNow) + '</span></div>' +
                    (sums.balance > 0
                        ? '<div><span class="k">Balance on ' + esc(sums.mode.name.toLowerCase()) + '</span>' +
                          '<span class="v">' + peso(sums.balance) + '</span></div>'
                        : '') +
                '</div>' +
            '</div>' +

            '<p class="t-caption dim mt-4 mb-5">Payment confirms your slot and is non-refundable once ' +
                'production starts. The shop does not cancel an order after that point.</p>';

        $('#cartFoot').innerHTML =
            '<button class="ui-btn ui-btn-primary ui-btn-block ui-btn-lg" type="button" id="toReview">Review order</button>';

        bindPayment();
    }

    function bindPayment() {
        var body = $('#cartBody');

        bindAll($$('[data-payment]', body), function (btn) {
            form.paymentId = btn.dataset.payment;
            if (!DATA.findPayment(form.paymentId).needsReference) form.reference = '';
            renderPayment();
        });

        bindValue('coReference', 'reference', body);

        $('#toReview').addEventListener('click', function () {
            errors = onlyFor(Store.validateOrder(form), ['payment', 'reference']);
            if (hasAny(errors)) {
                renderPayment();
                warnFirst();
                return;
            }
            step = 3;
            render();
        });
    }

    /* =====================================================================
       STEP 3 — review and place
       ===================================================================== */
    function renderReview() {
        var sums = Store.totals({
            modeId: form.modeId, zoneId: form.zoneId,
            rush: form.rush, paymentId: form.paymentId
        });

        var lines = A.collectText(Store.cartEntries(), function (entry) {
            var line = entry.value;
            return '<div class="cart-line">' +
                '<div class="cart-line-media">' + thumbHtml(line) + '</div>' +
                '<div><div class="cart-line-head">' +
                    '<span class="cart-line-name t-callout">' + esc(line.name) + ' × ' + line.qty + '</span>' +
                    '<span class="cart-line-price t-callout">' + peso(Store.lineTotal(line)) + '</span>' +
                '</div>' +
                (line.summary ? '<p class="cart-line-notes t-caption m-0">' + esc(line.summary) + '</p>' : '') +
                '</div></div>';
        }, '');

        $('#cartBody').innerHTML = stepBar(3) +
        '<div class="panel mb-4">' +
            '<p class="t-over dim mb-3">Collecting</p>' +
            '<div class="spec-list t-foot">' +
                '<div><span class="k">Name</span><span class="v">' + esc(form.name) + '</span></div>' +
                '<div><span class="k">Mobile</span><span class="v">' + esc(form.phone) + '</span></div>' +
                '<div><span class="k">Method</span><span class="v">' + esc(sums.mode.name) +
                    (sums.mode.id === 'meetup' ? ' · ' + esc(sums.zone.name) : '') + '</span></div>' +
                (sums.mode.id !== 'pickup'
                    ? '<div><span class="k">Address</span><span class="v">' + esc(form.address) + '</span></div>' : '') +
                '<div><span class="k">When</span><span class="v">' + esc(shortDate(form.date)) +
                    ' · ' + esc(form.slot) + '</span></div>' +
                (form.rush ? '<div><span class="k">Priority</span><span class="v rose">Rush</span></div>' : '') +
                '<div><span class="k">Payment</span><span class="v">' + esc(sums.method.name) + '</span></div>' +
                (form.reference
                    ? '<div><span class="k">Reference</span><span class="v t-mono">' + esc(form.reference) + '</span></div>' : '') +
            '</div>' +
        '</div>' + lines +

        '<div class="summary t-callout mt-4 mb-5">' +
            '<div><span class="k">Bouquets</span><span class="v">' + peso(sums.goods) + '</span></div>' +
            (sums.handling
                ? '<div><span class="k">Handling</span><span class="v">' + peso(sums.handling) + '</span></div>' : '') +
            (sums.rushFee
                ? '<div><span class="k">Rush priority</span><span class="v">' + peso(sums.rushFee) + '</span></div>' : '') +
            '<div class="grand"><span class="k">Total</span><span class="v">' + peso(sums.total) + '</span></div>' +
            (sums.balance > 0
                ? '<div class="mt-2"><span class="k">Due now (' + esc(sums.method.name) + ')</span>' +
                  '<span class="v">' + peso(sums.dueNow) + '</span></div>' +
                  '<div><span class="k">Balance later</span><span class="v">' + peso(sums.balance) + '</span></div>'
                : '') +
        '</div>';

        $('#cartFoot').innerHTML =
            '<button class="ui-btn ui-btn-primary ui-btn-block ui-btn-lg" type="button" id="placeOrder" data-autofocus>' +
                'Place order · pay ' + peso(sums.dueNow) +
            '</button>' +
            '<p class="t-caption dim text-center mt-3 mb-0">' +
                (sums.balance > 0
                    ? 'Balance of ' + peso(sums.balance) + ' on ' + esc(sums.mode.name.toLowerCase()) + '.'
                    : 'Paid in full.') +
            '</p>';

        $('#placeOrder').addEventListener('click', submit);
    }

    function submit() {
        $('#placeOrder').disabled = true;
        var result = Store.placeOrder(form);

        if (!result.ok) {
            $('#placeOrder').disabled = false;
            errors = result.errors;
            step = errors.reference || errors.payment ? 2 : 1;
            render();
            UI.haptic(UI.HAPTIC.warn);
            UI.toast({ kind: 'error', title: 'Could not place the order', message: firstMessage(errors) });
            return;
        }

        errors = {};
        step = 0;
        form.giftNote = '';
        form.reference = '';
        Shop.sheets.cart.close();

        UI.haptic(UI.HAPTIC.commit);
        showConfirmation(result.order);
    }

    /* =====================================================================
       RECEIPT
       ===================================================================== */
    function showConfirmation(order) {
        var wait = Store.waitFor(order.id);
        var position = wait ? wait.ahead + 1 : 1;
        var pay = order.payment;

        $('#doneTitle').textContent = 'Order ' + order.ref;
        $('#doneBody').innerHTML =
        '<div style="margin-inline:auto;max-width:34rem">' +
            '<div class="text-center mb-5">' +
                '<div class="success-mark">' + UI.icon('check', 28) + '</div>' +
                '<h3 class="t-title1 mb-2">Thank you, ' + esc(firstWord(order.name)) + '.</h3>' +
                '<p class="t-callout dim m-0">We have started on it. Keep the reference below — ' +
                    'you can check the status any time.</p>' +
            '</div>' +

            '<div class="receipt">' +
                '<div class="row-between mb-4">' +
                    '<div><p class="t-over dim mb-1">Reference</p>' +
                        '<p class="receipt-ref m-0">' + esc(order.ref) + '</p></div>' +
                    '<span class="badge ' + (order.rush ? 'badge-rose' : 'badge-green') + '">' +
                        (order.rush ? 'Rush lane' : 'Standard lane') + '</span>' +
                '</div>' +

                '<div class="receipt-rows t-foot">' +
                    '<div><span class="k">Position in queue</span><span>#' + position + '</span></div>' +
                    '<div><span class="k">Estimated wait</span><span>' + (wait ? wait.minutes : 0) + ' minutes</span></div>' +
                    '<div><span class="k">' + esc(order.modeName) + '</span>' +
                        '<span>' + esc(shortDate(order.date)) + ' · ' + esc(order.slot) + '</span></div>' +
                    '<div><span class="k">Items</span><span>' + order.items.length + ' ' +
                        UI.plural(order.items.length, 'line') + '</span></div>' +
                    '<div><span class="k">Order total</span><span>' + peso(pay.due) + '</span></div>' +
                    '<div><span class="k">Paid (' + esc(pay.methodName) + ')</span>' +
                        '<span class="fw-bold">' + peso(pay.paidNow) + '</span></div>' +
                    (pay.balance > 0
                        ? '<div><span class="k">Balance on handover</span><span class="fw-bold">' +
                          peso(pay.balance) + '</span></div>' : '') +
                    (pay.reference
                        ? '<div><span class="k">GCash reference</span><span class="t-mono">' +
                          esc(pay.reference) + '</span></div>' : '') +
                '</div>' +
            '</div>' +

            '<p class="t-caption dim text-center mt-4">A copy of this is kept in this browser only. ' +
                'Message us at ' + esc(DATA.shop.social) + ' if anything changes.</p>' +
        '</div>';

        $('#doneFoot').innerHTML =
            '<div class="d-flex gap-2">' +
                '<button class="ui-btn ui-btn-outline flex-fill" type="button" id="printReceipt">' +
                    UI.icon('print', 18) + 'Print</button>' +
                '<button class="ui-btn ui-btn-primary flex-fill" type="button" id="doneOk" data-autofocus>Done</button>' +
            '</div>';

        $('#printReceipt').addEventListener('click', function () { window.print(); });
        $('#doneOk').addEventListener('click', function () { Shop.sheets.done.close(); });
        Shop.sheets.done.open();
    }

    /* =====================================================================
       Small helpers
       ===================================================================== */
    function firstWord(text) {
        var out = '';
        for (var i = 0; i < text.length; i++) {
            if (text.charAt(i) === ' ') break;
            out += text.charAt(i);
        }
        return out || text;
    }

    function longDate(iso) {
        return new Date(iso + 'T00:00:00')
            .toLocaleDateString('en-PH', { weekday: 'long', day: 'numeric', month: 'long' });
    }

    function shortDate(iso) {
        return new Date(iso + 'T00:00:00')
            .toLocaleDateString('en-PH', { day: 'numeric', month: 'short' });
    }

    return {
        open: open,
        back: back,
        render: render,
        renderBadge: renderBadge,
        showConfirmation: showConfirmation,
        shortDate: shortDate
    };
})();
