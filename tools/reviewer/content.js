/* =========================================================================
   REVIEWER CONTENT — what each part of the system is for, in words.

   Everything here is prose written by hand. Line numbers, code, complexity
   notes, traces and screenshots are NOT written here: build.js reads them
   from the real files and the running code, so they cannot drift. A
   walkthrough step points at a line by quoting a short piece of it ("at");
   the build finds that line and fails if it has gone.

   "{OWNER}" in any text is replaced by the owner's sign-in email from
   js/email-config.js when the reviewer is built.
   ========================================================================= */

/* =========================================================================
   THE FOUR PARTS — each with a one-page summary before its modules.
   Put the name of the group member who presents a part in "member"; it
   then appears on the cover, the part's summary page and the file map.
   ========================================================================= */
var PARTS = [
{
    no: 1, member: '', title: 'The shop window', tint: 'rose', modules: ['m01', 'm02', 'm03'],
    pitch: 'These modules are what a customer sees first. Catalogue & Best Sellers ranks the products by the pieces really sold — one pass over the paid orders with a hash table, then a selection sort. Category Navigation stores the shop’s three columns as an n-ary tree, so "everything under Flower Bouquets" is a depth-first walk with a stack. Search & Sort finds words anywhere in a product with a linear search and naive string matching, and orders the results with a stable insertion sort.',
    structures: [
        ['Count pieces sold', 'Hash table (product id → tally row) over the order lines', 'O(n²) — every line of every order', 'O(n)'],
        ['Rank the best sellers', 'Selection sort (stable version)', 'O(n²) always', 'O(n) copy'],
        ['Branch → its lines', 'N-ary tree, depth-first search with a stack', 'O(n)', 'O(n)'],
        ['Search box', 'Linear search + naive string matching', 'O(n²)', 'O(n)'],
        ['Sort menu', 'Insertion sort (stable)', 'O(n) best, O(n²) worst', 'O(n) copy']
    ],
    questions: [
        ['Why selection sort for the best sellers?', 'For ten products any of the sorts from class is instant. Selection sort always makes n(n−1)/2 = 45 comparisons — a fixed cost that is easy to show — and each pass answers the business question "which product is the biggest seller left?". Ours shifts instead of swapping, so it is stable: equal sellers keep their catalogue order.'],
        ['Why a hash table to count sales?', 'Without it, the count went through every order once for each product. With a row per product found by hashGet in O(1) on average, one pass over the orders and their lines does it.'],
        ['Why a tree for the categories instead of a list?', 'The categories are a hierarchy. "All lines under this branch" becomes "all leaves under this node", with no list of which line belongs where written into the page. Adding a line is adding one leaf.'],
        ['How does the tree search work without recursion?', 'treeFind and treeLeaves use our own stack: push the root, pop a node, push its children — depth-first, each node visited once, O(n).'],
        ['Why not binary search for the search box?', 'Binary search needs an exact key in a sorted array. The search box asks "does this word appear anywhere in the name, materials or colours?", which only a scan of each record can answer.'],
        ['Why is the text search O(n²)?', 'textHas tries the word at every starting position of the text and compares letter by letter — a loop inside a loop. Run over a whole table, that is the O(n²) naive string matching from class.']
    ]
},
{
    no: 2, member: '', title: 'Choosing a gift', tint: 'plum', modules: ['m04', 'm05', 'm06'],
    pitch: 'These modules turn a product into something in the cart. The Flower Customiser finds the right photograph among 160 combinations with a hash table keyed "flower|arrangement|colour", and adds up the add-ons with a recursive sum. The Gift Customiser suggests the fewest bills for a money bouquet with a greedy algorithm. The Cart is a singly linked list: adding is O(1) at the tail, and removing re-points one link.',
    structures: [
        ['Find the photograph', 'Hash table with chaining (FNV-1a)', 'O(1) average', 'O(n)'],
        ['Add-on total', 'Recursion', 'O(n)', 'O(n) call stack'],
        ['Fewest bills', 'Greedy change-making', 'O(n)', 'O(n)'],
        ['Add to cart', 'Linked list append (tail pointer)', 'O(1)', 'O(1)'],
        ['Remove a line', 'Linked list remove (walk to the node before it)', 'O(n)', 'O(1)'],
        ['Show the cart', 'Linked list walk from the head', 'O(n)', 'O(n)']
    ],
    questions: [
        ['What happens when two keys land in the same bucket?', 'That is a collision. Each bucket holds a chain (a short list); the second key is added to the chain and a look-up compares keys along it. With 160 keys in 199 buckets the chains are about one long.'],
        ['Why 199 buckets?', 'A prime a little above the 160 keys: the load factor stays near 0.8 and the remainder spreads the FNV-1a hashes evenly over the buckets.'],
        ['Is the greedy answer always the fewest bills?', 'For the peso, yes. Its notes (1000, 500, 200, 100, 50, 20) form a canonical system, where taking the largest note that fits is optimal. For odd currencies greedy can fail and dynamic programming would be needed.'],
        ['Why a linked list for the cart instead of an array?', 'The cart adds at the end and removes from anywhere. Removing a node re-points one link; an array would shift every later item. The tail pointer makes adding O(1).'],
        ['Where is the recursion, and what stops it?', 'sumRecursive adds the first item to the sum of the rest. The base case is the empty rest, which adds 0. The add-on list is at most four long, so the call stack stays tiny.']
    ]
},
{
    no: 3, member: '', title: 'Checkout and payment', tint: 'green', modules: ['m07', 'm08', 'm09'],
    pitch: 'These modules take the customer from cart to paid order. Checkout & Delivery finds the delivery fee for whatever city is typed with a hash table of 45 names and aliases, and checks every field by scanning its characters — no regular expressions. The Quotation Desk answers quote requests first come, first served with a circular queue, and pre-fills each quotation from the owner’s past quotes, put newest first with insertion sort. Payment, Receipts & Email takes GCash payments, snapshots each one into a receipt, and sends every email in order through a second circular queue.',
    structures: [
        ['City → delivery area', 'Hash table (normalised names and aliases)', 'O(1) average', 'O(n)'],
        ['Check the checkout form', 'Character scans; each cart line’s product looked up', 'O(n²)', 'O(n)'],
        ['Quote requests in order', 'Circular queue (FIFO)', 'O(1) enqueue / dequeue', 'O(n)'],
        ['Pre-fill a quotation', 'Insertion sort of past quotes + linear search', 'O(n²)', 'O(n)'],
        ['Reference used before?', 'Linear search of the receipts', 'O(n)', 'O(1)'],
        ['Send emails in order', 'Circular queue (FIFO)', 'O(1) per email', 'O(n)']
    ],
    questions: [
        ['Why does a circular queue never shift its items?', 'The head and the tail move forward and wrap around with "% capacity". Dequeuing only moves the head; its slot is reused later. A plain array that removes from the front would move every remaining item: O(n).'],
        ['What happens when the queue is full?', 'cqGrow doubles the buffer and copies the items in queue order, so the head lands at slot 0. That copy is O(n) but rare, so enqueue stays O(1) amortised.'],
        ['How is "  QUEZON   city " understood?', 'normaliseKey lower-cases, trims and collapses runs of spaces, dots and commas, character by character. Every city and alias went into the table the same way, so any spelling hashes to the same bucket.'],
        ['How is a GCash reference stopped from paying twice?', 'gcashProblem checks for 13 digits, then receiptWithRef searches the receipts for the same reference — a linear search, O(n).'],
        ['Why is a receipt a copy of the order?', 'A receipt records what was paid at that moment. If the order is edited later, the receipt must not change.'],
        ['Why send emails through a queue?', '"Order confirmed" must arrive before "ready for pickup", and only one request is sent at a time. The queue keeps that order, and a failed email can be queued again without being lost.'],
        ['How does the customer agree to the Privacy Notice?', 'At checkout, two separate boxes that start unticked: one for the Privacy Notice (under the Data Privacy Act of 2012) and one for the order terms. validateRequest refuses the order unless both are ticked, and the order keeps a record of the agreement — which version of the notice, and when — in order.consent and its history.']
    ]
},
{
    no: 4, member: '', title: 'Behind the counter', tint: 'amber', modules: ['m10', 'm11', 'm12', 'm13'],
    pitch: 'These modules are the owner’s side. Production & Tracking keeps rush orders in a min-heap by due date and regular orders in a circular queue by payment order, finds any order for a customer with a binary search on the order number, and attaches the courier’s tracking number or link to a delivery. Order Records keeps every completed and voided order, sorted by date with insertion sort, and undoes "Mark ready" with a stack. The Order Desk keeps every person’s credentials in an array, finds an account by email through a hash table, signs them in with a salted password hash and an emailed six-digit code, and its Overview puts every order and receipt into its day, month or year by reading the record’s own date. Security & Audit Logs records every sign-in attempt and who did what to each order in one append-only array, counts wrong passwords per email in a hash table, and lets a forgotten password be reset with an emailed code.',
    structures: [
        ['Rush lane', 'Min-heap keyed (due date, arrival)', 'O(log n) insert / extract', 'O(n)'],
        ['Standard lane', 'Circular queue (FIFO)', 'O(1)', 'O(n)'],
        ['Track an order', 'Binary search on the order number', 'O(log n)', 'O(1)'],
        ['Undo "Mark ready"', 'Stack (LIFO)', 'O(1) push / pop', 'O(n)'],
        ['Completed orders by date', 'Insertion sort + one grouping pass', 'O(n) nearly in order, O(n²) worst', 'O(n)'],
        ['Find an account at sign-in', 'Hash table email → id, then binary search on the credentials array', 'O(1) average + O(log n)', 'O(n)'],
        ['Check a password', 'Salted FNV-1a hash, a fixed number of rounds', 'O(n) in the password length', 'O(n)'],
        ['Overview by period', 'Bucketing by the record’s date', 'O(n²) — the lines of every order', 'O(n)'],
        ['Courier tracking link', 'Character-by-character check (https only)', 'O(n) in the link’s length', 'O(n)'],
        ['Security & audit log', 'Append-only array, read from the back', 'O(1) append (in the log’s length) · O(n) newest first', 'O(n)'],
        ['Codes per address per hour', 'Hash table (email → count this hour)', 'O(1) average per code', 'O(n)'],
        ['Wrong passwords per email', 'Hash table', 'O(1) average per attempt', 'O(n)']
    ],
    questions: [
        ['Why a heap for rush orders and not a sorted array?', 'Inserting into a sorted array shifts items: O(n). A heap inserts, and removes the earliest due date, in O(log n) by sifting along one path of the tree.'],
        ['How is a tie on the due date broken?', 'The key is (due date, arrival number). heapCompare compares dates first, then arrival, so equal dates are served in the order they were paid — the heap is stable.'],
        ['Why is the orders array always sorted?', 'Order numbers come from a counter that only goes up, and new orders are appended, so the array stays in number order without sorting — which is what makes binary search possible.'],
        ['What is the worst case of your binary search?', 'About log₂ n comparisons: 5 for the 22 demo orders, 10 for 1,000 orders. A linear search could need all n.'],
        ['How does undo put an order back exactly?', 'Each "Mark ready" pushes { order id, its place in line }. Undo pops the newest entry and puts the order back: into the heap with its original key, or into the queue at its old position.'],
        ['Is the two-step sign-in real security?', 'It keeps customers off the desk: each password is kept only as a salted hash, the code only as a hash, codes expire after five minutes and allow three tries, and five wrong passwords in a row pause that email for 30 seconds. Real security needs a server — anything in a browser can be read with developer tools.'],
        ['Why keep the credentials in an array and a hash table?', 'The array is the list of accounts in id order. Ids only grow, so a new account is appended and the array stays sorted — an account is found by id with binary search, O(log n). Signing in starts from an email, so a hash table email → id finds the account in O(1) on average instead of a linear search through every account.'],
        ['Why a salt, and why 200 rounds?', 'A salt is random text stored with each account and hashed together with its password, so two people with the same password get different hashes and a ready-made list of hashed passwords is useless. Repeating the hash 200 times makes every guess 200 times slower. A real system uses bcrypt or Argon2 on a server.'],
        ['Why is the log an append-only array?', 'Events only ever happen in time order and are never changed, so adding each one at the end keeps the array sorted by time for free: appending is O(1), "newest first" is a read from the back with no sort, and the 24-hour summary can stop at the first entry older than a day.'],
        ['Why does "Forgot password?" answer the same for any email?', 'So the page never tells a stranger which emails have desk accounts (account enumeration). A code is only made for the email of an active account; for any other the screen, the waits and the tries behave the same, but nothing is sent.'],
        ['Could a tracking link run code on the customer’s page?', 'No. trackingLinkProblem accepts only a plain https:// address on a named site — no javascript: or other schemes, no spaces, quotes or angle brackets, and no "user@" part. For Flash Express and Lalamove the site must be the courier’s own (flashexpress.ph, lalamove.com); for another courier it may not be an IP address or a punycode look-alike. The link is escaped when shown and opens in a new tab with rel="noopener noreferrer". Tracking is only added once a courier delivery is marked ready.'],
        ['Couldn’t someone flood the owner’s inbox with codes?', 'Each code path has its own limits (30 seconds between codes, three per sign-in or reset), and on top of that a hash table counts every code an address is sent in the hour — sign-in and reset together. Starting again does not reset it, so one address gets at most six codes an hour. A reload clears it like all data here, so the shop also sets a rate limit in EmailJS.'],
        ['What happens to a desk left open?', 'After 15 minutes without a tap or a key it signs itself out, and the sign-in form is emptied. Five wrong current passwords on the Account tab also sign the person out and pause the email, so someone at an unattended desk cannot guess the password there.']
    ]
}
];

