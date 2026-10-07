/* =========================================================================
   DESK · PASSWORD RESET SCREENS
   "Forgot password?": email, tapos code at bagong password. Ang logic ay
   nasa backend/m13-security-logs.js.
   ========================================================================= */

// Ini-email yung reset code. Ipinapakita lang sa screen kung
// hindi pa naka-setup ang email.
// Time O(n²) · Space O(n)
function deliverResetCode(code, now) {
    var demo = $('#resetDemo'), reason = '';
    if (code) {
        emailResetCode(deskState.reset.accountEmail, code, now);
        drainMail();
        reason = mailConfigured() ? '' : codeOnScreenReason(deskState.reset.accountEmail);
    }
    if (code && reason) {
        demo.innerHTML = codeOnScreenHtml(reason, code);
        setHidden(demo, false);
    } else {
        setHidden(demo, true);
    }
}

// Na-submit yung step 1.
// Time O(n²) · Space O(n)
function onResetSubmit(e) {
    e.preventDefault();
    var email = $('#resetEmail').value, now = Date.now();
    if (!isValidEmail(email)) { showFormError('#resetError', 'Enter an email address.'); return; }
    var problem = resetRequestProblem(email, now);
    if (problem) { showFormError('#resetError', problem); return; }
    showFormError('#resetError', '');
    var code = startPasswordReset(email, now);
    $('#resetNote').textContent = 'If ' + strip(email) + ' has an order desk account, a six-digit code is on its way to it. ' +
        'It expires in ' + (RESET_LIFETIME_MS / 60000) + ' minutes.';
    deliverResetCode(code, now);
    $('#resetCode').value = '';
    $('#resetPassword').value = '';
    $('#resetConfirm').value = '';
    showFormError('#resetCodeError', '');
    showSignInStage('reset-code');
}

// Na-submit yung step 2 at 3.
// Time O(n²) · Space O(n)
function onResetCodeSubmit(e) {
    e.preventDefault();
    var now = Date.now(), pass = $('#resetPassword'), confirm = $('#resetConfirm');
    var changed = deskState.reset ? deskState.reset.accountEmail : '';
    var message = completePasswordReset($('#resetCode').value, pass.value, confirm.value, now);
    if (message !== '') {
        showFormError('#resetCodeError', message);
        return;
    }
    pass.value = '';
    confirm.value = '';
    $('#resetCode').value = '';
    setHidden($('#resetDemo'), true);
    emailPasswordChanged(changed, now);
    drainMail();
    deskState.notice = 'Your password was changed. Sign in with the new one. This copy of the site keeps no data, ' +
        'so reloading the page brings back the original password.';
    showFormError('#loginError', '');
    showSignInStage('password');
    toast({ title: 'Password changed', kind: 'success' });
}

// Humingi ng bagong reset code.
// Time O(n²) · Space O(n)
function onResetResend() {
    var now = Date.now(), again = resendResetCode(now);
    if (again.message) { showFormError('#resetCodeError', again.message); return; }
    deliverResetCode(again.code, now);
    showFormError('#resetCodeError', '');
    toast({ title: 'If the email has an account, a new code is on its way', kind: 'info' });
}

// Balik sa sign-in form.
// Time O(n) · Space O(1)
function leavePasswordReset() {
    deskState.reset = null;
    deskState.stage = 'password';
    setHidden($('#resetDemo'), true);
    showFormError('#resetError', '');
    showFormError('#resetCodeError', '');
    showSignInStage('password');
}

// Kinakabit yung mga event ng password reset.
// Time O(1) · Space O(1)
function initPasswordReset() {
    $('#resetIcon').innerHTML = icon('lock');
    $('#resetCodeIcon').innerHTML = icon('chat');
    $('#forgotButton').addEventListener('click', function () {
        $('#resetEmail').value = $('#loginEmail').value;
        showFormError('#loginError', '');
        deskState.stage = 'reset-email';
        showSignInStage('reset-email');
    });
    $('#resetForm').addEventListener('submit', onResetSubmit);
    $('#resetCodeForm').addEventListener('submit', onResetCodeSubmit);
    $('#resetResend').addEventListener('click', onResetResend);
    $('#resetBack').addEventListener('click', leavePasswordReset);
    $('#resetCodeBack').addEventListener('click', leavePasswordReset);
}
