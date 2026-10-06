/* =========================================================================
   SHOP · CART AND CHECKOUT — three steps.

     1. Cart     the linked list of chosen items, quantities, removal
     2. Details  contact and email, pickup (a date) or delivery (address,
                 courier, date and time)
     3. Review   a cart of price-list items is paid here by GCash and
                 confirmed at once; a cart with a quote product is sent
                 to the owner as a quote request instead.

   Delivery fees come from the delivery-area hash table: the shop's own
   fee nearby, a courier's rate further out, or "set by the shop" when no
   rate is known (which makes it a quote request).
   Depends on ui.js, store.js and orders.js.
   ========================================================================= */

var basketSheet = null;
var doneSheet = null;
var basketStep = 'basket';
var requestErrors = [];
var requestForm = {
    name: '', phone: '', email: '', handle: '', mode: 'pickup', date: '', slot: '',
    address: '', barangay: '', city: '', courier: 'flash', rush: false, notes: '',
    method: 'gcash-50', gcashRef: '', consent: false, terms: false
};

/* =========================================================================
   BADGE
   ========================================================================= */

/*                                        Time O(n)  · Space O(n) */
function refreshBasketBadge() {
    var count = basketCount(), dot = $('#basketCount');
    dot.textContent = String(count);
    setHidden(dot, count === 0);
    setHidden($('#basketFab'), count === 0);
    $('#fabCount').textContent = count > 0 ? String(count) : '';
}

/* =========================================================================
   FIELD HELPERS
   ========================================================================= */

/* The error for a field, if any.         Time O(n) · Space O(1) */
function errorFor(field) {
    var found = firstWhere(requestErrors, function (e) { return e.field === field; });
    return found ? found.message : '';
}

/* A labelled input with its error.       Time O(n) · Space O(n) */
function formField(field, label, attrs, value) {
    var error = errorFor(field);
    return '<label class="field' + (error ? ' is-invalid' : '') + '"><span class="field-label">' + escapeHtml(label) +
        '</span><input class="input" data-form="' + field + '" value="' + escapeHtml(value) + '" ' + attrs + '>' +
        (error ? '<span class="field-error">' + escapeHtml(error) + '</span>' : '') + '</label>';
}

/* The thumbnail for an item: its colour reference, or the product cover.
                                          Time O(n) · Space O(1) */
function itemThumb(item) {
    var product = productById(item.productId);
    if (item.kind === 'flower' && product) {
        var ref = referenceImage(product.flower, item.arrangement, item.color);
        if (ref) return ref.src;
    }
    return product ? productCover(product) : '';
}

/* "₱575.00" for a priced item, "Quote" for a quote product.  Time O(1) · Space O(1) */
function itemEstimateText(item) {
    if (item.kind !== 'quote') return peso(item.estimate);
    return item.estimate > 0 ? peso(item.estimate) + ' add-ons + quote' : 'Quote';
}

/* Keep the chosen date valid for the items and fulfilment.  Time O(n²) · Space O(1) */
function settleRequestDate() {
    var earliest = earliestDate(basketItems(), requestForm.rush, todayIso());
    if (!requestForm.date || requestForm.date < earliest) requestForm.date = earliest;
    if (requestForm.mode !== 'delivery' && weekdayOf(requestForm.date) === 0) requestForm.date = addDays(requestForm.date, 1);
    var inhouse = requestForm.mode === 'delivery' && !isBlank(requestForm.city) && !needsCourier(requestForm.city);
    if (inhouse) {
        var tries = 0;
        while (!isInhouseDay(requestForm.date) && tries < 7) { requestForm.date = addDays(requestForm.date, 1); tries++; }
    }
}

/* =========================================================================
   STEP 1 — CART
   ========================================================================= */

