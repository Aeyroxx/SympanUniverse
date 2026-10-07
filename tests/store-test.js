/* =========================================================================
   STORE TESTS — the whole order lifecycle, run against the real code.

   Price-list carts (flowers, the picture bouquet) are priced and paid at
   checkout; carts with one of the five quote products go to the quote
   queue. Payments, receipts, production, "ready", voids and expiry, each
   with its email; editing; products; delivery fees; best sellers by
   pieces sold; the Overview's day / month / year figures; the two-step
   sign-in; and the EmailJS sender.
   Run: node tests/store-test.js
   ========================================================================= */

var t = require('./harness');
var check = t.check, section = t.section;
var storeFiles = t.backendScripts();
var screens = ['frontend/ui/dom', 'frontend/ui/motion', 'frontend/ui/toasts', 'frontend/ui/sheets', 'frontend/ui/parts', 'frontend/ui/receipt',
               'frontend/desk/sign-in', 'frontend/desk/password-reset'];
for (var sc = 0; sc < screens.length; sc++) storeFiles[storeFiles.length] = screens[sc];
var app = t.loadApp(storeFiles);

var BASE = new Date(2026, 9, 5, 12, 0, 0, 0);   // Monday 5 October 2026, noon
var NOW = BASE.getTime();
var HOUR = 3600000, DAY = 24 * HOUR;
var refCount = 0;

/* A fresh 13-digit GCash reference: one reference cannot pay twice.
                                           Time O(1) · Space O(1) */
function freshRef() {
    refCount++;
    return '7' + app.leftPad(refCount, 12, '0');
}

/* Fill the cart with lines.               Time O(n) · Space O(n) */
function fillCart(lines) {
    app.llClear(app.basket);
    for (var i = 0; i < lines.length; i++) {
        var product = app.productById(lines[i].id);
        var made = product.kind === 'flower' ? app.makeFlowerItem(product, lines[i].choice) : app.makeQuoteItem(product, lines[i].choice);
        if (!made.ok) return made.error;
        app.basketAdd(made.item);
    }
    return '';
}

/* A checkout form with sensible defaults.  Time O(1) · Space O(1) */
function form(changes) {
    return app.copyRecord({ name: 'Test Customer', phone: '0917 555 9999', email: 'test.customer@gmail.com', handle: '',
        mode: 'pickup', date: '2026-10-08', slot: '', address: '', barangay: '', city: '', courier: '', rush: false, notes: '',
        consent: true, terms: true }, changes);
}

/* Submit a cart: a price-list cart comes back priced, a quote cart requested.
                                           Time O(n) · Space O(n) */
function request(lines, changes, stamp) {
    var problem = fillCart(lines);
    if (problem) return { ok: false, errors: [{ message: problem }] };
    return app.submitRequest(form(changes), stamp || NOW);
}

/* The most recent email, or null.         Time O(1) · Space O(1) */
function lastMail() {
    return app.outbox.length > 0 ? app.outbox[app.outbox.length - 1] : null;
}

/* Fill every zero line of a draft so it can be sent.  Time O(n) · Space O(1) */
function priced(draft) {
    for (var i = 0; i < draft.lines.length; i++) {
        if (app.lineTotal(draft.lines[i]) <= 0) draft.lines[i] = { materials: 200, labor: 300, itemExpense: 0 };
    }
    return draft;
}

var ROSE = { id: 101, choice: { arrangement: 'round', count: 12, color: 'red', quantity: 1, addons: ['card'], cardFlower: 'Rose', notes: '' } };
var PICTURE = { id: 203, choice: { size: 'Standard', count: 8, detail: '4R prints', provided: false, quantity: 1, addons: [], notes: '' } };
var MONEY = { id: 201, choice: { size: 'Medium', count: 20, detail: '5000', provided: true, quantity: 1, addons: [], notes: '' } };

/* ===================================================================== */
section('seed history');
var failed = app.seedShop(NOW);
check('every seeded event ran through the real lifecycle', failed.length === 0, app.glue(failed, ', '));
check('22 seeded orders', app.orders.length === 22, app.orders.length);
check('statuses', app.ordersWithStatus('requested').length === 2 && app.ordersWithStatus('quoted').length === 1 &&
      app.ordersWithStatus('paid').length === 2 && app.ordersWithStatus('completed').length === 14 &&
      app.ordersWithStatus('voided').length === 3);
check('quote queue holds only quote requests, in arrival order', app.glue(app.cqValues(app.quoteQueue), ',') === '220,221');
check('rush lane SU-218, standard lane SU-217', app.heapPeek(app.rushLane) === 218 && app.cqFront(app.standardLane) === 217);
check('pickups are booked by date only', app.countWhere(app.orders, function (o) {
    return o.fulfilment.mode === 'pickup' && o.fulfilment.slot !== '';
}) === 0);
check('demo customers live on example.com', app.countWhere(app.orders, function (o) {
    return !app.textHas(o.customer.email, '@example.com');
}) === 0);
check('replaying history sends no email', app.outbox.length === 0 && app.mailEnabled === false);
check('undo starts empty: it covers this session, not the seeded weeks', app.stackSize(app.completedStack) === 0);
check('cart starts empty', app.llIsEmpty(app.basket));
var replayInOrder = true;
for (var ri = 1; ri < app.auditLog.length; ri++) if (app.auditLog[ri].stamp < app.auditLog[ri - 1].stamp) replayInOrder = false;
check('the replayed history is in the audit log, in time order', app.auditLog.length > 50 && replayInOrder);

section('colour reference photographs');
var missing = [], reals = 0;
for (var f = 0; f < app.FLOWERS.length; f++) {
    for (var a = 0; a < app.ARRANGEMENTS.length; a++) {
        for (var c = 0; c < app.COLORS.length; c++) {
            var photo = app.referenceImage(app.FLOWERS[f], app.ARRANGEMENTS[a].id, app.COLORS[c].id);
            if (!photo || !t.exists(photo.src)) app.listAdd(missing, app.FLOWERS[f] + '/' + app.ARRANGEMENTS[a].id + '/' + app.COLORS[c].id);
            else if (photo.real) reals++;
        }
    }
}
check('every flower × arrangement × colour has a photograph on disk (160)', missing.length === 0, app.glue(missing, ', '));
check('14 of them are real photographs', reals === 14, reals);
check('round and layered use different photographs',
      app.referenceImage('rose', 'round', 'peach').src !== app.referenceImage('rose', 'layered', 'peach').src);

section('delivery fees');
var dq = function (city, barangay, courier) { return app.deliveryQuote({ mode: 'delivery', city: city, barangay: barangay || '', courier: courier || '' }); };
check('pickup is free', app.deliveryQuote({ mode: 'pickup' }).fee === 0);
check('Brgy. Lawa is free, however it is written', dq('Meycauayan', 'Lawa').fee === 0 && dq('Meycauayan', 'Brgy. Lawa').fee === 0);
check('elsewhere in Meycauayan ₱20, Marilao ₱35, Valenzuela ₱50', dq('meycauayan city', 'Malhacan').fee === 20 &&
      dq('  MARILAO , Bulacan').fee === 35 && dq('Valenzuela').fee === 50);
check('courier rates by city and courier', dq('Manila', '', 'flash').fee === 120 && dq('quezon   city', '', 'lalamove').fee === 220);
check('an unknown city has no rate', dq('Cebu City', '', 'flash').status === 'manual');

