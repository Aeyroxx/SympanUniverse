/* =========================================================================
   RECEIPTS — rendered from the snapshot taken when the payment was made,
   so a receipt reads the same however the order changes afterwards.
   Shared by the customer's tracking sheet and the order desk.
   Depends on ui.js and orders.js.
   ========================================================================= */

var receiptSheet = null;
var shownReceipt = null;

/* The full receipt as markup.            Time O(n) · Space O(n) */
function receiptHtml(r) {
    var fully = r.balance <= 0;
    var lines = renderEach(r.items, function (line) {
        return '<tr><td><strong>' + escapeHtml(line.name) + '</strong>' +
               '<div class="t-caption dim">' + escapeHtml(glue(line.specs, ' · ')) + '</div>' +
               (line.notes ? '<div class="t-caption dim">Note: ' + escapeHtml(line.notes) + '</div>' : '') +
               '</td><td class="num">' + line.quantity + '</td><td class="num">' + peso(line.amount) + '</td></tr>';
    });
    return '<article class="receipt receipt-doc">' +
        '<header class="receipt-head">' +
            '<div><img src="assets/logo.png" alt="" class="receipt-logo">' +
            '<p class="t-caption dim">' + escapeHtml(SHOP_INFO.address) + '<br>' + escapeHtml(SHOP_INFO.email) +
            ' · ' + escapeHtml(SHOP_INFO.social) + '</p></div>' +
            '<div class="receipt-no"><span class="t-over dim">Official receipt</span>' +
            '<span class="receipt-ref">' + escapeHtml(r.no) + '</span>' +
            '<span class="t-caption dim">Order ' + escapeHtml(r.ref) + '</span></div>' +
        '</header>' +
        '<div class="receipt-meta">' +
            '<div><span class="k">Order date</span><span>' + escapeHtml(formatStamp(r.orderDate)) + '</span></div>' +
            '<div><span class="k">Paid on</span><span>' + escapeHtml(formatStamp(r.stamp)) + '</span></div>' +
            '<div><span class="k">Customer</span><span>' + escapeHtml(r.customer.name) + '<br>' +
                escapeHtml(r.customer.phone) + (r.customer.handle ? ' · ' + escapeHtml(r.customer.handle) : '') + '</span></div>' +
            '<div><span class="k">Fulfilment</span><span>' + escapeHtml(r.fulfilment) + '</span></div>' +
        '</div>' +
        '<div class="table-wrap"><table class="tbl receipt-items"><thead><tr><th>Item and customisation</th>' +
            '<th class="num">Qty</th><th class="num">Amount</th></tr></thead><tbody>' + lines + '</tbody></table></div>' +
        summaryRows([
            { k: 'Subtotal', v: peso(r.subtotal) },
            { k: 'Delivery & handling — ' + r.deliveryLabel, v: peso(r.deliveryFee) },
            { k: 'Rush fee', v: peso(r.rushFee) },
            { k: 'Total order amount', v: peso(r.total), grand: true }
        ]) +
        '<div class="receipt-pay">' + summaryRows([
            { k: 'Payment method', v: r.method },
            { k: 'GCash reference', v: r.gcashRef },
            { k: r.kind + ' received', v: peso(r.amount) },
            { k: 'Paid to date', v: peso(r.paidToDate) },
            { k: 'Remaining balance', v: peso(r.balance) }
        ]) + '</div>' +
        '<p class="receipt-status ' + (fully ? 'is-paid' : 'is-partial') + '">' +
            (fully ? 'FULLY PAID' : 'PARTIALLY PAID — balance of ' + escapeHtml(peso(r.balance)) + ' due before release') +
        '</p>' +
        '<p class="t-caption dim">Payments confirm the order and are non-refundable. Thank you for choosing ' +
            escapeHtml(SHOP_INFO.name) + '.</p>' +
    '</article>';
}

/* A compact list of an order's receipts, each opening the full one.
                                          Time O(n) · Space O(n) */
function receiptListHtml(order) {
    if (order.receipts.length === 0) return '<p class="t-foot dim">No payments yet.</p>';
    return '<div class="receipt-list">' + renderEach(order.receipts, function (r) {
        return '<button class="receipt-row" type="button" data-receipt="' + escapeHtml(r.no) + '">' +
               icon('receipt', 18) + '<span class="flex-fill"><strong>' + escapeHtml(r.no) + '</strong> · ' +
               escapeHtml(r.kind) + '<span class="t-caption dim d-block">' + escapeHtml(formatStamp(r.stamp)) +
               '</span></span><span class="t-num">' + peso(r.amount) + '</span></button>';
    }) + '</div>';
}

/* Find a receipt by number — linear over the receipt log.  Time O(n) · Space O(1) */
function receiptByNo(no) {
    return firstWhere(receipts, function (r) { return r.no === no; });
}

/*                                        Time O(n) · Space O(n) */
function openReceipt(no) {
    var r = receiptByNo(no);
    if (!r) return;
    if (!receiptSheet) {
        receiptSheet = sheetCreate($('#receiptSheet'));
        $('#receiptPrint').addEventListener('click', printShownReceipt);
    }
    shownReceipt = r;
    $('#receiptTitle').textContent = 'Receipt ' + r.no;
    $('#receiptBody').innerHTML = receiptHtml(r);
    sheetOpen(receiptSheet);
}

/* Print only the receipt: copy it into the print area, print, clear.
                                          Time O(n) · Space O(n) */
function printShownReceipt() {
    if (!shownReceipt) return;
    var area = $('#printArea');
    area.innerHTML = receiptHtml(shownReceipt);
    document.body.classList.add('is-printing');
    window.print();
    document.body.classList.remove('is-printing');
    area.innerHTML = '';
}

/* Any [data-receipt] button inside a root opens its receipt.  Time O(1) · Space O(1) */
function wireReceiptButtons(root) {
    on(root, 'click', '[data-receipt]', function (e, button) {
        openReceipt(button.getAttribute('data-receipt'));
    });
}
