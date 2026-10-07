/* =========================================================================
   MODULE 12 · ORDER DESK AT ACCOUNTS
   Sign-in: email at password, tapos six-digit code sa email (two-step).
   Accounts: array na naka-ayos ayon sa id (binary search) at hash table
   email -> id. Salted hash lang ang tinatago, walang password. Overview:
   bawat order at resibo diretso sa araw o buwan niya sa isang pasada.

   Paalala: tumatakbo lahat sa browser, kaya pang-iwas lang ito sa customer.
   Kailangan ng server para sa totoong security.
   ========================================================================= */

// ---------- Sign-in (step 1 at 2) ----------

// State ng sign-in screens at ng desk.
var deskState = { tab: 'overview', authed: false, stage: 'password', otp: null, pendingId: 0, reset: null, notice: '' };

// "s••••••••@gmail.com", sapat para makilala pero hindi mabasa.
// Time O(n) · Space O(n)
function maskEmail(email) {
    var parts = cutText(email, '@');
    if (parts.length !== 2) return email;
    var name = parts[0], hidden = textPart(name, 0, 1);
    for (var i = 1; i < name.length; i++) hidden += '•';
    return hidden + '@' + parts[1];
}

// Email ba ito ng active na account?
// Time O(1) average + O(n) sa text · Space O(n)
function isDeskEmail(email) {
    var account = accountByEmail(email);
    return !!account && account.active;
}

// Step 1: email at password. '' kung pwede na i-send ang code.
// Hindi sinasabi kung alin ang mali o kung may account.
// Time O(n) · Space O(n)
function deskSignIn(email, password, now) {
    var guard = signInGuard(email), who = typedEmail(email);
    if (now < guard.lockedUntil) {
        logSecurity(now, 'locked-try', 'warn', who, 'Sign-in tried while this email is paused', '');
        return 'Too many attempts. Try again in ' + Math.ceil((guard.lockedUntil - now) / 1000) + ' seconds.';
    }
    var account = accountByEmail(email);
    if (account && account.active && checkPassword(account, password)) {
        guard.streak = 0;
        if (!canSendCode(account.email, now)) {
            logSecurity(now, 'codes-max', 'warn', who, 'Password accepted for ' + account.name + ', but its sign-in codes for this hour are used up', '');
            return tooManyCodesMessage();
        }
        deskState.pendingId = account.id;
        deskState.stage = 'otp';
        deskState.codesSent = 0;
        logSecurity(now, 'password-ok', 'info', who, 'Password accepted for ' + account.name + ' — sign-in code step', '');
        return '';
    }
    noteFailedSignIn(email, now);
    if (guard.streak >= ADMIN_MAX_ATTEMPTS) {
        guard.streak = 0;
        guard.lockedUntil = now + ADMIN_LOCK_MS;
        logSecurity(now, 'locked', 'alert', who, 'Sign-in paused for ' + (ADMIN_LOCK_MS / 1000) + ' seconds after ' + ADMIN_MAX_ATTEMPTS +
                    ' wrong passwords in a row', '');
        return 'Too many attempts. Sign-in for this email is paused for ' + (ADMIN_LOCK_MS / 1000) + ' seconds.';
    }
    var left = ADMIN_MAX_ATTEMPTS - guard.streak;
    logSecurity(now, 'password-wrong', 'warn', who, 'Wrong email or password',
                (account && !account.active ? 'The account is disabled. ' : (account ? '' : 'No account has this email. ')) +
                left + ' ' + plural(left, 'try', 'tries') + ' left');
    return 'That email or password is not right. ' + left + ' ' + plural(left, 'try', 'tries') + ' left.';
}

// Bagong code, hash lang ang tinatago, at bilang sa allowance
// ngayong oras. Binabalik yung code para ma-email.
// Time O(n) sa email · Space O(1)
function issueOtp(now) {
    var code = otpCode(), account = accountById(deskState.pendingId);
    if (account) noteCodeSent(account.email, now);
    deskState.codesSent = (deskState.codesSent || 0) + 1;
    deskState.otp = { hash: fnv1a(code), expires: now + OTP_LIFETIME_MS, tries: 0, sentAt: now };
    return code;
}