/*                                        Time O(n²) · Space O(n) */
function basketStepHtml() {
    var entries = basketEntries();
    if (entries.length === 0) {
        return '<div class="empty"><div class="empty-glyph">' + icon('bag') + '</div><h3 class="t-title3">Your cart is empty</h3>' +
               '<p class="t-callout">Choose a bouquet or a cake and add it to your cart.</p></div>';
    }
    var unavailable = unavailableBasketItems();
    return (unavailable.length > 0 ? '<p class="notice notice-warn">' + icon('alert', 16) +
            ' Something in your cart is no longer available. Remove it to continue.</p>' : '') +
        renderEach(entries, function (entry) {
            var item = entry.value, product = productById(item.productId);
            var gone = !product || !product.active;
            return '<div class="cart-line' + (gone ? ' is-gone' : '') + '"><div class="cart-line-media">' +
                imageOrEmpty(itemThumb(item), item.productName) + '</div><div>' +
                '<div class="cart-line-head"><span class="cart-line-name">' + escapeHtml(item.productName) + '</span>' +
                '<span class="cart-line-price">' + escapeHtml(itemEstimateText(item)) + '</span></div>' +
                specPills(itemSpecs(item)) +
                (item.notes ? '<p class="cart-line-notes t-foot">“' + escapeHtml(item.notes) + '”</p>' : '') +
                (item.reference ? '<p class="t-caption dim mt-1">' + icon('image', 14) + ' Reference: ' + escapeHtml(item.reference.name) + '</p>' : '') +
                '<div class="cart-line-foot"><div class="stepper">' +
                '<button type="button" data-line-qty="-1" data-line="' + entry.index + '" aria-label="One fewer"' + (item.quantity <= 1 ? ' disabled' : '') + '>−</button>' +
                '<span class="qty">' + item.quantity + '</span>' +
                '<button type="button" data-line-qty="1" data-line="' + entry.index + '" aria-label="One more"' + (item.quantity >= MAX_QUANTITY ? ' disabled' : '') + '>+</button>' +
                '</div><button class="ui-btn ui-btn-ghost ui-btn-sm" type="button" data-remove-line="' + entry.index + '">Remove</button></div>' +
                '</div></div>';
        });
}

/*                                        Time O(n²) · Space O(n) */
function basketFootHtml() {
    var count = basketCount(), quoted = basketHasQuoteItems();
    return summaryRows([{ k: quoted ? 'Priced items' : 'Subtotal', v: peso(basketEstimate()) }]) +
        (quoted ? '<p class="t-foot dim mt-2">Your cart has a gift the owner prices by quote, so checkout sends a quote request. ' +
                  'You pay once you accept the quotation.</p>' : '') +
        '<button class="ui-btn ui-btn-primary ui-btn-block ui-btn-lg mt-3" type="button" data-step="details"' +
        (count === 0 || unavailableBasketItems().length > 0 ? ' disabled' : '') + '>Check out</button>';
}

/* =========================================================================
   STEP 2 — DETAILS
   ========================================================================= */

/*                                        Time O(n) · Space O(n) */
function courierChoicesHtml() {
    var area = lookupArea(requestForm.city);
    return '<div class="field"><span class="field-label">Courier</span><div class="pay-grid">' +
        renderEach(COURIERS, function (c) {
            var rate = area ? courierRate(c.id, area.region) : 0;
            return '<button class="pay-option" type="button" data-courier="' + c.id + '" aria-pressed="' +
                (requestForm.courier === c.id ? 'true' : 'false') + '"><span class="pay-mark">' + icon('check', 14) + '</span>' +
                '<span class="pay-body"><span class="pay-name">' + escapeHtml(c.name) + '</span><span class="pay-blurb">' +
                escapeHtml(c.blurb) + '</span></span><span class="pay-due">' + (rate > 0 ? pesoWhole(rate) +
                '<span class="pay-now">courier rate</span>' : '<span class="pay-now">set by the shop</span>') + '</span></button>';
        }) + '</div>' + (errorFor('courier') ? '<span class="field-error">' + escapeHtml(errorFor('courier')) + '</span>' : '') + '</div>';
}

