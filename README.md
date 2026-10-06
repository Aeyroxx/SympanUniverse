# Sýmpan Universe

A shop for handcrafted ribbon bouquets in Lawa, Meycauayan, Bulacan, built as
a working demonstration of hand-written data structures and algorithms.

Plain HTML, CSS, JavaScript and Bootstrap. No build step, no framework, no
server, no database. Double-click `index.html` and it runs.

---

## Running it

| Address | What opens |
| --- | --- |
| `index.html` | The shop: catalogue, customiser, cart and checkout, order tracking |
| `index.html#admin` | The order desk's sign-in. Nothing on the shop links here. |

**Everything lives in memory.** The orders, products and receipts are
ordinary JavaScript arrays. Nothing is written to storage, so nothing can move
from one page to another. That is why the shop and the order desk share one
page, switched by the address: a separate `admin.html` could never see the
orders. A reload starts afresh from six weeks of seeded history. That history
is not typed in as finished records. It is played through the real lifecycle
functions, so its receipts, queues and best sellers are genuine.

**Signing in to the desk** takes two steps:

1. The owner's email (`adminEmail` in `js/email-config.js`) and the
   password, which is `admin123`.
2. A six-digit code emailed to that address. It lasts five minutes and
   allows three tries. A new code can be requested after 30 seconds.

The page keeps only hashes of the password and the code, shows no hint, and
locks for 30 seconds after five wrong passwords. To change the password, open
the browser console on the page, run `fnv1a('your new password')`, and put the
number into `ADMIN_PASS_HASH` in `js/data.js`.

Be clear about what this is: it keeps customers off the desk, but it is
**not** real security. The whole site runs in the browser, so anyone can read
its code, and real access control needs a server.

**Email** goes out through [EmailJS](https://www.emailjs.com) straight from
the browser. Fill in the three IDs at the top of `js/email-config.js` to
switch it on; the setup steps are in that file. The free plan covers 200
emails a month. Until then, every email is kept in the desk's **Outbox**,
marked "not sent", and the sign-in code is shown on screen, clearly labelled.
Never put a mailbox password in any site file. The demo customers use
`example.com` addresses, which can never receive mail, so they are never
emailed.

**Know the email risk.** The page sends the mail itself, so anyone who reads
the EmailJS IDs can send their own text through the template, from the shop's
mailbox, to any address. A browser-only site cannot fully prevent that; a
server can. To limit it:
- set a low rate limit in EmailJS;
- connect a mailbox used only for these notices, not the owner's personal
  one;
- once the site is on a web address, allow only that address.

Pages opened straight from a file can't be restricted by address. The details
are in `js/email-config.js`.

---

## The twelve modules

| # | Module | What it does | Structure / algorithm | Cost |
| --- | --- | --- | --- | --- |
| 1 | **Catalogue & Best Sellers** | Product grid; best sellers ranked from paid orders | **Selection sort** | O(n²) |
| 2 | **Category Navigation** | Branch → line drill-down from the shop's own three columns | **N-ary tree**, depth-first walk | O(n) |
| 3 | **Search & Sort** | Text search over names, materials and colour names; sort control | **Linear search** + naive string matching, **insertion sort** | O(n²), O(n²) worst / O(n) best |
| 4 | **Flower Customiser** | Arrangement, count, 20 colours, add-ons, the matching photograph | **Hash table** (reference photos), **recursion** (add-on total) | O(1) avg, O(n) |
| 5 | **Gift Customiser** | Money, makeup, sweets, diaper and beer-cake quote requests; the picture bouquet | **Greedy** change-making (fewest bills) | O(n) |
| 6 | **Cart** | Items, quantities, removal | **Singly linked list** | O(1) append, O(n) remove |
| 7 | **Checkout & Delivery** | Contact and email, pickup (date) or delivery (address, courier, date, time), fee by address | **Hash table** (delivery areas) | O(1) avg |
| 8 | **Quotation Desk** | Quote requests in arrival order, pre-filled from past quotes | **Circular queue** (FIFO), **insertion sort** (latest quotes) | O(1), O(n²) |
| 9 | **Payment, Receipts & Email** | GCash 50% or 100%, receipts, an email at every step | **Circular queue** (outgoing mail) | O(1) |
| 10 | **Production & Tracking** | Rush lane by due date, standard lane by payment order; customer look-up | **Min-heap**, **circular queue**, **binary search** | O(log n), O(1), O(log n) |
| 11 | **Order Records** | Completed by date, undo, voided orders kept | **Stack** (undo), insertion sort by date | O(1), O(n²) |
| 12 | **Order Desk** | Two-step sign-in, Overview by day / month / year, order and product editing | Hash of the password, bucketing by date | O(n), O(n²) |

### Complexity of every operation

| Structure | Operation | Time | Space |
| --- | --- | --- | --- |
| Linked list | append · get · update | O(1) | O(1) |
| | remove (finds the predecessor) | O(n) | O(1) |
| Circular queue | enqueue (amortised) · dequeue · front · requeue-front | O(1) | O(1) |
| | remove from the middle (a voided order) | O(n) | O(n) |
| Min-heap | insert · extract-min | O(log n) | O(1) |
| | peek | O(1) | O(1) |
| | remove arbitrary (find + re-sift) | O(n) | O(1) |
| Stack | push · pop · peek | O(1) | O(1) |
| N-ary tree | add node | O(1) | O(1) |
| | find · leaves under a node | O(n) | O(n) |
| Hash table (chaining) | put · get | O(1) average, O(n) worst | O(1) |
| Insertion sort | sort (stable) | O(n²) worst, O(n) best | O(n) copy |
| Selection sort | sort (stable variant) | O(n²) always | O(n) copy |
| Binary search | find | O(log n) | O(1) |
| Linear search | find all matches (naive string matching per record) | O(n²) | O(n) |
| Recursion | sum a list | O(n) | O(n) call stack |
| Greedy bills | fewest notes | O(n) | O(n) |

### How complexity is written (the course rules)

Only the four notations from class are used: **O(1), O(log n), O(n) and
O(n²)** — with "average", "amortised", "best" or "worst" where it matters,
and sums such as "O(log n) + O(n)".

- **n** is the size of whatever the function goes through: records in a
  table (orders, lines, products, emails, receipts), items in a queue, or the
  characters of a text when the text itself is the job (validators, hashing,
  string search).
- **A loop inside a loop is O(n²).** Naive string matching over a table is
  counted as O(n²), as in the course guide.
- Work on one record's own fields (escaping or formatting its text, copying
  it) and look-ups in the shop's short fixed lists (the 20 colours, 2
  arrangements, 4 add-ons, 4 time slots, 2 payment methods) count as constant
  work inside a loop over records. These lists are part of the program's
  set-up, not data that grows.
