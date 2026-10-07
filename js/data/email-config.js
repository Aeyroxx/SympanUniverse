/* =========================================================================
   EMAIL SETTINGS · ito lang ang ie-edit para gumana ang totoong email.

   EmailJS (https://www.emailjs.com) ang nagse-send ng email galing mismo sa
   browser. Habang wala pa yung tatlong ID sa baba, walang naise-send: nasa
   Outbox lang ng desk ang mga email at nasa screen ang sign-in code.

   Setup (mga 5 minuto, free plan: 200 email kada buwan):
     1. Gumawa ng EmailJS account.
     2. Email Services -> Add New Service -> Gmail -> i-connect ang mailbox
        ng shop. Kopyahin ang Service ID sa baba.
     3. Email Templates -> Create New Template. Ilagay:
          To Email:  {{to_email}}
          From Name: {{from_name}}
          Reply To:  {{reply_to}}
          Subject:   {{subject}}
          Content:   <div style="white-space: pre-line">{{message}}</div>
                     (pre-line para hindi mawala ang line breaks)
        I-save, tapos kopyahin ang Template ID sa baba.
     4. Account -> General -> kopyahin ang Public Key sa baba.

   Public talaga ang tatlong ito, hindi password. Huwag kailanman maglagay
   ng password ng mailbox dito o sa kahit anong file ng site.

   TANDAAN ANG RISK. Dahil page mismo ang nagse-send, kahit sino na makabasa
   ng mga ID ay pwedeng gamitin ang template para mag-send ng sarili niyang
   text galing sa mailbox ng shop, at maubos ang quota. Server lang ang
   makakapigil talaga nito. Sa EmailJS dashboard: maglagay ng mababang rate
   limit, i-on ang CAPTCHA kung meron, gumamit ng mailbox na para lang dito
   (hindi personal ng owner), at pag naka-host na, yung address lang ng site
   ang payagan. Hindi ma-restrict ang page na binuksan direkta sa file.
   ========================================================================= */

var EMAIL_CONFIG = {
    serviceId: 'service_uez4hrk',      // halimbawa 'service_a1b2c3d'
    templateId: 'template_dm34zfa',     // halimbawa 'template_x9y8z7w'
    publicKey: 'v4aMiZn9GuVhwpDEj',      // halimbawa 'Ab1Cd2Ef3Gh4Ij5Kl'
    fromName: 'Sýmpan Universe',
    replyTo: 'sympan.universe@gmail.com',
    // Ito ang email ng owner sa desk, dito rin pumupunta ang sign-in code.
    adminEmail: 'kurlchester31feliciano@gmail.com'
};
