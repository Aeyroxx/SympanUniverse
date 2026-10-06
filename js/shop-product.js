/* =========================================================================
   SHOP · PRODUCT SHEET — the customiser.

   Flower bouquets: arrangement, flower count, one of twenty ribbon colours
   and add-ons, with the photograph for exactly that arrangement and colour
   (looked up in the reference hash table), priced exactly from the price
   list. The picture bouquet has one set price. The five quote products
   (money, makeup, sweets, diaper cake, beer cake) take a size, count,
   whether the customer provides the items and design notes, and are
   priced by the owner's quotation. All can attach a reference design.
   Depends on ui.js, store.js and shop-basket.js (for the badge).
   ========================================================================= */

var productSheet = null;
var productState = null;

var DEFAULT_COUNTS = [
    { id: 'money', count: 10 }, { id: 'makeup', count: 5 }, { id: 'pictures', count: 6 },
    { id: 'sweets', count: 10 }, { id: 'diaper', count: 30 }, { id: 'beer', count: 12 }
];
var MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

/* =========================================================================
   STATE
   ========================================================================= */

/* A fresh set of choices for a product.  Time O(n²) · Space O(1) */
function freshChoices(product) {
    var state = { product: product, view: 0, quantity: 1, addons: [], cardFlower: CARD_FLOWERS[0],
                  notes: '', reference: null };
    if (product.kind === 'flower') {
        state.arrangement = product.arrangements[0];
        var counts = countsFor(product, state.arrangement);
        state.count = counts.length > 2 ? counts[2] : counts[0];
        state.color = product.colors[0];
    } else {
        var type = quoteTypeById(product.quoteType);
        var preset = firstWhere(DEFAULT_COUNTS, function (d) { return d.id === product.quoteType; });
        state.size = product.sizes[0];
        state.count = preset ? preset.count : 1;
        state.detail = '';
        state.provided = type.provided !== null;
    }
    return state;
}

/* What the media frame can show: the chosen reference, then the gallery.
                                          Time O(n) · Space O(n) */
function productMedia(state) {
    var p = state.product, out = [];
    if (p.kind === 'flower') {
        var ref = referenceImage(p.flower, state.arrangement, state.color);
        if (ref) listAdd(out, { src: ref.src, kind: ref.real ? 'real' : 'preview' });
    }
    for (var i = 0; i < p.gallery.length; i++) listAdd(out, { src: p.gallery[i], kind: 'gallery' });
    return out;
}

/* The item this sheet would add, or the reason it cannot.  Time O(n²) · Space O(n) */
function buildChosenItem() {
    var s = productState;
    if (s.product.kind === 'flower') {
        return makeFlowerItem(s.product, { arrangement: s.arrangement, count: s.count, color: s.color,
            quantity: s.quantity, addons: s.addons, cardFlower: s.cardFlower, notes: s.notes, reference: s.reference });
    }
    return makeQuoteItem(s.product, { size: s.size, count: s.count, detail: s.detail, provided: s.provided,
        quantity: s.quantity, addons: s.addons, cardFlower: s.cardFlower, notes: s.notes, reference: s.reference });
}

/* =========================================================================
   RENDERING
   ========================================================================= */

/* "Sample photo · Photo: Chocolate Bouquet by … · CC BY-SA 4.0", with
   links to the original and the licence, as the licence asks.
                                          Time O(n) · Space O(n) */
function photoCreditHtml(credit) {
    return '<span class="badge badge-sample">Sample photo</span> <span class="t-caption">Photo: <a class="link" href="' + escapeHtml(credit.source) +
        '" target="_blank" rel="noopener noreferrer">' + escapeHtml(credit.title) + '</a> by ' + escapeHtml(credit.author) + ' · <a class="link" href="' +
        escapeHtml(credit.licenseUrl) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(credit.license) + '</a>' +
        (credit.changes ? ' · ' + escapeHtml(credit.changes) : '') + '</span>';
}

