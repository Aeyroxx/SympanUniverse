/* =========================================================================
   MODULE 12 · PAG-EDIT NG ORDER (order desk)
   Pwedeng palitan ng desk ang items, fees, schedule, contact at address.
   Bawat pagbabago naka-log sa revision log bilang "field: luma -> bago".
   ========================================================================= */

// Kopya ng mga pwedeng i-edit sa order.
// Time O(n) · Space O(n)
function orderEditDraft(order) {
    var items = [];
    for (var i = 0; i < order.items.length; i++) listAdd(items, copyRecord(order.items[i], { addons: copyArray(order.items[i].addons) }));
    return {
        items: items,
        name: order.customer.name, phone: order.customer.phone, handle: order.customer.handle,
        email: order.customer.email || '', mode: order.fulfilment.mode, courier: order.fulfilment.courier || '',
        address: order.fulfilment.address, barangay: order.fulfilment.barangay, city: order.fulfilment.city,
        date: order.fulfilment.date, slot: order.fulfilment.slot,
        rush: order.rush, deliveryFee: order.deliveryFee, rushFee: order.rushFee, notes: order.notes
    };
}

// Bagong line para sa product, may default na pili.
// Time O(n²) · Space O(1)
function blankItemFor(product) {
    var base = {
        productId: product.id, productName: product.name, kind: product.kind, quoteType: product.quoteType,
        arrangement: '', count: 1, color: '', size: '', detail: '', provided: false,
        quantity: 1, addons: [], cardFlower: '', notes: '', reference: null,
        unitEstimate: 0, estimate: 0, materials: 0, labor: 0, itemExpense: 0
    };
    if (product.kind === 'flower') {
        var arrangement = product.arrangements[0];
        var counts = countsFor(product, arrangement);
        var count = counts.length > 0 ? counts[0] : 1;
        var price = priceForCount(product, count);
        return copyRecord(base, { arrangement: arrangement, count: count, color: product.colors[0],
                                  unitEstimate: price, estimate: price, materials: price });
    }
    var type = quoteTypeById(product.quoteType);
    return copyRecord(base, { size: product.sizes[0], provided: type.provided !== null });
}

// Magkano ang line ngayon ayon sa price list.
// Time O(n) · Space O(1)
function withEstimate(item, product) {
    var unit = product.kind === 'flower'
        ? priceForCount(product, item.count) + addonsTotal(item.addons, item.count)
        : addonsTotal(item.addons, 0);
    return copyRecord(item, { unitEstimate: unit, estimate: unit * item.quantity });
}

// Chine-check yung isang na-edit na line.
// Time O(n) · Space O(1)
function validateEditedItem(item, position, quoted) {
    var label = 'Item ' + position + ': ';
    var product = productById(item.productId);
    if (!product) return label + 'choose a product.';
    if (!isWholeIn(item.quantity, 1, 99)) return label + 'quantity must be 1 to 99.';
    if (!isWholeIn(item.count, 1, 500)) return label + 'the count must be a whole number from 1 to 500.';
    if (product.kind === 'flower') {
        if (!arrangementById(item.arrangement)) return label + 'choose an arrangement.';
        if (!colorById(item.color)) return label + 'choose a colour.';
    } else if (isBlank(item.size)) {
        return label + 'enter a size.';
    }
    if (!isMoney(item.materials) || !isMoney(item.labor) || !isMoney(item.itemExpense)) {
        return label + 'amounts must be zero or more.';
    }
    // Pag na-quote na, may pangako na ng presyo, hindi pwedeng maging zero.
    if (quoted && lineTotal(item) <= 0) return label + 'enter the materials and labour.';
    if (String(item.notes || '').length > MAX_NOTE) return label + 'notes are too long.';
    return '';
}

// Ginagawa yung na-edit na line: tamang add-ons at bagong estimate.
// Time O(n) · Space O(n)
function editedItem(draftItem, previous) {
    var product = productById(draftItem.productId);
    var addons = keepWhere(draftItem.addons || [], function (id) {
        var addon = addonById(id);
        return addon !== null && (product.kind === 'flower' || !addon.flowersOnly);
    });
    var type = quoteTypeById(product.quoteType);
    var sameProduct = previous !== null && previous.productId === product.id;
    return withEstimate(copyRecord(draftItem, {
        productName: sameProduct ? previous.productName : product.name,
        kind: product.kind, quoteType: product.quoteType, addons: addons,
        cardFlower: isIn(addons, 'card') ? (draftItem.cardFlower || CARD_FLOWERS[0]) : '',
        provided: type.provided !== null ? draftItem.provided === true : false,
        materials: roundMoney(draftItem.materials), labor: roundMoney(draftItem.labor),
        itemExpense: roundMoney(draftItem.itemExpense), notes: strip(draftItem.notes)
    }), product);
}

