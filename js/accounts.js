/* =========================================================================
   ACCOUNTS — the order desk's sign-in credentials, kept in an array.

   staffAccounts is an array of
     { id, name, email, role: 'owner' | 'staff', salt, passHash, active,
       createdAt, lastSignIn }
   in id order: ids only grow, so a new account is appended and the array
   stays sorted — an account is found by id with binary search. Beside it,
   staffEmailIndex is a hash table email → id, so signing in finds the
   account in O(1) on average instead of scanning the array.

   No password is ever stored: only a salted hash — FNV-1a over the salt
   and the password, repeated PASSWORD_ROUNDS times. Each account has its
   own salt, so two equal passwords never share a hash. This shows the
   idea; a real system hashes on a server with bcrypt or Argon2.
   Accounts are disabled, never deleted, so their history stays readable.
   Depends on store.js (staffAccounts, staffEmailIndex) and audit.js.
   ========================================================================= */

var ACCOUNT_ROLES = [
    { id: 'owner', label: 'Owner', note: 'Everything, including accounts and the logs' },
    { id: 'staff', label: 'Staff', note: 'Orders, production and products' }
];

/* Who is signed in to the desk now: an account id, or 0. */
var deskUserId = 0;

/* A random six-digit code from the browser's secure random source.
                                          Time O(1)  · Space O(1) */
function otpCode() {
    var n = typeof crypto !== 'undefined' && crypto.getRandomValues
        ? crypto.getRandomValues(Uint32Array.of(0))[0]
        : Math.floor(Math.random() * 4294967296);
    return leftPad(n % 1000000, OTP_LENGTH, '0');
}

/* A fresh random salt for a new password.  Time O(1) · Space O(1) */
function makeSalt() {
    return 'su-' + otpCode() + otpCode();
}

/* The stored form of a password: FNV-1a over salt and password, repeated
   a fixed number of rounds so guessing is slower.
                                          Time O(n) — PASSWORD_ROUNDS is fixed · Space O(n) */
function passwordHash(salt, password) {
    var p = String(password === undefined || password === null ? '' : password);
    var h = fnv1a(salt + '|' + p);
    for (var r = 1; r < PASSWORD_ROUNDS; r++) h = fnv1a(salt + '|' + h + '|' + p);
    return h;
}

/* One spelling for every email: trimmed, lower case, at most 100 characters.
                                          Time O(n) · Space O(n) */
function accountEmailKey(email) {
    return textCut(toLower(strip(String(email === undefined || email === null ? '' : email))), 100);
}

/* Build the accounts from the seed. The owner's email is the one in
   js/email-config.js.                    Time O(n) · Space O(n) */
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

/* An account by id: binary search, the array is in id order.
                                          Time O(log n) · Space O(1) */
function accountById(id) {
    var at = binarySearch(staffAccounts, Number(id), function (a) { return a.id; });
    return at === -1 ? null : staffAccounts[at];
}

/* An account by email: one hash-table look-up, then the binary search.
                                          Time O(1) average + O(log n) · Space O(n) */
function accountByEmail(email) {
    var id = hashGet(staffEmailIndex, accountEmailKey(email));
    return id === null ? null : accountById(id);
}

/* Does this password belong to the account?  Time O(n) · Space O(n) */
function checkPassword(account, password) {
    return !!account && passwordHash(account.salt, password) === account.passHash;
}

/* The account signed in to the desk, or null.  Time O(log n) · Space O(1) */
function currentAccount() {
    return deskUserId ? accountById(deskUserId) : null;
}

/* Who the audit log names for something done at the desk: the person
   signed in, or "Order desk" (the replayed demo history).
                                          Time O(log n) · Space O(1) */
function deskActor() {
    var account = currentAccount();
    return account ? account.name : 'Order desk';
}

/* Is the account an owner?               Time O(1)  · Space O(1) */
function isOwner(account) {
    return !!account && account.role === 'owner';
}

/* Active owners: the desk must always keep at least one.  Time O(n) · Space O(1) */
function activeOwnerCount() {
    return countWhere(staffAccounts, function (a) { return a.active && a.role === 'owner'; });
}

/* A password the desk will accept: 8 to 64 characters, at least one letter
   and one number, no spaces, typed the same twice, and — for an account
   that has one — not the password it already uses. '' or what is wrong.
                                          Time O(n) · Space O(n) */
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

/* Give an account a new password with a fresh salt.  Time O(n) · Space O(n) */
function setAccountPassword(account, password) {
    account.salt = makeSalt();
    account.passHash = passwordHash(account.salt, password);
}

/* An owner adds an account. The new person signs in with the temporary
   password and the emailed code, then changes it.
   draft: { name, email, role, password, confirm }  Time O(n) · Space O(n)
   Returns { ok, account } or { ok: false, error }. */
function addStaffAccount(draft, by, now) {
    if (!isOwner(by)) return { ok: false, error: 'Only an owner can add accounts.' };
    var name = strip(String(draft.name || '')), email = accountEmailKey(draft.email);
    if (name.length < 2 || name.length > 60) return { ok: false, error: 'Enter the person\'s name (2 to 60 characters).' };
    if (!isValidEmail(email) || isDemoAddress(email)) return { ok: false, error: 'Enter an email address the person can read — the sign-in code goes there.' };
    if (hashHas(staffEmailIndex, email)) return { ok: false, error: 'That email already has an account.' };
    // The logs name people, so two accounts may not share a name.
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

/* Disable or enable an account. Nobody can disable themselves, and the
   last active owner stays.               Time O(n) · Space O(1) */
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

/* The signed-in person changes their own password: the current one first.
   A wrong current password counts like a wrong sign-in, so someone at a
   desk left open cannot guess it: the fifth in a row pauses the email (and
   the screen signs out). Returns '' when it changed.  Time O(n) · Space O(n) */
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
