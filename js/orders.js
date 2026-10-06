/* =========================================================================
   ORDERS — the request-for-quotation lifecycle.

     requested  the customer sent a request; it waits in the quote queue
     quoted     the owner priced it; the customer can accept or decline
     paid       accepted and paid by GCash (50% or 100%); in production
     completed  made, fully paid and released
     voided     cancelled at any point before completion. Kept on record
                as VOIDED – NON-REFUNDABLE; any payment is retained.

   Every function takes the moment it happens as `stamp` (milliseconds),
   so the demo history in seed.js runs through exactly this code.
   Depends on store.js.
   ========================================================================= */

var STATUS_LABELS = [
    { id: 'requested', label: 'Awaiting quotation' },
    { id: 'quoted',    label: 'Awaiting payment' },
    { id: 'paid',      label: 'In production' },
    { id: 'completed', label: 'Completed' },
    { id: 'voided',    label: 'VOIDED – NON-REFUNDABLE' }
];

/*                                        Time O(n) · Space O(1) */
function statusLabel(order) {
    var row = byId(STATUS_LABELS, order.status);
    return row ? row.label : order.status;
}

/*                                        Time O(1)  · Space O(1) */
function addHistory(order, stamp, text) {
    listAdd(order.history, { stamp: stamp, text: text });
}

/* =========================================================================
   FINDING ORDERS — binary search on the ascending order number
   ========================================================================= */

/*                                        Time O(log n) · Space O(1) */
function orderById(id) {
    var at = binarySearch(orders, Number(id), function (o) { return o.id; });
    return at === -1 ? null : orders[at];
}

/* "SU-215", "su 215" or "215".           Time O(log n) + O(n) for the text · Space O(n) */
function orderByRef(text) {
    var digits = digitsOnly(text);
    if (digits.length === 0 || digits.length > 9) return null;
    return orderById(toNumber(digits));
}

/* 0917…, +63 917… and 63917… are the same number.  Time O(n) · Space O(n) */
function normalisePhone(text) {
    var digits = digitsOnly(text);
    if (digits.length === 12 && beginsWith(digits, '63')) return '0' + textPart(digits, 2);
    return digits;
}

/*                                        Time O(n) · Space O(n) */
function isValidPhone(text) {
    var digits = normalisePhone(text);
    return digits.length === 11 && beginsWith(digits, '09');
}

/* A customer sees an order only with its tracking number and the mobile
   number or email used on it.            Time O(log n) + O(n) for the text · Space O(n) */
function customerLookup(ref, contact) {
    var order = orderByRef(ref);
    if (!order || isBlank(contact)) return null;
    var byEmail = order.customer.email && toLower(strip(contact)) === order.customer.email;
    var byPhone = digitsOnly(contact).length > 0 && normalisePhone(order.customer.phone) === normalisePhone(contact);
    return byEmail || byPhone ? order : null;
}

/*                                        Time O(n)  · Space O(n) */
function ordersWithStatus(status) {
    return keepWhere(orders, function (o) { return o.status === status; });
}

/* =========================================================================
   MONEY ON AN ORDER
   ========================================================================= */

/* Sum of the quoted lines.               Time O(n) · Space O(n) call stack */
function orderSubtotal(order) {
    return roundMoney(sumRecursive(order.items, lineTotal));
}

/*                                        Time O(n) · Space O(n) */
function orderTotal(order) {
    return roundMoney(orderSubtotal(order) + order.deliveryFee + order.rushFee);
}

/* Before a quotation: the price list plus the delivery estimate.
                                          Time O(n) · Space O(n) */
function orderEstimate(order) {
    var items = sumRecursive(order.items, function (item) { return item.estimate; });
    return roundMoney(items + order.deliveryFee + order.rushFee);
}

/* "₱825.00", or "To be quoted" when nothing has a list price.
                                          Time O(n) · Space O(n) */
function estimateText(order) {
    var items = sumRecursive(order.items, function (item) { return item.estimate; });
    return items > 0 ? peso(orderEstimate(order)) : 'To be quoted';
}

/* "Estimate ₱825.00" or "To be quoted".  Time O(n) · Space O(n) */
function estimateLabel(order) {
    var text = estimateText(order);
    return text === 'To be quoted' ? text : 'Estimate ' + text;
}

/*                                        Time O(n) · Space O(n) */
function orderBalance(order) {
    var left = roundMoney(orderTotal(order) - order.amountPaid);
    return left > 0 ? left : 0;
}

/* Has the customer paid something, and is something still owed? True for
   a 50% down payment, and for any paid or completed order the desk later
   raised.                                Time O(n) · Space O(n) */
