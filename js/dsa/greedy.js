/* =========================================================================
   DSA · GREEDY  ->  pinakakaunting bills para sa money bouquet
   Pinakamalaking pera na kasya muna. Canonical ang perang Pinoy kaya
   pinakamaliit na bilang na talaga ng bills ang lumalabas.
   ========================================================================= */

// Greedy: pinakamalaking pera na kasya muna. Canonical yung
// perang Pinoy kaya ito na yung pinakakaunting bills.
// Time O(n) · Space O(n)
function breakIntoBills(amount, denominations) {
    var remaining = Math.floor(Number(amount) || 0);
    if (remaining < 0) remaining = 0;
    var bills = [];
    for (var i = 0; i < denominations.length; i++) {
        var note = denominations[i];
        var count = Math.floor(remaining / note);
        if (count > 0) {
            listAdd(bills, { note: note, count: count });
            remaining -= note * count;
        }
    }
    return { bills: bills, remainder: remaining, total: sumRecursive(bills, function (b) { return b.count; }) };
}

// "₱1,000 × 2 · ₱500 × 1".
// Time O(n) · Space O(n)
function describeBills(breakdown) {
    return renderEach(breakdown.bills, function (b) {
        return pesoWhole(b.note) + ' × ' + b.count;
    }, ' · ');
}
