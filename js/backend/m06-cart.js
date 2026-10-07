/* =========================================================================
   MODULE 6 · CART
   Singly linked list ang cart (dsa/linked-list.js): O(1) ang dagdag sa
   dulo, isang link lang pag nag-remove, at O(1) din ang pag-edit ng line
   kasi nasa array ang mga node.
   ========================================================================= */

// Dagdag sa cart (sa dulo ng linked list).
// Time O(1) · Space O(1)
function basketAdd(item) {
    return llAppend(basket, item);
}

// Tanggal sa cart.
// Time O(n) · Space O(1)
function basketRemove(index) {
    return llRemove(basket, index);
}

// Ibinabalik yung na-edit na line sa pwesto niya sa cart.
// Nasa array yung nodes ng linked list kaya diretso na.
// Time O(1) · Space O(1)
function basketReplace(index, item) {
    return llUpdate(basket, index, item);
}

// Palit ng quantity ng isang line, sumusunod yung estimate.
// Time O(1) · Space O(1)
function basketSetQuantity(index, quantity) {
    var item = llGet(basket, index);
    if (!item || !isWholeIn(quantity, 1, MAX_QUANTITY)) return false;
    return llUpdate(basket, index, copyRecord(item, { quantity: quantity, estimate: item.unitEstimate * quantity }));
}

// Lahat ng line ng cart kasama yung index.
// Time O(n) · Space O(n)
function basketEntries() { return llEntries(basket); }

// Lahat ng item sa cart.
// Time O(n) · Space O(n)
function basketItems() { return llValues(basket); }

// Yung cart sa presyo ngayon. Kung nagbago yung price list,
// yung bagong presyo ang sisingilin.
// Time O(n²) · Space O(n)
function repricedCart() {
    var items = basketItems(), out = [];
    for (var i = 0; i < items.length; i++) {
        var product = productById(items[i].productId), item = items[i];
        if (product && product.kind !== 'quote') {
            var unit = (product.kind === 'fixed' ? product.price : priceForCount(product, item.count)) +
                       addonsTotal(item.addons, product.kind === 'flower' ? item.count : 0);
            item = copyRecord(item, { unitEstimate: unit, estimate: unit * item.quantity });
        }
        listAdd(out, item);
    }
    return out;
}

// Total na piraso sa lahat ng line.
// Time O(n) · Space O(n)
function basketCount() {
    return sumRecursive(basketItems(), function (item) { return item.quantity; });
}

// Sum ng mga presyo galing sa price list.
// Time O(n) · Space O(n)
function basketEstimate() {
    return sumRecursive(basketItems(), function (item) { return item.estimate; });
}

// May item ba na owner pa ang magpe-presyo?
// Time O(n) · Space O(n)
function basketHasQuoteItems() {
    return countWhere(basketItems(), function (item) { return item.kind === 'quote'; }) > 0;
}

// Mga line sa cart na disabled na yung product.
// Time O(n²) · Space O(n)
function unavailableBasketItems() {
    return keepWhere(basketItems(), function (item) {
        var product = productById(item.productId);
        return !product || !product.active;
    });
}
