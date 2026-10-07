/* =========================================================================
   DATA · CATALOGUE
   Mga kulay, arrangement, litrato, category, products at add-ons ng shop.
   Kinokopya ang PRODUCT_SEED pag nagsimula, kaya ang ine-edit ng desk ay
   yung kopya lang at hindi ito.
   ========================================================================= */

var IMG_PRODUCTS = 'assets/products/';
var IMG_COLORS = 'assets/colors/';

// ---------- Mga kulay ng ribbon (20 sa color chart ng shop) ----------

var COLORS = [
    { id: 'red',           name: 'Red',           hex: '#d62527' },
    { id: 'wine-red',      name: 'Wine Red',      hex: '#781f22' },
    { id: 'orange',        name: 'Orange',        hex: '#db572a' },
    { id: 'peach',         name: 'Peach',         hex: '#e6b2a4' },
    { id: 'yellow',        name: 'Yellow',        hex: '#e7d045' },
    { id: 'golden-yellow', name: 'Golden Yellow', hex: '#e4b602' },
    { id: 'matcha',        name: 'Matcha',        hex: '#7f8d5b' },
    { id: 'emerald-green', name: 'Emerald Green', hex: '#2e5332' },
    { id: 'navy-blue',     name: 'Navy Blue',     hex: '#254771' },
    { id: 'baby-blue',     name: 'Baby Blue',     hex: '#82adcd' },
    { id: 'dark-blue',     name: 'Dark Blue',     hex: '#0c112f' },
    { id: 'violet',        name: 'Violet',        hex: '#5d325f' },
    { id: 'purple',        name: 'Purple',        hex: '#8e81af' },
    { id: 'purple-pink',   name: 'Purple Pink',   hex: '#d997cd' },
    { id: 'baby-pink',     name: 'Baby Pink',     hex: '#feb9df' },
    { id: 'milky-white',   name: 'Milky White',   hex: '#e7dbc1' },
    { id: 'white',         name: 'White',         hex: '#e4e7ec' },
    { id: 'choco-brown',   name: 'Choco Brown',   hex: '#2f2323' },
    { id: 'silver-gray',   name: 'Silver Gray',   hex: '#919b9d' },
    { id: 'black',         name: 'Black',         hex: '#242626' }
];

// ---------- Mga arrangement (round at layered) ----------

var ARRANGEMENTS = [
    { id: 'round',   name: 'Round',   counts: [3, 7, 9, 12, 18, 25],
      blurb: 'A domed posy, flowers packed shoulder to shoulder.' },
    { id: 'layered', name: 'Layered', counts: [1, 2, 3, 5, 7, 9, 12],
      blurb: 'A tall cone built up in tiers of wrap.' }
];

// ---------- Mga totoong litrato ng shop ----------

var REAL_REFERENCES = [
    { flower: 'rose',      arrangement: 'round',   color: 'red',         file: 'roses-round-1.jpg' },
    { flower: 'rose',      arrangement: 'round',   color: 'navy-blue',   file: 'roses-round-3.jpg' },
    { flower: 'rose',      arrangement: 'round',   color: 'purple-pink', file: 'roses-round-5.jpg' },
    { flower: 'rose',      arrangement: 'round',   color: 'baby-blue',   file: 'roses-round-8.jpg' },
    { flower: 'rose',      arrangement: 'layered', color: 'baby-blue',   file: 'roses-layered-1.jpg' },
    { flower: 'rose',      arrangement: 'layered', color: 'wine-red',    file: 'roses-layered-2.jpg' },
    { flower: 'rose',      arrangement: 'layered', color: 'peach',       file: 'roses-layered-3.jpg' },
    { flower: 'rose',      arrangement: 'layered', color: 'navy-blue',   file: 'roses-layered-4.jpg' },
    { flower: 'rose',      arrangement: 'layered', color: 'purple-pink', file: 'roses-layered-5.jpg' },
    { flower: 'plumeria',  arrangement: 'layered', color: 'red',         file: 'plumeria-layered-1.jpg' },
    { flower: 'dahlia',    arrangement: 'round',   color: 'navy-blue',   file: 'dahlia-round-1.jpg' },
    { flower: 'dahlia',    arrangement: 'layered', color: 'red',         file: 'dahlia-layered-1.jpg' },
    { flower: 'sunflower', arrangement: 'round',   color: 'wine-red',    file: 'custom-ribbon-2.jpg' },
    { flower: 'sunflower', arrangement: 'layered', color: 'navy-blue',   file: 'custom-ribbon-6.jpg' }
];

