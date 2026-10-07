/* =========================================================================
   DESK · ACCOUNTS / MY ACCOUNT
   Palit ng sariling password. Sa owner: listahan, dagdag at disable ng account.
   ========================================================================= */

// Isang account bilang row.
// Time O(n) · Space O(n)
function accountRowHtml(account, me) {
    var role = firstWhere(ACCOUNT_ROLES, function (r) { return r.id === account.role; });
    var action = account.id === me.id ? '<span class="t-caption dim">You</span>'
        : (account.active ? '<button class="ui-btn ui-btn-ghost ui-btn-sm" type="button" data-account-toggle="' + account.id + '">Disable</button>'
                          : '<button class="ui-btn ui-btn-quiet ui-btn-sm" type="button" data-account-toggle="' + account.id + '">Enable</button>');
    return '<tr' + (account.active ? '' : ' class="is-off"') + '><td><strong>' + escapeHtml(account.name) + '</strong>' +
        '<span class="t-caption dim d-block">' + escapeHtml(account.email) + '</span></td>' +
        '<td><span class="badge' + (account.role === 'owner' ? ' badge-ink' : '') + '">' + escapeHtml(role ? role.label : account.role) + '</span></td>' +
        '<td>' + (account.active ? '<span class="badge badge-green">Active</span>' : '<span class="badge">Disabled</span>') + '</td>' +
        '<td class="t-caption dim">' + escapeHtml(account.lastSignIn ? formatStamp(account.lastSignIn) : 'Never') + '</td>' +
        '<td class="text-end">' + action + '</td></tr>';
}

// Input na may label para sa account forms.
// Time O(n) · Space O(n)
function accountField(id, label, attrs) {
    return '<label class="field"><span class="field-label">' + escapeHtml(label) + '</span><input class="input" id="' + id + '" ' + attrs + '></label>';
}

// Buong Accounts tab.
// Time O(n) · Space O(n)
function accountHtml() {
    var me = currentAccount();
    if (!me) return emptyHtml('user', 'Sign in again', 'Your session has ended.');
    var role = firstWhere(ACCOUNT_ROLES, function (r) { return r.id === me.role; });
    var mine = '<section class="panel account-panel mb-5"><div class="row-between mb-3"><div><p class="t-over dim">Signed in as</p>' +
        '<h3 class="t-title2">' + escapeHtml(me.name) + '</h3><p class="t-foot dim">' + escapeHtml(me.email) + ' · ' + escapeHtml(role.label) + ' — ' +
        escapeHtml(role.note) + '</p></div>' + (me.lastSignIn ? '<span class="t-caption dim">Signed in ' + escapeHtml(formatStamp(me.lastSignIn)) + '</span>' : '') + '</div>' +
        '<form class="account-form" data-account-form="password" novalidate autocomplete="off"><h4 class="t-title3 mb-2">Change your password</h4>' +
        '<div class="edit-grid">' + accountField('pwCurrent', 'Current password', 'type="password" autocomplete="current-password" maxlength="64"') +
        accountField('pwNew', 'New password', 'type="password" autocomplete="new-password" maxlength="64"') +
        accountField('pwConfirm', 'New password, again', 'type="password" autocomplete="new-password" maxlength="64"') + '</div>' +
        '<p class="t-foot dim">8 to 64 characters, with at least one letter and one number, and no spaces.</p>' +
        '<p class="field-error hidden" id="pwError" role="alert"></p>' +
        '<button class="ui-btn ui-btn-primary mt-2" type="submit">Change password</button></form></section>';
    if (!isOwner(me)) return mine;
    var rows = renderEach(staffAccounts, function (a) { return accountRowHtml(a, me); });
    return mine + '<h3 class="t-title3 mb-2">Desk accounts</h3>' +
        '<p class="t-foot dim mb-3">The credentials are kept in an array; a hash table finds an account by its email when someone signs in. ' +
        'Passwords are stored only as salted hashes. Accounts are disabled, never deleted, so their history stays. ' +
        'Like all data on this site, accounts and passwords changed here last until the page is reloaded.</p>' +
        '<div class="table-wrap mb-5"><table class="tbl account-table"><thead><tr><th>Person</th><th>Role</th><th>Status</th><th>Last sign-in</th><th></th></tr></thead><tbody>' +
        rows + '</tbody></table></div>' +
        '<section class="panel account-panel"><form class="account-form" data-account-form="add" novalidate autocomplete="off"><h4 class="t-title3 mb-2">Add an account</h4>' +
        '<div class="edit-grid">' + accountField('newName', 'Name', 'maxlength="60" autocomplete="off"') +
        accountField('newEmail', 'Email (the sign-in code goes here)', 'type="email" maxlength="100" autocomplete="off"') +
        '<label class="field"><span class="field-label">Role</span><select class="select" id="newRole">' +
        optionsHtml(ACCOUNT_ROLES, 'staff', function (r) { return r.id; }, function (r) { return r.label + ' — ' + r.note; }) + '</select></label>' +
        accountField('newPassword', 'Temporary password', 'type="password" autocomplete="new-password" maxlength="64"') +
        accountField('newConfirm', 'Temporary password, again', 'type="password" autocomplete="new-password" maxlength="64"') + '</div>' +
        '<p class="t-foot dim">Give the person the temporary password yourself; they sign in with it and the emailed code, then change it here.</p>' +
        '<p class="field-error hidden" id="addError" role="alert"></p>' +
        '<button class="ui-btn ui-btn-primary mt-2" type="submit">Add account</button></form></section>';
}

