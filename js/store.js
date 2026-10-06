/* =========================================================================
   STORE — the shop's working state, held in memory.

   Every record lives in one of the arrays or structures declared below.
   Nothing is saved to storage: a reload starts the shop afresh from the
   seed, which is why the customer pages and the order desk live on the
   same page — a second page could never see these arrays.

   This file covers the catalogue, colour references, the request basket,
   delivery fees and scheduling. orders.js covers the order lifecycle.
   Depends on core.js, structures.js, algorithms.js and data.js.
   ========================================================================= */

var products = [];             // working catalogue, editable by the order desk
var orders = [];               // every order ever placed, ascending by id
var receipts = [];             // every receipt issued, ascending by number
var basket = llCreate();       // the customer's cart (linked list)
var quoteQueue = cqCreate(8);  // order ids waiting for a quotation (FIFO)
var rushLane = heapCreate();   // paid rush orders, earliest due date first
var standardLane = cqCreate(8);// paid standard orders, first paid first made
var completedStack = stackCreate(); // completions, newest on top, for undo
var categoryTree = null;       // n-ary tree of the order sheet's categories
var areaIndex = null;          // hash table: city name -> delivery area
var referenceIndex = null;     // hash table: flower|arrangement|colour -> photo
var counters = { order: 201, receipt: 1, mail: 1, log: 1 };
var outbox = [];               // every email the shop has written, oldest first
var auditLog = [];             // security and audit events, oldest first (append-only)
var failedSignIns = hashCreate(17); // hash table: email typed -> wrong passwords, pause
var codeSends = hashCreate(17);    // hash table: email -> codes emailed this hour
var staffAccounts = [];        // the order desk's credentials, ascending by id (accounts.js)
var staffEmailIndex = hashCreate(17); // hash table: account email -> account id
var mailQueue = cqCreate(8);   // outbox positions waiting to be sent (FIFO)
var mailEnabled = false;       // off while the demo history is replayed

/* Build every structure from the seed data.  Time O(n²) · Space O(n) */
function storeInit() {
    products = [];
    for (var i = 0; i < PRODUCT_SEED.length; i++) listAdd(products, productFromSeed(PRODUCT_SEED[i]));
    orders = [];
    receipts = [];
    basket = llCreate();
    quoteQueue = cqCreate(8);
    rushLane = heapCreate();
    standardLane = cqCreate(8);
    completedStack = stackCreate();
    counters = { order: 201, receipt: 1, mail: 1, log: 1 };
    outbox = [];
    auditLog = [];
    failedSignIns = hashCreate(17);
    codeSends = hashCreate(17);
    buildAccounts();
    mailQueue = cqCreate(8);
    mailEnabled = false;
    categoryTree = treeFromOutline('All gifts', CATEGORY_OUTLINE);
    areaIndex = buildAreaIndex();
    referenceIndex = buildReferenceIndex();
}

/* =========================================================================
   LOOK-UPS OVER THE REFERENCE DATA — linear scans of short arrays
   ========================================================================= */

/*                                        Time O(n)  · Space O(1) */
function byId(list, id) {
    return firstWhere(list, function (record) { return record.id === id; });
}

/* One-line look-ups over the reference arrays, each a linear scan.
                                          Time O(n)  · Space O(1) */
function colorById(id) { return byId(COLORS, id); }
function arrangementById(id) { return byId(ARRANGEMENTS, id); }
function quoteTypeById(id) { return byId(QUOTE_TYPES, id); }
function addonById(id) { return byId(ADDONS, id); }
function paymentById(id) { return byId(PAYMENT_METHODS, id); }
function courierById(id) { return byId(COURIERS, id); }
function modeById(id) { return byId(FULFILMENT_MODES, id); }

/* =========================================================================
   PRODUCTS
   ========================================================================= */

/* A working copy of a seed record, with full image paths.
                                          Time O(n) · Space O(n) */
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

/* Linear search: ten products, so a scan is the honest choice.
                                          Time O(n)  · Space O(1) */
function productById(id) {
    return byId(products, Number(id));
}

/* Only what a customer may order.        Time O(n)  · Space O(n) */
function activeProducts() {
    return keepWhere(products, function (p) { return p.active; });
}

/* The branch a product's line sits under.  Time O(n) tree walk · Space O(n) */
function productBranch(product) {
    var at = treeFind(categoryTree, product.line);
    var node = treeNode(categoryTree, at);
    return node ? treeNode(categoryTree, node.parent) : null;
}

