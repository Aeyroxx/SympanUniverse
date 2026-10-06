/* =========================================================================
   ALGORITHMS — sorting, searching, recursion and the greedy bill count.

   Each one is written out longhand because how it behaves — stability,
   complexity, what it touches — is the thing being demonstrated.
   Depends on core.js.
   ========================================================================= */

/* =========================================================================
   COMPARISON
   ========================================================================= */

/* Case-insensitive text order, one character code at a time.
   Negative when a sorts first.           Time O(n)  · Space O(n) */
function compareText(a, b) {
    var x = toLower(a), y = toLower(b);
    var shorter = x.length < y.length ? x.length : y.length;
    for (var i = 0; i < shorter; i++) {
        var diff = x.charCodeAt(i) - y.charCodeAt(i);
        if (diff !== 0) return diff;
    }
    return x.length - y.length;
}

/* =========================================================================
   INSERTION SORT — stable; best O(n), worst O(n²)

   Used for the catalogue's sort control, the outbox, the quote history
   and every "newest first" list. Most of these lists are already in order
   or nearly so (orders are appended as they arrive), which is insertion
   sort's best case. Stability matters: two bouquets with the same sold
   count keep the order the catalogue already had, rather than trading
   places on every render.
   ========================================================================= */

/* Returns a new sorted array; the input is left untouched. Each item is
   taken in turn and the larger items before it slide one slot right until
   its place is found. "> 0" (not ">= 0") keeps equal items in their
   original order, so the sort is stable.
                                          Time O(n²) worst, O(n) best · Space O(n) copy */
function insertionSort(list, compare) {
    var work = copyArray(list);
    for (var i = 1; i < work.length; i++) {
        var held = work[i], j = i - 1;
        while (j >= 0 && compare(work[j], held) > 0) {
            work[j + 1] = work[j];
            j--;
        }
        work[j + 1] = held;
    }
    return work;
}

/* =========================================================================
   SELECTION SORT — the best-seller ranking

   O(n²): for each position, scan everything after it for the largest
   count and swap it forward. Quadratic, which is fine for a ten-product
   catalogue and makes the cost easy to see. `countOf` reads the number
   being ranked on.                       Time O(n²) · Space O(n)
   ========================================================================= */
function selectionSortDesc(records, countOf) {
    var work = copyArray(records);
    for (var i = 0; i < work.length - 1; i++) {
        var best = i;
        for (var j = i + 1; j < work.length; j++) {
            // Strictly greater, so ties keep their catalogue order.
            if (countOf(work[j]) > countOf(work[best])) best = j;
        }
        if (best !== i) {
            var held = work[best];
            // Shift rather than swap, so the sort stays stable.
            for (var k = best; k > i; k--) work[k] = work[k - 1];
            work[i] = held;
        }
    }
    return work;
}

/* =========================================================================
   SEARCH
   ========================================================================= */

/* Binary search over an array sorted ascending by keyOf. Order numbers are
   handed out in increasing sequence and orders are only ever appended, so
   the order list is sorted for free. Returns the index or -1.
                                          Time O(log n) · Space O(1) */
function binarySearch(sorted, target, keyOf) {
    var low = 0, high = sorted.length - 1;
    while (low <= high) {
        var mid = Math.floor((low + high) / 2);
        var key = keyOf(sorted[mid]);
        if (key === target) return mid;
        if (key < target) low = mid + 1;
        else high = mid - 1;
    }
    return -1;
}

/* Linear search: every record whose text contains every word typed.
   textOf builds the searchable text for one record.
                                          Time O(n²) — naive string matching on every record · Space O(n) */
function linearSearch(records, query, textOf) {
    var words = cutText(normaliseKey(query), ' ');
    var wanted = keepWhere(words, function (w) { return w.length > 0; });
    if (wanted.length === 0) return copyArray(records);

    var out = [];
    for (var i = 0; i < records.length; i++) {
        var haystack = normaliseKey(textOf(records[i]));
        var all = true;
        for (var w = 0; w < wanted.length && all; w++) {
            if (!textHas(haystack, wanted[w])) all = false;
        }
        if (all) listAdd(out, records[i]);
    }
    return out;
}

/* =========================================================================
   RECURSION
   ========================================================================= */

/* Sum a list by peeling off one element at a time. The base case is the
   empty tail. Used for the add-on total and the quote's line totals.
                                          Time O(n)  · Space O(n) call stack */
function sumRecursive(items, valueOf, index) {
    var at = index === undefined ? 0 : index;
    if (at >= items.length) return 0;
    return (Number(valueOf(items[at])) || 0) + sumRecursive(items, valueOf, at + 1);
}

/* =========================================================================
   GREEDY CHANGE-MAKING — how many bills a money bouquet needs

   Philippine notes form a canonical coin system, so taking the largest
   note that still fits is provably optimal: it returns the fewest bills
   for any amount. The bill count drives the size of the bouquet and so
   the labour the owner quotes.           Time O(n) · Space O(n)
   ========================================================================= */
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

/* "₱1,000 × 2 · ₱500 × 1"                Time O(n) · Space O(n) */
function describeBills(breakdown) {
    return renderEach(breakdown.bills, function (b) {
        return pesoWhole(b.note) + ' × ' + b.count;
    }, ' · ');
}
