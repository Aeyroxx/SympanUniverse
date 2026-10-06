/* =========================================================================
   MAIL — sends the queued emails through EmailJS.

   Drains the mail queue first in, first out. With EmailJS set up in
   email-config.js, each email goes to the EmailJS REST API from the
   browser; without it, emails are marked "not sent — email not set up"
   and stay readable in the order desk's Outbox.
   Depends on store.js and email-config.js.
   ========================================================================= */

var EMAILJS_URL = 'https://api.emailjs.com/api/v1.0/email/send';
var mailSending = false;

/* Are the three EmailJS values filled in?  Time O(1) · Space O(1) */
function mailConfigured() {
    return typeof EMAIL_CONFIG !== 'undefined' && !isBlank(EMAIL_CONFIG.serviceId) &&
           !isBlank(EMAIL_CONFIG.templateId) && !isBlank(EMAIL_CONFIG.publicKey);
}

/* Send the next queued email, then the next, one at a time.
                                          Time O(n²) — each send redraws the outbox · Space O(1) */
function drainMail() {
    if (mailSending || cqIsEmpty(mailQueue)) return;
    var record = outbox[cqDequeue(mailQueue)];
    if (!mailConfigured()) {
        record.status = 'simulated';
        record.note = 'Email is not set up yet (js/email-config.js).';
        drainMail();
        return;
    }
    mailSending = true;
    record.status = 'sending';
    fetch(EMAILJS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            service_id: EMAIL_CONFIG.serviceId,
            template_id: EMAIL_CONFIG.templateId,
            user_id: EMAIL_CONFIG.publicKey,
            template_params: {
                to_email: record.to, subject: record.subject, message: record.body,
                from_name: EMAIL_CONFIG.fromName, reply_to: EMAIL_CONFIG.replyTo
            }
        })
    }).then(function (response) {
        record.status = response.ok ? 'sent' : 'failed';
        record.note = response.ok ? '' : 'EmailJS answered ' + response.status;
        return response.ok ? '' : response.text();
    }).then(function (detail) {
        if (detail) record.note = record.note + ': ' + detail;
    }, function () {
        record.status = 'failed';
        record.note = 'No connection to EmailJS.';
    }).then(function () {
        mailSending = false;
        if (typeof onMailChanged === 'function') onMailChanged();
        if (typeof onSignInMailChanged === 'function') onSignInMailChanged();
        drainMail();
    });
}

/* Put every failed email back in the queue.  Time O(n²) · Space O(n) */
function retryFailedMail() {
    var count = 0;
    for (var i = 0; i < outbox.length; i++) {
        // Sign-in codes are never re-sent: an old code is useless and should not travel twice.
        if (outbox[i].kind === 'otp') continue;
        if (outbox[i].status === 'failed' || (outbox[i].status === 'simulated' && mailConfigured())) {
            outbox[i].status = 'queued';
            outbox[i].note = '';
            cqEnqueue(mailQueue, i);
            count++;
        }
    }
    drainMail();
    return count;
}

/* Emails for one order, newest first. The outbox is oldest first, so it
   is read back to front: the list is then already nearly in order, which
   is insertion sort's best case.         Time O(n) here (nearly in order), O(n²) worst · Space O(n) */
function mailForOrder(orderId) {
    return insertionSort(backwards(keepWhere(outbox, function (m) { return m.orderId === orderId; })),
                     function (a, b) { return b.stamp - a.stamp || a.id - b.id; });
}