section('which products are quoted');
var quoteIds = [];
for (var q = 0; q < app.products.length; q++) if (app.products[q].kind === 'quote') app.listAdd(quoteIds, app.products[q].id);
check('only money, makeup, sweets, diaper cake and beer cake take a quote', app.glue(quoteIds, ',') === '201,202,204,301,302', app.glue(quoteIds, ','));
check('flowers start at their cheapest build', app.priceLabel(app.productById(101)) === 'Starts at ₱55');
check('the picture bouquet has one price', app.priceLabel(app.productById(203)) === '₱650' &&
      app.makeQuoteItem(app.productById(203), PICTURE.choice).item.estimate === 650);
check('quote products show Customized Pricing', app.priceLabel(app.productById(302)) === 'Customized Pricing');
check('Custom Bouquet is gone', app.countWhere(app.products, function (p) { return app.textHas(app.toLower(p.name), 'custom'); }) === 0);

section('checkout validation');
app.llClear(app.basket);
var empty = app.submitRequest({ name: 'A', phone: 'x', email: 'nope', mode: 'pickup', date: '', slot: '' }, NOW);
check('empty cart, name, phone, email and date are all reported', !empty.ok && empty.errors.length >= 5);
check('an email address is required', app.firstWhere(request([ROSE], { email: 'not-an-email' }).errors || [], function (e) { return e.field === 'email'; }) !== null);
check('isValidEmail', app.isValidEmail('a.b@gmail.com') && !app.isValidEmail('a@b') && !app.isValidEmail('a b@c.com') && !app.isValidEmail('@x.com'));
check('a pickup needs no time', app.validateRequest(form({ slot: '' }), app.basketItems(), '2026-10-05').length === 0);
check('a delivery needs a time', app.firstWhere(app.validateRequest(form({ mode: 'delivery', address: '1 St', city: 'Manila', courier: 'flash', slot: '' }),
      app.basketItems(), '2026-10-05'), function (e) { return e.field === 'slot'; }) !== null);
var weekday = request([ROSE], { mode: 'delivery', address: '1 St', barangay: 'Saog', city: 'Marilao', slot: '09:00 AM' });
check('the shop\'s own delivery is Friday to Sunday only', !weekday.ok && app.textHas(weekday.errors[0].message, 'Friday'));

/* From here on, every step emails the customer. */
app.mailEnabled = true;

section('a price-list cart is priced and paid at checkout');
var before = app.orders.length;
fillCart([ROSE, PICTURE]);
var badPay = app.placeOrder(form({}), 'gcash-100', '123', NOW);
check('a bad GCash reference creates no order', !badPay.ok && badPay.errors[0].field === 'gcash' && app.orders.length === before);
var placed = app.placeOrder(form({}), 'gcash-100', freshRef(), NOW);
check('placed and paid in one step', placed.ok && placed.order.status === 'paid' && placed.order.ref === 'SU-223');
check('priced from the price list, with no quote', placed.order.quoteNote === 'Priced automatically from the price list.' &&
      app.orderTotal(placed.order) === 575 + 650 && !app.isIn(app.cqValues(app.quoteQueue), placed.order.id));
check('full payment receipt', placed.receipt.kind === 'Full payment' && placed.receipt.balance === 0 && placed.receipt.status === 'Fully paid');
var confirmation = lastMail();
check('the customer is emailed a confirmation with the tracking number', confirmation && confirmation.to === 'test.customer@gmail.com' &&
      confirmation.subject === 'Order confirmed: SU-223' && app.textHas(confirmation.body, 'Tracking number: SU-223') &&
      app.textHas(confirmation.body, placed.receipt.no));
check('emails wait in a first-in, first-out queue for sending', app.cqValues(app.mailQueue)[0] === app.outbox.length - 1);
fillCart([MONEY]);
check('a quote cart cannot be paid at checkout', !app.placeOrder(form({ date: '2026-10-09' }), 'gcash-100', freshRef(), NOW).ok);
fillCart([ROSE]);
var noRate = app.cartTotals(form({ mode: 'delivery', city: 'Davao', address: '1 St', courier: 'flash' }), app.basketItems());
var noRateErrors = app.validateRequest(form({ mode: 'delivery', city: 'Davao', address: '1 St', courier: 'flash', slot: '09:00 AM', date: '2026-10-09' }),
                                       app.basketItems(), '2026-10-05');
check('a flower cart is never turned into a quote request: a city with no rate is refused',
      noRate.needsQuote === true && app.firstWhere(noRateErrors, function (e) { return e.field === 'city'; }) !== null);
check('pickups are Monday to Saturday', app.firstWhere(app.validateRequest(form({ date: '2026-10-11' }), app.basketItems(), '2026-10-05'),
      function (e) { return app.textHas(e.message, 'Sundays'); }) !== null);
var cheapRose = app.productEditDraft(app.productById(101));
cheapRose.priceTable[6] = { count: 12, price: 500 };
app.updateProduct(101, cheapRose);
check('checkout charges the current price, not the price when it was added', app.repricedCart()[0].estimate === 500 + 20);
cheapRose.priceTable[6] = { count: 12, price: 555 };
app.updateProduct(101, cheapRose);
var courierCart = app.cartTotals(form({ mode: 'delivery', city: 'Manila', address: '1 St', courier: 'flash' }), app.basketItems());
check('a courier rate on file is charged without a quote', !courierCart.needsQuote && courierCart.total === 575 + 120);

section('a quote request, from request to ready');
var money = request([MONEY], { slot: '', date: '2026-10-09', email: 'buyer@gmail.com', phone: '0917 555 1234' }).order;
check('it joins the back of the quote queue', money.status === 'requested' && app.glue(app.cqValues(app.quoteQueue), ',') === '220,221,' + money.id);
check('and the customer is emailed the tracking number', lastMail().subject === 'We received your quote request ' + money.ref &&
      app.textHas(lastMail().body, 'Tracking number: ' + money.ref));
var draft = app.quoteDraft(money);
check('the quotation is pre-filled from the owner\'s past quotes for the same product and size',
      draft.lines[0].suggested >= 1 && draft.lines[0].sameSize === true && draft.lines[0].materials === 250 && draft.lines[0].labor === 300,
      JSON.stringify(draft.lines[0]));
var withCard = app.quoteDraft(request([{ id: 201, choice: { size: 'Large', count: 30, detail: '', provided: true, quantity: 1, addons: ['card'] } }],
                                      { date: '2026-10-09', phone: '0917 555 4322' }).order);
check('past add-ons are not counted twice in the pre-fill', withCard.lines[0].materials === 370, withCard.lines[0].materials);
var makeup = app.quoteDraft(request([{ id: 202, choice: { size: 'Large', count: 6, detail: '', provided: true, quantity: 1, addons: [] } }],
                                    { date: '2026-10-09', phone: '0917 555 4321' }).order);
check('with no quote at that size, another size is offered and marked', makeup.lines[0].suggested >= 1 && makeup.lines[0].sameSize === false);
var sent = app.sendQuote(money.id, draft, NOW + HOUR);
check('quotation sent and emailed as approved', sent.ok && money.status === 'quoted' && app.textHas(lastMail().subject, 'quotation for ' + money.ref) &&
      app.textHas(lastMail().body, 'approved'));
var down = app.acceptQuote(money.id, 'gcash-50', freshRef(), NOW + 2 * HOUR);
check('50% down payment: paid and outstanding on the receipt', down.ok && down.receipt.balance === app.orderTotal(money) / 2 &&
      down.receipt.status === 'Partially paid' && lastMail().subject === 'Order confirmed: ' + money.ref);
check('a GCash reference cannot pay twice', app.textHas(app.payBalance(money.id, down.receipt.gcashRef, NOW).error, 'already on receipt'));
var bal = app.payBalance(money.id, freshRef(), NOW + 3 * HOUR);
check('the balance payment is emailed', bal.ok && lastMail().subject === 'Payment received for ' + money.ref &&
      bal.receipt.method === 'GCash — balance after 50% down payment');