/* The photograph frame and its caption.  Time O(n) · Space O(n) */
function productMediaHtml() {
    var s = productState, media = productMedia(s);
    if (media.length === 0) {
        return '<div class="ref-frame">' + imageOrEmpty('', '') + '</div>' +
               '<p class="t-caption dim mt-2">No photograph yet — attach a reference design and the shop will follow it.</p>';
    }
    if (s.view >= media.length) s.view = 0;
    var shown = media[s.view], caption = '', note = '';
    if (shown.kind === 'real' || shown.kind === 'preview') {
        caption = '<span class="badge ' + (shown.kind === 'real' ? 'badge-green' : 'badge-amber') + '">' +
            (shown.kind === 'real' ? 'Actual bouquet photo' : 'Colour preview') + '</span> ' +
            escapeHtml(arrangementById(s.arrangement).name + ' · ' + colorById(s.color).name);
        note = shown.kind === 'real' ? 'A bouquet the shop made in this colour and arrangement.'
             : 'Our own photo, recoloured to this ribbon colour. The real ribbon follows the colour chart.';
    } else {
        var credit = photoCredit(shown.src);
        caption = credit ? photoCreditHtml(credit) : '<span class="badge">Shop photo</span>';
        note = credit ? 'A similar gift from the web, shown to give the idea — not the shop\'s own work. Yours is made to order to your size and design.' : '';
    }
    var thumbs = media.length < 2 ? '' : '<div class="gallery-thumbs" role="group" aria-label="Photographs">' +
        renderEach(media, function (m, i) {
            return '<button type="button" data-view="' + i + '" aria-current="' + (i === s.view ? 'true' : 'false') +
                   '" aria-label="Photo ' + (i + 1) + '"><img src="' + escapeHtml(m.src) + '" alt="" loading="lazy"></button>';
        }) + '</div>';
    return '<figure class="ref-frame" id="refFrame"><img src="' + escapeHtml(shown.src) + '" alt="' +
           escapeHtml(s.product.name) + '"></figure>' +
           '<figcaption class="ref-caption t-foot">' + caption + '</figcaption>' +
           (note ? '<p class="t-caption dim mt-1">' + escapeHtml(note) + '</p>' : '') + thumbs;
}

/* Arrangement, count and colour pickers. Time O(n²) · Space O(n) */
function flowerControlsHtml() {
    var s = productState, p = s.product;
    var arrangements = renderEach(p.arrangements, function (id) {
        var a = arrangementById(id);
        return '<button type="button" role="radio" data-arrangement="' + id + '" aria-checked="' +
               (id === s.arrangement ? 'true' : 'false') + '" aria-selected="' + (id === s.arrangement ? 'true' : 'false') +
               '">' + escapeHtml(a.name) + '</button>';
    });
    var counts = renderEach(countsFor(p, s.arrangement), function (count) {
        return '<button class="size-option" type="button" data-count="' + count + '" aria-pressed="' +
               (count === s.count ? 'true' : 'false') + '"><span class="size-count">' + count + ' ' +
               plural(count, 'flower') + '</span><span class="size-price">' + pesoWhole(priceForCount(p, count)) + '</span></button>';
    });
    var colours = renderEach(p.colors, function (id) {
        var c = colorById(id);
        return '<button class="color-option" type="button" data-color="' + id + '" aria-pressed="' +
               (id === s.color ? 'true' : 'false') + '" title="' + escapeHtml(c.name) + '">' +
               '<span class="dot" style="background:' + escapeHtml(c.hex) + '"></span>' +
               '<span class="color-name">' + escapeHtml(c.name) + '</span></button>';
    });
    return '<section class="pick"><h3 class="pick-title">Arrangement</h3>' +
           '<div class="segmented" role="radiogroup" aria-label="Arrangement">' + arrangements + '</div>' +
           '<p class="t-foot dim mt-2">' + escapeHtml(arrangementById(s.arrangement).blurb) + '</p></section>' +
           '<section class="pick"><h3 class="pick-title">How many flowers <span class="dim">· price list</span></h3>' +
           '<div class="size-grid">' + counts + '</div></section>' +
           '<section class="pick"><h3 class="pick-title">Ribbon colour <span class="dim">· ' +
           escapeHtml(colorById(s.color).name) + '</span></h3><div class="color-grid">' + colours + '</div></section>';
}

