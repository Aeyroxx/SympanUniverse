/* =========================================================================
   ORDER DESK · PASSWORD RESET — "Forgot password?" on the sign-in card.

     1. The person types their email. The answer on screen is the same
        whatever is typed, so the page never tells a stranger which
        addresses have desk accounts; a code is made only for the email of
        an active account (accounts.js).
     2. A six-digit code is emailed. Only its FNV-1a hash is kept; it lasts
        ten minutes, allows three tries, and a new one can be sent after 30
        seconds (three per reset).
     3. The code, then the new password twice. The password must be 8 to
        64 characters with a letter and a number, no spaces, and differ from
        the one in use. On success the account gets a new salt and hash,
        any pause on its email is lifted, the person is emailed that it
        changed, and signing in still needs the emailed sign-in code.

   Every step is written to the security log. Like all data on this site
   the new password lives in this page's memory: reloading the page brings
   back the original demo passwords.
   Depends on accounts.js, admin-signin.js, audit.js, notify.js and mail.js.
   ========================================================================= */

/* Make a fresh reset code and keep only its hash. Returns the code so it
   can be emailed.                        Time O(n) · Space O(n) */
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

/* Before step 1: '' when a reset code may be asked for this email now, or
   what to say. The answer depends only on how many codes the email typed
   was sent this hour, never on whether it has an account.
                                          Time O(1) average + O(n) for the text · Space O(1) */
function resetRequestProblem(email, now) {
    if (canSendCode(email, now)) return '';
    logSecurity(now, 'codes-max', 'warn', typedEmail(email), 'Password reset asked for too often', '');
    return tooManyCodesMessage();
}

/* Step 1, once resetRequestProblem() allows it. Returns the code to email,
   or '' when the email has no active account — the screen, the waits and
   the hourly allowance behave the same either way.  Time O(n) · Space O(n) */
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

/* Seconds until another reset code may be sent; -1 when no more may.
                                          Time O(1)  · Space O(1) */
function resetResendWait(now) {
    var r = deskState.reset;
    if (!r || r.sends >= RESET_MAX_SENDS) return -1;
    var wait = r.sentAt + RESET_RESEND_MS - now;
    return wait > 0 ? Math.ceil(wait / 1000) : 0;
}

/* Another code. For an unknown email nothing is sent, but the screen and
   the waits behave exactly the same.     Time O(n) · Space O(1)
   Returns { code, message }: message is '' when a code went (or seemed to). */
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

/* Steps 2 and 3. The code is checked first and each wrong one uses a try;
   a password that breaks the rules does not, so it can just be fixed.
   Returns '' when the password changed.  Time O(n) · Space O(n) */
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

/* =========================================================================
   SCREENS
   ========================================================================= */

/* Email a reset code to the account. Only while email is not connected at
   all (EmailJS not set up) is it shown on screen instead, clearly marked.
   Once email is connected a reset code is never shown — not even for the
   demo staff account, whose address cannot receive mail — so knowing an
   email is never enough to take its account.  Time O(n²) · Space O(n) */
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

/* Step 1 submitted.                      Time O(n²) · Space O(n) */
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

/* Steps 2 and 3 submitted.               Time O(n²) · Space O(n) */
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

/*                                        Time O(n²) · Space O(n) */
function onResetResend() {
    var now = Date.now(), again = resendResetCode(now);
    if (again.message) { showFormError('#resetCodeError', again.message); return; }
    deliverResetCode(again.code, now);
    showFormError('#resetCodeError', '');
    toast({ title: 'If the email has an account, a new code is on its way', kind: 'info' });
}

/* Back to the sign-in form.              Time O(n) · Space O(1) */
function leavePasswordReset() {
    deskState.reset = null;
    deskState.stage = 'password';
    setHidden($('#resetDemo'), true);
    showFormError('#resetError', '');
    showFormError('#resetCodeError', '');
    showSignInStage('password');
}

/*                                        Time O(1)  · Space O(1) */
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