/* What delivery will cost, in words.     Time O(n) · Space O(1) */
function deliveryPreviewHtml() {
    if (requestForm.mode !== 'delivery' || isBlank(requestForm.city)) return '';
    var dq = deliveryQuote(requestForm), text;
    if (dq.status === 'final') {
        text = dq.label + ': ' + peso(dq.fee) + '. The shop delivers on ' + INHOUSE_DAY_NAMES + '.';
    } else if (dq.status === 'estimate') {
        text = dq.label + ': ' + peso(dq.fee) + ', the courier rate on file.';
    } else {
        text = basketHasQuoteItems()
            ? 'No courier rate on file for ' + strip(requestForm.city) + '. The shop will include the delivery fee in your quotation.'
            : 'We have no delivery rate for ' + strip(requestForm.city) + ' yet. Choose pickup or one of the listed cities, or message us at ' + SHOP_INFO.social + '.';
    }
    return '<p class="notice">' + icon('truck', 16) + ' ' + escapeHtml(text) + '</p>';
}

/* The courier choice (beyond the shop's own area) and the fee preview.
                                          Time O(n) · Space O(n) */
function deliveryExtrasHtml() {
    var f = requestForm;
    var courierNeeded = f.mode === 'delivery' && !isBlank(f.city) && needsCourier(f.city);
    return (courierNeeded ? courierChoicesHtml() : '') + deliveryPreviewHtml();
}

/* The city decides courier versus the shop's own delivery. Redraw only the
   parts that depend on it, so the field being typed in keeps its focus.
                                          Time O(n²) · Space O(n) */
function onCitySettled() {
    var extras = $('#deliveryExtras');
    if (!extras || basketStep !== 'details') return;
    extras.innerHTML = deliveryExtrasHtml();
    var before = requestForm.date;
    settleRequestDate();
    if (requestForm.date !== before) {
        // The shop's own deliveries run Friday to Sunday; the date moved.
        $('[data-form="date"]').value = requestForm.date;
        requestForm.slot = '';
        $('#slotWrap').innerHTML = whenPickHtml();
    }
}

/* Delivery: the time slots. Pickup: a date only, with the places left.
                                          Time O(n²) · Space O(n) */
function whenPickHtml() {
    if (requestForm.mode !== 'delivery') {
        var left = pickupPlacesLeft(requestForm.date);
        return '<p class="t-foot ' + (left === 0 ? 'rose' : 'dim') + '">' + (left === 0 ? 'Pickups are fully booked on this date.'
            : 'Pick up any time during opening hours (' + SHOP_INFO.hours + '). ' + left + ' pickup ' + plural(left, 'place') + ' left that day.') + '</p>';
    }
    var slots = slotsFor(requestForm.date);
    return '<div class="field' + (errorFor('slot') ? ' is-invalid' : '') + '"><span class="field-label">Delivery time</span><div class="slot-grid">' +
        renderEach(slots, function (s) {
            return '<button class="slot" type="button" data-slot="' + escapeHtml(s.slot) + '" aria-pressed="' +
                (requestForm.slot === s.slot ? 'true' : 'false') + '"' + (s.left === 0 ? ' disabled' : '') + '>' +
                '<span class="slot-time">' + escapeHtml(s.slot) + '</span><span class="slot-left">' +
                (s.left === 0 ? 'Fully booked' : s.left + ' ' + plural(s.left, 'place') + ' left') + '</span></button>';
        }) + '</div>' + (errorFor('slot') ? '<span class="field-error">' + escapeHtml(errorFor('slot')) + '</span>' : '') + '</div>';
}

