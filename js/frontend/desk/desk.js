/* =========================================================================
   DESK · TABS AT ORDER CARDS
   Mga tab ng order desk (depende sa role), order cards, sign out at
   idle sign-out.
   ========================================================================= */

var DESK_TABS = [
    { id: 'overview',   label: 'Overview' },
    { id: 'quotes',     label: 'Quote requests' },
    { id: 'payment',    label: 'Awaiting payment' },
    { id: 'production', label: 'In production' },
    { id: 'completed',  label: 'Completed' },
    { id: 'voided',     label: 'Voided' },
    { id: 'products',   label: 'Products' },
    { id: 'outbox',     label: 'Outbox' },
    { id: 'logs',       label: 'Logs' },
    { id: 'account',    label: 'Accounts' }
];

var OWNER_ONLY_TABS = ['logs'];

// Mga tab na pwedeng buksan: lahat sa owner, walang Logs sa staff.
// Time O(n) · Space O(n)
function deskTabs() {
    var me = currentAccount(), owner = isOwner(me), out = [];
    for (var i = 0; i < DESK_TABS.length; i++) {
        var t = DESK_TABS[i];
        if (!owner && isIn(OWNER_ONLY_TABS, t.id)) continue;
        listAdd(out, t.id === 'account' && !owner ? { id: t.id, label: 'My account' } : t);
    }
    return out;
}

// ---------- Mga parte ng card ----------

// Mga item kasama lahat ng detalye at reference.
// Time O(n) · Space O(n)
function deskItemsHtml(order, showPrices) {
    return '<ul class="order-items">' + renderEach(order.items, function (item) {
        var type = quoteTypeById(item.quoteType);
        var money = !showPrices ? '<span class="t-caption dim">' + escapeHtml(itemEstimateText(item)) + '</span>'
            : '<div class="line-break t-caption"><span>Materials ' + peso(item.materials) + '</span><span>Labour ' + peso(item.labor) +
              '</span>' + (item.itemExpense > 0 ? '<span>' + escapeHtml(type.expenseLabel || 'Items') + ' ' + peso(item.itemExpense) + '</span>' : '') +
              '<strong>' + peso(lineTotal(item)) + '</strong></div>';
        return '<li class="order-item"><div class="order-item-media">' + imageOrEmpty(itemThumb(item), '') + '</div>' +
            '<div class="order-item-body"><strong>' + escapeHtml(item.productName) + ' × ' + item.quantity + '</strong>' +
            specPills(itemSpecs(item)) +
            (item.notes ? '<span class="t-caption">Notes: “' + escapeHtml(item.notes) + '”</span>' : '') +
            (item.reference ? '<a class="t-caption link" href="' + escapeHtml(item.reference.url) + '" target="_blank" rel="noopener">' +
             'Reference design: ' + escapeHtml(item.reference.name) + '</a>' : '') + money + '</div></li>';
    }) + '</ul>';
}

