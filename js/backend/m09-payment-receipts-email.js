/* =========================================================================
   MODULE 9 · BAYAD, RESIBO AT EMAIL
   GCash lang (50% o 100%), 13 digits ang reference at bawal gamitin ulit
   (linear search sa mga resibo). Snapshot ang resibo. Bawat email ay
   nakapila sa circular queue para isa-isa at in order ang pag-send.
   ========================================================================= */

// ---------- Bayad at resibo ----------

// 13 digits, pwedeng may space sa gitna.
// Time O(n) · Space O(n)
function isValidGcashRef(text) {
    var s = strip(text);
    for (var i = 0; i < s.length; i++) {
        if (!isDigit(s.charAt(i)) && s.charAt(i) !== ' ') return false;
    }
    return digitsOnly(s).length === GCASH_REF_LENGTH;
}

// Snapshot ng order sa oras ng bayad, para hindi magbago
// yung resibo kahit i-edit pa yung order.
// Time O(n) · Space O(n)
function issueReceipt(order, kind, amount, gcashRef, stamp) {
    var lines = [];
    for (var i = 0; i < order.items.length; i++) {
        var item = order.items[i];
        listAdd(lines, { name: item.productName, quantity: item.quantity, specs: itemSpecs(item),
                         notes: item.notes, amount: lineTotal(item) });
    }
    var method = paymentById(order.paymentMethod);
    // Balance ito na binayaran pagkatapos ng unang bayad, kaya iba
    // ang nakasulat imbes na "100% Full Payment" ulit.
    var methodName = kind === 'Balance payment'
        ? 'GCash — balance after ' + (method ? toLower(method.short) : 'down payment')
        : (method ? method.name : 'GCash');
    var receipt = {
        no: 'OR-' + leftPad(counters.receipt, 4, '0'),
        orderId: order.id, ref: order.ref, stamp: stamp, orderDate: order.createdAt,
        kind: kind, method: methodName, gcashRef: digitsOnly(gcashRef),
        amount: roundMoney(amount),
        customer: copyRecord(order.customer),
        fulfilment: fulfilmentSummary(order), mode: order.fulfilment.mode,
        items: lines,
        subtotal: orderSubtotal(order), deliveryFee: order.deliveryFee,
        deliveryLabel: order.delivery.label, rushFee: order.rushFee,
        total: orderTotal(order), paidToDate: order.amountPaid,
        balance: orderBalance(order), status: paymentStatus(order)
    };
    counters.receipt++;
    listAdd(receipts, receipt);
    listAdd(order.receipts, receipt);
    return receipt;
}

// Resibo na may parehong GCash reference, null kung wala.
// Hindi pwedeng dalawang beses gamitin yung isang reference.
// Time O(n) · Space O(n)
function receiptWithRef(gcashRef) {
    var digits = digitsOnly(gcashRef);
    return firstWhere(receipts, function (r) { return r.gcashRef === digits; });
}

// Mga check sa bawat GCash na bayad. '' kung ok.
// Time O(n) · Space O(n)
function gcashProblem(gcashRef) {
    if (!isValidGcashRef(gcashRef)) return 'Enter the 13-digit GCash reference number.';
    var used = receiptWithRef(gcashRef);
    return used ? 'That GCash reference is already on receipt ' + used.no + '. Check the number.' : '';
}

// Tinanggap at binayaran yung quotation, ng customer sa Track order
// o ni-record ng desk.
// Time O(n) · Space O(n)
function acceptQuote(id, methodId, gcashRef, stamp, actor) {
    var order = orderById(id);
    if (!order || order.status !== 'quoted') return { ok: false, error: 'This order has no quotation waiting for payment.' };
    if (stamp - order.quotedAt > QUOTE_EXPIRY_DAYS * 24 * 3600000) {
        voidOrder(order.id, 'Quotation expired — not paid within ' + QUOTE_EXPIRY_DAYS + ' days', 'system', stamp);
        return { ok: false, error: 'This quotation has expired. Send a new request and the shop will quote it again.' };
    }
    var method = paymentById(methodId);
    if (!method) return { ok: false, error: 'Choose 50% down payment or full payment.' };
    var problem = gcashProblem(gcashRef);
    if (problem) return { ok: false, error: problem };
    if (orderTotal(order) <= 0) return { ok: false, error: 'This quotation has no amount to pay.' };

    var total = orderTotal(order);
    order.paymentMethod = method.id;
    order.amountPaid = method.share === 1 ? total : roundMoney(total * method.share);
    order.status = 'paid';
    enterProduction(order);
    addHistory(order, stamp, 'Quotation accepted — ' + peso(order.amountPaid) + ' paid by GCash', actor || 'Customer',
               'GCash reference ' + digitsOnly(gcashRef));
    var receipt = issueReceipt(order, method.share === 1 ? 'Full payment' : 'Down payment', order.amountPaid, gcashRef, stamp);
    emailOrderConfirmed(order, receipt, stamp);
    return { ok: true, order: order, receipt: receipt };
}

