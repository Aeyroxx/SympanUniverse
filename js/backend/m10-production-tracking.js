/* =========================================================================
   MODULE 10 · PRODUCTION AT TRACKING
   Rush orders sa min-heap ayon sa due date, standard sa circular queue
   ayon sa pagbayad. Binary search sa order number para sa Track order.
   Nandito rin ang courier tracking (parcel number at link).
   ========================================================================= */

// ---------- Production lanes ----------

// 2026-10-12 -> 20261012, para mas maliit yung mas maaga.
// Time O(1) · Space O(1)
function dueKey(order) {
    return toNumber(digitsOnly(order.fulfilment.date));
}

// Pasok sa production: rush sa heap, standard sa queue.
// Time O(log n) · Space O(1)
function enterProduction(order) {
    if (order.rush) {
        order.lane = 'rush';
        order.laneSeq = rushLane.nextSeq;
        heapInsert(rushLane, order.id, dueKey(order), order.laneSeq);
    } else {
        order.lane = 'standard';
        cqEnqueue(standardLane, order.id);
    }
}

// Labas sa production lane (pag na-void).
// Time O(n) · Space O(n)
function leaveProduction(order) {
    if (order.lane === 'rush') heapRemove(rushLane, order.id);
    else if (order.lane === 'standard') leaveQueue(standardLane, order.id);
}

// Susunod gagawin: rush muna, tapos standard.
// Time O(log n) · Space O(1)
function nextInProduction() {
    var id = heapPeek(rushLane);
    if (id === null) id = cqFront(standardLane);
    return id === null ? null : orderById(id);
}

// Buong pila ng production ayon sa pagkakasunod ng paggawa.
// Time O(n²) · Space O(n)
function productionLine() {
    var out = [], rush = heapValues(rushLane), standard = cqValues(standardLane), i;
    for (i = 0; i < rush.length; i++) listAdd(out, orderById(rush[i]));
    for (i = 0; i < standard.length; i++) listAdd(out, orderById(standard[i]));
    return out;
}

// Unang order sa pila na bayad na lahat. Yung may utang pa,
// hindi nawawala sa pwesto pero hindi rin nakakaharang.
// Time O(n²) · Space O(n)
function nextReleasable() {
    return firstWhere(productionLine(), function (o) { return orderBalance(o) <= 0; });
}

// Nire-release yung susunod na bayad na order at tinatandaan kung
// saan siya galing para sa undo.
// Time O(n²) · Space O(n)
function completeNext(stamp) {
    var line = productionLine();
    if (line.length === 0) return { ok: false, error: 'Nothing is in production.' };
    var order = nextReleasable();
    if (!order) {
        var owing = renderEach(line, function (o) { return o.ref; }, ', ');
        return { ok: false, error: 'Every order in production still owes a balance (' + owing + '). Record a balance payment first.' };
    }
    var skipped = [];
    for (var i = 0; i < line.length && line[i] !== order; i++) listAdd(skipped, line[i]);
    var position = -1;
    if (order.lane === 'rush') {
        // Rush muna, kaya yung pwedeng i-release na rush ay yung minimum
        // ng heap, maliban kung may nauuna pang may utang.
        if (heapPeek(rushLane) === order.id) heapExtractMin(rushLane);
        else heapRemove(rushLane, order.id);
    } else {
        position = positionIn(cqValues(standardLane), order.id);
        leaveQueue(standardLane, order.id);
    }
    order.status = 'completed';
    order.completedAt = stamp;
    stackPush(completedStack, { id: order.id, position: position });
    addHistory(order, stamp, 'Ready and released', deskActor());
    emailOrderReady(order, stamp);
    return { ok: true, order: order, skipped: skipped };
}

// ---------- Track order ng customer ----------

// Makikita lang ng customer yung order kung tama yung tracking
// number at yung mobile o email na ginamit.
// Time O(log n) + O(n) sa text · Space O(n)
function customerLookup(ref, contact) {
    var order = orderByRef(ref);
    if (!order || isBlank(contact)) return null;
    var byEmail = order.customer.email && toLower(strip(contact)) === order.customer.email;
    var byPhone = digitsOnly(contact).length > 0 && normalisePhone(order.customer.phone) === normalisePhone(contact);
    return byEmail || byPhone ? order : null;
}