- Where an O(log n) step runs once per item (a binary search per queued id)
  the note says "O(n²) at most".

Every function in `js/` carries its own `Time O(…) · Space O(…)` note.
`tests/rubric.js` fails if one is missing, if any other notation appears
(no O(n log n), O(k), O(i·s) …), or if the `Date` built-in is used for
anything but reading the clock — all date maths is hand-written day-number
arithmetic (`dayNumber`, `dateOfDayNumber` in `js/core.js`).

```
Sýmpan Universe
├── Flower Bouquets ── Rose · Plumeria · Dahlia · Sunflower
├── Other Bouquets  ── Paper Bills · Makeup · Pictures · Sweets / Snacks
└── Gift Cakes      ── Diaper Cake · Beer-in-Can Cake
```

---

## How an order works

```
cart ──► checkout ──┬─ price-list cart ─────────────► paid (in production) ──► ready
                    └─ quote cart ─► requested ─► quoted ─┘
                                        └────────────┴─► voided (VOIDED – NON-REFUNDABLE, kept)
```

The owner does as little as possible by hand:

- **Flower bouquets and the picture bouquet** are priced from the price list.
  The customer pays at checkout and the order is confirmed and emailed at
  once, with no step for the owner. Courier rates on file are charged
  automatically.
- **Quote requests** are only for the money bouquet, makeup bouquet, sweets
  and snacks bouquet, diaper cake and beer-in-can cake. A cart with one of
  these, or a delivery to a city with no rate on file, becomes a quote
  request.
- **Quotations are pre-filled** from the owner's own past quotes for the same
  product and size: the average of the five most recent. Usually the owner
  only checks the figures and presses send.
- **Unpaid quotations expire** after three days. The system voids them and
  emails the customer.
- **Emails go out automatically** at each step: the confirmation with the
  tracking number, the approved quotation, each payment, "ready for pickup /
  on its way", and a cancellation.

Step by step:

1. **The customer chooses** a product, sets the size, quantity, design and
   colour, and adds it to the **cart**. A reference design can be attached.
2. **Checkout** asks for name, email and mobile number, then pickup or
   delivery. **A pickup has a date only**; a delivery has a date and a time
   slot.