// Pwede na bang mag-send ulit? Seconds na hihintayin, o -1 kung
// ubos na para sa sign-in na ito (o sa oras na ito).
// Time O(n) sa email · Space O(1)
function otpResendWait(now) {
    // Limits muna: hindi dapat ma-reset ng expired na code (otp = null).
    var account = accountById(deskState.pendingId);
    if (deskState.codesSent >= OTP_MAX_SENDS || (account && !canSendCode(account.email, now))) return -1;
    if (!deskState.otp) return 0;
    var wait = deskState.otp.sentAt + OTP_RESEND_MS - now;
    return wait > 0 ? Math.ceil(wait / 1000) : 0;
}

// Step 2: yung code. '' kung naka-sign in na.
// Time O(n) · Space O(1)
function verifyOtp(code, now) {
    var otp = deskState.otp, account = accountById(deskState.pendingId), owner = account ? account.email : '';
    if (deskState.stage !== 'otp' || !otp) return 'Start again with your email and password.';
    if (now > otp.expires) {
        deskState.otp = null;
        logSecurity(now, 'code-expired', 'warn', owner, 'Expired sign-in code used', '');
        return 'That code has expired. Send a new one.';
    }
    if (otp.tries >= OTP_MAX_TRIES) return 'Too many wrong codes. Send a new one.';
    if (fnv1a(digitsOnly(code)) === otp.hash && digitsOnly(code).length === OTP_LENGTH && account && account.active) {
        deskState.authed = true;
        deskState.stage = 'password';
        deskState.otp = null;
        deskUserId = account.id;
        account.lastSignIn = now;
        deskState.lastActive = now;
        logSecurity(now, 'code-ok', 'info', owner, 'Signed in to the order desk as ' + account.name + ' (' + account.role + ')', '');
        return '';
    }
    otp.tries++;
    var left = OTP_MAX_TRIES - otp.tries;
    logSecurity(now, left > 0 ? 'code-wrong' : 'code-max', left > 0 ? 'warn' : 'alert', owner,
                left > 0 ? 'Wrong sign-in code' : 'Too many wrong sign-in codes', '');
    return left > 0 ? 'That code is not right. ' + left + ' ' + plural(left, 'try', 'tries') + ' left.' : 'Too many wrong codes. Send a new one.';
}

// ---------- Accounts (credentials na nasa array) ----------

var ACCOUNT_ROLES = [
    { id: 'owner', label: 'Owner', note: 'Everything, including accounts and the logs' },
    { id: 'staff', label: 'Staff', note: 'Orders, production and products' }
];

// Sino ang naka-sign in sa desk ngayon: account id, o 0.
var deskUserId = 0;

// Random na anim na digit galing sa secure random ng browser.
// Time O(1) · Space O(1)
function otpCode() {
    var n = typeof crypto !== 'undefined' && crypto.getRandomValues
        ? crypto.getRandomValues(Uint32Array.of(0))[0]
        : Math.floor(Math.random() * 4294967296);
    return leftPad(n % 1000000, OTP_LENGTH, '0');
}

// Bagong random na salt para sa password.
// Time O(1) · Space O(1)
function makeSalt() {
    return 'su-' + otpCode() + otpCode();
}

// Ito yung tinatagong anyo ng password: FNV-1a ng salt at password,
// uulit-ulitin ng 200 rounds para mabagal hulaan.
// Time O(n) (fixed ang PASSWORD_ROUNDS) · Space O(n)
function passwordHash(salt, password) {
    var p = String(password === undefined || password === null ? '' : password);
    var h = fnv1a(salt + '|' + p);
    for (var r = 1; r < PASSWORD_ROUNDS; r++) h = fnv1a(salt + '|' + h + '|' + p);
    return h;
}

