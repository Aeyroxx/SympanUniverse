/* =========================================================================
   SHOP · CATALOGUE
   Product cards, best sellers, category chips, at yung search at sort.
   Ang logic ay nasa backend (module 1, 2 at 3); dito yung pagpapakita.
   ========================================================================= */

var catalogState = { query: '', branch: '', line: '', sort: 'best' };

// ---------- Cards ----------

// Ilang kulay na tuldok para sa flower bouquet.
// Time O(n) · Space O(n)
function swatchRow(product) {
    if (product.kind !== 'flower') return '';
    var shown = copyRange(product.colors, 0, 6), more = product.colors.length - shown.length;
    return '<span class="swatch-row" aria-label="' + product.colors.length + ' colours">' +
        renderEach(shown, function (id) {
            var c = colorById(id);
            return '<span class="swatch" style="background:' + escapeHtml(c.hex) + '" title="' + escapeHtml(c.name) + '"></span>';
        }) + (more > 0 ? '<span class="swatch-more">+' + more + '</span>' : '') + '</span>';
}

// Isang product card.
// Time O(n) · Space O(n)
function productCard(row, bestIds) {
    var p = row.product, best = isIn(bestIds, p.id);
    var branch = productBranch(p);
    return '<article class="card-product">' +
        '<button class="card-hit" type="button" data-open-product="' + p.id + '" aria-label="View ' + escapeHtml(p.name) + '"></button>' +
        '<div class="card-media">' + imageOrEmpty(productCover(p), p.name) +
            '<div class="card-badges">' +
                (best ? '<span class="badge badge-ink">' + icon('star', 12) + ' Best seller</span>' : '') +
                (photoCredit(productCover(p)) ? '<span class="badge badge-sample">Sample photo</span>' : '') +
            '</div>' +
        '</div>' +
        '<div class="card-body">' +
            '<p class="t-caption dim">' + escapeHtml(branch ? branch.label : '') + '</p>' +
            '<h3 class="card-name t-callout">' + escapeHtml(p.name) + '</h3>' +
            '<p class="card-price-line"><span class="card-price">' + escapeHtml(priceLabel(p)) + '</span></p>' +
            '<p class="card-vary t-caption dim">' + (p.kind === 'fixed' ? 'One price per bouquet.'
                : p.kind === 'quote' ? 'Price varies depending on size, quantity, and design. Quote request.'
                : 'Price varies depending on size, quantity, and design.') + '</p>' +
            '<p class="card-blurb t-foot">' + escapeHtml(p.blurb) + '</p>' +
            '<div class="card-foot"><span class="t-caption dim">' + row.units + ' sold</span>' + swatchRow(p) + '</div>' +
        '</div>' +
    '</article>';
}

// ---------- Best sellers ----------

// Ipinapakita yung best sellers sa home.
// Time O(n²) · Space O(n)
function renderBestSellers() {
    var top = bestSellers(3), ids = [];
    for (var i = 0; i < top.length; i++) listAdd(ids, top[i].product.id);
    var grid = $('#bestSellers');
    if (top.length === 0) {
        grid.innerHTML = '<p class="t-callout dim">No paid orders yet — the first ones will appear here.</p>';
        return;
    }
    var rows = [];
    for (var k = 0; k < top.length; k++) listAdd(rows, { product: top[k].product, orders: top[k].orders, units: top[k].units });
    grid.innerHTML = renderEach(rows, function (row) { return productCard(row, ids); });
}

// ---------- Category chips ----------

// Isang chip ng category.
// Time O(n) · Space O(n)
function chip(label, value, pressed, attr) {
    return '<button class="chip" type="button" ' + attr + '="' + escapeHtml(value) + '" aria-pressed="' +
           (pressed ? 'true' : 'false') + '">' + escapeHtml(label) + '</button>';
}

// Mga chip ng branch at line galing sa category tree.
// Time O(n) · Space O(n)
function renderCategoryChips() {
    var branches = treeChildren(categoryTree, categoryTree.root);
    $('#categoryChips').innerHTML = chip('All', '', catalogState.branch === '', 'data-branch') +
        renderEach(branches, function (at) {
            var node = treeNode(categoryTree, at);
            return chip(node.label, node.slug, catalogState.branch === node.slug, 'data-branch');
        });

    var lineRow = $('#lineChips');
    if (!catalogState.branch) { setHidden(lineRow, true); return; }
    var lines = treeChildren(categoryTree, treeFind(categoryTree, catalogState.branch));
    lineRow.innerHTML = chip('Every line', '', catalogState.line === '', 'data-line') +
        renderEach(lines, function (at) {
            var node = treeNode(categoryTree, at);
            return chip(node.label, node.slug, catalogState.line === node.slug, 'data-line');
        });
    setHidden(lineRow, false);
}