// ---------- Courier tracking ----------

// Courier gamit yung id, kasama yung "ibang courier".
// Time O(n) · Space O(1)
function trackingCourier(id) {
    return id === OTHER_COURIER.id ? OTHER_COURIER : courierById(id);
}

// Lahat ng courier na mapipili ng desk.
// Time O(n) · Space O(n)
function trackingCouriers() {
    return withAdded(COURIERS, OTHER_COURIER);
}

// Pwede lang lagyan ng tracking yung courier delivery na naka
// "Mark ready" na. Walang tracking yung sariling delivery ng shop.
// Time O(1) · Space O(1)
function canAttachTracking(order) {
    return !!order && order.fulfilment.mode === 'delivery' && !!order.fulfilment.courier && order.status === 'completed';
}

// Tracking na ipapakita, null kung wala (o void na).
// Time O(1) · Space O(1)
function shownTracking(order) {
    return order && order.courierTracking && canAttachTracking(order) ? order.courierTracking : null;
}

// "P 0123 N5WX P8EA" -> "P0123N5WXP8EA", walang space.
// Time O(n) · Space O(n)
function tidyTrackingNumber(text) {
    var s = String(text === undefined || text === null ? '' : text), out = '';
    for (var i = 0; i < s.length; i++) if (!isSpace(s.charAt(i))) out += s.charAt(i);
    return out;
}

// '' kung mukhang tama ang parcel number, o kung ano ang mali.
// Time O(n) · Space O(1)
function trackingNumberProblem(number) {
    if (number.length < TRACKING_NUMBER_MIN || number.length > TRACKING_NUMBER_MAX) {
        return 'A parcel number is ' + TRACKING_NUMBER_MIN + ' to ' + TRACKING_NUMBER_MAX + ' letters and digits.';
    }
    for (var i = 0; i < number.length; i++) {
        var c = number.charAt(i);
        if (!isLetter(c) && !isDigit(c) && c !== '-') return 'Use only letters, digits and hyphens in the parcel number.';
    }
    return '';
}

// Yung domain mismo ba o parte nito ("share.lalamove.com")?
// Time O(n) · Space O(n)
function hostUnder(host, domain) {
    if (host === domain) return true;
    var tail = '.' + domain;
    return host.length > tail.length && textPart(host, host.length - tail.length) === tail;
}

// Host na nagpapanggap: puro number (IP) o punycode ("xn--").
// Time O(n) · Space O(n)
function isDisguisedHost(host) {
    var digitsOnly = true;
    for (var i = 0; i < host.length; i++) if (!isDigit(host.charAt(i)) && host.charAt(i) !== '.') digitsOnly = false;
    return digitsOnly || beginsWith(host, 'xn--') || textHas(host, '.xn--');
}

// '' kung safe ipakita yung link. https lang, walang space o quote, walang
// "user@". Sa Flash at Lalamove dapat sariling site nila; sa ibang courier,
// bawal lang ang IP address at punycode.
// Time O(n) · Space O(n)
function trackingLinkProblem(link, courierId) {
    var prefix = 'https://';
    if (link.length > TRACKING_LINK_MAX) return 'Keep the tracking link under ' + TRACKING_LINK_MAX + ' characters.';
    if (!beginsWith(link, prefix)) return 'The tracking link must start with https://';
    for (var i = 0; i < link.length; i++) {
        var c = link.charAt(i);
        if (isSpace(c) || c === '"' || c === '\'' || c === '<' || c === '>' || c === '\\' || c === '`') {
            return 'The tracking link cannot contain spaces, quotes or angle brackets.';
        }
    }
    var host = '', dots = 0;
    for (var k = prefix.length; k < link.length; k++) {
        var h = link.charAt(k);
        if (h === '/' || h === '?' || h === '#') break;
        if (!isLetter(h) && !isDigit(h) && h !== '-' && h !== '.') return 'Use the courier\'s own tracking address (only its site name before the first /).';
        if (h === '.') dots++;
        host += h;
    }
    host = toLower(host);
    if (host.length < 4 || dots === 0 || host.charAt(0) === '.' || host.charAt(host.length - 1) === '.') {
        return 'That does not look like a web address.';
    }
    var courier = courierId === OTHER_COURIER.id ? null : courierById(courierId);
    if (courier && courier.hosts) {
        if (!firstWhere(courier.hosts, function (d) { return hostUnder(host, d); })) {
            return 'Use a link on ' + courier.name + '\'s own site (' + glue(courier.hosts, ' or ') + ').';
        }
    } else if (isDisguisedHost(host)) {
        return 'Use the courier\'s own web address, not a number or a disguised name.';
    }
    return '';
}

