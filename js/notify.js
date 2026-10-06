/* =========================================================================
   NOTIFY — the emails the shop sends, written and queued automatically.

   Every step of an order writes its own email: the confirmation with the
   tracking number, the quotation, each payment, "ready", and a void. Each
   is recorded in the outbox array and its position joins a circular queue;
   mail.js sends them in order (FIFO). Nothing is queued while the demo
   history is replayed (mailEnabled is off), so no fictional customer is
   ever emailed. Depends on store.js and orders.js.
   ========================================================================= */

/* Is this an address on example.com — a domain reserved for examples,
   which can never receive mail? The domain must match exactly.
                                          Time O(n) · Space O(n) */
function isDemoAddress(email) {
    var parts = cutText(toLower(strip(String(email || ''))), '@');
    return parts.length === 2 && parts[1] === 'example.com';
}

/* Record an email and queue it for sending. Returns the record, or null
   while mail is off.                     Time O(n) · Space O(n) */
function queueEmail(to, subject, lines, kind, orderId, stamp) {
    // The demo customers and the demo staff account live on example.com:
    // their messages are not even queued.
    if (!mailEnabled || !isValidEmail(to) || isDemoAddress(to)) return null;
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

/* The date and time, then what they really are: an estimate the weather
   and the road can still move.           Time O(1) · Space O(1) */
function emailScheduleLines(order) {
    return ['', (order.fulfilment.mode === 'delivery' ? 'Delivery: ' : 'Pickup: ') + whenText(order),
            scheduleNote(order.fulfilment.mode)];
}

/* The courier's tracking, when the order has it.  Time O(n) · Space O(n) */
function emailTrackingLines(order) {
    var t = shownTracking(order);
    if (!t) return [];
    var href = trackingHref(t), courier = trackingCourier(t.courier);
    return ['', 'Courier: ' + (courier ? courier.name : 'Courier') + (t.number ? ' · parcel number ' + t.number : ''),
            t.link ? 'Track your parcel: ' + t.link
                   : (href ? 'Track it on the courier\'s website, ' + href + ', with the number above.' : '')];
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
        emailScheduleLines(order),
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
         'Receipt: ' + receipt.no],
        emailScheduleLines(order),
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
                : 'Good news — your order is ready and on its way: ' + order.delivery.label + '.',
         scheduleNote(order.fulfilment.mode)],
        emailTrackingLines(order),
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

/* The courier's tracking number or link was added or changed.
                                          Time O(n) · Space O(n) */
function emailTrackingAdded(order, stamp) {
    return queueEmail(order.customer.email, 'Track your parcel for ' + order.ref, emailLines([
        ['Hi ' + order.customer.name + ',', '', 'Your order has been handed to the courier. You can follow it here:'],
        emailTrackingLines(order),
        ['', scheduleNote('delivery')],
        emailFooter(order)
    ]), 'tracking', order.id, stamp);
}

/* The courier tracking sent earlier was wrong and has been taken off.
                                          Time O(n) · Space O(n) */
function emailTrackingRemoved(order, stamp) {
    return queueEmail(order.customer.email, 'Correction: parcel tracking for ' + order.ref, emailLines([
        ['Hi ' + order.customer.name + ',', '', 'The courier tracking we sent you for this order was not right, and we have taken it off. ' +
         'Please ignore it — we will send the correct one as soon as we have it.'],
        emailFooter(order)
    ]), 'tracking', order.id, stamp);
}

/* The order desk's password reset code. Like the sign-in code it is in
   the body only, never the subject.      Time O(n) · Space O(n) */
function emailResetCode(to, code, stamp) {
    return queueEmail(to, 'Your order desk password reset code', [
        'Someone asked to reset the ' + SHOP_INFO.name + ' order desk password. Your reset code is:', '', code, '',
        'It expires in ' + (RESET_LIFETIME_MS / 60000) + ' minutes. If this was not you, ignore this email — the password stays as it is.'
    ], 'reset', 0, stamp);
}

/* Tell the owner the password changed, so a change they did not make is
   noticed at once.                       Time O(n) · Space O(n) */
function emailPasswordChanged(to, stamp) {
    return queueEmail(to, 'Your order desk password was changed', [
        'Your ' + SHOP_INFO.name + ' order desk password was changed on ' + formatStamp(stamp) + '.', '',
        'If this was not you, reset the password again at once and check who can read this mailbox.'
    ], 'security', 0, stamp);
}

/* The order desk's sign-in code.         Time O(n) · Space O(n) */
function emailSignInCode(to, code, stamp) {
    // The code is in the body only, never the subject, so lists of
    // emails (the outbox, a phone's lock screen) never show it.
    return queueEmail(to, 'Your order desk sign-in code', [
        'Your ' + SHOP_INFO.name + ' order desk sign-in code is:', '', code, '',
        'It expires in ' + (OTP_LIFETIME_MS / 60000) + ' minutes. If you did not try to sign in, reset your password ' +
        '("Forgot password?" on the sign-in page).'
    ], 'otp', 0, stamp);
}
