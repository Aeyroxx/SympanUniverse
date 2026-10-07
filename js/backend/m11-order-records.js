/* =========================================================================
   MODULE 11 · ORDER RECORDS
   Undo ng "Mark ready" gamit ang stack, mga tapos na order ayon sa araw
   (insertion sort, halos naka-ayos na), at mga na-void na hindi binubura
   (VOIDED – NON-REFUNDABLE).
   ========================================================================= */

// Ibinabalik yung huling na-release sa eksaktong pinanggalingan niya
// (pop sa stack).
// Time O(n) worst · Space O(n)
function undoCompletion(stamp) {
    var entry = stackPop(completedStack);
    if (entry === null) return { ok: false, error: 'There is nothing to undo.' };
    var order = orderById(entry.id);
    order.status = 'paid';
    order.completedAt = 0;
    if (order.lane === 'rush') {
        // Yung order na nilipat sa rush pagkatapos matapos, wala pang
        // arrival number, kaya kukunin yung susunod.
        if (order.laneSeq < 0) order.laneSeq = rushLane.nextSeq;
        heapInsert(rushLane, order.id, dueKey(order), order.laneSeq);
    } else {
        if (entry.position <= 0) cqRequeueFront(standardLane, order.id);
        else cqInsertAt(standardLane, entry.position, order.id);
    }
    addHistory(order, stamp, 'Completion undone — back in production', deskActor());
    return { ok: true, order: order };
}

// Mga tapos na order naka-group ayon sa araw, bago muna. Binabasa
// pabaliktad bago insertion sort kaya halos naka-ayos na.
// Time O(n) dito (halos naka-ayos na), O(n²) worst · Space O(n)
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

// Vino-void yung order (hindi binubura) at hindi nire-refund.
// Time O(n) · Space O(n)
function voidOrder(id, reason, by, stamp) {
    var order = orderById(id);
    if (!order) return { ok: false, error: 'No such order.' };
    if (order.status === 'completed') return { ok: false, error: order.ref + ' is completed and cannot be voided.' };
    if (order.status === 'voided') return { ok: false, error: order.ref + ' is already voided.' };

    if (order.status === 'requested') leaveQueue(quoteQueue, order.id);
    if (order.status === 'paid') leaveProduction(order);
    order.status = 'voided';
    order.voidedAt = stamp;
    order.voidedBy = by === 'admin' ? deskActor() : (by === 'system' ? 'System' : 'Customer');
    order.voidReason = strip(reason) || (by === 'admin' ? 'Cancelled by the order desk' : 'Cancelled by the customer');
    addHistory(order, stamp, 'VOIDED – NON-REFUNDABLE' +
               (order.amountPaid > 0 ? ' (' + peso(order.amountPaid) + ' retained)' : ''),
               by === 'admin' ? deskActor() : (by === 'system' ? 'System' : 'Customer'), order.voidReason, 'warn');
    emailOrderVoided(order, stamp);
    return { ok: true, order: order };
}

// Vino-void lahat ng quotation na hindi nabayaran sa loob ng
// QUOTE_EXPIRY_DAYS. Tumatakbo pag-start at kada minuto.
// Time O(n²) · Space O(n)
function expireQuotes(now) {
    var limit = QUOTE_EXPIRY_DAYS * 24 * 3600000, expired = [];
    var stale = keepWhere(orders, function (o) { return o.status === 'quoted' && now - o.quotedAt > limit; });
    for (var i = 0; i < stale.length; i++) {
        voidOrder(stale[i].id, 'Quotation expired — not paid within ' + QUOTE_EXPIRY_DAYS + ' days', 'system', now);
        listAdd(expired, stale[i]);
    }
    return expired;
}

// Mga na-void, pinakabago muna.
// Time O(n) dito (halos naka-ayos na), O(n²) worst · Space O(n)
function voidedOrders() {
    return insertionSort(backwards(ordersWithStatus('voided')), function (a, b) { return b.voidedAt - a.voidedAt || a.id - b.id; });
}