function owesBalance(order) {
    return (order.status === 'paid' || order.status === 'completed') && order.amountPaid > 0 && orderBalance(order) > 0;
}

/* Paid beyond a total the desk later lowered. Non-refundable, so it is
   shown, not returned.                   Time O(n) · Space O(n) */
function orderOverpaid(order) {
    var over = roundMoney(order.amountPaid - orderTotal(order));
    return over > 0 ? over : 0;
}

/*                                        Time O(n) · Space O(n) */
function paymentStatus(order) {
    if (order.amountPaid <= 0) return 'Unpaid';
    return orderBalance(order) > 0 ? 'Partially paid' : 'Fully paid';
}

/* =========================================================================
   1. REQUEST — the customer submits the basket
   ========================================================================= */

/* form: { name, phone, handle, mode, date, slot, address, barangay, city,
           courier, rush, notes }
   Returns a list of { field, message }; empty means valid.
                                          Time O(n²) · Space O(n) */
function validateRequest(form, items, fromIso, ignoreId) {
    var errors = [];
    /* Record one problem.                 Time O(1)  · Space O(1) */
    function fail(field, message) { listAdd(errors, { field: field, message: message }); }

    if (items.length === 0) fail('basket', 'Add at least one item to your cart.');
    for (var i = 0; i < items.length; i++) {
        var product = productById(items[i].productId);
        if (!product || !product.active) fail('basket', items[i].productName + ' is no longer available. Remove it to continue.');
    }
    var name = strip(form.name);
    if (name.length < 2 || name.length > 60) fail('name', 'Enter your name (2 to 60 characters).');
    if (!isValidPhone(form.phone)) fail('phone', 'Enter a mobile number like 0917 123 4567.');
    if (!isValidEmail(form.email)) fail('email', 'Enter an email address like name@gmail.com — your confirmation goes there.');
    if (String(form.handle || '').length > 60) fail('handle', 'Keep the Facebook or Instagram name under 60 characters.');
    if (String(form.notes || '').length > MAX_NOTE) fail('notes', 'Notes are limited to ' + MAX_NOTE + ' characters.');

    if (!modeById(form.mode)) fail('mode', 'Choose pickup or delivery.');
    var earliest = earliestDate(items, form.rush === true, fromIso);
    if (!dateFromIso(form.date)) fail('date', 'Choose a date.');
    else if (form.date < earliest) fail('date', 'The earliest the shop can have this ready is ' + formatDateLong(earliest) + '.');

    if (form.mode === 'delivery') {
        if (isBlank(form.address)) fail('address', 'Enter the street and house number.');
        if (isBlank(form.city)) fail('city', 'Enter the city or town.');
        else if (needsCourier(form.city)) {
            if (!courierById(form.courier)) fail('courier', 'Choose a courier for this address.');
        } else if (dateFromIso(form.date) && !isInhouseDay(form.date)) {
            fail('date', 'The shop delivers on ' + INHOUSE_DAY_NAMES + ' only.');
        }
    }

    if (form.mode === 'delivery') {
        if (!isIn(TIME_SLOTS, form.slot)) fail('slot', 'Choose a delivery time.');
        else if (dateFromIso(form.date) && slotLoad(form.date, form.slot, ignoreId) >= SLOT_CAPACITY) {
            fail('slot', 'That time is fully booked. Choose another.');
        }
    } else if (dateFromIso(form.date) && weekdayOf(form.date) === 0) {
        fail('date', 'The shop is closed on Sundays. Choose another pickup date.');
    } else if (dateFromIso(form.date) && pickupPlacesLeft(form.date, ignoreId) === 0) {
        // Pickups are booked by date alone.
        fail('date', 'Pickups are fully booked on ' + formatDateLong(form.date) + '. Choose another date.');
    }
    // A price-list cart is never a quote request, so it needs a delivery
    // rate on file. Only a cart with a quote product can ask for one.
    var hasQuoteItem = countWhere(items, function (item) { return item.kind === 'quote'; }) > 0;
    if (form.mode === 'delivery' && !isBlank(form.city) && courierById(form.courier) && !hasQuoteItem &&
        deliveryQuote(form).status === 'manual') {
        fail('city', 'We have no delivery rate for ' + strip(form.city) + ' yet. Choose pickup or one of the listed cities, or message us at ' +
             SHOP_INFO.social + '.');
    }
    return errors;
}

/* A plausible email address, checked by hand: one @, a dot in the domain,
   no spaces.                             Time O(n) · Space O(n) */