var FLOWERS = ['rose', 'plumeria', 'dahlia', 'sunflower'];

// ---------- Category tree (galing sa order sheet) ----------

var CATEGORY_OUTLINE = [
    { label: 'Flower Bouquets', slug: 'flower-bouquets', children: [
        { label: 'Rose', slug: 'rose' },
        { label: 'Plumeria', slug: 'plumeria' },
        { label: 'Dahlia', slug: 'dahlia' },
        { label: 'Sunflower', slug: 'sunflower' }
    ] },
    { label: 'Other Bouquets', slug: 'other-bouquets', children: [
        { label: 'Paper Bills', slug: 'paper-bills' },
        { label: 'Makeup', slug: 'makeup' },
        { label: 'Pictures', slug: 'pictures' },
        { label: 'Sweets / Snacks', slug: 'sweets' }
    ] },
    { label: 'Gift Cakes', slug: 'gift-cakes', children: [
        { label: 'Diaper Cake', slug: 'diaper-cake' },
        { label: 'Beer-in-Can Cake', slug: 'beer-cake' }
    ] }
];

// ---------- Mga tanong para sa bawat quote product ----------

var QUOTE_TYPES = [
    { id: 'flower', provided: null, countLabel: 'Flowers', detailLabel: '', expenseLabel: '' },
    { id: 'money', provided: 'the paper bills', countLabel: 'Number of bills',
      detailLabel: 'Total amount inside (optional)', expenseLabel: 'Bills' },
    { id: 'makeup', provided: 'the makeup products', countLabel: 'Number of makeup products',
      detailLabel: 'Products, brands or shades', expenseLabel: 'Makeup products' },
    { id: 'pictures', provided: null, countLabel: 'Number of photographs',
      detailLabel: 'Print size or theme', expenseLabel: 'Photo prints' },
    { id: 'sweets', provided: 'the sweets and snacks', countLabel: 'Number of sweets and snacks',
      detailLabel: 'Preferred sweets and snacks', expenseLabel: 'Sweets and snacks' },
    { id: 'diaper', provided: 'the diapers', countLabel: 'Number of diapers',
      detailLabel: 'Diaper brand and size', expenseLabel: 'Diapers' },
    { id: 'beer', provided: 'the beer', countLabel: 'Number of cans',
      detailLabel: 'Beer type or brand', expenseLabel: 'Beer' }
];

// ---------- Products ----------

