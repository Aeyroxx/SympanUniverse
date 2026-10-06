/* =========================================================================
   ORDER DESK · ORDER SHEET — details, quotation, editing, payments, voids.

   One sheet, five modes:
     order     everything about an order: items, contact, quotation,
               receipts, history and the revision log
     quote     price each line from materials, labour and item cost,
               confirm the delivery fee, and send the quotation
     edit      change any detail of the order; every change is logged
     pay       record a GCash payment taken outside the site
     tracking  attach the courier's tracking number or link
   Depends on admin-desk.js, orders.js, editing.js and receipt.js.
   ========================================================================= */

var deskSheet = null;
var deskSheetState = { mode: '', orderId: 0, draft: null, kind: '', method: 'gcash-50', errors: [] };

/* =========================================================================
   SMALL FORM HELPERS
   ========================================================================= */

/* A money input bound to a draft path.   Time O(1)  · Space O(1) */
function moneyInput(attrs, value, label) {
    return '<label class="field money-field"><span class="field-label">' + escapeHtml(label) + '</span>' +
        '<span class="money-wrap"><span class="money-sign">₱</span><input class="input t-num" type="number" min="0" step="0.01" inputmode="decimal" ' +
        attrs + ' value="' + (isNaN(value) ? '' : value) + '"></span></label>';
}

/*                                        Time O(n) · Space O(n) */
function errorListHtml(errors) {
    if (errors.length === 0) return '';
    return '<div class="notice notice-warn">' + icon('alert', 16) + '<ul>' + renderEach(errors, function (e) {
        return '<li>' + escapeHtml(e.message || e) + '</li>';
    }) + '</ul></div>';
}

/* <option>s, with one selected.          Time O(n)  · Space O(n) */
function optionsHtml(list, selected, valueOf, labelOf) {
    return renderEach(list, function (x) {
        var v = valueOf(x);
        return '<option value="' + escapeHtml(v) + '"' + (String(v) === String(selected) ? ' selected' : '') + '>' + escapeHtml(labelOf(x)) + '</option>';
    });
}

/* =========================================================================
   MODE: ORDER DETAILS
   ========================================================================= */

/*                                        Time O(n²) — the revisions and their changes · Space O(n) */
function deskOrderHtml(order) {
    var quoted = order.quotedAt > 0;
    var history = renderEach(backwards(order.history), function (h) {
        return '<li><span class="t-caption dim">' + escapeHtml(formatStamp(h.stamp)) + '</span><span>' + escapeHtml(h.text) + '</span></li>';
    });
    var revisions = order.revisions.length === 0 ? '<p class="t-foot dim">No edits.</p>' :
        renderEach(backwards(order.revisions), function (r) {
            return '<div class="revision"><p class="t-caption dim">' + escapeHtml(formatStamp(r.stamp)) + '</p><ul>' +
                renderEach(r.changes, function (c) { return '<li>' + escapeHtml(c) + '</li>'; }) + '</ul></div>';
        });
    var money = quoted ? summaryRows([
        { k: 'Subtotal', v: peso(orderSubtotal(order)) },
        { k: 'Delivery & handling', v: peso(order.deliveryFee) },
        { k: 'Rush fee', v: peso(order.rushFee) },
        { k: 'Total', v: peso(orderTotal(order)), grand: true },
        { k: 'Paid', v: peso(order.amountPaid) },
        { k: order.status === 'voided' ? 'Retained (non-refundable)' : 'Balance', v: peso(order.status === 'voided' ? order.amountPaid : orderBalance(order)) },
        { k: 'Payment status', v: paymentStatus(order) + (order.paymentMethod ? ' · ' + paymentById(order.paymentMethod).short : '') }
    ]) : summaryRows([{ k: 'Price-list estimate', v: estimateText(order) }, { k: 'Quotation', v: 'Not sent yet' }]);

    return '<div class="row-between mb-3"><div><p class="receipt-ref">' + escapeHtml(order.ref) + '</p><p class="t-foot dim">' +
        escapeHtml(order.customer.name) + '</p></div>' + statusBadge(order) + '</div>' +
        (order.status === 'voided' ? '<div class="void-banner mb-4"><strong>VOIDED – NON-REFUNDABLE</strong><span>' + escapeHtml(order.voidReason) +
            ' · by ' + escapeHtml(order.voidedBy) + ' · ' + escapeHtml(formatStamp(order.voidedAt)) + '</span></div>' : '') +
        '<div class="detail-layout desk-detail"><div>' +
            '<h3 class="t-title3 mb-2">Items</h3>' + deskItemsHtml(order, quoted) +
            (order.quoteNote ? '<p class="quote-note t-foot mt-3">' + icon('chat', 14) + ' ' + escapeHtml(order.quoteNote) + '</p>' : '') +
            '<h3 class="t-title3 mt-5 mb-2">Money</h3><div class="panel">' + money + '</div>' +
            '<h3 class="t-title3 mt-5 mb-2">Receipts</h3>' + receiptListHtml(order) +
        '</div><div>' +
            '<h3 class="t-title3 mb-2">Customer and schedule</h3>' + deskFactsHtml(order) +
            '<h3 class="t-title3 mt-5 mb-2">History</h3><ol class="history">' + history + '</ol>' +
            '<h3 class="t-title3 mt-5 mb-2">Revision log</h3>' + revisions +
            '<h3 class="t-title3 mt-5 mb-2">Emails to the customer</h3>' + orderMailHtml(order) +
        '</div></div>';
}

