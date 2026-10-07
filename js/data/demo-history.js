/* =========================================================================
   DATA · DEMO HISTORY
   Anim na linggong demo orders na pinapatakbo sa totoong lifecycle pag
   nagsimula ang page, kaya totoo ang resibo, queues at best sellers.
   Pekeng tao lahat at nasa example.com ang email, kaya walang nae-email.
   ========================================================================= */

// Isang flower line para sa demo.
// Time O(1) · Space O(1)
function seedFlower(productId, arrangement, count, color, quantity, addons, cardFlower) {
    return { productId: productId, choice: { arrangement: arrangement, count: count, color: color,
             quantity: quantity, addons: addons || [], cardFlower: cardFlower || '', notes: '' } };
}

// Isang quotation line para sa demo.
// Time O(1) · Space O(1)
function seedQuoteItem(productId, size, count, detail, provided, quantity, addons) {
    return { productId: productId, choice: { size: size, count: count, detail: detail, provided: provided,
             quantity: quantity, addons: addons || [], cardFlower: '', notes: '' } };
}

var SEED_PICKUP = { mode: 'pickup' };

var SEED_ORDERS = [
    { who: ['Andrea Santos', '0917 555 0142', 'andrea.santos'], at: [40, 9],
      items: [seedFlower(101, 'round', 12, 'red', 1, ['card'], 'Rose')], where: SEED_PICKUP,
      quote: { at: [40, 15] }, pay: { at: [39, 10], method: 'gcash-100' }, complete: [36, 14] },

    { who: ['Miguel Reyes', '0918 555 0231', ''], at: [38, 11],
      items: [seedQuoteItem(201, 'Medium', 20, '5000', true, 1)],
      where: { mode: 'delivery', address: '14 Sampaguita St.', barangay: 'Saog', city: 'Marilao' },
      quote: { at: [38, 16], lines: [[250, 300, 0]] }, pay: { at: [37, 9], method: 'gcash-50' },
      balance: [34, 10], complete: [34, 15] },

    { who: ['Bea Cruz', '0927 555 0388', 'beacruz'], at: [35, 10],
      items: [seedFlower(102, 'layered', 7, 'baby-pink', 1, ['lights'])],
      where: { mode: 'delivery', address: '3 Mabini St.', barangay: 'Lawa', city: 'Meycauayan' },
      quote: { at: [35, 14] }, pay: { at: [34, 9], method: 'gcash-100' }, complete: [32, 11] },

    { who: ['Paolo Garcia', '0915 555 0477', ''], at: [33, 13],
      items: [seedQuoteItem(301, '2 tiers', 40, 'EQ Dry, size M', true, 1)], where: SEED_PICKUP,
      quote: { at: [33, 17], lines: [[350, 400, 0]] }, pay: { at: [32, 16], method: 'gcash-50' },
      balance: [29, 10], complete: [29, 15] },

    { who: ['Jessa Mendoza', '0906 555 0512', 'jessa.m'], at: [30, 9],
      items: [seedFlower(101, 'layered', 5, 'peach', 2, [])],
      where: { mode: 'delivery', address: '88 Kalayaan Ave.', barangay: 'Pinyahan', city: 'Quezon City', courier: 'lalamove' },
      quote: { at: [30, 13], deliveryFee: 240 }, pay: { at: [29, 9], method: 'gcash-100' }, complete: [27, 14] },

    { who: ['Carlo Villanueva', '0919 555 0623', ''], at: [28, 10],
      items: [seedQuoteItem(302, '2 tiers', 24, 'San Miguel Pale Pilsen', true, 1)], where: SEED_PICKUP,
      quote: { at: [28, 15], lines: [[300, 450, 0]] }, pay: { at: [27, 9], method: 'gcash-100' }, complete: [25, 16] },

    { who: ['Nicole Tan', '0917 555 0734', 'nicoletan'], at: [26, 8], rush: true,
      items: [seedFlower(101, 'round', 18, 'wine-red', 1, ['glitter', 'lights'])], where: SEED_PICKUP,
      quote: { at: [26, 10] }, pay: { at: [26, 12], method: 'gcash-100' }, complete: [25, 10] },

    { who: ['Rina Aquino', '0928 555 0845', 'rina.aquino'], at: [24, 14],
      items: [seedQuoteItem(202, 'Medium', 6, 'Lip tints in nude shades', false, 1)], where: SEED_PICKUP,
      quote: { at: [24, 18], lines: [[300, 350, 1450]] }, pay: { at: [23, 9], method: 'gcash-50' },
      balance: [20, 10], complete: [20, 15] },

    { who: ['Joshua Ramos', '0916 555 0956', ''], at: [22, 9],
      items: [seedQuoteItem(201, 'Large', 30, '10000', true, 1, ['card'])],
      where: { mode: 'delivery', address: '21 Gen. T. de Leon', barangay: 'Gen. T. de Leon', city: 'Valenzuela' },
      quote: { at: [22, 13], lines: [[370, 450, 0]] }, pay: { at: [21, 10], method: 'gcash-100' }, complete: [19, 14] },

    { who: ['Kim Bautista', '0995 555 1067', 'kimb'], at: [20, 11],
      items: [seedQuoteItem(204, 'Medium', 15, 'Ferrero, KitKat and Piattos', false, 1)], where: SEED_PICKUP,
      quote: { at: [19, 10], lines: [[220, 280, 950]] },
      voided: { at: [18, 16], by: 'customer', reason: 'Found another gift' } },

    { who: ['Lea Navarro', '0917 555 1178', ''], at: [18, 9],
      items: [seedFlower(103, 'round', 9, 'golden-yellow', 1, [])], where: SEED_PICKUP,
      quote: { at: [18, 14] }, pay: { at: [17, 10], method: 'gcash-50' }, balance: [14, 10], complete: [14, 15] },

    { who: ['Mark Dizon', '0920 555 1289', 'markdizon'], at: [16, 10],
      items: [seedFlower(101, 'round', 25, 'red', 1, ['card', 'lights'], 'Sunflower')],
      where: { mode: 'delivery', address: '5 Rizal St.', barangay: 'Poblacion', city: 'Bocaue' },
      quote: { at: [16, 15] }, pay: { at: [15, 9], method: 'gcash-100' }, complete: [12, 13] },

    { who: ['Trisha Lim', '0917 555 1390', 'trishalim'], at: [14, 13],
      items: [seedQuoteItem(203, 'Standard', 10, '4R prints, graduation theme', false, 1)], where: SEED_PICKUP,
      quote: { at: [14, 17], lines: [[250, 300, 0]] }, pay: { at: [13, 9], method: 'gcash-100' }, complete: [11, 10] },

    { who: ['Ella Fernandez', '0918 555 1401', ''], at: [12, 9],
      items: [seedFlower(104, 'round', 7, 'navy-blue', 1, [])],
      where: { mode: 'delivery', address: '1200 Ayala Ave.', barangay: 'San Lorenzo', city: 'Makati', courier: 'flash' },
      quote: { at: [12, 13] }, pay: { at: [11, 14], method: 'gcash-50' },
      voided: { at: [9, 11], by: 'admin', reason: 'Customer cancelled after production started' } },

    { who: ['Ivan Castillo', '0926 555 1512', 'ivanc'], at: [10, 10],
      items: [seedFlower(102, 'round', 12, 'purple', 1, ['topper'])], where: SEED_PICKUP,
      quote: { at: [10, 14] }, pay: { at: [9, 15], method: 'gcash-100' }, complete: [6, 11] },

    { who: ['Sofia Ramirez', '0917 555 1623', 'sofia.r'], at: [8, 9],
      items: [seedFlower(101, 'layered', 9, 'baby-blue', 1, ['topper'])], where: SEED_PICKUP,
      quote: { at: [8, 13] }, pay: { at: [7, 10], method: 'gcash-100' }, complete: [4, 14] },

    { who: ['Daniel Ong', '0905 555 1734', ''], at: [6, 11],
      items: [seedQuoteItem(201, 'Small', 10, '1000', true, 1)], where: SEED_PICKUP,
      quote: { at: [6, 15], lines: [[180, 220, 0]] }, pay: { at: [5, 10], method: 'gcash-50' } },

    { who: ['Hannah Robles', '0917 555 1845', 'hannahrobles'], at: [3, 9], rush: true,
      items: [seedFlower(101, 'round', 7, 'purple-pink', 1, ['card'], 'Lavender')], where: SEED_PICKUP,
      quote: { at: [3, 12] }, pay: { at: [2, 10], method: 'gcash-100' } },

    { who: ['Gabriel Torres', '0921 555 1956', ''], at: [2, 14],
      items: [seedQuoteItem(301, '3 tiers', 60, 'Huggies, size L', true, 1)],
      where: { mode: 'delivery', address: '7 Luzon St.', barangay: 'Malhacan', city: 'Meycauayan' },
      quote: { at: [1, 10], lines: [[480, 600, 0]] } },

    { who: ['Angela Morales', '0917 555 2067', 'angela.morales'], at: [1, 15],
      items: [seedFlower(101, 'round', 12, 'baby-pink', 1, ['lights']), seedQuoteItem(202, 'Small', 4, 'Lip and cheek tints', true, 1)],
      where: { mode: 'delivery', address: '450 España Blvd.', barangay: 'Sampaloc', city: 'Manila', courier: 'flash' } },

    { who: ['Paula Sison', '0918 555 2178', 'paulasison'], at: [0, 8],
      items: [seedQuoteItem(302, '1 tier', 12, 'Heineken', false, 1)], where: SEED_PICKUP },

    { who: ['Ramon Lopez', '0919 555 2289', ''], at: [0, 9],
      items: [seedFlower(101, 'round', 3, 'red', 1, [])], where: SEED_PICKUP,
      voided: { at: [0, 9.5], by: 'customer', reason: 'Ordered by mistake' } }
];

