/* =========================================================================
   MODULE 4 · FLOWER CUSTOMISER
   Arrangement, dami, isa sa 20 kulay at add-ons. Hash table ng 160 na
   litrato ("flower|arrangement|colour"), price list, at recursion para sa
   total ng add-ons.
   ========================================================================= */

// Presyo ng isang bouquet na may `count` na bulaklak, 0 kung wala.
// Time O(n) · Space O(1)
function priceForCount(product, count) {
    var row = firstWhere(product.priceTable, function (r) { return r.count === count; });
    return row ? row.price : 0;
}

// Mga bilang ng bulaklak ng arrangement na may presyo.
// Time O(n²) · Space O(n)
function countsFor(product, arrangementId) {
    var arrangement = arrangementById(arrangementId);
    if (!arrangement) return [];
    return keepWhere(arrangement.counts, function (count) { return priceForCount(product, count) > 0; });
}

// Lahat ng bilang na inaalok ng mga arrangement, maliit muna, walang
// ulit. Kinokolekta, insertion sort, tapos tig-isa lang.
// Time O(n²) · Space O(n)
function offeredCounts(arrangementIds) {
    var all = [];
    for (var a = 0; a < arrangementIds.length; a++) {
        var arrangement = arrangementById(arrangementIds[a]);
        if (!arrangement) continue;
        for (var k = 0; k < arrangement.counts.length; k++) listAdd(all, arrangement.counts[k]);
    }
    var sorted = insertionSort(all, function (x, y) { return x - y; }), out = [];
    for (var i = 0; i < sorted.length; i++) {
        if (i === 0 || sorted[i] !== sorted[i - 1]) listAdd(out, sorted[i]);
    }
    return out;
}

// May arrangement bang gumagawa ng `count` na bulaklak?
// Maiikling fixed list lang ito kaya constant.
// Time O(1) (fixed na listahan) · Space O(1)
function offersCount(product, count) {
    for (var a = 0; a < product.arrangements.length; a++) {
        var arrangement = arrangementById(product.arrangements[a]);
        if (arrangement && isIn(arrangement.counts, count)) return true;
    }
    return false;
}

// ---------- Litrato ng bawat combination (hash table) ----------

// Key ng litrato: "flower|arrangement|colour".
// Time O(1) · Space O(1)
function referenceKey(flower, arrangement, color) {
    return flower + '|' + arrangement + '|' + color;
}

// Nilalagay sa hash table lahat ng combination: preview muna,
// tapos papalitan ng totoong litrato kung meron.
// Time O(n) (isang hashPut bawat flower × arrangement × colour, n = 160, at bawat litrato) · Space O(n)
function buildReferenceIndex() {
    // 160 keys sa 199 buckets: load factor na mga 0.8, maiikli ang chain.
    var table = hashCreate(199);
    for (var f = 0; f < FLOWERS.length; f++) {
        for (var a = 0; a < ARRANGEMENTS.length; a++) {
            for (var c = 0; c < COLORS.length; c++) {
                var flower = FLOWERS[f], arrangement = ARRANGEMENTS[a].id, color = COLORS[c].id;
                hashPut(table, referenceKey(flower, arrangement, color), {
                    src: IMG_COLORS + flower + '-' + arrangement + '-' + color + '.jpg',
                    real: false
                });
            }
        }
    }
    for (var r = 0; r < REAL_REFERENCES.length; r++) {
        var ref = REAL_REFERENCES[r];
        hashPut(table, referenceKey(ref.flower, ref.arrangement, ref.color),
                { src: IMG_PRODUCTS + ref.file, real: true });
    }
    return table;
}

// Yung litrato para sa napili: { src, real } o null.
// Time O(1) average · Space O(1)
function referenceImage(flower, arrangement, color) {
    return hashGet(referenceIndex, referenceKey(flower, arrangement, color));
}

// ---------- Add-ons (recursive na total) ----------

// Presyo ng glitter depende sa dami ng bulaklak.
// Time O(n) · Space O(1)
function glitterPrice(flowerCount) {
    var tier = firstWhere(GLITTER_TIERS, function (t) { return flowerCount <= t.upTo; });
    return tier ? tier.price : GLITTER_TIERS[GLITTER_TIERS.length - 1].price;
}

// Presyo ng isang add-on.
// Time O(n) · Space O(1)
function addonPrice(addonId, flowerCount) {
    var addon = addonById(addonId);
    if (!addon) return 0;
    return addon.id === 'glitter' ? glitterPrice(flowerCount || 1) : addon.price;
}

// Total ng add-ons para sa isang bouquet (recursive sum).
// Time O(n) · Space O(n) call stack
function addonsTotal(addonIds, flowerCount) {
    return sumRecursive(addonIds, function (id) { return addonPrice(id, flowerCount); });
}

// ---------- Item na mapupunta sa cart ----------

// Buong number ba at nasa pagitan ng low at high?
// Time O(1) · Space O(1)
function isWholeIn(value, low, high) {
    return typeof value === 'number' && value === Math.floor(value) && value >= low && value <= high;
}

// Chine-check yung napiling flower tapos ginagawa yung item.
// choice: { arrangement, count, color, quantity, addons, cardFlower, notes, reference }
// Time O(n²) · Space O(n)
function makeFlowerItem(product, choice) {
    if (!product || !product.active || product.kind !== 'flower') return { ok: false, error: 'This bouquet is not available.' };
    if (!isIn(product.arrangements, choice.arrangement)) return { ok: false, error: 'Choose an arrangement.' };
    if (!isIn(countsFor(product, choice.arrangement), choice.count)) return { ok: false, error: 'Choose how many flowers.' };
    if (!isIn(product.colors, choice.color)) return { ok: false, error: 'Choose a ribbon colour.' };
    if (!isWholeIn(choice.quantity, 1, MAX_QUANTITY)) return { ok: false, error: 'Quantity must be 1 to ' + MAX_QUANTITY + '.' };
    if (String(choice.notes || '').length > MAX_NOTE) return { ok: false, error: 'Notes are limited to ' + MAX_NOTE + ' characters.' };

    var addons = keepWhere(choice.addons || [], function (id) { return addonById(id) !== null; });
    var unit = priceForCount(product, choice.count) + addonsTotal(addons, choice.count);
    return { ok: true, item: {
        productId: product.id, productName: product.name, kind: 'flower', quoteType: 'flower',
        arrangement: choice.arrangement, count: choice.count, color: choice.color,
        size: '', detail: '', provided: false,
        quantity: choice.quantity, addons: addons,
        cardFlower: isIn(addons, 'card') ? (choice.cardFlower || CARD_FLOWERS[0]) : '',
        notes: strip(choice.notes), reference: choice.reference || null,
        unitEstimate: unit, estimate: unit * choice.quantity,
        materials: 0, labor: 0, itemExpense: 0
    } };
}