/* The emails this order sent, newest first.  Time O(n²) · Space O(n) */
function orderMailHtml(order) {
    var list = mailForOrder(order.id);
    if (list.length === 0) return '<p class="t-foot dim">None yet.</p>';
    return '<ul class="history">' + renderEach(list, function (m) {
        var status = firstWhere(MAIL_STATUS, function (s) { return s.id === m.status; });
        return '<li><span class="t-caption dim">' + escapeHtml(formatStamp(m.stamp) + ' · ' + status.label) + '</span><span>' +
               escapeHtml(m.subject) + '</span></li>';
    }) + '</ul>';
}

/* =========================================================================
   MODE: QUOTATION
   ========================================================================= */

/*                                        Time O(n) · Space O(n) */
function quoteEditorHtml(order) {
    var d = deskSheetState.draft;
    var lines = renderEach(order.items, function (item, i) {
        var type = quoteTypeById(item.quoteType), line = d.lines[i];
        var learned = line.suggested > 0
            ? 'Filled in from your last ' + (line.suggested === 1 ? 'quote' : line.suggested + ' quotes') + ' for this product' +
              (line.sameSize ? ' and size' : ' (another size — check it)') + '. '
            : '';
        var hint = item.kind !== 'quote'
            ? 'Price-list price ' + peso(item.estimate) + ' is filled in as materials.'
            : learned + (type.provided ? (item.provided ? 'Customer provides ' + type.provided + ': leave the item cost at ₱0.'
                                              : 'The shop sources ' + type.provided + ': enter their cost as the item cost.')
                             : 'Materials and labour for this design.');
        return '<section class="quote-line"><div class="row-between"><strong>' + (i + 1) + '. ' + escapeHtml(item.productName) + ' × ' + item.quantity +
            '</strong><span class="t-num" data-line-total="' + i + '">' + peso(lineTotal(line)) + '</span></div>' + specPills(itemSpecs(item)) +
            (item.notes ? '<p class="t-caption mt-1">“' + escapeHtml(item.notes) + '”</p>' : '') +
            '<p class="t-caption dim mt-1">' + escapeHtml(hint) + '</p><div class="money-row">' +
            moneyInput('data-q-line="' + i + '" data-q-part="materials"', line.materials, 'Materials') +
            moneyInput('data-q-line="' + i + '" data-q-part="labor"', line.labor, 'Labour / assembly') +
            moneyInput('data-q-line="' + i + '" data-q-part="itemExpense"', line.itemExpense, type.expenseLabel ? type.expenseLabel + ' cost' : 'Item cost') +
            '</div></section>';
    });
    var dq = order.delivery;
    var feeHint = dq.service === 'pickup' ? 'Pickup — no delivery fee.'
        : dq.status === 'final' ? dq.label + ' — the shop\'s own rate.'
        : dq.status === 'estimate' ? dq.label + '. Confirm or correct it before sending.'
        : dq.status === 'confirmed' ? dq.label + ' — confirmed.'
        : 'No courier rate on file for ' + (dq.area || 'this address') + '. Enter the fee.';
    return '<p class="t-callout dim-2 mb-4">Price every line from its materials and the labour of assembly. Item cost is only for things the shop buys on the customer\'s behalf, and is shown to them separately.</p>' +
        lines +
        '<section class="quote-line"><strong>Delivery and rush</strong><p class="t-caption dim mt-1">' + escapeHtml(feeHint) + '</p><div class="money-row">' +
        moneyInput('data-q-fee="deliveryFee"', d.deliveryFee, 'Delivery & handling') +
        moneyInput('data-q-fee="rushFee"', d.rushFee, order.rush ? 'Rush fee (rush requested)' : 'Rush fee') + '</div></section>' +
        '<label class="field mt-3"><span class="field-label">Note to the customer (optional)</span><textarea class="textarea" data-q-note maxlength="' +
        MAX_NOTE + '">' + escapeHtml(d.note) + '</textarea></label>' + errorListHtml(deskSheetState.errors);
}

