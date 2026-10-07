/* =========================================================================
   DESK · SIGN-IN SCREENS
   Mga form ng email at password, at ng six-digit code. Ang logic ay nasa
   backend/m12-order-desk.js.
   ========================================================================= */

var SIGN_IN_FORMS = [
    { stage: 'password', form: '#loginForm', focus: '#loginEmail' },
    { stage: 'otp', form: '#otpForm', focus: '#otpInput' },
    { stage: 'reset-email', form: '#resetForm', focus: '#resetEmail' },
    { stage: 'reset-code', form: '#resetCodeForm', focus: '#resetCode' }
];

// Ipinapakita yung form ng stage at notice kung meron.
// Time O(n) · Space O(1)
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

// Kung bakit nasa screen yung code: walang EmailJS, o demo account
// sa example.com. '' kung na-email talaga.
// Time O(n) · Space O(n)
function codeOnScreenReason(email) {
    if (!mailConfigured()) return 'Email isn\'t connected yet (js/data/email-config.js), so the code is shown here instead:';
    if (isDemoAddress(email)) return 'This is a demo account whose address can\'t receive email, so the code is shown here instead:';
    return '';
}

// Yung kahon na nagpapakita ng code sa screen.
// Time O(n) · Space O(n)
function codeOnScreenHtml(reason, code) {
    return icon('alert', 16) + '<span>' + escapeHtml(reason) + '<strong class="otp-demo-code t-mono">' + escapeHtml(code) + '</strong></span>';
}

// Sine-send yung code sa email ng account at sinasabi kung saan.
// Time O(n²) · Space O(n)
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

// Kung hindi na-send ang sign-in code, sinasabi sa screen. Yung
// reset code hindi, para hindi malaman kung may account.
// Time O(1) · Space O(1)
function onSignInMailChanged() {
    var mail = deskState.codeMail;
    if (mail && deskState.stage === 'otp' && mail.status === 'failed') {
        showFormError('#otpError', 'The code could not be emailed. Check the EmailJS settings in js/data/email-config.js, then send a new code.');
    }
}

// Ipinapakita o tinatago yung error ng form.
// Time O(1) · Space O(1)
function showFormError(id, message) {
    var error = $(id);
    error.textContent = message;
    setHidden(error, message === '');
}

// Pag na-submit yung email at password.
// Time O(n²) · Space O(n)
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

// Pag na-submit yung code.
// Time O(n²) · Space O(n)
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

// Pag humingi ng bagong code.
// Time O(n²) · Space O(n)
function onOtpResend() {
    var now = Date.now(), wait = otpResendWait(now);
    if (wait < 0) {
        // Ilang code lang bawat sign-in (at ilan lang bawat oras sa email),
        // pagkatapos noon, ulit sa simula.
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

// Kinakabit yung mga event ng sign-in.
// Time O(1) · Space O(1)
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
