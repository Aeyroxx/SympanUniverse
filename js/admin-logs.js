/* =========================================================================
   ORDER DESK · LOGS — the security log and the audit log (audit.js).

   · the last 24 hours at a glance — counted by walking back from the
     newest entry and stopping at the first one older than a day
   · Everything / Security / Orders & products, and a search box (linear
     search with naive string matching over every entry's text)
   · newest first — the log is read back to front, it is never sorted
   · wrong passwords per email, from the hash table, most first
   · a CSV download of what is shown (a data: link — nothing is uploaded)
   Depends on admin-desk.js, admin-overview.js (kpiHtml) and audit.js.
   ========================================================================= */

var logsState = { kind: 'all', query: '', shown: 150 };

/* One entry as a row.                    Time O(n) · Space O(n) */
function logRowHtml(e) {
    var level = firstWhere(LOG_LEVELS, function (l) { return l.id === e.level; });
    var tone = e.level === 'alert' ? 'badge-rose' : (e.level === 'warn' ? 'badge-amber' : '');
    return '<tr class="log-row is-' + escapeHtml(e.level) + '"><td class="t-caption dim log-when">' + escapeHtml(formatStamp(e.stamp)) + '</td>' +
        '<td><span class="badge ' + tone + '">' + escapeHtml(level ? level.label : e.level) + '</span></td>' +
        '<td class="log-kind t-caption">' + escapeHtml(e.kind === 'security' ? 'Security' : 'Audit') + '</td>' +
        '<td class="log-who">' + escapeHtml(e.actor) + '</td>' +
        '<td><strong>' + escapeHtml(e.action) + '</strong>' + (e.ref ? ' <span class="t-mono t-caption">' + escapeHtml(e.ref) + '</span>' : '') +
        (e.detail ? '<span class="t-caption dim d-block log-detail">' + escapeHtml(e.detail) + '</span>' : '') + '</td></tr>';
}

/* Wrong passwords by the email that was typed.  Time O(n²) · Space O(n) */
function failedSignInHtml() {
    var rows = failedSignInRows();
    if (rows.length === 0) return '<p class="t-foot dim">No wrong passwords since the page was opened.</p>';
    return '<div class="table-wrap"><table class="tbl"><thead><tr><th>Email typed</th><th>Wrong passwords</th><th>Last try</th></tr></thead><tbody>' +
        renderEach(rows, function (r) {
            return '<tr><td>' + escapeHtml(r.email) + (isDeskEmail(r.email) ? ' <span class="badge">has an account</span>' : '') + '</td><td class="t-num">' +
                r.count + '</td><td class="t-caption dim">' + escapeHtml(formatStamp(r.last)) + '</td></tr>';
        }) + '</tbody></table></div>';
}

/* The CSV download link for what is shown.  Time O(n) · Space O(n) */
function logCsvHref(entries) {
    return 'data:text/csv;charset=utf-8,' + encodeURIComponent(logCsv(entries));
}

/* The whole Logs tab.                    Time O(n²) · Space O(n) */
function logsHtml() {
    var now = Date.now(), c = recentSecurityCounts(now), s = logsState;
    var entries = logEntries(s.kind, s.query), shown = copyRange(entries, 0, s.shown);
    var chips = renderEach(LOG_KINDS, function (k) {
        return '<button class="chip" type="button" data-log-kind="' + k.id + '" aria-pressed="' + (s.kind === k.id ? 'true' : 'false') + '">' +
               escapeHtml(k.label) + '</button>';
    });
    return '<p class="t-foot dim mb-3">Every sign-in attempt, code and password change (security), and everything done to an order or a product, ' +
        'by whom (audit). Like all data on this site, the logs live in this page\'s memory: reloading the page starts them again — download them first.</p>' +
        '<h3 class="t-title3 mb-2">Last 24 hours</h3><div class="kpi-grid desk-kpis mb-5">' +
        kpiHtml('Wrong passwords', String(c.failedPasswords), c.locks > 0 ? c.locks + ' ' + plural(c.locks, 'pause') + ' of ' + (ADMIN_LOCK_MS / 1000) +
                ' seconds' : 'No pauses') +
        kpiHtml('Wrong or expired codes', String(c.failedCodes), 'Sign-in and reset codes') +
        kpiHtml('Password changes', String(c.passwordChanges), c.passwordChanges > 0 ? 'Check that it was you' : 'None') +
        kpiHtml('Failed order look-ups', String(c.failedLookups), 'Track order, wrong number or contact') + '</div>' +
        '<form class="logs-bar" id="logsForm" role="search"><div class="chip-row" role="group" aria-label="Which log">' + chips + '</div>' +
        '<label class="search flex-fill"><span class="sr-only">Search the logs</span>' + icon('search') +
        '<input class="input" type="search" id="logsSearch" placeholder="Search: SU-215, wrong password, Customer…" value="' + escapeHtml(s.query) + '" autocomplete="off"></label>' +
        '<a class="ui-btn ui-btn-quiet ui-btn-sm" download="sympan-logs.csv" href="' + escapeHtml(logCsvHref(entries)) + '">' + icon('download', 16) + ' Download CSV</a></form>' +
        '<p class="t-foot dim mt-2 mb-2" role="status">' + entries.length + ' ' + plural(entries.length, 'entry', 'entries') +
        (entries.length > shown.length ? ' · showing the newest ' + shown.length : '') + '</p>' +
        (shown.length === 0 ? emptyHtml('list', 'Nothing matches', 'Try another word, or show everything.')
            : '<div class="table-wrap"><table class="tbl log-table"><thead><tr><th>When</th><th>Level</th><th>Log</th><th>Who</th><th>What</th></tr></thead><tbody>' +
              renderEach(shown, logRowHtml) + '</tbody></table></div>' +
              (entries.length > shown.length ? '<button class="ui-btn ui-btn-quiet mt-3" type="button" data-log-more>Show ' +
                  (entries.length - shown.length > 150 ? 150 : entries.length - shown.length) + ' more</button>' : '')) +
        '<h3 class="t-title3 mt-5 mb-2">Wrong passwords by email</h3>' + failedSignInHtml();
}

/* Typing in the search box: redraw the list, keep the cursor in the box.
                                          Time O(n²) · Space O(n) */
function onLogsInput(e) {
    var box = $('#logsSearch');
    if (!box || (e.target !== box && e.type !== 'submit')) return;
    logsState.query = box.value;
    logsState.shown = 150;
    renderDesk();
    var again = $('#logsSearch');
    if (again) { again.focus(); again.setSelectionRange(again.value.length, again.value.length); }
}

/* The kind chips and "Show more".        Time O(n²) · Space O(n) */
function onLogsClick(e) {
    var chip = e.target.closest('[data-log-kind]');
    if (chip) {
        logsState.kind = chip.getAttribute('data-log-kind');
        logsState.shown = 150;
        renderDesk();
        return;
    }
    if (e.target.closest('[data-log-more]')) {
        logsState.shown += 150;
        renderDesk();
    }
}