var guard = 0;
while (money.status !== 'completed' && guard < 10) {
    var nextUp = app.nextReleasable();
    if (nextUp && nextUp.id !== money.id && app.orderBalance(nextUp) <= 0) app.completeNext(NOW + 4 * HOUR);
    else if (nextUp && nextUp.id === money.id) app.completeNext(NOW + 4 * HOUR);
    else if (!nextUp) app.payBalance(app.productionLine()[0].id, freshRef(), NOW + 4 * HOUR);
    guard++;
}
check('marking it ready emails the customer', money.status === 'completed' && lastMail().subject === 'Your order ' + money.ref + ' is ready for pickup' &&
      app.textHas(lastMail().body, 'Friday, 9 October 2026'));

section('best sellers rank by pieces sold');
check('rose leads on pieces sold', app.bestSellers(1)[0].product.id === 101);
var plumeriaBefore = app.soldUnits(102), roseUnits = app.soldUnits(101);
fillCart([{ id: 102, choice: { arrangement: 'round', count: 12, color: 'purple', quantity: 10, addons: [] } }]);
var bulk = app.placeOrder(form({ date: '2026-10-09', phone: '0917 555 2468' }), 'gcash-100', freshRef(), NOW);
check('a large order counts every piece', bulk.ok && app.soldUnits(102) === plumeriaBefore + 10);
check('and moves the product up the ranking at once', app.bestSellers(1)[0].product.id === 102 && app.soldUnits(102) > roseUnits,
      app.bestSellers(1)[0].product.name);
app.voidOrder(bulk.order.id, 'Test', 'admin', NOW);
check('voided orders drop out again', app.bestSellers(1)[0].product.id === 101);

section('unpaid quotations expire by themselves');
var stale = request([MONEY], { date: '2026-10-10', phone: '0917 555 1357', email: 'late@gmail.com' }).order;
app.sendQuote(stale.id, priced(app.quoteDraft(stale)), NOW);
check('not before ' + app.QUOTE_EXPIRY_DAYS + ' days', !app.isIn(app.expireQuotes(NOW + 2 * DAY), stale) && stale.status === 'quoted');
var expired = app.expireQuotes(NOW + 4 * DAY);
check('after that, voided by the system', app.isIn(expired, stale) && stale.status === 'voided' && stale.voidedBy === 'System' &&
      app.textHas(stale.voidReason, 'expired'));
check('and the customer is told', lastMail().to === 'late@gmail.com' && lastMail().subject === 'Order ' + stale.ref + ' was cancelled');
var stale2 = request([MONEY], { date: '2026-10-10', phone: '0917 555 1358' }).order;
app.sendQuote(stale2.id, priced(app.quoteDraft(stale2)), NOW);
var latePay = app.acceptQuote(stale2.id, 'gcash-100', freshRef(), NOW + 3 * DAY + 30000);
check('an expired quotation cannot be paid, even before the sweep runs', !latePay.ok && stale2.status === 'voided');

section('Overview by day, month and year');
var year = app.periodReport('year', '2026'), month = app.periodReport('month', '2026-09');
var monthsCollected = app.sumRecursive(year.rows, function (r) { return r.totals.collected; });
var daysCollected = app.sumRecursive(month.rows, function (r) { return r.totals.collected; });
check('a year is the sum of its months', app.roundMoney(monthsCollected) === year.totals.collected && year.rows.length === 12);
check('a month is the sum of its days', app.roundMoney(daysCollected) === month.totals.collected && month.rows.length === 30);
var allCollected = app.roundMoney(app.sumRecursive(app.receipts, function (r) { return r.amount; }));
check('every receipt is counted once in its year', year.totals.collected === allCollected, year.totals.collected + ' vs ' + allCollected);
var today = app.periodReport('day', '2026-10-05');
check('a day lists the orders placed on it', today.orders.length === today.totals.placed && today.totals.placed > 0);
check('period best sellers are ranked by pieces sold', month.best.length > 0 && month.best[0].units >= month.best[month.best.length - 1].units);
check('periods move and read', app.shiftPeriod('month', '2026-01', -1) === '2025-12' && app.shiftPeriod('day', '2026-10-31', 1) === '2026-11-01' &&
      app.shiftPeriod('year', '2026', 1) === '2027' && app.periodLabel('month', '2026-10') === 'October 2026' && app.daysInMonth('2028-02') === 29);

section('editing an order');
var marilao = request([ROSE], { mode: 'delivery', address: '14 Sampaguita St.', barangay: 'Saog', city: 'Marilao',
                                date: '2026-10-09', slot: '02:00 PM', phone: '0917 555 6001' }).order;
check('a price-list delivery order is priced with its fee', marilao.status === 'quoted' && marilao.deliveryFee === 35 &&
      app.orderTotal(marilao) === 575 + 35);
var asPickup = app.orderEditDraft(marilao);
asPickup.mode = 'pickup';
var switched = app.editOrder(marilao.id, asPickup, NOW);
check('switching to pickup drops the time and the delivery fee', switched.ok && marilao.fulfilment.slot === '' && marilao.deliveryFee === 0 &&
      app.isIn(switched.changes, 'Fulfilment: Delivery → Pickup'), switched.ok ? app.glue(switched.changes, ' | ') : switched.error);
var newEmail = app.orderEditDraft(marilao);
newEmail.email = 'new.address@gmail.com';
check('the email can be corrected, and is logged', app.editOrder(marilao.id, newEmail, NOW).ok && marilao.customer.email === 'new.address@gmail.com');
var owing = request([MONEY], { date: '2026-10-10', phone: '0917 555 6002' }).order;
var paidUp = request([MONEY], { date: '2026-10-10', phone: '0917 555 6003' }).order;
app.sendQuote(owing.id, priced(app.quoteDraft(owing)), NOW);
app.sendQuote(paidUp.id, priced(app.quoteDraft(paidUp)), NOW);
app.acceptQuote(owing.id, 'gcash-50', freshRef(), NOW + HOUR);
app.acceptQuote(paidUp.id, 'gcash-100', freshRef(), NOW + 2 * HOUR);
var lineBefore = app.glue(app.cqValues(app.standardLane), ',');
var later = app.orderEditDraft(owing);
later.date = '2026-10-11';
app.editOrder(owing.id, later, NOW);
check('changing a standard order\'s date keeps its place in line', app.glue(app.cqValues(app.standardLane), ',') === lineBefore);
while (app.nextReleasable() && app.nextReleasable().id !== paidUp.id) app.completeNext(NOW + 3 * HOUR);
var skipped = app.completeNext(NOW + 3 * HOUR);
check('an order still owing does not hold up a paid one behind it', skipped.ok && skipped.order.id === paidUp.id &&
      app.firstWhere(skipped.skipped, function (o) { return o.id === owing.id; }) !== null);
app.undoCompletion(NOW + 4 * HOUR);
var lineAfter = app.cqValues(app.standardLane);
check('undo puts it back behind the order it skipped', app.positionIn(lineAfter, paidUp.id) === app.positionIn(lineAfter, owing.id) + 1);

