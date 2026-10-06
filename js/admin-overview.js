/* =========================================================================
   ORDER DESK · OVERVIEW AND OUTBOX

   Overview: everything is counted for a chosen day, month or year — money
   collected, sales, orders placed, pieces sold, orders made ready, voids —
   with a breakdown one level down and that period's best sellers. A small
   "right now" strip keeps the live queues in view.

   Outbox: every email the shop has written, newest first, with whether it
   went out. Depends on admin-desk.js, reports.js and mail.js.
   ========================================================================= */

var overviewState = { kind: 'day', key: '' };

var PERIOD_KINDS = [
    { id: 'day', label: 'Daily' },
    { id: 'month', label: 'Monthly' },
    { id: 'year', label: 'Yearly' }
];

/* One figure card.                       Time O(1)  · Space O(1) */
function kpiHtml(label, value, note) {
    return '<div class="kpi"><p class="kpi-label t-foot">' + escapeHtml(label) + '</p><p class="kpi-value">' + escapeHtml(value) +
           '</p>' + (note ? '<p class="kpi-note t-caption">' + escapeHtml(note) + '</p>' : '') + '</div>';
}

/* Daily / Monthly / Yearly, the picker, and previous / next.
                                          Time O(n²) · Space O(n) */
function periodControlsHtml() {
    var s = overviewState, picker;
    if (s.kind === 'day') picker = '<input class="input period-pick" type="date" data-period-pick value="' + escapeHtml(s.key) + '" aria-label="Day">';
    else if (s.kind === 'month') picker = '<input class="input period-pick" type="month" data-period-pick value="' + escapeHtml(s.key) + '" aria-label="Month">';
    else picker = '<select class="select period-pick" data-period-pick aria-label="Year">' + renderEach(yearsWithOrders(), function (y) {
        return '<option' + (y === s.key ? ' selected' : '') + '>' + escapeHtml(y) + '</option>';
    }) + '</select>';
    return '<div class="period-bar"><div class="segmented" role="tablist">' + renderEach(PERIOD_KINDS, function (k) {
            return '<button type="button" data-period-kind="' + k.id + '" aria-selected="' + (s.kind === k.id ? 'true' : 'false') + '">' +
                   escapeHtml(k.label) + '</button>';
        }) + '</div><div class="row-center">' +
        '<button class="ui-btn-icon" type="button" data-period-step="-1" aria-label="Previous">' + icon('left') + '</button>' + picker +
        '<button class="ui-btn-icon" type="button" data-period-step="1" aria-label="Next">' + icon('right') + '</button>' +
        '<button class="ui-btn ui-btn-ghost ui-btn-sm" type="button" data-period-today>Today</button></div></div>';
}

/* The month's days or the year's months, with a bar for money collected.
                                          Time O(n) · Space O(n) */
function breakdownHtml(report) {
    var most = 0;
    for (var i = 0; i < report.rows.length; i++) if (report.rows[i].totals.collected > most) most = report.rows[i].totals.collected;
    var active = report.kind === 'month'
        ? keepWhere(report.rows, function (r) { return r.totals.placed + r.totals.payments + r.totals.completed + r.totals.voided > 0; })
        : report.rows;
    if (active.length === 0) return '<p class="t-foot dim">Nothing happened in this period.</p>';
    return '<div class="table-wrap"><table class="tbl period-table"><thead><tr><th>' + (report.kind === 'year' ? 'Month' : 'Day') +
        '</th><th class="num">Orders</th><th class="num">Pieces sold</th><th class="num">Ready</th><th class="num">Collected</th><th class="bar-col"></th></tr></thead><tbody>' +
        renderEach(active, function (r) {
            var t = r.totals, width = most > 0 ? Math.round(t.collected / most * 100) : 0;
            return '<tr><td><button class="link-button" type="button" data-period-open="' + escapeHtml(r.key) + '">' +
                escapeHtml(report.kind === 'year' ? r.label : textPart(WEEKDAY_NAMES[weekdayOf(r.key)], 0, 3) + ' ' + r.label) + '</button></td>' +
                '<td class="num">' + t.placed + '</td><td class="num">' + t.units + '</td><td class="num">' + t.completed + '</td>' +
                '<td class="num">' + pesoWhole(t.collected) + '</td><td class="bar-col"><div class="bar-track"><div class="bar-fill" style="width:' +
                width + '%"></div></div></td></tr>';
        }) + '</tbody></table></div>' +
        (report.kind === 'month' ? '<p class="t-caption dim mt-2">Days with no activity are left out.</p>' : '');
}

