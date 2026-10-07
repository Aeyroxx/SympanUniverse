/* =========================================================================
   REVIEWER · COMPLEXITY NOTES IN ENGLISH
   The comments in js/ are in Tagalog, including the few words that explain
   a Time or Space note ("O(n) sa text"). The reviewer is in English, so the
   notes it copies from the code are shown with those words in English.
   The O(…) terms themselves are never changed. Needs the site's helpers
   (swapText) loaded first, as build.js does.
   ========================================================================= */

var PAIRS = [
    ['(O(n) pag lumaki)', '(O(n) on a grow)'],
    ['O(n) sa pag-ayos ng text', 'O(n) to tidy the text'],
    ['O(n) sa text ng actor', "O(n) for the actor's text"],
    ['O(n) sa digits', 'O(n) for the digits'],
    ['O(n) sa email', 'O(n) for the email'],
    ['O(n) sa text', 'O(n) for the text'],
    ['O(n) dito (halos naka-ayos na), O(n²) worst', 'O(n) here (nearly in order), O(n²) worst'],
    ['O(n) bawat event', 'O(n) per event'],
    ['O(n) sa paghanap + O(log n)', 'O(n) to find + O(log n)'],
    ['O(n) lakad sa tree', 'O(n) tree walk'],
    ['O(n) sa maiikling separator dito; O(n²) worst', 'O(n) with the short separators used here; O(n²) worst'],
    ['O(n) sa maiikling text dito; O(n²) worst', 'O(n) with the short texts used here; O(n²) worst'],
    ['O(1) (fixed na listahan)', 'O(1) (fixed lists)'],
    ['O(n) (fixed ang PASSWORD_ROUNDS)', 'O(n) (PASSWORD_ROUNDS is fixed)'],
    ['O(n) (isang hashPut bawat flower × arrangement × colour, n = 160, at bawat litrato)', 'O(n) (one hashPut per flower × arrangement × colour, n = 160, and per photo)'],
    ['O(n) (isang makeFlowerItem / makeQuoteItem bawat line)', 'O(n) (one makeFlowerItem / makeQuoteItem per line)'],
    ['O(n) (isang pasada sa price rows)', 'O(n) (one pass over the price rows)'],
    ['O(n²) pinakamarami (isang O(log n) binary search bawat id sa pila)', 'O(n²) at most (one O(log n) binary search per queued id)'],
    ['O(n²) bawat demo event', 'O(n²) per demo event replayed'],
    ['O(n²) (bawat line ng bawat order)', 'O(n²) (each line of each order)'],
    ['O(n²) (bawat order at mga line nito)', 'O(n²) (each order and its lines)'],
    ['O(n²) (bawat send, nire-render ulit ang outbox)', 'O(n²) (each send redraws the outbox)'],
    ['O(n²) (bawat order sa pila at mga line nito)', 'O(n²) (every queued order and its lines)'],
    ['O(n²) (bawat simula × haba ng hinahanap)', 'O(n²) (every start position × the needle)'],
    ['O(n²) (naive string matching sa bawat entry)', 'O(n²) (naive string matching on every entry)'],
    ['O(n²) (naive string matching sa bawat record)', 'O(n²) (naive string matching on every record)'],
    ['O(n²) (lahat ng line ng bawat order)', 'O(n²) (the lines of every order)'],
    ['O(n²) (mga revision at pagbabago nila)', 'O(n²) (the revisions and their changes)']
];

/* A note from the code, with its Tagalog words in English.
                                           Time O(n²) · Space O(n) */
function englishNote(note) {
    var out = note;
    for (var i = 0; i < PAIRS.length; i++) out = swapText(out, PAIRS[i][0], PAIRS[i][1]);
    return out;
}

module.exports = { englishNote: englishNote, PAIRS: PAIRS };