// Contact, schedule, delivery at tracking.
// Time O(n) · Space O(n)
function deskFactsHtml(order) {
    var f = order.fulfilment, c = order.customer;
    var feeNote = order.delivery.status === 'estimate' ? ' · courier estimate, confirm in the quotation'
                : order.delivery.status === 'manual' ? ' · no rate on file, enter it in the quotation'
                : order.delivery.status === 'confirmed' ? ' · confirmed' : '';
    return '<dl class="order-facts">' +
        '<div><dt>Customer</dt><dd>' + escapeHtml(c.name) + '</dd></div>' +
        '<div><dt>Mobile</dt><dd>' + escapeHtml(c.phone) + (c.handle ? ' · ' + escapeHtml(c.handle) : '') + '</dd></div>' +
        '<div><dt>Email</dt><dd>' + escapeHtml(c.email || '—') + '</dd></div>' +
        '<div><dt>' + (f.mode === 'delivery' ? 'Delivery' : 'Pickup') + '</dt><dd>' + escapeHtml(whenText(order)) +
            (order.rush ? ' · <span class="rose">Rush</span>' : '') + '</dd></div>' +
        (f.mode === 'delivery' ? '<div><dt>Address</dt><dd>' + escapeHtml(f.address + ', ' + (f.barangay ? f.barangay + ', ' : '') + f.city) + '</dd></div>' : '') +
        '<div><dt>Fee</dt><dd>' + escapeHtml(order.delivery.label + feeNote) + '</dd></div>' +
        (order.notes ? '<div><dt>Notes</dt><dd>' + escapeHtml(order.notes) + '</dd></div>' : '') +
        deskTrackingFact(order) +
        (order.consent ? '<div><dt>Consent</dt><dd>Privacy Notice v' + escapeHtml(order.consent.privacyVersion) + ' and order terms' +
            (order.consent.termsVersion ? ' v' + escapeHtml(order.consent.termsVersion) : '') + ' · ' +
            escapeHtml(formatStamp(order.consent.at)) + '</dd></div>' : '') +
        '<div><dt>Placed</dt><dd>' + escapeHtml(formatStamp(order.createdAt)) + '</dd></div>' +
    '</dl>';
}

// Courier tracking sa order card, may link.
// Time O(n) · Space O(n)
function deskTrackingFact(order) {
    var t = shownTracking(order);
    if (!t) return '';
    var href = trackingHref(t);
    return '<div><dt>Tracking</dt><dd>' + escapeHtml(trackingSummary(t)) +
        (href ? ' · <a class="link" href="' + escapeHtml(href) + '" target="_blank" rel="noopener noreferrer">' +
                (t.link ? 'tracking link' : 'courier site') + '</a>' : '') + '</dd></div>';
}

// Linya ng pera sa card.
// Time O(n) · Space O(n)
function deskMoneyHtml(order) {
    if (order.status === 'requested') return '<span class="t-foot dim">' + escapeHtml(estimateLabel(order)) + '</span>';
    var parts = '<strong class="t-num">' + peso(orderTotal(order)) + '</strong>';
    if (order.amountPaid > 0) parts += ' <span class="t-foot dim">· paid ' + peso(order.amountPaid) + '</span>';
    if (order.status !== 'voided' && order.amountPaid > 0 && orderBalance(order) > 0) {
        parts += ' <span class="badge badge-amber">Balance ' + peso(orderBalance(order)) + '</span>';
    }
    if (orderOverpaid(order) > 0 && order.status !== 'voided') parts += ' <span class="badge">Overpaid ' + peso(orderOverpaid(order)) + '</span>';
    return parts;
}

// Button na may ginagawa sa isang order.
// Time O(1) · Space O(1)
function actButton(act, id, label, tone) {
    return '<button class="ui-btn ' + (tone || 'ui-btn-quiet') + ' ui-btn-sm" type="button" data-act="' + act + '" data-id="' + id + '">' +
           escapeHtml(label) + '</button>';
}

// Mga action na pwede sa status.
// Time O(n) · Space O(1)
function deskActionsHtml(order) {
    var id = order.id, out = actButton('open', id, 'Details');
    if (order.status === 'requested') out += actButton('quote', id, 'Prepare quotation', 'ui-btn-primary');
    if (order.status === 'quoted') out += actButton('quote', id, 'Revise quotation') + actButton('accept', id, 'Record GCash payment', 'ui-btn-primary');
    if (owesBalance(order)) out += actButton('balance', id, 'Record balance', 'ui-btn-primary');
    if (canAttachTracking(order)) out += actButton('tracking', id, shownTracking(order) ? 'Edit tracking' : 'Add tracking');
    if (order.status !== 'voided') out += actButton('edit', id, 'Edit order');
    if (order.status !== 'voided' && order.status !== 'completed') out += actButton('void', id, 'Void', 'ui-btn-danger');
    return out;
}