/* A day: every order placed, as a compact list.  Time O(n²) — each order and its lines · Space O(n) */
function dayOrdersHtml(report) {
    if (report.orders.length === 0) return '<p class="t-foot dim">No orders were placed on this day.</p>';
    return '<div class="product-rows">' + renderEach(report.orders, function (o) {
        return '<article class="product-row"><strong class="t-mono">' + escapeHtml(o.ref) + '</strong><div class="flex-fill">' +
            '<p class="m-0">' + escapeHtml(o.customer.name + ' · ' + glue(itemNames(o), ', ')) + '</p><p class="t-caption dim m-0">' +
            escapeHtml(formatStamp(o.createdAt)) + '</p></div>' + statusBadge(o) +
            '<span class="t-num">' + escapeHtml(o.status === 'requested' ? estimateLabel(o) : peso(orderTotal(o))) + '</span>' +
            actButton('open', o.id, 'Details') + '</article>';
    }) + '</div>';
}

/*                                        Time O(n²) · Space O(n) */
function overviewHtml() {
    if (!overviewState.key) overviewState.key = todayIso();
    var report = periodReport(overviewState.kind, overviewState.key), t = report.totals, s = dashboardStats();
    var most = report.best.length > 0 ? report.best[0].units : 1;
    return '<section class="now-strip"><span class="t-over dim">Right now</span>' +
            '<button class="now-item" type="button" data-tab-jump="quotes"><strong>' + s.awaitingQuote + '</strong> to quote</button>' +
            '<button class="now-item" type="button" data-tab-jump="payment"><strong>' + s.awaitingPayment + '</strong> awaiting payment</button>' +
            '<button class="now-item" type="button" data-tab-jump="production"><strong>' + s.inProduction + '</strong> in production</button>' +
            '<span class="now-item"><strong>' + pesoWhole(s.outstanding) + '</strong> balances owed</span></section>' +
        periodControlsHtml() +
        '<h2 class="t-title1 mt-4 mb-3">' + escapeHtml(report.label) + '</h2>' +
        '<div class="kpi-grid desk-kpis">' +
            kpiHtml('Collected', pesoWhole(t.collected), t.payments + ' GCash ' + plural(t.payments, 'payment')) +
            kpiHtml('Sales', pesoWhole(t.sales), 'Paid orders placed in this period') +
            kpiHtml('Orders placed', String(t.placed), t.quoteRequests + ' ' + plural(t.quoteRequests, 'quote request')) +
            kpiHtml('Pieces sold', String(t.units), 'From paid orders') +
            kpiHtml('Made ready', String(t.completed), 'Completed and released') +
            kpiHtml('Voided', String(t.voided), pesoWhole(t.retained) + ' retained') +
        '</div>' +
        '<div class="lane-grid mt-5"><section class="panel"><div class="lane-head"><h3 class="t-title3">' +
            (report.kind === 'day' ? 'Orders placed' : report.kind === 'month' ? 'Day by day' : 'Month by month') + '</h3></div>' +
            (report.kind === 'day' ? dayOrdersHtml(report) : breakdownHtml(report)) + '</section>' +
        '<section class="panel"><div class="lane-head"><h3 class="t-title3">Best sellers</h3><span class="t-caption dim">By pieces sold · voided excluded</span></div>' +
            (report.best.length === 0 ? '<p class="t-foot dim">No paid orders in this period.</p>' : '<div class="bar-row">' + renderEach(report.best, function (row) {
                return '<div class="bar-item"><div class="bar-top t-foot"><span>' + escapeHtml(row.product.name) + '</span><span class="t-num">' +
                    row.units + ' sold · ' + row.orders + ' ' + plural(row.orders, 'order') + '</span></div><div class="bar-track"><div class="bar-fill" style="width:' +
                    Math.round(row.units / most * 100) + '%"></div></div></div>';
            }) + '</div>') +
        '</section></div>';
}

/* The first day of a period key.        Time O(1)  · Space O(1) */
function anchorDate(key) {
    if (key.length === 4) return key + '-01-01';
    if (key.length === 7) return key + '-01';
    return key || todayIso();
}

/* Overview controls.                     Time O(n²) · Space O(n) */
function onOverviewInput(e) {
    var t = e.target;
    if (!t.hasAttribute('data-period-pick') || !t.value) return;
    if (!dateFromIso(anchorDate(t.value)) || periodKey(overviewState.kind, anchorDate(t.value)) !== t.value) {
        toast({ title: 'Choose a date from the picker.', kind: 'warn' });
        return;
    }
    overviewState.key = t.value;
    renderDesk();
}

