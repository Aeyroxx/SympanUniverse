/* =========================================================================
   REVIEWER CONTENT · EVERY OTHER FEATURE — what the site does besides the
   twelve defense modules, in the order a visit flows: the site opening,
   browsing, the cart and checkout, after ordering, signing in to the desk,
   working at the desk (tab by tab), and what runs by itself.

   Each feature names the function that does its main work ("file", "fn").
   build.js reads that function's own Time / Space note from the code, so
   the complexities printed in the reviewer are always the code's, and the
   build fails if a function is renamed or removed. Only the words here are
   written by hand.
   ========================================================================= */

module.exports = [
{
    stage: 'Opening the site',
    items: [
        { name: 'Demo history replay', file: 'js/data/demo-history.js', fn: 'seedEvents',
          what: 'At start-up six weeks of orders are played through the real order functions, so receipts, queues and best sellers are genuine.',
          how: 'Every request, quote, payment, completion and void becomes an event; insertion sort puts them in time order, then each is replayed.' },
        { name: 'Calendar maths without Date', file: 'js/dsa/dates.js', fn: 'addDays',
          what: 'Lead times, weekdays, month lengths and leap years for every date on the site.',
          how: 'A date becomes a day number; adding days is adding numbers, then converting back. Date only reads the clock.' },
        { name: 'Privacy banner and Privacy Notice', file: 'js/frontend/shop/privacy.js', fn: 'renderPrivacy',
          what: 'A translucent banner cites the Data Privacy Act; one sheet shows the Privacy Notice and the order terms.',
          how: 'The notice is an array of sections; one pass over it writes the sheet.' },
        { name: 'Sheets and swipes that follow the finger', file: 'js/frontend/ui/motion.js', fn: 'motionTick',
          what: 'Every sheet, the cart and the photo gallery move on springs that can be grabbed and reversed mid-motion.',
          how: 'Each animation frame steps every moving spring once (n = springs in motion).' },
        { name: 'Flick projection and rubber-band edges', file: 'js/frontend/ui/motion.js', fn: 'projectMomentum',
          what: 'A flick decides where a sheet lands; dragging past an edge resists instead of stopping hard.',
          how: 'A closed formula on the release speed (exponential deceleration); a second one for the edge resistance.' }
    ]
},
{
    stage: 'Browsing the shop',
    items: [
        { name: '"Starts at" price', file: 'js/backend/m01-catalogue-best-sellers.js', fn: 'lowestOffer',
          what: 'Each flower card shows its lowest price on the price list.',
          how: 'One pass over the price rows, keeping the smallest (linear scan for the minimum).' },
        { name: 'Sample photos with credits', file: 'js/backend/m01-catalogue-best-sellers.js', fn: 'photoCredit',
          what: 'Products the shop has not photographed show an openly licensed sample photo, badged and credited.',
          how: 'Linear search of the photo credits by file name.' },
        { name: 'Peso amounts', file: 'js/dsa/numbers.js', fn: 'peso',
          what: 'Every price is written "₱1,234.50".',
          how: 'The digits are grouped in threes by hand (n = digits), with no toLocaleString.' }
    ]
},
{
    stage: 'Cart and checkout',
    items: [
        { name: 'Edit a cart line', file: 'js/backend/m06-cart.js', fn: 'basketReplace',
          what: 'Each line in the cart has an Edit button: the customiser opens with that line’s choices, and "Save changes" puts the changed line back in its place.',
          how: 'The linked list keeps its nodes in an array, so the node is reached by its index and its value replaced; the cart’s order does not change.' },
        { name: 'Today’s prices in the cart', file: 'js/backend/m06-cart.js', fn: 'repricedCart',
          what: 'If the owner changes a price after something was added, checkout charges the current price.',
          how: 'Walk the cart’s linked list; look up each line’s product (linear search) and price it again.' },
        { name: 'Disabled products leave the cart', file: 'js/backend/m06-cart.js', fn: 'unavailableBasketItems',
          what: 'A product the owner disables can no longer be ordered, even if it is already in a cart.',
          how: 'Keep the cart lines whose product is missing or disabled (filter + linear search per line).' },
        { name: 'Earliest ready date and rush', file: 'js/backend/m07-checkout-delivery.js', fn: 'earliestDate',
          what: 'The first date offered is today plus the longest processing time in the cart, or tomorrow for a rush order (+₱50).',
          how: 'Linear scan for the largest lead time (each line’s product looked up), then day-number arithmetic.' },
        { name: 'Weather and schedule notes', file: 'js/backend/m07-checkout-delivery.js', fn: 'scheduleNote',
          what: 'Wherever a date or time is shown — checkout, confirmation, Track order, receipts, emails — a note says weather and traffic can move it.',
          how: 'A fixed note per mode (pickup or delivery).' },
        { name: 'Privacy and terms agreement', file: 'js/backend/m07-checkout-delivery.js', fn: 'validateRequest',
          what: 'Two separate unticked boxes at checkout; the order records which versions were agreed to, and when.',
          how: 'Two constant-time checks inside the form check (the whole check is shown); the agreement is stored on the order.' },
        { name: 'Price-list orders need no quotation', file: 'js/backend/m07-checkout-delivery.js', fn: 'autoPrice',
          what: 'A cart of price-list bouquets is priced at once and paid at checkout; only gifts wait for a quotation.',
          how: 'Each line priced from the price list (linear look-ups); the subtotal is a recursive sum.' }
    ]
},
{
    stage: 'After ordering (the customer)',
    items: [
        { name: 'Cancel from Track order', file: 'js/backend/m11-order-records.js', fn: 'voidOrder',
          what: 'A request or an unpaid quotation can be cancelled by the customer; it is kept on record.',
          how: 'The order leaves the quote queue (the circular queue is rebuilt without it) and is marked voided.' },
        { name: 'Follow your parcel', file: 'js/frontend/shop/track-order.js', fn: 'trackCourierHtml',
          what: 'Once a courier delivery is marked ready and the desk adds tracking, Track order shows the courier, the parcel number and a safe link.',
          how: 'Constant checks on the order, then the courier’s record by linear search.' },
        { name: 'Failed look-ups are logged', file: 'js/backend/m13-security-logs.js', fn: 'logSecurity',
          what: 'A Track order search that matches nothing is written to the security log (the tracking number only).',
          how: 'Appended at the end of the log array.' }
    ]
},
{
    stage: 'Signing in to the order desk',
    items: [
        { name: 'Desk accounts (credentials array)', file: 'js/backend/m12-order-desk.js', fn: 'accountByEmail',
          what: 'Each person has their own account; the credentials are an array in id order.',
          how: 'A hash table maps the email to the account id; binary search finds the id in the array.' },
        { name: 'Salted password hashes', file: 'js/backend/m12-order-desk.js', fn: 'passwordHash',
          what: 'No password is stored: only FNV-1a over the account’s own salt and the password, 200 rounds.',
          how: 'Hashing, repeated a fixed number of rounds (n = characters).' },
        { name: 'Pause after five wrong passwords', file: 'js/backend/m13-security-logs.js', fn: 'noteFailedSignIn',
          what: 'Five wrong passwords in a row pause that email for 30 seconds; other people can still sign in.',
          how: 'Hash table: the email typed → its count, streak and pause.' },
        { name: 'At most six codes an hour', file: 'js/backend/m13-security-logs.js', fn: 'canSendCode',
          what: 'Sign-in and reset codes to one address are limited, and starting again does not reset the count.',
          how: 'Hash table: email → codes sent in the current hour (a fixed-window counter).' },
        { name: 'Forgot password', file: 'js/backend/m13-security-logs.js', fn: 'completePasswordReset',
          what: 'An emailed six-digit code, then a new password; the screen answers the same for any email.',
          how: 'The code is compared by its hash; the password rules are checked character by character.' },
        { name: 'Tabs by role', file: 'js/frontend/desk/desk.js', fn: 'deskTabs',
          what: 'Owners see every tab; staff see orders, production and products, but not the Logs or other accounts.',
          how: 'Filter the tab list by the signed-in role.' }
    ]
},
{
    stage: 'Working at the desk (tab by tab)',
    items: [
        { name: 'Find an order', file: 'js/backend/orders.js', fn: 'orderByRef',
          what: 'Type SU-215 in the desk’s search box to open that order.',
          how: 'Binary search on the order number (the orders array is always sorted).' },
        { name: 'Edit an order, with a revision log', file: 'js/backend/m12-order-editing.js', fn: 'editOrder',
          what: 'Items, specs, fees, schedule, contact and address can be changed; each change is logged as "field: old → new".',
          how: 'Old and new are compared line by line and field by field.' },
        { name: 'Courier tracking', file: 'js/backend/m10-production-tracking.js', fn: 'setCourierTracking',
          what: 'The desk adds the courier’s parcel number and/or link; the customer is emailed.',
          how: 'The number and the link are checked character by character (https only, the courier’s own site).' },
        { name: 'Edit products', file: 'js/backend/m01-catalogue-best-sellers.js', fn: 'updateProduct',
          what: 'Names, descriptions, processing time, materials, images, options and prices.',
          how: 'Every field validated; the price list checked against the counts each arrangement offers.' },
        { name: 'Disable or enable a product', file: 'js/backend/m01-catalogue-best-sellers.js', fn: 'setProductActive',
          what: 'Products are disabled, never deleted, so their history stays.',
          how: 'Linear search for the product, then a flag.' },
        { name: 'Send failed emails again', file: 'js/backend/m09-payment-receipts-email.js', fn: 'retryFailedMail',
          what: 'One button in the Outbox queues every failed email again (never a sign-in or reset code).',
          how: 'One pass over the outbox, enqueueing each failed email in the circular mail queue.' },
        { name: 'Who did what (audit log)', file: 'js/backend/m13-security-logs.js', fn: 'logEvent',
          what: 'Every order step, product change, sign-in step and account change is one log entry with who did it.',
          how: 'Append-only array: added at the end, so it is always in time order.' },
        { name: 'Logs tab: newest first, filter, search', file: 'js/backend/m13-security-logs.js', fn: 'logEntries',
          what: 'Everything / Security / Orders & products, and a search box.',
          how: 'Read the log from the back (no sort), keep one kind, then linear search with naive string matching.' },
        { name: 'Last 24 hours', file: 'js/backend/m13-security-logs.js', fn: 'recentSecurityCounts',
          what: 'Wrong passwords, pauses, wrong codes, password changes and failed look-ups in the last day.',
          how: 'Walk back from the newest entry and stop at the first one older than a day.' },
        { name: 'Wrong passwords by email', file: 'js/backend/m13-security-logs.js', fn: 'failedSignInRows',
          what: 'Which emails had wrong passwords, most first.',
          how: 'The hash table’s rows, then insertion sort by count.' },
        { name: 'Download the logs as CSV', file: 'js/backend/m13-security-logs.js', fn: 'logCsv',
          what: 'What is shown, as a spreadsheet file; typed text can never run as a formula.',
          how: 'One pass over the entries, each field quoted and checked.' },
        { name: 'Add an account', file: 'js/backend/m12-order-desk.js', fn: 'addStaffAccount',
          what: 'An owner adds a person with a temporary password; emails and names must be unique.',
          how: 'Append to the credentials array (the next id keeps it sorted) and index the email in the hash table.' },
        { name: 'Disable or enable an account', file: 'js/backend/m12-order-desk.js', fn: 'setAccountActive',
          what: 'Nobody can disable themselves, and the last active owner stays.',
          how: 'Binary search for the account, then a count of the active owners.' },
        { name: 'Change your own password', file: 'js/backend/m12-order-desk.js', fn: 'changeOwnPassword',
          what: 'The current password first; five wrong ones sign the person out.',
          how: 'Salted hash compare, then the password rules character by character.' }
    ]
},
{
    stage: 'Running by itself',
    items: [
        { name: 'Unpaid quotations expire', file: 'js/backend/m11-order-records.js', fn: 'expireQuotes',
          what: 'Every minute, quotations unpaid for three days are voided by "System" and the customer is emailed.',
          how: 'Filter the quoted orders by age, then void each one.' },
        { name: 'Idle sign-out', file: 'js/frontend/desk/desk.js', fn: 'checkDeskIdle',
          what: 'The desk signs itself out after 15 minutes without a tap or a key.',
          how: 'Compare the time of the last activity with the clock, every minute.' },
        { name: 'Hash tables that grow', file: 'js/dsa/hash-table.js', fn: 'hashGrow',
          what: 'The sign-in tables are keyed by whatever people type, so they double their buckets once they hold more than two keys per bucket.',
          how: 'Rehash every key into twice the buckets; rare, so adding stays O(1) amortised.' }
    ]
}
];