// Isang line sa salita, para sa revision log.
// Time O(1) · Space O(1)
function describeItem(item) {
    return item.productName + ' × ' + item.quantity + ' (' + glue(itemSpecs(item), ', ') + ')';
}

// Pinagkukumpara yung luma at bagong mga line.
// Time O(n²) · Space O(n)
function itemChanges(before, after) {
    var out = [];
    var longest = before.length > after.length ? before.length : after.length;
    for (var i = 0; i < longest; i++) {
        var was = i < before.length ? before[i] : null;
        var now = i < after.length ? after[i] : null;
        var label = 'Item ' + (i + 1);
        if (!was) { listAdd(out, 'Added ' + describeItem(now)); continue; }
        if (!now) { listAdd(out, 'Removed ' + describeItem(was)); continue; }
        if (was.productId !== now.productId) listAdd(out, label + ' product: ' + was.productName + ' → ' + now.productName);
        var specsWas = glue(itemSpecs(was), ', '), specsNow = glue(itemSpecs(now), ', ');
        if (specsWas !== specsNow) listAdd(out, label + ' specs: ' + specsWas + ' → ' + specsNow);
        if (was.quantity !== now.quantity) listAdd(out, label + ' quantity: ' + was.quantity + ' → ' + now.quantity);
        if (was.notes !== now.notes) listAdd(out, label + ' notes changed');
        if (was.materials !== now.materials) listAdd(out, label + ' materials: ' + peso(was.materials) + ' → ' + peso(now.materials));
        if (was.labor !== now.labor) listAdd(out, label + ' labour: ' + peso(was.labor) + ' → ' + peso(now.labor));
        if (was.itemExpense !== now.itemExpense) listAdd(out, label + ' item cost: ' + peso(was.itemExpense) + ' → ' + peso(now.itemExpense));
    }
    return out;
}

// Tinatala yung field kung nagbago.
// Time O(1) · Space O(1)
function noteChange(list, label, was, now, show) {
    if (was === now) return;
    var format = show || function (v) { return v === '' ? '—' : String(v); };
    listAdd(list, label + ': ' + format(was) + ' → ' + format(now));
}

// "Pickup" o "Delivery", para sa log.
// Time O(n) · Space O(1)
function modeName(id) { var m = modeById(id); return m ? m.name : id; }

// Pangalan ng courier, para sa log.
// Time O(n) · Space O(1)
function courierName(id) { var c = courierById(id); return c ? c.name : (id || '—'); }

// Na-edit na pickup o delivery kasama ang fees, o kung bakit hindi
// pwede. Bagong address = bagong fee maliban kung tinype ng desk.
// Time O(n) · Space O(1)
function editedFulfilment(order, draft, quoted) {
    var delivering = draft.mode === 'delivery';
    if (!modeById(draft.mode)) return { error: 'Choose pickup or delivery.' };
    if (!dateFromIso(draft.date)) return { error: 'Choose a valid date.' };
    if (!isMoney(draft.deliveryFee) || !isMoney(draft.rushFee)) return { error: 'Fees must be zero or more.' };
    if (delivering && (isBlank(draft.address) || isBlank(draft.city))) return { error: 'A delivery needs an address and a city.' };
    if (delivering && needsCourier(draft.city) && !courierById(draft.courier)) return { error: 'Choose a courier for this address.' };
    // May time slot ang delivery; date lang ang pickup.
    var slot = delivering ? draft.slot : '';
    if (delivering && !isIn(TIME_SLOTS, slot)) return { error: 'Choose a delivery time.' };
    var moved = draft.date !== order.fulfilment.date || slot !== order.fulfilment.slot || draft.mode !== order.fulfilment.mode;
    if (moved && delivering && slotLoad(draft.date, slot, order.id) >= SLOT_CAPACITY) return { error: 'That time is fully booked. Choose another.' };
    if (moved && !delivering && pickupPlacesLeft(draft.date, order.id) === 0) return { error: 'Pickups are fully booked on that date.' };

    var fulfilment = copyRecord(order.fulfilment, {
        mode: draft.mode, date: draft.date, slot: slot,
        address: delivering ? strip(draft.address) : '', barangay: delivering ? strip(draft.barangay) : '',
        city: delivering ? strip(draft.city) : '',
        courier: delivering && needsCourier(draft.city) ? draft.courier : ''
    });
    var where = fulfilment.mode !== order.fulfilment.mode || fulfilment.city !== order.fulfilment.city ||
                fulfilment.barangay !== order.fulfilment.barangay || fulfilment.courier !== order.fulfilment.courier;
    var delivery = where ? deliveryQuote(fulfilment) : order.delivery;
    var fee = roundMoney(draft.deliveryFee);
    if (where && fee === order.deliveryFee) fee = delivery.fee;
    if (quoted && delivery.service === 'courier' && fee <= 0) return { error: 'Enter the courier fee for this address.' };
    var rushFee = roundMoney(draft.rushFee);
    if (draft.rush !== order.rush && rushFee === order.rushFee) rushFee = draft.rush ? RUSH_FEE : 0;

    var settled = quoted ? settledDelivery({ fulfilment: fulfilment }, delivery, fee)
        : copyRecord(delivery, { fee: fee, label: delivery.status === 'estimate' ? delivery.label : deliveryLabel(delivery, fee, fulfilment) });
    return { error: '', fulfilment: fulfilment, delivery: settled, deliveryFee: fee, rushFee: rushFee };
}

