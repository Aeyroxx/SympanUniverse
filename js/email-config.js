/* =========================================================================
   EMAIL SETTINGS — the only file to edit to switch real email on.

   The site sends email through EmailJS (https://www.emailjs.com), which
   works straight from the browser. Until the three IDs below are filled
   in, nothing is sent: every message is kept in the order desk's Outbox
   and the sign-in code is shown on screen, clearly marked as a demo.

   Setup (about five minutes, free plan: 200 emails a month):
     1. Create an EmailJS account.
     2. Email Services → Add New Service → e.g. Gmail → connect the shop's
        mailbox. Copy its Service ID below.
     3. Email Templates → Create New Template. Set:
          To Email:  {{to_email}}
          From Name: {{from_name}}
          Reply To:  {{reply_to}}
          Subject:   {{subject}}
          Content:   <div style="white-space: pre-line">{{message}}</div>
                     (pre-line keeps the email's line breaks)
        Save, and copy its Template ID below.
     4. Account → General → copy the Public Key below.

   These three values are meant to be public — they are not passwords.
   Never put a mailbox password in this or any other site file.

   KNOW THE RISK. Because the page itself sends the mail, anyone who reads
   these IDs can use the template to send their own text, from the shop's
   mailbox, to any address — and use up the monthly quota doing it. A
   browser-only site cannot fully prevent that; only a server can. Limit
   it in the EmailJS dashboard: set a low rate limit, turn on its abuse
   protection (CAPTCHA) if offered, connect a mailbox used only for these
   notices (not the owner's personal one), and once the site is hosted on
   a web address, allow only that address. Pages opened straight from a
   file cannot be restricted by address.
   ========================================================================= */

var EMAIL_CONFIG = {
    serviceId: 'service_uez4hrk',      // e.g. 'service_a1b2c3d'
    templateId: 'template_dm34zfa',     // e.g. 'template_x9y8z7w'
    publicKey: 'v4aMiZn9GuVhwpDEj',      // e.g. 'Ab1Cd2Ef3Gh4Ij5Kl'
    fromName: 'Sýmpan Universe',
    replyTo: 'sympan.universe@gmail.com',
    // The order desk signs in with this address, and its sign-in codes go here.
    adminEmail: 'kurlchester31feliciano@gmail.com'
};
