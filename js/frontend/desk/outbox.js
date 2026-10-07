/* =========================================================================
   DESK · OUTBOX
   Lahat ng email na sinulat ng shop at kung na-send. Tago ang laman ng
   mga code, at email lang ng customer ang nakikita ng staff.
   ========================================================================= */

var MAIL_STATUS = [
    { id: 'queued', label: 'Queued', tone: '' }, { id: 'sending', label: 'Sending', tone: 'badge-amber' },
    { id: 'sent', label: 'Sent', tone: 'badge-green' }, { id: 'failed', label: 'Failed', tone: 'badge-rose' },
    { id: 'simulated', label: 'Not sent — email not set up', tone: 'badge-amber' }
];

// Sign-in o reset code ba? Hindi pinapakita, hindi sine-send ulit.
// Time O(1) · Space O(1)
function isCodeMail(m) {
    return m.kind === 'otp' || m.kind === 'reset';
}

// Email tungkol sa desk account (code o password changed)?
// Time O(1) · Space O(1)
function isAccountMail(m) {
    return isCodeMail(m) || m.kind === 'security';
}

// Lahat ng email, bago muna. Staff, email ng customer lang
// ang nakikita.
// Time O(n) dito (halos naka-ayos na), O(n²) worst · Space O(n)
function outboxHtml() {
    var owner = isOwner(currentAccount());
    var shown = owner ? outbox : keepWhere(outbox, function (m) { return !isAccountMail(m); });
    var list = insertionSort(backwards(shown), function (a, b) { return b.stamp - a.stamp || b.id - a.id; });
    var failed = countWhere(shown, function (m) { return !isCodeMail(m) && (m.status === 'failed' || (m.status === 'simulated' && mailConfigured())); });
    var setup = mailConfigured() ? '' :
        '<div class="notice notice-warn">' + icon('alert', 16) + '<div><strong>Email is not connected yet.</strong> Customer emails' +
        (owner ? ' and sign-in codes are' : ' are') + ' written and kept here, but not sent. Fill in the three EmailJS values in <span class="t-mono">js/data/email-config.js</span> ' +
        '(the steps are at the top of that file) and they go out automatically.</div></div>';
    var head = '<div class="desk-bar">' + (failed > 0 ? '<button class="ui-btn ui-btn-primary" type="button" data-mail-retry>Send ' + failed +
        ' again</button>' : '') + '<span class="t-foot dim">Every order step emails the customer automatically.' +
        (owner ? ' Sign-in and reset codes are listed too, with their content hidden.' : '') + '</span></div>';
    if (list.length === 0) return setup + head + emptyHtml('chat', 'No emails yet', 'Order confirmations, quotations and "ready" notices appear here as they are sent.');
    return setup + head + renderEach(list, function (m) {
        var status = firstWhere(MAIL_STATUS, function (s) { return s.id === m.status; });
        var order = m.orderId ? orderById(m.orderId) : null;
        // Nakalista ang sign-in at reset codes pero tago ang laman.
        var body = m.kind === 'otp' ? 'Sign-in code — hidden.' : (m.kind === 'reset' ? 'Password reset code — hidden.' : m.body);
        return '<details class="order-fold"><summary><span class="badge ' + status.tone + '">' + escapeHtml(status.label) + '</span>' +
            '<span class="flex-fill"><strong>' + escapeHtml(m.subject) + '</strong><span class="t-caption dim d-block">To ' + escapeHtml(m.to) +
            (order ? ' · ' + escapeHtml(order.ref) : '') + '</span></span><span class="t-caption dim">' + escapeHtml(formatStamp(m.stamp)) + '</span></summary>' +
            '<div class="mail-body"><pre class="mail-text">' + escapeHtml(body) + '</pre>' +
            (m.note ? '<p class="t-caption dim">' + escapeHtml(m.note) + '</p>' : '') + '</div></details>';
    });
}

// Ulit i-render yung outbox pag may natapos na send.
// Time O(n²) · Space O(n)
function onMailChanged() {
    if (deskState.authed && deskState.tab === 'outbox' && !$('#adminConsole').classList.contains('hidden')) renderDesk();
}