// Iisang spelling lang ng email: walang space, small letters,
// hanggang 100 characters.
// Time O(n) · Space O(n)
function accountEmailKey(email) {
    return textCut(toLower(strip(String(email === undefined || email === null ? '' : email))), 100);
}

// Ginagawa yung accounts galing sa seed. Yung email ng owner
// ay galing sa email-config.js.
// Time O(n) · Space O(n)
function buildAccounts() {
    staffAccounts = [];
    staffEmailIndex = hashCreate(17);
    for (var i = 0; i < STAFF_SEED.length; i++) {
        var seed = STAFF_SEED[i];
        var account = { id: seed.id, name: seed.name, email: accountEmailKey(seed.email || EMAIL_CONFIG.adminEmail), role: seed.role,
                        salt: seed.salt, passHash: seed.passHash, active: true, createdAt: 0, lastSignIn: 0 };
        listAdd(staffAccounts, account);
        hashPut(staffEmailIndex, account.email, account.id);
    }
}

// Account gamit yung id. Binary search kasi naka-ayos ayon sa id.
// Time O(log n) · Space O(1)
function accountById(id) {
    var at = binarySearch(staffAccounts, Number(id), function (a) { return a.id; });
    return at === -1 ? null : staffAccounts[at];
}

// Account gamit yung email: hash table muna, tapos binary search.
// Time O(1) average + O(log n) · Space O(n)
function accountByEmail(email) {
    var id = hashGet(staffEmailIndex, accountEmailKey(email));
    return id === null ? null : accountById(id);
}

// Tama ba yung password para sa account?
// Time O(n) · Space O(n)
function checkPassword(account, password) {
    return !!account && passwordHash(account.salt, password) === account.passHash;
}

// Yung naka-sign in sa desk ngayon, null kung wala.
// Time O(log n) · Space O(1)
function currentAccount() {
    return deskUserId ? accountById(deskUserId) : null;
}

// Sino yung isusulat sa log: yung naka-sign in, o "Order desk"
// para sa demo history.
// Time O(log n) · Space O(1)
function deskActor() {
    var account = currentAccount();
    return account ? account.name : 'Order desk';
}

// Owner ba yung account?
// Time O(1) · Space O(1)
function isOwner(account) {
    return !!account && account.role === 'owner';
}

// Ilang active na owner. Dapat may isa man lang lagi.
// Time O(n) · Space O(1)
function activeOwnerCount() {
    return countWhere(staffAccounts, function (a) { return a.active && a.role === 'owner'; });
}

// Pasado ba yung password: 8 hanggang 64 characters, may letra at
// number, walang space, pareho sa ulit, at hindi yung luma. '' kung ok.
// Time O(n) · Space O(n)
function passwordProblem(password, confirm, account) {
    var p = String(password === undefined || password === null ? '' : password), letters = 0, digits = 0;
    if (p.length < PASSWORD_MIN || p.length > PASSWORD_MAX) return 'Use ' + PASSWORD_MIN + ' to ' + PASSWORD_MAX + ' characters.';
    for (var i = 0; i < p.length; i++) {
        var c = p.charAt(i);
        if (isSpace(c)) return 'Leave out spaces.';
        if (isDigit(c)) digits++;
        else if (isLetter(c)) letters++;
    }
    if (letters === 0 || digits === 0) return 'Use at least one letter and one number.';
    if (p !== String(confirm === undefined || confirm === null ? '' : confirm)) return 'The two passwords do not match.';
    if (account && checkPassword(account, p)) return 'Choose a password different from the current one.';
    return '';
}

// Bagong password na may bagong salt.
// Time O(n) · Space O(n)
function setAccountPassword(account, password) {
    account.salt = makeSalt();
    account.passHash = passwordHash(account.salt, password);
}

