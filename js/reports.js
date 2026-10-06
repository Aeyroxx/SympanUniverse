/* =========================================================================
   REPORTS — the Overview's figures for one day, month or year.

   A period is a kind ('day', 'month' or 'year') and a key: "2026-10-05",
   "2026-10" or "2026". Every date in the store is "YYYY-MM-DD", so a
   stamp falls in a period exactly when its date begins with the key.
   Depends on store.js and orders.js.
   ========================================================================= */

/* Does a moment fall inside the period?   Time O(1)  · Space O(1) */
function inPeriod(stamp, key) {
    return stamp > 0 && beginsWith(isoFromStamp(stamp), key);
}

/* The key for a date in a kind of period. Time O(1)  · Space O(1) */
function periodKey(kind, iso) {
    if (kind === 'year') return textPart(iso, 0, 4);
    if (kind === 'month') return textPart(iso, 0, 7);
    return iso;
}

/* "Monday, 5 October 2026", "October 2026" or "2026".  Time O(1) · Space O(1) */
function periodLabel(kind, key) {
    if (kind === 'year') return key;
    if (kind === 'month') return MONTH_NAMES[readNumber(key, 5, 7) - 1] + ' ' + textPart(key, 0, 4);
    return formatDateLong(key);
}

/* The period before or after.            Time O(1)  · Space O(1) */
function shiftPeriod(kind, key, step) {
    if (kind === 'day') return addDays(key, step);
    var year = readNumber(key, 0, 4);
    if (kind === 'year') return String(year + step);
    // Count months from year 0, step, then split back into year and month.
    var months = year * 12 + readNumber(key, 5, 7) - 1 + step;
    return floorDiv(months, 12) + '-' + twoDigits(months - floorDiv(months, 12) * 12 + 1);
}

/* Days in a "YYYY-MM" month.             Time O(1)  · Space O(1) */
function daysInMonth(key) {
    return monthLength(readNumber(key, 0, 4), readNumber(key, 5, 7));
}

/* A period's figures, all zero.          Time O(1)  · Space O(1) */
function emptyTotals() {
    return { placed: 0, quoteRequests: 0, sales: 0, units: 0, completed: 0, voided: 0, retained: 0, collected: 0, payments: 0 };
}

/* Which bucket a moment falls in: -1 outside the period; otherwise 0, or
   with a breakdown the day of the month ('day') or the month of the year
   ('month') minus one — the bucket's index, read straight off the date.
                                          Time O(1)  · Space O(1) */
function bucketOf(stamp, key, part) {
    if (!(stamp > 0)) return -1;
    var iso = isoFromStamp(stamp);
    if (!beginsWith(iso, key)) return -1;
    if (part === 'day') return readNumber(iso, 8, 10) - 1;
    if (part === 'month') return readNumber(iso, 5, 7) - 1;
    return 0;
}

/* Add every order and receipt into the bucket its date picks. One pass
   fills every bar of the chart at once; nothing is read twice.
                                          Time O(n²) — the lines of every order · Space O(1) */
function tallyPeriods(buckets, key, part) {
    for (var o = 0; o < orders.length; o++) {
        var order = orders[o], at = bucketOf(order.createdAt, key, part);
        if (at >= 0) {
            var t = buckets[at];
            t.placed++;
            if (countWhere(order.items, function (item) { return item.kind === 'quote'; }) > 0) t.quoteRequests++;
            if (countsAsSale(order)) {
                t.sales = roundMoney(t.sales + orderTotal(order));
                t.units += sumRecursive(order.items, function (item) { return item.quantity; });
            }
        }
        if (order.status === 'completed') {
            at = bucketOf(order.completedAt, key, part);
            if (at >= 0) buckets[at].completed++;
        }
        if (order.status === 'voided') {
            at = bucketOf(order.voidedAt, key, part);
            if (at >= 0) {
                buckets[at].voided++;
                buckets[at].retained = roundMoney(buckets[at].retained + order.amountPaid);
            }
        }
    }
    for (var r = 0; r < receipts.length; r++) {
        at = bucketOf(receipts[r].stamp, key, part);
        if (at >= 0) {
            buckets[at].collected = roundMoney(buckets[at].collected + receipts[r].amount);
            buckets[at].payments++;
        }
    }
}

/* Totals for any period: orders placed, money in, pieces sold, and what
   was completed or voided.               Time O(n²) · Space O(1) */
function periodTotals(key) {
    var one = [emptyTotals()];
    tallyPeriods(one, key, '');
    return one[0];
}

/* Everything the Overview shows for one period, with a breakdown one
   level down: the day's orders, the month's days, the year's months.
   The breakdown's bars are filled by one tallyPeriods pass.
                                          Time O(n²) · Space O(n) */
function periodReport(kind, key) {
    var rows = [], part = '';
    if (kind === 'year') {
        part = 'month';
        for (var m = 1; m <= 12; m++) listAdd(rows, { key: key + '-' + twoDigits(m), label: MONTH_SHORT[m - 1], totals: emptyTotals() });
    } else if (kind === 'month') {
        part = 'day';
        var days = daysInMonth(key);
        for (var d = 1; d <= days; d++) listAdd(rows, { key: key + '-' + twoDigits(d), label: String(d), totals: emptyTotals() });
    }
    if (rows.length > 0) {
        var buckets = [];
        for (var b = 0; b < rows.length; b++) listAdd(buckets, rows[b].totals);
        tallyPeriods(buckets, key, part);
    }
    var placed = kind === 'day'
        ? insertionSort(keepWhere(orders, function (o) { return inPeriod(o.createdAt, key); }), function (a, b) { return a.createdAt - b.createdAt; })
        : [];
    return {
        kind: kind, key: key, label: periodLabel(kind, key),
        totals: periodTotals(key), rows: rows, orders: placed,
        best: topSellers(salesTally(function (o) { return inPeriod(o.createdAt, key); }), 5)
    };
}

/* The years that have any orders, newest first, for the year picker.
                                          Time O(n²) · Space O(n) */
function yearsWithOrders() {
    var years = [];
    for (var i = 0; i < orders.length; i++) {
        var y = textPart(isoFromStamp(orders[i].createdAt), 0, 4);
        if (!isIn(years, y)) listAdd(years, y);
    }
    var now = textPart(todayIso(), 0, 4);
    if (!isIn(years, now)) listAdd(years, now);
    return insertionSort(years, function (a, b) { return compareText(b, a); });
}