// Bayad sa natitirang kulang pagkatapos ng down payment.
// Time O(n) · Space O(n)
function payBalance(id, gcashRef, stamp, actor) {
    var order = orderById(id);
    if (!order || (order.status !== 'paid' && order.status !== 'completed')) {
        return { ok: false, error: 'Only orders in production can take a balance payment.' };
    }
    var due = orderBalance(order);
    if (due <= 0) return { ok: false, error: order.ref + ' is already fully paid.' };
    var problem = gcashProblem(gcashRef);
    if (problem) return { ok: false, error: problem };

    order.amountPaid = roundMoney(order.amountPaid + due);
    addHistory(order, stamp, 'Balance of ' + peso(due) + ' paid by GCash', actor || 'Customer', 'GCash reference ' + digitsOnly(gcashRef));
    var receipt = issueReceipt(order, 'Balance payment', due, gcashRef, stamp);
    emailBalancePaid(order, receipt, stamp);
    return { ok: true, order: order, receipt: receipt };
}

// ---------- Mga email (sinusulat at pinapila) ----------

// example.com ba yung address? Hindi kasi talaga nakakatanggap.
// Time O(n) · Space O(n)
function isDemoAddress(email) {
    var parts = cutText(toLower(strip(String(email || ''))), '@');
    return parts.length === 2 && parts[1] === 'example.com';
}