/*                                        Time O(n²) · Space O(n) */
function detailsStepHtml() {
    settleRequestDate();
    var f = requestForm, delivery = f.mode === 'delivery';
    var earliest = earliestDate(basketItems(), f.rush, todayIso());
    var modes = renderEach(FULFILMENT_MODES, function (m) {
        return '<button type="button" data-mode="' + m.id + '" aria-selected="' + (f.mode === m.id ? 'true' : 'false') + '">' +
               escapeHtml(m.name) + '</button>';
    });
    return '<div class="steps" aria-hidden="true"><span class="step is-done"></span><span class="step is-now"></span><span class="step"></span></div>' +
        '<h3 class="t-title3 mb-3">Your details</h3>' +
        formField('name', 'Name', 'autocomplete="name" maxlength="60"', f.name) +
        formField('email', 'Email', 'type="email" autocomplete="email" maxlength="100" placeholder="Your confirmation and tracking number go here"', f.email) +
        formField('phone', 'Mobile number', 'autocomplete="tel" inputmode="tel" placeholder="0917 123 4567"', f.phone) +
        formField('handle', 'Facebook or Instagram (optional)', 'maxlength="60" placeholder="So the shop can message you"', f.handle) +
        '<h3 class="t-title3 mt-5 mb-3">Pickup or delivery</h3>' +
        '<div class="segmented mb-2" role="tablist">' + modes + '</div>' +
        '<p class="t-foot dim mb-3">' + escapeHtml(modeById(f.mode).blurb) + '</p>' +
        (delivery ? formField('address', 'Street and house number', 'autocomplete="street-address" maxlength="120"', f.address) +
            formField('barangay', 'Barangay', 'maxlength="60" placeholder="e.g. Lawa"', f.barangay) +
            formField('city', 'City or town', 'list="cityList" maxlength="60" autocomplete="address-level2" placeholder="e.g. Meycauayan"', f.city) +
            '<datalist id="cityList">' + renderEach(DELIVERY_AREAS, function (a) { return '<option value="' + escapeHtml(a.city) + '">'; }) + '</datalist>' +
            '<div id="deliveryExtras">' + deliveryExtrasHtml() + '</div>' : '') +
        '<h3 class="t-title3 mt-5 mb-3">' + (delivery ? 'Delivery date and time' : 'Pickup date') + '</h3>' +
        formField('date', delivery ? 'Date' : 'Pickup date', 'type="date" min="' + earliest + '"', f.date) +
        '<p class="t-foot dim mt-1 mb-3">Ready from ' + escapeHtml(formatDateLong(earliest)) + '.</p>' +
        '<div id="slotWrap">' + whenPickHtml() + '</div>' + scheduleNoteHtml(f.mode) +
        '<label class="check mt-3"><input type="checkbox" data-form="rush"' + (f.rush ? ' checked' : '') + '><span class="box">' + icon('check') +
        '</span><span class="check-body"><span class="check-title">Rush order <span class="dim">+' + pesoWhole(RUSH_FEE) + '</span></span>' +
        '<span class="check-note">Ready the next day, made ahead of the regular queue.</span></span></label>' +
        '<label class="field mt-4"><span class="field-label">Anything else the shop should know (optional)</span>' +
        '<textarea class="textarea" data-form="notes" maxlength="' + MAX_NOTE + '">' + escapeHtml(f.notes) + '</textarea></label>' +
        consentHtml() +
        (errorFor('basket') ? '<p class="field-error">' + escapeHtml(errorFor('basket')) + '</p>' : '');
}

/* The two agreements, asked separately, at the moment the details are
   given: the Privacy Notice, and the shop's order terms. Each opens its
   text in a sheet.                       Time O(n) · Space O(n) */
function consentHtml() {
    var f = requestForm;
    // The links to the texts sit outside the labels, so a label holds only
    // its own box (a button inside a label is not valid HTML).
    /*                                     Time O(n) · Space O(n) */
    function box(field, title, note) {
        var error = errorFor(field), id = 'agree-' + field;
        return '<div class="check consent-check' + (error ? ' is-invalid' : '') + '"><input type="checkbox" id="' + id + '" data-form="' + field + '"' +
            (f[field] ? ' checked' : '') + '><label class="box" for="' + id + '">' + icon('check') + '</label><span class="check-body">' +
            '<label class="check-title" for="' + id + '">' + escapeHtml(title) + '</label><span class="check-note">' + note + '</span>' +
            (error ? '<span class="field-error">' + escapeHtml(error) + '</span>' : '') + '</span></div>';
    }
    return '<h3 class="t-title3 mt-5 mb-3">Your agreement</h3><div class="consent-block">' +
        box('consent', 'I agree to the Privacy Notice', 'Sýmpan Universe may use the details I give — mine, and for a delivery the recipient’s ' +
            'address — only to make, deliver and email me about this order, as the <button class="link link-button" type="button" data-privacy-open="notice">Privacy Notice</button> ' +
            'explains under the Data Privacy Act of 2012.') +
        box('terms', 'I agree to the order terms', 'Payments are non-refundable, there are no cancellations once production starts, and dates are ' +
            'estimates. <button class="link link-button" type="button" data-privacy-open="terms">Read the order terms</button>') +
        '</div>';
}

