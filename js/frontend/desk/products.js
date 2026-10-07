/* =========================================================================
   DESK · PRODUCTS
   Listahan ng products, disable/enable, at editor (pangalan, presyo, litrato).
   ========================================================================= */

// ---------- Listahan ----------

// Listahan ng products sa desk.
// Time O(n²) · Space O(n)
function productsDeskHtml() {
    var tally = salesTally();
    return '<p class="t-foot dim mb-3">Disabled products disappear from the shop and cannot be ordered. They stay here, with their sales history, until you enable them again.</p>' +
        '<div class="product-rows">' + renderEach(tally, function (row) {
            var p = row.product, branch = productBranch(p);
            return '<article class="product-row' + (p.active ? '' : ' is-disabled') + '">' +
                '<div class="product-row-media">' + imageOrEmpty(productCover(p), '') + '</div>' +
                '<div class="flex-fill"><div class="row-center"><strong>' + escapeHtml(p.name) + '</strong>' +
                (p.active ? '<span class="badge badge-green">Active</span>' : '<span class="badge">Disabled</span>') + '</div>' +
                '<p class="t-foot dim">' + escapeHtml((branch ? branch.label : '') + ' · ' + priceLabel(p) + ' · ' + row.orders + ' ' +
                plural(row.orders, 'order') + ' · ' + row.units + ' sold') + '</p></div>' +
                '<div class="desk-actions">' + actButton('product-edit', p.id, 'Edit') +
                actButton('product-toggle', p.id, p.active ? 'Disable' : 'Enable', p.active ? 'ui-btn-danger' : 'ui-btn-primary') + '</div></article>';
        }) + '</div>';
}

// Disable o enable ng product.
// Time O(n²) · Space O(n)
function toggleProduct(id) {
    var product = productById(id);
    if (!product) return;
    if (!product.active) {
        setProductActive(id, true);
        logAudit(Date.now(), deskActor(), 'Product enabled: ' + product.name, '', '');
        toast({ title: product.name + ' is back in the shop', kind: 'success' });
        deskChanged();
        return;
    }
    askConfirm({
        title: 'Disable ' + product.name + '?',
        message: 'It will no longer appear in the shop or be orderable. Past orders and its sales history are kept, and you can enable it again at any time.',
        confirmLabel: 'Disable', danger: true,
        onConfirm: function () {
            setProductActive(id, false);
            logAudit(Date.now(), deskActor(), 'Product disabled: ' + product.name, '', 'Hidden from the shop; past orders kept', 'warn');
            toast({ title: product.name + ' disabled', kind: 'info' });
            deskChanged();
        }
    });
}

// ---------- Editor ----------

// "a, b\nc" -> ['a', 'b', 'c'].
// Time O(n) · Space O(n)
function parseList(text) {
    var pieces = cutText(swapText(text, '\n', ','), ',');
    var out = [];
    for (var i = 0; i < pieces.length; i++) {
        var piece = strip(pieces[i]);
        if (piece.length > 0) listAdd(out, piece);
    }
    return out;
}

// Lahat ng litrato na kasama ng site, para sa image picker.
// Time O(n²) · Space O(n)
function knownImages() {
    var out = [];
    for (var i = 0; i < PRODUCT_SEED.length; i++) {
        for (var j = 0; j < PRODUCT_SEED[i].gallery.length; j++) {
            var src = IMG_PRODUCTS + PRODUCT_SEED[i].gallery[j];
            if (!isIn(out, src)) listAdd(out, src);
        }
    }
    var extra = ['custom-ribbon-1.jpg', 'custom-ribbon-3.jpg', 'custom-ribbon-4.jpg', 'custom-ribbon-5.jpg'];
    for (var k = 0; k < extra.length; k++) if (!isIn(out, IMG_PRODUCTS + extra[k])) listAdd(out, IMG_PRODUCTS + extra[k]);
    return out;
}

// Huling parte ng path, pang-label.
// Time O(n) · Space O(n)
function fileName(path) {
    var parts = cutText(path, '/');
    return parts[parts.length - 1];
}