// Binabasa yung field tapos nililinis.
// Time O(n) · Space O(n)
function takeValue(id) {
    var el = $('#' + id), value = el ? el.value : '';
    if (el && el.type === 'password') el.value = '';
    return value;
}

// Palit ng password, o dagdag ng account.
// Time O(n²) · Space O(n)
function onAccountSubmit(e) {
    var form = e.target.closest('[data-account-form]');
    if (!form) return;
    e.preventDefault();
    var now = Date.now(), me = currentAccount();
    if (form.getAttribute('data-account-form') === 'password') {
        var problem = changeOwnPassword(me, takeValue('pwCurrent'), takeValue('pwNew'), takeValue('pwConfirm'), now);
        if (problem && signInGuard(me.email).lockedUntil > now) {
            // Limang maling password: sign out kung sino man ang nasa desk.
            endDeskSession(now, ' was signed out after too many wrong current passwords');
            deskState.notice = 'You were signed out after too many wrong passwords.';
            showDesk();
            return;
        }
        if (problem) { showFormError('#pwError', problem); return; }
        var note = emailPasswordChanged(me.email, now);
        drainMail();
        toast({ title: 'Password changed', message: note ? 'You were emailed a note that it changed.' : '', kind: 'success' });
        renderDesk();
        return;
    }
    var added = addStaffAccount({ name: $('#newName').value, email: $('#newEmail').value, role: $('#newRole').value,
                                  password: takeValue('newPassword'), confirm: takeValue('newConfirm') }, me, now);
    if (!added.ok) { showFormError('#addError', added.error); return; }
    toast({ title: added.account.name + ' can now sign in', message: 'With the temporary password and a code sent to ' + added.account.email + '.', kind: 'success' });
    renderDesk();
}

// Disable (may confirm muna) o enable ng account.
// Time O(n²) · Space O(n)
function onAccountClick(e) {
    var button = e.target.closest('[data-account-toggle]');
    if (!button) return;
    var account = accountById(Number(button.getAttribute('data-account-toggle'))), me = currentAccount();
    if (!account || !me) return;
    // Ina-apply yung disable o enable.
    // Time O(n²) · Space O(n)
    function apply() {
        var result = setAccountActive(account.id, !account.active, me, Date.now());
        toast(result.ok ? { title: account.name + (account.active ? ' can sign in again' : ' can no longer sign in'), kind: 'info' }
                        : { title: result.error, kind: 'warn' });
        renderDesk();
    }
    if (!account.active) { apply(); return; }
    askConfirm({ title: 'Disable ' + account.name + '?',
        message: 'They can no longer sign in to the order desk. Their account and everything they did stay on record, and you can enable it again.',
        confirmLabel: 'Disable', danger: true, onConfirm: apply });
}