// Buong order card.
// Time O(n) · Space O(n)
function deskCardHtml(order, position, isNext, laneNote) {
    return '<article class="order-card' + (isNext ? ' is-next' : '') + '">' +
        '<div class="order-card-head">' + (position ? '<span class="pos">' + position + '</span>' : '') +
        '<div class="flex-fill"><div class="row-between"><strong class="t-mono">' + escapeHtml(order.ref) + '</strong>' + statusBadge(order) + '</div>' +
        '<span class="t-foot dim">' + escapeHtml(order.customer.name) + (laneNote ? ' · ' + escapeHtml(laneNote) : '') + '</span></div></div>' +
        '<div class="order-card-grid"><div>' + deskItemsHtml(order, order.status !== 'requested') + '</div><div>' + deskFactsHtml(order) +
        (order.status === 'voided' ? '<p class="void-line">' + escapeHtml(order.voidReason) + ' · by ' + escapeHtml(order.voidedBy) + ' · ' +
            escapeHtml(formatStamp(order.voidedAt)) + '</p>' : '') + '</div></div>' +
        '<div class="order-card-foot"><div class="flex-fill">' + deskMoneyHtml(order) + '</div><div class="desk-actions">' +
        deskActionsHtml(order) + '</div></div></article>';
}

// Pakita kapag walang laman.
// Time O(1) · Space O(1)
function emptyHtml(glyph, title, text) {
    return '<div class="empty"><div class="empty-glyph">' + icon(glyph) + '</div><h3 class="t-title3">' + escapeHtml(title) +
           '</h3><p class="t-callout">' + escapeHtml(text) + '</p></div>';
}

// ---------- Tabs ----------

// Tab ng quote requests (FIFO).
// Time O(n²) (bawat order sa pila at mga line nito) · Space O(n)
function quotesHtml() {
    var list = quoteQueueOrders();
    if (list.length === 0) return emptyHtml('list', 'No requests waiting', 'Quote requests for money, makeup, sweets, diaper and beer gifts appear here in the order they arrive.');
    return '<p class="t-foot dim mb-3">Answered first in, first out. Each quotation is pre-filled from your past quotes for the same product, ' +
        'so most only need checking. A cart of only flowers or picture bouquets never comes here — it is priced and paid at checkout.</p>' +
        renderEach(list, function (o, i) { return deskCardHtml(o, i + 1, i === 0, ''); });
}

// Tab ng naghihintay ng bayad.
// Time O(n²) · Space O(n)
function paymentHtml() {
    var list = awaitingPayment();
    if (list.length === 0) return emptyHtml('receipt', 'No quotations outstanding', 'Quotations the customer has not paid yet appear here.');
    return '<p class="t-foot dim mb-3">Unpaid quotations are voided automatically after ' + QUOTE_EXPIRY_DAYS + ' days, and the customer is told by email.</p>' +
        renderEach(list, function (o) { return deskCardHtml(o, 0, false, 'Quoted ' + formatStamp(o.quotedAt) + ' · expires ' +
            formatStamp(o.quotedAt + QUOTE_EXPIRY_DAYS * 24 * 3600000)); });
}