function isValidEmail(text) {
    var s = strip(text);
    if (s.length < 6 || s.length > 100) return false;
    var parts = cutText(s, '@');
    if (parts.length !== 2 || parts[0].length === 0) return false;
    var domain = parts[1], dot = -1;
    for (var i = 0; i < s.length; i++) if (isSpace(s.charAt(i))) return false;
    for (var k = 0; k < domain.length; k++) if (domain.charAt(k) === '.') dot = k;
    return dot > 0 && dot < domain.length - 1;
}

/* Does this order need the owner to price it? Only the five quote
   products do — or an address no rate covers.  Time O(n) · Space O(n) */
function needsQuote(items, delivery) {
    var quoted = countWhere(items, function (item) { return item.kind === 'quote'; }) > 0;
    return quoted || delivery.status === 'manual';
}

/* Turn the cart into an order. A cart of price-list items (flowers, the
   picture bouquet) is priced on the spot and waits only for payment; a
   cart with a quote product joins the quotation queue.
                                          Time O(n²) · Space O(n) */
function submitRequest(form, stamp) {
    var items = repricedCart();
    var errors = validateRequest(form, items, isoFromStamp(stamp));
    if (errors.length > 0) return { ok: false, errors: errors };

    var fulfilment = {
        mode: form.mode, date: form.date, slot: form.mode === 'delivery' ? form.slot : '',
        address: form.mode === 'delivery' ? strip(form.address) : '',
        barangay: form.mode === 'delivery' ? strip(form.barangay) : '',
        city: form.mode === 'delivery' ? strip(form.city) : '',
        courier: form.mode === 'delivery' && needsCourier(form.city) ? form.courier : ''
    };
    var delivery = deliveryQuote(fulfilment);
    var id = counters.order;
    counters.order++;
    // The fees start as the shop's own figures and are confirmed, or
    // changed, by the quotation.
    var order = {
        id: id, ref: 'SU-' + id, createdAt: stamp,
        customer: { name: strip(form.name), phone: normalisePhone(form.phone), handle: strip(form.handle),
                    email: toLower(strip(form.email)) },
        fulfilment: fulfilment,
        delivery: delivery,
        rush: form.rush === true,
        items: items,
        notes: strip(form.notes),
        status: 'requested',
        quotedAt: 0, quoteNote: '', deliveryFee: delivery.fee, rushFee: form.rush === true ? RUSH_FEE : 0,
        paymentMethod: '', amountPaid: 0, receipts: [],
        lane: '', laneSeq: -1,
        completedAt: 0, voidedAt: 0, voidedBy: '', voidReason: '',
        history: [], revisions: []
    };
    listAdd(orders, order);
    llClear(basket);
    if (needsQuote(items, delivery)) {
        addHistory(order, stamp, 'Quote request submitted');
        cqEnqueue(quoteQueue, id);
        emailQuoteRequested(order, stamp);
    } else {
        addHistory(order, stamp, 'Order placed');
        autoPrice(order, stamp);
    }
    return { ok: true, order: order };
}

/* Price an order straight from the price list: no one has to quote it.
   A courier's planning rate is taken as the fee.  Time O(n²) · Space O(n) */
function autoPrice(order, stamp) {
    var priced = [];
    for (var i = 0; i < order.items.length; i++) {
        listAdd(priced, copyRecord(order.items[i], { materials: order.items[i].estimate, labor: 0, itemExpense: 0 }));
    }
    order.items = priced;
    order.quotedAt = stamp;
    order.quoteNote = 'Priced automatically from the price list.';
    if (order.delivery.service !== 'pickup') order.delivery = settledDelivery(order, order.delivery, order.deliveryFee);
    order.status = 'quoted';
    addHistory(order, stamp, 'Priced automatically: ' + peso(orderTotal(order)));
}

/* Checkout for a priced cart: the order is placed and paid in one step, so
   nothing waits on the owner. Nothing is created unless the payment
   details are valid.                     Time O(n²) · Space O(n) */
function placeOrder(form, methodId, gcashRef, stamp) {
    var items = repricedCart();
    var errors = validateRequest(form, items, isoFromStamp(stamp));
    if (errors.length > 0) return { ok: false, errors: errors };
    var preview = deliveryQuote(form);
    if (needsQuote(items, preview)) return { ok: false, errors: [{ field: 'basket', message: 'This cart needs a quote from the shop first.' }] };
    if (!paymentById(methodId)) return { ok: false, errors: [{ field: 'payment', message: 'Choose 50% down payment or full payment.' }] };
    var problem = gcashProblem(gcashRef);
    if (problem) return { ok: false, errors: [{ field: 'gcash', message: problem }] };

    var made = submitRequest(form, stamp);
    if (!made.ok) return made;
    var paid = acceptQuote(made.order.id, methodId, gcashRef, stamp);
    if (!paid.ok) {
        // Should never happen after the checks above; never leave a half-made order.
        voidOrder(made.order.id, 'Payment could not be recorded', 'system', stamp);
        return { ok: false, errors: [{ field: 'gcash', message: paid.error }] };
    }
    return { ok: true, order: made.order, receipt: paid.receipt };
}