/* =========================================================================
   THE WHOLE SYSTEM — overview, data, rules
   ========================================================================= */
var SYSTEM = {
    problem: 'Sýmpan Universe makes handcrafted ribbon bouquets and gift cakes in Lawa, Meycauayan, Bulacan. Without a system, every order is a chat thread: the owner prices each request by hand, keeps payments and pickup dates in notes, and answers "is my order ready?" one message at a time. The website handles the customer’s whole order — browsing, customising, checkout, payment, tracking — and the owner’s work behind it.',
    customerFlow: ['① Best sellers', '② Categories', '③ Search & sort', '④ Customise flowers / ⑤ gifts', '⑥ Cart', '⑦ Checkout'],
    priceFlow: ['Price-list cart', '⑨ Pay by GCash', '⑩ Production', '⑪ Ready → records'],
    quoteFlow: ['Quote cart', '⑧ Owner quotes it', '⑨ Customer pays', '⑩ Production', '⑪ Ready → records'],
    ownerFlow: '⑫ The owner and staff each sign in with their own account (password + emailed code); the owner watches the Overview by day, month or year, edits orders and products, and adds or disables staff accounts. ⑬ Every sign-in attempt and every change is in the security and audit logs; a forgotten password is reset with an emailed code. ⑩ Courier deliveries get the courier’s tracking number or link.',
    layers: [
        ['js/core.js, structures.js, algorithms.js', 'Our own array, text and date helpers; the linked list, circular queue, min-heap, stack, n-ary tree and hash table; the sorts, searches, recursion and greedy algorithm.'],
        ['js/data.js, store.js, orders.js, notify.js, editing.js, reports.js', 'The "database" (arrays) and the business rules: the catalogue, cart, checkout, quotations, payments, production, records, emails and reports.'],
        ['js/ui.js, motion.js, mail.js, receipt.js', 'Screens, sheets, animation, the email sender (EmailJS) and receipts.'],
        ['js/shop-*.js, admin-*.js, app.js', 'One script per screen: the shop, and the order desk at index.html#admin.']
    ],
    data: [
        ['orders', 'order number (201, 202 …)', 'numbers only grow → append, O(1); the array stays sorted for binary search', '1, 7–12'],
        ['products', 'product id (101 …)', 'the fixed catalogue, edited in place', '1–5, 12'],
        ['receipts, outbox', 'receipt / email number', 'append, O(1)', '9, 12'],
        ['basket', 'position', 'singly linked list, in the order added', '6'],
        ['quoteQueue, standardLane, mailQueue', 'order id / outbox position', 'circular queues, first in first out', '8, 9, 10'],
        ['rushLane', '(due date, arrival)', 'min-heap', '10'],
        ['completedStack', '{ id, position }', 'stack, last in first out', '11'],
        ['categoryTree', 'slug', 'n-ary tree stored in one array', '2'],
        ['referenceIndex, areaIndex', '"flower|arrangement|colour"; city name', 'hash tables with chaining', '4, 7'],
        ['auditLog', 'entry number (time order)', 'append-only array: entries are only added at the end, O(1)', '13 (written by every module)'],
        ['failedSignIns', 'the email typed', 'hash table with chaining', '13'],
        ['staffAccounts', 'account id (1, 2 …)', 'the credentials array: ids only grow → append, O(1); sorted for binary search', '12'],
        ['staffEmailIndex', 'the account’s email', 'hash table email → account id', '12']
    ],
    rules: [
        ['HTML, CSS, Bootstrap and JavaScript only; JS is the "backend"', 'No server, no framework, no database program. Bootstrap 5.3 gives the grid; everything else is our own code.'],
        ['Data cannot transfer between pages (arrays)', 'One page, index.html: the shop and the order desk (#admin) are shown and hidden, so the arrays survive every screen change. No localStorage, no cookies, no server. A reload starts again from the demo data.'],
        ['Procedural, not OOP', 'Only functions and plain records: no class, this, prototype or new (except new Date once, to read the clock). A queue is the record { items, head, tail, count, capacity } plus functions like cqEnqueue(queue, value).'],
        ['No built-in helpers: push, pop, shift, unshift, splice, slice, concat, sort, reverse, indexOf, includes, find, filter, map, forEach, reduce, some, every, join; split, replace, trim, toLowerCase, toUpperCase, padStart, substring; no regular expressions', 'All replaced by our own functions in js/core.js, js/structures.js and js/algorithms.js — listAdd, copyRange, keepWhere, firstWhere, cutText, strip, toLower, insertionSort, binarySearch … tests/rubric.js scans every script and fails on any of them.'],
        ['State the time and space complexity, using only O(1), O(log n), O(n) and O(n²)', 'Written above every function in js/. The rubric fails on a missing note or on any other notation — which is why there is no merge sort: it is O(n log n).'],
        ['Use Date only to read the clock', 'readClock() holds the only new Date. Adding days, weekdays, month lengths and leap years are our own day-number arithmetic (dayNumber, dateOfDayNumber in js/core.js).']
    ],
    builtins: 'Built-ins that are used are only for input and output: the page itself (the DOM), Date (to read the clock), Math, Number, String, charAt and charCodeAt, the length of an array or text, timers, crypto.getRandomValues (the six-digit codes and the password salts), and fetch with JSON.stringify to hand an email to EmailJS.'
};

