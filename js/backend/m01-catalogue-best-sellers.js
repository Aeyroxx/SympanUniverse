/* =========================================================================
   MODULE 1 · CATALOGUE AT BEST SELLERS
   Mga product, presyo sa card ("Starts at"), at best sellers na galing sa
   totoong benta: hash table para bilangin ang benta sa isang pasada, tapos
   selection sort para i-rank. Nandito rin ang pag-edit ng product ng desk.
   ========================================================================= */

// Kopya ng product galing sa seed, buo na yung path ng images.
// Time O(n) · Space O(n)
function productFromSeed(seed) {
    var gallery = [], table = [], colorIds = [];
    for (var i = 0; i < seed.gallery.length; i++) listAdd(gallery, IMG_PRODUCTS + seed.gallery[i]);
    var prices = seed.priceTable || [];
    for (var j = 0; j < prices.length; j++) listAdd(table, { count: prices[j].count, price: prices[j].price });
    if (seed.kind === 'flower') {
        for (var c = 0; c < COLORS.length; c++) listAdd(colorIds, COLORS[c].id);
    }
    var product = copyRecord(seed, {
        gallery: gallery,
        priceTable: table,
        colors: colorIds,
        arrangements: copyArray(seed.arrangements || []),
        sizes: copyArray(seed.sizes || []),
        materials: copyArray(seed.materials),
        startsAt: 0,
        active: true
    });
    return seed.kind === 'flower' ? copyRecord(product, { startsAt: lowestOffer(product) }) : product;
}

// Product gamit yung id. Sampu lang ang products kaya linear search.
// Time O(n) · Space O(1)
function productById(id) {
    return byId(products, Number(id));
}

// Yung pwede lang i-order ng customer.
// Time O(n) · Space O(n)
function activeProducts() {
    return keepWhere(products, function (p) { return p.active; });
}

// Pinakamurang presyo sa price list na kayang gawin ng arrangement.
// Sine-save as product.startsAt para O(1) na lang sa cards.
// Time O(n) (isang pasada sa price rows) · Space O(1)
function lowestOffer(product) {
    var lowest = 0;
    for (var r = 0; r < product.priceTable.length; r++) {
        var row = product.priceTable[r];
        if (row.price > 0 && offersCount(product, row.count) && (lowest === 0 || row.price < lowest)) lowest = row.price;
    }
    return lowest;
}

// Yung "Starts at" na presyo. 0 = Customized Pricing.
// Time O(1) · Space O(1)
function productStartsAt(product) {
    if (product.kind === 'fixed') return product.price;
    return product.startsAt > 0 ? product.startsAt : 0;
}

// "Starts at ₱55", "₱650" o "Customized Pricing".
// Time O(n) sa digits · Space O(n)
function priceLabel(product) {
    if (product.kind === 'fixed') return pesoWhole(product.price);
    var from = productStartsAt(product);
    return from > 0 ? 'Starts at ' + pesoWhole(from) : 'Customized Pricing';
}

// Credit ng sample photo galing sa web, null kung sariling litrato.
// Time O(n) · Space O(n)
function photoCredit(src) {
    return firstWhere(PHOTO_CREDITS, function (c) { return IMG_PRODUCTS + c.file === src; });
}

// Yung unang litrato ng product.
// Time O(1) · Space O(1)
function productCover(product) {
    if (product.gallery.length > 0) return product.gallery[0];
    if (product.kind === 'flower') {
        var ref = referenceImage(product.flower, product.arrangements[0], product.colors[0]);
        if (ref) return ref.src;
    }
    return '';
}

// ---------- Benta at best sellers ----------

// Kasama ba sa benta yung order (bayad na)?
// Time O(1) · Space O(1)
function countsAsSale(order) {
    return order.status === 'paid' || order.status === 'completed';
}