/* What a cart would cost now, before it is placed. Time O(n²) · Space O(n) */
function cartTotals(form, items) {
    var delivery = deliveryQuote(form);
    var subtotal = roundMoney(sumRecursive(items, function (item) { return item.estimate; }));
    var rushFee = form.rush === true ? RUSH_FEE : 0;
    return { subtotal: subtotal, deliveryFee: delivery.fee, rushFee: rushFee, delivery: delivery,
             total: roundMoney(subtotal + delivery.fee + rushFee), needsQuote: needsQuote(items, delivery) };
}

/* Take an id out of a queue: from the front in O(1) when it is the next
   in line — the usual case — or from the middle in O(n) when it is not.
                                          Time O(n) · Space O(n) */
function leaveQueue(queue, id) {
    if (cqFront(queue) === id) return cqDequeue(queue) === id;
    return cqRemove(queue, id);
}

/* Requests in the order they arrived.    Time O(n²) at most — one O(log n) binary search per queued id · Space O(n) */
function quoteQueueOrders() {
    var ids = cqValues(quoteQueue), out = [];
    for (var i = 0; i < ids.length; i++) listAdd(out, orderById(ids[i]));
    return out;
}

/* =========================================================================
   2. QUOTATION — the owner prices materials, labour and item costs
   ========================================================================= */

/* Every quoted line of a quote product the shop has priced, per piece and
   without its add-ons, newest quotation first. Learned from the order
   records, so it improves as the shop quotes more. Built once per draft:
   each line of the new order then searches this one list.
                                          Time O(n²) · Space O(n) */
function quoteHistory(ignoreId) {
    var seen = [];
    for (var o = 0; o < orders.length; o++) {
        var order = orders[o];
        if (order.id === ignoreId || order.quotedAt === 0 || order.status === 'requested') continue;
        for (var i = 0; i < order.items.length; i++) {
            var past = order.items[i];
            if (past.kind === 'quote' && lineTotal(past) > 0) {
                // Take the past add-ons out, so the new line's own add-ons are
                // not counted twice when they are added back.
                var base = past.materials - past.estimate;
                listAdd(seen, { seq: seen.length, productId: past.productId, size: past.size, stamp: order.quotedAt,
                                materials: (base > 0 ? base : 0) / past.quantity, labor: past.labor / past.quantity });
            }
        }
    }
    // Newest first. Orders are kept oldest first, so reading the list back to
    // front leaves it nearly in order — insertion sort's best case. Lines
    // quoted at the same moment keep their order (seq), first line first.
    return insertionSort(backwards(seen), function (a, b) { return b.stamp - a.stamp || a.seq - b.seq; });
}

/* The five most recent history lines for the item's product — only at
   the same size when sameSize is true. The history is newest first, so
   a linear search that stops at five is enough.  Time O(n) · Space O(1) */
function recentQuotes(history, item, sameSize) {
    var out = [];
    for (var h = 0; h < history.length && out.length < 5; h++) {
        var line = history[h];
        if (line.productId === item.productId && (!sameSize || line.size === item.size)) listAdd(out, line);
    }
    return out;
}

/* What the owner charged before for the same product and size, per piece:
   the average of the five most recent quotations, or of any size when
   that size was never quoted. Returns { materials, labor, count, sameSize }
   per piece, or null with no history.    Time O(n) · Space O(1) */
function pastQuoteFrom(history, item) {
    var recent = recentQuotes(history, item, true), sameSize = recent.length > 0;
    if (!sameSize) recent = recentQuotes(history, item, false);
    if (recent.length === 0) return null;
    return {
        materials: roundMoney(sumRecursive(recent, function (r) { return r.materials; }) / recent.length),
        labor: roundMoney(sumRecursive(recent, function (r) { return r.labor; }) / recent.length),
        count: recent.length, sameSize: sameSize
    };
}

/* pastQuoteFrom for one item, building the history first.
                                          Time O(n²) · Space O(n) */
function pastQuote(item, ignoreId) {
    return pastQuoteFrom(quoteHistory(ignoreId), item);
}

/* A starting point for the quote editor, so the owner mostly checks and
   sends. Price-list items carry their price; quote items are filled from
   the owner's past quotations for the same product and size. Anything
   already quoted keeps its figures.      Time O(n²) · Space O(n) */