// Tab ng production: rush muna, tapos standard.
// Time O(n²) · Space O(n)
function productionHtml() {
    var line = productionLine(), next = nextReleasable(), last = stackPeek(completedStack);
    var bar = '<div class="desk-bar"><button class="ui-btn ui-btn-primary" type="button" data-act="complete-next"' + (next ? '' : ' disabled') + '>' +
        icon('check', 18) + ' Mark ready' + (next ? ' · ' + escapeHtml(next.ref) : '') + '</button>' +
        '<button class="ui-btn ui-btn-quiet" type="button" data-act="undo-complete"' + (last === null ? ' disabled' : '') + '>' + icon('undo', 18) +
        ' Undo last' + (last !== null ? ' · ' + escapeHtml(orderById(last.id).ref) : '') + '</button></div>' +
        '<p class="t-foot dim mb-3">Rush orders go first, earliest due date first (min-heap). Standard orders follow in the order they were paid (queue). ' +
        'An order is released only when fully paid; one still owing keeps its place without holding up the orders behind it. ' +
        'Marking an order ready emails the customer.</p>';
    if (line.length === 0) return bar + emptyHtml('box', 'Nothing in production', 'Paid orders join the line here.');
    if (!next) {
        bar += '<p class="notice notice-warn">' + icon('alert', 16) + ' Nothing can be released yet: ' +
            escapeHtml(renderEach(line, function (o) { return o.ref; }, ', ')) + ' still ' + plural(line.length, 'owes', 'owe') +
            ' a balance. Record a balance payment to release an order.</p>';
    }
    return bar + renderEach(line, function (o, i) {
        return deskCardHtml(o, i + 1, i === 0, o.lane === 'rush' ? 'Rush · due ' + formatDateShort(o.fulfilment.date) : 'Standard');
    });
}

// Tab ng tapos na, naka-group ayon sa araw.
// Time O(n²) · Space O(n)
function completedHtml() {
    var groups = completedByDate();
    if (groups.length === 0) return emptyHtml('check', 'No completed orders yet', 'Released orders are kept here, grouped by day.');
    return renderEach(groups, function (g) {
        return '<section class="day-group"><div class="day-head"><h3 class="t-title3">' + escapeHtml(formatDateLong(g.date)) + '</h3>' +
            '<span class="t-foot dim">' + g.orders.length + ' ' + plural(g.orders.length, 'order') + ' · ' + peso(g.total) + '</span></div>' +
            renderEach(g.orders, function (o) {
                return '<details class="order-fold"><summary><strong class="t-mono">' + escapeHtml(o.ref) + '</strong><span class="flex-fill">' +
                    escapeHtml(o.customer.name + ' · ' + glue(itemNames(o), ', ')) + '</span><span class="t-num">' + peso(orderTotal(o)) +
                    '</span><span class="t-caption dim">' + escapeHtml(formatStamp(o.completedAt)) + '</span></summary>' +
                    deskCardHtml(o, 0, false, 'Completed ' + formatStamp(o.completedAt)) + '</details>';
            }) + '</section>';
    });
}

// "Rose Bouquet × 2".
// Time O(n) · Space O(n)
function itemNames(order) {
    var out = [];
    for (var i = 0; i < order.items.length; i++) listAdd(out, order.items[i].productName + ' × ' + order.items[i].quantity);
    return out;
}

// Tab ng mga na-void.
// Time O(n²) · Space O(n)
function voidedHtml() {
    var list = voidedOrders();
    if (list.length === 0) return emptyHtml('trash', 'Nothing voided', 'Cancelled orders are kept here as VOIDED – NON-REFUNDABLE.');
    return '<p class="t-foot dim mb-3">Cancelled orders are never deleted. Any payment made is retained.</p>' +
        renderEach(list, function (o) { return deskCardHtml(o, 0, false, ''); });
}

// Mga bilang sa tabs.
// Time O(n) · Space O(n)
function tabCount(id) {
    if (id === 'quotes') return quoteQueue.count;
    if (id === 'payment') return ordersWithStatus('quoted').length;
    if (id === 'production') return rushLane.size + standardLane.count;
    if (id === 'completed') return ordersWithStatus('completed').length;
    if (id === 'voided') return ordersWithStatus('voided').length;
    if (id === 'products') return countWhere(products, function (p) { return !p.active; });
    if (id === 'outbox') return countWhere(outbox, function (m) { return m.status === 'failed'; });
    if (id === 'logs') return recentSecurityCounts(Date.now()).failedPasswords;
    return -1;
}