// Editor ng product.
// Time O(n²) · Space O(n)
function productEditorHtml(product) {
    var d = deskSheetState.draft;
    var gallery = d.gallery.length === 0 ? '<p class="t-foot dim">No images. The shop shows a "photo coming soon" tile.</p>' :
        '<div class="image-grid">' + renderEach(d.gallery, function (src, i) {
            return '<figure class="image-tile"><img src="' + escapeHtml(src) + '" alt="">' +
                (i === 0 ? '<span class="badge badge-ink image-cover">Cover</span>' : '') +
                '<figcaption><button class="ui-btn ui-btn-ghost ui-btn-sm" type="button" data-img-cover="' + i + '"' + (i === 0 ? ' disabled' : '') + '>Make cover</button>' +
                '<button class="ui-btn ui-btn-ghost ui-btn-sm" type="button" data-img-remove="' + i + '">Remove</button></figcaption></figure>';
        }) + '</div>';
    var picker = '<div class="row-center mt-2"><select class="select" id="imagePick" aria-label="Photograph to add">' +
        renderEach(knownImages(), function (src) { return '<option value="' + escapeHtml(src) + '">' + escapeHtml(fileName(src)) + '</option>'; }) +
        '</select><button class="ui-btn ui-btn-quiet" type="button" data-img-add>Add</button>' +
        '<label class="ui-btn ui-btn-quiet">' + icon('upload', 16) + ' Upload<input type="file" accept="image/*" class="sr-only" data-p-upload></label></div>';

    var options;
    if (product.kind === 'flower') {
        var offered = offeredCounts(d.arrangements);   // isang beses lang kinukuha, hindi bawat row
        options = '<h3 class="t-title3 mt-5 mb-2">Arrangements</h3><div class="row-center">' + renderEach(ARRANGEMENTS, function (a) {
                return '<label class="check"><input type="checkbox" data-p-arrangement="' + a.id + '"' + (isIn(d.arrangements, a.id) ? ' checked' : '') +
                    '><span class="box">' + icon('check') + '</span><span class="check-body"><span class="check-title">' + escapeHtml(a.name) + '</span></span></label>';
            }) + '</div>' +
            '<div class="row-between mt-5 mb-2"><h3 class="t-title3">Ribbon colours <span class="dim">· ' + d.colors.length + ' of ' + COLORS.length + '</span></h3>' +
            '<span><button class="ui-btn ui-btn-ghost ui-btn-sm" type="button" data-colors-all>All</button>' +
            '<button class="ui-btn ui-btn-ghost ui-btn-sm" type="button" data-colors-none>None</button></span></div>' +
            '<div class="color-checks">' + renderEach(COLORS, function (c) {
                return '<label class="color-check"><input type="checkbox" data-p-color="' + c.id + '"' + (isIn(d.colors, c.id) ? ' checked' : '') +
                    '><span class="dot" style="background:' + escapeHtml(c.hex) + '"></span><span>' + escapeHtml(c.name) + '</span></label>';
            }) + '</div>' +
            '<h3 class="t-title3 mt-5 mb-2">Price list <span class="dim">· per bouquet, by flower count</span></h3>' +
            '<p class="t-foot dim mb-2">Round builds offer ' + glue(arrangementById('round').counts, ', ') + ' flowers; layered builds offer ' +
            glue(arrangementById('layered').counts, ', ') + '.</p>' +
            '<div class="price-rows">' + renderEach(d.priceTable, function (row, i) {
                // Yung bilang na hindi na inaalok, makikita pa rin pero may marka,
                // para pag nag-save, alam kung aling row ang mali.
                var choices = isIn(offered, row.count) ? offered : withAdded(offered, row.count);
                return '<div class="price-row"><label class="field"><span class="field-label">Flowers</span><select class="select" data-p-row="' +
                    i + '" data-p-part="count">' + optionsHtml(choices, row.count, function (n) { return n; },
                    function (n) { return n + ' ' + plural(n, 'flower') + (isIn(offered, n) ? '' : ' (not offered)'); }) + '</select></label>' +
                    moneyInput('data-p-row="' + i + '" data-p-part="price"', row.price, 'Price') +
                    '<button class="ui-btn ui-btn-ghost ui-btn-sm" type="button" data-p-row-remove="' + i + '"' + (d.priceTable.length < 2 ? ' disabled' : '') + '>Remove</button></div>';
            }) + '</div><button class="ui-btn ui-btn-quiet ui-btn-sm mt-2" type="button" data-p-row-add>' + icon('plus', 14) + ' Add a row</button>';
    } else {
        options = '<h3 class="t-title3 mt-5 mb-2">Options and price</h3><div class="edit-grid">' +
            '<label class="field"><span class="field-label">Sizes offered (comma-separated)</span><input class="input" data-p-field="sizes" value="' +
            escapeHtml(glue(d.sizes, ', ')) + '"></label>' +
            moneyInput('data-p-field="startsAt"', d.startsAt, 'Starting price (0 shows Customized Pricing)') + '</div>';
    }

    return '<div class="edit-grid">' +
        '<label class="field"><span class="field-label">Name</span><input class="input" maxlength="60" data-p-field="name" value="' + escapeHtml(d.name) + '"></label>' +
        '<label class="field"><span class="field-label">Processing time (days)</span><input class="input" type="number" min="1" max="14" data-p-field="leadDays" value="' +
        d.leadDays + '"></label></div>' +
        '<label class="field mt-3"><span class="field-label">Short description</span><input class="input" maxlength="160" data-p-field="blurb" value="' +
        escapeHtml(d.blurb) + '"></label>' +
        '<label class="field mt-3"><span class="field-label">Full description</span><textarea class="textarea" maxlength="900" data-p-field="story">' +
        escapeHtml(d.story) + '</textarea></label>' +
        '<label class="field mt-3"><span class="field-label">Materials (comma-separated)</span><input class="input" data-p-field="materials" value="' +
        escapeHtml(glue(d.materials, ', ')) + '"></label>' +
        '<h3 class="t-title3 mt-5 mb-2">Images</h3>' + gallery + picker + options + errorListHtml(deskSheetState.errors);
}