var PRODUCT_SEED = [
    {
        id: 101, name: 'Rose Bouquet', line: 'rose', kind: 'flower', quoteType: 'flower', flower: 'rose',
        arrangements: ['round', 'layered'], leadDays: 3, addedOn: '2024-06-01',
        priceTable: [{ count: 1, price: 55 }, { count: 2, price: 110 }, { count: 3, price: 165 },
                     { count: 5, price: 260 }, { count: 7, price: 350 }, { count: 9, price: 430 },
                     { count: 12, price: 555 }, { count: 18, price: 825 }, { count: 25, price: 1135 }],
        materials: ['Satin ribbon', 'Korean wrapping paper', 'Floral wire and tape', 'Ribbon bow'],
        blurb: 'Hand-rolled satin roses, counted out as many as you like.',
        story: 'Each rose is rolled by hand from satin ribbon. Choose a round dome or a tall layered ' +
               'build, the number of flowers and one of twenty ribbon colours. The price follows the ' +
               'count on the shop’s price list, so you see it before you pay.',
        gallery: ['roses-round-1.jpg', 'roses-round-2.jpg', 'roses-round-3.jpg', 'roses-round-4.jpg',
                  'roses-round-5.jpg', 'roses-round-6.jpg', 'roses-round-7.jpg', 'roses-round-8.jpg',
                  'roses-layered-1.jpg', 'roses-layered-2.jpg', 'roses-layered-3.jpg',
                  'roses-layered-4.jpg', 'roses-layered-5.jpg']
    },
    {
        id: 102, name: 'Plumeria Bouquet', line: 'plumeria', kind: 'flower', quoteType: 'flower', flower: 'plumeria',
        arrangements: ['round', 'layered'], leadDays: 2, addedOn: '2024-06-01',
        priceTable: [{ count: 1, price: 45 }, { count: 2, price: 85 }, { count: 3, price: 130 },
                     { count: 5, price: 210 }, { count: 7, price: 280 }, { count: 9, price: 350 },
                     { count: 12, price: 450 }, { count: 18, price: 670 }, { count: 25, price: 925 }],
        materials: ['Satin ribbon', 'Pearl centres', 'Korean wrapping paper', 'Floral wire and tape'],
        blurb: 'Five-petal plumeria with a pearl centre. The gentlest of the three.',
        story: 'Folded plumeria blossoms, each with a pearl at the centre. They pack tightly into a ' +
               'round bed or rise in a layered cone, in any of the twenty ribbon colours.',
        gallery: ['plumeria-round-1.jpg', 'plumeria-round-2.jpg', 'plumeria-round-3.jpg',
                  'plumeria-round-4.jpg', 'plumeria-round-5.jpg', 'plumeria-round-6.jpg',
                  'plumeria-layered-1.jpg']
    },
    {
        id: 103, name: 'Dahlia Bouquet', line: 'dahlia', kind: 'flower', quoteType: 'flower', flower: 'dahlia',
        arrangements: ['round', 'layered'], leadDays: 3, addedOn: '2024-08-15',
        priceTable: [{ count: 1, price: 75 }, { count: 2, price: 145 }, { count: 3, price: 220 },
                     { count: 5, price: 360 }, { count: 7, price: 490 }, { count: 9, price: 620 },
                     { count: 12, price: 820 }, { count: 18, price: 1220 }, { count: 25, price: 1680 }],
        materials: ['Satin ribbon', 'Korean wrapping paper', 'Floral wire and tape', 'Hot glue'],
        blurb: 'Dozens of folded petals per bloom. The longest to make, and it shows.',
        story: 'A single dahlia is dozens of folded petals stacked into a sphere, which is why it ' +
               'costs more per flower than anything else on the sheet. Worth the extra day.',
        gallery: ['dahlia-round-1.jpg', 'dahlia-layered-1.jpg']
    },
    {
        id: 104, name: 'Sunflower Bouquet', line: 'sunflower', kind: 'flower', quoteType: 'flower', flower: 'sunflower',
        arrangements: ['round', 'layered'], leadDays: 3, addedOn: '2024-10-01',
        priceTable: [{ count: 1, price: 55 }, { count: 2, price: 110 }, { count: 3, price: 165 },
                     { count: 5, price: 260 }, { count: 7, price: 350 }, { count: 9, price: 430 },
                     { count: 12, price: 555 }, { count: 18, price: 825 }, { count: 25, price: 1135 }],
        materials: ['Satin ribbon', 'Felt centres', 'Korean wrapping paper', 'Floral wire and tape'],
        blurb: 'Bright satin sunflowers, set among roses in the colour you choose.',
        story: 'Sunflowers are almost always ordered mixed — against roses in a colour of your ' +
               'choosing. Priced on the rose price list, by the number of flowers.',
        gallery: ['custom-ribbon-2.jpg', 'custom-ribbon-6.jpg', 'custom-ribbon-7.jpg']
    },
    {
        id: 201, name: 'Money Bouquet', line: 'paper-bills', kind: 'quote', quoteType: 'money',
        leadDays: 2, addedOn: '2024-06-01', sizes: ['Small', 'Medium', 'Large', 'Extra large'],
        materials: ['Korean wrapping paper', 'Bill sleeves and clips', 'Ribbon', 'Filler flowers'],
        blurb: 'Your own bills, folded onto stems. Priced on materials and labour.',
        story: 'You provide the bills; the shop folds each one onto a stem and wraps the lot as a ' +
               'bouquet. The quotation covers materials and the labour of assembly, which depends ' +
               'on the size, the number of bills and how intricate the design is.',
        gallery: ['money-1.jpg', 'money-2.jpg', 'money-3.jpg']
    },
    {
        id: 202, name: 'Makeup Bouquet', line: 'makeup', kind: 'quote', quoteType: 'makeup',
        leadDays: 3, addedOn: '2024-06-01', sizes: ['Small', 'Medium', 'Large'],
        materials: ['Korean wrapping paper', 'Dried gypsophila', 'Product holders', 'Ribbon'],
        blurb: 'Her actual shades, wrapped like flowers with dried gypsophila.',
        story: 'Built around cosmetics, nested in wrap with dried gypsophila so the whole thing ' +
               'still reads as a bouquet. Tell the shop whether you will bring the makeup yourself; ' +
               'the quotation covers materials and labour, plus the products if the shop sources them.',
        gallery: ['makeup-1.jpg', 'makeup-2.jpg']
    },
    {
        id: 203, name: 'Picture Bouquet', line: 'pictures', kind: 'fixed', quoteType: 'pictures', price: 650,
        leadDays: 2, addedOn: '2024-06-01', sizes: ['Standard'],
        materials: ['Photo prints', 'Card backing and stems', 'Korean wrapping paper', 'Ribbon'],
        blurb: 'Your photographs, printed and mounted where the flowers would be.',
        story: 'Send the shots and they come back as prints on stems, wrapped like a bouquet. ' +
               'Usually a graduation, but it works for anniversaries and farewells just as well. ' +
               'One price per bouquet, straight off the shop\'s order sheet.',
        gallery: ['picture-1.jpg']
    },
    {
        id: 204, name: 'Sweets & Snacks Bouquet', line: 'sweets', kind: 'quote', quoteType: 'sweets',
        leadDays: 2, addedOn: '2024-09-01', sizes: ['Small', 'Medium', 'Large'],
        materials: ['Korean wrapping paper', 'Cellophane', 'Sticks and tape', 'Ribbon'],
        blurb: 'Chocolates and snacks arranged as a bouquet. Tell us their favourites.',
        story: 'Usually built from sweets you provide. If the shop buys them, the quotation lists ' +
               'that cost separately from the materials and labour, so you can see exactly what ' +
               'goes where.',
        gallery: ['sweets-1.jpg', 'sweets-2.jpg']
    },
    {
        id: 301, name: 'Diaper Cake', line: 'diaper-cake', kind: 'quote', quoteType: 'diaper',
        leadDays: 3, addedOn: '2024-06-01', sizes: ['1 tier', '2 tiers', '3 tiers'],
        materials: ['Satin ribbon', 'Cake board', 'Rubber bands', 'Topper and toys'],
        blurb: 'A tiered cake of rolled diapers, stacked with newborn essentials.',
        story: 'Every layer is rolled diapers, banded in satin and finished with a topper. The ' +
               'diapers are usually yours; the quotation covers materials and the labour of ' +
               'rolling and assembly.',
        gallery: ['diaper-cake-1.jpg']
    },
    {
        id: 302, name: 'Beer-in-Can Cake', line: 'beer-cake', kind: 'quote', quoteType: 'beer',
        leadDays: 3, addedOn: '2024-09-01', sizes: ['1 tier', '2 tiers', '3 tiers'],
        materials: ['Cake board', 'Satin ribbon', 'Wrap and tape', 'Topper'],
        blurb: 'Cans stacked and wrapped into a tiered cake. A birthday standard.',
        story: 'Tell the shop the beer and how many cans. If you bring the beer, the quotation is ' +
               'materials and labour; if the shop buys it, the beer is listed as its own cost.',
        gallery: ['beer-cake-1.jpg']
    }
];