// Ipinapakita yung desk at yung tab na bukas.
// Time O(n²) · Space O(n)
function renderDesk() {
    var tabs = deskTabs(), me = currentAccount();
    if (!firstWhere(tabs, function (t) { return t.id === deskState.tab; })) deskState.tab = 'overview';
    $('#deskUser').textContent = me ? me.name + ' · ' + (isOwner(me) ? 'Owner' : 'Staff') : '';
    $('#adminTabs').innerHTML = renderEach(tabs, function (t) {
        var count = tabCount(t.id);
        var note = t.id === 'products' ? (count > 0 ? count + ' off' : '') : t.id === 'outbox' ? (count > 0 ? count + ' failed' : '')
                 : t.id === 'logs' ? (count > 0 ? count + ' wrong ' + plural(count, 'password') : '')
                 : (count >= 0 ? String(count) : '');
        return '<button class="chip" type="button" data-tab="' + t.id + '" aria-pressed="' + (deskState.tab === t.id ? 'true' : 'false') + '">' +
               escapeHtml(t.label) + (note ? ' <span class="chip-count">' + note + '</span>' : '') + '</button>';
    });
    var tab = deskState.tab, html;
    if (tab === 'quotes') html = quotesHtml();
    else if (tab === 'payment') html = paymentHtml();
    else if (tab === 'production') html = productionHtml();
    else if (tab === 'completed') html = completedHtml();
    else if (tab === 'voided') html = voidedHtml();
    else if (tab === 'products') html = productsDeskHtml();
    else if (tab === 'outbox') html = outboxHtml();
    else if (tab === 'logs') html = logsHtml();
    else if (tab === 'account') html = accountHtml();
    else html = overviewHtml();
    $('#adminMain').innerHTML = html;
}

// Ulit i-render pagkatapos ng kahit anong pagbabago.
// Time O(n²) · Space O(n)
function deskChanged() {
    renderDesk();
    refreshShop();
}

// ---------- Pakita, sign out at events ----------

// Pakita yung order desk (o sign-in kung hindi pa).
// Time O(n²) · Space O(n)
function showDesk() {
    setHidden($('#shopView'), true);
    setHidden($('#adminView'), false);
    setHidden($('#adminLogin'), deskState.authed);
    setHidden($('#adminConsole'), !deskState.authed);
    document.title = 'Order desk — Sýmpan Universe';
    if (deskState.authed) renderDesk();
    else showSignInStage(deskState.stage);
    window.scrollTo(0, 0);
}

// Sign out at alis ang mga numero sa page.
// Time O(n) · Space O(1)
function signOut() {
    endDeskSession(Date.now(), ' signed out of the order desk');
    location.hash = '#top';
}

// Tapos ang session: log, kalimutan kung sino, at linisin yung
// page at sign-in form.
// Time O(n) · Space O(1)
function endDeskSession(now, why) {
    var account = currentAccount();
    if (deskState.authed && account) logSecurity(now, 'signed-out', 'info', account.name, account.name + why, '');
    deskState.authed = false;
    deskUserId = 0;
    deskState.pendingId = 0;
    deskState.stage = 'password';
    deskState.otp = null;
    $('#adminMain').innerHTML = '';
    $('#adminTabs').innerHTML = '';
    // Malinis na sign-in form para sa susunod na tao.
    var fields = ['#loginEmail', '#passcodeInput', '#otpInput', '#resetEmail', '#resetCode', '#resetPassword', '#resetConfirm'];
    for (var i = 0; i < fields.length; i++) if ($(fields[i])) $(fields[i]).value = '';
}

// May tap o key habang naka-sign in.
// Time O(1) · Space O(1)
function noteDeskActivity() {
    if (deskState.authed) deskState.lastActive = Date.now();
}

// Pag 15 minutong walang galaw, sign out na agad. Chine-check kada minuto.
// Time O(n) · Space O(1)
function checkDeskIdle(now) {
    if (!deskState.authed || now - (deskState.lastActive || 0) < DESK_IDLE_MS) return;
    endDeskSession(now, ' was signed out after ' + (DESK_IDLE_MS / 60000) + ' minutes without activity');
    deskState.notice = 'You were signed out after ' + (DESK_IDLE_MS / 60000) + ' minutes without activity. Sign in again to continue.';
    if (!$('#adminView').classList.contains('hidden')) showDesk();
}