/* Price-list price for one bouquet of `count` flowers, or 0.
                                          Time O(n) · Space O(1) */
function priceForCount(product, count) {
    var row = firstWhere(product.priceTable, function (r) { return r.count === count; });
    return row ? row.price : 0;
}

/* The counts an arrangement offers that also have a price.
                                          Time O(n²) · Space O(n) */
function countsFor(product, arrangementId) {
    var arrangement = arrangementById(arrangementId);
    if (!arrangement) return [];
    return keepWhere(arrangement.counts, function (count) { return priceForCount(product, count) > 0; });
}

/* Every flower count the chosen arrangements offer, smallest first and
   without repeats: gather every count, insertion sort them, then keep
   each value once.                       Time O(n²) · Space O(n) */
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

/* Does one of the product's arrangements make bouquets of `count`
   flowers? The arrangements and their counts are the short fixed lists
   of data.js (two arrangements, a handful of counts each), so this is
   constant work.                         Time O(1) — fixed lists · Space O(1) */
function offersCount(product, count) {
    for (var a = 0; a < product.arrangements.length; a++) {
        var arrangement = arrangementById(product.arrangements[a]);
        if (arrangement && isIn(arrangement.counts, count)) return true;
    }
    return false;
}

/* The cheapest build a flower bouquet's price list offers: the lowest
   price whose flower count one of its arrangements makes. Worked out when
   the product is loaded or edited and kept as product.startsAt, so every
   card and the price sort read it in O(1).
                                          Time O(n) — one pass over the price rows · Space O(1) */
function lowestOffer(product) {
    var lowest = 0;
    for (var r = 0; r < product.priceTable.length; r++) {
        var row = product.priceTable[r];
        if (row.price > 0 && offersCount(product, row.count) && (lowest === 0 || row.price < lowest)) lowest = row.price;
    }
    return lowest;
}

/* The "Starts at" figure. 0 means the product has no starting price and
   is shown as Customized Pricing.        Time O(1)  · Space O(1) */
function productStartsAt(product) {
    if (product.kind === 'fixed') return product.price;
    return product.startsAt > 0 ? product.startsAt : 0;
}

/* "Starts at ₱55", "₱650" or "Customized Pricing".  Time O(n) for the digits · Space O(n) */
function priceLabel(product) {
    if (product.kind === 'fixed') return pesoWhole(product.price);
    var from = productStartsAt(product);
    return from > 0 ? 'Starts at ' + pesoWhole(from) : 'Customized Pricing';
}

/* The credit for a sample photo from the web (PHOTO_CREDITS), or null for
   the shop's own photographs.            Time O(n) · Space O(n) */
function photoCredit(src) {
    return firstWhere(PHOTO_CREDITS, function (c) { return IMG_PRODUCTS + c.file === src; });
}

/*                                        Time O(1)  · Space O(1) */
function productCover(product) {
    if (product.gallery.length > 0) return product.gallery[0];
    if (product.kind === 'flower') {
        var ref = referenceImage(product.flower, product.arrangements[0], product.colors[0]);
        if (ref) return ref.src;
    }
    return '';
}

/* =========================================================================
   COLOUR REFERENCES — hash table keyed "flower|arrangement|colour"
   ========================================================================= */

/*                                        Time O(1)  · Space O(1) */
function referenceKey(flower, arrangement, color) {
    return flower + '|' + arrangement + '|' + color;
}

/* Index every combination: generated previews first, then the real
   photographs written over the entries they exist for.
                                          Time O(n) — one hashPut per flower × arrangement × colour (n = 160) and per photo · Space O(n) */
