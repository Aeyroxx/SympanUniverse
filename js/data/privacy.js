/* =========================================================================
   DATA · PRIVACY NOTICE AT ORDER TERMS
   Sa ilalim ng Data Privacy Act of 2012 (RA 10173). Naka-record sa bawat
   order kung anong version ang pinayagan ng customer at kailan.
   Panimulang text ito para i-review ng shop, hindi legal advice.
   ========================================================================= */

var PRIVACY_NOTICE_VERSION = '2026-10-06';
var ORDER_TERMS_VERSION = '2026-10-06';

var PRIVACY_NOTICE = [
    { title: 'Who we are',
      text: ['Sýmpan Universe is a handcrafted gift shop in Lawa, Meycauayan, Bulacan. We are the personal information controller for the details you give us when you order, and we follow the Data Privacy Act of 2012 (Republic Act No. 10173) and its rules.'] },
    { title: 'What we collect',
      text: ['To take an order: your name, mobile number, email address, and — if you give them — your Facebook or Instagram name, notes about the order, and any reference picture you attach.',
             'For a delivery: the street, barangay and city. For a gift this is often the recipient’s address — please let them know you are sharing it with us; we use it only to deliver. For a payment: the GCash reference number of your payment, so we can match it to your order.',
             'We do not ask for government IDs, birthdays or card details, and this website uses no cookies, trackers or advertising tools.'] },
    { title: 'Why we use it',
      text: ['Only to make, price, deliver and support your order: to prepare your quotation, confirm your payment and issue receipts, schedule pickup or delivery, send you emails about each step, and answer you if you message us.',
             'We do not sell your details or use them for advertising.'] },
    { title: 'Our basis for using it',
      text: ['Your consent, which you give by ticking the box at checkout, and the order itself: we need these details to fulfil what you asked us to make.',
             'You may withdraw your consent at any time by messaging us (see How to reach us). We then stop using your details for anything new. An order already in production still needs them to be finished and delivered, and the order terms on cancellations and payments still apply; receipts the law requires us to keep are kept.'] },
    { title: 'Who else receives it',
      text: ['For a courier delivery, the courier you choose (Flash Express or Lalamove) receives your name, mobile number and address.',
             'Our order emails are sent through EmailJS, an email service whose servers are outside the Philippines, so your email address and our message to you are processed abroad.',
             'When this page opens, your browser also loads its fonts from Google Fonts and its layout styles from jsDelivr. Like any website they see your IP address and browser, but none of your order details.',
             'No one else receives your details, unless the law requires it.'] },
    { title: 'How long we keep it, and how it is protected',
      text: ['This website keeps orders only in the open browser page: nothing is saved on your device, and reloading the page erases it. The emails we send you stay in the shop’s mailbox and in EmailJS’s sending history.',
             'The shop keeps your order details only as long as your order and its after-care need — at most one year after it is completed — then deletes them. Receipts and payment records are kept as long as tax rules require.',
             'Only the shop’s own people can see orders. Each person at the order desk signs in with their own account, password and a code sent to their email. (This demonstration copy also has a sample staff account whose code is shown on screen, because its example address cannot receive email.)'] },
    { title: 'Your rights',
      text: ['Under the Data Privacy Act you have the right to be informed, to access your personal data, to object to its processing and withdraw your consent, to have it corrected, to have it erased or blocked, to receive it in a form you can take elsewhere, and to be paid for damages if it is misused.',
             'You may also file a complaint with the National Privacy Commission (privacy.gov.ph).'] },
    { title: 'How to reach us',
      text: ['For any question or request about your data, email the shop at sympan.universe@gmail.com or message @sympan.universe. The shop owner acts as our data protection officer.'] }
];

// Sariling rules ng shop. Pinapayagan sa checkout, hiwalay sa privacy consent.
var ORDER_TERMS = [
    'Every item is handmade. Processing takes 2 to 3 days or longer, depending on the design; rush orders cost ₱50 more.',
    'A 50% down payment or full payment by GCash confirms an order. Payments are non-refundable.',
    'No cancellations once production starts. A request or an unpaid quotation can be cancelled from Track order.',
    'The shop delivers itself on Fridays, Saturdays and Sundays: free within Brgy. Lawa, ₱20 to ₱50 for other nearby areas. Couriers deliver further out at their rates.',
    'Pickup and delivery dates and times are estimates. Weather, traffic and courier delays can move them; the shop will message you if they change.',
    'A small greeting card is free on request.'
];