/* Size, count, provided-items and detail fields.  Time O(n) · Space O(n) */
function quoteControlsHtml() {
    var s = productState, p = s.product, type = quoteTypeById(p.quoteType);
    var sizes = renderEach(p.sizes, function (size) {
        return '<button class="size-option" type="button" data-size="' + escapeHtml(size) + '" aria-pressed="' +
               (size === s.size ? 'true' : 'false') + '"><span class="size-count">' + escapeHtml(size) + '</span></button>';
    });
    var sizePick = p.sizes.length < 2 ? '' : '<section class="pick"><h3 class="pick-title">Size</h3><div class="size-grid">' + sizes + '</div></section>';
    var provided = !type.provided ? '' :
        '<label class="check provided-check"><input type="checkbox" data-field="provided"' + (s.provided ? ' checked' : '') + '>' +
        '<span class="box">' + icon('check') + '</span><span class="check-body"><span class="check-title">I will provide ' +
        escapeHtml(type.provided) + '</span><span class="check-note" id="providedNote">' + escapeHtml(providedNote(type)) +
        '</span></span></label>';
    var detailInput = p.quoteType === 'money'
        ? '<input class="input" type="number" min="0" step="20" inputmode="numeric" data-field="detail" value="' +
          escapeHtml(s.detail) + '" placeholder="e.g. 5000">' +
          '<span class="t-foot dim d-block mt-2" id="billHint">' + billHintHtml() + '</span>'
        : '<input class="input" type="text" maxlength="160" data-field="detail" value="' + escapeHtml(s.detail) + '">';
    return sizePick +
        '<section class="pick"><label class="field"><span class="field-label">' + escapeHtml(type.countLabel) + '</span>' +
        '<input class="input input-short" type="number" min="1" max="500" step="1" inputmode="numeric" data-field="count" value="' +
        s.count + '"></label></section>' +
        (provided ? '<section class="pick">' + provided + '</section>' : '') +
        '<section class="pick"><label class="field"><span class="field-label">' + escapeHtml(type.detailLabel) +
        '</span>' + detailInput + '</label></section>';
}

/*                                        Time O(1)  · Space O(1) */
function providedNote(type) {
    return productState.provided
        ? 'Your quotation covers the materials and the labour of assembly.'
        : 'The shop buys them for you. Their cost (' + toLower(type.expenseLabel) + ') is listed separately from materials and labour.';
}

/* The fewest bills for the amount typed — greedy change-making.
                                          Time O(n) · Space O(n) */
function billHint() {
    var amount = toNumber(productState.detail);
    if (!(amount > 0)) return 'Optional. Tell us the total and we will suggest the fewest bills.';
    var b = breakIntoBills(amount, DENOMINATIONS);
    if (b.total === 0) return 'Bills start at ₱20.';
    return 'Fewest bills: ' + describeBills(b) + ' = ' + b.total + ' ' + plural(b.total, 'bill') +
           (b.remainder > 0 ? ' (₱' + b.remainder + ' cannot be made in bills)' : '') + '.';
}

/* The hint, plus a button to use the suggested count when it differs.
                                          Time O(n) · Space O(n) */
function billHintHtml() {
    var amount = toNumber(productState.detail), hint = escapeHtml(billHint());
    if (!(amount > 0)) return hint;
    var total = breakIntoBills(amount, DENOMINATIONS).total;
    if (total === 0 || total === productState.count) return hint;
    return hint + ' <button class="link-button" type="button" data-use-bills="' + total + '">Use ' + total + ' ' +
           plural(total, 'bill') + '</button>';
}

/* Add-ons, quantity, notes, reference upload and materials.
                                          Time O(n) · Space O(n) */