/* How complexity is counted — shown on the primer page and in Appendix A. */
var COUNTING = [
    'Only the four notations from class: O(1), O(log n), O(n) and O(n²) — with "average", "amortised", "best" or "worst" where it matters, and sums such as O(log n) + O(n).',
    'n is the size of whatever the function goes through: records in a table (orders, lines, products, emails, receipts), items in a queue, or the characters of a text when the text itself is the job (validators, hashing, string search).',
    'A loop inside a loop is O(n²). Naive string matching over a table is O(n²).',
    'Work on one record’s own fields — escaping or formatting its text, copying it — and look-ups in the shop’s short fixed lists (20 colours, 2 arrangements, 4 add-ons, 4 time slots, 2 payment methods) count as constant work inside a loop over records: those lists are part of the program, not data that grows.',
    'An O(log n) step done once per item (a binary search per queued order) is written "O(n²) at most".'
];

/* =========================================================================
   APPENDICES
   ========================================================================= */
var GENERAL_QUESTIONS = [
    ['Why is the whole website one HTML page?', 'Our data lives in JavaScript arrays, and arrays exist only while the page is open — they cannot be carried to another HTML file. So the shop and the order desk are sections of one index.html, shown and hidden; the part after # in the address picks the view. The arrays stay alive while you move between screens.'],
    ['Where is the data saved? What happens when you refresh?', 'Only in memory (the arrays in js/store.js). There is no localStorage, cookie or server. Refreshing the page replays the demo history again — expected under the project rule, and it means every demonstration starts from the same state.'],
    ['Why didn’t you use push, sort, indexOf, filter and the other built-ins?', 'It was a project rule, and it shows we understand what they do. Each has our own version: listAdd (push), copyRange (slice), positionIn (indexOf), keepWhere (filter), firstWhere (find), renderEach (map + join), insertionSort (sort), cutText (split), strip (trim), toLower (toLowerCase) — and no regular expressions.'],
    ['What does "procedural, not OOP" mean in your code?', 'There are no classes, no this and no methods. Data is plain records (a queue is { items, head, tail, count, capacity }) and every operation is a separate function that receives the record: cqEnqueue(queue, value), stackPush(stack, value), hashPut(table, key, value).'],
    ['Why insertion and selection sort, and not merge sort or quick sort?', 'The course allows only O(1), O(log n), O(n) and O(n²); merge sort is O(n log n). Quick sort is not stable and its worst case is O(n²) anyway. Our lists are small and usually almost in order — orders, emails and receipts are appended as they happen — which is insertion sort’s best case, O(n). Selection sort ranks the ten best sellers with a fixed, easy-to-show cost.'],
    ['Aren’t O(n²) sorts too slow?', 'Not for our data: the lists hold tens to hundreds of records, and we read them in the order that leaves them nearly sorted. The Order Records trace shows it: 15 completed orders sorted newest first take 15 comparisons, not the worst case of 105.'],
    ['Why hash tables, when you already have binary search?', 'Binary search needs an array sorted by the key you search for. The photographs are looked up by "flower|arrangement|colour" and the delivery areas by any spelling of a city name — keys that are not stored in order. A hash table answers those in O(1) on average.'],
    ['How does undo work?', 'It is a stack. Each "Mark ready" pushes the order id and its place in the production line. Undo pops the newest entry — last in, first out — and puts the order back exactly there.'],
    ['How are emails sent without a server?', 'Every email is written into the outbox array and its position queued. Every 1.5 seconds the sender takes the front of the queue and posts it to EmailJS (a web service that sends email for a browser page). Demo customers (example.com) are never emailed. If EmailJS is not set up, the email is kept in the Outbox marked "not sent", and the sign-in code is shown on screen instead.'],
    ['How secure is it?', 'It is a class project that runs entirely in the browser, so we are honest about the limits. Each account’s password is kept only as a salted hash and the sign-in and reset codes only as FNV-1a hashes; codes expire and allow three tries; five wrong passwords in a row pause that email for 30 seconds; one address gets at most six codes an hour; an idle desk signs itself out after 15 minutes; staff cannot see the logs, other accounts or the accounts’ emails; a reset answers the same for any email; every attempt is in the security log; the order desk is linked from nowhere on the shop; and everything a customer types is escaped before it is shown. A real deployment needs a server, a proper password hash (bcrypt or Argon2) and HTTPS, because anything in a browser can be read with developer tools — and a reset password lasts only until the page is reloaded, like all data here.'],
    ['What about the customers’ personal data?', 'The shop asks only for what an order needs: name, email, mobile, and an address for a delivery. A Data Privacy Notice under the Data Privacy Act of 2012 (RA 10173) says who collects it, why, who else receives it (couriers, the email service), how long it is kept and the customer’s rights, including complaining to the National Privacy Commission. A banner points to it, checkout cannot finish until the customer ticks two separate boxes — the notice and the order terms — and the order records which versions were agreed to and when. The customer may withdraw consent by messaging the shop. The site sets no cookies and saves nothing on the device.'],
    ['Where do the photos of the sweets bouquet and the beer-in-can cake come from?', 'The shop had not photographed them yet, so they show openly licensed photographs of similar gifts found online (Wikimedia Commons and Flickr, CC BY-SA). Each is labelled "Sample photo" and credited with its author, licence and source, with a note that it is not the shop’s own work; the credits are also in assets/products/CREDITS.md.'],
    ['How do you prove the complexities?', 'Each function states its cost above its code, and tests/rubric.js fails if one is missing or uses another notation. The unit tests count insertion sort’s comparisons on sorted and reversed input (n − 1 and n(n − 1)/2). The traces in this reviewer were produced by running our actual functions on the demo data.'],
    ['Did you use the Date object?', 'Only to read the clock: readClock() reads the time and the time zone, and Date.now() gives timestamps. All date maths — adding days, the weekday, month lengths, leap years, the day a timestamp falls on — is our own day-number arithmetic in js/core.js.'],
    ['What would you improve with more time?', 'A real server and database so data survives a refresh; online payment through the payment provider instead of typed references; SMS updates; and a balanced tree or database index once the order list grows to many thousands.']
];