/* Total of the draft quotation.          Time O(n) · Space O(n) */
function draftQuoteTotal() {
    var d = deskSheetState.draft;
    return roundMoney(sumRecursive(d.lines, lineTotal) + (Number(d.deliveryFee) || 0) + (Number(d.rushFee) || 0));
}

/* =========================================================================
   MODE: EDIT ORDER
   ========================================================================= */

/* The spec fields for one item, by kind. Time O(n) · Space O(n) */
function editItemSpecsHtml(item, i) {
    var product = productById(item.productId);
    if (product.kind === 'flower') {
        return '<label class="field"><span class="field-label">Arrangement</span><select class="select" data-item="' + i + '" data-item-field="arrangement">' +
            optionsHtml(ARRANGEMENTS, item.arrangement, function (a) { return a.id; }, function (a) { return a.name; }) + '</select></label>' +
            '<label class="field"><span class="field-label">Flowers</span><input class="input" type="number" min="1" max="500" data-item="' + i +
            '" data-item-field="count" value="' + item.count + '"></label>' +
            '<label class="field"><span class="field-label">Colour</span><select class="select" data-item="' + i + '" data-item-field="color">' +
            optionsHtml(COLORS, item.color, function (c) { return c.id; }, function (c) { return c.name; }) + '</select></label>';
    }
    var type = quoteTypeById(product.quoteType);
    return '<label class="field"><span class="field-label">Size</span><input class="input" maxlength="40" data-item="' + i +
        '" data-item-field="size" value="' + escapeHtml(item.size) + '"></label>' +
        '<label class="field"><span class="field-label">' + escapeHtml(type.countLabel) + '</span><input class="input" type="number" min="1" max="500" data-item="' +
        i + '" data-item-field="count" value="' + item.count + '"></label>' +
        '<label class="field"><span class="field-label">' + escapeHtml(type.detailLabel) + '</span><input class="input" maxlength="160" data-item="' + i +
        '" data-item-field="detail" value="' + escapeHtml(item.detail) + '"></label>' +
        (type.provided ? '<label class="check"><input type="checkbox" data-item="' + i + '" data-item-field="provided"' + (item.provided ? ' checked' : '') +
         '><span class="box">' + icon('check') + '</span><span class="check-body"><span class="check-title">Customer provides ' +
         escapeHtml(type.provided) + '</span></span></label>' : '');
}

/* Add-on toggles, and the card's dried flower, for one line.
                                          Time O(n) · Space O(n) */
function editAddonsHtml(item, i) {
    var product = productById(item.productId);
    var offered = keepWhere(ADDONS, function (a) { return product.kind === 'flower' || !a.flowersOnly; });
    return '<div class="edit-addons">' + renderEach(offered, function (a) {
        return '<label class="check"><input type="checkbox" data-item="' + i + '" data-item-addon="' + a.id + '"' +
            (isIn(item.addons, a.id) ? ' checked' : '') + '><span class="box">' + icon('check') + '</span><span class="check-body">' +
            '<span class="check-title">' + escapeHtml(a.name) + '</span></span></label>';
    }) + (isIn(item.addons, 'card') ? '<label class="field"><span class="field-label">Dried flower on the card</span><select class="select" data-item="' +
        i + '" data-item-field="cardFlower">' + optionsHtml(CARD_FLOWERS, item.cardFlower, function (f) { return f; }, function (f) { return f; }) +
        '</select></label>' : '') + '</div>';
}