/* =========================================================================
   STEP 3 — REVIEW AND PAY (or send the quote request)
   ========================================================================= */

/* What the chosen payment takes now.     Time O(n)  · Space O(n) */
function dueNow(totals) {
    var method = paymentById(requestForm.method);
    return method.share === 1 ? totals.total : roundMoney(totals.total * method.share);
}

/* The two GCash choices and the reference field.  Time O(n) · Space O(n) */
function checkoutPaymentHtml(totals) {
    return '<h3 class="t-title3 mt-5 mb-3">Payment</h3><div class="pay-grid">' + renderEach(PAYMENT_METHODS, function (m) {
            var now = m.share === 1 ? totals.total : roundMoney(totals.total * m.share);
            return '<button class="pay-option" type="button" data-pay-method="' + m.id + '" aria-pressed="' +
                (requestForm.method === m.id ? 'true' : 'false') + '"><span class="pay-mark">' + icon('check', 14) + '</span>' +
                '<span class="pay-body"><span class="pay-name">' + escapeHtml(m.name) + '</span><span class="pay-blurb">' +
                escapeHtml(m.blurb) + '</span></span><span class="pay-due">' + peso(now) + '<span class="pay-now">due now</span></span></button>';
        }) + '</div>' +
        '<p class="t-foot dim-2 mt-3">Send <strong>' + escapeHtml(peso(dueNow(totals))) + '</strong> by GCash to the number on ' +
        escapeHtml(SHOP_INFO.social) + ', then enter the 13-digit reference number from your GCash receipt.</p>' +
        formField('gcash', 'GCash reference number', 'inputmode="numeric" maxlength="16" autocomplete="off" placeholder="0000 000 000000"',
                  requestForm.gcashRef);
}

/*                                        Time O(n²) · Space O(n) */
function reviewStepHtml() {
    var f = requestForm, items = repricedCart(), totals = cartTotals(f, items), dq = totals.delivery;
    var rows = [{ k: totals.needsQuote ? 'Priced items' : 'Subtotal', v: peso(totals.subtotal) }];
    if (basketHasQuoteItems()) listAdd(rows, { k: 'Quote items', v: 'Priced in your quotation' });
    listAdd(rows, { k: 'Delivery & handling', v: dq.status === 'manual' ? 'Quoted by the shop' : peso(dq.fee) });
    if (f.rush) listAdd(rows, { k: 'Rush fee', v: peso(RUSH_FEE) });
    if (!totals.needsQuote) listAdd(rows, { k: 'Total', v: peso(totals.total), grand: true });
    var where = f.mode === 'delivery' ? strip(f.address) + ', ' + (f.barangay ? strip(f.barangay) + ', ' : '') + strip(f.city) : SHOP_INFO.address;
    return '<div class="steps" aria-hidden="true"><span class="step is-done"></span><span class="step is-done"></span><span class="step is-now"></span></div>' +
        '<h3 class="t-title3 mb-3">' + (totals.needsQuote ? 'Check your quote request' : 'Review and pay') + '</h3>' +
        '<ul class="order-items">' + renderEach(items, function (item) {
            return '<li class="order-item"><div class="order-item-media">' + imageOrEmpty(itemThumb(item), '') + '</div>' +
                '<div class="order-item-body"><strong>' + escapeHtml(item.productName) + ' × ' + item.quantity + '</strong>' +
                specPills(itemSpecs(item)) + '<span class="t-caption dim">' + escapeHtml(itemEstimateText(item)) + '</span></div></li>';
        }) + '</ul>' +
        '<dl class="order-facts mt-4">' +
            '<div><dt>Name</dt><dd>' + escapeHtml(f.name) + '</dd></div>' +
            '<div><dt>Email</dt><dd>' + escapeHtml(f.email) + '</dd></div>' +
            '<div><dt>Mobile</dt><dd>' + escapeHtml(f.phone) + '</dd></div>' +
            '<div><dt>' + (f.mode === 'delivery' ? 'Deliver to' : 'Pick up at') + '</dt><dd>' + escapeHtml(where) + '</dd></div>' +
            '<div><dt>' + (f.mode === 'delivery' ? 'When' : 'Pickup date') + '</dt><dd>' +
            escapeHtml(formatDateLong(f.date) + (f.mode === 'delivery' ? ', ' + f.slot : '')) + (f.rush ? ' · Rush' : '') + '</dd></div>' +
            (dq.courier ? '<div><dt>Courier</dt><dd>' + escapeHtml(courierById(dq.courier).name) + '</dd></div>' : '') +
        '</dl>' + scheduleNoteHtml(f.mode) +
        '<div class="panel mt-4">' + summaryRows(rows) +
        (totals.needsQuote ? '<p class="t-foot dim mt-3">Nothing is charged yet. The owner prices your request and emails you the quotation; ' +
            'accept it with a 50% down payment or full payment by GCash.</p>' : '') + '</div>' +
        (totals.needsQuote ? '' : checkoutPaymentHtml(totals));
}