function commonControlsHtml() {
    var s = productState, p = s.product;
    var offered = keepWhere(ADDONS, function (a) { return p.kind === 'flower' || !a.flowersOnly; });
    var addons = renderEach(offered, function (a) {
        var price = addonPrice(a.id, p.kind === 'flower' ? s.count : 1);
        return '<label class="check"><input type="checkbox" data-addon="' + a.id + '"' + (isIn(s.addons, a.id) ? ' checked' : '') +
               '><span class="box">' + icon('check') + '</span><span class="check-body"><span class="check-title">' +
               escapeHtml(a.name) + ' <span class="dim">+' + pesoWhole(price) + '</span></span><span class="check-note">' +
               escapeHtml(a.note) + '</span></span></label>';
    });
    var cardPick = !isIn(s.addons, 'card') ? '' :
        '<label class="field mt-2"><span class="field-label">Dried flower on the card</span><select class="select" data-field="cardFlower">' +
        renderEach(CARD_FLOWERS, function (f) {
            return '<option' + (f === s.cardFlower ? ' selected' : '') + '>' + escapeHtml(f) + '</option>';
        }) + '</select></label>';
    var reference = s.reference
        ? '<div class="upload-chosen"><img src="' + escapeHtml(s.reference.url) + '" alt=""><span class="flex-fill t-foot">' +
          escapeHtml(s.reference.name) + '</span><button class="ui-btn ui-btn-ghost ui-btn-sm" type="button" data-clear-reference>Remove</button></div>'
        : '<label class="upload-drop">' + icon('upload') + '<span><strong>Attach a reference design</strong>' +
          '<span class="t-caption dim d-block">Optional · an image up to 8 MB</span></span>' +
          '<input type="file" accept="image/*" data-field="reference" class="sr-only"></label>';

    return '<section class="pick"><h3 class="pick-title">Add-ons</h3><div class="addon-grid">' + addons + '</div>' + cardPick + '</section>' +
        '<section class="pick row-between"><h3 class="pick-title mb-0">Quantity</h3><div class="stepper">' +
        '<button type="button" data-qty="-1" aria-label="One fewer"' + (s.quantity <= 1 ? ' disabled' : '') + '>−</button>' +
        '<span class="qty" aria-live="polite">' + s.quantity + '</span>' +
        '<button type="button" data-qty="1" aria-label="One more"' + (s.quantity >= MAX_QUANTITY ? ' disabled' : '') + '>+</button></div></section>' +
        '<section class="pick"><label class="field"><span class="field-label">Design notes</span>' +
        '<textarea class="textarea" maxlength="' + MAX_NOTE + '" data-field="notes" placeholder="Wrapper colour, theme, the message for the card…">' +
        escapeHtml(s.notes) + '</textarea></label></section>' +
        '<section class="pick">' + reference + '</section>' +
        '<section class="pick"><h3 class="pick-title">Made with</h3><p class="t-foot dim">' +
        escapeHtml(glue(p.materials, ' · ')) + '</p></section>';
}

/* The price block at the top of the details. Only the five quote products
   speak of a quotation; flowers and the picture bouquet have prices.
                                          Time O(n) · Space O(1) */
function pricingBlockHtml() {
    var p = productState.product, from = productStartsAt(p), type = quoteTypeById(p.quoteType);
    if (p.kind === 'fixed') {
        return '<div class="pricing-block"><p class="price-now">' + escapeHtml(pesoWhole(p.price)) + '</p>' +
            '<p class="t-foot dim">One price per bouquet. Pay at checkout by GCash.</p></div>';
    }
    if (p.kind === 'flower') {
        return '<div class="pricing-block"><p class="price-now">' + escapeHtml('Starts at ' + pesoWhole(from)) + '</p>' +
            '<p class="t-foot dim-2">Price varies depending on size, quantity, and design.</p>' +
            '<p class="t-foot dim">Priced from the shop\'s price list below — no quote needed. Pay at checkout by GCash.</p></div>';
    }
    return '<div class="pricing-block"><p class="price-now">' + escapeHtml(from > 0 ? 'Starts at ' + pesoWhole(from) : 'Customized Pricing') + '</p>' +
        '<p class="t-foot dim-2">Price varies depending on size, quantity, and design.</p>' +
        '<p class="t-foot dim">' + escapeHtml('Quoted from materials and the labour of assembly' +
            (type.provided ? ', plus ' + toLower(type.expenseLabel) + ' only if the shop sources them' : '') +
            '. Add it to your cart and send a quote request — message us at ' + SHOP_INFO.social + ' with questions.') + '</p></div>';
}