/*                                        Time O(n²) · Space O(n) */
function orderEditorHtml(order) {
    var d = deskSheetState.draft, delivery = d.mode === 'delivery';
    var items = renderEach(d.items, function (item, i) {
        return '<section class="quote-line"><div class="row-between"><strong>Item ' + (i + 1) + '</strong>' +
            '<button class="ui-btn ui-btn-ghost ui-btn-sm" type="button" data-remove-item="' + i + '"' + (d.items.length < 2 ? ' disabled' : '') +
            '>Remove</button></div><div class="edit-grid">' +
            '<label class="field"><span class="field-label">Product</span><select class="select" data-item="' + i + '" data-item-field="productId">' +
            optionsHtml(products, item.productId, function (p) { return p.id; }, function (p) { return p.name + (p.active ? '' : ' (disabled)'); }) +
            '</select></label><label class="field"><span class="field-label">Quantity</span><input class="input" type="number" min="1" max="99" data-item="' +
            i + '" data-item-field="quantity" value="' + item.quantity + '"></label>' + editItemSpecsHtml(item, i) + '</div>' +
            editAddonsHtml(item, i) +
            '<label class="field mt-2"><span class="field-label">Notes</span><input class="input" maxlength="' + MAX_NOTE + '" data-item="' + i +
            '" data-item-field="notes" value="' + escapeHtml(item.notes) + '"></label><div class="money-row">' +
            moneyInput('data-item="' + i + '" data-item-field="materials"', item.materials, 'Materials') +
            moneyInput('data-item="' + i + '" data-item-field="labor"', item.labor, 'Labour') +
            moneyInput('data-item="' + i + '" data-item-field="itemExpense"', item.itemExpense, 'Item cost') + '</div></section>';
    });
    /* One bound text field.                Time O(1)  · Space O(1) */
    var field = function (key, label, attrs) {
        return '<label class="field"><span class="field-label">' + escapeHtml(label) + '</span><input class="input" data-edit="' + key + '" value="' +
               escapeHtml(d[key]) + '" ' + (attrs || '') + '></label>';
    };
    return '<p class="t-callout dim-2 mb-4">Change anything the customer asked to change. Every change is written to the order\'s revision log, and the balance follows the new total.</p>' +
        items + '<div class="row-center mb-4"><select class="select" id="addItemProduct" aria-label="Product to add">' +
        optionsHtml(activeProducts(), '', function (p) { return p.id; }, function (p) { return p.name; }) +
        '</select><button class="ui-btn ui-btn-quiet" type="button" data-add-item>' + icon('plus', 16) + ' Add item</button></div>' +
        '<h3 class="t-title3 mb-2">Customer</h3><div class="edit-grid">' + field('name', 'Name', 'maxlength="60"') +
        field('phone', 'Mobile', 'inputmode="tel"') + field('email', 'Email', 'type="email" maxlength="100"') +
        field('handle', 'Facebook / Instagram', 'maxlength="60"') + '</div>' +
        '<h3 class="t-title3 mt-4 mb-2">Schedule and fulfilment</h3><div class="edit-grid">' +
        '<label class="field"><span class="field-label">Pickup or delivery</span><select class="select" data-edit="mode">' +
        optionsHtml(FULFILMENT_MODES, d.mode, function (m) { return m.id; }, function (m) { return m.name; }) + '</select></label>' +
        field('date', delivery ? 'Date' : 'Pickup date', 'type="date"') +
        (delivery ? '<label class="field"><span class="field-label">Delivery time</span><select class="select" data-edit="slot">' +
            optionsHtml(TIME_SLOTS, d.slot || TIME_SLOTS[0], function (s) { return s; }, function (s) { return s; }) + '</select></label>' : '') +
        (delivery ? field('address', 'Street', 'maxlength="120"') + field('barangay', 'Barangay', 'maxlength="60"') + field('city', 'City', 'maxlength="60"') +
            '<label class="field"><span class="field-label">Courier</span><select class="select" data-edit="courier">' +
            '<option value=""' + (d.courier ? '' : ' selected') + '>None (the shop delivers)</option>' +
            optionsHtml(COURIERS, d.courier, function (c) { return c.id; }, function (c) { return c.name; }) + '</select></label>' : '') +
        '</div><label class="check mt-2"><input type="checkbox" data-edit="rush"' + (d.rush ? ' checked' : '') + '><span class="box">' + icon('check') +
        '</span><span class="check-body"><span class="check-title">Rush order</span></span></label>' +
        '<div class="money-row">' + moneyInput('data-edit="deliveryFee"', d.deliveryFee, 'Delivery & handling') +
        moneyInput('data-edit="rushFee"', d.rushFee, 'Rush fee') + '</div>' +
        '<label class="field mt-2"><span class="field-label">Order notes</span><textarea class="textarea" data-edit="notes" maxlength="' + MAX_NOTE + '">' +
        escapeHtml(d.notes) + '</textarea></label>' + errorListHtml(deskSheetState.errors);
}