section('earlier regressions');
var quoteMe = request([MONEY], { date: '2026-10-10', phone: '0917 555 7001', mode: 'delivery', address: '1 St', city: 'Davao', courier: 'flash', slot: '11:00 AM' }).order;
var blank = app.quoteDraft(quoteMe);
blank.lines[0] = { materials: 0, labor: 0, itemExpense: 0 };
check('an unpriced line blocks the quotation', !app.sendQuote(quoteMe.id, blank, NOW).ok);
var noFee = priced(app.quoteDraft(quoteMe));
noFee.deliveryFee = 0;
check('a courier fee of zero is refused', !app.sendQuote(quoteMe.id, noFee, NOW).ok);
noFee.deliveryFee = 300;
check('an entered courier fee is confirmed', app.sendQuote(quoteMe.id, noFee, NOW).ok && quoteMe.delivery.status === 'confirmed' &&
      quoteMe.delivery.label === 'Flash Express to Davao');
var zeroed = app.orderEditDraft(quoteMe);
zeroed.items[0] = app.copyRecord(zeroed.items[0], { materials: 0, labor: 0 });
check('a quoted line cannot be edited down to nothing', !app.editOrder(quoteMe.id, zeroed, NOW).ok);
var moveCity = app.orderEditDraft(quoteMe);
moveCity.city = 'Marilao';
moveCity.courier = '';
moveCity.date = '2026-10-10';
var moved = app.editOrder(quoteMe.id, moveCity, NOW);
check('a new city recomputes the delivery', moved.ok && quoteMe.delivery.service === 'inhouse' && quoteMe.deliveryFee === 35,
      moved.ok ? quoteMe.delivery.label : moved.error);

var laterRush = request([ROSE], { rush: true, date: '2026-10-09', phone: '0917 555 7002' }).order;
var soonerRush = request([ROSE], { rush: true, date: '2026-10-06', phone: '0917 555 7003' }).order;
check('rush fee is charged automatically', laterRush.rushFee === 50);
app.acceptQuote(laterRush.id, 'gcash-100', freshRef(), NOW + HOUR);
app.acceptQuote(soonerRush.id, 'gcash-100', freshRef(), NOW + 2 * HOUR);
check('the earlier due date is made first, though paid second', app.nextInProduction().id === soonerRush.id);
var voided = app.voidOrder(soonerRush.id, 'Changed plans', 'admin', NOW + 3 * HOUR);
check('voided, kept, labelled, payment retained', voided.ok && app.orderById(soonerRush.id) === soonerRush &&
      app.statusLabel(soonerRush) === 'VOIDED – NON-REFUNDABLE' && soonerRush.amountPaid > 0);
check('and it leaves the rush lane', app.heapPeek(app.rushLane) === laterRush.id);
check('cannot void twice', !app.voidOrder(soonerRush.id, '', 'admin', NOW).ok);

var receiptTotal = laterRush.receipts[0].total;
var raise = app.orderEditDraft(laterRush);
raise.items[0] = app.copyRecord(raise.items[0], { labor: 100 });
app.editOrder(laterRush.id, raise, NOW + 4 * HOUR);
check('raising a paid order leaves a balance to collect', app.owesBalance(laterRush) && app.orderBalance(laterRush) === 100);
check('receipts keep the figures they were issued with', laterRush.receipts[0].total === receiptTotal);
var lower = app.orderEditDraft(laterRush);
lower.items[0] = app.copyRecord(lower.items[0], { materials: 10, labor: 0 });
app.editOrder(laterRush.id, lower, NOW + 5 * HOUR);
check('lowering below what was paid shows an overpayment, not a refund', app.orderOverpaid(laterRush) > 0 && app.orderBalance(laterRush) === 0);

var lawa = request([ROSE], { mode: 'delivery', address: '3 Mabini St.', barangay: 'Lawa', city: 'Meycauayan', date: '2026-10-11',
                             slot: '04:00 PM', phone: '0917 555 7004' }).order;
check('Brgy. Lawa delivery is free and says so', lawa.deliveryFee === 0 && lawa.delivery.label === 'Free delivery within Brgy. Lawa');
var stray = app.productEditDraft(app.productById(101));
stray.priceTable = app.withAdded(stray.priceTable, { count: 26, price: 1200 });
check('a price for a count no arrangement offers is refused', !app.updateProduct(101, stray).ok);

section('products: edit, disable, enable');
var roseDraft = app.productEditDraft(app.productById(101));
roseDraft.priceTable[0] = { count: 1, price: 60 };
check('price list edit changes "Starts at"', app.updateProduct(101, roseDraft).ok && app.priceLabel(app.productById(101)) === 'Starts at ₱60');
check('disable hides, enable restores', app.setProductActive(103, false).ok && app.activeProducts().length === 9 &&
      app.setProductActive(103, true).ok && app.activeProducts().length === 10);

section('customer look-up');
check('tracking number plus mobile', app.customerLookup('su-201', '0917 555 0142').id === 201);
check('tracking number plus email', app.customerLookup('SU-201', ' Andrea.Santos@example.com ').id === 201);
check('wrong contact shows nothing', app.customerLookup('SU-201', '0917 555 0000') === null && app.customerLookup('SU-201', 'x@y.com') === null);

section('two-step sign-in');
var at = NOW;
check('a wrong password is refused without saying which part was wrong',
      app.textHas(app.deskSignIn('kurlchester31feliciano@gmail.com', 'nope', at), 'email or password'));
check('the wrong email is refused too', app.deskSignIn('someone@gmail.com', 'admin123', at) !== '');
check('right email and password lead to the code step, not straight in',
      app.deskSignIn(' kurlchester31feliciano@gmail.com ', 'admin123', at) === '' && app.deskState.stage === 'otp' && !app.deskState.authed);
var code = app.issueOtp(at);
check('a six-digit code, kept only as a hash', code.length === 6 && app.digitsOnly(code) === code && app.deskState.otp.hash === app.fnv1a(code));
var codeMail = app.emailSignInCode('kurlchester31feliciano@gmail.com', code, at);
check('the code is emailed, never in the subject', codeMail && app.textHas(codeMail.body, code) && !app.textHas(codeMail.subject, code));
check('no new code for 30 seconds', app.otpResendWait(at + 1000) > 0 && app.otpResendWait(at + 31000) === 0);
app.issueOtp(at); app.issueOtp(at);
check('only three codes per password entry', app.otpResendWait(at + 31000) === -1);
check('the email must match exactly', app.deskSignIn('sympan,universe@gmail,com', 'admin123', at) !== '');
app.deskSignIn('kurlchester31feliciano@gmail.com', 'admin123', at);
code = app.issueOtp(at);
var wrong = code === '000000' ? '111111' : '000000';
check('a wrong code counts down', app.textHas(app.verifyOtp(wrong, at), '2 tries left'));
check('the right code signs in', app.verifyOtp(code, at + 1000) === '' && app.deskState.authed);
app.deskState.authed = false;
app.deskSignIn('kurlchester31feliciano@gmail.com', 'admin123', at);
app.issueOtp(at);
check('a code expires after five minutes', app.textHas(app.verifyOtp('123456', at + 6 * 60000), 'expired'));
app.issueOtp(at);
app.verifyOtp(wrong, at); app.verifyOtp(wrong, at); app.verifyOtp(wrong, at);
check('three wrong codes and a new one is needed', app.textHas(app.verifyOtp(wrong, at), 'Send a new one') && !app.deskState.authed);
app.deskState.stage = 'password';
app.deskSignIn('a@b.com', 'x', at); app.deskSignIn('a@b.com', 'x', at); app.deskSignIn('a@b.com', 'x', at); app.deskSignIn('a@b.com', 'x', at);
check('five wrong passwords in a row pause that email', app.textHas(app.deskSignIn('a@b.com', 'x', at), 'paused') &&
      app.textHas(app.deskSignIn('a@b.com', 'x', at + 1000), 'Try again'));
