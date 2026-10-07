/* =========================================================================
   MODULE 7 · CHECKOUT AT DELIVERY
   Hash table ng 45 na pangalan ng city (kasama alias) para sa delivery fee,
   O(1) average kahit paano tinype. Lahat ng check ng form ay character
   por character, walang regular expression. Dito rin nagiging order ang cart.
   ========================================================================= */

// ---------- Delivery area at fee ----------

// Lahat ng city at alias (normalised) nilalagay sa hash table.
// Time O(n) · Space O(n)
function buildAreaIndex() {
    var table = hashCreate(53);
    for (var i = 0; i < DELIVERY_AREAS.length; i++) {
        var area = DELIVERY_AREAS[i];
        hashPut(table, normaliseKey(area.city), area);
        for (var k = 0; k < area.aliases.length; k++) hashPut(table, normaliseKey(area.aliases[k]), area);
    }
    return table;
}

// Hanap ng area kahit paano tinype, " quezon city " = Quezon City.
// Time O(1) average + O(n) sa pag-ayos ng text · Space O(n)
function lookupArea(city) {
    if (isBlank(city)) return null;
    var found = hashGet(areaIndex, normaliseKey(city));
    if (found) return found;
    // "Marilao, Bulacan": subukan yung bago ang unang comma.
    var head = cutText(city, ',')[0];
    return hashGet(areaIndex, normaliseKey(head));
}

// Rate ng courier para sa region.
// Time O(n) · Space O(1)
function courierRate(courierId, region) {
    var courier = courierById(courierId);
    if (!courier) return 0;
    var row = firstWhere(courier.rates, function (r) { return r.region === region; });
    return row ? row.fee : 0;
}

// "Brgy. Lawa", "Barangay Lawa" at "lawa" iisa lang.
// Time O(n) · Space O(n)
function barangayKey(text) {
    var key = normaliseKey(text);
    var prefixes = ['barangay ', 'brgy ', 'bgy ', 'brg '];
    for (var i = 0; i < prefixes.length; i++) {
        if (beginsWith(key, prefixes[i])) return strip(textPart(key, prefixes[i].length));
    }
    return key;
}

// Kinukuha yung delivery fee ng address. status:
//  final = sariling fee ng shop, estimate = rate ng courier na
//  kukumpirmahin, manual = walang rate, owner ang maglalagay.
// Time O(n) · Space O(1)
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

// Kailangan ba ng courier yung address?
// Time O(n) · Space O(n)
function needsCourier(city) {
    var area = lookupArea(city);
    return !area || area.service === 'courier';
}

// ---------- Date at slots ----------

// Araw ba ng sariling delivery ng shop (Biyernes hanggang Linggo)?
// Time O(n) · Space O(1)
function isInhouseDay(iso) {
    return isIn(INHOUSE_DAYS, weekdayOf(iso));
}

// Pinakamahabang processing time sa mga item.
// Time O(n²) · Space O(1)
function longestLead(items) {
    var most = 1;
    for (var i = 0; i < items.length; i++) {
        var product = productById(items[i].productId);
        if (product && product.leadDays > most) most = product.leadDays;
    }
    return most;
}

// Paalala na estimate lang yung date at oras (ulan, traffic, etc).
// Time O(1) · Space O(1)
function scheduleNote(mode) {
    return mode === 'delivery' ? SCHEDULE_NOTE_DELIVERY : SCHEDULE_NOTE_PICKUP;
}

// Pinakamaagang date na kaya nang matapos.
// Time O(n²) · Space O(1)
function earliestDate(items, rush, fromIso) {
    return addDays(fromIso || todayIso(), rush ? 1 : longestLead(items));
}

// Ilan na yung naka-book na delivery sa slot.
// Time O(n) · Space O(1)
function slotLoad(date, slot, ignoreId) {
    return countWhere(orders, function (o) {
        return o.status !== 'voided' && o.id !== ignoreId && o.fulfilment.mode === 'delivery' &&
               o.fulfilment.date === date && o.fulfilment.slot === slot;
    });
}