var GLOSSARY = [
    ['Array', 'Items in numbered slots (0, 1, 2 …); reading slot i is O(1). Our "tables".'],
    ['Key', 'The field a structure is ordered or looked up by (order number, product id, city name …).'],
    ['Linear search', 'Check items one by one until a match. O(n); works on unsorted data.'],
    ['Binary search', 'On a sorted array, compare with the middle and keep one half. O(log n).'],
    ['Naive string matching', 'Try the search word at every position of a text, letter by letter. O(n²) over a table.'],
    ['Insertion sort', 'Take each item and slide the larger ones before it one place right until its spot is found. O(n) when already in order, O(n²) worst. Stable.'],
    ['Selection sort', 'For each position, find the item that belongs there among the rest. Always n(n−1)/2 comparisons, O(n²).'],
    ['Stable sort', 'Equal items keep their original order.'],
    ['Linked list', 'Nodes that each point to the next. Adding at a known end is O(1); removing re-points one link.'],
    ['Stack (LIFO)', 'Last in, first out: push and pop at the top. Used for undo and the depth-first tree walks.'],
    ['Queue (FIFO)', 'First in, first out: enqueue at the rear, dequeue at the front. Used for quote requests, standard production and email.'],
    ['Circular buffer', 'A queue in a fixed array whose rear wraps round to the start, so nothing is shifted: O(1) enqueue and dequeue.'],
    ['Min-heap', 'A tree kept in an array where every parent comes before its children; the smallest key is always at index 0. Insert and extract are O(log n).'],
    ['N-ary tree', 'Each node can have any number of children. Our category tree: a root, 3 branches, 10 lines.'],
    ['Depth-first search', 'Visit a node, then go as deep as possible before backtracking — here with an explicit stack.'],
    ['Hash table', 'A hash function turns a key into a bucket number, so a look-up checks one short list. O(1) on average.'],
    ['FNV-1a', 'Our string hash: start at 2166136261; for each character XOR it in, then multiply by 16777619 (kept to 32 bits).'],
    ['Collision / chaining', 'Two keys in the same bucket; they are kept in a chain (a short list) inside that bucket.'],
    ['Load factor', 'Keys ÷ buckets (160 ÷ 199 ≈ 0.8 for the photographs).'],
    ['Recursion', 'A function that calls itself on a smaller problem, ending at a base case.'],
    ['Greedy algorithm', 'Take the best choice at each step (the largest note that fits) without looking back.'],
    ['Amortised', 'The average cost per operation over many operations — enqueue is O(1) amortised although a rare grow is O(n).'],
    ['Append-only log', 'A list that only ever grows at its end, in the order things happen — so it is in time order without sorting. Our security and audit log.'],
    ['Salt', 'Random text stored with an account and hashed together with its password, so equal passwords get different hashes.'],
    ['Role', 'What an account may do: an owner sees everything, including the logs and the accounts; staff handle orders, production and products.'],
    ['Consent', 'The customer’s recorded agreement to the Privacy Notice — which version and when — asked separately from the order terms.'],
    ['Account enumeration', 'Learning which accounts exist from how a page answers. The password reset answers the same for any email to prevent it.'],
    ['Big-O', 'How the work grows with the size of the data (worst case unless stated).']
];

