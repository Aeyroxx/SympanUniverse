/* =========================================================================
   DSA · SEARCHING
   Binary search sa sorted na array (orders, accounts) at linear search na
   may naive string matching (search box ng shop at ng logs).
   ========================================================================= */

// Binary search sa array na sorted. Pataas lagi yung order number
// at sa dulo lang nadadagdag, kaya sorted na agad. -1 kung wala.
// Time O(log n) · Space O(1)
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

// Linear search: lahat ng record na may lahat ng salitang tinype.
// Time O(n²) (naive string matching sa bawat record) · Space O(n)
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