// Ilan na yung pickup sa date (date lang, walang oras).
// Time O(n) · Space O(1)
function pickupLoad(date, ignoreId) {
    return countWhere(orders, function (o) {
        return o.status !== 'voided' && o.id !== ignoreId && o.fulfilment.mode === 'pickup' && o.fulfilment.date === date;
    });
}

// Ilang pickup pa ang pwede sa date.
// Time O(n) · Space O(1)
function pickupPlacesLeft(date, ignoreId) {
    var left = PICKUP_DAY_CAPACITY - pickupLoad(date, ignoreId);
    return left < 0 ? 0 : left;
}

// Lahat ng slot sa date at ilan pa ang bakante.
// Time O(n²) · Space O(n)
function slotsFor(date, ignoreId) {
    var out = [];
    for (var i = 0; i < TIME_SLOTS.length; i++) {
        var left = SLOT_CAPACITY - slotLoad(date, TIME_SLOTS[i], ignoreId);
        listAdd(out, { slot: TIME_SLOTS[i], left: left < 0 ? 0 : left });
    }
    return out;
}

// ---------- Check ng form at paggawa ng order ----------

// 0917..., +63 917... at 63917... iisang number.
// Time O(n) · Space O(n)
function normalisePhone(text) {
    var digits = digitsOnly(text);
    if (digits.length === 12 && beginsWith(digits, '63')) return '0' + textPart(digits, 2);
    return digits;
}

// Tamang mobile number ba?
// Time O(n) · Space O(n)
function isValidPhone(text) {
    var digits = normalisePhone(text);
    return digits.length === 11 && beginsWith(digits, '09');
}

// Chine-check yung form ng checkout. Kasama yung dalawang agreement
// (consent at terms), parehong required. Listahan ng error ang balik.
// Time O(n²) · Space O(n)
function validateRequest(form, items, fromIso, ignoreId) {
    var errors = [];
    // Tala ng isang mali.
    // Time O(1) · Space O(1)
    function fail(field, message) { listAdd(errors, { field: field, message: message }); }

    if (items.length === 0) fail('basket', 'Add at least one item to your cart.');
    for (var i = 0; i < items.length; i++) {
        var product = productById(items[i].productId);
        if (!product || !product.active) fail('basket', items[i].productName + ' is no longer available. Remove it to continue.');
    }
    var name = strip(form.name);
    if (name.length < 2 || name.length > 60) fail('name', 'Enter your name (2 to 60 characters).');
    if (!isValidPhone(form.phone)) fail('phone', 'Enter a mobile number like 0917 123 4567.');
    if (!isValidEmail(form.email)) fail('email', 'Enter an email address like name@gmail.com — your confirmation goes there.');
    if (String(form.handle || '').length > 60) fail('handle', 'Keep the Facebook or Instagram name under 60 characters.');
    if (String(form.notes || '').length > MAX_NOTE) fail('notes', 'Notes are limited to ' + MAX_NOTE + ' characters.');
    if (form.consent !== true) fail('consent', 'Please read the Privacy Notice and tick the box, so the shop may use your details for this order.');
    if (form.terms !== true) fail('terms', 'Please read the order terms and tick the box to agree to them.');

    if (!modeById(form.mode)) fail('mode', 'Choose pickup or delivery.');
    var earliest = earliestDate(items, form.rush === true, fromIso);
    if (!dateFromIso(form.date)) fail('date', 'Choose a date.');
    else if (form.date < earliest) fail('date', 'The earliest the shop can have this ready is ' + formatDateLong(earliest) + '.');

    if (form.mode === 'delivery') {
        if (isBlank(form.address)) fail('address', 'Enter the street and house number.');
        if (isBlank(form.city)) fail('city', 'Enter the city or town.');
        else if (needsCourier(form.city)) {
            if (!courierById(form.courier)) fail('courier', 'Choose a courier for this address.');
        } else if (dateFromIso(form.date) && !isInhouseDay(form.date)) {
            fail('date', 'The shop delivers on ' + INHOUSE_DAY_NAMES + ' only.');
        }
    }

    if (form.mode === 'delivery') {
        if (!isIn(TIME_SLOTS, form.slot)) fail('slot', 'Choose a delivery time.');
        else if (dateFromIso(form.date) && slotLoad(form.date, form.slot, ignoreId) >= SLOT_CAPACITY) {
            fail('slot', 'That time is fully booked. Choose another.');
        }
    } else if (dateFromIso(form.date) && weekdayOf(form.date) === 0) {
        fail('date', 'The shop is closed on Sundays. Choose another pickup date.');
    } else if (dateFromIso(form.date) && pickupPlacesLeft(form.date, ignoreId) === 0) {
        // Date lang ang pickup, walang oras.
        fail('date', 'Pickups are fully booked on ' + formatDateLong(form.date) + '. Choose another date.');
    }
    // Hindi quote request ang cart na may price list, kaya kailangan
    // may rate ang delivery. Quote product lang ang pwedeng magtanong.
    var hasQuoteItem = countWhere(items, function (item) { return item.kind === 'quote'; }) > 0;
    if (form.mode === 'delivery' && !isBlank(form.city) && courierById(form.courier) && !hasQuoteItem &&
        deliveryQuote(form).status === 'manual') {
        fail('city', 'We have no delivery rate for ' + strip(form.city) + ' yet. Choose pickup or one of the listed cities, or message us at ' +
             SHOP_INFO.social + '.');
    }
    return errors;
}

