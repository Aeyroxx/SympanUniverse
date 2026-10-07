/* =========================================================================
   DSA · HASH TABLE (separate chaining)
   Gamit sa: litrato ng bawat flower|arrangement|colour, delivery area ng
   bawat city, account gamit ang email, at mga sign-in counter. Isang
   bucket lang ang tinitingnan kaya O(1) average. Lumalaki pag puno na.
   ========================================================================= */

// Bagong hash table na may mga bucket.
// Time O(n) · Space O(n)
function hashCreate(bucketCount) {
    var count = bucketCount || 31, buckets = [];
    for (var i = 0; i < count; i++) buckets[i] = [];
    return { buckets: buckets, bucketCount: count, size: 0 };
}

// Saang bucket mapupunta yung key.
// Time O(n) · Space O(1)
function hashIndex(table, key) {
    return fnv1a(key) % table.bucketCount;
}

// Dagdag o palit. Pag sobrang dami na kada bucket, lumalaki.
// Time O(1) average, amortised · Space O(1) amortised
function hashPut(table, key, value) {
    var chain = table.buckets[hashIndex(table, key)];
    for (var i = 0; i < chain.length; i++) {
        if (chain[i].key === key) { chain[i].value = value; return; }
    }
    chain[chain.length] = { key: key, value: value };
    table.size++;
    if (table.size > 2 * table.bucketCount) hashGrow(table);
}

// Dinodoble yung buckets (+1 para odd) tapos nililipat lahat ng key.
// Bihira lang mangyari kaya O(1) amortised pa rin yung put.
// Time O(n) · Space O(n)
function hashGrow(table) {
    var old = table.buckets, count = table.bucketCount * 2 + 1, buckets = [];
    for (var b = 0; b < count; b++) buckets[b] = [];
    table.buckets = buckets;
    table.bucketCount = count;
    for (var i = 0; i < old.length; i++) {
        for (var k = 0; k < old[i].length; k++) {
            var chain = buckets[hashIndex(table, old[i][k].key)];
            chain[chain.length] = old[i][k];
        }
    }
}

// Yung value ng key, null kung wala.
// Time O(1) average · Space O(1)
function hashGet(table, key) {
    var chain = table.buckets[hashIndex(table, key)];
    for (var i = 0; i < chain.length; i++) {
        if (chain[i].key === key) return chain[i].value;
    }
    return null;
}

// Meron bang ganitong key?
// Time O(1) average · Space O(1)
function hashHas(table, key) {
    return hashGet(table, key) !== null;
}

// Lahat ng { key, value }, bucket por bucket.
// Time O(n) · Space O(n)
function hashEntries(table) {
    var out = [];
    for (var i = 0; i < table.bucketCount; i++) {
        var chain = table.buckets[i];
        for (var k = 0; k < chain.length; k++) out[out.length] = { key: chain[k].key, value: chain[k].value };
    }
    return out;
}

// Load factor at pinakamahabang chain, para makita kung pantay.
// Time O(n) · Space O(1)
function hashStats(table) {
    var longest = 0, used = 0;
    for (var i = 0; i < table.bucketCount; i++) {
        var len = table.buckets[i].length;
        if (len > longest) longest = len;
        if (len > 0) used++;
    }
    return { size: table.size, buckets: table.bucketCount, used: used,
             longestChain: longest, loadFactor: table.size / table.bucketCount };
}
