/* =========================================================================
   ORDER DESK · SIGN-IN — an account's email and password, then a code.

   Step 1: the email is looked up in the accounts (accounts.js: a hash
   table email → id, then the array of credentials), and the password is
   checked against that account's salted hash. Five wrong passwords in a
   row for one email pause sign-in for that email for 30 seconds; the
   counts live in a hash table keyed by the email typed. Step 2: a
   six-digit code is emailed to the account's own address. It lasts five
   minutes, allows three tries, and only its hash is kept. A forgotten
   password is reset with an emailed code (admin-reset.js).

   Every attempt — right, wrong or paused — is written to the security log
   (audit.js), and the person signed in is named on everything they do.

   Be clear about what this is: the whole site runs in the browser, so
   anyone with the page can read its code. It keeps customers off the
   desk; it is not protection against a determined person. That needs a
   server. Depends on ui.js, store.js, audit.js, notify.js and mail.js.
   ========================================================================= */

var deskState = { tab: 'overview', authed: false, stage: 'password', otp: null, pendingId: 0, reset: null, notice: '' };

/* "s••••••••@gmail.com" — enough to recognise, not to read.  Time O(n) · Space O(n) */
function maskEmail(email) {
    var parts = cutText(email, '@');
    if (parts.length !== 2) return email;
    var name = parts[0], hidden = textPart(name, 0, 1);
    for (var i = 1; i < name.length; i++) hidden += '•';
    return hidden + '@' + parts[1];
}

/* Is this the email of an active desk account?  Time O(1) average + O(n) for the text · Space O(n) */
function isDeskEmail(email) {
    var account = accountByEmail(email);
    return !!account && account.active;
}

/* Step 1. Returns '' when the code can be sent, or the message to show.
   Never says which of the two was wrong, nor whether the account exists
   or is disabled.                        Time O(n) · Space O(n) */
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

/* Make a fresh code and keep only its hash, and count it against the
   account's hourly allowance. Returns the code so it can be emailed.
                                          Time O(n) for the email · Space O(1) */
function issueOtp(now) {
    var code = otpCode(), account = accountById(deskState.pendingId);
    if (account) noteCodeSent(account.email, now);
    deskState.codesSent = (deskState.codesSent || 0) + 1;
    deskState.otp = { hash: fnv1a(code), expires: now + OTP_LIFETIME_MS, tries: 0, sentAt: now };
    return code;
}

/* Can a new code be sent yet? Seconds to wait, or -1 when no more may be
   sent for this password entry (or this hour).  Time O(n) for the email · Space O(1) */
function otpResendWait(now) {
    // The limits first: an expired code (otp = null) must not reset them.
    var account = accountById(deskState.pendingId);
    if (deskState.codesSent >= OTP_MAX_SENDS || (account && !canSendCode(account.email, now))) return -1;
    if (!deskState.otp) return 0;
    var wait = deskState.otp.sentAt + OTP_RESEND_MS - now;
    return wait > 0 ? Math.ceil(wait / 1000) : 0;
}

/* Step 2. Returns '' when signed in, or the message to show.
                                          Time O(n) · Space O(1) */
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

/* =========================================================================
   SCREENS
   ========================================================================= */

var SIGN_IN_FORMS = [
    { stage: 'password', form: '#loginForm', focus: '#loginEmail' },
    { stage: 'otp', form: '#otpForm', focus: '#otpInput' },
    { stage: 'reset-email', form: '#resetForm', focus: '#resetEmail' },
    { stage: 'reset-code', form: '#resetCodeForm', focus: '#resetCode' }
];

/* Show the form for a stage, and any notice waiting for the sign-in form.
                                          Time O(n) · Space O(1) */
function showSignInStage(stage) {
    for (var i = 0; i < SIGN_IN_FORMS.length; i++) setHidden($(SIGN_IN_FORMS[i].form), SIGN_IN_FORMS[i].stage !== stage);
    var row = firstWhere(SIGN_IN_FORMS, function (f) { return f.stage === stage; });
    var notice = $('#loginNotice');
    if (notice) {
        notice.textContent = deskState.notice;
        setHidden(notice, stage !== 'password' || deskState.notice === '');
    }
    var focus = row ? $(row.focus) : null;
    if (focus) focus.focus();
}

/* When a code cannot reach an inbox — EmailJS is not set up, or the
   account is a demo one on example.com — say so, and why the code is on
   screen. '' when it goes by email. Decided by the address itself, so a
   code is never shown for an address that can receive it.
                                          Time O(n) · Space O(n) */