var FILE_MAP = [
    ['1 · The shop window', 'store.js (salesTally, topSellers) · algorithms.js (selectionSortDesc, linearSearch, insertionSort) · structures.js (tree, stack) · core.js (textHas)', 'shop-catalog.js'],
    ['2 · Choosing a gift', 'structures.js (hash table, linked list) · store.js (buildReferenceIndex, makeFlowerItem, makeQuoteItem, basket) · algorithms.js (sumRecursive, breakIntoBills)', 'shop-product.js · shop-basket.js'],
    ['3 · Checkout and payment', 'store.js (lookupArea, deliveryQuote) · orders.js (validateRequest, quoteHistory, sendQuote, placeOrder, acceptQuote, issueReceipt) · notify.js · mail.js · data.js (PRIVACY_NOTICE, ORDER_TERMS)', 'shop-basket.js · shop-privacy.js · shop-track.js · admin-orders.js · receipt.js'],
    ['4 · Behind the counter', 'structures.js (heap, circular queue, stack, hash table) · production.js (productionLine, completeNext, undoCompletion, completedByDate, voidOrder) · tracking.js · algorithms.js (binarySearch) · reports.js · accounts.js · audit.js · admin-signin.js · admin-reset.js', 'admin-desk.js · admin-overview.js · admin-account.js · admin-logs.js · admin-orders.js · admin-products.js · shop-track.js']
];

/* =========================================================================
   THE MODULES
   ========================================================================= */
/* The modules, in order: modules-a.js holds 1–7, modules-b.js 8–13.
                                           Time O(n) · Space O(n) */
var MODULES = (function () {
    var all = [], parts = [require('./modules-a'), require('./modules-b')];
    for (var p = 0; p < parts.length; p++) for (var i = 0; i < parts[p].length; i++) all[all.length] = parts[p][i];
    return all;
}());

module.exports = {
    PARTS: PARTS, SYSTEM: SYSTEM, COUNTING: COUNTING, MODULES: MODULES,
    GENERAL_QUESTIONS: GENERAL_QUESTIONS, GLOSSARY: GLOSSARY, FILE_MAP: FILE_MAP
};
