/* =========================================================================
   AUDIT — the security log and the audit log, in one append-only array.

   Every entry is { id, stamp, kind, code, level, actor, action, detail, ref }:
     kind    'security' — signing in, codes, password resets, failed
             customer look-ups; 'audit' — what was done to an order or a
             product, and by whom
     code    a short fixed name for the event ('password-wrong' …), so the
             summary can count events without reading their wording
     level   'info', 'warn' or 'alert'
     actor   the desk account's name, 'Customer', 'System', or the email
             typed at sign-in
     ref     the order's tracking number, when there is one

   Entries are only ever appended, in the order things happen, so the
   array is already in time order: the newest are at the end and nothing
   needs sorting. Like every other record the log lives in this page's
   memory, so a reload starts it again.
   Depends on store.js (auditLog, failedSignIns, counters) and algorithms.js.
   ========================================================================= */

var LOG_KINDS = [
    { id: 'all', label: 'Everything' },
    { id: 'security', label: 'Security' },
    { id: 'audit', label: 'Orders & products' }
];
var LOG_LEVELS = [
    { id: 'info', label: 'Info' },
    { id: 'warn', label: 'Warning' },
    { id: 'alert', label: 'Alert' }
];
var LOG_ACTOR_MAX = 80;

/* Append one entry. The log only ever grows at its end.
                                          Time O(n) for the actor's text · Space O(1) */
function logEvent(stamp, e) {
    var entry = {
        id: counters.log, stamp: stamp, kind: e.kind, code: e.code || '', level: e.level || 'info',
        actor: textCut(strip(String(e.actor || 'System')), LOG_ACTOR_MAX),
        action: e.action, detail: e.detail || '', ref: e.ref || ''
    };
    counters.log++;
    listAdd(auditLog, entry);
    return entry;
}

/* A security event.                      Time O(n) · Space O(1) */
function logSecurity(stamp, code, level, actor, action, detail) {
    return logEvent(stamp, { kind: 'security', code: code, level: level, actor: actor, action: action, detail: detail });
}

/* Something done to an order or a product.  Time O(n) · Space O(1) */
function logAudit(stamp, actor, action, ref, detail, level) {
    return logEvent(stamp, { kind: 'audit', code: 'change', level: level || 'info', actor: actor, action: action,
                             ref: ref, detail: detail });
}

/* What the security log keeps of text typed into an email box: the email,
   in one spelling — or, when it is not an email address (a password typed
   in the wrong box, say), only that fact, never the text itself.
                                          Time O(n) · Space O(n) */
function typedEmail(text) {
    var email = accountEmailKey(text);
    if (email === '') return '(left blank)';
    return isValidEmail(email) ? email : '(not an email address)';
}

/* The sign-in record for an email that was typed — wrong passwords in
   all (count), wrong ones in a row (streak) and when its pause ends — found
   in the hash table in O(1) on average, or made.
                                          Time O(1) average + O(n) for the text · Space O(1) */
function signInGuard(email) {
    var key = typedEmail(email);
    var row = hashGet(failedSignIns, key);
    if (row === null) {
        row = { email: key, count: 0, streak: 0, lockedUntil: 0, last: 0 };
        hashPut(failedSignIns, key, row);
    }
    return row;
}

/* One more wrong password for the email that was typed.
                                          Time O(1) average + O(n) for the text · Space O(1) */
function noteFailedSignIn(email, stamp) {
    var row = signInGuard(email);
    row.count++;
    row.streak++;
    row.last = stamp;
    return row;
}

/* How many codes an address has been sent this hour, from the hash table.
   Sign-in and reset codes share it, and starting either again does not
   clear it, so nobody can flood an inbox (or the shop's monthly email
   allowance) by pressing Back and starting over.
                                          Time O(1) average + O(n) for the text · Space O(1) */
function codeBudget(email, now) {
    var key = typedEmail(email);
    var row = hashGet(codeSends, key);
    if (row === null) {
        row = { email: key, since: now, count: 0 };
        hashPut(codeSends, key, row);
    }
    if (now - row.since >= CODE_SEND_WINDOW_MS) { row.since = now; row.count = 0; }
    return row;
}