/* =========================================================================
   RENDER + EVENTS
   ========================================================================= */

/* The review step's main button.         Time O(n²) · Space O(n) */
function reviewButtonHtml() {
    var totals = cartTotals(requestForm, repricedCart());
    return totals.needsQuote
        ? '<button class="ui-btn ui-btn-primary ui-btn-block ui-btn-lg" type="button" id="sendRequest">Send quote request</button>'
        : '<button class="ui-btn ui-btn-primary ui-btn-block ui-btn-lg" type="button" id="placeOrder">Place order · pay ' +
          escapeHtml(peso(dueNow(totals))) + '</button>';
}

/*                                        Time O(n²) · Space O(n) */
function renderBasket(focusSelector) {
    var body = $('#basketBody'), foot = $('#basketFoot'), top = body.scrollTop;
    setHidden($('#basketBack'), basketStep === 'basket');
    if (basketStep === 'basket') {
        $('#basketTitle').textContent = 'Your cart';
        body.innerHTML = basketStepHtml();
        foot.innerHTML = basketFootHtml();
    } else if (basketStep === 'details') {
        $('#basketTitle').textContent = 'Checkout';
        body.innerHTML = detailsStepHtml();
        foot.innerHTML = '<button class="ui-btn ui-btn-primary ui-btn-block ui-btn-lg" type="button" data-step="review">Continue</button>';
    } else {
        $('#basketTitle').textContent = 'Checkout';
        body.innerHTML = reviewStepHtml();
        foot.innerHTML = reviewButtonHtml();
    }
    body.scrollTop = top;
    if (focusSelector) {
        var target = $(focusSelector, body);
        if (target) target.focus({ preventScroll: true });
    }
}

/*                                        Time O(n²) · Space O(n) */
function openBasket() {
    basketStep = 'basket';
    requestErrors = [];
    renderBasket('');
    sheetOpen(basketSheet);
}

/* Move between steps, checking the details before review.  Time O(n²) · Space O(n) */
function goToStep(step) {
    if (step === 'review') {
        requestErrors = validateRequest(requestForm, basketItems(), todayIso());
        if (requestErrors.length > 0) {
            renderBasket('');
            var firstBad = $('.is-invalid input, .is-invalid', $('#basketBody'));
            if (firstBad) firstBad.scrollIntoView({ block: 'center' });
            toast({ title: requestErrors[0].message, kind: 'warn' });
            return;
        }
    }
    requestErrors = [];
    basketStep = step;
    renderBasket('');
    $('#basketBody').scrollTop = 0;
}

/* Back to the step an error belongs to.  Time O(n²) · Space O(n) */
function showCheckoutErrors(errors) {
    requestErrors = errors;
    var onReview = errors[0].field === 'gcash' || errors[0].field === 'payment';
    basketStep = onReview ? 'review' : 'details';
    renderBasket(onReview ? '[data-form="gcash"]' : '');
    toast({ title: errors[0].message, kind: 'warn' });
}

