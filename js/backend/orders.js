/* =========================================================================
   BACKEND · ORDERS (common sa lahat ng module)
   Mga status ng order, history, paghanap ng order (binary search sa
   order number) at mga pera sa order (total, balance, status ng bayad).

     requested  nag-request ang customer, nasa quote queue
     quoted     na-presyuhan na, pwedeng tanggapin o hindi
     paid       bayad na (50% o 100%), nasa production
     completed  tapos, bayad lahat, na-release
     voided     na-cancel; nakatago pa rin, hindi nire-refund
   ========================================================================= */

var STATUS_LABELS = [
    { id: 'requested', label: 'Awaiting quotation' },
    { id: 'quoted',    label: 'Awaiting payment' },
    { id: 'paid',      label: 'In production' },
    { id: 'completed', label: 'Completed' },
    { id: 'voided',    label: 'VOIDED – NON-REFUNDABLE' }
];

// Pangalan ng status ng order para sa screen.
// Time O(n) · Space O(1)
function statusLabel(order) {
    var row = byId(STATUS_LABELS, order.status);
    return row ? row.label : order.status;
}

// Linya sa history ng order, at parehong event sa audit log
// kasama kung sino ang gumawa (Customer, taga-desk, o System).
// Time O(n) sa text · Space O(1)
function addHistory(order, stamp, text, actor, detail, level) {
    listAdd(order.history, { stamp: stamp, text: text });
    logAudit(stamp, actor || 'System', text, order.ref, detail, level);
}

// Order gamit yung id, binary search.
// Time O(log n) · Space O(1)
function orderById(id) {
    var at = binarySearch(orders, Number(id), function (o) { return o.id; });
    return at === -1 ? null : orders[at];
}

// "SU-215", "su 215" o "215" pare-pareho lang.
// Time O(log n) + O(n) sa text · Space O(n)
function orderByRef(text) {
    var digits = digitsOnly(text);
    if (digits.length === 0 || digits.length > 9) return null;
    return orderById(toNumber(digits));
}

// Lahat ng order na may ganitong status.
// Time O(n) · Space O(n)
function ordersWithStatus(status) {
    return keepWhere(orders, function (o) { return o.status === status; });
}

// ---------- Pera sa order ----------

// Sum ng mga quoted na line.
// Time O(n) · Space O(n) call stack
function orderSubtotal(order) {
    return roundMoney(sumRecursive(order.items, lineTotal));
}

// Kabuuan: subtotal + delivery + rush fee.
// Time O(n) · Space O(n)
function orderTotal(order) {
    return roundMoney(orderSubtotal(order) + order.deliveryFee + order.rushFee);
}

// Bago ma-quote: price list + tantya ng delivery.
// Time O(n) · Space O(n)
function orderEstimate(order) {
    var items = sumRecursive(order.items, function (item) { return item.estimate; });
    return roundMoney(items + order.deliveryFee + order.rushFee);
}

// "₱825.00", o "To be quoted" kung wala pang presyo.
// Time O(n) · Space O(n)
function estimateText(order) {
    var items = sumRecursive(order.items, function (item) { return item.estimate; });
    return items > 0 ? peso(orderEstimate(order)) : 'To be quoted';
}

// "Estimate ₱825.00" o "To be quoted".
// Time O(n) · Space O(n)
function estimateLabel(order) {
    var text = estimateText(order);
    return text === 'To be quoted' ? text : 'Estimate ' + text;
}

// Magkano pa ang kulang.
// Time O(n) · Space O(n)
function orderBalance(order) {
    var left = roundMoney(orderTotal(order) - order.amountPaid);
    return left > 0 ? left : 0;
}

// May naibayad na ba at may kulang pa? Totoo sa 50% down payment
// at sa order na tinaasan ng desk pagkatapos.
// Time O(n) · Space O(n)
function owesBalance(order) {
    return (order.status === 'paid' || order.status === 'completed') && order.amountPaid > 0 && orderBalance(order) > 0;
}

// Sobra ang bayad kasi binabaan ng desk yung total. Hindi
// nire-refund, pinapakita lang.
// Time O(n) · Space O(n)
function orderOverpaid(order) {
    var over = roundMoney(order.amountPaid - orderTotal(order));
    return over > 0 ? over : 0;
}

// Unpaid, Partially paid, o Fully paid.
// Time O(n) · Space O(n)
function paymentStatus(order) {
    if (order.amountPaid <= 0) return 'Unpaid';
    return orderBalance(order) > 0 ? 'Partially paid' : 'Fully paid';
}

// ---------- Detalye ng item at schedule ----------

// Maiikling detalye ng isang item (pang-chips).
// Time O(n) · Space O(n)
function itemSpecs(item) {
    var out = [];
    if (item.kind === 'flower') {
        var arrangement = arrangementById(item.arrangement), color = colorById(item.color);
        listAdd(out, arrangement ? arrangement.name : item.arrangement);
        listAdd(out, item.count + ' ' + plural(item.count, 'flower'));
        listAdd(out, color ? color.name : item.color);
    } else {
        var type = quoteTypeById(item.quoteType);
        listAdd(out, item.size);
        listAdd(out, item.count + ' ' + textAfterNumberOf(type.countLabel));
        if (type.provided) listAdd(out, (item.provided ? 'Customer provides ' : 'Shop sources ') + type.provided);
        if (item.quoteType === 'money' && toNumber(item.detail) > 0) {
            listAdd(out, 'Total ' + pesoWhole(toNumber(item.detail)));
            listAdd(out, describeBills(breakIntoBills(toNumber(item.detail), DENOMINATIONS)));
        } else if (item.detail) {
            listAdd(out, item.detail);
        }
    }
    for (var i = 0; i < item.addons.length; i++) {
        var addon = addonById(item.addons[i]);
        if (addon) listAdd(out, addon.id === 'card' ? 'Card · ' + item.cardFlower : addon.name);
    }
    return out;
}

// "Number of makeup products" -> "makeup products".
// Time O(n) · Space O(n)
function textAfterNumberOf(label) {
    var prefix = 'Number of ';
    return beginsWith(label, prefix) ? textPart(label, prefix.length) : label;
}

// Quoted na halaga ng isang line: materials + labor + item cost.
// Time O(1) · Space O(1)
function lineTotal(item) {
    return roundMoney((Number(item.materials) || 0) + (Number(item.labor) || 0) + (Number(item.itemExpense) || 0));
}

// "Delivery · 12 Oct 2026, 02:00 PM · Marilao" o "Pickup · ..."
// (date lang sa pickup).
// Time O(1) · Space O(1)
function fulfilmentSummary(order) {
    var f = order.fulfilment;
    if (f.mode !== 'delivery') return 'Pickup · ' + formatDateShort(f.date) + ' · Lawa, Meycauayan';
    return 'Delivery · ' + formatDateShort(f.date) + ', ' + f.slot + ' · ' + (f.city || order.delivery.area);
}

// "Friday, 9 October 2026" sa pickup, may oras pa sa delivery.
// Time O(1) · Space O(1)
function whenText(order) {
    var f = order.fulfilment;
    return formatDateLong(f.date) + (f.mode === 'delivery' && f.slot ? ', ' + f.slot : '');
}
