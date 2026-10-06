/* =========================================================================
   SHOP · TRACK ORDER — where the customer sees and answers a quotation.

   The order is found with a binary search on its number, and only shown
   when the mobile number matches. From here a customer can:
     · cancel a request, or decline a quotation (both void the order),
     · accept a quotation with a 50% down payment or full payment by GCash,
     · pay the remaining balance by GCash,
     · open and print every receipt.
   Depends on ui.js, orders.js and receipt.js.
   ========================================================================= */

var trackSheet = null;
var trackState = { ref: '', phone: '', orderId: 0, method: 'gcash-50', error: '' };

var TRACK_STEPS = ['requested', 'quoted', 'paid', 'completed'];
var TRACK_STEP_NAMES = ['Placed', 'Priced', 'Being made', 'Ready'];

/* =========================================================================
   PIECES
   ========================================================================= */

/* The four-stage progress line.          Time O(n) · Space O(n) */
function trackTimelineHtml(order) {
    if (order.status === 'voided') {
        return '<div class="void-banner"><strong>VOIDED – NON-REFUNDABLE</strong><span>' +
            escapeHtml(order.voidReason) + ' · ' + escapeHtml(formatStamp(order.voidedAt)) + '</span>' +
            (order.amountPaid > 0 ? '<span>' + escapeHtml(peso(order.amountPaid)) + ' paid is retained by the shop.</span>' : '') + '</div>';
    }
    var reached = positionIn(TRACK_STEPS, order.status);
    return '<ol class="timeline">' + renderEach(TRACK_STEP_NAMES, function (name, i) {
        var state = i < reached ? 'is-done' : (i === reached ? 'is-now' : '');
        return '<li class="' + state + '"><span class="timeline-dot">' + (i < reached ? icon('check', 12) : '') +
               '</span><span>' + escapeHtml(name) + '</span></li>';
    }) + '</ol>';
}

/* Items with their quoted amounts once there is a quotation.
                                          Time O(n) · Space O(n) */
function trackItemsHtml(order) {
    var quoted = order.status !== 'requested' && !(order.status === 'voided' && order.quotedAt === 0);
    return '<ul class="order-items">' + renderEach(order.items, function (item) {
        var type = quoteTypeById(item.quoteType);
        var breakdown = !quoted ? '' : '<div class="line-break t-caption">' +
            '<span>Materials ' + peso(item.materials) + '</span><span>Labour ' + peso(item.labor) + '</span>' +
            (item.itemExpense > 0 ? '<span>' + escapeHtml(type.expenseLabel || 'Items') + ' ' + peso(item.itemExpense) + '</span>' : '') +
            '<strong>' + peso(lineTotal(item)) + '</strong></div>';
        return '<li class="order-item"><div class="order-item-media">' + imageOrEmpty(itemThumb(item), '') + '</div>' +
            '<div class="order-item-body"><strong>' + escapeHtml(item.productName) + ' × ' + item.quantity + '</strong>' +
            specPills(itemSpecs(item)) + (item.notes ? '<span class="t-caption dim">“' + escapeHtml(item.notes) + '”</span>' : '') +
            (quoted ? breakdown : '<span class="t-caption dim">' + escapeHtml(itemEstimateText(item)) + '</span>') + '</div></li>';
    }) + '</ul>';
}

/* Totals: an estimate before quoting, the quotation after.
                                          Time O(n) · Space O(n) */
function trackTotalsHtml(order) {
    if (order.status === 'requested' || (order.status === 'voided' && order.quotedAt === 0)) {
        return summaryRows([
            { k: 'Price-list estimate', v: estimateText(order) },
            { k: 'Delivery & handling', v: order.delivery.status === 'manual' ? 'Set by the shop' : peso(order.delivery.fee) }
        ]) + '<p class="t-foot dim mt-2">Waiting for the owner to price your quote request. You will get it by email.</p>';
    }
    var rows = [
        { k: 'Subtotal', v: peso(orderSubtotal(order)) },
        { k: 'Delivery & handling', v: peso(order.deliveryFee) },
        { k: 'Rush fee', v: peso(order.rushFee) },
        { k: 'Total', v: peso(orderTotal(order)), grand: true }
    ];
    if (order.amountPaid > 0) {
        listAdd(rows, { k: 'Paid', v: peso(order.amountPaid) });
        if (order.status !== 'voided') listAdd(rows, { k: 'Remaining balance', v: peso(orderBalance(order)) });
    }
    return summaryRows(rows) + (order.quoteNote ? '<p class="quote-note t-foot">' + icon('chat', 14) + ' ' +
        escapeHtml(order.quoteNote) + '</p>' : '');
}

/* The two payment choices with what each costs now.  Time O(n) · Space O(1) */
function payChoicesHtml(order) {
    var total = orderTotal(order);
    return '<div class="pay-grid">' + renderEach(PAYMENT_METHODS, function (m) {
        var now = m.share === 1 ? total : roundMoney(total * m.share);
        return '<button class="pay-option" type="button" data-pay-method="' + m.id + '" aria-pressed="' +
            (trackState.method === m.id ? 'true' : 'false') + '"><span class="pay-mark">' + icon('check', 14) + '</span>' +
            '<span class="pay-body"><span class="pay-name">' + escapeHtml(m.name) + '</span><span class="pay-blurb">' +
            escapeHtml(m.blurb) + '</span></span><span class="pay-due">' + peso(now) + '<span class="pay-now">due now</span></span></button>';
    }) + '</div>';
}