// Ipinapakita yung product editor.
// Time O(n²) · Space O(n)
function renderProductEditor() {
    var product = productById(deskSheetState.productId), body = $('#deskBody'), top = body.scrollTop;
    $('#deskTitle').textContent = 'Edit · ' + product.name;
    body.innerHTML = productEditorHtml(product);
    body.scrollTop = top;
    $('#deskFoot').innerHTML = '<div class="row-between"><span class="t-foot dim">' + (product.active ? 'Active in the shop' : 'Disabled — hidden from the shop') +
        '</span><div class="row-center"><button class="ui-btn ui-btn-quiet" type="button" data-sheet-dismiss>Cancel</button>' +
        '<button class="ui-btn ui-btn-primary" type="button" data-p-save>Save product</button></div></div>';
}

// Binubuksan yung product editor.
// Time O(n²) · Space O(n)
function openProductEditor(id) {
    var product = productById(id);
    if (!product) return;
    deskSheetState = { mode: 'product', orderId: 0, productId: id, draft: productEditDraft(product), kind: '', method: '', errors: [] };
    renderProductEditor();
    $('#deskBody').scrollTop = 0;
    if (!deskSheet.isOpen) sheetOpen(deskSheet);
}

// Pag nag-type o toggle sa editor.
// Time O(n²) · Space O(n)
function onProductEditorInput(e) {
    var t = e.target, d = deskSheetState.draft;
    var field = t.getAttribute('data-p-field');
    if (field === 'materials' || field === 'sizes') d[field] = parseList(t.value);
    else if (field === 'leadDays') d.leadDays = Math.floor(toNumber(t.value));
    else if (field === 'startsAt') d.startsAt = toNumber(t.value);
    else if (field) d[field] = t.value;
    else if (t.hasAttribute('data-p-row')) {
        var i = Number(t.getAttribute('data-p-row')), part = t.getAttribute('data-p-part'), changes = {};
        changes[part] = part === 'count' ? Math.floor(toNumber(t.value)) : toNumber(t.value);
        d.priceTable[i] = copyRecord(d.priceTable[i], changes);
    } else if (t.hasAttribute('data-p-arrangement')) {
        var a = t.getAttribute('data-p-arrangement');
        d.arrangements = t.checked ? (isIn(d.arrangements, a) ? d.arrangements : withAdded(d.arrangements, a)) : removeValue(d.arrangements, a);
        renderProductEditor();
    } else if (t.hasAttribute('data-p-color')) {
        var c = t.getAttribute('data-p-color');
        d.colors = t.checked ? (isIn(d.colors, c) ? d.colors : withAdded(d.colors, c)) : removeValue(d.colors, c);
        renderProductEditor();
    } else if (t.hasAttribute('data-p-upload')) {
        var file = t.files && t.files[0];
        if (!file || !beginsWith(file.type, 'image/')) { toast({ title: 'Choose an image file.', kind: 'warn' }); return; }
        if (file.size > MAX_UPLOAD_BYTES) { toast({ title: 'That image is over 8 MB.', kind: 'warn' }); return; }
        d.gallery = withAdded(d.gallery, URL.createObjectURL(file));
        renderProductEditor();
    }
}

