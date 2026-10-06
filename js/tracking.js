/* =========================================================================
   COURIER TRACKING — the courier's parcel number and / or tracking link,
   attached to a delivery order by the order desk once it has been sent.

   order.courierTracking is null, or { courier, number, link, stamp }:
     courier  'flash', 'lalamove' or 'other' (COURIERS + OTHER_COURIER)
     number   the courier's parcel number: letters, digits and hyphens
     link     the tracking link the courier gave, if any — https:// only
   The customer sees it on Track order and gets it by email; the desk sees
   it on the order card. Every change goes into the order's history and
   the audit log. Checks are written by hand, character by character — no
   regular expressions.
   Depends on orders.js, notify.js and audit.js.
   ========================================================================= */

/* The courier for an id, including "another courier".  Time O(n) · Space O(1) */
function trackingCourier(id) {
    return id === OTHER_COURIER.id ? OTHER_COURIER : courierById(id);
}

/* Every courier the desk can name: the shop's couriers, then "another".
                                          Time O(n) · Space O(n) */
function trackingCouriers() {
    return withAdded(COURIERS, OTHER_COURIER);
}

/* Tracking belongs to courier deliveries that have been made and handed
   over ("Mark ready" — the customer was told it is on its way). The shop's
   own deliveries have no courier to track.  Time O(1) · Space O(1) */
function canAttachTracking(order) {
    return !!order && order.fulfilment.mode === 'delivery' && !!order.fulfilment.courier && order.status === 'completed';
}

/* The tracking to show for an order, or null — never on a voided order.
                                          Time O(1) · Space O(1) */
function shownTracking(order) {
    return order && order.courierTracking && canAttachTracking(order) ? order.courierTracking : null;
}

/* "P 0123 N5WX P8EA" → "P0123N5WXP8EA": spaces dropped.  Time O(n) · Space O(n) */
function tidyTrackingNumber(text) {
    var s = String(text === undefined || text === null ? '' : text), out = '';
    for (var i = 0; i < s.length; i++) if (!isSpace(s.charAt(i))) out += s.charAt(i);
    return out;
}

/* '' when a parcel number looks right, or what is wrong with it.
                                          Time O(n) · Space O(1) */
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

/* Is the host the domain itself or a part of it ("share.lalamove.com"
   under "lalamove.com")?                 Time O(n) · Space O(n) */
function hostUnder(host, domain) {
    if (host === domain) return true;
    var tail = '.' + domain;
    return host.length > tail.length && textPart(host, host.length - tail.length) === tail;
}

/* A host that only pretends to be a name: all digits and dots (an IP
   address), or a label in punycode ("xn--…"), which can imitate another
   site's letters.                        Time O(n) · Space O(n) */
function isDisguisedHost(host) {
    var digitsOnly = true;
    for (var i = 0; i < host.length; i++) if (!isDigit(host.charAt(i)) && host.charAt(i) !== '.') digitsOnly = false;
    return digitsOnly || beginsWith(host, 'xn--') || textHas(host, '.xn--');
}

/* '' when a tracking link is safe to show the customer, or what is wrong.
   It must be a plain https:// address on a named host: no spaces, quotes or
   angle brackets, and no "user@" part that could disguise the real site.
   For Flash Express and Lalamove the host must be the courier's own site;
   for another courier it may not be an IP address or punycode.
                                          Time O(n) · Space O(n) */
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

/* Check what the desk typed. Returns { errors, tracking } with the tidied
   values.                                Time O(n) · Space O(n) */
function checkTracking(draft) {
    var errors = [];
    /* Record one problem.                 Time O(1)  · Space O(1) */
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

/* "Flash Express · P0123N5WXP8EA".       Time O(n) · Space O(n) */
function trackingSummary(tracking) {
    var courier = trackingCourier(tracking.courier);
    return (courier ? courier.name : 'Courier') + (tracking.number ? ' · ' + tracking.number : '');
}

/* Where the customer can follow the parcel: the courier's own tracking link
   when one was given, otherwise the courier's official website, where the
   number can be typed in. '' when there is neither.  Time O(n) · Space O(1) */
function trackingHref(tracking) {
    if (tracking.link) return tracking.link;
    var courier = trackingCourier(tracking.courier);
    return courier && courier.site ? courier.site : '';
}

/* Attach the courier's tracking to an order, or change it. The customer is
   emailed.                               Time O(n) · Space O(n)
   Returns { ok, order } or { ok: false, errors }. */
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

/* Take the tracking off an order (a wrong number, say), and tell the
   customer to ignore the one they were sent.  Time O(n) · Space O(n) */
function removeCourierTracking(id, stamp) {
    var order = orderById(id);
    if (!order || !order.courierTracking) return { ok: false, errors: [{ field: 'order', message: 'This order has no tracking to remove.' }] };
    var was = trackingSummary(order.courierTracking);
    order.courierTracking = null;
    addHistory(order, stamp, 'Courier tracking removed: ' + was, deskActor(), '', 'warn');
    emailTrackingRemoved(order, stamp);
    return { ok: true, order: order };
}