/* GCash reference input with instructions.  Time O(1) · Space O(1) */
function gcashFieldHtml(amount) {
    return '<p class="t-foot dim-2 mt-3">Send <strong>' + escapeHtml(peso(amount)) + '</strong> by GCash to the number on ' +
        escapeHtml(SHOP_INFO.social) + ', then enter the 13-digit reference number from your GCash receipt.</p>' +
        '<label class="field mt-2"><span class="field-label">GCash reference number</span>' +
        '<input class="input t-mono" id="gcashRef" inputmode="numeric" maxlength="16" autocomplete="off" placeholder="0000 000 000000"></label>' +
        (trackState.error ? '<p class="field-error">' + escapeHtml(trackState.error) + '</p>' : '');
}

/* What the customer can do next, by status.  Time O(n) · Space O(1) */
function trackActionsHtml(order) {
    if (order.status === 'quoted') {
        var method = paymentById(trackState.method);
        var due = method.share === 1 ? orderTotal(order) : roundMoney(orderTotal(order) * method.share);
        return '<section class="track-block"><h3 class="t-title3 mb-3">Accept and pay</h3>' + payChoicesHtml(order) + gcashFieldHtml(due) + '</section>';
    }
    if (owesBalance(order)) {
        return '<section class="track-block"><h3 class="t-title3 mb-1">Pay the balance</h3>' +
            '<p class="t-foot dim">' + (order.status === 'completed' ? 'The shop updated this order after it was released. Please settle the difference.'
                : 'Settle the balance before ' + (order.fulfilment.mode === 'delivery' ? 'delivery' : 'pickup') + '.') + '</p>' +
            gcashFieldHtml(orderBalance(order)) + '</section>';
    }
    return '';
}

/* =========================================================================
   RENDER
   ========================================================================= */

/*                                        Time O(1)  · Space O(1) */
function trackFormHtml() {
    return '<form class="track-form" id="trackForm" novalidate>' +
        '<label class="field"><span class="field-label">Tracking number</span>' +
        '<input class="input t-mono" id="trackRef" placeholder="SU-215" autocomplete="off" value="' + escapeHtml(trackState.ref) + '"></label>' +
        '<label class="field"><span class="field-label">Mobile number or email used on the order</span>' +
        '<input class="input" id="trackPhone" autocomplete="email" placeholder="0917 123 4567 or name@gmail.com" value="' +
        escapeHtml(trackState.phone) + '"></label>' +
        '<button class="ui-btn ui-btn-primary ui-btn-block mt-3" type="submit">Find my order</button></form>';
}

/*                                        Time O(n) · Space O(n) */
function trackOrderHtml(order) {
    var f = order.fulfilment;
    return '<div class="track-head"><div><p class="t-over dim">Order</p><p class="receipt-ref">' + escapeHtml(order.ref) + '</p></div>' +
        statusBadge(order) + '</div>' + trackTimelineHtml(order) +
        '<section class="track-block">' + trackItemsHtml(order) + '</section>' +
        '<section class="track-block"><dl class="order-facts">' +
            '<div><dt>Placed</dt><dd>' + escapeHtml(formatStamp(order.createdAt)) + '</dd></div>' +
            '<div><dt>' + (f.mode === 'delivery' ? 'Delivery' : 'Pickup') + '</dt><dd>' + escapeHtml(whenText(order)) +
            (order.rush ? ' · Rush' : '') + '</dd></div>' +
            (f.mode === 'delivery' ? '<div><dt>Address</dt><dd>' + escapeHtml(f.address + ', ' + (f.barangay ? f.barangay + ', ' : '') + f.city) + '</dd></div>' +
             '<div><dt>Delivery</dt><dd>' + escapeHtml(order.delivery.label) + '</dd></div>' : '') +
            '<div><dt>Payment</dt><dd>' + escapeHtml(paymentStatus(order)) +
            (order.paymentMethod ? ' · ' + escapeHtml(paymentById(order.paymentMethod).short) : '') + '</dd></div>' +
        '</dl></section>' +
        '<section class="track-block">' + trackTotalsHtml(order) + '</section>' +
        trackActionsHtml(order) +
        (order.receipts.length > 0 ? '<section class="track-block"><h3 class="t-title3 mb-2">Receipts</h3>' + receiptListHtml(order) + '</section>' : '');
}