function buildReferenceIndex() {
    // 160 keys over 199 buckets: a load factor near 0.8 keeps chains short.
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

/* The photograph for one choice: { src, real } or null.
                                          Time O(1) average · Space O(1) */
function referenceImage(flower, arrangement, color) {
    return hashGet(referenceIndex, referenceKey(flower, arrangement, color));
}

/* =========================================================================
   ADD-ONS — totalled recursively
   ========================================================================= */

/* Glitter is priced by the band the flower count falls in. Time O(n) · Space O(1) */
function glitterPrice(flowerCount) {
    var tier = firstWhere(GLITTER_TIERS, function (t) { return flowerCount <= t.upTo; });
    return tier ? tier.price : GLITTER_TIERS[GLITTER_TIERS.length - 1].price;
}

/*                                        Time O(n) · Space O(1) */
function addonPrice(addonId, flowerCount) {
    var addon = addonById(addonId);
    if (!addon) return 0;
    return addon.id === 'glitter' ? glitterPrice(flowerCount || 1) : addon.price;
}

/* Add-ons for one bouquet.               Time O(n)  · Space O(n) call stack */
function addonsTotal(addonIds, flowerCount) {
    return sumRecursive(addonIds, function (id) { return addonPrice(id, flowerCount); });
}

/* =========================================================================
   REQUEST ITEMS — what goes into the basket
   ========================================================================= */

var MAX_QUANTITY = 20;
var MAX_NOTE = 500;

/*                                        Time O(1)  · Space O(1) */
function isWholeIn(value, low, high) {
    return typeof value === 'number' && value === Math.floor(value) && value >= low && value <= high;
}

/* Validate a flower choice and build its item.  Time O(n²) · Space O(n)
   choice: { arrangement, count, color, quantity, addons, cardFlower, notes, reference } */
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

/* Validate a gift choice and build its item. Quote products (money,
   makeup, sweets, diaper, beer) are priced later by the owner; a
   fixed-price product (the picture bouquet) is priced here.
                                          Time O(n) · Space O(n)
   choice: { size, count, detail, provided, quantity, addons, cardFlower, notes, reference } */
function makeQuoteItem(product, choice) {
    if (!product || !product.active || (product.kind !== 'quote' && product.kind !== 'fixed')) {
        return { ok: false, error: 'This item is not available.' };
    }
    var type = quoteTypeById(product.quoteType);
    if (!isIn(product.sizes, choice.size)) return { ok: false, error: 'Choose a size.' };
    if (!isWholeIn(choice.count, 1, 500)) return { ok: false, error: type.countLabel + ' must be a whole number from 1 to 500.' };
    if (!isWholeIn(choice.quantity, 1, MAX_QUANTITY)) return { ok: false, error: 'Quantity must be 1 to ' + MAX_QUANTITY + '.' };
    if (String(choice.detail || '').length > 160) return { ok: false, error: 'Keep the details under 160 characters.' };
    if (String(choice.notes || '').length > MAX_NOTE) return { ok: false, error: 'Notes are limited to ' + MAX_NOTE + ' characters.' };

    var addons = keepWhere(choice.addons || [], function (id) {
        var addon = addonById(id);
        return addon !== null && !addon.flowersOnly;
    });
    var unit = (product.kind === 'fixed' ? product.price : 0) + addonsTotal(addons, 0);
    return { ok: true, item: {
        productId: product.id, productName: product.name, kind: product.kind, quoteType: product.quoteType,
        arrangement: '', count: choice.count, color: '',
        size: choice.size, detail: strip(choice.detail),
        provided: type.provided ? choice.provided === true : false,
        quantity: choice.quantity, addons: addons,
        cardFlower: isIn(addons, 'card') ? (choice.cardFlower || CARD_FLOWERS[0]) : '',
        notes: strip(choice.notes), reference: choice.reference || null,
        unitEstimate: unit, estimate: unit * choice.quantity,
        materials: 0, labor: 0, itemExpense: 0
    } };
}

/* Short specification chips for one item.  Time O(n) · Space O(n) */
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

/* "Number of makeup products" -> "makeup products". Time O(n) · Space O(n) */
function textAfterNumberOf(label) {
    var prefix = 'Number of ';
    return beginsWith(label, prefix) ? textPart(label, prefix.length) : label;
}

/* The quoted amount for one line: materials + labour + item cost.
                                          Time O(1)  · Space O(1) */
function lineTotal(item) {
    return roundMoney((Number(item.materials) || 0) + (Number(item.labor) || 0) + (Number(item.itemExpense) || 0));
}

/* =========================================================================
   REQUEST BASKET — singly linked list
   ========================================================================= */

/*                                        Time O(1)  · Space O(1) */
function basketAdd(item) {
    return llAppend(basket, item);
}

/*                                        Time O(n)  · Space O(1) */
function basketRemove(index) {
    return llRemove(basket, index);
}

/* Change one line's quantity; its estimate follows.  Time O(1) · Space O(1) */
function basketSetQuantity(index, quantity) {
    var item = llGet(basket, index);
    if (!item || !isWholeIn(quantity, 1, MAX_QUANTITY)) return false;
    return llUpdate(basket, index, copyRecord(item, { quantity: quantity, estimate: item.unitEstimate * quantity }));
}

/*                                        Time O(n)  · Space O(n) */
function basketEntries() { return llEntries(basket); }
function basketItems() { return llValues(basket); }

/* The cart at today's prices: if the owner changed the price list after
   something was added, checkout charges the current price.
                                          Time O(n²) · Space O(n) */
function repricedCart() {
    var items = basketItems(), out = [];
    for (var i = 0; i < items.length; i++) {
        var product = productById(items[i].productId), item = items[i];
        if (product && product.kind !== 'quote') {
            var unit = (product.kind === 'fixed' ? product.price : priceForCount(product, item.count)) +
                       addonsTotal(item.addons, product.kind === 'flower' ? item.count : 0);
            item = copyRecord(item, { unitEstimate: unit, estimate: unit * item.quantity });
        }
        listAdd(out, item);
    }
    return out;
}

/* Total pieces across every line.        Time O(n)  · Space O(n) */
function basketCount() {
    return sumRecursive(basketItems(), function (item) { return item.quantity; });
}

/* Sum of the price-list estimates.       Time O(n)  · Space O(n) */
function basketEstimate() {
    return sumRecursive(basketItems(), function (item) { return item.estimate; });
}

/* Does any line still need the owner to price it?  Time O(n) · Space O(n) */
function basketHasQuoteItems() {
    return countWhere(basketItems(), function (item) { return item.kind === 'quote'; }) > 0;
}

/* =========================================================================
   DELIVERY — hash table of areas, then the courier's rate table
   ========================================================================= */

/* Every city and alias, normalised, to its area.  Time O(n) · Space O(n) */
function buildAreaIndex() {
    var table = hashCreate(53);
    for (var i = 0; i < DELIVERY_AREAS.length; i++) {
        var area = DELIVERY_AREAS[i];
        hashPut(table, normaliseKey(area.city), area);
        for (var k = 0; k < area.aliases.length; k++) hashPut(table, normaliseKey(area.aliases[k]), area);
    }
    return table;
}

/* "  quezon   city " finds Quezon City.  Time O(1) average + O(n) to tidy the text · Space O(n) */
function lookupArea(city) {
    if (isBlank(city)) return null;
    var found = hashGet(areaIndex, normaliseKey(city));
    if (found) return found;
    // "Marilao, Bulacan" — try the part before the first comma.
    var head = cutText(city, ',')[0];
    return hashGet(areaIndex, normaliseKey(head));
}

/*                                        Time O(n) · Space O(1) */
function courierRate(courierId, region) {
    var courier = courierById(courierId);
    if (!courier) return 0;
    var row = firstWhere(courier.rates, function (r) { return r.region === region; });
    return row ? row.fee : 0;
}

/* "Brgy. Lawa", "Barangay Lawa" and "lawa" are the same place.
                                          Time O(n) · Space O(n) */
function barangayKey(text) {
    var key = normaliseKey(text);
    var prefixes = ['barangay ', 'brgy ', 'bgy ', 'brg '];
    for (var i = 0; i < prefixes.length; i++) {
        if (beginsWith(key, prefixes[i])) return strip(textPart(key, prefixes[i].length));
    }
    return key;
}

/* Work out the delivery fee for an address.  Time O(n) · Space O(1)
   status: final    the shop's own fee, nothing to confirm
           estimate a courier planning rate, the owner confirms it
           manual   no rate known, the owner enters it              */
function deliveryQuote(f) {
    if (!f || f.mode !== 'delivery') {
        return { service: 'pickup', fee: 0, status: 'final', label: 'Pickup at the shop', area: '', courier: '' };
    }
    var area = lookupArea(f.city);
    if (area && area.service === 'inhouse') {
        var free = isIn(area.freeBarangays || [], barangayKey(f.barangay));
        return {
            service: 'inhouse', fee: free ? 0 : area.fee, status: 'final', area: area.city, courier: '',
            label: free ? 'Free delivery within Brgy. Lawa' : 'Shop delivery to ' + area.city
        };
    }
    var courier = courierById(f.courier);
    var courierName = courier ? courier.name : 'Courier';
    if (area && courier) {
        var rate = courierRate(courier.id, area.region);
        if (rate > 0) {
            return { service: 'courier', fee: rate, status: 'estimate', area: area.city, courier: courier.id,
                     label: courierName + ' to ' + area.city + ' (estimate)' };
        }
    }
    return { service: 'courier', fee: 0, status: 'manual', area: area ? area.city : strip(f.city),
             courier: courier ? courier.id : '',
             label: courierName + ' — fee set by the shop' };
}

/* Does an address need a courier?        Time O(n) · Space O(n) */
function needsCourier(city) {
    var area = lookupArea(city);
    return !area || area.service === 'courier';
}

/* =========================================================================
   DATES AND SLOTS
   ========================================================================= */

/*                                        Time O(n) · Space O(1) */
function isInhouseDay(iso) {
    return isIn(INHOUSE_DAYS, weekdayOf(iso));
}

/* The longest lead time among the items. Time O(n²) · Space O(1) */
function longestLead(items) {
    var most = 1;
    for (var i = 0; i < items.length; i++) {
        var product = productById(items[i].productId);
        if (product && product.leadDays > most) most = product.leadDays;
    }
    return most;
}

/* What a date and time really mean: the shop's best estimate, which the
   weather and the road can still move.   Time O(1)  · Space O(1) */
function scheduleNote(mode) {
    return mode === 'delivery' ? SCHEDULE_NOTE_DELIVERY : SCHEDULE_NOTE_PICKUP;
}

/* First date the shop can have it ready.  Time O(n²) · Space O(1) */
function earliestDate(items, rush, fromIso) {
    return addDays(fromIso || todayIso(), rush ? 1 : longestLead(items));
}

/* Deliveries already booked into a slot. Time O(n)  · Space O(1) */
function slotLoad(date, slot, ignoreId) {
    return countWhere(orders, function (o) {
        return o.status !== 'voided' && o.id !== ignoreId && o.fulfilment.mode === 'delivery' &&
               o.fulfilment.date === date && o.fulfilment.slot === slot;
    });
}

/* Pickups already booked on a date — pickups have a date, not a time.
                                          Time O(n)  · Space O(1) */
function pickupLoad(date, ignoreId) {
    return countWhere(orders, function (o) {
        return o.status !== 'voided' && o.id !== ignoreId && o.fulfilment.mode === 'pickup' && o.fulfilment.date === date;
    });
}

/* Pickup places left on a date.          Time O(n)  · Space O(1) */
function pickupPlacesLeft(date, ignoreId) {
    var left = PICKUP_DAY_CAPACITY - pickupLoad(date, ignoreId);
    return left < 0 ? 0 : left;
}

/* Every slot on a date with the places left.  Time O(n²) · Space O(n) */
function slotsFor(date, ignoreId) {
    var out = [];
    for (var i = 0; i < TIME_SLOTS.length; i++) {
        var left = SLOT_CAPACITY - slotLoad(date, TIME_SLOTS[i], ignoreId);
        listAdd(out, { slot: TIME_SLOTS[i], left: left < 0 ? 0 : left });
    }
    return out;
}

/* =========================================================================
   SALES — counted from real orders, never typed in

   An order counts once it is paid for (in production or completed).
   Requests that were never accepted, and voided orders, do not.
   ========================================================================= */

/*                                        Time O(1)  · Space O(1) */
function countsAsSale(order) {
    return order.status === 'paid' || order.status === 'completed';
}

/* Orders and units per product, optionally only for orders a test
   accepts (a date range). One row per product, in catalogue order; a
   hash table keyed by product id finds a line's row in O(1) average, so
   every order is read once instead of once per product.
                                          Time O(n²) — each line of each order · Space O(n) */
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
            // Count the order once, however many of its lines are this product.
            if (hit.lastOrder !== o) { hit.orders++; hit.lastOrder = o; }
        }
    }
    return out;
}

/* Units sold for one product.            Time O(n²) · Space O(1) */
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

/* The rank key: total units sold first, then the number of orders to
   break a tie. Buying more of a product counts every piece, so a large
   order moves it up the ranking at once.  Time O(1) · Space O(1) */
function salesRank(row) {
    return row.units * 100000 + row.orders;
}

/* The k best-selling products by units sold, ranked by selection sort.
   Disabled products and products nobody has bought are left out.
                                          Time O(n²) · Space O(n) */
function bestSellers(k) {
    return topSellers(salesTally(), k);
}

/* Rank any tally — the whole history, or one day, month or year.
                                          Time O(n²) · Space O(n) */
function topSellers(tally, k) {
    var ranked = selectionSortDesc(tally, salesRank);
    var out = [];
    for (var i = 0; i < ranked.length && out.length < k; i++) {
        if (ranked[i].units > 0 && ranked[i].product.active) listAdd(out, ranked[i]);
    }
    return out;
}

/*                                        Time O(n²) · Space O(n) */
function isBestSeller(productId) {
    var top = bestSellers(3);
    return firstWhere(top, function (row) { return row.product.id === productId; }) !== null;
}