/* New total against what has been paid.  Time O(n) · Space O(n) */
function editTotalsText(order) {
    var d = deskSheetState.draft;
    var total = roundMoney(sumRecursive(d.items, lineTotal) + (Number(d.deliveryFee) || 0) + (Number(d.rushFee) || 0));
    var balance = roundMoney(total - order.amountPaid);
    return 'New total ' + peso(total) + (order.amountPaid > 0 ? ' · paid ' + peso(order.amountPaid) + ' · ' +
           (balance >= 0 ? 'balance ' + peso(balance) : 'overpaid ' + peso(-balance)) : '');
}

/* =========================================================================
   MODE: RECORD PAYMENT
   ========================================================================= */

/*                                        Time O(n) · Space O(1) */
function deskPaymentHtml(order) {
    var accept = deskSheetState.kind === 'accept';
    var share = paymentById(deskSheetState.method).share;
    var due = accept ? (share === 1 ? orderTotal(order) : roundMoney(orderTotal(order) * share)) : orderBalance(order);
    return '<p class="t-callout dim-2 mb-3">' + (accept ? 'Record a GCash payment the customer made for this quotation.' :
        'Record the GCash payment of the remaining balance.') + '</p>' +
        (accept ? '<div class="pay-grid mb-3">' + renderEach(PAYMENT_METHODS, function (m) {
            var now = m.share === 1 ? orderTotal(order) : roundMoney(orderTotal(order) * m.share);
            return '<button class="pay-option" type="button" data-desk-method="' + m.id + '" aria-pressed="' + (deskSheetState.method === m.id ? 'true' : 'false') +
                '"><span class="pay-mark">' + icon('check', 14) + '</span><span class="pay-body"><span class="pay-name">' + escapeHtml(m.name) +
                '</span></span><span class="pay-due">' + peso(now) + '</span></button>';
        }) + '</div>' : '') +
        summaryRows([{ k: 'Amount received', v: peso(due), grand: true }]) +
        '<label class="field mt-3"><span class="field-label">GCash reference number</span><input class="input t-mono" id="deskGcashRef" inputmode="numeric" maxlength="16" autocomplete="off"></label>' +
        errorListHtml(deskSheetState.errors);
}

/* =========================================================================
   MODE: COURIER TRACKING
   ========================================================================= */

/* The tracking form: courier, number, link.  Time O(n) · Space O(n) */
function trackingEditorHtml(order) {
    var d = deskSheetState.draft;
    return '<p class="t-callout dim-2 mb-4">Once the courier has the parcel, enter the parcel number it gave you, its tracking link, or both. ' +
        'The customer sees them on Track order and gets them by email.</p>' +
        '<div class="edit-grid"><label class="field"><span class="field-label">Courier</span><select class="select" data-track-field="courier">' +
        optionsHtml(trackingCouriers(), d.courier, function (c) { return c.id; }, function (c) { return c.name; }) + '</select></label>' +
        '<label class="field"><span class="field-label">Parcel number</span><input class="input t-mono" data-track-field="number" maxlength="60" ' +
        'autocomplete="off" placeholder="e.g. P0123N5WXP8EA" value="' + escapeHtml(d.number) + '"></label></div>' +
        '<label class="field"><span class="field-label">Tracking link (optional)</span><input class="input" data-track-field="link" maxlength="' +
        TRACKING_LINK_MAX + '" autocomplete="off" placeholder="https://… — the link the courier sent, e.g. a Lalamove share link" value="' +
        escapeHtml(d.link) + '"></label>' +
        '<p class="t-foot dim mt-2">Only https:// links on the courier\'s own site are accepted. Without a link the customer is pointed to the courier\'s own website to enter the number.</p>' +
        errorListHtml(deskSheetState.errors);
}

/* =========================================================================
   RENDER AND OPEN
   ========================================================================= */