function quoteDraft(order) {
    var quoted = order.status !== 'requested';
    var history = quoted ? [] : quoteHistory(order.id), lines = [];
    for (var i = 0; i < order.items.length; i++) {
        var item = order.items[i], line;
        if (quoted) line = { materials: item.materials, labor: item.labor, itemExpense: item.itemExpense, suggested: 0 };
        else if (item.kind !== 'quote') line = { materials: item.estimate, labor: 0, itemExpense: 0, suggested: 0 };
        else {
            var past = pastQuoteFrom(history, item);
            line = past
                ? { materials: roundMoney(past.materials * item.quantity + item.estimate), labor: roundMoney(past.labor * item.quantity),
                    itemExpense: 0, suggested: past.count, sameSize: past.sameSize }
                : { materials: item.estimate, labor: 0, itemExpense: 0, suggested: 0 };
        }
        listAdd(lines, line);
    }
    return {
        lines: lines,
        deliveryFee: order.deliveryFee,
        rushFee: order.rushFee,
        note: order.quoteNote
    };
}

/*                                        Time O(1)  · Space O(1) */
function isMoney(value) {
    return typeof value === 'number' && value === value && value >= 0 && value <= 1000000;
}

/*                                        Time O(n) · Space O(1) */
function validateQuote(order, draft) {
    var errors = [];
    /* Record one problem.                 Time O(1)  · Space O(1) */
    function fail(field, message) { listAdd(errors, { field: field, message: message }); }
    if (draft.lines.length !== order.items.length) fail('lines', 'Every item needs a price.');
    for (var i = 0; i < draft.lines.length; i++) {
        var line = draft.lines[i];
        if (!isMoney(line.materials) || !isMoney(line.labor) || !isMoney(line.itemExpense)) {
            fail('line' + i, 'Item ' + (i + 1) + ': amounts must be zero or more.');
        } else if (lineTotal(line) <= 0) {
            fail('line' + i, 'Item ' + (i + 1) + ': enter the materials and labour.');
        }
    }
    if (!isMoney(draft.deliveryFee)) fail('deliveryFee', 'The delivery fee must be zero or more.');
    else if (order.delivery.service === 'courier' && draft.deliveryFee <= 0) {
        fail('deliveryFee', 'Enter the courier fee before sending the quotation.');
    }
    if (!isMoney(draft.rushFee)) fail('rushFee', 'The rush fee must be zero or more.');
    if (String(draft.note || '').length > MAX_NOTE) fail('note', 'Keep the note under ' + MAX_NOTE + ' characters.');
    return errors;
}

/* Send (or revise) the quotation.        Time O(n) · Space O(n) */
function sendQuote(id, draft, stamp) {
    var order = orderById(id);
    if (!order) return { ok: false, errors: [{ field: 'order', message: 'No such order.' }] };
    if (order.status !== 'requested' && order.status !== 'quoted') {
        return { ok: false, errors: [{ field: 'order', message: order.ref + ' is past the quotation stage.' }] };
    }
    var errors = validateQuote(order, draft);
    if (errors.length > 0) return { ok: false, errors: errors };

    var priced = [];
    for (var i = 0; i < order.items.length; i++) {
        listAdd(priced, copyRecord(order.items[i], {
            materials: roundMoney(draft.lines[i].materials),
            labor: roundMoney(draft.lines[i].labor),
            itemExpense: roundMoney(draft.lines[i].itemExpense)
        }));
    }
    var revising = order.status === 'quoted';
    order.items = priced;
    order.deliveryFee = roundMoney(draft.deliveryFee);
    order.rushFee = roundMoney(draft.rushFee);
    order.quoteNote = strip(draft.note);
    order.quotedAt = stamp;
    if (order.delivery.service !== 'pickup') order.delivery = settledDelivery(order, order.delivery, order.deliveryFee);
    if (!revising) leaveQueue(quoteQueue, order.id);
    order.status = 'quoted';
    addHistory(order, stamp, (revising ? 'Quotation revised: ' : 'Quotation sent: ') + peso(orderTotal(order)));
    emailQuoteReady(order, stamp);
    return { ok: true, order: order };
}

/* The words for a delivery at the fee actually charged — a quotation can
   waive a fee or set a courier's, and the label must follow.
                                          Time O(n) · Space O(1) */
function deliveryLabel(delivery, fee, fulfilment) {
    if (delivery.service === 'pickup') return 'Pickup at the shop';
    var where = delivery.area || fulfilment.city;
    if (delivery.service === 'inhouse') {
        var area = lookupArea(fulfilment.city);
        var lawa = area && isIn(area.freeBarangays || [], barangayKey(fulfilment.barangay));
        if (fee > 0) return 'Shop delivery to ' + where;
        return lawa ? 'Free delivery within Brgy. Lawa' : 'Free delivery to ' + where;
    }
    var courier = courierById(delivery.courier);
    return (courier ? courier.name : 'Courier') + ' to ' + where;
}