// Chine-check yung tinype ng desk. { errors, tracking } ang balik.
// Time O(n) · Space O(n)
function checkTracking(draft) {
    var errors = [];
    // Tala ng isang mali.
    // Time O(1) · Space O(1)
    function fail(field, message) { listAdd(errors, { field: field, message: message }); }
    var courier = trackingCourier(draft.courier);
    var number = tidyTrackingNumber(draft.number), link = strip(String(draft.link || ''));
    if (!courier) fail('courier', 'Choose the courier.');
    if (number === '' && link === '') fail('number', 'Enter the parcel number, the tracking link, or both.');
    var numberProblem = number === '' ? '' : trackingNumberProblem(number);
    if (numberProblem) fail('number', numberProblem);
    var linkProblem = link === '' ? '' : trackingLinkProblem(link, courier ? courier.id : OTHER_COURIER.id);
    if (linkProblem) fail('link', linkProblem);
    return { errors: errors, tracking: { courier: courier ? courier.id : '', number: number, link: link } };
}

// "Flash Express · P0123N5WXP8EA".
// Time O(n) · Space O(n)
function trackingSummary(tracking) {
    var courier = trackingCourier(tracking.courier);
    return (courier ? courier.name : 'Courier') + (tracking.number ? ' · ' + tracking.number : '');
}

// Saan susundan ng customer: yung link kung meron, kung wala
// yung site ng courier.
// Time O(n) · Space O(1)
function trackingHref(tracking) {
    if (tracking.link) return tracking.link;
    var courier = trackingCourier(tracking.courier);
    return courier && courier.site ? courier.site : '';
}

// Nilalagay o pinapalitan yung tracking ng order, at ini-email
// sa customer.
// Time O(n) · Space O(n)
function setCourierTracking(id, draft, stamp) {
    var order = orderById(id);
    if (!canAttachTracking(order)) {
        return { ok: false, errors: [{ field: 'order', message: 'Courier tracking can be added once a courier delivery is marked ready.' }] };
    }
    var checked = checkTracking(draft);
    if (checked.errors.length > 0) return { ok: false, errors: checked.errors };
    var t = checked.tracking, before = order.courierTracking;
    if (before && before.courier === t.courier && before.number === t.number && before.link === t.link) {
        return { ok: false, errors: [{ field: 'order', message: 'Nothing was changed.' }] };
    }
    order.courierTracking = { courier: t.courier, number: t.number, link: t.link, stamp: stamp };
    addHistory(order, stamp, (before ? 'Courier tracking changed: ' : 'Courier tracking added: ') + trackingSummary(order.courierTracking),
               deskActor(), t.link);
    emailTrackingAdded(order, stamp);
    return { ok: true, order: order };
}

// Tinatanggal yung tracking (mali, halimbawa) at sinasabihan
// yung customer na huwag pansinin yung nauna.
// Time O(n) · Space O(n)
function removeCourierTracking(id, stamp) {
    var order = orderById(id);
    if (!order || !order.courierTracking) return { ok: false, errors: [{ field: 'order', message: 'This order has no tracking to remove.' }] };
    var was = trackingSummary(order.courierTracking);
    order.courierTracking = null;
    addHistory(order, stamp, 'Courier tracking removed: ' + was, deskActor(), '', 'warn');
    emailTrackingRemoved(order, stamp);
    return { ok: true, order: order };
}