/*                                        Time O(n²) · Space O(n) */
function renderDeskSheet() {
    var s = deskSheetState, order = orderById(s.orderId);
    if (!order) return;
    var body = $('#deskBody'), foot = $('#deskFoot'), top = body.scrollTop;
    if (s.mode === 'quote') {
        $('#deskTitle').textContent = (order.status === 'quoted' ? 'Revise quotation · ' : 'Quotation · ') + order.ref;
        body.innerHTML = quoteEditorHtml(order);
        foot.innerHTML = '<div class="row-between"><p class="t-title3 t-num" id="quoteTotal">Total ' + peso(draftQuoteTotal()) + '</p>' +
            '<button class="ui-btn ui-btn-primary" type="button" data-desk="send-quote">' + (order.status === 'quoted' ? 'Send revised quotation' : 'Send quotation') + '</button></div>';
    } else if (s.mode === 'edit') {
        $('#deskTitle').textContent = 'Edit order · ' + order.ref;
        body.innerHTML = orderEditorHtml(order);
        foot.innerHTML = '<div class="row-between"><p class="t-foot t-num" id="editTotals">' + escapeHtml(editTotalsText(order)) + '</p>' +
            '<div class="row-center"><button class="ui-btn ui-btn-quiet" type="button" data-desk="back">Cancel</button>' +
            '<button class="ui-btn ui-btn-primary" type="button" data-desk="save-edit">Save changes</button></div></div>';
    } else if (s.mode === 'tracking') {
        $('#deskTitle').textContent = 'Courier tracking · ' + order.ref;
        body.innerHTML = trackingEditorHtml(order);
        foot.innerHTML = '<div class="row-center"><button class="ui-btn ui-btn-quiet" type="button" data-desk="back">Cancel</button>' +
            (order.courierTracking ? '<button class="ui-btn ui-btn-danger" type="button" data-desk="remove-tracking">Remove</button>' : '') +
            '<button class="ui-btn ui-btn-primary flex-fill" type="button" data-desk="save-tracking">Save and email the customer</button></div>';
    } else if (s.mode === 'pay') {
        $('#deskTitle').textContent = 'Record payment · ' + order.ref;
        body.innerHTML = deskPaymentHtml(order);
        foot.innerHTML = '<div class="row-center"><button class="ui-btn ui-btn-quiet" type="button" data-desk="back">Cancel</button>' +
            '<button class="ui-btn ui-btn-primary flex-fill" type="button" data-desk="save-payment">Record payment and issue receipt</button></div>';
    } else {
        $('#deskTitle').textContent = 'Order ' + order.ref;
        body.innerHTML = deskOrderHtml(order);
        foot.innerHTML = '<div class="desk-actions desk-actions-end">' + removeDetailsButton(deskActionsHtml(order)) + '</div>';
    }
    body.scrollTop = top;
}

/* The detail sheet does not need its own "Details" button.  Time O(n) · Space O(n) */
function removeDetailsButton(html) {
    return swapText(html, actButton('open', deskSheetState.orderId, 'Details'), '');
}

/*                                        Time O(n²) · Space O(n) */
function openDeskMode(id, mode, draft) {
    deskSheetState = { mode: mode, orderId: id, draft: draft, kind: '', method: 'gcash-50', errors: [] };
    renderDeskSheet();
    $('#deskBody').scrollTop = 0;
    if (!deskSheet.isOpen) sheetOpen(deskSheet);
}

/*                                        Time O(n²) · Space O(n) */
function openDeskOrder(id) { if (orderById(id)) openDeskMode(id, 'order', null); }

/*                                        Time O(n²) · Space O(n) */
function openQuoteEditor(id) {
    var order = orderById(id);
    if (!order) return;
    if (order.status !== 'requested' && order.status !== 'quoted') { toast({ title: order.ref + ' is past the quotation stage.', kind: 'warn' }); return; }
    openDeskMode(id, 'quote', quoteDraft(order));
}

/*                                        Time O(n²) · Space O(n) */
function openOrderEditor(id) {
    var order = orderById(id);
    if (!order) return;
    if (order.status === 'voided') { toast({ title: 'Voided orders are kept as they were.', kind: 'warn' }); return; }
    openDeskMode(id, 'edit', orderEditDraft(order));
}

/* The tracking form, filled with what the order has, or its courier.
                                          Time O(n²) · Space O(n) */