// Hanap ng order gamit yung reference (binary search).
// Time O(n²) · Space O(n)
function onFind(e) {
    e.preventDefault();
    var order = orderByRef($('#findInput').value);
    if (!order) { toast({ title: 'No order with that reference.', kind: 'warn' }); return; }
    $('#findInput').value = '';
    openDeskOrder(order.id);
}

// Isang handler para sa lahat ng data-act na button.
// Time O(n²) · Space O(n)
function onDeskAction(e, button) {
    var act = button.getAttribute('data-act'), id = Number(button.getAttribute('data-id'));
    if (act === 'open') openDeskOrder(id);
    else if (act === 'quote') openQuoteEditor(id);
    else if (act === 'edit') openOrderEditor(id);
    else if (act === 'accept') openDeskPayment(id, 'accept');
    else if (act === 'balance') openDeskPayment(id, 'balance');
    else if (act === 'void') confirmDeskVoid(id);
    else if (act === 'tracking') openTrackingEditor(id);
    else if (act === 'complete-next') {
        var done = completeNext(Date.now());
        if (!done.ok) toast({ title: done.error, kind: 'warn' });
        else toast({ title: done.order.ref + ' is ready — the customer has been emailed', kind: 'success', message: done.skipped.length === 0 ? '' :
            renderEach(done.skipped, function (o) { return o.ref; }, ', ') + ' still ' + plural(done.skipped.length, 'owes', 'owe') + ' a balance and keeps its place.' });
        deskChanged();
    } else if (act === 'undo-complete') {
        var undone = undoCompletion(Date.now());
        toast(undone.ok ? { title: undone.order.ref + ' is back in production', kind: 'info' } : { title: undone.error, kind: 'warn' });
        deskChanged();
    } else if (act === 'product-edit') openProductEditor(id);
    else if (act === 'product-toggle') toggleProduct(id);
}

// Kinakabit yung mga event ng desk.
// Time O(1) · Space O(1)
function initDesk() {
    initSignIn();
    // Kahit anong tap o key, bilang na galaw para sa idle sign-out.
    document.addEventListener('pointerdown', noteDeskActivity, true);
    document.addEventListener('keydown', noteDeskActivity, true);
    $('#findIcon').innerHTML = icon('search');
    $('#logoutButton').addEventListener('click', signOut);
    $('#findForm').addEventListener('submit', onFind);
    on($('#adminTabs'), 'click', '[data-tab]', function (e, b) {
        deskState.tab = b.getAttribute('data-tab');
        renderDesk();
    });
    on($('#adminMain'), 'click', '[data-act]', onDeskAction);
    var main = $('#adminMain');
    main.addEventListener('click', function (e) {
        if (e.target.closest('[data-mail-retry]')) {
            var count = retryFailedMail();
            logAudit(Date.now(), deskActor(), 'Queued ' + count + ' failed ' + plural(count, 'email') + ' again', '', '');
            toast({ title: count + ' ' + plural(count, 'email') + ' queued again', kind: 'info' });
            renderDesk();
            return;
        }
        if (deskState.tab === 'overview') onOverviewClick(e);
        else if (deskState.tab === 'logs') onLogsClick(e);
        else if (deskState.tab === 'account') onAccountClick(e);
    });
    main.addEventListener('change', function (e) { if (deskState.tab === 'overview') onOverviewInput(e); });
    main.addEventListener('input', function (e) { if (deskState.tab === 'logs') onLogsInput(e); });
    main.addEventListener('submit', function (e) {
        if (deskState.tab === 'logs') { e.preventDefault(); onLogsInput(e); }
        else if (deskState.tab === 'account') onAccountSubmit(e);
    });
    initDeskSheet();
}