3. **A price-list cart is paid right there**, either a **50% Down Payment
   via GCash** or a **100% Full Payment via GCash** with the 13-digit
   reference. Those are the only two payment methods. A **quote cart** is
   sent instead, and nothing is charged until the customer accepts.
4. **Quote requests** are answered first in, first out. The owner prices
   each line as *materials + labour/assembly + item cost*. Item cost covers
   only things the shop buys for the customer, and is shown as a separate
   figure. The customer accepts under **Track order**, using the tracking
   number with their mobile number or email, and pays the same two ways.
5. **Production.** Rush orders are made first, earliest due date first.
   Standard orders follow in the order they were paid. An order is released
   only when fully paid. One that still owes a balance keeps its place but
   does not hold up the orders behind it. If every order owes, the desk says
   so. The last completion can be undone, and it goes back exactly where it
   was. Undo covers the desk's own completions this session, not the seeded
   history.

A GCash reference can only be used once. A second payment with the same
13-digit reference is refused, and the desk is told which receipt it is
already on.

Declining a quotation, cancelling a request, or a void by the desk marks the
order **VOIDED – NON-REFUNDABLE**. It is never deleted, and any payment is
shown as retained.

### What each product's quotation covers

| Product | Shown as | Customer usually provides | Quotation |
| --- | --- | --- | --- |
| Rose, Plumeria, Dahlia, Sunflower | **Starts at ₱…** (the order sheet's price list) | — | none: priced and paid at checkout |
| Picture Bouquet | **₱650** (the order sheet's price) | — | none: paid at checkout |
| Money Bouquet | **Customized Pricing** | the bills | materials + labour (size, bill count, complexity) |
| Makeup Bouquet | Customized Pricing | the makeup (customer says yes or no) | materials + labour, + products if the shop sources them |
| Sweets & Snacks | Customized Pricing | the sweets | materials + labour, item cost kept separate |
| Diaper Cake | Customized Pricing | the diapers | materials + labour |
| Beer-in-Can Cake | Customized Pricing | the beer (type, brand, cans) | materials + labour, beer cost kept separate |

Every product page says *"Price varies depending on size, quantity, and
design."* Starting prices always read **"Starts at"**.

---

## Colours and reference photographs

The twenty colours on the shop's chart are all offered: Red, Wine Red, Orange,
Peach, Yellow, Golden Yellow, Matcha, Emerald Green, Navy Blue, Baby Blue,
Dark Blue, Violet, Purple, Purple Pink, Baby Pink, Milky White, White, Choco
Brown, Silver Gray and Black.

Every flower × arrangement × colour has its own photograph, 160 in all. Round
and layered bouquets always show different photographs.

- **14 are real photographs** of the shop's work, captioned *Actual bouquet
  photo*.
- **146 are previews**, captioned *Colour preview*. Each was made from one of
  the shop's own photographs of that flower and arrangement, recoloured to the
  chart colour. Only the flower colour changes: the hue is replaced and the
  satin's light and shade are kept. The wrap, background and hands are left
  alone. They are in `assets/colors/`.

The customiser finds the photograph with one hash-table look-up, keyed
`flower|arrangement|colour`.

---

## Delivery and handling

The fee is worked out from the address. The city is normalised (case,
spacing, punctuation) and looked up in a hash table.

| Where | Who delivers | Fee |
| --- | --- | --- |
| Pickup at the shop | — | free |
| Brgy. Lawa, Meycauayan | the shop, Fri–Sun | free |
| Rest of Meycauayan | the shop, Fri–Sun | ₱20 |
| Marilao, Bocaue | the shop, Fri–Sun | ₱35 |
| Obando, Valenzuela | the shop, Fri–Sun | ₱50 |
| Metro Manila | Flash Express / Lalamove | ₱120 / ₱220 estimate |
| Rest of Bulacan | Flash Express / Lalamove | ₱95 / ₱160 estimate |
| Anywhere else | courier | no rate: the owner enters it |

Courier figures are the shop's planning rates, not live rates. No courier API
is connected. The owner must confirm or enter the fee before a quotation can
be sent, and once confirmed the "estimate" label is dropped.

---

## The order desk

- **Overview:** pick **Daily, Monthly or Yearly** and any date, or step back
  and forth. It shows money collected, sales, orders placed, quote requests,
  pieces sold, orders made ready, and voids with the amount retained, for
  that period. Below that is a breakdown one level down: the day's orders,
  the month's days, or the year's months. Last come the period's best
  sellers. A "right now" strip keeps the live queues in view.
- **Quote requests:** the FIFO queue, with every item, spec, note and
  reference design.
- **Awaiting payment:** revise a quotation, or record a GCash payment taken
  outside the site.
- **In production:** **Mark ready** (which emails the customer), undo last,
  record balances.
- **Completed:** grouped by day with day totals; each order opens to its full
  details, receipts and history.
- **Voided:** kept on record with reason, who voided it and when ("System"
  for an expired quotation).
- **Outbox:** every email written, newest first, with whether it was sent.
  Failed ones can be sent again. Sign-in codes are listed, but their content
  is hidden.
- **Products:** edit name, descriptions, processing time, materials, images
  (add, remove, set cover, upload), and options and prices: arrangements,
  colours and the price list for flowers; sizes and an optional starting price
  for the rest. A price can only be set for a flower count an arrangement
  actually offers. Products are **disabled, never deleted**. A disabled product
  leaves the shop and cannot be ordered, but keeps its history and can be
  enabled again.

**Editing an order:** products, specs, add-ons, quantities, notes,
materials, labour and item costs, fees, pickup or delivery, courier,
schedule, contact and address can all be changed. Each change is written to
the order's revision log as `field: old → new`.

- A new address brings its own delivery fee unless the desk types one.
- A quoted line can't be edited down to nothing.
- A full time slot is refused.
- Changing a standard order's date keeps its place in line.
- The balance and payment status follow the new total. If the desk raises an
  order that was already paid or completed, the difference can be collected
  from the desk or from the customer's tracking page.
- Receipts keep the figures they were issued with.

**Receipts** include the receipt and order numbers, order and payment dates,
customer, items with their customisation, subtotal, delivery and handling,
rush fee, total, payment method, GCash reference, amount paid, paid to date,
remaining balance, and status: *PARTIALLY PAID — balance of ₱… due* or
*FULLY PAID*. They print on their own.

**Best sellers** are ranked by **total pieces sold** across orders that have
been paid, in production or completed. Buying ten of a bouquet counts as ten,
so a large order moves a product up the ranking at once. Ties go to the
product with more orders. Requests that were never accepted do not count,
and neither do voided orders. Nobody assigns the ranking by hand. Cards show
the number **Sold**.

---

## House rules, and how they are enforced

| Rule | How |
| --- | --- |
| Data lives in arrays | Records are plain objects in arrays; structures are records of arrays |
| Data cannot transfer between pages | No `localStorage`, `sessionStorage`, IndexedDB or cookies; one HTML page |
| Procedural, not OOP | No `class`, `this`, `prototype`, or `new` (except `new Date`) |
| No built-in helpers | None of `push pop shift unshift splice slice concat sort reverse indexOf lastIndexOf includes find findIndex filter map forEach reduce some every join`, nor `search split replace trim toLowerCase toUpperCase padStart substring`, nor regular expressions |
| Time and space complexity | Stated on every function |

`tests/rubric.js` checks all of this in every script, tests included. It
blanks out comments and strings first, so a comment that names a built-in is
not counted as a call.

The replacements are written once, in `js/core.js`:

| Instead of | The site uses |
| --- | --- |
| `a.push(v)` | `listAdd(a, v)`, i.e. `a[a.length] = v` |
| `a.indexOf(v)` / `a.includes(v)` | `positionIn(a, v)` / `isIn(a, v)` |
| `a.filter(f)` / `a.find(f)` | `keepWhere(a, f)` / `firstWhere(a, f)` |
| `a.slice(i, j)` / `a.concat(…)` | `copyRange(a, i, j)` / `withAdded(a, v)` |
| `a.reverse()` / `a.join(s)` | `backwards(a)` / `glue(a, s)` |
| `a.map(f).join('')` | `renderEach(a, f)` |
| `s.toLowerCase()` / `s.trim()` | `toLower(s)` / `strip(s)` |
| `s.includes(t)` / `s.startsWith(t)` | `textHas(s, t)` / `beginsWith(s, t)` |
| `s.split(t)` / `s.replace(a, b)` | `cutText(s, t)` / `swapText(s, a, b)` |
| `s.substring(i, j)` / `s.padStart(n, c)` | `textPart(s, i, j)` / `leftPad(s, n, c)` |
| `toLocaleString` for money | `peso(n)`, grouping digits by hand |

---

## Layout

```
index.html               the shop and the order desk, one page
assets/
  logo.png
  products/              36 photographs of the shop's work
  colors/                146 colour previews (flower-arrangement-colour.jpg)
css/
  tokens.css · base.css · components.css · pages.css   design system
  shop.css               customiser, request, tracking, receipts
  desk.css               the order desk
js/                      loaded in this order
  core.js                hand-written replacements for the banned built-ins
  email-config.js        the three EmailJS IDs and the owner's email (edit this)
  structures.js          linked list, circular queue, min-heap, stack, tree, hash table
  algorithms.js          insertion sort, selection sort, binary and linear search, recursion, greedy
  data.js                colours, categories, products, add-ons, delivery, payment
  store.js               the in-memory state, products, photos, basket, delivery, sales
  orders.js              the order lifecycle: request, quotation, payment, production, voids
  editing.js             order and product editing
  notify.js              the emails each order step writes, queued for sending
  reports.js             the Overview's figures for a day, month or year
  seed.js                six weeks of history, played through the lifecycle
  mail.js                sends queued emails through EmailJS
  motion.js              springs and drag tracking
  ui.js                  icons, toasts, sheets, confirmations
  receipt.js             receipts and printing
  shop-catalog.js        catalogue, best sellers, tree filter, search, sort
  shop-product.js        the customiser
  shop-basket.js         the cart and checkout
  shop-track.js          tracking, accepting quotations, paying
  admin-signin.js        email and password, then the emailed code
  admin-desk.js          tabs and order lists
  admin-overview.js      the Overview by day, month or year, and the Outbox
  admin-orders.js        order details, quotation, editing, payments, voids
  admin-products.js      product editing, disable and enable
  app.js                 start-up and routing
tests/                   Node checks — see tests/README.md
docs/reviewer/           the defense reviewer (PDF, and index.html)
tools/reviewer/          builds the reviewer from the real code (see below)
_backup-original/        earlier versions, kept for reference
```

Scripts are ordinary `<script src>` tags in dependency order, not ES modules,
so the site works when opened straight from the filesystem.

---

## Design

Built to Apple's interface guidance. Springs replace fixed-duration
transitions, so a moving sheet can be grabbed and reversed. Gestures track the
finger 1:1, and the release velocity is handed to the spring. Momentum
projection decides where a flick was heading. Edges rubber-band. The chrome is
translucent. The interface stays neutral so the colour comes from the
bouquets. The shop is light only, while reduced motion, reduced transparency
and increased contrast are still honoured.

---

## Defense reviewer

`docs/reviewer/Sympan-Universe-Defense-Reviewer.pdf` (and the same document as
a web page, `docs/reviewer/index.html`) follows the layout of the course's
defense reviewer:

- a cover with the four parts of the system and the modules in each;
- **Start here**: how to use the reviewer, how to run the demo (the owner's
  sign-in email is read from `js/email-config.js`), and the contents;
- a **system overview**: the customer and owner flow, how the program is built,
  the data, and a table of the project rules and how the code meets each one;
- a **DSA primer** page with a small picture of every structure and algorithm;
- for each part, a **one-page summary** (a 60-second pitch, the structures to be
  able to explain with their time and space, likely panel questions with
  answers), then its modules;
- each **module** opens with its screens, files, data and DSA, then answers, in
  the panel's order: 1 business process, 2 input, 3 process (with an
  Input → Process → Output picture), 4 output, 5 complexity analysis,
  6 justification, 7 demonstration (live steps, screenshots and a trace of the
  real code), and a code walkthrough (the real functions with their line
  numbers, each step explained, and their time and space);
- appendices: a complexity summary of all twelve modules and how complexity is
  counted, general panel questions, a glossary and a file map.

To show who presents which part, put each member's name in `member` in the
`PARTS` list of `tools/reviewer/content.js`, then rebuild.

Only the explanations are written by hand (`tools/reviewer/content.js`). The
rest comes from the code itself:

- code, line numbers and complexity notes are read from `js/`;
- traces run the site's own functions on the demo data;
- screenshots come from the running site (with EmailJS switched off, so no
  real email is sent).

After changing the code, rebuild:

```sh
NODE_PATH=…/node_modules node tools/reviewer/shots.js   # screenshots (Chrome + puppeteer-core)
node tools/reviewer/build.js                            # docs/reviewer/index.html
NODE_PATH=…/node_modules node tools/reviewer/pdf.js     # the PDF
```

The build stops if a function or an explained line has moved.