function openTrackingEditor(id) {
    var order = orderById(id);
    if (!canAttachTracking(order)) { toast({ title: 'Courier tracking can be added once a courier delivery is marked ready.', kind: 'warn' }); return; }
    var t = order.courierTracking;
    openDeskMode(id, 'tracking', t ? { courier: t.courier, number: t.number, link: t.link }
                                   : { courier: order.fulfilment.courier, number: '', link: '' });
}

/*                                        Time O(n²) · Space O(n) */
function openDeskPayment(id, kind) {
    openDeskMode(id, 'pay', null);
    deskSheetState.kind = kind;
    renderDeskSheet();
}

/*                                        Time O(n²) · Space O(n) */
function confirmDeskVoid(id) {
    var order = orderById(id);
    if (!order) return;
    askConfirm({
        title: 'Void ' + order.ref + '?',
        message: 'The order is kept on record as VOIDED – NON-REFUNDABLE' +
            (order.amountPaid > 0 ? ' and the ' + peso(order.amountPaid) + ' paid is retained.' : '.'),
        confirmLabel: 'Void order', danger: true, reasonLabel: 'Reason',
        onConfirm: function (reason) {
            var result = voidOrder(id, reason, 'admin', Date.now());
            toast(result.ok ? { title: order.ref + ' voided', kind: 'info' } : { title: result.error, kind: 'error' });
            deskChanged();
            if (deskSheet.isOpen) openDeskOrder(id);
        }
    });
}

/* =========================================================================
   EVENTS
   ========================================================================= */

/* Keep the draft in step with what is typed.  Time O(n²) · Space O(1) */
function onDeskInput(e) {
    var t = e.target, s = deskSheetState, d = s.draft;
    if (!d) return;
    if (t.hasAttribute('data-q-line')) {
        var i = Number(t.getAttribute('data-q-line'));
        d.lines[i][t.getAttribute('data-q-part')] = toNumber(t.value);
        var cell = $('[data-line-total="' + i + '"]');
        if (cell) cell.textContent = peso(lineTotal(d.lines[i]));
    } else if (t.hasAttribute('data-q-fee')) {
        d[t.getAttribute('data-q-fee')] = toNumber(t.value);
    } else if (t.hasAttribute('data-q-note')) {
        d.note = t.value;
    } else if (t.hasAttribute('data-track-field')) {
        d[t.getAttribute('data-track-field')] = t.value;
    } else if (t.hasAttribute('data-item')) {
        onEditItemInput(t);
    } else if (t.hasAttribute('data-edit')) {
        var key = t.getAttribute('data-edit');
        if (key === 'rush') d.rush = t.checked;
        else if (key === 'deliveryFee' || key === 'rushFee') d[key] = toNumber(t.value);
        else d[key] = t.value;
        if (key === 'mode') {
            if (d.mode === 'delivery' && !d.slot) d.slot = TIME_SLOTS[0];
            renderDeskSheet();
            return;
        }
    }
    var total = $('#quoteTotal');
    if (total) total.textContent = 'Total ' + peso(draftQuoteTotal());
    var editTotals = $('#editTotals');
    if (editTotals) editTotals.textContent = editTotalsText(orderById(s.orderId));
}

/* An edited item field. Changing the product swaps in a fresh line.
                                          Time O(n²) · Space O(1) */
function onEditItemInput(t) {
    var d = deskSheetState.draft, i = Number(t.getAttribute('data-item')), field = t.getAttribute('data-item-field');
    var item = d.items[i], value;
    if (t.hasAttribute('data-item-addon')) {
        var id = t.getAttribute('data-item-addon');
        var addons = !t.checked ? removeValue(item.addons, id) : (isIn(item.addons, id) ? item.addons : withAdded(item.addons, id));
        d.items[i] = copyRecord(item, { addons: addons, cardFlower: isIn(addons, 'card') ? (item.cardFlower || CARD_FLOWERS[0]) : '' });
        if (id === 'card') renderDeskSheet();
        return;
    }
    if (field === 'productId') {
        var product = productById(Number(t.value));
        d.items[i] = copyRecord(blankItemFor(product), { quantity: item.quantity, notes: item.notes });
        renderDeskSheet();
        return;
    }
    if (field === 'provided') value = t.checked;
    else if (field === 'quantity' || field === 'count') value = Math.floor(toNumber(t.value));
    else if (field === 'materials' || field === 'labor' || field === 'itemExpense') value = toNumber(t.value);
    else value = t.value;
    var changes = {};
    changes[field] = value;
    d.items[i] = copyRecord(item, changes);
}

