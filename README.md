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

**Desk accounts.** Everyone who works the desk has their own account. The
credentials are kept in an array, `staffAccounts` in `js/backend/state.js` (the functions are in `js/backend/m12-order-desk.js`):

| Account | Email | Password | Role |
| --- | --- | --- | --- |
| Shop owner | `adminEmail` in `js/data/email-config.js` | `admin123` | Owner: everything, including Accounts and Logs |
| Bea Cruz (demo) | `bea.cruz@example.com` | `Staff2026` | Staff: orders, production and products |

- The array is in id order. A new account takes the next id, so appending
  keeps it sorted, and an account is found by id with binary search.
- Beside it, a hash table maps each email to its account id, so signing in
  finds the account in O(1) on average.
- No password is stored, only a salted hash. FNV-1a runs over the account's
  own salt and the password, 200 times over. The two demo passwords appear in
  no file in `js/`; the seed holds only their hashes. (They are written in
  this README, the tests and the reviewer, for the demo.)
- An owner adds staff on the **Accounts** tab with a temporary password, and
  can disable an account. Accounts are never deleted, so their history stays.
  Nobody can disable their own account, and the last active owner stays.
- Everyone can change their own password, which needs the current one first.
  Five wrong current passwords in a row sign the person out and pause the
  email, so nobody at a desk left open can guess it there.
- Account names must be unique, because the logs name people. New accounts
  can't use an `example.com` address, which can't receive the sign-in code.

**Signing in** takes two steps:

1. The account's email and password.
2. A six-digit code emailed to that account's own address. It lasts five
   minutes and allows three tries. A new code can be requested after 30
   seconds, three per sign-in.

The page keeps only hashes of the passwords and the code, and shows no hint.
A wrong password, an unknown email and a disabled account all get the same
message. Five wrong passwords in a row for one email pause that email for 30
seconds; other people can still sign in. The header names who is signed in,
and the audit log records everything they do under their name.

- **Codes per hour.** Each address gets at most six codes an hour, sign-in
  and reset codes together. A second hash table counts them, and starting a
  sign-in or reset again doesn't reset the count. Without this, anyone could
  flood the owner's inbox and use up the EmailJS monthly allowance by pressing
  Back and starting over.
- **Idle sign-out.** The desk signs itself out after 15 minutes without a tap
  or a key, and signing out empties the sign-in form.
- **What the log keeps.** If the email box holds something that isn't an
  email address (a password typed in the wrong box, say), the log records only
  "(not an email address)", never the text.

The demo staff account's address is on `example.com`, which can't receive
mail. Its sign-in code is shown on screen, clearly labelled, so the staff view
can be tried. Its password can't be reset once email is connected: a reset
code is never shown on screen then, so knowing an email is never enough to
take an account.

**Forgot password?** on the sign-in card resets it:

1. Type the account's email. The screen, the waits, the expiry and the
   hourly limit behave the same whatever is typed, so it never tells a
   stranger which emails have accounts. A code is only made for the email of
   an active account. While email isn't connected at all, that code is shown
   on screen for the demo.
2. A six-digit reset code is emailed. Only its hash is kept. It lasts ten
   minutes, allows three tries, and a new one can be sent after 30 seconds,
   three per reset.
3. Enter the code and the new password twice. The password must be 8 to 64
   characters, with at least one letter and one number, no spaces, and must
   differ from the current one.

A reset gives the account a new salt and hash, lifts any pause on its email,
and emails the person that their password changed. Signing in still needs the
emailed sign-in code. Like all data here, accounts and passwords live in the
page's memory, so a reload brings back the demo accounts and passwords. To
change a password for good, open the browser console on the page and run
`passwordHash('your-salt', 'your new password')`. Then put the salt and the
number into that account's row of `STAFF_SEED` in `js/data/desk-security.js`.

Be clear about what this is: it keeps customers off the desk, but it is
**not** real security. The whole site runs in the browser, so anyone can read
its code, and real access control needs a server with a proper password hash
(bcrypt or Argon2).