// Ina-apply yung edit ng desk at nilo-log bawat pagbabago.
// Time O(n²) · Space O(n)
function editOrder(id, draft, stamp) {
    var order = orderById(id);
    if (!order) return { ok: false, error: 'No such order.' };
    if (order.status === 'voided') return { ok: false, error: 'Voided orders are kept as they were and cannot be edited.' };
    if (draft.items.length === 0) return { ok: false, error: 'An order needs at least one item.' };
    var quoted = order.status !== 'requested';

    var items = [];
    for (var i = 0; i < draft.items.length; i++) {
        var problem = validateEditedItem(draft.items[i], i + 1, quoted);
        if (problem) return { ok: false, error: problem };
        listAdd(items, editedItem(draft.items[i], i < order.items.length ? order.items[i] : null));
    }
    if (strip(draft.name).length < 2) return { ok: false, error: 'Enter the customer name.' };
    if (!isValidPhone(draft.phone)) return { ok: false, error: 'Enter a valid mobile number.' };
    if (!isValidEmail(draft.email)) return { ok: false, error: 'Enter a valid email address.' };
    var next = editedFulfilment(order, draft, quoted);
    if (next.error) return { ok: false, error: next.error };

    var f = next.fulfilment, rush = draft.rush === true;
    var changes = itemChanges(order.items, items);
    noteChange(changes, 'Customer', order.customer.name, strip(draft.name));
    noteChange(changes, 'Mobile', order.customer.phone, normalisePhone(draft.phone));
    noteChange(changes, 'Facebook / Instagram', order.customer.handle, strip(draft.handle));
    noteChange(changes, 'Email', order.customer.email || '', toLower(strip(draft.email)));
    noteChange(changes, 'Fulfilment', order.fulfilment.mode, f.mode, modeName);
    noteChange(changes, 'Courier', order.fulfilment.courier, f.courier, courierName);
    noteChange(changes, 'Address', order.fulfilment.address, f.address);
    noteChange(changes, 'Barangay', order.fulfilment.barangay, f.barangay);
    noteChange(changes, 'City', order.fulfilment.city, f.city);
    noteChange(changes, 'Date', order.fulfilment.date, f.date, formatDateShort);
    noteChange(changes, 'Time', order.fulfilment.slot, f.slot);
    noteChange(changes, 'Rush', order.rush ? 'yes' : 'no', rush ? 'yes' : 'no');
    noteChange(changes, 'Delivery fee', order.deliveryFee, next.deliveryFee, peso);
    noteChange(changes, 'Rush fee', order.rushFee, next.rushFee, peso);
    noteChange(changes, 'Order notes', order.notes, strip(draft.notes));
    if (changes.length === 0) return { ok: false, error: 'Nothing was changed.' };

    // Lipat ng lane o due date ng rush lang ang gumagalaw sa order
    // sa production. Yung standard, hindi nawawala sa pwesto.
    var inProduction = order.status === 'paid', rushChanged = order.rush !== rush;
    var relane = inProduction && rushChanged;
    var rekey = inProduction && !rushChanged && order.lane === 'rush' && order.fulfilment.date !== f.date;
    if (relane) leaveProduction(order);
    if (rekey) heapRemove(rushLane, order.id);
    var totalBefore = orderTotal(order);

    order.items = items;
    order.customer = { name: strip(draft.name), phone: normalisePhone(draft.phone), handle: strip(draft.handle),
                       email: toLower(strip(draft.email)) };
    order.fulfilment = f;
    order.delivery = next.delivery;
    order.rush = rush;
    order.deliveryFee = next.deliveryFee;
    order.rushFee = next.rushFee;
    order.notes = strip(draft.notes);

    if (relane) enterProduction(order);
    if (rekey) heapInsert(rushLane, order.id, dueKey(order), order.laneSeq);
    if (order.status === 'completed' && rushChanged) {
        // Ibinabalik ng undo sa lane, kaya dapat tama ang lane.
        order.lane = rush ? 'rush' : 'standard';
        order.laneSeq = -1;
    }
    listAdd(order.revisions, { stamp: stamp, changes: changes });
    // Kung may bukas na quotation, ise-send yung bago.
    if (order.status === 'quoted' && orderTotal(order) !== totalBefore) emailQuoteReady(order, stamp);
    addHistory(order, stamp, 'Edited by the order desk (' + changes.length + ' ' + plural(changes.length, 'change') + ')', deskActor(),
               glue(changes, '; '));
    return { ok: true, order: order, changes: changes };
}