// Ilang order at piraso kada product. May hash table na key ang
// product id kaya isang beses lang binabasa bawat order.
// Time O(n²) (bawat line ng bawat order) · Space O(n)
function salesTally(include) {
    var out = [], rowFor = hashCreate(31);
    for (var p = 0; p < products.length; p++) {
        var row = { product: products[p], orders: 0, units: 0, lastOrder: -1 };
        listAdd(out, row);
        hashPut(rowFor, String(products[p].id), row);
    }
    for (var o = 0; o < orders.length; o++) {
        if (!countsAsSale(orders[o]) || (include && !include(orders[o]))) continue;
        var items = orders[o].items;
        for (var i = 0; i < items.length; i++) {
            var hit = hashGet(rowFor, String(items[i].productId));
            if (hit === null) continue;
            hit.units += items[i].quantity;
            // Isang beses lang bilangin ang order kahit ilang line ang product.
            if (hit.lastOrder !== o) { hit.orders++; hit.lastOrder = o; }
        }
    }
    return out;
}

// Ilang piraso na ang nabenta ng isang product.
// Time O(n²) · Space O(1)
function soldUnits(productId) {
    var units = 0;
    for (var o = 0; o < orders.length; o++) {
        if (!countsAsSale(orders[o])) continue;
        for (var i = 0; i < orders[o].items.length; i++) {
            if (orders[o].items[i].productId === productId) units += orders[o].items[i].quantity;
        }
    }
    return units;
}

// Rank key: dami ng piraso muna, tapos dami ng order pag tabla.
// Time O(1) · Space O(1)
function salesRank(row) {
    return row.units * 100000 + row.orders;
}

// Top k best sellers ayon sa piraso, selection sort.
// Hindi kasama yung disabled at yung wala pang bumili.
// Time O(n²) · Space O(n)
function bestSellers(k) {
    return topSellers(salesTally(), k);
}

// I-rank kahit anong tally, buong history o isang araw/buwan/taon.
// Time O(n²) · Space O(n)
function topSellers(tally, k) {
    var ranked = selectionSortDesc(tally, salesRank);
    var out = [];
    for (var i = 0; i < ranked.length && out.length < k; i++) {
        if (ranked[i].units > 0 && ranked[i].product.active) listAdd(out, ranked[i]);
    }
    return out;
}

// Isa ba sa top 3 best sellers?
// Time O(n²) · Space O(n)
function isBestSeller(productId) {
    var top = bestSellers(3);
    return firstWhere(top, function (row) { return row.product.id === productId; }) !== null;
}

// ---------- Pag-edit ng product (order desk) ----------

// Kopya ng mga pwedeng i-edit sa product.
// Time O(n) · Space O(n)
function productEditDraft(product) {
    var table = [];
    for (var i = 0; i < product.priceTable.length; i++) listAdd(table, copyRecord(product.priceTable[i]));
    return {
        name: product.name, blurb: product.blurb, story: product.story,
        leadDays: product.leadDays, startsAt: product.startsAt,
        materials: copyArray(product.materials), sizes: copyArray(product.sizes),
        arrangements: copyArray(product.arrangements), colors: copyArray(product.colors),
        priceTable: table, gallery: copyArray(product.gallery)
    };
}

// Pinakamaraming litrato ng isang product.
var MAX_GALLERY = 16;

// May laman at maikli ba lahat?
// Time O(n²) · Space O(1)
function allShortText(list, max) {
    for (var i = 0; i < list.length; i++) {
        if (isBlank(list[i]) || String(list[i]).length > max) return false;
    }
    return true;
}

