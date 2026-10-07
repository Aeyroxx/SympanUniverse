/* =========================================================================
   SHOP · PRODUCT SHEET (customiser)
   Pagpili ng arrangement, dami, kulay at add-ons ng bulaklak, o detalye
   ng gift. Ginagamit din ito pag nag-Edit ng line sa cart.
   ========================================================================= */

var productSheet = null;
var productState = null;

var DEFAULT_COUNTS = [
    { id: 'money', count: 10 }, { id: 'makeup', count: 5 }, { id: 'pictures', count: 6 },
    { id: 'sweets', count: 10 }, { id: 'diaper', count: 30 }, { id: 'beer', count: 12 }
];

var MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

// ---------- State ----------

// Bagong set ng pili para sa product.
// Time O(n²) · Space O(1)
function freshChoices(product) {
    var state = { product: product, view: 0, quantity: 1, addons: [], cardFlower: CARD_FLOWERS[0],
                  notes: '', reference: null, editIndex: -1, cartReference: null };
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

// Mga pili ng isang line sa cart, para ma-edit. Kung wala na
// yung option, babalik sa default ng product.
// Time O(n²) · Space O(n)
function choicesFromItem(product, item) {
    var state = freshChoices(product);
    state.quantity = item.quantity;
    state.addons = copyRange(item.addons, 0, item.addons.length);
    state.cardFlower = item.cardFlower || CARD_FLOWERS[0];
    state.notes = item.notes;
    state.reference = item.reference;
    state.cartReference = item.reference;
    if (product.kind === 'flower') {
        if (isIn(product.arrangements, item.arrangement)) state.arrangement = item.arrangement;
        var counts = countsFor(product, state.arrangement);
        // Kung wala na yung dating bilang, yung default ng arrangement na ito.
        state.count = isIn(counts, item.count) ? item.count : (counts.length > 2 ? counts[2] : counts[0]);
        if (isIn(product.colors, item.color)) state.color = item.color;
    } else {
        if (isIn(product.sizes, item.size)) state.size = item.size;
        state.count = item.count;
        state.detail = item.detail;
        state.provided = item.provided;
    }
    return state;
}

// Ano ang pwedeng ipakita: yung reference, tapos yung gallery.
// Time O(n) · Space O(n)
function productMedia(state) {
    var p = state.product, out = [];
    if (p.kind === 'flower') {
        var ref = referenceImage(p.flower, state.arrangement, state.color);
        if (ref) listAdd(out, { src: ref.src, kind: ref.real ? 'real' : 'preview' });
    }
    for (var i = 0; i < p.gallery.length; i++) listAdd(out, { src: p.gallery[i], kind: 'gallery' });
    return out;
}

// Yung item na idadagdag, o kung bakit hindi pwede.
// Time O(n²) · Space O(n)
function buildChosenItem() {
    var s = productState;
    if (s.product.kind === 'flower') {
        return makeFlowerItem(s.product, { arrangement: s.arrangement, count: s.count, color: s.color,
            quantity: s.quantity, addons: s.addons, cardFlower: s.cardFlower, notes: s.notes, reference: s.reference });
    }
    return makeQuoteItem(s.product, { size: s.size, count: s.count, detail: s.detail, provided: s.provided,
        quantity: s.quantity, addons: s.addons, cardFlower: s.cardFlower, notes: s.notes, reference: s.reference });
}

// ---------- Pag-render ----------

// "Sample photo · Photo: ... · CC BY-SA", may link sa original
// at sa license gaya ng hinihingi nito.
// Time O(n) · Space O(n)
function photoCreditHtml(credit) {
    return '<span class="badge badge-sample">Sample photo</span> <span class="t-caption">Photo: <a class="link" href="' + escapeHtml(credit.source) +
        '" target="_blank" rel="noopener noreferrer">' + escapeHtml(credit.title) + '</a> by ' + escapeHtml(credit.author) + ' · <a class="link" href="' +
        escapeHtml(credit.licenseUrl) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(credit.license) + '</a>' +
        (credit.changes ? ' · ' + escapeHtml(credit.changes) : '') + '</span>';
}

// Yung litrato at caption.
// Time O(n) · Space O(n)
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

// Pagpili ng arrangement, dami at kulay.
// Time O(n²) · Space O(n)
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

// Size, dami, provided items at detalye.
// Time O(n) · Space O(n)
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

// Paliwanag kung sino ang bibili ng items.
// Time O(1) · Space O(1)
function providedNote(type) {
    return productState.provided
        ? 'Your quotation covers the materials and the labour of assembly.'
        : 'The shop buys them for you. Their cost (' + toLower(type.expenseLabel) + ') is listed separately from materials and labour.';
}

// Pinakakaunting bills para sa halaga (greedy).
// Time O(n) · Space O(n)
function billHint() {
    var amount = toNumber(productState.detail);
    if (!(amount > 0)) return 'Optional. Tell us the total and we will suggest the fewest bills.';
    var b = breakIntoBills(amount, DENOMINATIONS);
    if (b.total === 0) return 'Bills start at ₱20.';
    return 'Fewest bills: ' + describeBills(b) + ' = ' + b.total + ' ' + plural(b.total, 'bill') +
           (b.remainder > 0 ? ' (₱' + b.remainder + ' cannot be made in bills)' : '') + '.';
}

// Yung hint, may button para gamitin yung bilang ng bills.
// Time O(n) · Space O(n)
function billHintHtml() {
    var amount = toNumber(productState.detail), hint = escapeHtml(billHint());
    if (!(amount > 0)) return hint;
    var total = breakIntoBills(amount, DENOMINATIONS).total;
    if (total === 0 || total === productState.count) return hint;
    return hint + ' <button class="link-button" type="button" data-use-bills="' + total + '">Use ' + total + ' ' +
           plural(total, 'bill') + '</button>';
}

// Add-ons, quantity, notes, reference at materials.
// Time O(n) · Space O(n)
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

// Presyo sa taas. Yung limang quote products lang ang may "quote".
// Time O(n) · Space O(1)
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

// Buong laman ng sheet.
// Time O(n²) · Space O(n)
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

// Footer: presyo at button. "Save changes" kung nag-e-edit ng
// line sa cart.
// Time O(n²) · Space O(n)
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
        '<button class="ui-btn ui-btn-primary ui-btn-lg" type="button" id="addToCart">' +
        (productState.editIndex >= 0 ? icon('check', 18) + ' Save changes' : icon('plus', 18) + ' Add to cart') + '</button></div>';
}