/* Sheet buttons.                         Time O(n²) · Space O(n) */
function onDeskSheetClick(e) {
    var t = e.target.closest('button');
    if (!t) return;
    var s = deskSheetState, d = s.draft;
    if (t.hasAttribute('data-act')) { onDeskAction(e, t); return; }
    if (t.hasAttribute('data-remove-item')) {
        d.items = removeValue(d.items, d.items[Number(t.getAttribute('data-remove-item'))]);
        renderDeskSheet();
    } else if (t.hasAttribute('data-add-item')) {
        d.items = withAdded(d.items, blankItemFor(productById(Number($('#addItemProduct').value))));
        renderDeskSheet();
    } else if (t.hasAttribute('data-desk-method')) {
        s.method = t.getAttribute('data-desk-method');
        renderDeskSheet();
    } else if (t.getAttribute('data-desk') === 'back') {
        openDeskOrder(s.orderId);
    } else if (t.getAttribute('data-desk') === 'send-quote') {
        var sent = sendQuote(s.orderId, d, Date.now());
        if (!sent.ok) { s.errors = sent.errors; renderDeskSheet(); return; }
        toast({ title: 'Quotation sent', message: sent.order.ref + ' · ' + peso(orderTotal(sent.order)), kind: 'success' });
        deskChanged();
        openDeskOrder(s.orderId);
    } else if (t.getAttribute('data-desk') === 'save-edit') {
        var saved = editOrder(s.orderId, d, Date.now());
        if (!saved.ok) { s.errors = [saved.error]; renderDeskSheet(); return; }
        toast({ title: 'Order updated', message: saved.changes.length + ' ' + plural(saved.changes.length, 'change') + ' logged', kind: 'success' });
        deskChanged();
        openDeskOrder(s.orderId);
    } else if (t.getAttribute('data-desk') === 'save-tracking') {
        var tracked = setCourierTracking(s.orderId, d, Date.now());
        if (!tracked.ok) { s.errors = tracked.errors; renderDeskSheet(); return; }
        toast({ title: 'Tracking saved', message: 'The customer has been emailed the tracking details.', kind: 'success' });
        deskChanged();
        openDeskOrder(s.orderId);
    } else if (t.getAttribute('data-desk') === 'remove-tracking') {
        var removed = removeCourierTracking(s.orderId, Date.now());
        toast(removed.ok ? { title: 'Tracking removed', kind: 'info' } : { title: removed.errors[0].message, kind: 'warn' });
        deskChanged();
        openDeskOrder(s.orderId);
    } else if (t.getAttribute('data-desk') === 'save-payment') {
        var ref = $('#deskGcashRef').value;
        var paid = s.kind === 'accept' ? acceptQuote(s.orderId, s.method, ref, Date.now(), deskActor()) : payBalance(s.orderId, ref, Date.now(), deskActor());
        if (!paid.ok) { s.errors = [paid.error]; renderDeskSheet(); $('#deskGcashRef').value = ref; return; }
        toast({ title: 'Payment recorded', message: 'Receipt ' + paid.receipt.no, kind: 'success' });
        deskChanged();
        openDeskOrder(s.orderId);
        openReceipt(paid.receipt.no);
    }
}

/*                                        Time O(1)  · Space O(1) */
function initDeskSheet() {
    deskSheet = sheetCreate($('#deskSheet'));
    var body = $('#deskBody');
    /* Product editor or order sheet.        Time O(1)  · Space O(1) */
    var route = function (e) {
        if (deskSheetState.mode === 'product') onProductEditorInput(e);
        else onDeskInput(e);
    };
    body.addEventListener('input', function (e) { if (isTypingField(e.target)) route(e); });
    body.addEventListener('change', function (e) { if (!isTypingField(e.target)) route(e); });
    body.addEventListener('click', function (e) {
        if (deskSheetState.mode === 'product') onProductEditorClick(e);
        else onDeskSheetClick(e);
    });
    $('#deskFoot').addEventListener('click', function (e) {
        if (deskSheetState.mode === 'product') onProductEditorClick(e);
        else onDeskSheetClick(e);
    });
    wireReceiptButtons(body);
}