// Mukhang tamang email ba: isang @, may tuldok sa domain, walang space.
// Time O(n) · Space O(n)
function isValidEmail(text) {
    var s = strip(text);
    if (s.length < 6 || s.length > 100) return false;
    var parts = cutText(s, '@');
    if (parts.length !== 2 || parts[0].length === 0) return false;
    var domain = parts[1], dot = -1;
    for (var i = 0; i < s.length; i++) if (isSpace(s.charAt(i))) return false;
    for (var k = 0; k < domain.length; k++) if (domain.charAt(k) === '.') dot = k;
    return dot > 0 && dot < domain.length - 1;
}

// Kailangan ba i-presyo ng owner? Yung quote products lang, o
// kung walang rate yung address.
// Time O(n) · Space O(n)
function needsQuote(items, delivery) {
    var quoted = countWhere(items, function (item) { return item.kind === 'quote'; }) > 0;
    return quoted || delivery.status === 'manual';
}

// Ginagawang order yung cart. Kung price list lahat, may presyo na
// agad. Kung may quote product, pipila sa quotation queue.
// Time O(n²) · Space O(n)
function submitRequest(form, stamp) {
    var items = repricedCart();
    var errors = validateRequest(form, items, isoFromStamp(stamp));
    if (errors.length > 0) return { ok: false, errors: errors };

    var fulfilment = {
        mode: form.mode, date: form.date, slot: form.mode === 'delivery' ? form.slot : '',
        address: form.mode === 'delivery' ? strip(form.address) : '',
        barangay: form.mode === 'delivery' ? strip(form.barangay) : '',
        city: form.mode === 'delivery' ? strip(form.city) : '',
        courier: form.mode === 'delivery' && needsCourier(form.city) ? form.courier : ''
    };
    var delivery = deliveryQuote(fulfilment);
    var id = counters.order;
    counters.order++;
    // Sariling fees muna ng shop, kukumpirmahin o papalitan
    // pag na-quote na.
    var order = {
        id: id, ref: 'SU-' + id, createdAt: stamp,
        customer: { name: strip(form.name), phone: normalisePhone(form.phone), handle: strip(form.handle),
                    email: toLower(strip(form.email)) },
        fulfilment: fulfilment,
        delivery: delivery,
        rush: form.rush === true,
        items: items,
        notes: strip(form.notes),
        status: 'requested',
        quotedAt: 0, quoteNote: '', deliveryFee: delivery.fee, rushFee: form.rush === true ? RUSH_FEE : 0,
        paymentMethod: '', amountPaid: 0, receipts: [],
        lane: '', laneSeq: -1,
        completedAt: 0, voidedAt: 0, voidedBy: '', voidReason: '',
        courierTracking: null,
        // Patunay ng consent: anong notice at kailan pumayag.
        consent: { privacyVersion: PRIVACY_NOTICE_VERSION, termsVersion: ORDER_TERMS_VERSION, terms: true, at: stamp },
        history: [], revisions: []
    };
    listAdd(orders, order);
    llClear(basket);
    addHistory(order, stamp, 'Agreed to the Privacy Notice (version ' + PRIVACY_NOTICE_VERSION + ') and the order terms (version ' +
               ORDER_TERMS_VERSION + ')', 'Customer');
    if (needsQuote(items, delivery)) {
        addHistory(order, stamp, 'Quote request submitted', 'Customer');
        cqEnqueue(quoteQueue, id);
        emailQuoteRequested(order, stamp);
    } else {
        addHistory(order, stamp, 'Order placed', 'Customer');
        autoPrice(order, stamp);
    }
    return { ok: true, order: order };
}