// daysAgo sa oras ng shop bilang stamp, bilang pabalik mula `base`.
// Time O(1) · Space O(1)
function seedStamp(base, when) {
    return stampOfDayNumber(dayNumberOfStamp(base) - when[0]) + Math.round(when[1] * 3600000);
}

// Pekeng 13-digit GCash reference (laging pareho).
// Time O(1) · Space O(1)
function seedGcashRef(n) {
    return '9' + leftPad(String((n * 104729) % 1000000000000), 12, '0');
}

// Pinakamaagang date (at oras sa delivery) para sa request.
// Time O(n²) · Space O(1)
function seedSchedule(items, rush, fromIso, needsWeekend, pickup) {
    var date = earliestDate(items, rush, fromIso);
    for (var tries = 0; tries < 30; tries++) {
        if (pickup) {
            if (weekdayOf(date) !== 0 && pickupPlacesLeft(date) > 0) return { date: date, slot: '' };
        } else if (!needsWeekend || isInhouseDay(date)) {
            for (var s = 0; s < TIME_SLOTS.length; s++) {
                if (slotLoad(date, TIME_SLOTS[s]) < SLOT_CAPACITY) return { date: date, slot: TIME_SLOTS[s] };
            }
        }
        date = addDays(date, 1);
    }
    return { date: date, slot: TIME_SLOTS[0] };
}