// Mga button sa editor.
// Time O(n²) · Space O(n)
function onProductEditorClick(e) {
    var t = e.target.closest('button');
    if (!t) return;
    var d = deskSheetState.draft;
    if (t.hasAttribute('data-sheet-dismiss')) { sheetClose(deskSheet); return; }
    if (t.hasAttribute('data-img-cover')) {
        var src = d.gallery[Number(t.getAttribute('data-img-cover'))];
        var rest = removeValue(d.gallery, src), cover = [src];
        for (var i = 0; i < rest.length; i++) listAdd(cover, rest[i]);
        d.gallery = cover;
    } else if (t.hasAttribute('data-img-remove')) {
        d.gallery = removeValue(d.gallery, d.gallery[Number(t.getAttribute('data-img-remove'))]);
    } else if (t.hasAttribute('data-img-add')) {
        var pick = $('#imagePick').value;
        if (isIn(d.gallery, pick)) { toast({ title: 'That image is already in the gallery.', kind: 'info' }); return; }
        d.gallery = withAdded(d.gallery, pick);
    } else if (t.hasAttribute('data-colors-all')) {
        d.colors = [];
        for (var c = 0; c < COLORS.length; c++) listAdd(d.colors, COLORS[c].id);
    } else if (t.hasAttribute('data-colors-none')) {
        d.colors = [];
    } else if (t.hasAttribute('data-p-row-add')) {
        // Yung inaalok lang ng arrangement ang may presyo.
        var priced = [];
        for (var p = 0; p < d.priceTable.length; p++) listAdd(priced, d.priceTable[p].count);
        var free = firstWhere(offeredCounts(d.arrangements), function (n) { return !isIn(priced, n); });
        if (free === null) { toast({ title: 'Every flower count on offer already has a price.', kind: 'info' }); return; }
        var last = d.priceTable.length > 0 ? d.priceTable[d.priceTable.length - 1] : { price: 0 };
        d.priceTable = insertionSort(withAdded(d.priceTable, { count: free, price: last.price }), function (x, y) { return x.count - y.count; });
    } else if (t.hasAttribute('data-p-row-remove')) {
        d.priceTable = removeValue(d.priceTable, d.priceTable[Number(t.getAttribute('data-p-row-remove'))]);
    } else if (t.hasAttribute('data-p-save')) {
        var saved = updateProduct(deskSheetState.productId, d);
        if (!saved.ok) { deskSheetState.errors = [saved.error]; renderProductEditor(); return; }
        logAudit(Date.now(), deskActor(), 'Product edited: ' + saved.product.name, '', 'Price list, photos, options or wording');
        toast({ title: saved.product.name + ' saved', kind: 'success' });
        sheetClose(deskSheet);
        deskChanged();
        return;
    } else {
        return;
    }
    renderProductEditor();
}
