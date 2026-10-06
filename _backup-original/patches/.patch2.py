import io

edits = {}


def sub(path, old, new):
    edits.setdefault(path, [])
    edits[path].append((old, new))


# ------------------------------------------------------------------ motion.js
sub('js/motion.js',
    '''    function wake(spring) {
        if (active.indexOf(spring) === -1) active.push(spring);
        if (rafId === null) rafId = requestAnimationFrame(tick);
    }''',
    '''    /* Manual scan rather than indexOf: this project implements its own
       array operations throughout. */
    function slotOf(spring) {
        for (var i = 0; i < active.length; i++) {
            if (active[i] === spring) return i;
        }
        return -1;
    }

    function wake(spring) {
        if (slotOf(spring) === -1) active[active.length] = spring;
        if (rafId === null) rafId = requestAnimationFrame(tick);
    }''')

sub('js/motion.js',
    '''        this._resting = true;
        var idx = active.indexOf(this);
        if (idx !== -1) active.splice(idx, 1);
        if (this.onUpdate) this.onUpdate(this.value, this);
        return this;
    };''',
    '''        this._resting = true;
        sleep(this);
        if (this.onUpdate) this.onUpdate(this.value, this);
        return this;
    };''')

sub('js/motion.js',
    '''        this.velocity = 0;
        this._resting = true;
        var idx = active.indexOf(this);
        if (idx !== -1) active.splice(idx, 1);
        return this;
    };''',
    '''        this.velocity = 0;
        this._resting = true;
        sleep(this);
        return this;
    };''')

sub('js/motion.js',
    '''    function reducedMotion() {''',
    '''    function sleep(spring) {
        var at = slotOf(spring);
        if (at === -1) return;
        for (var i = at; i < active.length - 1; i++) active[i] = active[i + 1];
        active.length = active.length - 1;
    }

    function reducedMotion() {''')

sub('js/motion.js',
    '''        this._history.push({ x: e.clientX, y: e.clientY, t: now });''',
    '''        this._history[this._history.length] = { x: e.clientX, y: e.clientY, t: now };''')

sub('js/motion.js',
    '''        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('is-in');
                io.unobserve(entry.target);
            });
        }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });''',
    '''        var io = new IntersectionObserver(function (entries) {
            for (var k = 0; k < entries.length; k++) {
                if (!entries[k].isIntersecting) continue;
                entries[k].target.classList.add('is-in');
                io.unobserve(entries[k].target);
            }
        }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });''')

# ---------------------------------------------------------------------- ui.js
sub('js/ui.js',
    '''        var list = root.querySelectorAll(FOCUSABLE);
        var out = [];
        for (var i = 0; i < list.length; i++) {
            var el = list[i];
            if (el.offsetParent !== null || el === document.activeElement) out.push(el);
        }
        return out;''',
    '''        var list = root.querySelectorAll(FOCUSABLE);
        var out = [], n = 0;
        for (var i = 0; i < list.length; i++) {
            var el = list[i];
            if (el.offsetParent !== null || el === document.activeElement) out[n++] = el;
        }
        return out;''')

# -------------------------------------------------------------------- shop.js
sub('js/shop.js',
    '''        Object.keys(glyphs).forEach(function (id) {
            var el = $('#' + id);
            if (el) el.innerHTML = UI.icon(glyphs[id][0], glyphs[id][1]);
        });''',
    '''        for (var id in glyphs) {
            if (!Object.prototype.hasOwnProperty.call(glyphs, id)) continue;
            var el = $('#' + id);
            if (el) el.innerHTML = UI.icon(glyphs[id][0], glyphs[id][1]);
        }''')

sub('js/shop.js',
    '''        body.innerHTML = '<div class="pb-5">' + saved.map(function (item) {''',
    '''        body.innerHTML = '<div class="pb-5">' + Algorithms.collectText(saved, function (item) {''')

sub('js/shop.js',
    '''                    '</div>' +
                '</div>' +
            '</div>';
        }).join('') + '</div>';
    }''',
    '''                    '</div>' +
                '</div>' +
            '</div>';
        }, '') + '</div>';
    }''')

for path, pairs in edits.items():
    text = io.open(path, encoding='utf-8').read()
    for old, new in pairs:
        assert old in text, path + ' NOT FOUND:\n' + old[:160]
        text = text.replace(old, new, 1)
    io.open(path, 'w', encoding='utf-8').write(text)
    print('patched', path)