app.codeSends = app.hashCreate(17);   // the earlier steps used up the owner's codes for this hour
check('…but not anyone else\'s', app.deskSignIn(app.EMAIL_CONFIG.adminEmail, 'admin123', at + 2000) === '');
app.deskState.stage = 'password';
check('no password is in the source as text', !app.textHas(t.siteSource(), 'admin123'));

/* The newest security entry.              Time O(1) · Space O(1) */
function lastSecurity() {
    for (var i = app.auditLog.length - 1; i >= 0; i--) if (app.auditLog[i].kind === 'security') return app.auditLog[i];
    return null;
}

/* How many entries have a code.           Time O(n) · Space O(1) */
function codeCount(code) {
    return app.countWhere(app.auditLog, function (e) { return e.code === code; });
}

section('security and audit logs');
var OWNER = app.EMAIL_CONFIG.adminEmail, log = app.auditLog;
check('the demo history is in the audit log, with who did each step', log.length > 50 &&
      app.countWhere(log, function (e) { return e.kind === 'audit' && e.actor === 'Customer'; }) > 0 &&
      app.countWhere(log, function (e) { return e.kind === 'audit' && e.actor === 'Order desk'; }) > 0 &&
      app.countWhere(log, function (e) { return e.kind === 'audit' && e.actor === 'System'; }) > 0);
var appendedInOrder = true;
// (This test moves its clock back and forth, so only the numbering is checked;
// the seeding section checks that the replayed history is in time order.)
for (var li = 1; li < log.length; li++) if (log[li].id !== log[li - 1].id + 1) appendedInOrder = false;
check('entries are only appended, numbered one after another', appendedInOrder);
check('wrong passwords, the lock and a try while locked are security events',
      codeCount('password-wrong') >= 4 && codeCount('locked') === 1 && codeCount('locked-try') >= 1);
check('sign-in codes: accepted, wrong, expired and too many are all logged',
      codeCount('code-ok') >= 1 && codeCount('code-wrong') >= 1 && codeCount('code-expired') >= 1 && codeCount('code-max') >= 1);
var failRows = app.failedSignInRows();
check('wrong passwords are counted per email in a hash table, most first', failRows[0].email === 'a@b.com' && failRows[0].count === 5 &&
      app.hashGet(app.failedSignIns, 'a@b.com').count === 5, failRows.length > 0 ? failRows[0].email + ' ' + failRows[0].count : 'none');
check('newest first: the latest security entry leads the security list', app.logEntries('security', '')[0].id === lastSecurity().id);
var su201 = app.logEntries('all', 'SU-201');
check('the search finds an order\'s entries', su201.length > 0 && app.countWhere(su201, function (e) { return e.ref === 'SU-201'; }) === su201.length);
check('the Orders & products list holds only audit entries', app.countWhere(app.logEntries('audit', ''), function (e) { return e.kind !== 'audit'; }) === 0);
var recent = app.recentSecurityCounts(NOW + 1000);
check('the 24-hour summary counts what happened', recent.locks === 1 && recent.failedPasswords >= 4 && recent.failedCodes >= 3, JSON.stringify(recent));
check('a day later, the summary is empty', app.recentSecurityCounts(NOW + 3 * 86400000).total === 0);
fillCart([ROSE]);
var logged = app.placeOrder(form({ email: 'log.test@gmail.com' }), 'gcash-50', freshRef(), NOW + HOUR);
var placedEntries = app.logEntries('audit', logged.order.ref);
check('a customer\'s checkout is logged as the customer', placedEntries.length >= 2 &&
      app.countWhere(placedEntries, function (e) { return e.actor === 'Customer'; }) >= 2);
app.payBalance(logged.order.id, freshRef(), NOW + 2 * HOUR, 'Owner');
check('a payment recorded at the desk is logged as the owner', app.logEntries('audit', logged.order.ref)[0].actor === 'Owner');
app.voidOrder(app.cqFront(app.quoteQueue), 'Test', 'admin', NOW + 2 * HOUR);
check('a void is a warning, with its reason', app.logEntries('audit', 'VOIDED')[0].level === 'warn' && app.logEntries('audit', 'VOIDED')[0].detail === 'Test');
check('CSV fields are quoted and cannot run as formulas', app.csvField('=HYPERLINK("x")') === '"\'=HYPERLINK(""x"")"' &&
      app.csvField('plain') === '"plain"');
check('the CSV has a header and one line per entry', app.cutText(app.logCsv(app.logEntries('security', '')), '\r\n').length ===
      app.logEntries('security', '').length + 1);

section('password reset');
app.codeSends = app.hashCreate(17);   // each scenario starts with this hour's code allowance unused
app.deskState.authed = false;
check('an unknown email gets no code — and the same screen as the owner', app.startPasswordReset('stranger@gmail.com', NOW) === '' &&
      app.deskState.stage === 'reset-code' && !app.deskState.reset.known && lastSecurity().code === 'reset-unknown');
check('no code works for an unknown email', app.textHas(app.completePasswordReset('123456', 'Ribbon2026', 'Ribbon2026', NOW), 'not right'));
var resetCode = app.startPasswordReset('  ' + OWNER + ' ', NOW);
check('the owner\'s email gets a six-digit code, kept only as a hash', resetCode.length === 6 && app.deskState.reset.known &&
      app.deskState.reset.hash === app.fnv1a(resetCode) && lastSecurity().code === 'reset-sent');
var resetMail = app.emailResetCode(OWNER, resetCode, NOW);
check('the reset code is emailed in the body, never the subject', resetMail && app.textHas(resetMail.body, resetCode) &&
      !app.textHas(resetMail.subject, resetCode) && resetMail.kind === 'reset');
check('no new reset code for 30 seconds', app.resetResendWait(NOW + 1000) > 0 && app.resetResendWait(NOW + 31000) === 0);
check('the password rules, without using up a try',
      app.textHas(app.completePasswordReset(resetCode, 'short1', 'short1', NOW), '8 to 64') &&
      app.textHas(app.completePasswordReset(resetCode, 'onlyletters', 'onlyletters', NOW), 'letter and one number') &&
      app.textHas(app.completePasswordReset(resetCode, 'has space 1', 'has space 1', NOW), 'spaces') &&
      app.textHas(app.completePasswordReset(resetCode, 'Matching1', 'Matching2', NOW), 'do not match') &&
      app.textHas(app.completePasswordReset(resetCode, 'admin123', 'admin123', NOW), 'different') &&
      app.deskState.reset.tries === 0);
var wrongReset = resetCode === '000000' ? '111111' : '000000';
check('a wrong code uses a try', app.textHas(app.completePasswordReset(wrongReset, 'Ribbon2026', 'Ribbon2026', NOW), '2 tries left') &&
      lastSecurity().code === 'reset-code-wrong');
check('a code expires after ten minutes', app.textHas(app.completePasswordReset(resetCode, 'Ribbon2026', 'Ribbon2026', NOW + 11 * 60000), 'expired'));
var resetCode2 = app.resendResetCode(NOW + 31000).code;
check('a new code can be sent', resetCode2.length === 6 && app.deskState.reset.tries === 0);
check('the right code and a good password change it', app.completePasswordReset(resetCode2, 'Ribbon2026', 'Ribbon2026', NOW + 32000) === '' &&
      app.deskState.stage === 'password' && app.deskState.reset === null && app.signInGuard(OWNER).lockedUntil === 0);
check('logged as an alert', lastSecurity().code === 'password-changed' && lastSecurity().level === 'alert');
check('the old password no longer works; the new one does', app.deskSignIn(OWNER, 'admin123', NOW + 33000) !== '' &&
      app.deskSignIn(OWNER, 'Ribbon2026', NOW + 34000) === '' && app.deskState.stage === 'otp');