// Pekeng email sa example.com, hindi talaga nakakatanggap.
// Time O(n) · Space O(n)
function seedEmail(name) {
    return swapText(toLower(strip(name)), ' ', '.') + '@example.com';
}

// Nilalagay sa cart yung mga line ng demo order.
// Time O(n) (isang makeFlowerItem / makeQuoteItem bawat line) · Space O(n)
function seedFillBasket(spec) {
    llClear(basket);
    for (var i = 0; i < spec.items.length; i++) {
        var line = spec.items[i], product = productById(line.productId);
        var made = product.kind === 'flower' ? makeFlowerItem(product, line.choice) : makeQuoteItem(product, line.choice);
        if (made.ok) basketAdd(made.item);
    }
}

// Lahat ng event ng demo orders ayon sa pagkakasunod (insertion sort).
// Time O(n²) · Space O(n)
function seedEvents(base) {
    var events = [];
    // Dagdag ng isang event.
    // Time O(1) · Space O(1)
    function add(when, kind, index) {
        listAdd(events, { stamp: seedStamp(base, when), kind: kind, index: index, seq: events.length });
    }
    for (var i = 0; i < SEED_ORDERS.length; i++) {
        var spec = SEED_ORDERS[i];
        add(spec.at, 'request', i);
        if (spec.quote) add(spec.quote.at, 'quote', i);
        if (spec.pay) add(spec.pay.at, 'pay', i);
        if (spec.balance) add(spec.balance, 'balance', i);
        if (spec.complete) add(spec.complete, 'complete', i);
        if (spec.voided) add(spec.voided.at, 'void', i);
    }
    return insertionSort(events, function (a, b) { return a.stamp - b.stamp || a.seq - b.seq; });
}

