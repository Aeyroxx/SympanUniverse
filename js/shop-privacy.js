/* =========================================================================
   SHOP · PRIVACY — the Data Privacy Notice and the order terms.

   · a translucent banner says, once and plainly, that personal data is
     protected under the Data Privacy Act of 2012 and that the site uses no
     cookies or trackers. "Got it" dismisses it for this visit; nothing is
     stored, so it returns on the next.
   · one sheet holds both texts — the Privacy Notice and the order terms —
     opened from the banner, the footer, checkout and Track order (any
     element with data-privacy-open="notice" or "terms").
   · agreeing happens at checkout, in two separate boxes (shop-basket.js),
     and is recorded on the order with the notice's version (orders.js).
   Depends on ui.js and data.js (PRIVACY_NOTICE, ORDER_TERMS).
   ========================================================================= */

var privacySheet = null;
var privacyState = { doc: 'notice' };
var PRIVACY_DOCS = [
    { id: 'notice', label: 'Privacy Notice' },
    { id: 'terms', label: 'Order terms' }
];

/* The Privacy Notice, section by section.  Time O(n) · Space O(n) */
function privacyNoticeHtml() {
    return '<p class="t-foot dim mb-4">Version ' + escapeHtml(PRIVACY_NOTICE_VERSION) + ' · under the Data Privacy Act of 2012 (Republic Act No. 10173)</p>' +
        renderEach(PRIVACY_NOTICE, function (section) {
            return '<section class="doc-section"><h3 class="t-title3">' + escapeHtml(section.title) + '</h3>' +
                renderEach(section.text, function (p) { return '<p class="t-callout">' + escapeHtml(p) + '</p>'; }) + '</section>';
        });
}

/* The order terms as a numbered list.    Time O(n) · Space O(n) */
function orderTermsHtml() {
    return '<p class="t-foot dim mb-4">Version ' + escapeHtml(ORDER_TERMS_VERSION) + ' · the shop\'s own rules for every order. You agree to them at checkout, ' +
        'separately from the Privacy Notice.</p>' +
        '<ol class="doc-list">' + renderEach(ORDER_TERMS, function (term) { return '<li class="t-callout">' + escapeHtml(term) + '</li>'; }) + '</ol>';
}

/* The sheet's body: which text, then the text.  Time O(n) · Space O(n) */
function renderPrivacy() {
    var doc = firstWhere(PRIVACY_DOCS, function (d) { return d.id === privacyState.doc; }) || PRIVACY_DOCS[0];
    $('#privacyTitle').textContent = doc.label;
    $('#privacyBody').innerHTML = '<div class="segmented mb-4" role="tablist" aria-label="Which text">' + renderEach(PRIVACY_DOCS, function (d) {
            return '<button type="button" role="tab" id="privacy-tab-' + d.id + '" aria-controls="privacyPanel" data-privacy-doc="' + d.id +
                '" aria-selected="' + (d.id === doc.id ? 'true' : 'false') + '">' + escapeHtml(d.label) + '</button>';
        }) + '</div><div role="tabpanel" id="privacyPanel" aria-labelledby="privacy-tab-' + doc.id + '">' +
        (doc.id === 'terms' ? orderTermsHtml() : privacyNoticeHtml()) + '</div>';
}

/* Open the sheet on one of the two texts.  Time O(n) · Space O(n) */
function openPrivacy(doc) {
    privacyState.doc = doc === 'terms' ? 'terms' : 'notice';
    renderPrivacy();
    $('#privacyBody').scrollTop = 0;
    if (!privacySheet.isOpen) sheetOpen(privacySheet);
}

/* Show or hide the banner; the cart button moves up while it shows, so the
   two never overlap.                     Time O(1)  · Space O(1) */
function setPrivacyBanner(shown) {
    var banner = $('#privacyBanner');
    setHidden(banner, !shown);
    document.body.classList.toggle('has-privacy-banner', shown);
    document.body.style.setProperty('--privacy-lift', shown ? banner.offsetHeight + 'px' : '0px');
}

/*                                        Time O(1)  · Space O(1) */
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

/* Measure the banner again (after a resize, or when the shop shows again):
   only while the shop is on screen, or its height would read as 0.
                                          Time O(1)  · Space O(1) */
function refreshPrivacyBanner() {
    if (!$('#privacyBanner').classList.contains('hidden') && !$('#shopView').classList.contains('hidden')) setPrivacyBanner(true);
}
