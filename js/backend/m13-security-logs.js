/* =========================================================================
   MODULE 13 · SECURITY AT AUDIT LOGS
   Isang append-only na array: sa dulo lang nadadagdag kaya laging naka-ayos
   ayon sa oras, at "bago muna" ay basa lang pabaliktad. Hash table ng mga
   maling password at ng mga code na na-send kada email. Nandito rin ang
   password reset gamit ang code na ini-email.
   ========================================================================= */

// ---------- Log ----------

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

// Nagdadagdag ng isang entry sa dulo ng log. Sa dulo lang lagi
// kaya naka-ayos na ayon sa oras.
// Time O(n) sa text ng actor · Space O(1)
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

// Security na event (sign-in, code, password).
// Time O(n) · Space O(1)
function logSecurity(stamp, code, level, actor, action, detail) {
    return logEvent(stamp, { kind: 'security', code: code, level: level, actor: actor, action: action, detail: detail });
}

// May ginawa sa order o product (sino at ano).
// Time O(n) · Space O(1)
function logAudit(stamp, actor, action, ref, detail, level) {
    return logEvent(stamp, { kind: 'audit', code: 'change', level: level || 'info', actor: actor, action: action,
                             ref: ref, detail: detail });
}

// Ano lang ang itatago sa log galing sa email box: yung email kung
// email talaga, kung hindi (baka password na-type) "(not an email address)".
// Time O(n) · Space O(n)
function typedEmail(text) {
    var email = accountEmailKey(text);
    if (email === '') return '(left blank)';
    return isValidEmail(email) ? email : '(not an email address)';
}

// ---------- Bantay sa sign-in at sa dami ng code ----------

// Record ng email sa sign-in: ilang mali lahat, ilang sunod-sunod,
// at kailan matatapos yung pause. Nasa hash table, O(1) average.
// Time O(1) average + O(n) sa text · Space O(1)
function signInGuard(email) {
    var key = typedEmail(email);
    var row = hashGet(failedSignIns, key);
    if (row === null) {
        row = { email: key, count: 0, streak: 0, lockedUntil: 0, last: 0 };
        hashPut(failedSignIns, key, row);
    }
    return row;
}

// Dagdag ng isang maling password para sa email na tinype.
// Time O(1) average + O(n) sa text · Space O(1)
function noteFailedSignIn(email, stamp) {
    var row = signInGuard(email);
    row.count++;
    row.streak++;
    row.last = stamp;
    return row;
}

// Ilang code na ang na-send sa address ngayong oras (hash table).
// Pareho ang sign-in at reset, at hindi nare-reset pag inulit.
// Time O(1) average + O(n) sa text · Space O(1)
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

// Pwede pa bang mag-send ng code sa address ngayon?
// Time O(1) average + O(n) · Space O(1)
function canSendCode(email, now) {
    return codeBudget(email, now).count < CODE_SEND_MAX;
}

// Bilang ng isang code na na-send.
// Time O(1) average + O(n) · Space O(1)
function noteCodeSent(email, now) {
    codeBudget(email, now).count++;
}

// Sasabihin pag ubos na yung codes ngayong oras.
// Time O(1) · Space O(1)
function tooManyCodesMessage() {
    return 'Too many codes have been sent to this email in the last hour. Try again later.';
}

// Mga email na nagkamali ng password, pinakamarami muna.
// Time O(n²) · Space O(n)
function failedSignInRows() {
    var entries = hashEntries(failedSignIns), rows = [];
    for (var i = 0; i < entries.length; i++) if (entries[i].value.count > 0) listAdd(rows, entries[i].value);
    return insertionSort(rows, function (a, b) { return b.count - a.count || b.last - a.last; });
}

// ---------- Logs tab: hanap, 24 oras, CSV ----------

// Lahat ng sinasabi ng entry, para sa search box.
// Time O(n) · Space O(n)
function logText(entry) {
    return entry.actor + ' ' + entry.action + ' ' + entry.detail + ' ' + entry.ref + ' ' + entry.kind + ' ' + entry.level;
}

// Mga entry ng isang uri na may lahat ng salitang hinanap, bago
// muna. Naka-ayos na ayon sa oras kaya babasahin lang pabaliktad.
// Time O(n²) (naive string matching sa bawat entry) · Space O(n)
function logEntries(kind, query) {
    var newest = backwards(auditLog);
    var ofKind = kind === 'security' || kind === 'audit'
        ? keepWhere(newest, function (e) { return e.kind === kind; })
        : newest;
    return linearSearch(ofKind, query, logText);
}

// Mga security event sa huling 24 oras. Mula sa pinakabago,
// titigil sa unang entry na lampas isang araw.
// Time O(n) · Space O(1)
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

// Isang field ng CSV, naka-quote. Kung parang formula (= + - @),
// nilalagyan ng apostrophe para hindi tumakbo sa spreadsheet.
// Time O(n) · Space O(n)
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

// Lahat ng entry bilang CSV, isang row bawat isa.
// Time O(n) · Space O(n)
function logCsv(entries) {
    var lines = ['"Time","Kind","Level","Who","What","Details","Order"'];
    for (var i = 0; i < entries.length; i++) {
        var e = entries[i];
        listAdd(lines, glue([csvField(formatStamp(e.stamp)), csvField(e.kind), csvField(e.level), csvField(e.actor),
                             csvField(e.action), csvField(e.detail), csvField(e.ref)], ','));
    }
    return glue(lines, '\r\n');
}

