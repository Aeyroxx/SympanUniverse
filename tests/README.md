# Tests

The site has no dependencies. These scripts are a safety net for changes, and
they follow the same rules as the site: no banned built-ins, no regular
expressions, no `new` except `new Date`.

Four need nothing but Node:

```sh
node tests/unit.js         # core helpers, the six structures, the algorithms
node tests/store-test.js   # the whole order lifecycle against the real code
node tests/rubric.js       # the house rules, in every script
node tests/links.js        # every file the page and the data point at exists
```

`smoke.js` drives Chrome through the site as a customer and as staff. It needs
Chrome at `C:/Program Files/Google/Chrome/Application/chrome.exe` (or set
`CHROME_PATH`) and the `puppeteer-core` package. Install it somewhere outside
the project and point `NODE_PATH` at it, so the site folder stays free of
`node_modules`:

```sh
npm install --prefix C:/tools/puppeteer puppeteer-core
NODE_PATH=C:/tools/puppeteer/node_modules node tests/smoke.js
SHOTS=C:/tmp/shots NODE_PATH=… node tests/smoke.js   # also save screenshots
```

It opens `index.html` straight from disk. No server is needed.

## What each one covers

**unit.js** covers the string, array, money, date and HTML helpers that
replace the built-ins. For each structure it checks normal use and the edge
cases: removing a linked list's head and tail, a circular queue wrapping and
growing, the heap's tie-breaking and arbitrary removal, collisions in a
one-bucket hash table and a table growing once it is full. It checks that
insertion sort and selection sort are stable, binary search at both ends and
on a miss, and greedy bill counts. It loads every file of `js/dsa/`.

**store-test.js** plays the seeded history and checks that every event ran.
It confirms all 160 colour photographs exist and that round and layered
differ. It covers delivery fees by city, request validation, and a full order
from request through quotation, a 50% down payment, receipts, release blocked
by a balance, the balance payment, completion, undo and completion by date.
It also covers rush ordering by due date, voiding with payments retained, best
sellers excluding voided orders, order editing with its revision log and
balance, product editing and disabling, customer look-up, and the sign-in
lockout.

**rubric.js** scans `js/` and `tests/` for the banned built-ins, regex
literals, `class`/`this`/`prototype`/`new`, and browser storage. It proves the
scanner catches each one on a planted file, checks there is a single HTML page
with no admin link in the shop, and checks that every function in `js/` states
its time and space complexity.

**links.js** checks every script, stylesheet and image in `index.html`, every
gallery photograph, and every colour preview, and that each preview is the one
the shop shows for its combination.

**smoke.js** runs the site in Chrome. On the homepage it checks there is no
Track section, no occasion filter, no admin link, "Starts at" rather than
"From", "Sold", and no Custom Bouquet. Then it covers the category, search and
sort controls; the reference photograph changing with colour and arrangement;
the money bouquet's bill suggestion; a request with a Manila courier; tracking;
the desk sign-in; FIFO quotation; acceptance with a 50% GCash payment and its
receipt; the balance gate, completion and undo; order editing; voiding;
product editing and disabling; and signing out. It also checks the phone
layout at 390px and that the console stays clean.
