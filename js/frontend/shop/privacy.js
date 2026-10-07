/* =========================================================================
   SHOP · PRIVACY
   Banner tungkol sa Data Privacy Act at isang sheet para sa Privacy Notice
   at order terms. Ang pagpayag ay nasa checkout (cart.js).
   ========================================================================= */

var privacySheet = null;
var privacyState = { doc: 'notice' };

var PRIVACY_DOCS = [
    { id: 'notice', label: 'Privacy Notice' },
    { id: 'terms', label: 'Order terms' }
];

// Yung Privacy Notice, section por section.
// Time O(n) · Space O(n)
function privacyNoticeHtml() {
    return '<p class="t-foot dim mb-4">Version ' + escapeHtml(PRIVACY_NOTICE_VERSION) + ' · under the Data Privacy Act of 2012 (Republic Act No. 10173)</p>' +
        renderEach(PRIVACY_NOTICE, function (section) {
            return '<section class="doc-section"><h3 class="t-title3">' + escapeHtml(section.title) + '</h3>' +
                renderEach(section.text, function (p) { return '<p class="t-callout">' + escapeHtml(p) + '</p>'; }) + '</section>';
        });
}

// Yung order terms bilang numbered list.
// Time O(n) · Space O(n)
function orderTermsHtml() {
    return '<p class="t-foot dim mb-4">Version ' + escapeHtml(ORDER_TERMS_VERSION) + ' · the shop\'s own rules for every order. You agree to them at checkout, ' +
        'separately from the Privacy Notice.</p>' +
        '<ol class="doc-list">' + renderEach(ORDER_TERMS, function (term) { return '<li class="t-callout">' + escapeHtml(term) + '</li>'; }) + '</ol>';
}

// Laman ng sheet: alin sa dalawa, tapos yung text.
// Time O(n) · Space O(n)
function renderPrivacy() {
    var doc = firstWhere(PRIVACY_DOCS, function (d) { return d.id === privacyState.doc; }) || PRIVACY_DOCS[0];
    $('#privacyTitle').textContent = doc.label;
    $('#privacyBody').innerHTML = '<div class="segmented mb-4" role="tablist" aria-label="Which text">' + renderEach(PRIVACY_DOCS, function (d) {
            return '<button type="button" role="tab" id="privacy-tab-' + d.id + '" aria-controls="privacyPanel" data-privacy-doc="' + d.id +
                '" aria-selected="' + (d.id === doc.id ? 'true' : 'false') + '">' + escapeHtml(d.label) + '</button>';
        }) + '</div><div role="tabpanel" id="privacyPanel" aria-labelledby="privacy-tab-' + doc.id + '">' +
        (doc.id === 'terms' ? orderTermsHtml() : privacyNoticeHtml()) + '</div>';
}

// Binubuksan yung sheet sa isa sa dalawang text.
// Time O(n) · Space O(n)
function openPrivacy(doc) {
    privacyState.doc = doc === 'terms' ? 'terms' : 'notice';
    renderPrivacy();
    $('#privacyBody').scrollTop = 0;
    if (!privacySheet.isOpen) sheetOpen(privacySheet);
}

// Pakita o tago ng banner. Umaangat yung cart button para
// hindi sila magpatong.
// Time O(1) · Space O(1)
function setPrivacyBanner(shown) {
    var banner = $('#privacyBanner');
    setHidden(banner, !shown);
    document.body.classList.toggle('has-privacy-banner', shown);
    document.body.style.setProperty('--privacy-lift', shown ? banner.offsetHeight + 'px' : '0px');
}

// Kinakabit yung mga event ng privacy banner at sheet.
// Time O(1) · Space O(1)
function initPrivacy() {
    privacySheet = sheetCreate($('#privacySheet'), { axis: sideAxis });
    $('#privacyBannerIcon').innerHTML = icon('lock', 18);
    on(document.body, 'click', '[data-privacy-open]', function (e, b) {
        e.preventDefault();
        openPrivacy(b.getAttribute('data-privacy-open'));
    });
    on($('#privacyBody'), 'click', '[data-privacy-doc]', function (e, b) {
        privacyState.doc = b.getAttribute('data-privacy-doc');
        renderPrivacy();
    });
    $('#privacyDismiss').addEventListener('click', function () { setPrivacyBanner(false); });
    setPrivacyBanner(true);
    window.addEventListener('resize', refreshPrivacyBanner);
}

// Sukat ulit ng banner, pero kapag kita lang yung shop.
// Time O(1) · Space O(1)
function refreshPrivacyBanner() {
    if (!$('#privacyBanner').classList.contains('hidden') && !$('#shopView').classList.contains('hidden')) setPrivacyBanner(true);
}