// ---------- Add-ons ----------

var ADDONS = [
    { id: 'lights',  name: 'Fairy Lights', price: 20, flowersOnly: false, note: 'Warm micro-LED strand, battery included' },
    { id: 'topper',  name: 'Butterfly Topper', price: 5, flowersOnly: false, note: 'Hand-cut organza butterflies' },
    { id: 'card',    name: 'Message Card w/ Dried Flower', price: 20, flowersOnly: false, note: 'Handwritten, with a dried bloom' },
    { id: 'glitter', name: 'Glitters', price: 5, flowersOnly: true, note: 'Priced by how many flowers it covers' }
];

var GLITTER_TIERS = [
    { upTo: 3, price: 5 }, { upTo: 7, price: 10 }, { upTo: 12, price: 15 },
    { upTo: 18, price: 20 }, { upTo: 25, price: 25 }
];

var CARD_FLOWERS = ['Sunflower', 'Rose', 'Lavender', 'Pink Carnation', 'Purple Carnation', 'Aster Pink'];

// Pinakamaraming quantity sa isang line.
var MAX_QUANTITY = 20;

// Pinakamahabang notes.
var MAX_NOTE = 500;

// ---------- Sample photos galing sa web (may credit) ----------

var PHOTO_CREDITS = [
    { file: 'sweets-1.jpg', title: 'Chocolate Bouquet', author: 'இந்து தங்கராஜ்',
      license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
      source: 'https://commons.wikimedia.org/wiki/File:Chocolate_Bouquet.jpg', changes: 'Resized.' },
    { file: 'sweets-2.jpg', title: 'Candy bouquet from my family', author: 'TwisterMc',
      license: 'CC BY-SA 2.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0/',
      source: 'https://www.flickr.com/photos/13112188@N00/9095526092', changes: '' },
    { file: 'beer-cake-1.jpg', title: 'Max\'s Tower of Beer Cans', author: 'Smash the Iron Cage',
      license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
      source: 'https://commons.wikimedia.org/wiki/File:Max%27s_Tower_of_Beer_Cans.jpg', changes: 'Cropped and resized.' }
];