/* Quote request: no payment yet.         Time O(n²) · Space O(n) */
function sendRequest() {
    var result = submitRequest(requestForm, Date.now());
    if (!result.ok) { showCheckoutErrors(result.errors); return; }
    finishCheckout(result.order, null);
}

/* Priced cart: place and pay in one step.  Time O(n²) · Space O(n) */
function placeCartOrder() {
    var result = placeOrder(requestForm, requestForm.method, requestForm.gcashRef, Date.now());
    if (!result.ok) { showCheckoutErrors(result.errors); return; }
    finishCheckout(result.order, result.receipt);
}

/*                                        Time O(n²) · Space O(n) */
function finishCheckout(order, receipt) {
    refreshBasketBadge();
    refreshShop();
    sheetClose(basketSheet);
    showOrderPlaced(order, receipt);
    requestForm = copyRecord(requestForm, { notes: '', rush: false, date: '', slot: '', gcashRef: '', consent: false, terms: false });
}

/* The confirmation, with the tracking number to keep.  Time O(n) · Space O(n) */
function showOrderPlaced(order, receipt) {
    var emailed = mailConfigured()
        ? 'We emailed your confirmation and tracking number to <strong>' + escapeHtml(order.customer.email) + '</strong>.'
        : 'Email isn\'t connected in this copy of the site yet, so no email was sent. Keep the number below.';
    var steps = receipt
        ? ['We start making your order now.', 'We email you again when it is ready.',
           receipt.balance > 0 ? 'Settle the ' + peso(receipt.balance) + ' balance before ' + (order.fulfilment.mode === 'delivery' ? 'delivery.' : 'pickup.')
                               : 'It is fully paid — nothing more to do.']
        : ['The owner prices your request — usually the same day.', 'You get the quotation by email; it also shows under Track order.',
           'Accept it with a 50% or full GCash payment to confirm. The quotation is held ' + QUOTE_EXPIRY_DAYS + ' days.'];
    $('#doneTitle').textContent = receipt ? 'Order confirmed' : 'Quote request sent';
    $('#doneBody').innerHTML = '<div class="done-wrap text-center"><div class="success-mark">' + icon('check') + '</div>' +
        '<h3 class="t-title1">' + (receipt ? 'Thank you — your order is confirmed' : 'Your quote request is with the shop') + '</h3>' +
        '<p class="t-callout dim mt-2">' + emailed + '</p>' +
        '<p class="t-over dim mt-4">Tracking number</p><p class="receipt-ref">' + escapeHtml(order.ref) + '</p>' +
        '<ol class="how-steps how-steps-compact mt-5 text-start">' + renderEach(steps, function (s, i) {
            return '<li class="how-step"><span class="how-num">' + (i + 1) + '</span><p class="t-callout">' + escapeHtml(s) + '</p></li>';
        }) + '</ol><div class="text-start mt-4">' + scheduleNoteHtml(order.fulfilment.mode) + '</div></div>';
    $('#doneFoot').innerHTML = '<div class="row-center">' +
        (receipt ? '<button class="ui-btn ui-btn-quiet flex-fill" type="button" data-receipt="' + escapeHtml(receipt.no) + '">View receipt</button>'
                 : '<button class="ui-btn ui-btn-quiet flex-fill" type="button" data-sheet-done>Keep browsing</button>') +
        '<button class="ui-btn ui-btn-primary flex-fill" type="button" data-track-ref="' + escapeHtml(order.ref) + '" data-track-phone="' +
        escapeHtml(order.customer.phone) + '">Track order</button></div>';
    sheetOpen(doneSheet);
}

