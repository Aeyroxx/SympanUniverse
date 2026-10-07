/* =========================================================================
   MODULE 3 · SEARCH AT SORT
   Search box: linear search na may naive string matching (kahit saan sa
   pangalan, materials o kulay). Sort: insertion sort, stable.
   ========================================================================= */

// Mga paraan ng pag-sort sa catalogue.
var SORTS = [
    { id: 'best', compare: function (a, b) { return salesRank(b) - salesRank(a); } },
    { id: 'name', compare: function (a, b) { return compareText(a.product.name, b.product.name); } },
    { id: 'price', compare: function (a, b) {
        // Walang starting price ang Customized Pricing, kaya huli.
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

// Lahat ng pwedeng i-type ng customer para mahanap yung product.
// Time O(n) · Space O(n)
function searchText(product) {
    var branch = productBranch(product), node = treeNode(categoryTree, treeFind(categoryTree, product.line));
    var colours = product.kind === 'flower'
        ? renderEach(product.colors, function (id) { return colorById(id).name; }, ' ') : '';
    return product.name + ' ' + (node ? node.label : '') + ' ' + (branch ? branch.label : '') + ' ' +
           product.blurb + ' ' + glue(product.materials, ' ') + ' ' + colours;
}

// Mga product na ipapakita: filter sa category, search, tapos sort.
// filter: { line, branch, query, sort }
// Time O(n²) · Space O(n)
function catalogRows(filter) {
    var inBranch = productsUnder(filter.line || filter.branch);
    var found = linearSearch(inBranch, filter.query, searchText);

    var tally = salesTally(), rows = [];
    for (var i = 0; i < found.length; i++) {
        var t = firstWhere(tally, function (r) { return r.product.id === found[i].id; });
        listAdd(rows, { product: found[i], orders: t ? t.orders : 0, units: t ? t.units : 0 });
    }
    var sort = firstWhere(SORTS, function (s) { return s.id === filter.sort; }) || SORTS[0];
    return insertionSort(rows, sort.compare);
}