/* The footer's buttons follow the status.  Time O(n) · Space O(n) */
function trackFootHtml(order) {
    if (!order) return '';
    var back = '<button class="ui-btn ui-btn-quiet" type="button" id="trackAnother">Another order</button>';
    if (order.status === 'requested') {
        return '<div class="row-center">' + back + '<button class="ui-btn ui-btn-danger flex-fill" type="button" id="trackCancel">Cancel quote request</button></div>';
    }
    if (order.status === 'quoted') {
        return '<div class="row-center"><button class="ui-btn ui-btn-danger" type="button" id="trackDecline">Decline</button>' +
            '<button class="ui-btn ui-btn-primary flex-fill" type="button" id="trackPay">Accept and pay</button></div>';
    }
    if (owesBalance(order)) {
        return '<div class="row-center">' + back + '<button class="ui-btn ui-btn-primary flex-fill" type="button" id="trackBalance">Pay ' +
            escapeHtml(peso(orderBalance(order))) + '</button></div>';
    }
    return '<div class="row-center">' + back + '</div>';
}

/*                                        Time O(n) · Space O(n) */
function renderTrack() {
    var order = trackState.orderId ? orderById(trackState.orderId) : null;
    $('#trackBody').innerHTML = order ? trackOrderHtml(order) : trackFormHtml() +
        (trackState.error ? '<p class="notice notice-warn mt-3">' + icon('alert', 16) + ' ' + escapeHtml(trackState.error) + '</p>' : '');
    $('#trackFoot').innerHTML = trackFootHtml(order);
    setHidden($('#trackFoot'), !order);
}

/* Open the sheet, optionally straight onto an order.  Time O(log n) + O(n) · Space O(n) */
function openTrack(ref, phone) {
    trackState = { ref: ref || '', phone: phone || '', orderId: 0, method: 'gcash-50', error: '' };
    if (ref && phone) {
        var order = customerLookup(ref, phone);
        if (order) trackState.orderId = order.id;
    }
    renderTrack();
    sheetOpen(trackSheet);
}

/* =========================================================================
   ACTIONS
   ========================================================================= */

/*                                        Time O(log n) + O(n) · Space O(n) */
function findTracked() {
    trackState.ref = $('#trackRef').value;
    trackState.phone = $('#trackPhone').value;
    var order = customerLookup(trackState.ref, trackState.phone);
    trackState.error = order ? '' : 'No order matches that tracking number and mobile number or email. Check both and try again.';
    trackState.orderId = order ? order.id : 0;
    renderTrack();
}

/*                                        Time O(n²) · Space O(n) */
function payFromTrack(kind) {
    var input = $('#gcashRef'), ref = input ? input.value : '';
    var result = kind === 'balance'
        ? payBalance(trackState.orderId, ref, Date.now())
        : acceptQuote(trackState.orderId, trackState.method, ref, Date.now());
    if (!result.ok) {
        trackState.error = result.error;
        renderTrack();
        var field = $('#gcashRef');
        if (field) { field.value = ref; field.focus(); }
        return;
    }
    trackState.error = '';
    renderTrack();
    refreshShop();
    toast({ title: 'Payment received', message: 'Receipt ' + result.receipt.no + ' is ready.', kind: 'success' });
    openReceipt(result.receipt.no);
}

/*                                        Time O(n)  · Space O(n) */
function voidFromTrack(title, message, label) {
    askConfirm({ title: title, message: message, confirmLabel: label, danger: true,
        reasonLabel: 'Reason (optional)',
        onConfirm: function (reason) {
            var result = voidOrder(trackState.orderId, reason, 'customer', Date.now());
            if (!result.ok) { toast({ title: result.error, kind: 'error' }); return; }
            renderTrack();
            toast({ title: result.order.ref + ' was voided', message: 'It is kept on record as VOIDED – NON-REFUNDABLE.', kind: 'info' });
        } });
}

/*                                        Time O(1)  · Space O(1) */
function initTrack() {
    trackSheet = sheetCreate($('#trackSheet'), { axis: sideAxis });
    $('#trackButton').addEventListener('click', function () { openTrack('', ''); });
    $('#footTrack').addEventListener('click', function () { openTrack('', ''); });
    var body = $('#trackBody');
    body.addEventListener('submit', function (e) { e.preventDefault(); findTracked(); });
    on(body, 'click', '[data-pay-method]', function (e, b) {
        trackState.method = b.getAttribute('data-pay-method');
        var typed = $('#gcashRef') ? $('#gcashRef').value : '';
        renderTrack();
        if ($('#gcashRef')) $('#gcashRef').value = typed;
    });
    wireReceiptButtons(body);
    $('#trackFoot').addEventListener('click', function (e) {
        var t = e.target.closest('button');
        if (!t) return;
        if (t.id === 'trackAnother') { trackState = { ref: '', phone: '', orderId: 0, method: 'gcash-50', error: '' }; renderTrack(); }
        else if (t.id === 'trackPay') payFromTrack('accept');
        else if (t.id === 'trackBalance') payFromTrack('balance');
        else if (t.id === 'trackCancel') voidFromTrack('Cancel this quote request?',
            'The quote request will be voided and kept on record as VOIDED – NON-REFUNDABLE.', 'Cancel quote request');
        else if (t.id === 'trackDecline') voidFromTrack('Decline the quotation?',
            'Declining voids the order. It is kept on record as VOIDED – NON-REFUNDABLE.', 'Decline and void');
    });
}
