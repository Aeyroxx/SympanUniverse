/* =========================================================================
   ORDER DESK · SIGN-IN — email and password, then a code by email.

   Step 1: the owner's email (EMAIL_CONFIG.adminEmail) and password. The
   password is compared by FNV-1a hash; five wrong tries lock the desk for
   30 seconds. Step 2: a six-digit code is emailed to the owner. It lasts
   five minutes, allows three tries, and only its hash is kept.

   Be clear about what this is: the whole site runs in the browser, so
   anyone with the page can read its code. It keeps customers off the
   desk; it is not protection against a determined person. That needs a
   server. Depends on ui.js, store.js, notify.js and mail.js.
   ========================================================================= */

var deskState = { tab: 'overview', authed: false, attempts: 0, lockedUntil: 0, stage: 'password', otp: null };

/* A random six-digit code from the browser's secure random source.
                                          Time O(1)  · Space O(1) */
function otpCode() {
    var n = typeof crypto !== 'undefined' && crypto.getRandomValues
        ? crypto.getRandomValues(Uint32Array.of(0))[0]
        : Math.floor(Math.random() * 4294967296);
    return leftPad(n % 1000000, OTP_LENGTH, '0');
}

/* "s••••••••@gmail.com" — enough to recognise, not to read.  Time O(n) · Space O(n) */
function maskEmail(email) {
    var parts = cutText(email, '@');
    if (parts.length !== 2) return email;
    var name = parts[0], hidden = textPart(name, 0, 1);
    for (var i = 1; i < name.length; i++) hidden += '•';
    return hidden + '@' + parts[1];
}

/* Step 1. Returns '' when the code can be sent, or the message to show.
   Never says which of the two was wrong. Time O(n) · Space O(1) */
function deskSignIn(email, password, now) {
    if (now < deskState.lockedUntil) {
        return 'Too many attempts. Try again in ' + Math.ceil((deskState.lockedUntil - now) / 1000) + ' seconds.';
    }
    var emailOk = toLower(strip(email)) === toLower(strip(EMAIL_CONFIG.adminEmail));
    if (emailOk && fnv1a(password) === ADMIN_PASS_HASH) {
        deskState.attempts = 0;
        deskState.stage = 'otp';
        deskState.codesSent = 0;
        return '';
    }
    deskState.attempts++;
    if (deskState.attempts >= ADMIN_MAX_ATTEMPTS) {
        deskState.attempts = 0;
        deskState.lockedUntil = now + ADMIN_LOCK_MS;
        return 'Too many attempts. The desk is locked for 30 seconds.';
    }
    return 'That email or password is not right. ' + (ADMIN_MAX_ATTEMPTS - deskState.attempts) + ' ' +
           plural(ADMIN_MAX_ATTEMPTS - deskState.attempts, 'try', 'tries') + ' left.';
}

/* Make a fresh code and keep only its hash. Returns the code so it can be
   emailed.                               Time O(1)  · Space O(1) */
function issueOtp(now) {
    var code = otpCode();
    deskState.codesSent = (deskState.codesSent || 0) + 1;
    deskState.otp = { hash: fnv1a(code), expires: now + OTP_LIFETIME_MS, tries: 0, sentAt: now };
    return code;
}

/* Can a new code be sent yet?            Time O(1)  · Space O(1) */
function otpResendWait(now) {
    if (!deskState.otp) return 0;
    if (deskState.codesSent >= OTP_MAX_SENDS) return -1;
    var wait = deskState.otp.sentAt + OTP_RESEND_MS - now;
    return wait > 0 ? Math.ceil(wait / 1000) : 0;
}

/* Step 2. Returns '' when signed in, or the message to show.
                                          Time O(n) · Space O(1) */
function verifyOtp(code, now) {
    var otp = deskState.otp;
    if (deskState.stage !== 'otp' || !otp) return 'Start again with your email and password.';
    if (now > otp.expires) { deskState.otp = null; return 'That code has expired. Send a new one.'; }
    if (otp.tries >= OTP_MAX_TRIES) return 'Too many wrong codes. Send a new one.';
    if (fnv1a(digitsOnly(code)) === otp.hash && digitsOnly(code).length === OTP_LENGTH) {
        deskState.authed = true;
        deskState.stage = 'password';
        deskState.otp = null;
        return '';
    }
    otp.tries++;
    var left = OTP_MAX_TRIES - otp.tries;
    return left > 0 ? 'That code is not right. ' + left + ' ' + plural(left, 'try', 'tries') + ' left.' : 'Too many wrong codes. Send a new one.';
}

/* =========================================================================
   SCREENS
   ========================================================================= */

/* Show one of the two forms.             Time O(1)  · Space O(1) */
function showSignInStage(stage) {
    setHidden($('#loginForm'), stage !== 'password');
    setHidden($('#otpForm'), stage !== 'otp');
    var focus = stage === 'otp' ? $('#otpInput') : $('#loginEmail');
    if (focus) focus.focus();
}

/* Send a code and say where it went. Without EmailJS the code is shown on
   screen, clearly marked, so the desk still works.  Time O(n²) · Space O(n) */
function sendSignInCode(now) {
    var code = issueOtp(now), to = EMAIL_CONFIG.adminEmail;
    deskState.codeMail = emailSignInCode(to, code, now);
    drainMail();
    var demo = $('#otpDemo');
    if (mailConfigured()) {
        $('#otpNote').textContent = 'We sent a six-digit code to ' + maskEmail(to) + '. It expires in ' + (OTP_LIFETIME_MS / 60000) + ' minutes.';
        setHidden(demo, true);
    } else {
        $('#otpNote').textContent = 'Enter the six-digit code to finish signing in.';
        demo.innerHTML = icon('alert', 16) + '<span>Email isn\'t connected yet (js/email-config.js), so the code is shown here instead:' +
            '<strong class="otp-demo-code t-mono">' + escapeHtml(code) + '</strong></span>';
        setHidden(demo, false);
    }
}

/* If the code's email could not be sent, say so on the code screen.
   Called by mail.js whenever a send finishes.  Time O(1) · Space O(1) */
function onSignInMailChanged() {
    var mail = deskState.codeMail;
    if (!mail || deskState.stage !== 'otp' || mail.status !== 'failed') return;
    showFormError('#otpError', 'The code could not be emailed (' + mail.note + '). Check the EmailJS settings in js/email-config.js, then send a new code.');
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
        // Each password entry allows a few codes; after that, start again.
        deskState.stage = 'password';
        deskState.otp = null;
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
}