// Owner lang ang pwedeng magdagdag ng account. Temporary password
// muna, tapos papalitan pag naka-sign in na.
// draft: { name, email, role, password, confirm }
// Time O(n) · Space O(n)
function addStaffAccount(draft, by, now) {
    if (!isOwner(by)) return { ok: false, error: 'Only an owner can add accounts.' };
    var name = strip(String(draft.name || '')), email = accountEmailKey(draft.email);
    if (name.length < 2 || name.length > 60) return { ok: false, error: 'Enter the person\'s name (2 to 60 characters).' };
    if (!isValidEmail(email) || isDemoAddress(email)) return { ok: false, error: 'Enter an email address the person can read — the sign-in code goes there.' };
    if (hashHas(staffEmailIndex, email)) return { ok: false, error: 'That email already has an account.' };
    // Pangalan ang nasa logs kaya bawal magkapareho ng pangalan.
    if (firstWhere(staffAccounts, function (a) { return toLower(a.name) === toLower(name); })) {
        return { ok: false, error: 'An account already has that name. Add a surname or an initial.' };
    }
    if (!firstWhere(ACCOUNT_ROLES, function (r) { return r.id === draft.role; })) return { ok: false, error: 'Choose a role.' };
    var problem = passwordProblem(draft.password, draft.confirm, null);
    if (problem) return { ok: false, error: 'Temporary password: ' + problem };
    var last = staffAccounts.length > 0 ? staffAccounts[staffAccounts.length - 1].id : 0;
    var account = { id: last + 1, name: name, email: email, role: draft.role, salt: '', passHash: 0, active: true, createdAt: now, lastSignIn: 0 };
    setAccountPassword(account, draft.password);
    listAdd(staffAccounts, account);
    hashPut(staffEmailIndex, email, account.id);
    logSecurity(now, 'account-added', 'warn', by.name, 'Account added: ' + name + ' (' + draft.role + ')', email);
    return { ok: true, account: account };
}

// Disable o enable ng account. Bawal i-disable ang sarili, at
// hindi pwedeng mawala yung huling active na owner.
// Time O(n) · Space O(1)
function setAccountActive(id, active, by, now) {
    var account = accountById(id);
    if (!isOwner(by)) return { ok: false, error: 'Only an owner can change accounts.' };
    if (!account) return { ok: false, error: 'No such account.' };
    if (account.id === by.id) return { ok: false, error: 'You cannot disable your own account.' };
    if (!active && account.role === 'owner' && account.active && activeOwnerCount() <= 1) {
        return { ok: false, error: 'The desk needs at least one active owner.' };
    }
    if (account.active === active) return { ok: false, error: account.name + ' is already ' + (active ? 'active.' : 'disabled.') };
    account.active = active;
    logSecurity(now, active ? 'account-enabled' : 'account-disabled', 'warn', by.name,
                (active ? 'Account enabled: ' : 'Account disabled: ') + account.name, account.email);
    return { ok: true, account: account };
}

// Palit ng sariling password, kailangan muna yung luma. Pag 5 beses
// mali sunod-sunod, pause yung email at magsa-sign out.
// Time O(n) · Space O(n)
function changeOwnPassword(account, current, password, confirm, now) {
    if (!account) return 'Sign in again.';
    if (!checkPassword(account, current)) {
        var guard = noteFailedSignIn(account.email, now);
        logSecurity(now, 'current-wrong', 'warn', account.name, 'Wrong current password when changing it', '');
        if (guard.streak >= ADMIN_MAX_ATTEMPTS) {
            guard.streak = 0;
            guard.lockedUntil = now + ADMIN_LOCK_MS;
            logSecurity(now, 'locked', 'alert', account.name, 'Signed out and paused after ' + ADMIN_MAX_ATTEMPTS + ' wrong current passwords in a row', '');
            return 'Too many wrong passwords. Signing out.';
        }
        return 'Your current password is not right.';
    }
    var problem = passwordProblem(password, confirm, account);
    if (problem) return problem;
    setAccountPassword(account, password);
    signInGuard(account.email).streak = 0;
    logSecurity(now, 'password-changed', 'alert', account.name, 'Password changed by ' + account.name, 'Lasts until the page is reloaded');
    return '';
}