// Pinepresyuhan agad galing sa price list, walang quote na kailangan.
// Time O(n²) · Space O(n)
function autoPrice(order, stamp) {
    var priced = [];
    for (var i = 0; i < order.items.length; i++) {
        listAdd(priced, copyRecord(order.items[i], { materials: order.items[i].estimate, labor: 0, itemExpense: 0 }));
    }
    order.items = priced;
    order.quotedAt = stamp;
    order.quoteNote = 'Priced automatically from the price list.';
    if (order.delivery.service !== 'pickup') order.delivery = settledDelivery(order, order.delivery, order.deliveryFee);
    order.status = 'quoted';
    addHistory(order, stamp, 'Priced automatically: ' + peso(orderTotal(order)), 'System');
}

// Checkout ng cart na may presyo: order at bayad sabay na.
// Walang gagawin kung mali yung bayad.
// Time O(n²) · Space O(n)
function placeOrder(form, methodId, gcashRef, stamp) {
    var items = repricedCart();
    var errors = validateRequest(form, items, isoFromStamp(stamp));
    if (errors.length > 0) return { ok: false, errors: errors };
    var preview = deliveryQuote(form);
    if (needsQuote(items, preview)) return { ok: false, errors: [{ field: 'basket', message: 'This cart needs a quote from the shop first.' }] };
    if (!paymentById(methodId)) return { ok: false, errors: [{ field: 'payment', message: 'Choose 50% down payment or full payment.' }] };
    var problem = gcashProblem(gcashRef);
    if (problem) return { ok: false, errors: [{ field: 'gcash', message: problem }] };

    var made = submitRequest(form, stamp);
    if (!made.ok) return made;
    var paid = acceptQuote(made.order.id, methodId, gcashRef, stamp);
    if (!paid.ok) {
        // Hindi dapat mangyari, pero huwag mag-iwan ng kalahating order.
        voidOrder(made.order.id, 'Payment could not be recorded', 'system', stamp);
        return { ok: false, errors: [{ field: 'gcash', message: paid.error }] };
    }
    return { ok: true, order: made.order, receipt: paid.receipt };
}

// Magkano ang cart ngayon bago i-place.
// Time O(n²) · Space O(n)
function cartTotals(form, items) {
    var delivery = deliveryQuote(form);
    var subtotal = roundMoney(sumRecursive(items, function (item) { return item.estimate; }));
    var rushFee = form.rush === true ? RUSH_FEE : 0;
    return { subtotal: subtotal, deliveryFee: delivery.fee, rushFee: rushFee, delivery: delivery,
             total: roundMoney(subtotal + delivery.fee + rushFee), needsQuote: needsQuote(items, delivery) };
}