var changedMail = app.emailPasswordChanged(OWNER, NOW + 32000);
check('the owner is emailed that the password changed', changedMail && app.textHas(changedMail.subject, 'changed'));
app.startPasswordReset(OWNER, NOW + 100000);
app.resendResetCode(NOW + 131000);
app.resendResetCode(NOW + 162000);
check('three codes per reset', app.textHas(app.resendResetCode(NOW + 193000).message, 'Too many'));
app.deskState.reset = null;
app.deskState.stage = 'password';
app.setAccountPassword(app.accountByEmail(OWNER), 'admin123');
check('the password source stays free of the password text', !app.textHas(t.readText('js/backend/m13-security-logs.js') +
      t.readText('js/frontend/desk/password-reset.js'), 'admin123'));

section('code emails per hour');
app.codeSends = app.hashCreate(17);
var budgetAt = NOW + 5 * HOUR, started = 0, unknownStarted = 0;
for (var bi = 0; bi < app.CODE_SEND_MAX; bi++) {
    if (app.resetRequestProblem(OWNER, budgetAt + bi) === '' && app.startPasswordReset(OWNER, budgetAt + bi).length === 6) started++;
    if (app.resetRequestProblem('nobody@gmail.com', budgetAt + bi) === '' && app.startPasswordReset('nobody@gmail.com', budgetAt + bi) === '') unknownStarted++;
}
check('starting a reset again still counts every code', started === app.CODE_SEND_MAX && app.textHas(app.resetRequestProblem(OWNER, budgetAt + 10), 'Too many'));
check('…and the same for an email with no account, so the screen tells nothing', unknownStarted === app.CODE_SEND_MAX &&
      app.textHas(app.resetRequestProblem('nobody@gmail.com', budgetAt + 10), 'Too many'));
check('sign-in codes share the allowance', app.textHas(app.deskSignIn(OWNER, 'admin123', budgetAt + 20), 'Too many codes'));
check('it comes back after an hour', app.resetRequestProblem(OWNER, budgetAt + app.CODE_SEND_WINDOW_MS + 1) === '');
check('text that is not an email is never logged', app.typedEmail('Hunter2pass') === '(not an email address)' &&
      app.deskSignIn('Hunter2pass', 'x', budgetAt) !== '' && app.logEntries('all', 'Hunter2pass').length === 0);
check('only example.com itself is a demo address', app.isDemoAddress('bea@example.com') && !app.isDemoAddress('jo@example.com.ph') &&
      !app.isDemoAddress('jo@example.company'));
app.deskState.reset = null;
app.deskState.stage = 'password';
app.codeSends = app.hashCreate(17);

section('desk accounts');
var owner = app.accountByEmail(OWNER), bea = app.accountByEmail('BEA.cruz@example.com ');
var idsInOrder = true;
for (var ai = 1; ai < app.staffAccounts.length; ai++) if (app.staffAccounts[ai].id <= app.staffAccounts[ai - 1].id) idsInOrder = false;
check('the credentials are an array in id order, indexed by email in a hash table', app.staffAccounts.length === 2 && idsInOrder &&
      app.hashGet(app.staffEmailIndex, app.accountEmailKey(OWNER)) === 1 && owner.id === 1 && bea.id === 2);
check('only salted hashes are stored, each with its own salt', owner.salt !== bea.salt && owner.passHash === app.passwordHash(owner.salt, 'admin123') &&
      app.passwordHash('other-salt', 'admin123') !== owner.passHash && owner.password === undefined);
var sourceText = t.siteSource();
check('no password is written in the source', !app.textHas(sourceText, 'admin123') && !app.textHas(sourceText, 'Staff2026'));
check('a staff member signs in with their own credentials', app.deskSignIn('bea.cruz@example.com', 'Staff2026', NOW) === '' &&
      app.deskState.pendingId === 2);
var beaCode = app.issueOtp(NOW);
check('…and the code makes them the person signed in', app.verifyOtp(beaCode, NOW + 1000) === '' && app.deskUserId === 2 &&
      app.deskActor() === 'Bea Cruz' && bea.lastSignIn === NOW + 1000);
var beaQuote = app.firstWhere(app.orders, function (o) { return o.status === 'requested'; });
app.sendQuote(beaQuote.id, priced(app.quoteDraft(beaQuote)), NOW + 2000);
check('what they do is logged under their name', app.logEntries('audit', beaQuote.ref)[0].actor === 'Bea Cruz');
check('staff cannot add accounts', !app.addStaffAccount({ name: 'X Y', email: 'x@gmail.com', role: 'staff', password: 'Temp2026x', confirm: 'Temp2026x' }, bea, NOW).ok);
var liaDraft = { name: 'Lia Reyes', email: 'lia.reyes@gmail.com', role: 'staff', password: 'Temp2026x', confirm: 'Temp2026x' };
var lia = app.addStaffAccount(liaDraft, owner, NOW + 3000);
check('an owner adds an account: appended, indexed, logged', lia.ok && lia.account.id === 3 && app.staffAccounts.length === 3 &&
      app.accountByEmail('lia.reyes@gmail.com').id === 3 && lastSecurity().code === 'account-added');
check('an email can only have one account', !app.addStaffAccount(liaDraft, owner, NOW).ok);
check('no account on example.com, and no two with one name', !app.addStaffAccount({ name: 'Boss', email: 'boss@example.com', role: 'owner',
      password: 'Temp2026x', confirm: 'Temp2026x' }, owner, NOW).ok && !app.addStaffAccount({ name: 'lia reyes', email: 'lia2@gmail.com',
      role: 'staff', password: 'Temp2026x', confirm: 'Temp2026x' }, owner, NOW).ok);
check('a weak temporary password is refused', app.textHas(app.addStaffAccount({ name: 'Ann Lim', email: 'ann@gmail.com', role: 'staff',
      password: 'short', confirm: 'short' }, owner, NOW).error, '8 to 64'));
check('the new account can sign in', app.deskSignIn('lia.reyes@gmail.com', 'Temp2026x', NOW + 4000) === '');
app.deskState.stage = 'password';
check('nobody can disable themselves', !app.setAccountActive(owner.id, false, owner, NOW).ok);
check('an owner disables an account; it can no longer sign in (with the usual message)',
      app.setAccountActive(3, false, owner, NOW + 5000).ok && lastSecurity().code === 'account-disabled' &&
      app.textHas(app.deskSignIn('lia.reyes@gmail.com', 'Temp2026x', NOW + 6000), 'email or password'));
check('a disabled account gets no reset code', app.startPasswordReset('lia.reyes@gmail.com', NOW + 7000) === '');
app.deskState.reset = null;
app.deskState.stage = 'password';
check('and it can be enabled again', app.setAccountActive(3, true, owner, NOW + 8000).ok && app.accountById(3).active);
check('changing your own password needs the current one', app.textHas(app.changeOwnPassword(bea, 'wrong', 'NewStaff2026', 'NewStaff2026', NOW), 'not right') &&
      lastSecurity().code === 'current-wrong' && lastSecurity().actor === 'Bea Cruz');
for (var cw = 0; cw < app.ADMIN_MAX_ATTEMPTS - 2; cw++) app.changeOwnPassword(bea, 'wrong', 'NewStaff2026', 'NewStaff2026', NOW);
check('five wrong current passwords in a row pause the email (the screen signs out)',
      app.textHas(app.changeOwnPassword(bea, 'wrong', 'NewStaff2026', 'NewStaff2026', NOW), 'Signing out') &&
      app.signInGuard(bea.email).lockedUntil > NOW);