// ---------- Overview (daily, monthly, yearly) ----------

// Pasok ba yung oras sa period?
// Time O(1) · Space O(1)
function inPeriod(stamp, key) {
    return stamp > 0 && beginsWith(isoFromStamp(stamp), key);
}

// Key ng date para sa uri ng period.
// Time O(1) · Space O(1)
function periodKey(kind, iso) {
    if (kind === 'year') return textPart(iso, 0, 4);
    if (kind === 'month') return textPart(iso, 0, 7);
    return iso;
}

// "Monday, 5 October 2026", "October 2026" o "2026".
// Time O(1) · Space O(1)
function periodLabel(kind, key) {
    if (kind === 'year') return key;
    if (kind === 'month') return MONTH_NAMES[readNumber(key, 5, 7) - 1] + ' ' + textPart(key, 0, 4);
    return formatDateLong(key);
}

// Period bago o pagkatapos.
// Time O(1) · Space O(1)
function shiftPeriod(kind, key, step) {
    if (kind === 'day') return addDays(key, step);
    var year = readNumber(key, 0, 4);
    if (kind === 'year') return String(year + step);
    // Bilang ng buwan mula year 0, usog, tapos hati ulit sa taon at buwan.
    var months = year * 12 + readNumber(key, 5, 7) - 1 + step;
    return floorDiv(months, 12) + '-' + twoDigits(months - floorDiv(months, 12) * 12 + 1);
}

// Ilang araw sa "YYYY-MM".
// Time O(1) · Space O(1)
function daysInMonth(key) {
    return monthLength(readNumber(key, 0, 4), readNumber(key, 5, 7));
}

// Mga numero ng period, zero lahat.
// Time O(1) · Space O(1)
function emptyTotals() {
    return { placed: 0, quoteRequests: 0, sales: 0, units: 0, completed: 0, voided: 0, retained: 0, collected: 0, payments: 0 };
}

// Saang bucket mapupunta: -1 kung labas sa period, kung hindi
// yung araw o buwan minus 1 na binasa mismo sa date.
// Time O(1) · Space O(1)
function bucketOf(stamp, key, part) {
    if (!(stamp > 0)) return -1;
    var iso = isoFromStamp(stamp);
    if (!beginsWith(iso, key)) return -1;
    if (part === 'day') return readNumber(iso, 8, 10) - 1;
    if (part === 'month') return readNumber(iso, 5, 7) - 1;
    return 0;
}

// Isang pasada lang: bawat order at resibo diretso sa bucket niya.
// Time O(n²) (lahat ng line ng bawat order) · Space O(1)
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

// Totals ng period: orders, pera, piraso, tapos at void.
// Time O(n²) · Space O(1)
function periodTotals(key) {
    var one = [emptyTotals()];
    tallyPeriods(one, key, '');
    return one[0];
}

// Lahat ng nasa Overview para sa isang period, may breakdown
// isang level pababa. Isang tallyPeriods pass lang.
// Time O(n²) · Space O(n)
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

// Mga taon na may order, bago muna, para sa year picker.
// Time O(n²) · Space O(n)
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

// Mga numero ng "right now" sa Overview.
// Time O(n²) · Space O(n)
function dashboardStats() {
    var outstanding = 0, retained = 0;
    for (var i = 0; i < orders.length; i++) {
        var o = orders[i];
        if (o.status === 'paid' || o.status === 'completed') outstanding += orderBalance(o);
        if (o.status === 'voided') retained += o.amountPaid;
    }
    return {
        awaitingQuote: quoteQueue.count,
        awaitingPayment: ordersWithStatus('quoted').length,
        inProduction: rushLane.size + standardLane.count,
        rush: rushLane.size,
        completed: ordersWithStatus('completed').length,
        voided: ordersWithStatus('voided').length,
        collected: roundMoney(sumRecursive(receipts, function (r) { return r.amount; })),
        outstanding: roundMoney(outstanding),
        retained: roundMoney(retained)
    };
}
