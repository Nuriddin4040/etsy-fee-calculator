/*
 * Country guide pages (/etsy-fees-australia, /etsy-fees-canada).
 * Every number in the text is computed with fees.js, the same code the calculator runs.
 *
 * Sources checked 12 October 2026:
 *  - Etsy Payments Policy (last updated 31 Jul 2026): AU 3% + A$0.25 domestic, 4% + A$0.25 international;
 *    CA 3% + CA$0.25 for Canadian and US orders, 4% + CA$0.25 other international orders.
 *  - Fees & Payments Policy (last updated 5 Oct 2026): $0.20 listing, 6.5% transaction, Offsite Ads 15%/12%
 *    capped at $100, 2.5% currency conversion, fees quoted without VAT/GST.
 *  - Help: Regulatory Operating Fee (Canada 0.50%, Australia not listed).
 *  - Help: How VAT Is Collected on Seller Fees (Australia in the list; Canada has its own rules).
 *  - Help: What Does Etsy Remit to Canadian Tax Authorities? (GST/HST on fees by registration status).
 */
module.exports = function buildCountryPages(h) {
  const { F, money, pct, esc, exTable } = h;

  const SRC = {
    payments: ['https://www.etsy.com/legal/etsy-payments', 'Etsy Payments Policy', 'payment processing fees by country (last updated 31 July 2026)'],
    fees: ['https://www.etsy.com/legal/fees', 'Etsy Fees &amp; Payments Policy', 'listing, transaction, Offsite Ads and currency conversion fees (last updated 5 October 2026)'],
    reg: ['https://help.etsy.com/hc/en-us/articles/1500011073202', 'What is a Regulatory Operating Fee?', 'Etsy Help Center'],
    vat: ['https://help.etsy.com/hc/en-us/articles/360040584433', 'How VAT Is Collected on Seller Fees', 'Etsy Help Center'],
    caTax: ['https://help.etsy.com/hc/en-us/articles/6633345416215', 'What Does Etsy Remit to Canadian Tax Authorities?', 'Etsy Help Center']
  };
  const sources = (keys) => keys.map((k) => {
    const [u, t, d] = SRC[k];
    return `<li><a href="${u}" rel="noopener">${t}</a>: ${d}</li>`;
  }).join('\n      ');

  const REG_COUNTRIES = 'Canada, France, Hungary, Italy, India, Spain, Türkiye, the United Kingdom and Vietnam';

  /* domestic vs international fees at several order totals */
  function ladder(country, totals, domLabel, intlLabel) {
    const cur = F.byId(country).currency;
    let rows = '';
    totals.forEach((t) => {
      const d = F.calc({ country, price: t, shipping: 0 });
      const i = F.calc({ country, price: t, shipping: 0, intl: true });
      rows += `<tr><td>${money(t, cur)}</td><td class="n">${money(d.fees, cur)}</td><td class="n">${pct(d.feePct, 1)}</td>` +
        `<td class="n">${money(i.fees, cur)}</td><td class="n">${pct(i.feePct, 1)}</td></tr>`;
    });
    return `<div class="tbl"><table><caption>Etsy fees by order total (item + shipping), no ads</caption>
<thead><tr><th>Order total</th><th class="n">Fees: ${domLabel}</th><th class="n">Share</th><th class="n">Fees: ${intlLabel}</th><th class="n">Share</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  /* static "fees at a glance" table */
  function glance(rows, caption) {
    const body = rows.map(([a, b, c]) => `<tr><td>${a}</td><td>${b}</td><td>${c}</td></tr>`).join('');
    return `<div class="tbl"><table><caption>${caption}</caption>
<thead><tr><th>Fee</th><th>Rate</th><th>When it applies</th></tr></thead><tbody>${body}</tbody></table></div>`;
  }

  const r2 = (x) => Math.round(x * 100) / 100;

  function faqParts(list) {
    return {
      html: list.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('\n'),
      entities: list.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } }))
    };
  }

  /* ======================= AUSTRALIA ======================= */
  function australia() {
    const id = 'au';
    const C = F.byId(id);
    const cur = C.currency;
    const m = (x) => money(x, cur);
    const listingLocal = F.LISTING_FEE_USD * F.FX[cur];
    const capLocal = F.ADS_CAP_USD * F.FX[cur];

    const ex = { country: id, price: 45, shipping: 10 };
    const exR = F.calc(ex);
    const ex120d = F.calc({ country: id, price: 120, shipping: 0 });
    const ex120i = F.calc({ country: id, price: 120, shipping: 0, intl: true });
    const dig = { country: id, price: 12, shipping: 0, intl: true };
    const digR = F.calc(dig);
    const conv = F.calc(Object.assign({}, ex, { conversion: true }));
    const gstOnEx = exR.fees * 0.10;
    const rv = { country: id, shipping: 10, cogs: 8, postage: 10, target: 15 };
    const rvD = F.reverse(rv);
    const rvI = F.reverse(Object.assign({}, rv, { intl: true }));
    const rvA = F.reverse(Object.assign({}, rv, { ads: 15 }));
    const fifty = F.calc({ country: id, price: 50, shipping: 0 });

    const article = `
<h2 id="fees">Etsy fees for Australian sellers in 2026</h2>
<p>An Australian shop pays the same marketplace fees as every Etsy seller, plus a payment processing fee that Etsy sets for Australian bank accounts. Unlike sellers in ${REG_COUNTRIES}, Australian sellers pay no regulatory operating fee.</p>
${glance([
  ['Listing fee', `US$0.20 (about ${m(listingLocal)})`, 'Each new listing and each renewal. A multi-unit listing renews, and pays again, every time one sells.'],
  ['Transaction fee', '6.5%', 'Item price plus shipping and gift wrap, on every sale.'],
  ['Payment processing', `3% + ${m(C.ppFlat)}`, 'Orders from buyers in Australia.'],
  ['Payment processing', `4% + ${m(C.ppFlat)}`, 'Orders from buyers outside Australia.'],
  ['Regulatory operating fee', 'None', 'Not charged to Australian sellers.'],
  ['Offsite Ads', `15% or 12%, capped at US$100 (about ${m(capLocal)})`, 'Only orders that came through an Etsy ad on another website.'],
  ['Currency conversion', '2.5%', 'Only if you list in a currency other than AUD.'],
  ['GST on fees', '10% of your Etsy fees', 'If you have not added a GST registration (Etsy calls it a VAT ID) to your account.']
], 'Etsy fees for a shop with an Australian bank account')}
<p>Etsy charges the listing fee and the Offsite Ads cap in US dollars. The A$ amounts here use an approximate rate of 1 USD = ${F.FX[cur]} AUD, so they can be a few cents off.</p>
<p>Here is a typical domestic order worked through, using the same code as the calculator above:</p>
${exTable(`Example: ${m(45)} item with ${m(10)} shipping to a buyer in Australia, no ads`, ex)}
<p>You keep ${m(exR.gross - exR.fees)} of the ${m(exR.gross)} order before your own costs. Etsy takes ${pct(exR.feePct, 1)}.</p>

<h2 id="international">Domestic vs international orders</h2>
<p>The only fee that changes with the buyer's location is payment processing: 3% for a buyer in Australia, 4% for a buyer anywhere else. The fixed ${m(C.ppFlat)} stays the same. On a small order the gap is a few cents. On an ${m(120)} order an overseas buyer costs you ${m(ex120i.fees - ex120d.fees)} more in fees than a local one.</p>
${ladder(id, [15, 30, 60, 120, 250], 'buyer in Australia', 'buyer overseas')}
<p class="use"><button type="button" data-preset="au:intl">Calculate an international order</button></p>
<p>The calculator also shows the Offsite Ads fee. It is charged on top of everything above, and it is the biggest single fee you can pay on one order, so check the ads setting before you compare prices.</p>

<h2 id="digital">Etsy fees on digital downloads from Australia</h2>
<p>Digital files pay the same fees, without shipping. Most fees are percentages, but the listing fee and the ${m(C.ppFlat)} processing fee are fixed, so a cheap file loses a larger share.</p>
${exTable(`Example: ${m(12)} digital download bought by a buyer outside Australia`, dig)}
<p>Etsy keeps ${m(digR.fees)}, or ${pct(digR.feePct, 0)} of the price, leaving you ${m(digR.gross - digR.fees)}.</p>
<p class="use"><button type="button" data-preset="au:digital:intl">Calculate a digital product</button></p>

<h2 id="gst">GST on Etsy fees for Australian sellers</h2>
<p>Etsy quotes all of its fees without tax. Australia is one of the countries where Etsy collects tax on seller fees, and the rules depend on whether Etsy has your GST registration:</p>
<ul>
<li><strong>No GST registration in your Etsy account:</strong> GST is added to your seller fees and appears in your Payment account. Etsy sends a monthly invoice listing the fees and the tax charged.</li>
<li><strong>GST registration added as a VAT ID:</strong> Etsy does not charge GST on your fees. You still get a monthly invoice, stating that no GST was charged.</li>
</ul>
<p>At Australia's 10% GST rate, the ${m(exR.fees)} in fees on the example order above would carry about ${m(gstOnEx)} of GST if Etsy does not have your registration. The calculator leaves GST out, so add 10% to the fee total if this applies to you. Whether you should register for GST is a question for your accountant or the ATO. This page is not tax advice.</p>

<h2 id="currency">List in AUD to avoid the 2.5% conversion fee</h2>
<p>If your shop lists prices in US dollars while your payment account is in Australian dollars, Etsy charges 2.5% of each sale to convert it. On the ${m(exR.gross)} example order that adds ${m(conv.conversion)}, taking the fees from ${m(exR.fees)} to ${m(conv.fees)}.</p>

<h2 id="price">How to price for profit in Australia</h2>
<p>Say you want ${m(15)} profit on an item that costs ${m(8)} to make and ${m(10)} to post, and you charge the buyer ${m(10)} for shipping. With no ads, the item price needs to be at least:</p>
<ul>
<li><strong>${m(r2(rvD.price))}</strong> for a buyer in Australia</li>
<li><strong>${m(r2(rvI.price))}</strong> for a buyer overseas</li>
<li><strong>${m(r2(rvA.price))}</strong> for a buyer in Australia who came through a 15% Offsite Ad</li>
</ul>
<p>Switch the calculator to "Price from profit" to do this for your own numbers.</p>
<p class="use"><button type="button" data-preset="au:price">Work out my price</button></p>

<h2 id="other">Other countries</h2>
<p>Selling from somewhere else? See the <a href="/etsy-fees-canada">Etsy fee calculator for Canada</a>, or the <a href="/#by-country">fee table for ${F.countries.length} countries</a> on the main calculator.</p>
`;

    const faq = faqParts([
      ['What fees does Etsy charge Australian sellers?',
        `A US$0.20 listing fee, a 6.5% transaction fee on the item price plus shipping, and payment processing of 3% + A$0.25 for buyers in Australia or 4% + A$0.25 for buyers overseas. Offsite Ads add 15% or 12% on ad-driven orders. On an ${m(exR.gross)} domestic order the total is ${m(exR.fees)}, or ${pct(exR.feePct, 1)}.`],
      ['How much does Etsy take from an A$50 sale in Australia?',
        `On an ${m(50)} order to a buyer in Australia with no ads, Etsy takes ${m(fifty.fees)} (${pct(fifty.feePct, 1)}) and you keep ${m(fifty.gross - fifty.fees)} before your own costs and any GST on fees.`],
      ['Does Etsy charge a regulatory operating fee in Australia?',
        `No. Etsy lists the regulatory operating fee only for sellers in ${REG_COUNTRIES}.`],
      ['Why do international orders cost more in fees?',
        'Etsy charges Australian sellers 4% + A$0.25 for payment processing when the buyer is outside Australia, instead of 3% + A$0.25. The other fees are the same.'],
      ['Does Etsy charge GST on its fees in Australia?',
        'Yes, unless you have added a GST registration to your Etsy account as a VAT ID. Without it, GST is added to your seller fees and shown in your Payment account, with a monthly invoice. With it, Etsy does not charge GST on fees.'],
      ['Should I list my Etsy shop in AUD or USD?',
        'In AUD, if your payment account is in Australian dollars. Listing in a different currency adds a 2.5% conversion fee to every sale.']
    ]);

    return {
      file: 'etsy-fees-australia.html',
      path: '/etsy-fees-australia',
      defaultCountry: id,
      title: 'Etsy Fee Calculator Australia 2026 (AUD): Fees &amp; Profit',
      desc: 'Etsy fees for Australian sellers in 2026: 6.5% transaction fee, 3% + A$0.25 processing on domestic orders and 4% + A$0.25 on international ones. Calculate fees and profit in AUD.',
      ogDesc: 'What Etsy keeps from an Australian sale, domestic or international, with GST on fees explained. Calculator in AUD.',
      h1: 'Etsy fee calculator for Australia',
      lede: 'Work out Etsy fees in Australian dollars for domestic and international orders, and see what you keep. Rates from Etsy\'s fee pages, checked October 2026.',
      nav: [['#calculator', 'Calculator'], ['#fees', 'Fees'], ['#international', 'International orders'], ['#gst', 'GST'], ['#faq', 'FAQ'], ['/', 'All countries']],
      article,
      faqH: 'Etsy fees in Australia: common questions',
      faqHtml: faq.html,
      faqEntities: faq.entities,
      sources: sources(['payments', 'fees', 'reg', 'vat']),
      appName: 'Etsy Fee Calculator for Australia',
      breadcrumb: 'Australia'
    };
  }

  /* ======================= CANADA ======================= */
  function canada() {
    const id = 'ca';
    const C = F.byId(id);
    const cur = C.currency;
    const m = (x) => money(x, cur);
    const listingLocal = F.LISTING_FEE_USD * F.FX[cur];
    const capLocal = F.ADS_CAP_USD * F.FX[cur];

    const ex = { country: id, price: 40, shipping: 12 };
    const exR = F.calc(ex);
    const ex120d = F.calc({ country: id, price: 120, shipping: 0 });
    const ex120i = F.calc({ country: id, price: 120, shipping: 0, intl: true });
    const reg100 = F.calc({ country: id, price: 100, shipping: 0 });
    const dig = { country: id, price: 12, shipping: 0 };
    const digR = F.calc(dig);
    const conv = F.calc(Object.assign({}, ex, { conversion: true }));
    const rv = { country: id, shipping: 12, cogs: 8, postage: 11, target: 15 };
    const rvD = F.reverse(rv);
    const rvI = F.reverse(Object.assign({}, rv, { intl: true }));
    const rvA = F.reverse(Object.assign({}, rv, { ads: 15 }));
    const fifty = F.calc({ country: id, price: 50, shipping: 0 });

    const article = `
<h2 id="fees">Etsy fees for Canadian sellers in 2026</h2>
<p>A Canadian shop pays the standard Etsy fees plus two things sellers in many other countries do not: a 0.50% regulatory operating fee on every sale, and tax on seller fees that depends on your province and registration. Payment processing has a detail that is easy to miss: orders from the United States are charged the same rate as orders from Canada.</p>
${glance([
  ['Listing fee', `US$0.20 (about ${m(listingLocal)})`, 'Each new listing and each renewal. A multi-unit listing renews, and pays again, every time one sells.'],
  ['Transaction fee', '6.5%', 'Item price plus shipping and gift wrap, on every sale.'],
  ['Regulatory operating fee', '0.50%', 'Item price plus shipping and gift wrap, on every sale.'],
  ['Payment processing', `3% + ${m(C.ppFlat)}`, 'Orders from buyers in Canada or the United States.'],
  ['Payment processing', `4% + ${m(C.ppFlat)}`, 'Orders from buyers in any other country.'],
  ['Offsite Ads', `15% or 12%, capped at US$100 (about ${m(capLocal)})`, 'Only orders that came through an Etsy ad on another website.'],
  ['Currency conversion', '2.5%', 'Only if you list in a currency other than CAD.'],
  ['Tax on fees', 'GST/HST, QST or PST', 'Depends on your province and on whether you are registered. See below.']
], 'Etsy fees for a shop with a Canadian bank account')}
<p>Etsy charges the listing fee and the Offsite Ads cap in US dollars. The CA$ amounts here use an approximate rate of 1 USD = ${F.FX[cur]} CAD, so they can be a few cents off.</p>
${exTable(`Example: ${m(40)} item with ${m(12)} shipping to a buyer in Canada, no ads`, ex)}
<p>You keep ${m(exR.gross - exR.fees)} of the ${m(exR.gross)} order before your own costs. Etsy takes ${pct(exR.feePct, 1)}.</p>

<h2 id="international">Orders from the US cost the same as domestic orders</h2>
<p>For Canadian sellers, Etsy groups buyers in the United States with buyers in Canada: both pay the 3% + ${m(C.ppFlat)} processing rate. Only orders from the rest of the world move to 4% + ${m(C.ppFlat)}. On a ${m(120)} order that difference is ${m(ex120i.fees - ex120d.fees)}.</p>
${ladder(id, [15, 30, 60, 120, 250], 'Canada or US buyer', 'other countries')}
<p>In the calculator, leave the international box unticked for buyers in Canada and the US, and tick it for everyone else.</p>
<p class="use"><button type="button" data-preset="ca:intl">Calculate an order from outside North America</button></p>

<h2 id="regulatory">The 0.50% regulatory operating fee</h2>
<p>Etsy charges Canadian sellers a regulatory operating fee on the item price plus shipping, gift wrap and personalization. Etsy says the fee covers the higher cost of operating under new regulations in some countries. At 0.50% it is small: ${m(reg100.regulatory)} on a ${m(100)} order. It shows in your Payment account with your other fees, and tax on fees can apply to it as well.</p>

<h2 id="digital">Etsy fees on digital downloads from Canada</h2>
<p>Digital files pay the same fees without shipping. Because the listing fee and the ${m(C.ppFlat)} processing fee are fixed, they take a bigger share of a cheap file.</p>
${exTable(`Example: ${m(12)} digital download bought by a buyer in Canada or the US`, dig)}
<p>Etsy keeps ${m(digR.fees)}, or ${pct(digR.feePct, 0)} of the price, leaving you ${m(digR.gross - digR.fees)}.</p>
<p class="use"><button type="button" data-preset="ca:digital:dom">Calculate a digital product</button></p>

<h2 id="sales-tax">GST/HST and tax on Etsy fees in Canada</h2>
<p>Since 1 July 2022 Etsy collects GST/HST from buyers in Canada on eligible orders and sends it to the tax authorities. Canadian rules also make Etsy charge tax on the fees it charges Canadian sellers. What you pay on your fees depends on where you are and whether your tax ID is in your Etsy account:</p>
<div class="tbl"><table><caption>Tax on Etsy seller fees for Canadian sellers</caption>
<thead><tr><th>Your situation</th><th>Tax on your Etsy fees</th></tr></thead><tbody>
<tr><td>GST/HST registered</td><td>GST/HST on all seller fees</td></tr>
<tr><td>Not GST/HST registered</td><td>No GST/HST on the transaction and processing fees of an order where Etsy already charged the buyer GST/HST. GST/HST on all other fees, such as listing and ads fees.</td></tr>
<tr><td>Quebec, QST registered</td><td>QST on all seller fees</td></tr>
<tr><td>Quebec, not QST registered</td><td>No QST on the transaction and processing fees of an order where Etsy already charged the buyer QST. QST on all other fees.</td></tr>
<tr><td>British Columbia</td><td>PST on all seller fees</td></tr>
<tr><td>Manitoba or Saskatchewan</td><td>No PST on seller fees</td></tr>
</tbody></table></div>
<p>Etsy notes that Canadian rules require sellers to register for GST/HST once they reach CA$30,000 in sales. The calculator leaves all of these taxes out, because the rate depends on your province. Ask your accountant whether you can reclaim tax paid on your fees. This page is not tax advice.</p>

<h2 id="currency">List in CAD to avoid the 2.5% conversion fee</h2>
<p>If your shop lists prices in US dollars while your payment account is in Canadian dollars, Etsy charges 2.5% of every sale to convert it, even though your US buyers get the domestic processing rate. On the ${m(exR.gross)} example order that adds ${m(conv.conversion)}, taking the fees from ${m(exR.fees)} to ${m(conv.fees)}.</p>

<h2 id="price">How to price for profit in Canada</h2>
<p>Say you want ${m(15)} profit on an item that costs ${m(8)} to make and ${m(11)} to post, and you charge the buyer ${m(12)} for shipping. With no ads, the item price needs to be at least:</p>
<ul>
<li><strong>${m(r2(rvD.price))}</strong> for a buyer in Canada or the US</li>
<li><strong>${m(r2(rvI.price))}</strong> for a buyer in another country</li>
<li><strong>${m(r2(rvA.price))}</strong> for a buyer in Canada or the US who came through a 15% Offsite Ad</li>
</ul>
<p>Switch the calculator to "Price from profit" to do this for your own numbers.</p>
<p class="use"><button type="button" data-preset="ca:price">Work out my price</button></p>

<h2 id="other">Other countries</h2>
<p>Selling from somewhere else? See the <a href="/etsy-fees-australia">Etsy fee calculator for Australia</a>, or the <a href="/#by-country">fee table for ${F.countries.length} countries</a> on the main calculator.</p>
`;

    const faq = faqParts([
      ['What fees does Etsy charge Canadian sellers?',
        `A US$0.20 listing fee, a 6.5% transaction fee and a 0.50% regulatory operating fee on the item price plus shipping, and payment processing of 3% + CA$0.25 for buyers in Canada or the US or 4% + CA$0.25 for buyers elsewhere. On a ${m(exR.gross)} domestic order the total is ${m(exR.fees)}, or ${pct(exR.feePct, 1)}.`],
      ['How much does Etsy take from a CA$50 sale in Canada?',
        `On a ${m(50)} order to a buyer in Canada or the US with no ads, Etsy takes ${m(fifty.fees)} (${pct(fifty.feePct, 1)}) and you keep ${m(fifty.gross - fifty.fees)} before your own costs and any tax on fees.`],
      ['Are orders from the US international for Canadian Etsy sellers?',
        'Not for payment processing. Etsy charges Canadian sellers 3% + CA$0.25 on orders from both Canada and the United States, and 4% + CA$0.25 on orders from other countries.'],
      ['What is the Etsy regulatory operating fee in Canada?',
        'It is 0.50% of the item price plus shipping, gift wrap and personalization, charged on every sale. Etsy shows it in your Payment account with your other fees.'],
      ['Does Etsy charge GST/HST on its fees in Canada?',
        'Yes. GST/HST registered sellers pay it on all seller fees. Sellers who are not registered pay it on all fees except the transaction and processing fees of orders where Etsy already charged the buyer GST/HST. Quebec, British Columbia, Manitoba and Saskatchewan have their own rules.'],
      ['Should I list my Etsy shop in CAD or USD?',
        'In CAD, if your payment account is in Canadian dollars. Listing in a different currency adds a 2.5% conversion fee to every sale.']
    ]);

    return {
      file: 'etsy-fees-canada.html',
      path: '/etsy-fees-canada',
      defaultCountry: id,
      title: 'Etsy Fee Calculator Canada 2026 (CAD): Fees &amp; Profit',
      desc: 'Etsy fees for Canadian sellers in 2026: 6.5% transaction fee, 0.50% regulatory fee, 3% + CA$0.25 processing on Canadian and US orders, 4% + CA$0.25 on others. Calculate in CAD.',
      ogDesc: 'What Etsy keeps from a Canadian sale, with the regulatory fee, US vs international orders and GST/HST on fees explained.',
      h1: 'Etsy fee calculator for Canada',
      lede: 'Work out Etsy fees in Canadian dollars, including the regulatory operating fee, for orders from Canada, the US and the rest of the world. Rates from Etsy\'s fee pages, checked October 2026.',
      nav: [['#calculator', 'Calculator'], ['#fees', 'Fees'], ['#international', 'US &amp; international'], ['#sales-tax', 'GST/HST'], ['#faq', 'FAQ'], ['/', 'All countries']],
      article,
      faqH: 'Etsy fees in Canada: common questions',
      faqHtml: faq.html,
      faqEntities: faq.entities,
      sources: sources(['payments', 'fees', 'reg', 'caTax']),
      appName: 'Etsy Fee Calculator for Canada',
      breadcrumb: 'Canada'
    };
  }

  return [australia(), canada()];
};