app.signInGuard(bea.email).lockedUntil = 0;
check('…and then works', app.changeOwnPassword(bea, 'Staff2026', 'NewStaff2026', 'NewStaff2026', NOW + 9000) === '' &&
      app.checkPassword(bea, 'NewStaff2026') && !app.checkPassword(bea, 'Staff2026') && lastSecurity().code === 'password-changed');
check('a reset works for a staff account too', app.startPasswordReset('bea.cruz@example.com', NOW + 10000).length === 6 &&
      app.deskState.reset.accountId === 2);
app.deskState.reset = null;
app.deskState.stage = 'password';
app.deskUserId = 0;
app.deskState.authed = false;
check('signed out, the audit log names the order desk again', app.deskActor() === 'Order desk');

section('category filter, search and sort (modules 2 and 3)');
var underFlowers = app.productsUnder('flower-bouquets');
check('the tree filter keeps only the products under a branch, and everything with no branch', underFlowers.length > 0 &&
      app.countWhere(underFlowers, function (p) { return app.productBranch(p).slug !== 'flower-bouquets'; }) === 0 &&
      app.productsUnder('').length === app.activeProducts().length && app.productsUnder('rose').length >= 1);
var matchaRows = app.catalogRows({ line: '', branch: '', query: 'matcha', sort: 'best' });
check('search reads the filter it is given and finds products by a colour name', matchaRows.length > 0 &&
      app.countWhere(matchaRows, function (r) { return r.product.kind !== 'flower'; }) === 0);
var byPrice = app.catalogRows({ line: '', branch: 'flower-bouquets', query: '', sort: 'price' }), priceOrder = true;
for (var bp = 1; bp < byPrice.length; bp++) if (app.productStartsAt(byPrice[bp].product) < app.productStartsAt(byPrice[bp - 1].product)) priceOrder = false;
check('the price sort puts the cheapest "Starts at" first', byPrice.length === underFlowers.length && priceOrder);

section('editing a cart line');
app.llClear(app.basket);
var lineA = app.makeFlowerItem(app.productById(101), { arrangement: 'round', count: 7, color: 'red', quantity: 1, addons: [] }).item;
var lineB = app.makeFlowerItem(app.productById(101), { arrangement: 'round', count: 12, color: 'red', quantity: 2, addons: ['glitter'] }).item;
app.basketAdd(lineA); app.basketAdd(lineB);
var edited = app.makeFlowerItem(app.productById(101), { arrangement: 'round', count: 7, color: 'matcha', quantity: 3, addons: ['card'] }).item;
check('an edited line goes back in its place', app.basketReplace(0, edited) && app.basketItems().length === 2 &&
      app.basketItems()[0].color === 'matcha' && app.basketItems()[0].quantity === 3 && app.basketItems()[1].count === 12);
check('its estimate is the new choice\'s', app.basketItems()[0].estimate === edited.unitEstimate * 3);
check('a removed line cannot be edited', app.basketRemove(1) && !app.basketReplace(1, edited));
app.llClear(app.basket);

section('courier tracking');
var shipped = app.firstWhere(app.orders, function (o) {
    return o.fulfilment.mode === 'delivery' && o.fulfilment.courier && (o.status === 'paid' || o.status === 'completed');
});
var pickedUp = app.firstWhere(app.orders, function (o) { return o.fulfilment.mode === 'pickup' && o.status === 'completed'; });
var draftT = function (changes) { return app.copyRecord({ courier: 'flash', number: 'P 0123 N5WX P8EA', link: '' }, changes); };
check('a seeded courier delivery to try it on', shipped !== null);
check('pickup orders take no tracking', !app.setCourierTracking(pickedUp.id, draftT({}), NOW).ok);
check('unsafe or wrong links are refused', !app.setCourierTracking(shipped.id, draftT({ link: 'javascript:alert(1)' }), NOW).ok &&
      !app.setCourierTracking(shipped.id, draftT({ link: 'http://flashexpress.ph/x' }), NOW).ok &&
      !app.setCourierTracking(shipped.id, draftT({ link: 'https://lalamove.com@evil.example/x' }), NOW).ok &&
      !app.setCourierTracking(shipped.id, draftT({ link: 'https://share.lalamove.com/a b' }), NOW).ok &&
      !app.setCourierTracking(shipped.id, draftT({ link: 'https://x"onmouseover=y' }), NOW).ok);
check('a number with other characters, or nothing at all, is refused', !app.setCourierTracking(shipped.id, draftT({ number: 'P01$23' }), NOW).ok &&
      !app.setCourierTracking(shipped.id, draftT({ number: '', link: '' }), NOW).ok);
// Demo customers are on example.com and never emailed; give this one a real-looking address.
shipped.customer.email = 'tracking.test@gmail.com';
var mailsBefore = app.outbox.length;
var tracked = app.setCourierTracking(shipped.id, draftT({}), NOW + HOUR);
check('a Flash number is tidied and attached', tracked.ok && shipped.courierTracking.number === 'P0123N5WXP8EA' &&
      shipped.courierTracking.courier === 'flash');
check('without a link, the customer is sent to the courier\'s own site', app.trackingHref(shipped.courierTracking) === 'https://www.flashexpress.ph');
check('it goes in the history and the audit log, by the owner', app.textHas(shipped.history[shipped.history.length - 1].text, 'Courier tracking added') &&
      app.logEntries('audit', shipped.ref)[0].actor === app.deskActor());
var trackMail = app.firstWhere(app.backwards(app.outbox), function (m) { return m.kind === 'tracking'; });
check('the customer is emailed the number', app.outbox.length === mailsBefore + 1 && trackMail && app.textHas(trackMail.body, 'P0123N5WXP8EA') &&
      app.textHas(trackMail.body, 'weather'));
check('saving the same again changes nothing', !app.setCourierTracking(shipped.id, draftT({}), NOW + HOUR).ok);
check('a Lalamove share link is accepted and used', app.setCourierTracking(shipped.id, { courier: 'lalamove', number: '',
      link: 'https://share.lalamove.com/?PH100231008123456&lang=en_PH' }, NOW + 2 * HOUR).ok &&
      app.trackingHref(shipped.courierTracking) === 'https://share.lalamove.com/?PH100231008123456&lang=en_PH' &&
      app.textHas(shipped.history[shipped.history.length - 1].text, 'changed'));
check('the customer sees it on Track order', app.shownTracking(app.customerLookup(shipped.ref, shipped.customer.phone)) !== null);
check('a link must be on that courier\'s own site', !app.setCourierTracking(shipped.id, draftT({ link: 'https://share.lalamove.com/x' }), NOW).ok &&
      !app.setCourierTracking(shipped.id, { courier: 'lalamove', number: '', link: 'https://lalamove.com.evil.example/x' }, NOW).ok);
check('another courier\'s link may not be an IP address or punycode', app.trackingLinkProblem('https://127.0.0.1/x', 'other') !== '' &&
      app.trackingLinkProblem('https://xn--fla-ula.ph/x', 'other') !== '' && app.trackingLinkProblem('https://www.jtexpress.ph/track', 'other') === '');
check('only courier deliveries that are marked ready take tracking', !app.canAttachTracking(app.copyRecord(shipped, { status: 'paid' })) &&
      !app.canAttachTracking(app.copyRecord(shipped, { fulfilment: app.copyRecord(shipped.fulfilment, { courier: '' }) })));
var mailsBeforeRemove = app.outbox.length;
check('it can be removed, and the customer is told to ignore it', app.removeCourierTracking(shipped.id, NOW + 3 * HOUR).ok &&
      shipped.courierTracking === null && app.outbox.length === mailsBeforeRemove + 1 &&
      app.textHas(app.outbox[app.outbox.length - 1].subject, 'Correction'));
