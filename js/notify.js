/* =========================================================================
   NOTIFY — the emails the shop sends, written and queued automatically.

   Every step of an order writes its own email: the confirmation with the
   tracking number, the quotation, each payment, "ready", and a void. Each
   is recorded in the outbox array and its position joins a circular queue;
   mail.js sends them in order (FIFO). Nothing is queued while the demo
   history is replayed (mailEnabled is off), so no fictional customer is
   ever emailed. Depends on store.js and orders.js.
   ========================================================================= */

/* Record an email and queue it for sending. Returns the record, or null
   while mail is off.                     Time O(n) · Space O(n) */
function queueEmail(to, subject, lines, kind, orderId, stamp) {
    // The demo customers live on example.com, a domain that can never
    // receive mail: their messages are not even queued.
    if (!mailEnabled || !isValidEmail(to) || textHas(toLower(to), '@example.com')) return null;
    var record = {
        id: counters.mail, to: toLower(strip(to)), subject: subject, body: glue(lines, '\n'),
        kind: kind, orderId: orderId, stamp: stamp, status: 'queued', note: ''
    };
    counters.mail++;
    listAdd(outbox, record);
    cqEnqueue(mailQueue, outbox.length - 1);
    return record;
}

/* The lines every order email ends with.  Time O(1) · Space O(1) */
function emailFooter(order) {
    return ['', 'Tracking number: ' + order.ref,
            'Keep this number. Quote it when you message us, or use Track order on our site with your email or mobile number.', '',
            'Thank you,', SHOP_INFO.name, SHOP_INFO.address + ' · ' + SHOP_INFO.social];
}

/* One line per item.                     Time O(n) · Space O(n) */
function emailItemLines(order, withPrices) {
    var out = [];
    for (var i = 0; i < order.items.length; i++) {
        var item = order.items[i];
        listAdd(out, '• ' + item.productName + ' × ' + item.quantity + ' (' + glue(itemSpecs(item), ', ') + ')' +
                (withPrices ? ' — ' + peso(lineTotal(item)) : ''));
    }
    return out;
}

/* Joins several groups of lines into one list.  Time O(n) · Space O(n) */
function emailLines(groups) {
    var out = [];
    for (var g = 0; g < groups.length; g++) {
        for (var i = 0; i < groups[g].length; i++) listAdd(out, groups[g][i]);
    }
    return out;
}

/* Request received: what was asked for, and the tracking number.
                                          Time O(n) · Space O(n) */
function emailQuoteRequested(order, stamp) {
    return queueEmail(order.customer.email, 'We received your quote request ' + order.ref, emailLines([
        ['Hi ' + order.customer.name + ',', '',
         'Thank you! We received your request and will send your quotation shortly.', ''],
        emailItemLines(order, false),
        ['', (order.fulfilment.mode === 'delivery' ? 'Delivery: ' : 'Pickup: ') + whenText(order)],
        emailFooter(order)
    ]), 'requested', order.id, stamp);
}

/* The quotation is ready: the approved price and how to pay.
                                          Time O(n) · Space O(n) */
function emailQuoteReady(order, stamp) {
    return queueEmail(order.customer.email, 'Your quotation for ' + order.ref + ' is ready', emailLines([
        ['Hi ' + order.customer.name + ',', '', 'Your request has been approved and priced:', ''],
        emailItemLines(order, true),
        ['Delivery & handling: ' + peso(order.deliveryFee), 'Rush fee: ' + peso(order.rushFee),
         'Total: ' + peso(orderTotal(order)), '',
         order.quoteNote ? 'Note from the shop: ' + order.quoteNote : '',
         'To confirm, open Track order, then pay a 50% down payment or the full amount by GCash.',
         'The quotation is held for ' + QUOTE_EXPIRY_DAYS + ' days.'],
        emailFooter(order)
    ]), 'quoted', order.id, stamp);
}

/* Order confirmed and paid: the receipt in words.  Time O(n) · Space O(n) */
function emailOrderConfirmed(order, receipt, stamp) {
    return queueEmail(order.customer.email, 'Order confirmed: ' + order.ref, emailLines([
        ['Hi ' + order.customer.name + ',', '', 'Your order is confirmed and we are making it now.', ''],
        emailItemLines(order, true),
        ['', 'Total: ' + peso(receipt.total), receipt.kind + ': ' + peso(receipt.amount) + ' by GCash (ref ' + receipt.gcashRef + ')',
         'Remaining balance: ' + peso(receipt.balance) + (receipt.balance > 0 ? ' — due before ' +
            (order.fulfilment.mode === 'delivery' ? 'delivery' : 'pickup') : ' — fully paid'),
         'Receipt: ' + receipt.no, '',
         (order.fulfilment.mode === 'delivery' ? 'Delivery: ' : 'Pickup: ') + whenText(order)],
        emailFooter(order)
    ]), 'confirmed', order.id, stamp);
}

/*                                        Time O(n) · Space O(n) */
function emailBalancePaid(order, receipt, stamp) {
    return queueEmail(order.customer.email, 'Payment received for ' + order.ref, emailLines([
        ['Hi ' + order.customer.name + ',', '', 'We received your balance payment of ' + peso(receipt.amount) + '.',
         'Your order is now fully paid. Receipt: ' + receipt.no],
        emailFooter(order)
    ]), 'balance', order.id, stamp);
}

/* Ready for pickup, or on its way.       Time O(n) · Space O(n) */
function emailOrderReady(order, stamp) {
    var pickup = order.fulfilment.mode !== 'delivery';
    return queueEmail(order.customer.email, 'Your order ' + order.ref + (pickup ? ' is ready for pickup' : ' is on its way'), emailLines([
        ['Hi ' + order.customer.name + ',', '',
         pickup ? 'Good news — your order is ready. Pick it up at ' + SHOP_INFO.address + ' on ' + whenText(order) + '.'
                : 'Good news — your order is ready and on its way: ' + order.delivery.label + '.'],
        emailFooter(order)
    ]), 'ready', order.id, stamp);
}

/*                                        Time O(n) · Space O(n) */
function emailOrderVoided(order, stamp) {
    return queueEmail(order.customer.email, 'Order ' + order.ref + ' was cancelled', emailLines([
        ['Hi ' + order.customer.name + ',', '', 'Your order has been cancelled: ' + order.voidReason + '.',
         order.amountPaid > 0 ? 'As stated at checkout, payments are non-refundable (' + peso(order.amountPaid) + ').' : '',
         'If this is a mistake, message us at ' + SHOP_INFO.social + '.'],
        emailFooter(order)
    ]), 'voided', order.id, stamp);
}

/* The order desk's sign-in code.         Time O(n) · Space O(n) */
function emailSignInCode(to, code, stamp) {
    // The code is in the body only, never the subject, so lists of
    // emails (the outbox, a phone's lock screen) never show it.
    return queueEmail(to, 'Your order desk sign-in code', [
        'Your ' + SHOP_INFO.name + ' order desk sign-in code is:', '', code, '',
        'It expires in ' + (OTP_LIFETIME_MS / 60000) + ' minutes. If you did not try to sign in, change your password.'
    ], 'otp', 0, stamp);
}