// ---------- Catalogue ----------

// Ipinapakita yung catalogue ayon sa filter, search at sort.
// Time O(n²) · Space O(n)
function renderCatalog() {
    var rows = catalogRows(catalogState), total = activeProducts().length;
    var top = bestSellers(3), ids = [];
    for (var i = 0; i < top.length; i++) listAdd(ids, top[i].product.id);

    var grid = $('#catalogGrid');
    if (rows.length === 0) {
        grid.innerHTML = '<div class="empty" style="grid-column:1/-1"><div class="empty-glyph">' + icon('search') +
            '</div><h3 class="t-title3">Nothing matches that</h3><p class="t-callout">Try another word, or clear the filters.</p></div>';
    } else {
        grid.innerHTML = renderEach(rows, function (row) { return productCard(row, ids); });
    }
    var filtered = catalogState.query || catalogState.branch;
    $('#resultCount').textContent = filtered
        ? rows.length + ' of ' + total + ' ' + plural(total, 'item') + ' match'
        : total + ' ' + plural(total, 'item');
    setHidden($('#clearFilters'), !filtered);
}

// I-render ulit lahat ng pwedeng magbago pag may benta o edit.
// Time O(n²) · Space O(n)
function refreshShop() {
    renderBestSellers();
    renderCategoryChips();
    renderCatalog();
}

// Mga di nagbabagong parte ng shop (header, footer).
// Time O(n) · Space O(n)
function renderShopChrome() {
    $('#trustRow').innerHTML =
        '<span>' + icon('sparkle') + 'Handmade to order</span>' +
        '<span>' + icon('tag') + 'Price list, or a quote for gifts</span>' +
        '<span>' + icon('truck') + 'Free delivery in Brgy. Lawa</span>' +
        '<span>' + icon('check') + 'GCash · 50% or full</span>';

    var steps = [
        ['Choose', 'Pick a bouquet or cake and set the size, colour, quantity and design, then add it to your cart.'],
        ['Check out', 'Flower and picture bouquets are priced from the price list: pay 50% or in full by GCash and your order is confirmed by email at once.'],
        ['Quote, if needed', 'Money, makeup, sweets, diaper and beer gifts are quoted by the owner from materials and labour. You get the quotation by email.'],
        ['Track it', 'Your tracking number comes by email. We email you again when your order is ready.']
    ];
    $('#howSteps').innerHTML = renderEach(steps, function (s, i) {
        return '<li class="how-step"><span class="how-num">' + (i + 1) + '</span><h3 class="t-title3">' +
               escapeHtml(s[0]) + '</h3><p class="t-callout dim">' + escapeHtml(s[1]) + '</p></li>';
    });

    $('#visitList').innerHTML = '<li>' + escapeHtml(SHOP_INFO.address) + '</li><li class="mt-3">' +
        escapeHtml(SHOP_INFO.hours) + '</li>';
    $('#contactList').innerHTML =
        '<li>Facebook / Instagram: ' + escapeHtml(SHOP_INFO.social) + '</li>' +
        '<li><a class="link" href="mailto:' + escapeHtml(SHOP_INFO.email) + '">' + escapeHtml(SHOP_INFO.email) + '</a></li>';
    $('#year').textContent = textPart(todayIso(), 0, 4);
    $('#searchIcon').innerHTML = icon('search');
}

// Kinakabit yung mga event ng catalogue.
// Time O(1) · Space O(1)
function initCatalog() {
    renderShopChrome();
    refreshShop();

    var search = debounce(function (value) { catalogState.query = value; renderCatalog(); }, 140);
    $('#searchInput').addEventListener('input', function (e) { search(e.target.value); });
    $('#sortSelect').addEventListener('change', function (e) { catalogState.sort = e.target.value; renderCatalog(); });

    on($('#categoryChips'), 'click', '[data-branch]', function (e, b) {
        catalogState.branch = b.getAttribute('data-branch');
        catalogState.line = '';
        renderCategoryChips();
        renderCatalog();
    });
    on($('#lineChips'), 'click', '[data-line]', function (e, b) {
        catalogState.line = b.getAttribute('data-line');
        renderCategoryChips();
        renderCatalog();
    });
    $('#clearFilters').addEventListener('click', function () {
        catalogState.query = '';
        catalogState.branch = '';
        catalogState.line = '';
        $('#searchInput').value = '';
        renderCategoryChips();
        renderCatalog();
    });
    on(document.body, 'click', '[data-open-product]', function (e, b) {
        openProduct(Number(b.getAttribute('data-open-product')));
    });
}
