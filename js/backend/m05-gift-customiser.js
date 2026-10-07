/* =========================================================================
   MODULE 5 · GIFT CUSTOMISER
   Money, makeup, sweets, diaper at beer-can cake: owner ang magpe-presyo
   (quotation). Para sa money bouquet, greedy ang nagsasabi ng
   pinakakaunting bills (dsa/greedy.js). Ang picture bouquet may fixed price.
   ========================================================================= */

// Chine-check yung napiling gift tapos ginagawa yung item. Yung quote
// products, owner ang magpe-presyo. Yung fixed price (picture), dito na.
// choice: { size, count, detail, provided, quantity, addons, cardFlower, notes, reference }
// Time O(n) · Space O(n)
function makeQuoteItem(product, choice) {
    if (!product || !product.active || (product.kind !== 'quote' && product.kind !== 'fixed')) {
        return { ok: false, error: 'This item is not available.' };
    }
    var type = quoteTypeById(product.quoteType);
    if (!isIn(product.sizes, choice.size)) return { ok: false, error: 'Choose a size.' };
    if (!isWholeIn(choice.count, 1, 500)) return { ok: false, error: type.countLabel + ' must be a whole number from 1 to 500.' };
    if (!isWholeIn(choice.quantity, 1, MAX_QUANTITY)) return { ok: false, error: 'Quantity must be 1 to ' + MAX_QUANTITY + '.' };
    if (String(choice.detail || '').length > 160) return { ok: false, error: 'Keep the details under 160 characters.' };
    if (String(choice.notes || '').length > MAX_NOTE) return { ok: false, error: 'Notes are limited to ' + MAX_NOTE + ' characters.' };

    var addons = keepWhere(choice.addons || [], function (id) {
        var addon = addonById(id);
        return addon !== null && !addon.flowersOnly;
    });
    var unit = (product.kind === 'fixed' ? product.price : 0) + addonsTotal(addons, 0);
    return { ok: true, item: {
        productId: product.id, productName: product.name, kind: product.kind, quoteType: product.quoteType,
        arrangement: '', count: choice.count, color: '',
        size: choice.size, detail: strip(choice.detail),
        provided: type.provided ? choice.provided === true : false,
        quantity: choice.quantity, addons: addons,
        cardFlower: isIn(addons, 'card') ? (choice.cardFlower || CARD_FLOWERS[0]) : '',
        notes: strip(choice.notes), reference: choice.reference || null,
        unitEstimate: unit, estimate: unit * choice.quantity,
        materials: 0, labor: 0, itemExpense: 0
    } };
}