// Pinapatakbo yung isang event sa totoong lifecycle.
// Time O(n²) · Space O(n)
function seedRun(event, ids) {
    var spec = SEED_ORDERS[event.index], id = ids[event.index];
    if (event.kind === 'request') {
        seedFillBasket(spec);
        var where = spec.where, fromIso = isoFromStamp(event.stamp);
        var weekend = where.mode === 'delivery' && !needsCourier(where.city);
        var when = seedSchedule(basketItems(), spec.rush === true, fromIso, weekend, where.mode === 'pickup');
        var made = submitRequest({
            name: spec.who[0], phone: spec.who[1], handle: spec.who[2], email: seedEmail(spec.who[0]),
            mode: where.mode, date: when.date, slot: when.slot,
            address: where.address || '', barangay: where.barangay || '', city: where.city || '',
            courier: where.courier || '', rush: spec.rush === true, notes: '', consent: true, terms: true
        }, event.stamp);
        ids[event.index] = made.ok ? made.order.id : -1;
        return made.ok;
    }
    if (id === -1 || id === undefined) return false;
    if (event.kind === 'quote') {
        // Yung price-list orders, may presyo na agad pag na-place.
        if (orderById(id).status !== 'requested') return true;
        var draft = quoteDraft(orderById(id));
        var lines = spec.quote.lines || [];
        for (var l = 0; l < lines.length; l++) {
            draft.lines[l] = { materials: lines[l][0], labor: lines[l][1], itemExpense: lines[l][2] };
        }
        if (spec.quote.deliveryFee !== undefined) draft.deliveryFee = spec.quote.deliveryFee;
        return sendQuote(id, draft, event.stamp).ok;
    }
    if (event.kind === 'pay') return acceptQuote(id, spec.pay.method, seedGcashRef(id), event.stamp).ok;
    if (event.kind === 'balance') return payBalance(id, seedGcashRef(id + 500), event.stamp).ok;
    if (event.kind === 'complete') return completeNext(event.stamp).ok;
    if (event.kind === 'void') return voidOrder(id, spec.voided.reason, spec.voided.by, event.stamp).ok;
    return false;
}

// Inuulit ang shop tapos pinapatakbo ang history. Dapat walang
// pumalyang event.
// Time O(n²) bawat demo event · Space O(n)
function seedShop(base) {
    storeInit();
    var events = seedEvents(base || readClock().ms);
    var ids = [], failed = [];
    for (var i = 0; i < events.length; i++) {
        if (!seedRun(events[i], ids)) listAdd(failed, events[i].kind + ' #' + events[i].index);
    }
    llClear(basket);
    // Para sa mali ng desk ngayong session lang yung undo,
    // hindi para ibalik yung ilang linggong history.
    completedStack = stackCreate();
    return failed;
}
