/* =========================================================================
   SHOP · CATALOGUE — best sellers, category tree, search and sort.

   The category chips walk the n-ary tree; the search box is a linear
   search; the sort control is an insertion sort; the best-seller strip is a
   selection sort over counts taken from real, paid orders.
   Depends on ui.js and store.js.
   ========================================================================= */

var catalogState = { query: '', branch: '', line: '', sort: 'best' };

var SORTS = [
    { id: 'best', compare: function (a, b) { return salesRank(b) - salesRank(a); } },
    { id: 'name', compare: function (a, b) { return compareText(a.product.name, b.product.name); } },
    { id: 'price', compare: function (a, b) {
        // Customized pricing has no starting figure, so it sorts last.
        var x = productStartsAt(a.product), y = productStartsAt(b.product);
        if (x === 0 && y === 0) return 0;
        if (x === 0) return 1;
        if (y === 0) return -1;
        return x - y;
    } },
    { id: 'newest', compare: function (a, b) {
        return a.product.addedOn < b.product.addedOn ? 1 : (a.product.addedOn > b.product.addedOn ? -1 : 0);
    } }
];

/* =========================================================================
   CARDS
   ========================================================================= */

/* A few colour dots for a flower bouquet.  Time O(n) · Space O(n) */
function swatchRow(product) {
    if (product.kind !== 'flower') return '';
    var shown = copyRange(product.colors, 0, 6), more = product.colors.length - shown.length;
    return '<span class="swatch-row" aria-label="' + product.colors.length + ' colours">' +
        renderEach(shown, function (id) {
            var c = colorById(id);
            return '<span class="swatch" style="background:' + escapeHtml(c.hex) + '" title="' + escapeHtml(c.name) + '"></span>';
        }) + (more > 0 ? '<span class="swatch-more">+' + more + '</span>' : '') + '</span>';
}

/* One product card.                      Time O(n) · Space O(n) */
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

/* =========================================================================
   BEST SELLERS
   ========================================================================= */

/*                                        Time O(n²) · Space O(n) */
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

/* =========================================================================
   CATEGORY CHIPS — the tree's first two levels
   ========================================================================= */

/*                                        Time O(n) · Space O(n) */
function chip(label, value, pressed, attr) {
    return '<button class="chip" type="button" ' + attr + '="' + escapeHtml(value) + '" aria-pressed="' +
           (pressed ? 'true' : 'false') + '">' + escapeHtml(label) + '</button>';
}

/*                                        Time O(n) · Space O(n) */
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

/* =========================================================================
   FILTER → SEARCH → SORT
   ========================================================================= */

/* Everything a customer might type that should find this product.
                                          Time O(n) · Space O(n) */
function searchText(product) {
    var branch = productBranch(product), node = treeNode(categoryTree, treeFind(categoryTree, product.line));
    var colours = product.kind === 'flower'
        ? renderEach(product.colors, function (id) { return colorById(id).name; }, ' ') : '';
    return product.name + ' ' + (node ? node.label : '') + ' ' + (branch ? branch.label : '') + ' ' +
           product.blurb + ' ' + glue(product.materials, ' ') + ' ' + colours;
}

/* The rows to show, in order.            Time O(n²) · Space O(n) */
function catalogRows() {
    var slug = catalogState.line || catalogState.branch;
    var leaves = slug ? treeLeaves(categoryTree, treeFind(categoryTree, slug)) : null;
    var inBranch = keepWhere(activeProducts(), function (p) { return leaves === null || isIn(leaves, p.line); });
    var found = linearSearch(inBranch, catalogState.query, searchText);

    var tally = salesTally(), rows = [];
    for (var i = 0; i < found.length; i++) {
        var t = firstWhere(tally, function (r) { return r.product.id === found[i].id; });
        listAdd(rows, { product: found[i], orders: t ? t.orders : 0, units: t ? t.units : 0 });
    }
    var sort = firstWhere(SORTS, function (s) { return s.id === catalogState.sort; }) || SORTS[0];
    return insertionSort(rows, sort.compare);
}

/*                                        Time O(n²) · Space O(n) */
function renderCatalog() {
    var rows = catalogRows(), total = activeProducts().length;
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

/* Redraw everything a sale or a product edit can change.  Time O(n²) · Space O(n) */
function refreshShop() {
    renderBestSellers();
    renderCategoryChips();
    renderCatalog();
}

/* =========================================================================
   STATIC SECTIONS
   ========================================================================= */

/*                                        Time O(n) · Space O(n) */
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

/* =========================================================================
   WIRING
   ========================================================================= */

/*                                        Time O(1)  · Space O(1) */
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