/* The whole sheet body.                  Time O(n²) · Space O(n) */
function productBodyHtml() {
    var p = productState.product, branch = productBranch(p);
    var badges = (isBestSeller(p.id) ? '<span class="badge badge-ink">' + icon('star', 12) + ' Best seller</span>' : '') +
                 '<span class="badge">' + soldUnits(p.id) + ' sold</span>';
    return '<div class="detail-layout">' +
        '<div class="detail-media" id="productMedia">' + productMediaHtml() + '</div>' +
        '<div class="detail-info">' +
            '<p class="t-over dim">' + escapeHtml(branch ? branch.label : '') + '</p>' +
            '<h2 class="t-title1 mt-1">' + escapeHtml(p.name) + '</h2>' +
            '<div class="row-center mt-2">' + badges + '</div>' +
            pricingBlockHtml() +
            '<p class="t-callout dim-2">' + escapeHtml(p.story) + '</p>' +
            (p.kind === 'flower' ? flowerControlsHtml() : quoteControlsHtml()) +
            commonControlsHtml() +
        '</div></div>';
}

/* The footer: the price (or "quote") and the add button.  Time O(n²) · Space O(n) */
function renderProductFoot() {
    var made = buildChosenItem(), label, note;
    if (productState.product.kind !== 'quote') {
        label = made.ok ? peso(made.item.estimate) : '—';
        note = 'Pay at checkout by GCash';
    } else {
        label = made.ok && made.item.estimate > 0 ? 'Add-ons ' + peso(made.item.estimate) + ' + quote' : 'Quote request';
        note = 'The shop prices it; you pay after accepting';
    }
    $('#productFoot').innerHTML = '<div class="row-between"><div><p class="t-title3 t-num">' + escapeHtml(label) + '</p>' +
        '<p class="t-caption dim">' + escapeHtml(note) + '</p></div>' +
        '<button class="ui-btn ui-btn-primary ui-btn-lg" type="button" id="addToCart">' + icon('plus', 18) +
        ' Add to cart</button></div>';
}

/* Redraw, keeping the scroll position and the focused control.
                                          Time O(n²) · Space O(n) */
function rerenderProduct(focusSelector) {
    var body = $('#productBody'), top = body.scrollTop;
    body.innerHTML = productBodyHtml();
    body.scrollTop = top;
    renderProductFoot();
    bindProductSwipe();
    if (focusSelector) {
        var target = $(focusSelector, body);
        if (target) target.focus({ preventScroll: true });
    }
}

/* Swipe the photo frame to step through the photographs.  Time O(1) · Space O(1) */
function bindProductSwipe() {
    var frame = $('#refFrame');
    if (!frame) return;
    dragAttach(frame, { axis: 'x', threshold: 10, onEnd: function (d) {
        var count = productMedia(productState).length;
        if (count < 2 || Math.abs(d.dx) < 40) return;
        productState.view = (productState.view + (d.dx < 0 ? 1 : count - 1)) % count;
        $('#productMedia').innerHTML = productMediaHtml();
        bindProductSwipe();
    } });
}

/* =========================================================================
   OPENING AND EVENTS
   ========================================================================= */

/*                                        Time O(n²) · Space O(n) */
function openProduct(id) {
    var product = productById(id);
    if (!product || !product.active) {
        toast({ title: 'That item is not available right now.', kind: 'warn' });
        return;
    }
    productState = freshChoices(product);
    $('#productSheetTitle').textContent = product.name;
    rerenderProduct('');
    sheetOpen(productSheet);
}

/* Read an attached image into an in-memory object URL.  Time O(n²) · Space O(n) */
function attachReference(input) {
    var file = input.files && input.files[0];
    if (!file) return;
    if (!beginsWith(file.type, 'image/')) { toast({ title: 'Choose an image file.', kind: 'warn' }); return; }
    if (file.size > MAX_UPLOAD_BYTES) { toast({ title: 'That image is over 8 MB.', kind: 'warn' }); return; }
    productState.reference = { name: file.name, url: URL.createObjectURL(file) };
    rerenderProduct('[data-clear-reference]');
}