// ---------- Password reset ----------

// Bagong reset code, hash lang ang tinatago. Binabalik para ma-email.
// Time O(n) · Space O(n)
function issueResetCode(now) {
    var r = deskState.reset, code = otpCode();
    noteCodeSent(r.email, now);
    r.hash = fnv1a(code);
    r.expires = now + RESET_LIFETIME_MS;
    r.tries = 0;
    r.sentAt = now;
    r.sends++;
    logSecurity(now, 'reset-sent', 'info', r.email, 'Password reset code sent to ' + maskEmail(r.accountEmail), '');
    return code;
}

// Bago mag-step 1: '' kung pwede pang humingi ng code ngayon.
// Depende lang sa bilang ng code, hindi kung may account.
// Time O(1) average + O(n) sa text · Space O(1)
function resetRequestProblem(email, now) {
    if (canSendCode(email, now)) return '';
    logSecurity(now, 'codes-max', 'warn', typedEmail(email), 'Password reset asked for too often', '');
    return tooManyCodesMessage();
}

// Step 1 ng reset. Code ang balik, o '' kung walang active na
// account. Pareho pa rin ang screen at hintay para hindi mahalata.
// Time O(n) · Space O(n)
function startPasswordReset(email, now) {
    var account = accountByEmail(email), known = !!account && account.active;
    deskState.reset = { email: typedEmail(email), known: known,
                        accountId: known ? account.id : 0, accountEmail: known ? account.email : '',
                        hash: 0, expires: now + RESET_LIFETIME_MS, tries: 0, sentAt: now, sends: 0 };
    deskState.stage = 'reset-code';
    if (!known) {
        logSecurity(now, 'reset-unknown', 'warn', typedEmail(email), 'Password reset asked for an email with no active account', '');
        deskState.reset.sends = 1;
        noteCodeSent(email, now);
        return '';
    }
    return issueResetCode(now);
}

// Ilang seconds pa bago pwede ulit, -1 kung ubos na.
// Time O(1) · Space O(1)
function resetResendWait(now) {
    var r = deskState.reset;
    if (!r || r.sends >= RESET_MAX_SENDS) return -1;
    var wait = r.sentAt + RESET_RESEND_MS - now;
    return wait > 0 ? Math.ceil(wait / 1000) : 0;
}

// Isa pang code. Kung walang account, walang ipapadala pero pareho
// pa rin ang itsura. { code, message } ang balik.
// Time O(n) · Space O(1)
function resendResetCode(now) {
    var r = deskState.reset, wait = resetResendWait(now);
    if (wait < 0) return { code: '', message: 'Too many codes. Start the reset again.' };
    if (wait > 0) return { code: '', message: 'You can ask for a new code in ' + wait + ' seconds.' };
    if (!canSendCode(r.email, now)) return { code: '', message: tooManyCodesMessage() };
    if (!r.known) {
        r.sends++;
        r.sentAt = now;
        r.tries = 0;
        r.expires = now + RESET_LIFETIME_MS;
        noteCodeSent(r.email, now);
        return { code: '', message: '' };
    }
    return { code: issueResetCode(now), message: '' };
}

// Step 2 at 3: code muna (bawat mali, bawas sa tries), tapos
// yung bagong password. '' kung napalitan na.
// Time O(n) · Space O(n)
function completePasswordReset(code, password, confirm, now) {
    var r = deskState.reset;
    if (deskState.stage !== 'reset-code' || !r) return 'Start again with your email.';
    if (r.tries >= RESET_MAX_TRIES) return 'Too many wrong codes. Send a new one.';
    if (now > r.expires) {
        logSecurity(now, 'reset-expired', 'warn', r.email, 'Expired password reset code used', '');
        return 'That code has expired. Send a new one.';
    }
    var digits = digitsOnly(code);
    if (!r.known || digits.length !== OTP_LENGTH || fnv1a(digits) !== r.hash) {
        r.tries++;
        var left = RESET_MAX_TRIES - r.tries;
        logSecurity(now, left > 0 ? 'reset-code-wrong' : 'reset-max', left > 0 ? 'warn' : 'alert', r.email,
                    left > 0 ? 'Wrong password reset code' : 'Too many wrong password reset codes', '');
        return left > 0 ? 'That code is not right. ' + left + ' ' + plural(left, 'try', 'tries') + ' left.'
                        : 'Too many wrong codes. Send a new one.';
    }
    var account = accountById(r.accountId);
    var problem = passwordProblem(password, confirm, account);
    if (problem) return problem;
    setAccountPassword(account, password);
    var guard = signInGuard(account.email);
    guard.streak = 0;
    guard.lockedUntil = 0;
    deskState.reset = null;
    deskState.stage = 'password';
    deskState.otp = null;
    logSecurity(now, 'password-changed', 'alert', r.email, 'Password of ' + account.name + ' changed with a reset code',
                'The new password lasts until the page is reloaded');
    return '';
}