function codeOnScreenReason(email) {
    if (!mailConfigured()) return 'Email isn\'t connected yet (js/email-config.js), so the code is shown here instead:';
    if (isDemoAddress(email)) return 'This is a demo account whose address can\'t receive email, so the code is shown here instead:';
    return '';
}

/* The marked box that shows a code on screen.  Time O(n) · Space O(n) */
function codeOnScreenHtml(reason, code) {
    return icon('alert', 16) + '<span>' + escapeHtml(reason) + '<strong class="otp-demo-code t-mono">' + escapeHtml(code) + '</strong></span>';
}

/* Send a code to the account's own email and say where it went.
                                          Time O(n²) · Space O(n) */
function sendSignInCode(now) {
    var code = issueOtp(now), account = accountById(deskState.pendingId), to = account ? account.email : '';
    deskState.codeMail = emailSignInCode(to, code, now);
    logSecurity(now, 'code-sent', 'info', to, 'Sign-in code sent to ' + maskEmail(to), '');
    drainMail();
    var demo = $('#otpDemo'), reason = codeOnScreenReason(to);
    if (!reason) {
        $('#otpNote').textContent = 'We sent a six-digit code to ' + maskEmail(to) + '. It expires in ' + (OTP_LIFETIME_MS / 60000) + ' minutes.';
        setHidden(demo, true);
    } else {
        $('#otpNote').textContent = 'Enter the six-digit code to finish signing in.';
        demo.innerHTML = codeOnScreenHtml(reason, code);
        setHidden(demo, false);
    }
}

/* If a sign-in code's email could not be sent, say so on its screen.
   Called by mail.js whenever a send finishes. (A reset code's failure is
   not shown: that would tell a stranger the email has an account. The
   owner sees it in the Outbox and the logs.)  Time O(1) · Space O(1) */
function onSignInMailChanged() {
    var mail = deskState.codeMail;
    if (mail && deskState.stage === 'otp' && mail.status === 'failed') {
        showFormError('#otpError', 'The code could not be emailed. Check the EmailJS settings in js/email-config.js, then send a new code.');
    }
}

/*                                        Time O(1)  · Space O(1) */
function showFormError(id, message) {
    var error = $(id);
    error.textContent = message;
    setHidden(error, message === '');
}

/*                                        Time O(n²) · Space O(n) */
function onLoginSubmit(e) {
    e.preventDefault();
    var now = Date.now(), password = $('#passcodeInput');
    var message = deskSignIn($('#loginEmail').value, password.value, now);
    password.value = '';
    deskState.notice = '';
    setHidden($('#loginNotice'), true);
    showFormError('#loginError', message);
    if (message !== '') { password.focus(); return; }
    sendSignInCode(now);
    $('#otpInput').value = '';
    showFormError('#otpError', '');
    showSignInStage('otp');
}

/*                                        Time O(n²) · Space O(n) */
function onOtpSubmit(e) {
    e.preventDefault();
    var input = $('#otpInput'), message = verifyOtp(input.value, Date.now());
    showFormError('#otpError', message);
    if (message === '') {
        input.value = '';
        setHidden($('#otpDemo'), true);
        showSignInStage('password');
        showDesk();
    } else {
        input.select();
    }
}

/*                                        Time O(n²) · Space O(n) */
function onOtpResend() {
    var now = Date.now(), wait = otpResendWait(now);
    if (wait < 0) {
        // Each password entry allows a few codes (and each email a few an
        // hour); after that, start again.
        deskState.stage = 'password';
        deskState.otp = null;
        var asking = accountById(deskState.pendingId);
        logSecurity(now, 'codes-max', 'warn', asking ? asking.email : '', 'Too many sign-in codes asked for — back to the password', '');
        showSignInStage('password');
        showFormError('#loginError', 'Too many codes. Enter your email and password again.');
        return;
    }
    if (wait > 0) { showFormError('#otpError', 'You can ask for a new code in ' + wait + ' seconds.'); return; }
    sendSignInCode(now);
    showFormError('#otpError', '');
    toast({ title: 'A new code is on its way', kind: 'info' });
}

/*                                        Time O(1)  · Space O(1) */
function initSignIn() {
    $('#lockIcon').innerHTML = icon('lock');
    $('#otpIcon').innerHTML = icon('chat');
    $('#loginForm').addEventListener('submit', onLoginSubmit);
    $('#otpForm').addEventListener('submit', onOtpSubmit);
    $('#otpResend').addEventListener('click', onOtpResend);
    $('#otpBack').addEventListener('click', function () {
        deskState.stage = 'password';
        deskState.otp = null;
        showFormError('#otpError', '');
        showSignInStage('password');
    });
    initPasswordReset();
}