/* Field edits; re-render only what depends on them.  Time O(n²) · Space O(n) */
function onRequestInput(e) {
    var t = e.target, field = t.getAttribute('data-form');
    if (!field) return;
    if (field === 'rush') {
        requestForm.rush = t.checked;
        renderBasket('[data-form="rush"]');
        return;
    }
    if (field === 'consent' || field === 'terms') {
        requestForm[field] = t.checked;
        // Ticked: the error under it goes at once (inline, not on submit).
        requestErrors = keepWhere(requestErrors, function (er) { return er.field !== field || !t.checked; });
        renderBasket('[data-form="' + field + '"]');
        return;
    }
    if (field === 'gcash') { requestForm.gcashRef = t.value; return; }
    requestForm[field] = t.value;
}

/*                                        Time O(n²) · Space O(n) */
function onBasketClick(e) {
    var t = e.target.closest('button');
    if (!t) return;
    if (t.hasAttribute('data-line-qty')) {
        var index = Number(t.getAttribute('data-line')), item = llGet(basket, index);
        if (item) basketSetQuantity(index, item.quantity + Number(t.getAttribute('data-line-qty')));
        refreshBasketBadge();
        renderBasket('');
    } else if (t.hasAttribute('data-remove-line')) {
        basketRemove(Number(t.getAttribute('data-remove-line')));
        refreshBasketBadge();
        renderBasket('');
    } else if (t.hasAttribute('data-mode')) {
        requestForm.mode = t.getAttribute('data-mode');
        requestForm.slot = '';
        renderBasket('[data-mode="' + requestForm.mode + '"]');
    } else if (t.hasAttribute('data-courier')) {
        requestForm.courier = t.getAttribute('data-courier');
        renderBasket('[data-courier="' + requestForm.courier + '"]');
    } else if (t.hasAttribute('data-slot')) {
        requestForm.slot = t.getAttribute('data-slot');
        renderBasket('[data-slot="' + requestForm.slot + '"]');
    } else if (t.hasAttribute('data-pay-method')) {
        requestForm.method = t.getAttribute('data-pay-method');
        renderBasket('[data-pay-method="' + requestForm.method + '"]');
        $('#basketFoot').innerHTML = reviewButtonHtml();
    }
}

/*                                        Time O(1)  · Space O(1) */
function initBasket() {
    basketSheet = sheetCreate($('#basketSheet'), { axis: sideAxis });
    doneSheet = sheetCreate($('#doneSheet'));
    $('#basketIcon').innerHTML = icon('bag', 18);
    $('#fabIcon').innerHTML = icon('bag');
    $('#basketButton').addEventListener('click', openBasket);
    $('#basketFab').addEventListener('click', openBasket);
    $('#basketBack').addEventListener('click', function () {
        goToStep(basketStep === 'review' ? 'details' : 'basket');
    });

    var body = $('#basketBody');
    body.addEventListener('click', onBasketClick);
    body.addEventListener('input', function (e) { if (isTypingField(e.target)) onRequestInput(e); });
    body.addEventListener('change', function (e) { if (!isTypingField(e.target)) onRequestInput(e); });
    // A date redraws the slots once it is committed, not on every keystroke.
    body.addEventListener('change', function (e) {
        if (e.target.getAttribute('data-form') !== 'date') return;
        requestForm.date = e.target.value;
        requestForm.slot = '';
        renderBasket('[data-form="date"]');
    });
    // The city decides in-house versus courier; redraw once typing settles.
    var cityChanged = debounce(onCitySettled, 450);
    body.addEventListener('input', function (e) {
        if (e.target.getAttribute('data-form') === 'city') cityChanged(e.target.value);
    });

    $('#basketFoot').addEventListener('click', function (e) {
        var t = e.target.closest('button');
        if (!t) return;
        if (t.hasAttribute('data-step')) goToStep(t.getAttribute('data-step'));
        else if (t.id === 'sendRequest') sendRequest();
        else if (t.id === 'placeOrder') placeCartOrder();
    });
    $('#doneFoot').addEventListener('click', function (e) {
        var t = e.target.closest('button');
        if (!t) return;
        if (t.hasAttribute('data-receipt')) { openReceipt(t.getAttribute('data-receipt')); return; }
        sheetClose(doneSheet);
        if (t.hasAttribute('data-track-ref')) openTrack(t.getAttribute('data-track-ref'), t.getAttribute('data-track-phone'));
    });
    refreshBasketBadge();
}