var unpaidDelivery = request([MONEY], { mode: 'delivery', address: '12 Rizal St', barangay: '', city: 'Manila', courier: 'flash',
                                       slot: '02:00 PM', date: '2026-10-10' }, NOW).order;
check('an order not yet paid takes no tracking', unpaidDelivery && !app.setCourierTracking(unpaidDelivery.id, draftT({}), NOW).ok);

section('data privacy notice and agreement');
fillCart([ROSE]);
var noConsent = app.validateRequest(form({ consent: false }), app.basketItems(), '2026-10-05');
var noTerms = app.validateRequest(form({ terms: false }), app.basketItems(), '2026-10-05');
check('an order needs the Privacy Notice agreed to', app.firstWhere(noConsent, function (e) { return e.field === 'consent'; }) !== null &&
      app.firstWhere(noConsent, function (e) { return e.field === 'terms'; }) === null);
check('…and, separately, the order terms', app.firstWhere(noTerms, function (e) { return e.field === 'terms'; }) !== null &&
      app.firstWhere(noTerms, function (e) { return e.field === 'consent'; }) === null);
check('nothing is created without them', !app.placeOrder(form({ consent: false }), 'gcash-100', freshRef(), NOW).ok);
var agreed = app.placeOrder(form({ email: 'privacy.test@gmail.com' }), 'gcash-100', freshRef(), NOW + HOUR).order;
check('the order records which notice was agreed to, and when', agreed.consent.privacyVersion === app.PRIVACY_NOTICE_VERSION &&
      agreed.consent.terms === true && agreed.consent.termsVersion === app.ORDER_TERMS_VERSION && agreed.consent.at === NOW + HOUR);
check('the agreement is the first line of its history, and in the audit log as the customer',
      app.textHas(agreed.history[0].text, 'Privacy Notice') && app.firstWhere(app.logEntries('audit', agreed.ref), function (e) {
          return app.textHas(e.action, 'Privacy Notice') && e.actor === 'Customer'; }) !== null);
check('every demo order carries the agreement too', app.countWhere(app.orders, function (o) { return !o.consent; }) === 0);
var noticeText = app.renderEach(app.PRIVACY_NOTICE, function (sct) { return sct.title + ' ' + app.glue(sct.text, ' '); }, ' ');
check('the notice cites the Data Privacy Act and the rights it gives', app.textHas(noticeText, 'Republic Act No. 10173') &&
      app.textHas(noticeText, 'National Privacy Commission') && app.textHas(noticeText, 'access') && app.textHas(noticeText, 'erased') &&
      app.textHas(noticeText, 'courier') && app.textHas(noticeText, 'EmailJS'));
check('the order terms say payments are non-refundable and no cancellations once production starts',
      app.textHas(app.glue(app.ORDER_TERMS, ' '), 'non-refundable') && app.textHas(app.glue(app.ORDER_TERMS, ' '), 'No cancellations'));

section('schedule notes');
check('delivery and pickup notes mention the weather', app.textHas(app.scheduleNote('delivery'), 'weather') &&
      app.textHas(app.scheduleNote('pickup'), 'weather') && app.scheduleNote('delivery') !== app.scheduleNote('pickup'));
var confirmedMail = app.firstWhere(app.backwards(app.outbox), function (m) { return m.kind === 'confirmed'; });
check('the confirmation email says dates are estimates', confirmedMail && app.textHas(confirmedMail.body, 'weather'));
var requestedMail = app.firstWhere(app.backwards(app.outbox), function (m) { return m.kind === 'requested'; });
check('so does the quote request email', requestedMail && app.textHas(requestedMail.body, 'weather'));
check('receipts know pickup from delivery, for the note', app.receipts[app.receipts.length - 1].mode === 'pickup' ||
      app.receipts[app.receipts.length - 1].mode === 'delivery');

section('sample photos');
var noCover = app.keepWhere(app.products, function (p) { return app.productCover(p) === ''; });
check('every product has a photograph', noCover.length === 0, app.renderEach(noCover, function (p) { return p.name; }, ', '));
var missingFiles = [];
for (var pi = 0; pi < app.products.length; pi++) {
    for (var gi = 0; gi < app.products[pi].gallery.length; gi++) {
        if (!t.exists(app.products[pi].gallery[gi])) app.listAdd(missingFiles, app.products[pi].gallery[gi]);
    }
}
check('every gallery photograph is on disk', missingFiles.length === 0, app.glue(missingFiles, ', '));
check('the sweets bouquet and the beer-in-can cake use credited sample photos',
      app.photoCredit(app.productCover(app.productById(204))) !== null && app.photoCredit(app.productCover(app.productById(302))) !== null);
check('every sample photo names its author, source and licence', app.countWhere(app.PHOTO_CREDITS, function (c) {
    return c.author && app.beginsWith(c.source, 'https://') && app.beginsWith(c.licenseUrl, 'https://creativecommons.org/') && t.exists('assets/products/' + c.file);
}) === app.PHOTO_CREDITS.length);
check('the shop\'s own photographs carry no credit', app.photoCredit(app.productCover(app.productById(101))) === null);
check('the credits are written down in assets/products/CREDITS.md', t.exists('assets/products/CREDITS.md') &&
      app.countWhere(app.PHOTO_CREDITS, function (c) { return app.textHas(t.readText('assets/products/CREDITS.md'), c.file); }) === app.PHOTO_CREDITS.length);

section('demo addresses are never emailed');
var before2 = app.outbox.length;
check('example.com is skipped', app.queueEmail('someone@example.com', 'x', ['y'], 'test', 0, NOW) === null && app.outbox.length === before2);

/* =====================================================================
   The EmailJS sender, with a stand-in for the network.
   ===================================================================== */
async function sender() {
    var wait = require('timers/promises').setTimeout;
    section('sending through EmailJS');
    app.drainMail();
    check('without EmailJS set up, emails are kept but marked not sent', lastMail().status === 'simulated' && app.cqIsEmpty(app.mailQueue));

    var calls = [];
    app.fetch = function (url, options) {
        app.listAdd(calls, { url: url, body: JSON.parse(options.body) });
        return Promise.resolve({ ok: true, status: 200, text: function () { return Promise.resolve(''); } });
    };
    app.EMAIL_CONFIG.serviceId = 'service_test';
    app.EMAIL_CONFIG.templateId = 'template_test';
    app.EMAIL_CONFIG.publicKey = 'public_test';
    var queued = app.retryFailedMail();
    await wait(50);
    check('set up, every unsent email goes out in order', queued > 0 && calls.length === queued &&
          app.countWhere(app.outbox, function (m) { return m.status === 'sent'; }) === queued, calls.length + ' of ' + queued);
    var first = calls[0];
    check('to the EmailJS REST endpoint, with the template fields', first.url === 'https://api.emailjs.com/api/v1.0/email/send' &&
          first.body.service_id === 'service_test' && first.body.template_id === 'template_test' && first.body.user_id === 'public_test' &&
          app.isValidEmail(first.body.template_params.to_email) && first.body.template_params.subject.length > 0 &&
          first.body.template_params.message.length > 0);

    app.fetch = function () { return Promise.reject('offline'); };
    var readyMail = app.emailOrderReady(money, NOW);
    app.drainMail();
    await wait(50);
    check('a failed send is marked and can be retried', readyMail.status === 'failed' && app.textHas(readyMail.note, 'No connection'));
}

sender().then(function () { t.finish('store'); }, function (e) { console.log(e); process.exitCode = 1; });
