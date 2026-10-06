/* =========================================================================
   REVIEWER CONTENT · MODULES 8–13 — the quotation desk, payment, and behind the counter, in words.
   Part of content.js (which explains the rules for this text); split in two
   so no file grows past 800 lines. A walkthrough step quotes a short piece
   of a line ("at"); build.js finds that line and fails if it has gone.
   ========================================================================= */

module.exports = [

/* ===================================================================== */
{
    id: 'm08', no: 8, part: 3, title: 'Quotation Desk', structure: 'Circular queue · Insertion sort',
    screens: 'Order desk → "Quote requests" tab, and the quote editor',
    files: 'js/structures.js (cqEnqueue, cqDequeue, cqGrow) · js/orders.js (leaveQueue, quoteHistory, recentQuotes, pastQuoteFrom, quoteDraft, sendQuote) · js/admin-desk.js · js/admin-orders.js',
    data: 'quoteQueue — circular queue of order ids { items, head, tail, count, capacity }; orders (past quotations)',
    summary: ['Circular queue · insertion sort of past quotes', 'O(1) enqueue / dequeue · O(n²) draft', 'O(n)'],
    business: [
        'Quote requests for the five custom gifts arrive while the owner is busy. They must be answered fairly — first come, first served — and pricing each one by hand from scratch is slow.',
        'So requests wait in a first-in, first-out queue, and each quotation is pre-filled from the owner’s own past quotes for the same product and size; usually the owner only checks it and presses send.'
    ],
    inputs: [['Stored: quoteQueue', 'Order ids waiting for a quotation, in arrival order.'], ['Stored: orders', 'Past quotations: product, size, materials, labour, quantity, date.'], ['Owner types', 'Materials, labour and item cost per line; delivery and rush fees; a note.']],
    steps: [
        'A request joins the back of a circular queue (enqueue). The desk lists the queue front to back; the front is next.',
        'Pre-fill: quoteHistory() reads every quoted order once and collects its quoted lines, per piece and without their add-ons; insertion sort puts them newest first. For each line of the request, recentQuotes() walks that list and stops at the first five for the same product and size (or any size, marked); their average, times the quantity, fills the line.',
        'When the quotation is sent, the request leaves the queue — from the front in O(1) when it is the next in line (dequeue) — and the customer is emailed.',
        'When the buffer is full it doubles in size, unrolling so the head is at slot 0.'
    ],
    ipo: {
        input: ['new quote request', 'past quotations'],
        process: ['cqEnqueue() — join the back', 'quoteHistory() — insertion sort, newest first', 'recentQuotes() + pastQuoteFrom() — average of five', 'leaveQueue() — dequeue the front'],
        output: ['ordered list of requests', 'a pre-filled quotation', 'the "quotation ready" email']
    },
    outputs: ['The "Quote requests" tab in order, with position numbers.', 'The quote editor, pre-filled and marked "Filled in from your last N quotes".', 'The quotation email to the customer.'],
    nMeaning: 'For the queue, n = requests waiting. For the pre-fill, n = past quoted lines — every line of every quoted order.',
    justification: [
        'A queue is the fair-service structure: first in, first out. A circular buffer reuses the slots freed at the front, so enqueue and dequeue are O(1) and the array never creeps forward as removing from the front of a plain array would.',
        'Insertion sort puts the past quotes in date order and is stable. The list is read back to front first, so it is already nearly newest first — close to the O(n) best case. The history is built once per draft, so each line of the request searches one list instead of every order again.',
        'Averaging the five most recent quotes follows the owner’s current prices rather than old ones, and pre-filling from the owner’s own history automates the job without inventing prices.'
    ],
    demo: ['Check out a cart with a Money Bouquet: it becomes a quote request.', 'In the order desk, open "Quote requests": it is last in line; SU-220 is first.', 'Press "Prepare quotation": the figures are already filled in from past Money Bouquet quotes. Send it.'],
    shots: [['m08-queue', 'Quote requests, first in first out'], ['m08-editor', 'The quote editor, pre-filled from past quotes']],
    trace: 'queue', traceTitle: 'the quote queue and the pre-fill',
    walk: [
        { file: 'js/structures.js', fn: 'cqEnqueue', about: 'Joins the back of the queue.', steps: [
            { at: 'if (queue.count === queue.capacity) cqGrow(queue);', text: 'Full? Double the buffer first.' },
            { at: 'queue.items[queue.tail] = value;', text: 'Write at the tail…' },
            { at: 'queue.tail = (queue.tail + 1) % queue.capacity;', text: '…and move the tail on, wrapping around with modulo.' }
        ] },
        { file: 'js/structures.js', fn: 'cqDequeue', about: 'Leaves from the front.', steps: [
            { at: 'var value = queue.items[queue.head];', text: 'Read the front.' },
            { at: 'queue.head = (queue.head + 1) % queue.capacity;', text: 'Move the head on, wrapping around.' }
        ] },
        { file: 'js/structures.js', fn: 'cqGrow', about: 'Doubles a full buffer.', steps: [
            { at: 'for (var k = 0; k < queue.count; k++) bigger[k] = queue.items[(queue.head + k) % queue.capacity];', text: 'Copy the items in queue order, so the head lands at slot 0.' }
        ] },
        { file: 'js/orders.js', fn: 'leaveQueue', about: 'Takes an id out when it is quoted or voided.', steps: [
            { at: 'if (cqFront(queue) === id) return cqDequeue(queue) === id;', text: 'Normally it is at the front: O(1) dequeue.' },
            { at: 'return cqRemove(queue, id);', text: 'Otherwise remove it from the middle, keeping the order.' }
        ] },
        { file: 'js/orders.js', fn: 'quoteHistory', about: 'Every quoted line the owner has priced, newest first.', steps: [
            { at: "if (order.id === ignoreId || order.quotedAt === 0 || order.status === 'requested') continue;", text: 'Only orders the owner has already quoted.' },
            { at: 'var base = past.materials - past.estimate;', text: 'Per piece, with the add-ons taken out.' },
            { at: 'return insertionSort(backwards(seen), function (a, b) { return b.stamp - a.stamp || a.seq - b.seq; });', text: 'Read back to front, then insertion sort newest first; lines quoted at the same moment keep their order.' }
        ] },
        { file: 'js/orders.js', fn: 'recentQuotes', about: 'The five most recent quotes for one product.', steps: [
            { at: 'for (var h = 0; h < history.length && out.length < 5; h++)', text: 'Walk the history from the newest, stopping after five.' },
            { at: 'if (line.productId === item.productId && (!sameSize || line.size === item.size)) listAdd(out, line);', text: 'Keep lines of the same product (and size).' }
        ] },
        { file: 'js/orders.js', fn: 'pastQuoteFrom', about: 'What the owner charged before.', steps: [
            { at: 'var recent = recentQuotes(history, item, true), sameSize = recent.length > 0;', text: 'The same size first…' },
            { at: 'if (!sameSize) recent = recentQuotes(history, item, false);', text: '…or any size if there is none.' },
            { at: 'materials: roundMoney(sumRecursive(recent', text: 'Average them.' }
        ] },
        { file: 'js/orders.js', fn: 'sendQuote', about: 'Sends the quotation.', steps: [
            { at: 'var errors = validateQuote(order, draft);', text: 'Every line must be priced; a courier fee must be set.' },
            { at: 'if (!revising) leaveQueue(quoteQueue, order.id);', text: 'Leave the queue.' },
            { at: 'emailQuoteReady(order, stamp);', text: 'Email the customer that it is approved.' }
        ] }
    ]
},

/* ===================================================================== */
{
    id: 'm09', no: 9, part: 3, title: 'Payment, Receipts & Email', structure: 'Circular queue (outgoing mail)',
    screens: 'Checkout step 3 (payment), the receipt, Track order (paying a quotation), Order desk → Outbox',
    files: 'js/orders.js (gcashProblem, receiptWithRef, placeOrder, acceptQuote, issueReceipt) · js/notify.js (queueEmail) · js/mail.js (drainMail) · js/email-config.js',
    data: 'receipts — array of snapshots; outbox — array of emails; mailQueue — circular queue of outbox positions; EMAIL_CONFIG',
    summary: ['Circular queue (mail) · linear search for used references', 'O(1) per email · O(n) reference check', 'O(n)'],
    business: [
        'The shop takes only two payments: a 50% down payment or full payment, both by GCash with the 13-digit reference number. Every payment needs a receipt, and the customer must be told by email: order confirmed (with the tracking number), quotation ready, payment received, ready for pickup, cancelled.',
        'A GCash reference can only pay once. Emails must go out in the order they were written, and none may be lost if the connection drops.'
    ],
    inputs: [['Customer picks / types', '50% or 100%; the GCash reference number.'], ['Stored: the order', 'Lines, totals, customer email.'], ['Stored: receipts', 'Every reference already used.'], ['Stored: EMAIL_CONFIG', 'The EmailJS IDs (blank = emails kept in the Outbox, marked "not sent").']],
    steps: [
        'Check the reference: 13 digits, and not already on any receipt (a linear search).',
        'Price-list cart: place the order and take the payment in one step; if anything fails, no order is left behind.',
        'Record the payment; take a snapshot of the order into a numbered receipt (OR-0001…), so later edits never change it.',
        'Write the email, store it in the outbox array and put its position in a circular queue. Every 1.5 s the sender takes the front of the queue and posts it to EmailJS, one at a time, marking it sent or failed.'
    ],
    ipo: {
        input: ['payment choice + GCash reference', 'the order'],
        process: ['gcashProblem() — 13 digits, unused', 'acceptQuote() / placeOrder()', 'issueReceipt() — snapshot', 'queueEmail() → cqEnqueue(); drainMail() → cqDequeue()'],
        output: ['a paid order in production', 'a receipt', 'an email sent or kept in the Outbox']
    },
    outputs: ['The receipt (printable) with paid and outstanding amounts.', 'The "Order confirmed" screen with the tracking number.', 'Emails to the customer, and the Outbox tab listing each one.'],
    nMeaning: 'For the reference check, n = receipts so far. For the queue, n = emails waiting. For a receipt, n = the order’s lines.',
    justification: [
        'Emails must leave in the order they were written ("confirmed" before "ready"), and only one may be in flight at a time — a first-in, first-out queue is exactly that. The circular buffer keeps enqueue and dequeue O(1).',
        'Receipts are snapshots (copies), not live views of the order, because a receipt records what was paid at that moment.',
        'Checking the reference against every receipt is a linear search, O(n); with a few hundred receipts a year that is instant and needs no extra index.'
    ],
    demo: ['Add a Rose Bouquet, check out with pickup, choose "100% Full Payment via GCash", enter 1234567890123 and place the order.', 'The receipt opens; the confirmation shows the tracking number.', 'Try to pay another order with the same reference: refused.', 'In the order desk, open "Outbox": the "Order confirmed" email is there.'],
    shots: [['m09-pay', 'Checkout: the two GCash payments'], ['m09-receipt', 'The receipt'], ['m09-outbox', 'The Outbox']],
    trace: 'payment', traceTitle: 'a payment, its receipt and its email',
    walk: [
        { file: 'js/orders.js', fn: 'gcashProblem', about: 'The checks every payment shares.', steps: [
            { at: "if (!isValidGcashRef(gcashRef)) return 'Enter the 13-digit GCash reference number.';", text: 'Exactly 13 digits.' },
            { at: 'var used = receiptWithRef(gcashRef);', text: 'Not already used on a receipt.' }
        ] },
        { file: 'js/orders.js', fn: 'placeOrder', about: 'Checkout for a price-list cart: place and pay in one step.', steps: [
            { at: 'var errors = validateRequest(form, items, isoFromStamp(stamp));', text: 'Check the form first.' },
            { at: 'var problem = gcashProblem(gcashRef);', text: 'Check the payment before anything is created.' },
            { at: 'var made = submitRequest(form, stamp);', text: 'Create the order (priced automatically).' },
            { at: 'var paid = acceptQuote(made.order.id, methodId, gcashRef, stamp);', text: 'Take the payment.' },
            { at: "voidOrder(made.order.id, 'Payment could not be recorded'", text: 'Never leave a half-made order.' }
        ] },
        { file: 'js/orders.js', fn: 'acceptQuote', about: 'Records the payment.', steps: [
            { at: 'if (stamp - order.quotedAt > QUOTE_EXPIRY_DAYS', text: 'An expired quotation cannot be paid.' },
            { at: 'order.amountPaid = method.share === 1 ? total : roundMoney(total * method.share);', text: 'Full or half of the total.' },
            { at: 'enterProduction(order);', text: 'Into the production line (module 10).' },
            { at: 'var receipt = issueReceipt(order', text: 'Issue the receipt…' },
            { at: 'emailOrderConfirmed(order, receipt, stamp);', text: '…and the confirmation email.' }
        ] },
        { file: 'js/orders.js', fn: 'issueReceipt', about: 'Snapshots the order into a receipt.', steps: [
            { at: "no: 'OR-' + leftPad(counters.receipt, 4, '0'),", text: 'The next receipt number.' },
            { at: 'balance: orderBalance(order), status: paymentStatus(order)', text: 'Paid to date, balance and status, as they are now.' }
        ] },
        { file: 'js/notify.js', fn: 'queueEmail', about: 'Writes an email and queues it.', steps: [
            { at: "if (!mailEnabled || !isValidEmail(to) || isDemoAddress(to)) return null;", text: 'Never email the demo customers (exactly example.com).' },
            { at: 'listAdd(outbox, record);', text: 'Keep it in the outbox…' },
            { at: 'cqEnqueue(mailQueue, outbox.length - 1);', text: '…and queue its position for sending.' }
        ] },
        { file: 'js/mail.js', fn: 'drainMail', about: 'Sends the queue, one at a time.', steps: [
            { at: 'var record = outbox[cqDequeue(mailQueue)];', text: 'Take the front of the queue.' },
            { at: "record.status = 'simulated';", text: 'EmailJS not set up: keep it, marked "not sent".' },
            { at: 'fetch(EMAILJS_URL, {', text: 'Otherwise post it to EmailJS.' },
            { at: "record.status = response.ok ? 'sent' : 'failed';", text: 'Mark the result; then send the next one.' }
        ] }
    ]
},

/* ===================================================================== */
{
    id: 'm10', no: 10, part: 4, title: 'Production & Tracking', structure: 'Min-heap · Circular queue · Binary search',
    screens: 'Order desk → "In production" tab, "Mark ready" and "Add tracking"; Track order on the shop',
    files: 'js/structures.js (heapInsert, heapSiftUp, heapExtractMin, heapCompare) · js/production.js (enterProduction, productionLine, completeNext) · js/orders.js (orderById, customerLookup) · js/algorithms.js (binarySearch) · js/tracking.js (setCourierTracking, trackingLinkProblem)',
    data: 'rushLane — min-heap keyed (due date, arrival); standardLane — circular queue; orders — array sorted by order number; order.courierTracking — { courier, number, link }',
    summary: ['Min-heap · circular queue · binary search', 'O(log n) heap · O(1) queue · O(log n) find', 'O(n)'],
    business: [
        'Paid orders must be made in the right order. Rush orders (₱50 extra, ready next day) go first, earliest due date first. Regular orders are made in the order they were paid. An order still owing a balance cannot be released, but it must not hold up the paid orders behind it.',
        'Customers check their order with the tracking number (e.g. SU-215) and their mobile number or email, so the shop needs to find an order by number quickly.',
        'Once a courier (Flash Express, Lalamove) has a parcel, the customer should be able to follow it without messaging the shop: the courier’s parcel number or tracking link is attached to the order.'
    ],
    inputs: [['Stored: rushLane (heap), standardLane (queue)', 'Order ids in production.'], ['Stored: orders', 'In ascending order-number order.'], ['Customer types', 'Tracking number and mobile number or email.'], ['Owner presses', '"Mark ready".'],
             ['Owner types (tracking)', 'The courier, its parcel number and / or tracking link, for a courier delivery marked ready.']],
    steps: [
        'Paid rush order: insert it into a min-heap keyed by (due date, arrival number) — it sifts up past later dates. Paid standard order: enqueue it.',
        'Mark ready: walk the line (heap order, then queue order) to the first order that is fully paid; take it out (the heap minimum or the queue front in the usual case) and email the customer. Listing the line in heap order sorts a copy of the heap’s array by the same key with insertion sort; the heap itself is untouched.',
        'Tracking: orders are numbered in increasing order and only ever appended, so the array is already sorted — binary search halves the range at each step.',
        'Courier tracking: once a courier delivery is marked ready (the customer was told it is on its way), the desk adds the courier’s parcel number and / or link. The number may hold only letters, digits and hyphens; the link is checked character by character — https:// only, the courier’s own site (or, for another courier, no IP address or punycode), no spaces, quotes or "user@" — so it can never run code or point somewhere else. The customer sees it on Track order and gets it by email; if it is removed, they are emailed to ignore it.'
    ],
    ipo: {
        input: ['paid order', '"Mark ready"', 'parcel number or link'],
        process: ['heapInsert() / cqEnqueue()', 'nextReleasable() → heapExtractMin() / cqDequeue()', 'binarySearch() on order numbers'],
        output: ['the production line, in order', 'order released + "ready" email', 'the customer’s order page']
    },
    outputs: ['The "In production" tab with positions, rush badges and the "Mark ready" button.', 'The customer’s tracking page with the timeline.',
              'The "Follow your parcel" card on Track order (the courier, the number, a link to the courier), the tracking email, and the tracking line on the desk’s order card.'],
    nMeaning: 'For the heap and the queue, n = orders in production. For binary search, n = all orders.',
    justification: [
        'A min-heap always gives the earliest due date, in O(log n) per insert or removal — keeping a sorted list instead would cost O(n) per insert. Adding the arrival number to the key makes it stable: equal dates are served in the order they were paid.',
        'Standard orders are fair first-in, first-out: a circular queue, O(1) at both ends.',
        'Binary search finds an order among n in O(log n) — about 10 steps for 1,000 orders — and costs nothing extra because order numbers are handed out in increasing order.'
    ],
    demo: ['In the order desk, open "In production": rush orders first, then standard.', 'Press "Mark ready": the first fully paid order is released and the customer emailed; an order owing a balance keeps its place.', 'On the shop, press "Track order" and enter SU-201 with 0917 555 0142.', 'In the desk, find SU-205 (a Lalamove delivery) and press "Add tracking": type Lalamove’s order number and paste its share link. Track order for SU-205 now shows "Follow your parcel".'],
    shots: [['m10-production', 'The production line'], ['m10-track', 'Tracking an order'], ['m10-courier', 'The desk adds the courier’s parcel number and link'],
            ['m10-parcel', 'The customer follows the parcel']],
    trace: 'heap', traceTitle: 'the rush heap and the order search',
    walk: [
        { file: 'js/structures.js', fn: 'heapInsert', about: 'Adds an order to the rush lane.', steps: [
            { at: 'heap.items[heap.size] = { value: value, priority', text: 'Put it at the end of the array (the next leaf).' },
            { at: 'heapSiftUp(heap, heap.size - 1);', text: 'Sift it up while it beats its parent.' }
        ] },
        { file: 'js/structures.js', fn: 'heapSiftUp', about: 'Restores the heap upward.', steps: [
            { at: 'var parent = Math.floor((child - 1) / 2);', text: 'The parent of index i is (i − 1) ÷ 2.' },
            { at: 'if (heapCompare(heap.items[child], heap.items[parent]) >= 0) break;', text: 'Stop once the parent is not later.' },
            { at: 'heapSwap(heap, child, parent);', text: 'Otherwise swap and continue upward.' }
        ] },
        { file: 'js/structures.js', fn: 'heapExtractMin', about: 'Removes the earliest-due order.', steps: [
            { at: 'var top = heap.items[0];', text: 'The minimum is always at the root.' },
            { at: 'heap.items[0] = heap.items[heap.size];', text: 'Move the last leaf to the root…' },
            { at: 'if (heap.size > 0) heapSiftDown(heap, 0);', text: '…and sink it to its place.' }
        ] },
        { file: 'js/structures.js', fn: 'heapCompare', about: 'Which order goes first.', steps: [
            { at: 'if (a.priority !== b.priority) return a.priority - b.priority;', text: 'Earlier due date first…' },
            { at: 'return a.seq - b.seq;', text: '…then whoever paid first.' }
        ] },
        { file: 'js/production.js', fn: 'completeNext', about: '"Mark ready".', steps: [
            { at: 'var order = nextReleasable();', text: 'The first fully paid order in line.' },
            { at: 'if (heapPeek(rushLane) === order.id) heapExtractMin(rushLane);', text: 'Rush: usually the heap minimum.' },
            { at: 'leaveQueue(standardLane, order.id);', text: 'Standard: usually the queue front.' },
            { at: 'stackPush(completedStack, { id: order.id, position: position });', text: 'Remember it for undo (module 11).' },
            { at: 'emailOrderReady(order, stamp);', text: 'Email "ready for pickup / on its way".' }
        ] },
        { file: 'js/algorithms.js', fn: 'binarySearch', about: 'Finds an order by number.', steps: [
            { at: 'var mid = Math.floor((low + high) / 2);', text: 'Look at the middle.' },
            { at: 'if (key === target) return mid;', text: 'Found.' },
            { at: 'if (key < target) low = mid + 1;', text: 'Too small: search the right half…' },
            { at: 'else high = mid - 1;', text: '…too big: search the left half.' }
        ] },
        { file: 'js/orders.js', fn: 'customerLookup', about: 'Shows an order only to its customer.', steps: [
            { at: 'var order = orderByRef(ref);', text: 'Binary search by number.' },
            { at: 'return byEmail || byPhone ? order : null;', text: 'Only if the mobile number or email matches.' }
        ] },
        { file: 'js/tracking.js', fn: 'trackingLinkProblem', about: 'Is a tracking link safe to show the customer?', steps: [
            { at: "if (!beginsWith(link, prefix)) return 'The tracking link must start with https://';", text: 'Only https:// — never javascript: or another scheme.' },
            { at: "if (isSpace(c) || c === ", text: 'One pass refuses spaces, quotes and angle brackets.' },
            { at: "if (!isLetter(h) && !isDigit(h) && h !== '-' && h !== '.')", text: 'The site name may hold only letters, digits, hyphens and dots — so no "user@" part can disguise it.' },
            { at: 'if (host.length < 4 || dots === 0', text: 'It must look like a real site name.' }
        ] },
        { file: 'js/tracking.js', fn: 'setCourierTracking', about: 'Attaches the courier’s tracking to an order.', steps: [
            { at: 'if (!canAttachTracking(order)) {', text: 'Only courier deliveries marked ready.' },
            { at: 'var checked = checkTracking(draft);', text: 'Check the number and the link.' },
            { at: 'order.courierTracking = { courier: t.courier, number: t.number, link: t.link, stamp: stamp };', text: 'Attach it to the order…' },
            { at: "addHistory(order, stamp, (before ? 'Courier tracking changed: '", text: '…write it to the history and the audit log…' },
            { at: 'emailTrackingAdded(order, stamp);', text: '…and email the customer.' }
        ] }
    ]
},

/* ===================================================================== */
{
    id: 'm11', no: 11, part: 4, title: 'Order Records', structure: 'Stack · Insertion sort',
    screens: 'Order desk → "Completed" and "Voided" tabs; "Undo last" in production',
    files: 'js/structures.js (stackPush, stackPop) · js/production.js (completeNext, undoCompletion, completedByDate, voidOrder, expireQuotes)',
    data: 'completedStack — stack of { id, position }; orders (completion and void times, reasons)',
    summary: ['Stack (undo) · insertion sort by date', 'O(1) push / pop · O(n) sort when nearly in order', 'O(n)'],
    business: [
        'Every finished order must be kept with all its details, organised by date. Cancelled orders are kept too, marked "VOIDED – NON-REFUNDABLE", never deleted. Quotations the customer never pays are cancelled automatically after three days.',
        'People make mistakes: if the owner marks the wrong order ready, they need to undo it — and the order must go back exactly where it was.'
    ],
    inputs: [['Stored: orders', 'Completion and void times, reasons, payments.'], ['Stored: completedStack', 'The completions made this session, newest on top.'], ['Owner presses', '"Undo last"; "Void" with a reason.'], ['The clock', 'Every minute, for expiring quotations.']],
    steps: [
        'Each "Mark ready" pushes { order, its place in line } onto a stack.',
        'Undo pops the top — the most recent completion — and puts the order back: into the heap with its original key, or into the queue at its old position.',
        'Completed orders: read the list back to front (it is kept oldest first), insertion sort it by completion time, newest first, then group consecutive orders of the same day with a day total.',
        'Voiding takes the order out of its queue or lane, keeps the record and any payment, and emails the customer. Every minute, quotations older than three days are voided by "System".'
    ],
    ipo: {
        input: ['"Mark ready" / "Undo last"', 'completed and voided orders'],
        process: ['stackPush() / stackPop()', 'insertionSort() by date + group by day', 'voidOrder(), expireQuotes()'],
        output: ['Completed tab grouped by day', 'Voided tab', 'order back in line after undo']
    },
    outputs: ['The "Completed" tab (days with totals; each order opens in full).', 'The "Voided" tab with reason, who and when.', 'The cancellation email.'],
    nMeaning: 'n = number of orders (completed or voided); for the stack, n = completions this session.',
    justification: [
        'Undo is last in, first out by nature — you undo the most recent action first — which is exactly a stack, O(1) push and pop.',
        'Storing the position with each completion means undo restores the order exactly, not just "somewhere in production".',
        'Insertion sort gives a stable date order. Orders are completed mostly in the order they were placed, so reading the oldest-first array back to front leaves it nearly newest first already: the sort runs close to its O(n) best case (15 comparisons for 15 orders, instead of the worst case of 105). Grouping consecutive same-day orders is then a single O(n) pass.'
    ],
    demo: ['In "In production" press "Mark ready", then "Undo last": the order is back at its place.', 'Open "Completed": orders grouped by day, newest first, each with a day total.', 'Void an order awaiting payment: it moves to "Voided" as VOIDED – NON-REFUNDABLE.'],
    shots: [['m11-completed', 'Completed orders grouped by day'], ['m11-voided', 'Voided orders kept on record']],
    trace: 'stack', traceTitle: 'undo and the records by date',
    walk: [
        { file: 'js/structures.js', fn: 'stackPush', about: 'Pushes onto the stack.', steps: [
            { at: 'stack.top++;', text: 'Move the top up one…' },
            { at: 'stack.items[stack.top] = value;', text: '…and store the value there.' }
        ] },
        { file: 'js/structures.js', fn: 'stackPop', about: 'Pops the top.', steps: [
            { at: 'if (stack.top === NIL) return null;', text: 'Empty: nothing to undo.' },
            { at: 'var value = stack.items[stack.top];', text: 'Take the top value…' },
            { at: 'stack.top--;', text: '…and move the top down.' }
        ] },
        { file: 'js/production.js', fn: 'undoCompletion', about: 'Undo the last "Mark ready".', steps: [
            { at: 'var entry = stackPop(completedStack);', text: 'The most recent completion.' },
            { at: 'heapInsert(rushLane, order.id, dueKey(order), order.laneSeq);', text: 'Rush: back in the heap with its original key.' },
            { at: 'if (entry.position <= 0) cqRequeueFront(standardLane, order.id);', text: 'Standard: back at the front…' },
            { at: 'else cqInsertAt(standardLane, entry.position, order.id);', text: '…or at its old place if it was released from behind an order still owing.' }
        ] },
        { file: 'js/production.js', fn: 'completedByDate', about: 'Completed orders by day.', steps: [
            { at: "var sorted = insertionSort(backwards(ordersWithStatus('completed')), function (a, b) { return b.completedAt - a.completedAt || a.id - b.id; });", text: 'Read back to front, then insertion sort newest first — nearly in order already.' },
            { at: 'if (!last || last.date !== day) {', text: 'A new day starts a new group…' },
            { at: 'last.total = roundMoney(last.total + orderTotal(sorted[i]));', text: '…and the day total grows.' }
        ] },
        { file: 'js/production.js', fn: 'voidOrder', about: 'Cancels, but keeps the record.', steps: [
            { at: 'if (order.status === \'requested\') leaveQueue(quoteQueue, order.id);', text: 'Leave the quote queue…' },
            { at: 'if (order.status === \'paid\') leaveProduction(order);', text: '…or the production line.' },
            { at: "order.status = 'voided';", text: 'Marked VOIDED – NON-REFUNDABLE; payments are retained.' },
            { at: 'emailOrderVoided(order, stamp);', text: 'Tell the customer.' }
        ] },
        { file: 'js/production.js', fn: 'expireQuotes', about: 'The automatic clean-up.', steps: [
            { at: "var stale = keepWhere(orders, function (o) { return o.status === 'quoted' && now - o.quotedAt > limit; });", text: 'Quotations unpaid for more than three days…' },
            { at: "voidOrder(stale[i].id, 'Quotation expired", text: '…are voided by "System".' }
        ] }
    ]
},

/* ===================================================================== */
{
    id: 'm12', no: 12, part: 4, title: 'Order Desk & Accounts', structure: 'Credentials array · Hash table · Bucketing by date',
    screens: 'index.html#admin — sign-in, the six-digit code, the Overview (daily, monthly, yearly), Accounts',
    files: 'js/accounts.js (staffAccounts, accountByEmail, passwordHash, checkPassword, addStaffAccount) · js/admin-signin.js (deskSignIn, issueOtp, verifyOtp) · js/reports.js (bucketOf, tallyPeriods, periodReport) · js/admin-overview.js · js/admin-account.js',
    data: 'staffAccounts — array of { id, name, email, role, salt, passHash, active } in id order; staffEmailIndex — hash table email → id; failedSignIns (pauses); deskState (the code’s hash); orders and receipts',
    summary: ['Credentials array + hash index · salted hash compare · one-pass bucketing by date', 'O(n) sign-in · O(n²) report', 'O(n)'],
    business: [
        'The shop is run from the order desk, at index.html#admin — linked from nowhere on the shop. Each person has their own account: the owner, and staff the owner adds. Signing in takes an email and password, then a six-digit code sent to that account’s own email (two-step verification). Everything they do is logged under their name.',
        'An owner sees everything, adds and disables accounts, and reads the logs; staff handle orders, production and products. The Overview answers "how is the shop doing?" for any day, month or year: money collected, sales, orders placed, pieces sold, orders made ready, voids, and that period’s best sellers.'
    ],
    inputs: [
        ['Person types', 'Email, password, the emailed code; a day, month or year.'],
        ['Owner types (Accounts)', 'A new person’s name, email, role and temporary password; disable / enable.'],
        ['Stored: staffAccounts, staffEmailIndex', 'Each account’s name, email, role, salt and salted password hash; the email → id index.'],
        ['Stored: orders, receipts', 'Everything the Overview counts.']
    ],
    steps: [
        'Find the account: the typed email is trimmed and lower-cased, hashed to its bucket in staffEmailIndex (O(1) on average) to get the account id, and binary search finds that id in staffAccounts, which is always in id order (O(log n)).',
        'Check the password: hash the typed password with that account’s own salt — FNV-1a, repeated 200 rounds — and compare with the stored hash. A wrong password, an unknown email and a disabled account all get the same message; five in a row for one email pause it for 30 seconds.',
        'Two-step: make a random six-digit code, keep only its hash, email it to the account’s address; it lasts five minutes, allows three tries, and a new one can be sent after 30 seconds (three per sign-in, and at most six codes an hour to one address however often the sign-in is started again). The right code makes that account the person signed in; 15 minutes without a tap or a key signs them out.',
        'Accounts: an owner adds a person — the next id, so appending keeps the array sorted — and indexes their email; or disables one (never deletes, so the history stays). Nobody can disable themselves, and the last active owner stays.',
        'Overview: a period is a key "2026-10-05", "2026-10" or "2026", and a record falls in it when its date begins with the key. For the breakdown, bucketOf() reads the day (month view) or the month (year view) straight off the record’s date and uses it as the row number, so one pass over the orders and receipts fills every row.'
    ],
    ipo: {
        input: ['email + password', 'six-digit code', 'new account details', 'period (day / month / year)'],
        process: ['accountByEmail() — hashGet + binarySearch', 'checkPassword() — passwordHash() with the salt', 'issueOtp() / verifyOtp()', 'addStaffAccount() / setAccountActive()', 'periodReport() → tallyPeriods() → bucketOf()'],
        output: ['the order desk opens, naming who is signed in', 'the accounts list', 'Overview figures, breakdown, best sellers']
    },
    outputs: ['The sign-in and code screens; the header names who is signed in.', 'The Overview: figure cards, day-by-day or month-by-month table, best sellers.', 'Accounts (owners) or My account (staff): change your own password; owners also see, add and disable accounts.', 'The tabs: quote requests, payments, production, completed, voided, products, outbox — and Logs for owners.'],
    nMeaning: 'For hashing, n = characters of the password or code — 200 rounds is a fixed number, so still O(n). Finding an account: O(1) on average in the hash table, then O(log n) in the number of accounts. For the Overview, n = orders and receipts — and each order’s lines are added up (a loop inside a loop).',
    justification: [
        'Credentials in an array in id order: a new account takes the next id, so appending keeps the array sorted and binary search finds any account by id. Sign-in starts from an email, so a hash table email → id answers that in O(1) on average instead of a linear search through every account.',
        'Only a salted hash of each password is stored — never the password. Each account has its own salt, so equal passwords do not share a hash, and 200 rounds make guessing slower. Codes expire and are limited in tries. This keeps customers off the desk; real security needs a server (with bcrypt or Argon2), because anyone can read a browser-only site’s code.',
        'Every date in the system is "YYYY-MM-DD", so "is this in October 2026?" is "does it begin with 2026-10?" — one rule handles days, months and years, and a year is the sum of its months.',
        'Reading each record’s own day or month as its row number fills all 31 rows of a month in one pass, instead of scanning every order again for each row.'
    ],
    demo: ['Open index.html#admin. Sign in with {OWNER} and admin123.', 'Enter the six-digit code (emailed; shown on screen while EmailJS is not set up).', 'The Overview opens on today. Switch to Monthly, then Yearly; use ‹ › to move.', 'Open Accounts: the owner and Bea Cruz (staff). Sign out and sign in as bea.cruz@example.com with Staff2026 — a demo address, so her code is shown on screen. She sees "My account" but no Logs tab.'],
    shots: [['m12-login', 'Step 1: email and password'], ['m12-code', 'Step 2: the six-digit code'], ['m12-overview', 'The Overview, monthly'], ['m12-accounts', 'Accounts: the credentials array']],
    trace: 'desk', traceTitle: 'the accounts, the sign-in and the Overview',
    walk: [
        { file: 'js/accounts.js', fn: 'passwordHash', about: 'The stored form of a password.', steps: [
            { at: "var h = fnv1a(salt + '|' + p);", text: 'Hash the account’s salt with the password…' },
            { at: 'for (var r = 1; r < PASSWORD_ROUNDS; r++)', text: '…and again, 200 rounds in all.' }
        ] },
        { file: 'js/accounts.js', fn: 'accountByEmail', about: 'Finds an account from the email typed.', steps: [
            { at: 'var id = hashGet(staffEmailIndex, accountEmailKey(email));', text: 'The email’s bucket gives the account id: O(1) on average…' },
            { at: 'return id === null ? null : accountById(id);', text: '…then binary search on the id-ordered array.' }
        ] },
        { file: 'js/accounts.js', fn: 'accountById', about: 'Binary search on the credentials array.', steps: [
            { at: 'var at = binarySearch(staffAccounts, Number(id), function (a) { return a.id; });', text: 'The array is in id order, so O(log n).' }
        ] },
        { file: 'js/admin-signin.js', fn: 'deskSignIn', about: 'Step 1: email and password.', steps: [
            { at: 'var guard = signInGuard(email), who = typedEmail(email);', text: 'This email’s sign-in record (module 13); the log keeps the email typed — never other text.' },
            { at: 'if (now < guard.lockedUntil) {', text: '…paused? Say how long.' },
            { at: 'var account = accountByEmail(email);', text: 'Find the account.' },
            { at: 'if (account && account.active && checkPassword(account, password)) {', text: 'Active, and the salted hashes match: on to the code.' },
            { at: 'guard.lockedUntil = now + ADMIN_LOCK_MS;', text: 'Five misses in a row pause this email for 30 seconds.' }
        ] },
        { file: 'js/admin-signin.js', fn: 'issueOtp', about: 'Makes a code.', steps: [
            { at: 'var code = otpCode(), account = accountById(deskState.pendingId);', text: 'Six random digits from the browser’s secure random source…' },
            { at: 'if (account) noteCodeSent(account.email, now);', text: '…counted against the address’s codes for this hour.' },
            { at: 'deskState.otp = { hash: fnv1a(code), expires: now + OTP_LIFETIME_MS, tries: 0, sentAt: now };', text: 'Keep only its hash, its expiry and a try counter.' }
        ] },
        { file: 'js/admin-signin.js', fn: 'verifyOtp', about: 'Step 2: the code.', steps: [
            { at: 'if (now > otp.expires) {', text: 'Expired after five minutes.' },
            { at: 'if (fnv1a(digitsOnly(code)) === otp.hash', text: 'Right code…' },
            { at: 'deskUserId = account.id;', text: '…and this account is the person signed in.' },
            { at: 'otp.tries++;', text: 'Wrong code: one try fewer (three in all).' }
        ] },
        { file: 'js/accounts.js', fn: 'addStaffAccount', about: 'An owner adds a person.', steps: [
            { at: "if (!isOwner(by)) return", text: 'Owners only.' },
            { at: 'if (hashHas(staffEmailIndex, email))', text: 'One account per email.' },
            { at: 'var last = staffAccounts.length > 0 ? staffAccounts[staffAccounts.length - 1].id : 0;', text: 'The next id…' },
            { at: 'listAdd(staffAccounts, account);', text: '…appended: the array stays in id order.' },
            { at: 'hashPut(staffEmailIndex, email, account.id);', text: 'Index the email for sign-in.' }
        ] },
        { file: 'js/reports.js', fn: 'bucketOf', about: 'Which row a moment belongs to.', steps: [
            { at: 'if (!beginsWith(iso, key)) return -1;', text: 'Outside the period: no row.' },
            { at: "if (part === 'day') return readNumber(iso, 8, 10) - 1;", text: 'Month view: the day of the month is the row.' },
            { at: "if (part === 'month') return readNumber(iso, 5, 7) - 1;", text: 'Year view: the month is the row.' }
        ] },
        { file: 'js/reports.js', fn: 'tallyPeriods', about: 'One pass fills every row.', steps: [
            { at: 'var order = orders[o], at = bucketOf(order.createdAt, key, part);', text: 'Each order goes straight to its row…' },
            { at: 't.units += sumRecursive(order.items', text: '…adding its pieces if it was paid.' },
            { at: 'at = bucketOf(receipts[r].stamp, key, part);', text: 'Money collected: each receipt to its row.' }
        ] },
        { file: 'js/reports.js', fn: 'periodReport', about: 'The whole Overview for a period.', steps: [
            { at: "part = 'month';", text: 'A year: twelve month rows…' },
            { at: "part = 'day';", text: '…a month: one row per day.' },
            { at: 'tallyPeriods(buckets, key, part);', text: 'One pass over the orders and receipts fills them all.' },
            { at: 'best: topSellers(salesTally(function (o) { return inPeriod(o.createdAt, key); }), 5)', text: 'The period’s best sellers (module 1).' }
        ] }
    ]
},

/* ===================================================================== */
{
    id: 'm13', no: 13, part: 4, title: 'Security & Audit Logs', structure: 'Append-only log · Hash table',
    screens: 'Order desk → Logs tab; "Forgot password?" on the sign-in card',
    files: 'js/audit.js (logEvent, logEntries, recentSecurityCounts, signInGuard, noteFailedSignIn) · js/admin-reset.js (startPasswordReset, completePasswordReset) · js/accounts.js (passwordProblem, setAccountPassword) · js/admin-signin.js · js/admin-logs.js',
    data: 'auditLog — append-only array of { id, stamp, kind, code, level, actor, action, detail, ref }; failedSignIns — hash table email → { count, streak, lockedUntil }; each account’s salted password hash and the reset code’s hash',
    summary: ['Append-only log · hash table · linear search', 'O(1) append · O(n) summary · O(n²) search', 'O(n)'],
    business: [
        'The owner needs to know who did what to an order and when — a customer’s checkout, a quotation, a payment recorded at the desk, a void — and to see attempts to get into the order desk: wrong passwords, wrong codes, lock-outs. Before, the only record was each order’s own history, with no actor and nothing about signing in.',
        'A forgotten password must not lock anyone out. "Forgot password?" emails a reset code to the account’s own address and lets the person choose a new password — without telling a stranger which emails have desk accounts. The Logs tab is for owners only.'
    ],
    inputs: [
        ['Every action', 'Order steps with their actor (Customer, the signed-in person’s name, System), product changes, accounts added or disabled, emails that could not be sent.'],
        ['Every sign-in step', 'The email typed; right or wrong passwords, codes, locks, resets, sign-outs; failed customer look-ups (the tracking number only).'],
        ['Owner picks / types', 'Everything / Security / Orders & products; search words; Download CSV.'],
        ['Person types (reset)', 'Their account’s email, the emailed code, the new password twice.']
    ],
    steps: [
        'Every event calls logEvent(), which appends one record at the end of the auditLog array — O(1) however long the log is. Order steps go through addHistory(), so an order’s own history and the audit log always agree, and each entry says who acted.',
        'A wrong password also adds one to that email’s row in the failedSignIns hash table — its total and its streak in a row (the email is hashed to its bucket: O(1) on average). The fifth in a row pauses that email for 30 seconds; other people can still sign in. Text that is not an email address (a password typed in the wrong box) is kept only as "(not an email address)".',
        'Code emails: a second hash table, codeSends, counts the codes each address was sent this hour. Sign-in and reset codes share it, and starting a sign-in or a reset again does not clear it, so nobody can flood an inbox — or use up the shop’s monthly email allowance — by pressing Back and starting over.',
        'Logs tab: the array is already in time order, so "newest first" is a read from the back — backwards(), O(n), no sort. A kind filter keeps the matching entries; the search is a linear search with naive string matching over each entry’s text.',
        '24-hour summary: walk back from the newest entry and stop at the first one older than a day — only the recent end of the log is read.',
        'Password reset: six random digits; only their FNV-1a hash is kept, with an expiry (10 minutes), a try counter (3) and a send counter (3). The new password is checked character by character — 8 to 64 characters, a letter and a digit, no spaces, not the current one — then that account gets a new salt and hash, any pause on its email is lifted, and the change is logged as an alert.'
    ],
    ipo: {
        input: ['actions and sign-in attempts', 'kind filter and search words', 'reset: email, code, new password'],
        process: ['logEvent() — append at the end', 'noteFailedSignIn() — hashGet / hashPut', 'canSendCode() / noteCodeSent() — the hourly code allowance', 'logEntries() — backwards + keepWhere + linearSearch', 'recentSecurityCounts() — walk back, stop at 24 h', 'completePasswordReset() — hash compare + passwordProblem()'],
        output: ['the Logs tab, newest first', '24-hour figures, wrong passwords by email', 'a CSV download', 'a new password, and an email saying so']
    },
    outputs: [
        'The Logs tab: four 24-hour figures, the list (when, level, which log, who, what, the order), and "Wrong passwords by email".',
        'A CSV file of what is shown, safe to open in a spreadsheet (no typed text can run as a formula).',
        'The reset screens, the reset-code email (the code is never in the subject) and the "password changed" email to the owner.'
    ],
    nMeaning: 'For the list, the summary and the CSV, n = entries in the log; for the hash table, n = emails stored. Appending is O(1) in the log’s length (only the actor’s text, at most 80 characters, is copied). For hashing and the password check, n = the characters typed.',
    justification: [
        'An append-only array is the natural shape of a log: events are only ever added at the end and never changed, so the array is in time order without sorting, appending is O(1), and "newest first" is just reading it backwards — no O(n²) sort.',
        'Because the log is in time order, the 24-hour summary stops at the first entry older than a day instead of reading the whole log.',
        'Counting wrong passwords (and codes sent) per email means "find this email’s counter" on every attempt: a hash table answers that in O(1) on average, where a list would need a linear search every time. Its keys are whatever people type, so the table doubles its buckets when it fills, keeping the chains short.',
        'The reset keeps only a hash of the code, limits its time, tries and sends, and answers the same for any email, so a stranger can neither guess a code easily nor learn which emails have accounts. Like the rest of the site it runs in the browser: it keeps customers out, but real security needs a server.'
    ],
    demo: [
        'Open index.html#admin. Type one wrong password, then sign in properly with {OWNER}, admin123 and the code.',
        'Open Logs: the wrong password, the code and the sign-in are at the top, and the 24-hour figures count them.',
        'Type SU-217 in the search box: only that order’s steps, each with who did it. Press Security: only security entries.',
        'Sign out, press "Forgot password?", enter {OWNER}, then the code and a new password — and sign in with it. The reset is logged as an alert.'
    ],
    shots: [['m13-logs', 'The Logs tab: the last 24 hours and the newest entries'], ['m13-reset', 'Password reset: the code and a new password']],
    trace: 'logs', traceTitle: 'the log, the summary and a password reset',
    walk: [
        { file: 'js/audit.js', fn: 'logEvent', about: 'Appends one entry to the log.', steps: [
            { at: 'id: counters.log, stamp: stamp, kind: e.kind', text: 'Build the entry with the next number…' },
            { at: 'listAdd(auditLog, entry);', text: '…and add it at the end: O(1), and the log stays in time order.' }
        ] },
        { file: 'js/orders.js', fn: 'addHistory', about: 'Every order step lands in two places.', steps: [
            { at: 'listAdd(order.history, { stamp: stamp, text: text });', text: 'The order’s own history…' },
            { at: "logAudit(stamp, actor || 'System', text, order.ref, detail, level);", text: '…and the audit log, with who did it.' }
        ] },
        { file: 'js/audit.js', fn: 'codeBudget', about: 'How many codes an address was sent this hour.', steps: [
            { at: 'var row = hashGet(codeSends, key);', text: 'The address’s row, by its hash…' },
            { at: 'if (now - row.since >= CODE_SEND_WINDOW_MS) { row.since = now; row.count = 0; }', text: '…starting a fresh count once the hour is over.' }
        ] },
        { file: 'js/audit.js', fn: 'signInGuard', about: 'The sign-in record for an email.', steps: [
            { at: 'var row = hashGet(failedSignIns, key);', text: 'Find the email’s row by its hash…' },
            { at: 'row = { email: key, count: 0, streak: 0, lockedUntil: 0, last: 0 };', text: '…or make it the first time the email is typed.' }
        ] },
        { file: 'js/audit.js', fn: 'noteFailedSignIn', about: 'Counts a wrong password against the email typed.', steps: [
            { at: 'row.count++;', text: 'One more in all…' },
            { at: 'row.streak++;', text: '…and one more in a row (a right password resets it).' }
        ] },
        { file: 'js/audit.js', fn: 'logEntries', about: 'The list on the Logs tab.', steps: [
            { at: 'var newest = backwards(auditLog);', text: 'Newest first: read the time-ordered log from the back.' },
            { at: '? keepWhere(newest, function (e) { return e.kind === kind; })', text: 'Keep one kind, if one was picked.' },
            { at: 'return linearSearch(ofKind, query, logText);', text: 'Then the search words: linear search with naive string matching.' }
        ] },
        { file: 'js/audit.js', fn: 'recentSecurityCounts', about: 'The 24-hour figures.', steps: [
            { at: 'for (var i = auditLog.length - 1; i >= 0 && now - auditLog[i].stamp <= DAY_MS; i--)', text: 'Walk back from the newest entry; stop at the first one older than a day.' },
            { at: "if (e.code === 'password-wrong' || e.code === 'locked-try' || e.code === 'current-wrong') c.failedPasswords++;", text: 'Count each event by its fixed code, not its wording.' }
        ] },
        { file: 'js/admin-signin.js', fn: 'deskSignIn', about: 'Every attempt is logged.', steps: [
            { at: "logSecurity(now, 'password-ok', 'info', who", text: 'A right password: on to the code step.' },
            { at: 'noteFailedSignIn(email, now);', text: 'A wrong one counts against the email typed…' },
            { at: "logSecurity(now, 'locked', 'alert', who", text: '…and the fifth in a row pauses that email, logged as an alert.' }
        ] },
        { file: 'js/admin-reset.js', fn: 'startPasswordReset', about: 'Step 1 of a reset.', steps: [
            { at: 'var account = accountByEmail(email), known = !!account && account.active;', text: 'Is it the email of an active account?' },
            { at: "logSecurity(now, 'reset-unknown', 'warn', typedEmail(email)", text: 'If not: no code is made, but it is logged — and the screen says the same…' },
            { at: 'noteCodeSent(email, now);', text: '…and it uses the hourly allowance just like a real code, so the limits tell nothing either.' },
            { at: 'return issueResetCode(now);', text: 'If so: a six-digit code, kept only as a hash.' }
        ] },
        { file: 'js/admin-reset.js', fn: 'completePasswordReset', about: 'The code, then the new password.', steps: [
            { at: 'if (now > r.expires) {', text: 'An expired code is refused — the same for every email.' },
            { at: 'if (!r.known || digits.length !== OTP_LENGTH || fnv1a(digits) !== r.hash) {', text: 'Compare hashes; a wrong code uses one of three tries.' },
            { at: 'var problem = passwordProblem(password, confirm, account);', text: 'Then the password rules — a weak password uses no try.' },
            { at: 'setAccountPassword(account, password);', text: 'A new salt and hash for that account…' },
            { at: 'guard.lockedUntil = 0;', text: '…any pause on its email is lifted…' },
            { at: "logSecurity(now, 'password-changed', 'alert'", text: '…and log it as an alert.' }
        ] },
        { file: 'js/accounts.js', fn: 'setAccountPassword', about: 'Stores a new password — as a hash only.', steps: [
            { at: 'account.salt = makeSalt();', text: 'A fresh random salt…' },
            { at: 'account.passHash = passwordHash(account.salt, password);', text: '…and the salted hash; the password itself is never kept.' }
        ] },
        { file: 'js/accounts.js', fn: 'passwordProblem', about: 'The password rules, by hand.', steps: [
            { at: 'if (p.length < PASSWORD_MIN || p.length > PASSWORD_MAX)', text: '8 to 64 characters.' },
            { at: 'if (isDigit(c)) digits++;', text: 'One pass counts the digits and the letters…' },
            { at: 'if (letters === 0 || digits === 0)', text: '…and needs at least one of each.' },
            { at: 'if (account && checkPassword(account, p))', text: 'Not the password already in use.' }
        ] }
    ]
}
];