// Ulit i-render pero hindi nawawala yung scroll at focus.
// Time O(n²) · Space O(n)
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

// Swipe sa litrato para lumipat.
// Time O(1) · Space O(1)
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

// ---------- Pagbukas at events ----------

// Binubuksan yung product sheet.
// Time O(n²) · Space O(n)
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

// Binubuksan yung customiser para sa line ng cart, may laman na.
// Time O(n²) · Space O(n)
function openCartLine(index) {
    var item = llGet(basket, index), product = item ? productById(item.productId) : null;
    if (!product || !product.active) {
        toast({ title: 'That item is not available any more. Remove it from your cart.', kind: 'warn' });
        return;
    }
    productState = choicesFromItem(product, item);
    productState.editIndex = index;
    $('#productSheetTitle').textContent = 'Edit · ' + product.name;
    rerenderProduct('');
    sheetOpen(productSheet);
}

// Binabasa yung in-attach na image bilang object URL.
// Time O(n²) · Space O(n)
function attachReference(input) {
    var file = input.files && input.files[0];
    if (!file) return;
    if (!beginsWith(file.type, 'image/')) { toast({ title: 'Choose an image file.', kind: 'warn' }); return; }
    if (file.size > MAX_UPLOAD_BYTES) { toast({ title: 'That image is over 8 MB.', kind: 'warn' }); return; }
    productState.reference = { name: file.name, url: URL.createObjectURL(file) };
    rerenderProduct('[data-clear-reference]');
}

// Dagdag sa cart, o kung nag-e-edit, ibinabalik sa pwesto niya.
// Time O(n²) · Space O(n)
function addChosenToCart() {
    var made = buildChosenItem(), index = productState.editIndex;
    if (!made.ok) { toast({ title: made.error, kind: 'warn' }); return; }
    if (index >= 0) {
        if (!basketReplace(index, made.item)) {
            sheetClose(productSheet);
            renderBasket('');
            toast({ title: 'That line is no longer in your cart.', kind: 'warn' });
            return;
        }
        // Wala nang gumagamit ng lumang litrato pag pinalitan o tinanggal.
        if (productState.cartReference && productState.cartReference !== made.item.reference) URL.revokeObjectURL(productState.cartReference.url);
        refreshBasketBadge();
        sheetClose(productSheet);
        showEditedLine(index);
        toast({ title: 'Cart updated', message: made.item.productName + ' × ' + made.item.quantity, kind: 'success' });
        return;
    }
    basketAdd(made.item);
    refreshBasketBadge();
    sheetClose(productSheet);
    toast({ title: 'Added to your cart', message: made.item.productName + ' × ' + made.item.quantity, kind: 'success' });
}

// Mga click sa pagpipilian at buttons.
// Time O(n²) · Space O(n)
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
        // Hindi pa kasama sa order kaya walang ibang may hawak ng image,
        // maliban kung yung line sa cart na ine-edit pa ang may hawak.
        if (s.reference !== s.cartReference) URL.revokeObjectURL(s.reference.url);
        s.reference = null;
        rerenderProduct('');
    }
}

// Pag nag-type o nag-toggle, update lang ng state.
// Time O(n²) · Space O(n)
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

// Kinakabit yung mga event ng product sheet.
// Time O(1) · Space O(1)
function initProductSheet() {
    productSheet = sheetCreate($('#productSheet'));
    var body = $('#productBody');
    body.addEventListener('click', onProductClick);
    // Text fields, bawat pindot; toggles, files at selects, isang beses
    // lang pag nagbago. Hiwalay para walang nadodoble.
    body.addEventListener('input', function (e) { if (isTypingField(e.target)) onProductInput(e); });
    body.addEventListener('change', function (e) { if (!isTypingField(e.target)) onProductInput(e); });
    $('#productFoot').addEventListener('click', function (e) {
        if (e.target.closest('#addToCart')) addChosenToCart();
    });
}
