/* =========================================================================
   DESK · OVERVIEW
   Daily, monthly at yearly na numero, breakdown at best sellers.
   ========================================================================= */

var overviewState = { kind: 'day', key: '' };

var PERIOD_KINDS = [
    { id: 'day', label: 'Daily' },
    { id: 'month', label: 'Monthly' },
    { id: 'year', label: 'Yearly' }
];

// Isang card ng numero.
// Time O(1) · Space O(1)
function kpiHtml(label, value, note) {
    return '<div class="kpi"><p class="kpi-label t-foot">' + escapeHtml(label) + '</p><p class="kpi-value">' + escapeHtml(value) +
           '</p>' + (note ? '<p class="kpi-note t-caption">' + escapeHtml(note) + '</p>' : '') + '</div>';
}

// Daily, Monthly, Yearly, picker, at previous/next.
// Time O(n²) · Space O(n)
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

// Mga araw ng buwan o buwan ng taon, may bar ng pera.
// Time O(n) · Space O(n)
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

// Isang araw: lahat ng order na na-place.
// Time O(n²) (bawat order at mga line nito) · Space O(n)
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

// Buong Overview tab.
// Time O(n²) · Space O(n)
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

// Unang araw ng period key.
// Time O(1) · Space O(1)
function anchorDate(key) {
    if (key.length === 4) return key + '-01-01';
    if (key.length === 7) return key + '-01';
    return key || todayIso();
}

// Mga control ng Overview.
// Time O(n²) · Space O(n)
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

// Mga click sa Overview.
// Time O(n²) · Space O(n)
function onOverviewClick(e) {
    var b = e.target.closest('button');
    if (!b) return false;
    var s = overviewState;
    if (b.hasAttribute('data-period-kind')) {
        // Parehong araw pa rin ang tinitingnan: 5 Oct -> October -> 2026.
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