/*                                        Time O(n²) · Space O(n) */
function addChosenToCart() {
    var made = buildChosenItem();
    if (!made.ok) { toast({ title: made.error, kind: 'warn' }); return; }
    basketAdd(made.item);
    refreshBasketBadge();
    sheetClose(productSheet);
    toast({ title: 'Added to your cart', message: made.item.productName + ' × ' + made.item.quantity, kind: 'success' });
}

/* Clicks on pickers and buttons.         Time O(n²) · Space O(n) */
function onProductClick(e) {
    var s = productState, t = e.target.closest('button');
    if (!t || !s) return;
    if (t.hasAttribute('data-view')) {
        s.view = Number(t.getAttribute('data-view'));
        $('#productMedia').innerHTML = productMediaHtml();
        bindProductSwipe();
        return;
    }
    if (t.hasAttribute('data-arrangement')) {
        s.arrangement = t.getAttribute('data-arrangement');
        var counts = countsFor(s.product, s.arrangement);
        if (!isIn(counts, s.count)) s.count = counts.length > 2 ? counts[2] : counts[0];
        s.view = 0;
        rerenderProduct('[data-arrangement="' + s.arrangement + '"]');
    } else if (t.hasAttribute('data-count')) {
        s.count = Number(t.getAttribute('data-count'));
        rerenderProduct('[data-count="' + s.count + '"]');
    } else if (t.hasAttribute('data-color')) {
        s.color = t.getAttribute('data-color');
        s.view = 0;
        rerenderProduct('[data-color="' + s.color + '"]');
    } else if (t.hasAttribute('data-size')) {
        s.size = t.getAttribute('data-size');
        rerenderProduct('');
    } else if (t.hasAttribute('data-qty')) {
        var next = s.quantity + Number(t.getAttribute('data-qty'));
        if (next >= 1 && next <= MAX_QUANTITY) s.quantity = next;
        rerenderProduct('[data-qty="' + t.getAttribute('data-qty') + '"]');
    } else if (t.hasAttribute('data-use-bills')) {
        s.count = Number(t.getAttribute('data-use-bills'));
        rerenderProduct('[data-field="count"]');
    } else if (t.hasAttribute('data-clear-reference')) {
        // Never added to an order, so nothing else holds this image.
        URL.revokeObjectURL(s.reference.url);
        s.reference = null;
        rerenderProduct('');
    }
}

/* Typing and toggles: update state without stealing focus.  Time O(n²) · Space O(n) */
function onProductInput(e) {
    var s = productState, t = e.target, field = t.getAttribute('data-field');
    if (!s) return;
    if (t.hasAttribute('data-addon')) {
        var id = t.getAttribute('data-addon');
        if (t.checked && !isIn(s.addons, id)) s.addons = withAdded(s.addons, id);
        if (!t.checked) s.addons = removeValue(s.addons, id);
        if (id === 'card') { rerenderProduct('[data-addon="card"]'); return; }
    } else if (field === 'notes') {
        s.notes = t.value;
    } else if (field === 'detail' || field === 'count') {
        if (field === 'detail') s.detail = t.value;
        else s.count = Math.floor(toNumber(t.value));
        var hint = $('#billHint');
        if (hint) hint.innerHTML = billHintHtml();
    } else if (field === 'provided') {
        s.provided = t.checked;
        $('#providedNote').textContent = providedNote(quoteTypeById(s.product.quoteType));
    } else if (field === 'cardFlower') {
        s.cardFlower = t.value;
    } else if (field === 'reference') {
        attachReference(t);
        return;
    }
    renderProductFoot();
}

/*                                        Time O(1)  · Space O(1) */
function initProductSheet() {
    productSheet = sheetCreate($('#productSheet'));
    var body = $('#productBody');
    body.addEventListener('click', onProductClick);
    // Text fields report every keystroke; toggles, files and selects report
    // once on change. Splitting them means no control is handled twice.
    body.addEventListener('input', function (e) { if (isTypingField(e.target)) onProductInput(e); });
    body.addEventListener('change', function (e) { if (!isTypingField(e.target)) onProductInput(e); });
    $('#productFoot').addEventListener('click', function (e) {
        if (e.target.closest('#addToCart')) addChosenToCart();
    });
}
