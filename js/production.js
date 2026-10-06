/* =========================================================================
   PRODUCTION — what happens to an order once it is paid (steps 4 and 5 of
   the lifecycle in orders.js), and the dashboard figures.

     4. production: rush orders in a min-heap by due date, standard orders
        in a circular queue by payment order; "Mark ready" releases the
        next fully paid one and pushes it on a stack for undo
     5. voiding: an order cancelled before completion is kept on record as
        VOIDED – NON-REFUNDABLE, and any payment is retained

   Every function takes the moment it happens as `stamp` (milliseconds).
   Depends on store.js and orders.js.
   ========================================================================= */

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
    addHistory(order, stamp, 'Ready and released', deskActor());
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
    addHistory(order, stamp, 'Completion undone — back in production', deskActor());
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
    order.voidedBy = by === 'admin' ? deskActor() : (by === 'system' ? 'System' : 'Customer');
    order.voidReason = strip(reason) || (by === 'admin' ? 'Cancelled by the order desk' : 'Cancelled by the customer');
    addHistory(order, stamp, 'VOIDED – NON-REFUNDABLE' +
               (order.amountPaid > 0 ? ' (' + peso(order.amountPaid) + ' retained)' : ''),
               by === 'admin' ? deskActor() : (by === 'system' ? 'System' : 'Customer'), order.voidReason, 'warn');
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