/* A delivery record once the shop has fixed its fee: courier rates count
   as confirmed, and the label follows the fee.  Time O(n) · Space O(1) */
function settledDelivery(order, delivery, fee) {
    return copyRecord(delivery, {
        fee: fee,
        status: delivery.service === 'courier' ? 'confirmed' : delivery.status,
        label: deliveryLabel(delivery, fee, order.fulfilment)
    });
}

/* Quoted orders, oldest quotation first. Time O(n²) · Space O(n) */
function awaitingPayment() {
    return insertionSort(ordersWithStatus('quoted'), function (a, b) { return a.quotedAt - b.quotedAt; });
}

/* =========================================================================
   3. PAYMENT AND RECEIPTS — GCash only, 50% or 100%
   ========================================================================= */

/* Thirteen digits; spaces allowed between them.  Time O(n) · Space O(n) */
function isValidGcashRef(text) {
    var s = strip(text);
    for (var i = 0; i < s.length; i++) {
        if (!isDigit(s.charAt(i)) && s.charAt(i) !== ' ') return false;
    }
    return digitsOnly(s).length === GCASH_REF_LENGTH;
}

/* Snapshot the order as it stands at the moment money changes hands, so a
   receipt never shifts when the order is edited later.
                                          Time O(n) · Space O(n) */
