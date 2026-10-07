/* =========================================================================
   MODULE 8 · QUOTATION DESK
   Circular queue ng quote requests (FIFO, unang dumating unang sasagutin).
   Ang quote editor ay may laman na galing sa mga lumang quote, gamit ang
   insertion sort (bago muna) at linear search.
   ========================================================================= */

// Tinatanggal yung id sa queue: sa unahan O(1) kung siya na ang
// susunod (madalas ito), sa gitna O(n) kung hindi.
// Time O(n) · Space O(n)
function leaveQueue(queue, id) {
    if (cqFront(queue) === id) return cqDequeue(queue) === id;
    return cqRemove(queue, id);
}

// Mga request ayon sa pagkakadating.
// Time O(n²) pinakamarami (isang O(log n) binary search bawat id sa pila) · Space O(n)
function quoteQueueOrders() {
    var ids = cqValues(quoteQueue), out = [];
    for (var i = 0; i < ids.length; i++) listAdd(out, orderById(ids[i]));
    return out;
}

// Lahat ng na-quote na line ng quote products, kada piraso,
// pinakabago muna. Natututo galing sa mga lumang order.
// Time O(n²) · Space O(n)
function quoteHistory(ignoreId) {
    var seen = [];
    for (var o = 0; o < orders.length; o++) {
        var order = orders[o];
        if (order.id === ignoreId || order.quotedAt === 0 || order.status === 'requested') continue;
        for (var i = 0; i < order.items.length; i++) {
            var past = order.items[i];
            if (past.kind === 'quote' && lineTotal(past) > 0) {
                // Tanggalin yung lumang add-ons para hindi madoble
                // pag dinagdag ulit yung add-ons ng bagong line.
                var base = past.materials - past.estimate;
                listAdd(seen, { seq: seen.length, productId: past.productId, size: past.size, stamp: order.quotedAt,
                                materials: (base > 0 ? base : 0) / past.quantity, labor: past.labor / past.quantity });
            }
        }
    }
    // Bago muna. Luma muna ang ayos ng orders, kaya pag binasa pabaliktad
    // halos naka-ayos na (best case ng insertion sort). Yung mga line
    // na sabay na-quote, same pa rin ang ayos (seq).
    return insertionSort(backwards(seen), function (a, b) { return b.stamp - a.stamp || a.seq - b.seq; });
}

// Limang pinakabagong quote ng product (pareho ang size kung
// sameSize). Bago muna ang history kaya titigil na sa lima.
// Time O(n) · Space O(1)
function recentQuotes(history, item, sameSize) {
    var out = [];
    for (var h = 0; h < history.length && out.length < 5; h++) {
        var line = history[h];
        if (line.productId === item.productId && (!sameSize || line.size === item.size)) listAdd(out, line);
    }
    return out;
}

// Magkano dati sinisingil sa parehong product at size, kada piraso:
// average ng huling lima. null kung wala pang history.
// Time O(n) · Space O(1)
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

// pastQuoteFrom para sa isang item, gagawin muna yung history.
// Time O(n²) · Space O(n)
function pastQuote(item, ignoreId) {
    return pastQuoteFrom(quoteHistory(ignoreId), item);
}

// Panimulang laman ng quote editor para check at send na lang
// ang owner. Galing sa mga lumang quote ng parehong product.
// Time O(n²) · Space O(n)
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

// Tamang halaga ba ng pera (0 hanggang 1,000,000)?
// Time O(1) · Space O(1)
function isMoney(value) {
    return typeof value === 'number' && value === value && value >= 0 && value <= 1000000;
}

// Chine-check yung quotation bago i-send.
// Time O(n) · Space O(1)
function validateQuote(order, draft) {
    var errors = [];
    // Tala ng isang mali.
    // Time O(1) · Space O(1)
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

// Sine-send (o binabago) yung quotation.
// Time O(n) · Space O(n)
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
    addHistory(order, stamp, (revising ? 'Quotation revised: ' : 'Quotation sent: ') + peso(orderTotal(order)), deskActor());
    emailQuoteReady(order, stamp);
    return { ok: true, order: order };
}

// Salita para sa delivery ayon sa fee na talagang sinisingil.
// Time O(n) · Space O(1)
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

// Delivery record pag naayos na ng shop yung fee.
// Time O(n) · Space O(1)
function settledDelivery(order, delivery, fee) {
    return copyRecord(delivery, {
        fee: fee,
        status: delivery.service === 'courier' ? 'confirmed' : delivery.status,
        label: deliveryLabel(delivery, fee, order.fulfilment)
    });
}

// Mga na-quote na order, pinakaluma muna.
// Time O(n²) · Space O(n)
function awaitingPayment() {
    return insertionSort(ordersWithStatus('quoted'), function (a, b) { return a.quotedAt - b.quotedAt; });
}
