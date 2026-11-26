(() => {
  'use strict';
  const WEEKS_PER_MONTH = 52 / 12;
  const defaults = { basis: 'monthly', pay: '', duration: '2', unit: 'months', days: '5', hours: '8', transport: '0', lunch: '0', other: '0', mpf: 'no', rate: '5', startMonth: '1', manualMPF: '0' };
  const numericFields = ['pay', 'duration', 'days', 'hours', 'transport', 'lunch', 'other', 'rate', 'startMonth', 'manualMPF'];

  // Pure calculation functions: no DOM, storage, requests or legal eligibility rules.
  function validateInput(input) {
    const errors = {};
    if (!['monthly', 'hourly', 'total'].includes(input.basis)) errors.basis = 'Choose a pay basis.';
    if (!['weeks', 'months'].includes(input.unit)) errors.unit = 'Choose weeks or months.';
    if (!['yes', 'no'].includes(input.mpf)) errors.mpf = 'Choose whether to include MPF.';
    const fields = ['pay', 'duration', 'days', 'hours', 'transport', 'lunch', 'other'];
    if (input.mpf === 'yes') fields.push(...(input.basis === 'monthly' ? ['rate', 'startMonth'] : ['manualMPF']));
    for (const key of fields) {
      const raw = input[key];
      const value = Number(raw);
      if (key === 'other' && (raw == null || String(raw).trim() === '')) continue;
      if (raw === '' || raw == null || (typeof raw === 'string' && !raw.trim())) errors[key] = 'Enter a value; use 0 if none.';
      else if (!Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER) errors[key] = 'Enter a finite number within the supported range.';
      else if (value < 0) errors[key] = 'Enter 0 or more.';
    }
    for (const key of ['duration', 'days', 'hours']) if (!errors[key] && Number(input[key]) <= 0) errors[key] = 'Enter a number greater than 0.';
    if (!errors.days && Number(input.days) > 7) errors.days = 'Use no more than 7 days per week.';
    if (!errors.hours && Number(input.hours) > 24) errors.hours = 'Use no more than 24 hours per day.';
    if (input.mpf === 'yes' && input.basis === 'monthly') {
      if (!errors.rate && Number(input.rate) > 100) errors.rate = 'Use a rate from 0 to 100%.';
      if (!errors.startMonth && (!Number.isInteger(Number(input.startMonth)) || Number(input.startMonth) < 1)) errors.startMonth = 'Enter a whole month number of 1 or more.';
    }
    return errors;
  }
  function normaliseInput(input) {
    return { ...input, ...Object.fromEntries(numericFields.map(key => [key, Number(input[key] || 0)])) };
  }
  function calculateWorkTime(input) {
    const weeks = input.unit === 'months' ? input.duration * WEEKS_PER_MONTH : input.duration;
    const months = input.unit === 'months' ? input.duration : weeks / WEEKS_PER_MONTH;
    const workdays = weeks * input.days;
    return { weeks, months, workdays, hours: workdays * input.hours };
  }
  function calculateGrossIncome(input, time) {
    if (input.basis === 'monthly') return input.pay * time.months;
    if (input.basis === 'hourly') return input.pay * time.hours;
    return input.pay;
  }
  function calculateExpenses(input, time) {
    const transport = input.transport * time.workdays;
    const lunch = input.lunch * time.workdays;
    return { transport, lunch, other: input.other, total: transport + lunch + input.other };
  }
  function calculateMPF(input, time) {
    if (input.mpf !== 'yes') return 0;
    if (input.basis !== 'monthly') return input.manualMPF;
    const contributionMonths = Math.min(time.months, Math.max(0, time.months - input.startMonth + 1));
    return input.pay * (input.rate / 100) * contributionMonths;
  }
  function calculateInternship(rawInput) {
    const errors = validateInput(rawInput);
    if (Object.keys(errors).length) { const error = new Error('Check the highlighted fields.'); error.fields = errors; throw error; }
    const input = normaliseInput(rawInput);
    const time = calculateWorkTime(input);
    const income = calculateGrossIncome(input, time);
    const expenses = calculateExpenses(input, time);
    const mpf = calculateMPF(input, time);
    const beforeMPF = income - expenses.total;
    const remaining = beforeMPF - mpf;
    const grossHourly = income / time.hours;
    const cashHourly = remaining / time.hours;
    const amounts = [time.hours, time.workdays, income, expenses.total, mpf, remaining, grossHourly, cashHourly];
    if (time.hours <= 0 || amounts.some(value => !Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER)) {
      const error = new Error('These values are too large or too small to calculate reliably.');
      error.fields = { duration: 'Check the duration, pay and schedule values.' }; throw error;
    }
    return { input, time, income, expenses, mpf, beforeMPF, remaining, grossHourly, cashHourly };
  }
  function calculateOfferComparison(a, b) {
    const offerA = calculateInternship(a), offerB = calculateInternship(b);
    return { offerA, offerB, difference: offerA.cashHourly - offerB.cashHourly };
  }
  // A single namespace lets the future story reuse the calculation engine.
  const api = { WEEKS_PER_MONTH, validateInput, calculateWorkTime, calculateGrossIncome, calculateExpenses, calculateMPF, calculateInternship, calculateOfferComparison };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.InternshipCalculator = api;
  if (typeof document === 'undefined') return;

  const root = document.getElementById('internship-calculator');
  if (!root) return;
  let mode = 'single', activeOffer = 'a';
  const money = value => {
    const rounded = Math.abs(value) < 0.005 ? 0 : value;
    return `${rounded < 0 ? '−' : ''}HK$${Math.abs(rounded).toLocaleString('en-HK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  const number = value => value.toLocaleString('en-HK', { maximumFractionDigits: 2 });
  const q = selector => root.querySelector(selector);
  const qa = selector => [...root.querySelectorAll(selector)];
  const fieldId = (offer, key) => `ic-${offer}-${key}`;
  function field(offer, key, label, options = {}) {
    const id = fieldId(offer, key);
    const hint = options.hint ? `<small id="${id}-hint">${options.hint}</small>` : '';
    const descriptions = `${id}-error${options.hint ? ` ${id}-hint` : ''}`;
    const control = options.options
      ? `<select id="${id}" name="${key}" aria-describedby="${descriptions}">${options.options.map(([value, text]) => `<option value="${value}"${defaults[key] === value ? ' selected' : ''}>${text}</option>`).join('')}</select>`
      : `<input id="${id}" name="${key}" type="number" inputmode="decimal" min="${options.min ?? 0}" ${options.max ? `max="${options.max}"` : ''} step="${options.step || 'any'}" value="${defaults[key]}" ${key === 'pay' ? 'placeholder="Enter pay; 0 for unpaid"' : ''} aria-describedby="${descriptions}">`;
    return `<div class="field ${options.wide ? 'wide' : ''}"><label for="${id}">${label}</label>${control}${hint}<span class="field-error" id="${id}-error"></span></div>`;
  }
  function offerForm(offer) {
    return `<section class="offer-card" data-offer="${offer}" aria-labelledby="ic-${offer}-title">
      <h3 id="ic-${offer}-title">${offer === 'a' ? 'My internship' : 'Offer B'}</h3>
      <fieldset><legend>01 / Pay & duration</legend><div class="fields">
        ${field(offer, 'basis', 'Pay basis', { wide: true, options: [['monthly', 'Monthly salary / allowance'], ['hourly', 'Hourly pay'], ['total', 'Total internship allowance']] })}
        ${field(offer, 'pay', 'Pay amount (HK$)', { wide: true })}
        ${field(offer, 'duration', 'Duration', { min: 0.01 })}
        ${field(offer, 'unit', 'Duration unit', { options: [['months', 'Months'], ['weeks', 'Weeks']] })}
      </div></fieldset>
      <fieldset><legend>02 / Working schedule</legend><div class="fields">
        ${field(offer, 'days', 'Working days / week', { min: 0.01, max: 7 })}
        ${field(offer, 'hours', 'Working hours / day', { min: 0.01, max: 24 })}
      </div></fieldset>
      <fieldset><legend>03 / Selected costs</legend><div class="fields">
        ${field(offer, 'transport', 'Daily transport (HK$)')}
        ${field(offer, 'lunch', 'Daily lunch (HK$)')}
        ${field(offer, 'other', 'Other costs · total (HK$)', { wide: true, hint: 'Optional. Required clothing, equipment or one-off work expenses. Use 0 if none.' })}
      </div></fieldset>
      <details class="mpf-details"><summary>Include MPF deduction? <span>Optional</span></summary><div class="mpf-content">
        ${field(offer, 'mpf', 'Include employee MPF?', { options: [['no', 'No'], ['yes', 'Yes']] })}
        <div data-mpf-fields hidden><div class="fields" data-monthly-mpf>
          ${field(offer, 'rate', 'Employee contribution rate (%)', { max: 100 })}
          ${field(offer, 'startMonth', 'Deduction starts from month', { min: 1, step: 1 })}
        </div><div data-manual-mpf hidden>${field(offer, 'manualMPF', 'Estimated total employee MPF deduction (HK$)', { hint: 'Enter your own total estimate for hourly pay or a total allowance.' })}</div></div>
        <p class="small">MPF treatment depends on the employment arrangement and contribution period. Use the settings that match your own situation. This calculator does not determine whether MPF legally applies to you.</p>
      </div></details>
    </section>`;
  }
  function initInternshipCalculator() {
    const autoExpand = new URLSearchParams(window.location.search).get('openCalculator') === 'true';
    const collapsed = root.dataset.collapsed === 'true' && !autoExpand;
    root.innerHTML = `<div class="calculator-shell">
      <p class="transition-line">You've seen what our interviewees put in and what they got back. Now try your own internship.</p>
      <div class="retro-window"><div class="window-bar"><span><i aria-hidden="true"></i> internship_costs.exe</span><span aria-hidden="true">— □ ×</span></div>
        <div class="collapsed-card" ${collapsed ? '' : 'hidden'}><span class="eyebrow">YOUR PLACEMENT, YOUR NUMBERS</span><h2>What does your internship really leave you with?</h2><p>Calculate your financial return after pay, working time and selected daily costs.</p><button type="button" class="primary" data-action="open" aria-expanded="false" aria-controls="ic-expanded">Open Calculator</button></div>
        <div id="ic-expanded" ${collapsed ? 'hidden' : ''}>
          <div class="intro-layout"><aside class="intro-panel">
            <div class="pixel-receipt" aria-hidden="true"><div class="receipt-screen">HK$<span>+ PAY<br>− COSTS<br>= CASH</span></div><div class="receipt-keys"><i></i><i></i><i></i><i></i><i></i><i></i></div></div>
            <p class="eyebrow">THE FINANCIAL SIDE</p><h2>Internship<br>Cost Calculator</h2><p class="subtitle">What does your internship really leave you with?</p><p>Enter your pay, working time and everyday internship costs to estimate how much cash remains across the placement.</p>
            <div class="privacy-note">LOCAL CALCULATIONS<br><span>Your inputs stay in this browser. No account. No uploads.</span></div>
          </aside><div class="workspace">
            <div class="mode-switch" role="group" aria-label="Calculator mode"><button type="button" data-mode="single" aria-pressed="true">My Internship</button><button type="button" data-mode="compare" aria-pressed="false">Compare Two Offers</button></div>
            <p class="form-intro">Start with your offer.<span>All amounts in Hong Kong dollars. Enter 0 for unpaid work or costs you want to exclude.</span></p>
            <form id="ic-form" novalidate><div class="offer-switch" role="group" aria-label="Edit offer" hidden><button type="button" data-edit="a" aria-pressed="true">Offer A</button><button type="button" data-edit="b" aria-pressed="false">Offer B</button></div><div class="offer-grid">${offerForm('a')}${offerForm('b')}</div>
              <p id="ic-form-error" class="error-summary" role="alert" hidden></p><div class="form-actions"><button type="submit" class="confirm" id="ic-calculate">Calculate My Internship</button><button type="button" class="reset" data-action="reset">Reset</button></div>
            </form>
          </div></div>
          <section id="ic-results" aria-label="Calculation results" hidden></section><p id="ic-announcement" class="sr-only" role="status" aria-live="polite"></p>
          <details class="assumptions"><summary>How this calculation works</summary><div><ul><li>1 month = 52 / 12 weeks. Workdays and hours use your regular schedule, with proportional partial months and no separate holiday or leave adjustment.</li><li>Transport and lunch use your daily figures × estimated workdays. Other costs are entered once for the whole placement.</li><li>Lunch is a selected workday cost, not automatically an additional cost caused by employment.</li><li>Gross hourly pay = gross income ÷ working hours. Cash remaining per working hour = (income − selected expenses − enabled MPF) ÷ working hours.</li><li>Monthly MPF uses your selected rate × monthly pay × contribution months, starting at your chosen month. Partial contribution months are proportional. This simple estimate does not apply eligibility rules, income thresholds, caps or calendar contribution periods. For hourly pay or total allowances, enter your own total deduction.</li><li>Results are estimates, calculated before rounding. This is not a legal wage calculation.</li></ul></div></details>
        </div><footer class="window-footer"><span>INTERNSHIP LIFE / COST CALCULATOR</span><span>HKD · ESTIMATES</span></footer>
      </div><p class="bottom-note">Money is one part of the story.</p></div>`;
    root.addEventListener('click', onClick);
    root.addEventListener('input', onInput);
    root.addEventListener('change', onInput);
    q('#ic-form').addEventListener('submit', event => { event.preventDefault(); calculateAndRender(); });
    setMode('single', false);
    ['a', 'b'].forEach(updateMPF);
    if (window.location.hash === '#calculator') document.getElementById('calculator')?.scrollIntoView({ block: 'start' });
  }
  function readOffer(offer) {
    return Object.fromEntries([...q(`[data-offer="${offer}"]`).querySelectorAll('input,select')].map(control => [control.name, control.value]));
  }
  function invalidateResults() { q('#ic-results').hidden = true; q('#ic-announcement').textContent = ''; }
  function clearErrors() {
    qa('[aria-invalid]').forEach(element => element.removeAttribute('aria-invalid'));
    qa('.field-error').forEach(element => { element.textContent = ''; });
    q('#ic-form-error').hidden = true;
  }
  function setMode(nextMode, focus = true) {
    mode = nextMode; root.dataset.mode = mode;
    qa('[data-mode]').forEach(button => button.setAttribute('aria-pressed', button.dataset.mode === mode));
    q('[data-offer="b"]').hidden = mode === 'single';
    q('.offer-switch').hidden = mode !== 'compare';
    q('#ic-a-title').textContent = mode === 'single' ? 'My internship' : 'Offer A';
    q('#ic-calculate').textContent = mode === 'single' ? 'Calculate My Internship' : 'Compare My Offers';
    selectOffer('a'); clearErrors(); invalidateResults();
    if (focus) q(`[data-mode="${mode}"]`).focus();
  }
  function selectOffer(offer) {
    activeOffer = offer; root.dataset.activeOffer = offer;
    qa('[data-edit]').forEach(button => button.setAttribute('aria-pressed', button.dataset.edit === offer));
  }
  function updateMPF(offer) {
    const card = q(`[data-offer="${offer}"]`), input = readOffer(offer);
    card.querySelector('[data-mpf-fields]').hidden = input.mpf !== 'yes';
    card.querySelector('[data-monthly-mpf]').hidden = input.basis !== 'monthly';
    card.querySelector('[data-manual-mpf]').hidden = input.basis === 'monthly';
    for (const key of ['rate', 'startMonth', 'manualMPF']) q(`#${fieldId(offer, key)}`).disabled = input.mpf !== 'yes' || (key === 'manualMPF' ? input.basis === 'monthly' : input.basis !== 'monthly');
  }
  function onInput(event) {
    if (!event.target.matches('input,select')) return;
    const card = event.target.closest('[data-offer]');
    if (event.target.name === 'basis' || event.target.name === 'mpf') updateMPF(card.dataset.offer);
    const error = q(`#${event.target.id}-error`); if (error) error.textContent = '';
    event.target.removeAttribute('aria-invalid');
    invalidateResults();
  }
  function onClick(event) {
    const button = event.target.closest('button'); if (!button) return;
    if (button.dataset.mode) return setMode(button.dataset.mode);
    if (button.dataset.edit) return selectOffer(button.dataset.edit);
    if (button.dataset.action === 'open') {
      q('.collapsed-card').hidden = true; q('#ic-expanded').hidden = false;
      button.setAttribute('aria-expanded', 'true');
      const heading = q('.intro-panel h2'); heading.tabIndex = -1; heading.focus({ preventScroll: true });
    }
    if (button.dataset.action === 'reset') resetCalculator();
    if (button.dataset.action === 'conclusion') {
      const target = document.querySelector('#conclusion');
      if (target) {
        if (!target.hasAttribute('tabindex')) { target.tabIndex = -1; target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true }); }
        target.focus({ preventScroll: true });
        target.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      } else q('#ic-conclusion-note').hidden = false;
    }
  }
  function resetCalculator() {
    q('#ic-form').reset(); ['a', 'b'].forEach(updateMPF);
    qa('.mpf-details').forEach(details => { details.open = false; });
    setMode('single', false); q('#ic-a-pay').focus();
  }
  function showErrors(offer, errors) {
    const card = q(`[data-offer="${offer}"]`);
    for (const [key, message] of Object.entries(errors)) {
      const control = q(`#${fieldId(offer, key)}`);
      control.setAttribute('aria-invalid', 'true'); q(`#${control.id}-error`).textContent = message;
      const details = control.closest('details'); if (details) details.open = true;
    }
    return card.querySelector('[aria-invalid]');
  }
  function calculateAndRender() {
    clearErrors(); invalidateResults();
    let firstInvalid = null, invalidOffer = null;
    const results = {};
    for (const offer of mode === 'single' ? ['a'] : ['a', 'b']) {
      try { results[offer] = calculateInternship(readOffer(offer)); }
      catch (error) { const first = showErrors(offer, error.fields); if (!firstInvalid) { firstInvalid = first; invalidOffer = offer; } }
    }
    if (firstInvalid) {
      selectOffer(invalidOffer); q('#ic-form-error').hidden = false;
      q('#ic-form-error').textContent = 'Check the highlighted fields before calculating.';
      firstInvalid.focus(); return;
    }
    if (mode === 'single') renderSingleResult(results.a);
    else renderComparison({ offerA: results.a, offerB: results.b, difference: results.a.cashHourly - results.b.cashHourly });
    const heading = q('#ic-result-title'); heading.focus({ preventScroll: true });
    q('#ic-results').scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    q('#ic-announcement').textContent = mode === 'single' ? `Calculation complete. Cash remaining per working hour: ${money(results.a.cashHourly)}.` : 'Comparison complete. Results are below the form.';
  }
  function breakdown(result) {
    const rows = [['Income', result.income, 'income'], ['Transport', result.expenses.transport, 'transport'], ['Lunch', result.expenses.lunch, 'lunch'], ['Other', result.expenses.other, 'other'], ...(result.input.mpf === 'yes' ? [['MPF', result.mpf, 'mpf']] : []), ['Remaining cash', result.remaining, 'remaining']];
    const scale = Math.max(1, ...rows.map(row => Math.abs(row[1])));
    return `<div class="breakdown"><h4>Where the money goes</h4><p class="small">Bar length shows magnitude. Signed amounts show cash left or a shortfall.</p>${rows.map(([label, value, key]) => `<div class="bar-row"><div><span>${label}</span><strong>${money(value)}</strong></div><div class="bar-track" aria-hidden="true"><span class="bar-${key}" style="width:${Math.abs(value) / scale * 100}%"></span></div></div>`).join('')}</div>`;
  }
  function resultCard(result, title) {
    const mpfEnabled = result.input.mpf === 'yes';
    const entries = [['Gross Income', money(result.income)], ['Estimated Working Hours', `${number(result.time.hours)} hours`], ['Gross Hourly Pay', `${money(result.grossHourly)} / hour`], ['Transport', money(result.expenses.transport)], ['Lunch', money(result.expenses.lunch)], ['Other Costs', money(result.expenses.other)], ['Total Selected Expenses', money(result.expenses.total)], ...(mpfEnabled ? [['Employee MPF Contribution', money(result.mpf)], ['Cash Remaining Before MPF', money(result.beforeMPF)], ['Estimated Cash Remaining After MPF', money(result.remaining)]] : [['Cash Remaining', money(result.remaining)]])];
    return `<article class="result-card"><h3>${title}</h3><div class="headline-result"><span>Cash Remaining per Working Hour</span><strong>${money(result.cashHourly)}</strong><small>per working hour</small></div><p class="small">Your advertised pay and your remaining cash are not the same thing.</p>${result.beforeMPF < 0 ? `<p class="neutral-note">Your selected costs exceed the income entered by ${money(-result.beforeMPF)} across this placement.</p>` : ''}${result.remaining < 0 && result.beforeMPF >= 0 ? `<p class="neutral-note">Your selected expenses and MPF deduction exceed the income entered by ${money(-result.remaining)} across this placement.</p>` : ''}<dl class="result-ledger">${entries.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}</dl>${!mpfEnabled ? '<p class="small">MPF excluded: HK$0.00 deducted. Cash remaining is unchanged by MPF.</p>' : ''}${breakdown(result)}</article>`;
  }
  function resultFooter() {
    return `<p class="wage-note">This is not your legal hourly wage. It is an estimate of how much cash remains after the expenses you choose to include.</p><div class="story-return"><p>Money is only part of the return. Our interviews also show that mentorship, training, workload and career opportunities shape how students evaluate an internship.</p><button type="button" class="primary" data-action="conclusion">Continue to the Conclusion ↓</button><p id="ic-conclusion-note" class="small" hidden>The conclusion will be available when this calculator is embedded in the full story.</p></div>`;
  }
  function renderSingleResult(result) {
    q('#ic-results').innerHTML = `<div class="result-heading"><span class="eyebrow">YOUR FINANCIAL SNAPSHOT</span><h2 id="ic-result-title" tabindex="-1">What stays in your pocket?</h2></div>${resultCard(result, 'My internship')}${resultFooter()}`;
    q('#ic-results').hidden = false;
  }
  function renderComparison(comparison) {
    const { offerA, offerB, difference } = comparison;
    const roundedDifference = Math.round(Math.abs(difference) * 100) / 100;
    const message = roundedDifference === 0 ? 'The offers leave the same cash per working hour to the nearest cent, based on the costs you entered.' : `Offer ${difference > 0 ? 'A' : 'B'} leaves approximately ${money(Math.abs(difference))} more cash per working hour than Offer ${difference > 0 ? 'B' : 'A'} based on the costs you entered.`;
    q('#ic-results').innerHTML = `<div class="result-heading"><span class="eyebrow">TWO OFFERS, ONE VIEW</span><h2 id="ic-result-title" tabindex="-1">Compare the financial return.</h2></div><p class="comparison-summary">${message}</p><p class="small comparison-context">Financial return is only one part of an internship. Training, mentorship, workload and career opportunities may also affect its value.</p><div class="comparison-results">${resultCard(offerA, 'Offer A')}${resultCard(offerB, 'Offer B')}</div>${resultFooter()}`;
    q('#ic-results').hidden = false;
  }
  initInternshipCalculator();
})();