// Sinusulat yung email at pinapila para i-send. null kung naka-off.
// Time O(n) · Space O(n)
function queueEmail(to, subject, lines, kind, orderId, stamp) {
    // Nasa example.com yung demo customers at demo staff account,
    // kaya hindi na pinapila ang email nila.
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

// Mga linya sa dulo ng bawat email ng order.
// Time O(1) · Space O(1)
function emailFooter(order) {
    return ['', 'Tracking number: ' + order.ref,
            'Keep this number. Quote it when you message us, or use Track order on our site with your email or mobile number.', '',
            'Thank you,', SHOP_INFO.name, SHOP_INFO.address + ' · ' + SHOP_INFO.social];
}

// Date at oras, tapos paalala na estimate lang (ulan, traffic).
// Time O(1) · Space O(1)
function emailScheduleLines(order) {
    return ['', (order.fulfilment.mode === 'delivery' ? 'Delivery: ' : 'Pickup: ') + whenText(order),
            scheduleNote(order.fulfilment.mode)];
}

// Courier tracking ng order kung meron na.
// Time O(n) · Space O(n)
function emailTrackingLines(order) {
    var t = shownTracking(order);
    if (!t) return [];
    var href = trackingHref(t), courier = trackingCourier(t.courier);
    return ['', 'Courier: ' + (courier ? courier.name : 'Courier') + (t.number ? ' · parcel number ' + t.number : ''),
            t.link ? 'Track your parcel: ' + t.link
                   : (href ? 'Track it on the courier\'s website, ' + href + ', with the number above.' : '')];
}

// Isang linya bawat item.
// Time O(n) · Space O(n)
function emailItemLines(order, withPrices) {
    var out = [];
    for (var i = 0; i < order.items.length; i++) {
        var item = order.items[i];
        listAdd(out, '• ' + item.productName + ' × ' + item.quantity + ' (' + glue(itemSpecs(item), ', ') + ')' +
                (withPrices ? ' — ' + peso(lineTotal(item)) : ''));
    }
    return out;
}

// Pinagsasama yung mga grupo ng linya sa isang listahan.
// Time O(n) · Space O(n)
function emailLines(groups) {
    var out = [];
    for (var g = 0; g < groups.length; g++) {
        for (var i = 0; i < groups[g].length; i++) listAdd(out, groups[g][i]);
    }
    return out;
}

// Natanggap ang request: ano ang hiningi at yung tracking number.
// Time O(n) · Space O(n)
function emailQuoteRequested(order, stamp) {
    return queueEmail(order.customer.email, 'We received your quote request ' + order.ref, emailLines([
        ['Hi ' + order.customer.name + ',', '',
         'Thank you! We received your request and will send your quotation shortly.', ''],
        emailItemLines(order, false),
        emailScheduleLines(order),
        emailFooter(order)
    ]), 'requested', order.id, stamp);
}

// Handa na ang quotation: presyo at paano magbayad.
// Time O(n) · Space O(n)
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

// Confirmed at bayad na ang order: parang resibo.
// Time O(n) · Space O(n)
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

// Natanggap ang bayad sa natitirang kulang.
// Time O(n) · Space O(n)
function emailBalancePaid(order, receipt, stamp) {
    return queueEmail(order.customer.email, 'Payment received for ' + order.ref, emailLines([
        ['Hi ' + order.customer.name + ',', '', 'We received your balance payment of ' + peso(receipt.amount) + '.',
         'Your order is now fully paid. Receipt: ' + receipt.no],
        emailFooter(order)
    ]), 'balance', order.id, stamp);
}

// Ready na for pickup, o papunta na.
// Time O(n) · Space O(n)
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

// Na-cancel ang order.
// Time O(n) · Space O(n)
function emailOrderVoided(order, stamp) {
    return queueEmail(order.customer.email, 'Order ' + order.ref + ' was cancelled', emailLines([
        ['Hi ' + order.customer.name + ',', '', 'Your order has been cancelled: ' + order.voidReason + '.',
         order.amountPaid > 0 ? 'As stated at checkout, payments are non-refundable (' + peso(order.amountPaid) + ').' : '',
         'If this is a mistake, message us at ' + SHOP_INFO.social + '.'],
        emailFooter(order)
    ]), 'voided', order.id, stamp);
}

// Nadagdag o nabago yung courier tracking.
// Time O(n) · Space O(n)
function emailTrackingAdded(order, stamp) {
    return queueEmail(order.customer.email, 'Track your parcel for ' + order.ref, emailLines([
        ['Hi ' + order.customer.name + ',', '', 'Your order has been handed to the courier. You can follow it here:'],
        emailTrackingLines(order),
        ['', scheduleNote('delivery')],
        emailFooter(order)
    ]), 'tracking', order.id, stamp);
}

// Mali yung na-send na tracking at tinanggal na.
// Time O(n) · Space O(n)
function emailTrackingRemoved(order, stamp) {
    return queueEmail(order.customer.email, 'Correction: parcel tracking for ' + order.ref, emailLines([
        ['Hi ' + order.customer.name + ',', '', 'The courier tracking we sent you for this order was not right, and we have taken it off. ' +
         'Please ignore it — we will send the correct one as soon as we have it.'],
        emailFooter(order)
    ]), 'tracking', order.id, stamp);
}

// Reset code ng password. Sa body lang, hindi sa subject.
// Time O(n) · Space O(n)
function emailResetCode(to, code, stamp) {
    return queueEmail(to, 'Your order desk password reset code', [
        'Someone asked to reset the ' + SHOP_INFO.name + ' order desk password. Your reset code is:', '', code, '',
        'It expires in ' + (RESET_LIFETIME_MS / 60000) + ' minutes. If this was not you, ignore this email — the password stays as it is.'
    ], 'reset', 0, stamp);
}

// Sinasabi sa owner na nagbago ang password, para alam agad.
// Time O(n) · Space O(n)
function emailPasswordChanged(to, stamp) {
    return queueEmail(to, 'Your order desk password was changed', [
        'Your ' + SHOP_INFO.name + ' order desk password was changed on ' + formatStamp(stamp) + '.', '',
        'If this was not you, reset the password again at once and check who can read this mailbox.'
    ], 'security', 0, stamp);
}

// Sign-in code ng order desk.
// Time O(n) · Space O(n)
function emailSignInCode(to, code, stamp) {
    // Sa body lang yung code, hindi sa subject, para hindi makita
    // sa listahan ng email (outbox, lock screen ng phone).
    return queueEmail(to, 'Your order desk sign-in code', [
        'Your ' + SHOP_INFO.name + ' order desk sign-in code is:', '', code, '',
        'It expires in ' + (OTP_LIFETIME_MS / 60000) + ' minutes. If you did not try to sign in, reset your password ' +
        '("Forgot password?" on the sign-in page).'
    ], 'otp', 0, stamp);
}

// ---------- Pag-send sa EmailJS (isa-isa galing sa queue) ----------

var EMAILJS_URL = 'https://api.emailjs.com/api/v1.0/email/send';
var mailSending = false;

// Napunan na ba yung tatlong EmailJS values?
// Time O(1) · Space O(1)
function mailConfigured() {
    return typeof EMAIL_CONFIG !== 'undefined' && !isBlank(EMAIL_CONFIG.serviceId) &&
           !isBlank(EMAIL_CONFIG.templateId) && !isBlank(EMAIL_CONFIG.publicKey);
}

// Sine-send yung susunod sa pila, isa-isa.
// Time O(n²) (bawat send, nire-render ulit ang outbox) · Space O(1)
function drainMail() {
    if (mailSending || cqIsEmpty(mailQueue)) return;
    var record = outbox[cqDequeue(mailQueue)];
    if (!mailConfigured()) {
        record.status = 'simulated';
        record.note = 'Email is not set up yet (js/data/email-config.js).';
        drainMail();
        return;
    }
    mailSending = true;
    record.status = 'sending';
    fetch(EMAILJS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            service_id: EMAIL_CONFIG.serviceId,
            template_id: EMAIL_CONFIG.templateId,
            user_id: EMAIL_CONFIG.publicKey,
            template_params: {
                to_email: record.to, subject: record.subject, message: record.body,
                from_name: EMAIL_CONFIG.fromName, reply_to: EMAIL_CONFIG.replyTo
            }
        })
    }).then(function (response) {
        record.status = response.ok ? 'sent' : 'failed';
        record.note = response.ok ? '' : 'EmailJS answered ' + response.status;
        return response.ok ? '' : response.text();
    }).then(function (detail) {
        if (detail) record.note = record.note + ': ' + detail;
    }, function () {
        record.status = 'failed';
        record.note = 'No connection to EmailJS.';
    }).then(function () {
        if (record.status === 'failed') {
            var order = record.orderId ? orderById(record.orderId) : null;
            logAudit(Date.now(), 'System', 'Email could not be sent: ' + record.subject, order ? order.ref : '',
                     record.note + ' (to ' + record.to + ')', 'warn');
        }
        mailSending = false;
        if (typeof onMailChanged === 'function') onMailChanged();
        if (typeof onSignInMailChanged === 'function') onSignInMailChanged();
        drainMail();
    });
}

// Ibinabalik sa pila lahat ng email na pumalya.
// Time O(n²) · Space O(n)
function retryFailedMail() {
    var count = 0;
    for (var i = 0; i < outbox.length; i++) {
        // Hindi sine-send ulit ang sign-in at reset code, wala nang silbi ang luma.
        if (outbox[i].kind === 'otp' || outbox[i].kind === 'reset') continue;
        if (outbox[i].status === 'failed' || (outbox[i].status === 'simulated' && mailConfigured())) {
            outbox[i].status = 'queued';
            outbox[i].note = '';
            cqEnqueue(mailQueue, i);
            count++;
        }
    }
    drainMail();
    return count;
}

// Mga email ng isang order, bago muna.
// Time O(n) dito (halos naka-ayos na), O(n²) worst · Space O(n)
function mailForOrder(orderId) {
    return insertionSort(backwards(keepWhere(outbox, function (m) { return m.orderId === orderId; })),
                     function (a, b) { return b.stamp - a.stamp || a.id - b.id; });
}