/* May another code go to this address now?  Time O(1) average + O(n) · Space O(1) */
function canSendCode(email, now) {
    return codeBudget(email, now).count < CODE_SEND_MAX;
}

/* Count one code sent to this address.   Time O(1) average + O(n) · Space O(1) */
function noteCodeSent(email, now) {
    codeBudget(email, now).count++;
}

/* What to say when the hour's codes are used up.  Time O(1) · Space O(1) */
function tooManyCodesMessage() {
    return 'Too many codes have been sent to this email in the last hour. Try again later.';
}

/* The emails that had wrong passwords, most tries first.
                                          Time O(n²) · Space O(n) */
function failedSignInRows() {
    var entries = hashEntries(failedSignIns), rows = [];
    for (var i = 0; i < entries.length; i++) if (entries[i].value.count > 0) listAdd(rows, entries[i].value);
    return insertionSort(rows, function (a, b) { return b.count - a.count || b.last - a.last; });
}

/* Everything an entry says, for the search box.  Time O(n) · Space O(n) */
function logText(entry) {
    return entry.actor + ' ' + entry.action + ' ' + entry.detail + ' ' + entry.ref + ' ' + entry.kind + ' ' + entry.level;
}

/* The entries of one kind ('all', 'security' or 'audit') whose text has
   every search word, newest first. The log is already in time order, so
   reading it back to front is enough — no sort.
                                          Time O(n²) — naive string matching on every entry · Space O(n) */
function logEntries(kind, query) {
    var newest = backwards(auditLog);
    var ofKind = kind === 'security' || kind === 'audit'
        ? keepWhere(newest, function (e) { return e.kind === kind; })
        : newest;
    return linearSearch(ofKind, query, logText);
}

/* Security events in the last 24 hours. The log is in time order, so the
   walk starts at the newest entry and stops at the first one older than a
   day instead of reading the whole log.  Time O(n) · Space O(1) */
function recentSecurityCounts(now) {
    var c = { total: 0, failedPasswords: 0, locks: 0, failedCodes: 0, passwordChanges: 0, failedLookups: 0 };
    for (var i = auditLog.length - 1; i >= 0 && now - auditLog[i].stamp <= DAY_MS; i--) {
        var e = auditLog[i];
        if (e.kind !== 'security') continue;
        c.total++;
        if (e.code === 'password-wrong' || e.code === 'locked-try' || e.code === 'current-wrong') c.failedPasswords++;
        else if (e.code === 'locked') c.locks++;
        else if (e.code === 'code-wrong' || e.code === 'code-expired' || e.code === 'code-max' ||
                 e.code === 'reset-code-wrong' || e.code === 'reset-expired' || e.code === 'reset-max') c.failedCodes++;
        else if (e.code === 'password-changed') c.passwordChanges++;
        else if (e.code === 'lookup-failed') c.failedLookups++;
    }
    return c;
}

/* One CSV field: quoted, quotes doubled. A field that a spreadsheet would
   read as a formula (its first visible character is = + - or @, or it
   starts with a tab or a line break) gets a leading apostrophe, so a typed
   "email" can never run as one.          Time O(n) · Space O(n) */
function csvField(value) {
    var s = String(value === null || value === undefined ? '' : value), out = '"', at = 0;
    while (at < s.length && s.charAt(at) === ' ') at++;
    var first = s.charAt(0), visible = s.charAt(at);
    if (visible === '=' || visible === '+' || visible === '-' || visible === '@' ||
        first === '\t' || first === '\r' || first === '\n') out += "'";
    for (var i = 0; i < s.length; i++) {
        var c = s.charAt(i);
        out += c === '"' ? '""' : c;
    }
    return out + '"';
}

/* The entries as CSV text, one row each.  Time O(n) · Space O(n) */
function logCsv(entries) {
    var lines = ['"Time","Kind","Level","Who","What","Details","Order"'];
    for (var i = 0; i < entries.length; i++) {
        var e = entries[i];
        listAdd(lines, glue([csvField(formatStamp(e.stamp)), csvField(e.kind), csvField(e.level), csvField(e.actor),
                             csvField(e.action), csvField(e.detail), csvField(e.ref)], ','));
    }
    return glue(lines, '\r\n');
}