function issueReceipt(order, kind, amount, gcashRef, stamp) {
    var lines = [];
    for (var i = 0; i < order.items.length; i++) {
        var item = order.items[i];
        listAdd(lines, { name: item.productName, quantity: item.quantity, specs: itemSpecs(item),
                         notes: item.notes, amount: lineTotal(item) });
    }
    var method = paymentById(order.paymentMethod);
    // A balance is paid by GCash after the original payment, so say so
    // rather than repeating "100% Full Payment" on a top-up receipt.
    var methodName = kind === 'Balance payment'
        ? 'GCash — balance after ' + (method ? toLower(method.short) : 'down payment')
        : (method ? method.name : 'GCash');
    var receipt = {
        no: 'OR-' + leftPad(counters.receipt, 4, '0'),
        orderId: order.id, ref: order.ref, stamp: stamp, orderDate: order.createdAt,
        kind: kind, method: methodName, gcashRef: digitsOnly(gcashRef),
        amount: roundMoney(amount),
        customer: copyRecord(order.customer),
        fulfilment: fulfilmentSummary(order),
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

/* "Delivery · 12 Oct 2026, 02:00 PM · Marilao" or "Pickup · 12 Oct 2026 ·
   Lawa, Meycauayan" — pickups have a date, not a time.  Time O(1) · Space O(1) */
function fulfilmentSummary(order) {
    var f = order.fulfilment;
    if (f.mode !== 'delivery') return 'Pickup · ' + formatDateShort(f.date) + ' · Lawa, Meycauayan';
    return 'Delivery · ' + formatDateShort(f.date) + ', ' + f.slot + ' · ' + (f.city || order.delivery.area);
}

/* "Friday, 9 October 2026" for a pickup, plus the time for a delivery.
                                          Time O(1)  · Space O(1) */
function whenText(order) {
    var f = order.fulfilment;
    return formatDateLong(f.date) + (f.mode === 'delivery' && f.slot ? ', ' + f.slot : '');
}

/* The receipt a GCash reference is already on, or null. One reference
   cannot pay twice.                      Time O(n) · Space O(n) */
function receiptWithRef(gcashRef) {
    var digits = digitsOnly(gcashRef);
    return firstWhere(receipts, function (r) { return r.gcashRef === digits; });
}

/* The checks every GCash payment shares: '' when it may go ahead.
                                          Time O(n) · Space O(n) */
function gcashProblem(gcashRef) {
    if (!isValidGcashRef(gcashRef)) return 'Enter the 13-digit GCash reference number.';
    var used = receiptWithRef(gcashRef);
    return used ? 'That GCash reference is already on receipt ' + used.no + '. Check the number.' : '';
}

/* The customer accepts the quotation and pays.  Time O(n) · Space O(n) */
function acceptQuote(id, methodId, gcashRef, stamp) {
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
    addHistory(order, stamp, 'Quotation accepted — ' + peso(order.amountPaid) + ' paid by GCash');
    var receipt = issueReceipt(order, method.share === 1 ? 'Full payment' : 'Down payment', order.amountPaid, gcashRef, stamp);
    emailOrderConfirmed(order, receipt, stamp);
    return { ok: true, order: order, receipt: receipt };
}

/* Settle what is left after a down payment — or after the desk raised the
   total of an order already paid or completed.  Time O(n) · Space O(n) */
function payBalance(id, gcashRef, stamp) {
    var order = orderById(id);
    if (!order || (order.status !== 'paid' && order.status !== 'completed')) {
        return { ok: false, error: 'Only orders in production can take a balance payment.' };
    }
    var due = orderBalance(order);
    if (due <= 0) return { ok: false, error: order.ref + ' is already fully paid.' };
    var problem = gcashProblem(gcashRef);
    if (problem) return { ok: false, error: problem };

    order.amountPaid = roundMoney(order.amountPaid + due);
    addHistory(order, stamp, 'Balance of ' + peso(due) + ' paid by GCash');
    var receipt = issueReceipt(order, 'Balance payment', due, gcashRef, stamp);
    emailBalancePaid(order, receipt, stamp);
    return { ok: true, order: order, receipt: receipt };
}

/* =========================================================================
   4. PRODUCTION — rush lane (min-heap by due date), standard lane (queue)
   ========================================================================= */

/* 2026-10-12 -> 20261012, so earlier dates are smaller keys.  Time O(1) · Space O(1) */
function dueKey(order) {
    return toNumber(digitsOnly(order.fulfilment.date));
}

/*                                        Time O(log n) · Space O(1) */
function enterProduction(order) {
    if (order.rush) {
        order.lane = 'rush';
        order.laneSeq = rushLane.nextSeq;
        heapInsert(rushLane, order.id, dueKey(order), order.laneSeq);
    } else {
        order.lane = 'standard';
        cqEnqueue(standardLane, order.id);
    }
}

/*                                        Time O(n)  · Space O(n) */
function leaveProduction(order) {
    if (order.lane === 'rush') heapRemove(rushLane, order.id);
    else if (order.lane === 'standard') leaveQueue(standardLane, order.id);
}

/* Rush first, then standard.             Time O(log n) · Space O(1) */
function nextInProduction() {
    var id = heapPeek(rushLane);
    if (id === null) id = cqFront(standardLane);
    return id === null ? null : orderById(id);
}

/* The whole line in the order it will be made.  Time O(n²) · Space O(n) */
function productionLine() {
    var out = [], rush = heapValues(rushLane), standard = cqValues(standardLane), i;
    for (i = 0; i < rush.length; i++) listAdd(out, orderById(rush[i]));
    for (i = 0; i < standard.length; i++) listAdd(out, orderById(standard[i]));
    return out;
}

/* The first order in line that is fully paid, so may be released.
   An order still owing a balance keeps its place but does not hold up
   the orders behind it.                  Time O(n²) · Space O(n) */
function nextReleasable() {
    return firstWhere(productionLine(), function (o) { return orderBalance(o) <= 0; });
}

/* Release the next fully paid order. Records where it stood, so undo can
   put it back exactly. Finding it walks the line, O(n²); taking it
   from the front is O(1) for the queue, O(log n) for the heap.
                                          Time O(n²) · Space O(n) */
function completeNext(stamp) {
    var line = productionLine();
    if (line.length === 0) return { ok: false, error: 'Nothing is in production.' };
    var order = nextReleasable();
    if (!order) {
        var owing = renderEach(line, function (o) { return o.ref; }, ', ');
        return { ok: false, error: 'Every order in production still owes a balance (' + owing + '). Record a balance payment first.' };
    }
    var skipped = [];
    for (var i = 0; i < line.length && line[i] !== order; i++) listAdd(skipped, line[i]);
    var position = -1;
    if (order.lane === 'rush') {
        // Rush comes first, so a releasable rush order is the heap's minimum
        // unless one ahead of it still owes.
        if (heapPeek(rushLane) === order.id) heapExtractMin(rushLane);
        else heapRemove(rushLane, order.id);
    } else {
        position = positionIn(cqValues(standardLane), order.id);
        leaveQueue(standardLane, order.id);
    }
    order.status = 'completed';
    order.completedAt = stamp;
    stackPush(completedStack, { id: order.id, position: position });
    addHistory(order, stamp, 'Ready and released');
    emailOrderReady(order, stamp);
    return { ok: true, order: order, skipped: skipped };
}

/* Put the last completion back exactly where it came from: the front of
   its lane in O(1) / O(log n), or its old place in O(n) if it had been
   released from behind an order still owing.  Time O(n) worst · Space O(n) */
function undoCompletion(stamp) {
    var entry = stackPop(completedStack);
    if (entry === null) return { ok: false, error: 'There is nothing to undo.' };
    var order = orderById(entry.id);
    order.status = 'paid';
    order.completedAt = 0;
    if (order.lane === 'rush') {
        // An order moved to the rush lane after completing has no arrival
        // number yet; it takes the next one.
        if (order.laneSeq < 0) order.laneSeq = rushLane.nextSeq;
        heapInsert(rushLane, order.id, dueKey(order), order.laneSeq);
    } else {
        if (entry.position <= 0) cqRequeueFront(standardLane, order.id);
        else cqInsertAt(standardLane, entry.position, order.id);
    }
    addHistory(order, stamp, 'Completion undone — back in production');
    return { ok: true, order: order };
}

/* Completed orders grouped by the day they were completed, newest first.
   Orders are kept oldest first and are mostly completed in that order, so
   the list is read back to front before the insertion sort: it is then
   nearly in order already, the sort's best case.
                                          Time O(n) here (nearly in order), O(n²) worst · Space O(n) */
function completedByDate() {
    var sorted = insertionSort(backwards(ordersWithStatus('completed')), function (a, b) { return b.completedAt - a.completedAt || a.id - b.id; });
    var groups = [];
    for (var i = 0; i < sorted.length; i++) {
        var day = isoFromStamp(sorted[i].completedAt);
        var last = groups.length > 0 ? groups[groups.length - 1] : null;
        if (!last || last.date !== day) {
            last = { date: day, orders: [], total: 0 };
            listAdd(groups, last);
        }
        listAdd(last.orders, sorted[i]);
        last.total = roundMoney(last.total + orderTotal(sorted[i]));
    }
    return groups;
}

/* =========================================================================
   5. VOIDING — cancellations are kept, marked, and never refunded
   ========================================================================= */

/*                                        Time O(n)  · Space O(n) */
function voidOrder(id, reason, by, stamp) {
    var order = orderById(id);
    if (!order) return { ok: false, error: 'No such order.' };
    if (order.status === 'completed') return { ok: false, error: order.ref + ' is completed and cannot be voided.' };
    if (order.status === 'voided') return { ok: false, error: order.ref + ' is already voided.' };

    if (order.status === 'requested') leaveQueue(quoteQueue, order.id);
    if (order.status === 'paid') leaveProduction(order);
    order.status = 'voided';
    order.voidedAt = stamp;
    order.voidedBy = by === 'admin' ? 'Order desk' : (by === 'system' ? 'System' : 'Customer');
    order.voidReason = strip(reason) || (by === 'admin' ? 'Cancelled by the order desk' : 'Cancelled by the customer');
    addHistory(order, stamp, 'VOIDED – NON-REFUNDABLE' +
               (order.amountPaid > 0 ? ' (' + peso(order.amountPaid) + ' retained)' : ''));
    emailOrderVoided(order, stamp);
    return { ok: true, order: order };
}

/* Void every quotation left unpaid for QUOTE_EXPIRY_DAYS, so the owner
   never has to chase one. Run on start-up and every minute after.
                                          Time O(n²) · Space O(n) */
function expireQuotes(now) {
    var limit = QUOTE_EXPIRY_DAYS * 24 * 3600000, expired = [];
    var stale = keepWhere(orders, function (o) { return o.status === 'quoted' && now - o.quotedAt > limit; });
    for (var i = 0; i < stale.length; i++) {
        voidOrder(stale[i].id, 'Quotation expired — not paid within ' + QUOTE_EXPIRY_DAYS + ' days', 'system', now);
        listAdd(expired, stale[i]);
    }
    return expired;
}

/* Newest void first; read back to front, as for completed orders.
                                          Time O(n) here (nearly in order), O(n²) worst · Space O(n) */
function voidedOrders() {
    return insertionSort(backwards(ordersWithStatus('voided')), function (a, b) { return b.voidedAt - a.voidedAt || a.id - b.id; });
}

/* =========================================================================
   DASHBOARD FIGURES
   ========================================================================= */

/*                                        Time O(n²) · Space O(n) */
function dashboardStats() {
    var outstanding = 0, retained = 0;
    for (var i = 0; i < orders.length; i++) {
        var o = orders[i];
        if (o.status === 'paid' || o.status === 'completed') outstanding += orderBalance(o);
        if (o.status === 'voided') retained += o.amountPaid;
    }
    return {
        awaitingQuote: quoteQueue.count,
        awaitingPayment: ordersWithStatus('quoted').length,
        inProduction: rushLane.size + standardLane.count,
        rush: rushLane.size,
        completed: ordersWithStatus('completed').length,
        voided: ordersWithStatus('voided').length,
        collected: roundMoney(sumRecursive(receipts, function (r) { return r.amount; })),
        outstanding: roundMoney(outstanding),
        retained: roundMoney(retained)
    };
}