**Email** goes out through [EmailJS](https://www.emailjs.com) straight from
the browser. Fill in the three IDs at the top of `js/data/email-config.js` to
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
- set a low rate limit in EmailJS, and turn on its CAPTCHA option for the
  template (the page's own hourly limit resets when the page is reloaded);
- connect a mailbox used only for these notices, not the owner's personal
  one;
- once the site is on a web address, allow only that address.

Pages opened straight from a file can't be restricted by address. The details
are in `js/data/email-config.js`.

**Personal data.** The shop asks only for what an order needs: name, email,
mobile, and an address for a delivery.

- A **Data Privacy Notice** written for the Data Privacy Act of 2012 (RA 10173)
  covers:
  - who collects the data, and why;
  - the legal basis for using it;
  - who else receives it: couriers, and EmailJS, whose servers are outside
    the Philippines. It also says that Google Fonts and jsDelivr see a
    visitor's IP address when the page loads;
  - gift deliveries, where the address is usually the recipient's;
  - how long it is kept: at most one year after an order is completed, and
    receipts as long as tax rules require (**the owner should confirm these
    periods**), and how it is protected;
  - the customer's rights, including withdrawing consent and complaining to
    the National Privacy Commission;
  - how to reach the shop.
- The shop's **order terms** sit beside it. Both open in one sheet from a
  translucent banner, the footer, checkout and Track order.
- The banner appears once per visit. The site sets no cookies and saves
  nothing on the device, so "Got it" lasts until the next visit.
- At checkout the customer ticks **two separate boxes**: one for the Privacy
  Notice and one for the order terms. Both start unticked, and the order
  can't be placed without both.
- Each order records the agreement in `order.consent`: which version of the
  notice and of the terms, and when. The order's history records it too.
- To change the notice, edit `PRIVACY_NOTICE` in `js/data/privacy.js` and raise
  `PRIVACY_NOTICE_VERSION`; for the terms, `ORDER_TERMS` and
  `ORDER_TERMS_VERSION`. The last section gives the shop's own email and
  page as the contact.

---

## The thirteen modules

| # | Module | What it does | Structure / algorithm | Cost |
| --- | --- | --- | --- | --- |
| 1 | **Catalogue & Best Sellers** | Product grid; best sellers ranked from paid orders | **Selection sort** | O(n²) |
| 2 | **Category Navigation** | Branch → line drill-down from the shop's own three columns | **N-ary tree**, depth-first walk | O(n) |
| 3 | **Search & Sort** | Text search over names, materials and colour names; sort control | **Linear search** + naive string matching, **insertion sort** | O(n²), O(n²) worst / O(n) best |
| 4 | **Flower Customiser** | Arrangement, count, 20 colours, add-ons, the matching photograph | **Hash table** (reference photos), **recursion** (add-on total) | O(1) avg, O(n) |
| 5 | **Gift Customiser** | Money, makeup, sweets, diaper and beer-cake quote requests; the picture bouquet | **Greedy** change-making (fewest bills) | O(n) |
| 6 | **Cart** | Items, quantities, removal | **Singly linked list** | O(1) append, O(n) remove |
| 7 | **Checkout & Delivery** | Contact and email, pickup (date) or delivery (address, courier, date, time), fee by address, privacy and terms agreement | **Hash table** (delivery areas) | O(1) avg |
| 8 | **Quotation Desk** | Quote requests in arrival order, pre-filled from past quotes | **Circular queue** (FIFO), **insertion sort** (latest quotes) | O(1), O(n²) |
| 9 | **Payment, Receipts & Email** | GCash 50% or 100%, receipts, an email at every step | **Circular queue** (outgoing mail) | O(1) |
| 10 | **Production & Tracking** | Rush lane by due date, standard lane by payment order; customer look-up | **Min-heap**, **circular queue**, **binary search** | O(log n), O(1), O(log n) |
| 11 | **Order Records** | Completed by date, undo, voided orders kept | **Stack** (undo), insertion sort by date | O(1), O(n²) |
| 12 | **Order Desk & Accounts** | Desk accounts (owner and staff), two-step sign-in, Overview by day / month / year, order and product editing | **Credentials array** + **hash table** (email → account), salted hash, bucketing by date | O(1) avg + O(log n), O(n), O(n²) |
| 13 | **Security & Audit Logs** | Every sign-in attempt and who did what; per-email pause; password reset; CSV | **Append-only array**, **hash table** (wrong passwords per email) | O(1) append, O(n) newest first |

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

### Every other feature, in the order of the flow

Besides modules 1 to 12 above, these are all the features of the site, in
the order a visit flows, from opening it to what runs by itself. (Module 13
explains the security pieces in full.) Time and Space are copied from each
function's own note in the code (n is what that function goes through). The
same list, built straight from the code, is Appendix D of the defense
reviewer; its data is `tools/reviewer/features.js`.
**1. Opening the site**

| # | Feature | Structure / algorithm | Time | Space | Code |
| --- | --- | --- | --- | --- | --- |
| 1 | **Demo history replay** — At start-up six weeks of orders are played through the real order functions, so receipts, queues and best sellers are genuine. | Every request, quote, payment, completion and void becomes an event; insertion sort puts them in time order, then each is replayed. | O(n²) | O(n) | `data/demo-history.js` seedEvents() |
| 2 | **Calendar maths without Date** — Lead times, weekdays, month lengths and leap years for every date on the site. | A date becomes a day number; adding days is adding numbers, then converting back. Date only reads the clock. | O(1) | O(1) | `dsa/dates.js` addDays() |
| 3 | **Privacy banner and Privacy Notice** — A translucent banner cites the Data Privacy Act; one sheet shows the Privacy Notice and the order terms. | The notice is an array of sections; one pass over it writes the sheet. | O(n) | O(n) | `frontend/shop/privacy.js` renderPrivacy() |
| 4 | **Sheets and swipes that follow the finger** — Every sheet, the cart and the photo gallery move on springs that can be grabbed and reversed mid-motion. | Each animation frame steps every moving spring once (n = springs in motion). | O(n) | O(n) | `frontend/ui/motion.js` motionTick() |
| 5 | **Flick projection and rubber-band edges** — A flick decides where a sheet lands; dragging past an edge resists instead of stopping hard. | A closed formula on the release speed (exponential deceleration); a second one for the edge resistance. | O(1) | O(1) | `frontend/ui/motion.js` projectMomentum() |

**2. Browsing the shop**

| # | Feature | Structure / algorithm | Time | Space | Code |
| --- | --- | --- | --- | --- | --- |
| 6 | **"Starts at" price** — Each flower card shows its lowest price on the price list. | One pass over the price rows, keeping the smallest (linear scan for the minimum). | O(n) (one pass over the price rows) | O(1) | `backend/m01-catalogue-best-sellers.js` lowestOffer() |
| 7 | **Sample photos with credits** — Products the shop has not photographed show an openly licensed sample photo, badged and credited. | Linear search of the photo credits by file name. | O(n) | O(n) | `backend/m01-catalogue-best-sellers.js` photoCredit() |
| 8 | **Peso amounts** — Every price is written "₱1,234.50". | The digits are grouped in threes by hand (n = digits), with no toLocaleString. | O(n) | O(n) | `dsa/numbers.js` peso() |

**3. Cart and checkout**

| # | Feature | Structure / algorithm | Time | Space | Code |
| --- | --- | --- | --- | --- | --- |
| 9 | **Edit a cart line** — Each line in the cart has an Edit button: the customiser opens with that line’s choices, and "Save changes" puts the changed line back in its place. | The linked list keeps its nodes in an array, so the node is reached by its index and its value replaced; the cart’s order does not change. | O(1) | O(1) | `backend/m06-cart.js` basketReplace() |
| 10 | **Today’s prices in the cart** — If the owner changes a price after something was added, checkout charges the current price. | Walk the cart’s linked list; look up each line’s product (linear search) and price it again. | O(n²) | O(n) | `backend/m06-cart.js` repricedCart() |
| 11 | **Disabled products leave the cart** — A product the owner disables can no longer be ordered, even if it is already in a cart. | Keep the cart lines whose product is missing or disabled (filter + linear search per line). | O(n²) | O(n) | `backend/m06-cart.js` unavailableBasketItems() |
| 12 | **Earliest ready date and rush** — The first date offered is today plus the longest processing time in the cart, or tomorrow for a rush order (+₱50). | Linear scan for the largest lead time (each line’s product looked up), then day-number arithmetic. | O(n²) | O(1) | `backend/m07-checkout-delivery.js` earliestDate() |
| 13 | **Weather and schedule notes** — Wherever a date or time is shown — checkout, confirmation, Track order, receipts, emails — a note says weather and traffic can move it. | A fixed note per mode (pickup or delivery). | O(1) | O(1) | `backend/m07-checkout-delivery.js` scheduleNote() |
| 14 | **Privacy and terms agreement** — Two separate unticked boxes at checkout; the order records which versions were agreed to, and when. | Two constant-time checks inside the form check (the whole check is shown); the agreement is stored on the order. | O(n²) | O(n) | `backend/m07-checkout-delivery.js` validateRequest() |
| 15 | **Price-list orders need no quotation** — A cart of price-list bouquets is priced at once and paid at checkout; only gifts wait for a quotation. | Each line priced from the price list (linear look-ups); the subtotal is a recursive sum. | O(n²) | O(n) | `backend/m07-checkout-delivery.js` autoPrice() |

**4. After ordering (the customer)**

| # | Feature | Structure / algorithm | Time | Space | Code |
| --- | --- | --- | --- | --- | --- |
| 16 | **Cancel from Track order** — A request or an unpaid quotation can be cancelled by the customer; it is kept on record. | The order leaves the quote queue (the circular queue is rebuilt without it) and is marked voided. | O(n) | O(n) | `backend/m11-order-records.js` voidOrder() |
| 17 | **Follow your parcel** — Once a courier delivery is marked ready and the desk adds tracking, Track order shows the courier, the parcel number and a safe link. | Constant checks on the order, then the courier’s record by linear search. | O(n) | O(n) | `frontend/shop/track-order.js` trackCourierHtml() |
| 18 | **Failed look-ups are logged** — A Track order search that matches nothing is written to the security log (the tracking number only). | Appended at the end of the log array. | O(n) | O(1) | `backend/m13-security-logs.js` logSecurity() |

**5. Signing in to the order desk**

| # | Feature | Structure / algorithm | Time | Space | Code |
| --- | --- | --- | --- | --- | --- |
| 19 | **Desk accounts (credentials array)** — Each person has their own account; the credentials are an array in id order. | A hash table maps the email to the account id; binary search finds the id in the array. | O(1) average + O(log n) | O(n) | `backend/m12-order-desk.js` accountByEmail() |
| 20 | **Salted password hashes** — No password is stored: only FNV-1a over the account’s own salt and the password, 200 rounds. | Hashing, repeated a fixed number of rounds (n = characters). | O(n) (PASSWORD_ROUNDS is fixed) | O(n) | `backend/m12-order-desk.js` passwordHash() |
| 21 | **Pause after five wrong passwords** — Five wrong passwords in a row pause that email for 30 seconds; other people can still sign in. | Hash table: the email typed → its count, streak and pause. | O(1) average + O(n) for the text | O(1) | `backend/m13-security-logs.js` noteFailedSignIn() |
| 22 | **At most six codes an hour** — Sign-in and reset codes to one address are limited, and starting again does not reset the count. | Hash table: email → codes sent in the current hour (a fixed-window counter). | O(1) average + O(n) | O(1) | `backend/m13-security-logs.js` canSendCode() |
| 23 | **Forgot password** — An emailed six-digit code, then a new password; the screen answers the same for any email. | The code is compared by its hash; the password rules are checked character by character. | O(n) | O(n) | `backend/m13-security-logs.js` completePasswordReset() |
| 24 | **Tabs by role** — Owners see every tab; staff see orders, production and products, but not the Logs or other accounts. | Filter the tab list by the signed-in role. | O(n) | O(n) | `frontend/desk/desk.js` deskTabs() |

**6. Working at the desk (tab by tab)**

| # | Feature | Structure / algorithm | Time | Space | Code |
| --- | --- | --- | --- | --- | --- |
| 25 | **Find an order** — Type SU-215 in the desk’s search box to open that order. | Binary search on the order number (the orders array is always sorted). | O(log n) + O(n) for the text | O(n) | `backend/orders.js` orderByRef() |
| 26 | **Edit an order, with a revision log** — Items, specs, fees, schedule, contact and address can be changed; each change is logged as "field: old → new". | Old and new are compared line by line and field by field. | O(n²) | O(n) | `backend/m12-order-editing.js` editOrder() |
| 27 | **Courier tracking** — The desk adds the courier’s parcel number and/or link; the customer is emailed. | The number and the link are checked character by character (https only, the courier’s own site). | O(n) | O(n) | `backend/m10-production-tracking.js` setCourierTracking() |
| 28 | **Edit products** — Names, descriptions, processing time, materials, images, options and prices. | Every field validated; the price list checked against the counts each arrangement offers. | O(n²) | O(n) | `backend/m01-catalogue-best-sellers.js` updateProduct() |
| 29 | **Disable or enable a product** — Products are disabled, never deleted, so their history stays. | Linear search for the product, then a flag. | O(n) | O(1) | `backend/m01-catalogue-best-sellers.js` setProductActive() |
| 30 | **Send failed emails again** — One button in the Outbox queues every failed email again (never a sign-in or reset code). | One pass over the outbox, enqueueing each failed email in the circular mail queue. | O(n²) | O(n) | `backend/m09-payment-receipts-email.js` retryFailedMail() |
| 31 | **Who did what (audit log)** — Every order step, product change, sign-in step and account change is one log entry with who did it. | Append-only array: added at the end, so it is always in time order. | O(n) for the actor's text | O(1) | `backend/m13-security-logs.js` logEvent() |
| 32 | **Logs tab: newest first, filter, search** — Everything / Security / Orders & products, and a search box. | Read the log from the back (no sort), keep one kind, then linear search with naive string matching. | O(n²) (naive string matching on every entry) | O(n) | `backend/m13-security-logs.js` logEntries() |
| 33 | **Last 24 hours** — Wrong passwords, pauses, wrong codes, password changes and failed look-ups in the last day. | Walk back from the newest entry and stop at the first one older than a day. | O(n) | O(1) | `backend/m13-security-logs.js` recentSecurityCounts() |
| 34 | **Wrong passwords by email** — Which emails had wrong passwords, most first. | The hash table’s rows, then insertion sort by count. | O(n²) | O(n) | `backend/m13-security-logs.js` failedSignInRows() |
| 35 | **Download the logs as CSV** — What is shown, as a spreadsheet file; typed text can never run as a formula. | One pass over the entries, each field quoted and checked. | O(n) | O(n) | `backend/m13-security-logs.js` logCsv() |
| 36 | **Add an account** — An owner adds a person with a temporary password; emails and names must be unique. | Append to the credentials array (the next id keeps it sorted) and index the email in the hash table. | O(n) | O(n) | `backend/m12-order-desk.js` addStaffAccount() |
| 37 | **Disable or enable an account** — Nobody can disable themselves, and the last active owner stays. | Binary search for the account, then a count of the active owners. | O(n) | O(1) | `backend/m12-order-desk.js` setAccountActive() |
| 38 | **Change your own password** — The current password first; five wrong ones sign the person out. | Salted hash compare, then the password rules character by character. | O(n) | O(n) | `backend/m12-order-desk.js` changeOwnPassword() |

**7. Running by itself**

| # | Feature | Structure / algorithm | Time | Space | Code |
| --- | --- | --- | --- | --- | --- |
| 39 | **Unpaid quotations expire** — Every minute, quotations unpaid for three days are voided by "System" and the customer is emailed. | Filter the quoted orders by age, then void each one. | O(n²) | O(n) | `backend/m11-order-records.js` expireQuotes() |
| 40 | **Idle sign-out** — The desk signs itself out after 15 minutes without a tap or a key. | Compare the time of the last activity with the clock, every minute. | O(n) | O(1) | `frontend/desk/desk.js` checkDeskIdle() |
| 41 | **Hash tables that grow** — The sign-in tables are keyed by whatever people type, so they double their buckets once they hold more than two keys per bucket. | Rehash every key into twice the buckets; rare, so adding stays O(1) amortised. | O(n) | O(n) | `dsa/hash-table.js` hashGrow() |

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
  the note says "O(n²) pinakamarami" ("at most").
- The notes in the code are in Tagalog like the rest of the comments
  ("O(n) sa text" means O(n) in the length of the text). The tables in this
  README and in the reviewer give the same notes in English.

Every function in `js/` carries its own `Time O(…) · Space O(…)` note.
`tests/rubric.js` fails if one is missing, if any other notation appears
(no O(n log n), O(k), O(i·s) …), or if the `Date` built-in is used for
anything but reading the clock — all date maths is hand-written day-number
arithmetic (`dayNumber`, `dateOfDayNumber` in `js/dsa/dates.js`).

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

### Sample photos

The Sweets & Snacks Bouquet and the Beer-in-Can Cake had no photograph of the
shop's own. They now show **openly licensed photographs of similar gifts**
found online, until the shop photographs its own. Each one:

- has a "Sample photo" badge on its card;
- is credited on the product sheet (title, author, licence, link to the
  original), with a note that it is not the shop's own work.

| File | Product | Credit |
| --- | --- | --- |
| `sweets-1.jpg` | Sweets & Snacks Bouquet | "Chocolate Bouquet", இந்து தங்கராஜ், Wikimedia Commons, CC BY-SA 4.0 |
| `sweets-2.jpg` | Sweets & Snacks Bouquet | "Candy bouquet from my family", TwisterMc, Flickr, CC BY-SA 2.0 |
| `beer-cake-1.jpg` | Beer-in-Can Cake | "Max's Tower of Beer Cans", Smash the Iron Cage, Wikimedia Commons, CC BY-SA 4.0 (cropped) |

No openly licensed photograph of an actual beer-in-can gift cake could be
found. The one used shows cans stacked in round tiers, which is how the cake
is built. Replace it with a photo of the shop's own cake from the Products tab.
The credits are kept in `PHOTO_CREDITS` (`js/data/catalog.js`) and in
`assets/products/CREDITS.md`. The files' camera and location metadata was
removed.

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

**Dates and times are estimates.** Bad weather (heavy rain, typhoons,
flooding), traffic, road closures or courier delays can move a delivery; bad
weather or a busy week can delay a pickup. This is said wherever a date or
time is given:

- at checkout, under the date and on the review step;
- on the order confirmation and on Track order;
- on the receipt;
- in the request, confirmation, "on its way" and tracking emails.

The wording is in `SCHEDULE_NOTE_DELIVERY` and `SCHEDULE_NOTE_PICKUP` in
`js/data/delivery.js`.

**Courier tracking.** Once a courier has the parcel, the desk attaches its
tracking number, its tracking link, or both, with **Add tracking** on any paid
delivery order. The courier can be Flash Express, Lalamove or another courier.

- The number is letters, digits and hyphens; spaces are dropped.
- A link must be a plain `https://` address on a named site. Anything else is
  refused: `javascript:` and other schemes, spaces, quotes, or a `user@` part
  that could disguise the real site.

The customer sees a **Follow your parcel** card on Track order and gets an
email. The link opens the courier's tracking page; with only a number, it
opens the courier's official website (no tracking address is made up). The
tracking also shows on the desk's order card and in the "on its way" email.
It can be changed or removed, and every change is in the order's history and
the audit log.

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
  Failed ones can be sent again. Sign-in and reset codes are listed, but their
  content is hidden, and they are never sent twice. Staff see only the
  customers' emails, never those about desk accounts.
- **Accounts** (owners) or **My account** (staff): change your own
  password. Owners also see every account with its role, status and last
  sign-in, and can add or disable accounts.
- **Logs** (owners only): the security log and the audit log, newest first.
  - **Security:** every sign-in attempt (right, wrong, locked out), every
    sign-in and reset code (sent, accepted, wrong, expired), password
    changes, accounts added, disabled or enabled, sign-outs, and failed
    customer look-ups on Track order. Only the
    tracking number typed is kept, never the contact.
  - **Audit:** everything done to an order or a product and by whom
    (Customer, the signed-in person's name, or System), with the order's
    tracking number. This
    covers requests, automatic pricing, quotations, payments, ready, undo,
    edits, voids, tracking, product edits, enabling and disabling, and failed
    emails.
  - **Tools:** a 24-hour summary; filters for Everything / Security / Orders &
    products; a search box; a table of wrong passwords by the email typed;
    and a CSV download of what is shown. The CSV is safe to open in a
    spreadsheet: a typed "email" cannot run as a formula.
  - The logs live in memory like everything else, so a reload starts them
    again. Download them first if you need them.
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

The security and audit logs (`js/backend/m13-security-logs.js`) are one **append-only array**:
entries are only ever added at the end, in the order things happen, so the
log is already in time order.

- **Newest first** is a read from the back: O(n), no sort.
- **The 24-hour summary** walks back from the newest entry and stops at the
  first one older than a day.
- **Search** is a linear search with naive string matching, O(n²).
- **Appending** is O(1) in the log's length; only the actor's text, at most
  80 characters, is copied.
- **Wrong passwords per email**, and **codes sent per address**, are counted
  in hash tables: O(1) average per attempt. Their keys are whatever people
  type, so a hash table doubles its buckets once it holds more than two keys
  per bucket (O(1) amortised). The wrong-password rows are listed most first
  with insertion sort.

`tests/rubric.js` checks all of this in every script, tests included. It
blanks out comments and strings first, so a comment that names a built-in is
not counted as a call.

The replacements are written once, in `js/dsa/` (`arrays.js`, `strings.js`, `numbers.js` and `dates.js`):

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
  products/              39 photographs: 36 of the shop's work, 3 credited samples
  colors/                146 colour previews (flower-arrangement-colour.jpg)
css/
  tokens.css · base.css · components.css · pages.css   design system
  shop.css               customiser, request, tracking, receipts
  desk.css               the order desk
js/                      loaded in this order (index.html lists every script)
  dsa/                   the DSA guide: our own built-ins, every data structure and algorithm
    arrays.js · strings.js · numbers.js · dates.js   replacements for the banned built-ins; dates without Date maths
    hashing.js           FNV-1a
    linked-list.js · circular-queue.js · min-heap.js · stack.js · n-ary-tree.js · hash-table.js
    sorting.js · searching.js · recursion.js · greedy.js
  data/                  fixed data, edited by hand
    catalog.js           colours, arrangements, categories, products, add-ons, sample-photo credits
    delivery.js          delivery areas, couriers, time slots, schedule notes
    shop-rules.js        payments, rush fee, bills, shop info, quotation expiry
    desk-security.js     the desk accounts' seed (hashes only) and every sign-in limit
    privacy.js           the Privacy Notice and the order terms
    email-config.js      the three EmailJS IDs and the owner's email (edit this)
    demo-history.js      six weeks of orders, played through the real modules at start-up (loaded after backend/)
  backend/               the shop's logic, one file per module
    state.js             every array and structure the shop keeps (the "database")
    orders.js            what every order has: status, history, totals, look-up by number
    m01-catalogue-best-sellers.js    products, "Starts at", best sellers, product editing
    m02-category-navigation.js       the category tree filter
    m03-search-sort.js               the search box and the sort menu
    m04-flower-customiser.js         price list, the 160 photographs, add-ons, flower items
    m05-gift-customiser.js           quote products and the picture bouquet
    m06-cart.js                      the cart (linked list), including editing a line
    m07-checkout-delivery.js         delivery fees, dates and slots, the checkout check, placing an order
    m08-quotation-desk.js            the quote queue and the quotation
    m09-payment-receipts-email.js    GCash payments, receipts, every email and sending them
    m10-production-tracking.js       rush heap, standard queue, Track order look-up, courier tracking
    m11-order-records.js             undo, completed by date, voids, quotation expiry
    m12-order-desk.js                sign-in, desk accounts, the Overview's figures
    m12-order-editing.js             editing an order at the desk
    m13-security-logs.js             the security and audit log, sign-in limits, password reset
  frontend/              the screens
    ui/                  dom.js · motion.js · toasts.js · sheets.js · parts.js · receipt.js
    shop/                catalog.js · product.js · cart.js · track-order.js · privacy.js
    desk/                sign-in.js · password-reset.js · desk.js · overview.js · outbox.js · logs.js
                         account.js · order-sheet.js · products.js
  app.js                 start-up and routing
tests/                   Node checks — see tests/README.md
docs/reviewer/           the defense reviewer (PDF, and index.html)
tools/reviewer/          builds the reviewer from the real code (see below);
                         content.js plus modules-a.js and modules-b.js hold its text
_backup-original/        earlier versions, kept for reference
```

Scripts are ordinary `<script src>` tags in dependency order, not ES modules,
so the site works when opened straight from the filesystem. The tests read
that order from `index.html`, and the rubric fails if a script in `js/` is
not loaded.

**Comments.** The comments in the code are short and in Tagalog. Every
function has one or two lines on what it does, then its `Time` and `Space`
on the line just above it, for example:

```js
// Account gamit yung email: hash table muna, tapos binary search.
// Time O(1) average + O(log n) · Space O(n)
function accountByEmail(email) {
```

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
  sign-in email is read from `js/data/email-config.js`), and the contents;
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
- appendices: a complexity summary of all thirteen modules and how complexity
  is counted, general panel questions, a glossary and a file map, and every
  other feature of the site in the order of the flow (Appendix D).

The 41 other features are listed in `tools/reviewer/features.js`. Each entry
names the function that does the work, and the build copies that function's
Time and Space from the code.

To show who presents which part, put each member's name in `member` in the
`PARTS` list of `tools/reviewer/content.js`, then rebuild.

Only the explanations are written by hand (`tools/reviewer/content.js`,
`modules-a.js`, `modules-b.js` and `features.js`). The
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