// Chine-check yung na-edit na product.
// Time O(n²) · Space O(n)
function validateProductDraft(product, draft) {
    var name = strip(draft.name);
    if (name.length < 2 || name.length > 60) return 'The name must be 2 to 60 characters.';
    if (isBlank(draft.blurb) || String(draft.blurb).length > 160) return 'The short description must be 1 to 160 characters.';
    if (String(draft.story).length > 900) return 'The full description is limited to 900 characters.';
    if (!isWholeIn(draft.leadDays, 1, 14)) return 'Processing time must be 1 to 14 days.';
    if (draft.materials.length === 0 || !allShortText(draft.materials, 60)) return 'List at least one material, each under 60 characters.';
    if (draft.gallery.length > MAX_GALLERY) return 'Keep the gallery to ' + MAX_GALLERY + ' images or fewer.';
    if (!allShortText(draft.gallery, 2000)) return 'An image path is empty.';
    if (product.kind === 'flower') {
        if (draft.arrangements.length === 0) return 'Offer at least one arrangement.';
        for (var a = 0; a < draft.arrangements.length; a++) {
            if (!arrangementById(draft.arrangements[a])) return 'Unknown arrangement.';
        }
        if (draft.colors.length === 0) return 'Offer at least one colour.';
        for (var c = 0; c < draft.colors.length; c++) {
            if (!colorById(draft.colors[c])) return 'Unknown colour.';
        }
        if (draft.priceTable.length === 0) return 'The price list needs at least one row.';
        var offered = offeredCounts(draft.arrangements), seen = [];
        for (var p = 0; p < draft.priceTable.length; p++) {
            var row = draft.priceTable[p];
            if (!isWholeIn(row.count, 1, 100) || !isMoney(row.price) || row.price <= 0) {
                return 'Every price-list row needs a flower count and a price above zero.';
            }
            if (!isIn(offered, row.count)) return row.count + ' flowers is not a size any chosen arrangement offers.';
            if (isIn(seen, row.count)) return row.count + ' flowers is priced twice.';
            listAdd(seen, row.count);
        }
        for (var r = 0; r < draft.arrangements.length; r++) {
            var counts = arrangementById(draft.arrangements[r]).counts;
            if (countWhere(counts, function (n) { return isIn(seen, n); }) === 0) {
                return arrangementById(draft.arrangements[r]).name + ' needs at least one priced flower count.';
            }
        }
    } else {
        if (draft.sizes.length === 0 || !allShortText(draft.sizes, 40)) return 'List at least one size, each under 40 characters.';
        if (!isMoney(draft.startsAt)) return 'The starting price must be zero (none) or more.';
    }
    return '';
}

// Pinapalitan yung product ng na-edit na kopya.
// Time O(n²) · Space O(n)
function updateProduct(id, draft) {
    var at = -1;
    for (var i = 0; i < products.length; i++) if (products[i].id === Number(id)) at = i;
    if (at === -1) return { ok: false, error: 'No such product.' };
    var product = products[at];
    var problem = validateProductDraft(product, draft);
    if (problem) return { ok: false, error: problem };

    var table = insertionSort(draft.priceTable, function (x, y) { return x.count - y.count; });
    var edited = copyRecord(product, {
        name: strip(draft.name), blurb: strip(draft.blurb), story: strip(draft.story),
        leadDays: draft.leadDays, startsAt: product.kind === 'quote' ? roundMoney(draft.startsAt) : 0,
        materials: copyArray(draft.materials), sizes: copyArray(draft.sizes),
        arrangements: copyArray(draft.arrangements), colors: copyArray(draft.colors),
        priceTable: table, gallery: copyArray(draft.gallery)
    });
    // Sumusunod sa bagong price list yung "Starts at" ng flower bouquet.
    products[at] = product.kind === 'flower' ? copyRecord(edited, { startsAt: lowestOffer(edited) }) : edited;
    return { ok: true, product: products[at] };
}

// Disable o enable lang, walang binubura.
// Time O(n) · Space O(1)
function setProductActive(id, active) {
    for (var i = 0; i < products.length; i++) {
        if (products[i].id === Number(id)) {
            products[i] = copyRecord(products[i], { active: active === true });
            return { ok: true, product: products[i] };
        }
    }
    return { ok: false, error: 'No such product.' };
}
