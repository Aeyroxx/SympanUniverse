/* =========================================================================
   LINKS — every local file the page or the data points at exists.
   Run: node tests/links.js
   ========================================================================= */

var t = require('./harness');
var check = t.check, section = t.section;
var app = t.loadStore();
app.storeInit();

/* Values of one attribute across a document.  Time O(n²) · Space O(n) */
function attributeValues(html, name) {
    var pieces = cutText(html, ' ' + name + '="'), out = [];
    for (var i = 1; i < pieces.length; i++) listAdd(out, cutText(pieces[i], '"')[0]);
    return out;
}

/* Is this a path inside the project?       Time O(n) · Space O(1) */
function isLocal(path) {
    return path.length > 0 && !beginsWith(path, '#') && !beginsWith(path, 'http') && !beginsWith(path, 'mailto:') &&
           !beginsWith(path, 'data:');
}

section('index.html');
var html = t.readText('index.html');
var paths = keepWhere(attributeValues(html, 'src'), isLocal);
var hrefs = keepWhere(attributeValues(html, 'href'), isLocal);
for (var h = 0; h < hrefs.length; h++) listAdd(paths, hrefs[h]);
var missingPage = keepWhere(paths, function (p) { return !t.exists(p); });
check('every script, stylesheet and image on the page exists (' + paths.length + ')', missingPage.length === 0, glue(missingPage, ', '));

section('product photographs');
var gallery = [];
for (var p = 0; p < app.products.length; p++) {
    for (var g = 0; g < app.products[p].gallery.length; g++) listAdd(gallery, app.products[p].gallery[g]);
}
var missingGallery = keepWhere(gallery, function (src) { return !t.exists(src); });
check('every gallery photograph exists (' + gallery.length + ')', gallery.length > 0 && missingGallery.length === 0, glue(missingGallery, ', '));
var missingReal = keepWhere(app.REAL_REFERENCES, function (r) { return !t.exists('assets/products/' + r.file); });
check('every real colour reference exists', missingReal.length === 0);

section('generated colour previews');
var previews = t.fs.readdirSync(t.ROOT + 'assets/colors');
check('146 generated previews (160 combinations less 14 real photographs)', previews.length === 146, previews.length);
var orphans = keepWhere(previews, function (name) {
    var parts = cutText(textPart(name, 0, name.length - 4), '-');
    var flower = parts[0], arrangement = parts[1], color = glue(copyRange(parts, 2), '-');
    var ref = app.referenceImage(flower, arrangement, color);
    return !ref || ref.src !== 'assets/colors/' + name;
});
check('each preview is the one the shop shows for its combination', orphans.length === 0, glue(orphans, ', '));

t.finish('links');