/*                                        Time O(n²) · Space O(n) */
function onOverviewClick(e) {
    var b = e.target.closest('button');
    if (!b) return false;
    var s = overviewState;
    if (b.hasAttribute('data-period-kind')) {
        // Keep looking at the same moment: 5 Oct → October → 2026, and back.
        s.kind = b.getAttribute('data-period-kind');
        s.key = periodKey(s.kind, anchorDate(s.key));
    } else if (b.hasAttribute('data-period-step')) {
        s.key = shiftPeriod(s.kind, s.key, Number(b.getAttribute('data-period-step')));
    } else if (b.hasAttribute('data-period-today')) {
        s.key = periodKey(s.kind, todayIso());
    } else if (b.hasAttribute('data-period-open')) {
        s.key = b.getAttribute('data-period-open');
        s.kind = s.key.length === 7 ? 'month' : 'day';
    } else if (b.hasAttribute('data-tab-jump')) {
        deskState.tab = b.getAttribute('data-tab-jump');
    } else {
        return false;
    }
    renderDesk();
    return true;
}

/* =========================================================================
   OUTBOX
   ========================================================================= */

var MAIL_STATUS = [
    { id: 'queued', label: 'Queued', tone: '' }, { id: 'sending', label: 'Sending', tone: 'badge-amber' },
    { id: 'sent', label: 'Sent', tone: 'badge-green' }, { id: 'failed', label: 'Failed', tone: 'badge-rose' },
    { id: 'simulated', label: 'Not sent — email not set up', tone: 'badge-amber' }
];

/* Newest first: the outbox is read back to front, so the sort only has
   to fix the few emails written out of time order (the demo history).
                                          Time O(n) here (nearly in order), O(n²) worst · Space O(n) */
function outboxHtml() {
    var list = insertionSort(backwards(outbox), function (a, b) { return b.stamp - a.stamp || b.id - a.id; });
    var failed = countWhere(outbox, function (m) { return m.kind !== 'otp' && (m.status === 'failed' || (m.status === 'simulated' && mailConfigured())); });
    var setup = mailConfigured() ? '' :
        '<div class="notice notice-warn">' + icon('alert', 16) + '<div><strong>Email is not connected yet.</strong> Customer emails and sign-in codes are ' +
        'written and kept here, but not sent. Fill in the three EmailJS values in <span class="t-mono">js/email-config.js</span> ' +
        '(the steps are at the top of that file) and they go out automatically.</div></div>';
    var head = '<div class="desk-bar">' + (failed > 0 ? '<button class="ui-btn ui-btn-primary" type="button" data-mail-retry>Send ' + failed +
        ' again</button>' : '') + '<span class="t-foot dim">Every order step emails the customer automatically. Sign-in codes are listed too.</span></div>';
    if (list.length === 0) return setup + head + emptyHtml('chat', 'No emails yet', 'Order confirmations, quotations and "ready" notices appear here as they are sent.');
    return setup + head + renderEach(list, function (m) {
        var status = firstWhere(MAIL_STATUS, function (s) { return s.id === m.status; });
        var order = m.orderId ? orderById(m.orderId) : null;
        // Sign-in codes are listed, but their content stays hidden.
        var body = m.kind === 'otp' ? 'Sign-in code — hidden.' : m.body;
        return '<details class="order-fold"><summary><span class="badge ' + status.tone + '">' + escapeHtml(status.label) + '</span>' +
            '<span class="flex-fill"><strong>' + escapeHtml(m.subject) + '</strong><span class="t-caption dim d-block">To ' + escapeHtml(m.to) +
            (order ? ' · ' + escapeHtml(order.ref) : '') + '</span></span><span class="t-caption dim">' + escapeHtml(formatStamp(m.stamp)) + '</span></summary>' +
            '<div class="mail-body"><pre class="mail-text">' + escapeHtml(body) + '</pre>' +
            (m.note ? '<p class="t-caption dim">' + escapeHtml(m.note) + '</p>' : '') + '</div></details>';
    });
}

/* Redraw the outbox when a send finishes. Called by mail.js.  Time O(n²) · Space O(n) */
function onMailChanged() {
    if (deskState.authed && deskState.tab === 'outbox' && !$('#adminConsole').classList.contains('hidden')) renderDesk();
}
