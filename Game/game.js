(() => {
'use strict';

// Change this one value to 8 or 10 for a longer game. Keep 2 pay-sensitive
// events; additional rounds draw from the shared pool (maximum 14 rounds).
const ROUNDS_PER_GAME = 6;
const root = document.getElementById('internship-game');
if (!root) return;
root.innerHTML = `<header class="masthead"><a href="#game" aria-label="Internship Life home">IL<span>INTERNSHIP LIFE</span></a><span>HONG KONG · A STUDENT STORY</span></header>
<div class="desktop">
<div class="window-bar"><span><i></i> internship_life.exe</span><span aria-hidden="true">— □ ×</span></div>
<div class="game-layout">
<aside class="scene-panel">
<div class="scene-label"><span id="ig-scene-location">FIRST DAY, NEW POSSIBILITIES</span><span aria-hidden="true">✦</span></div>
<div class="illustration" role="img" aria-label="Pixel-style Hong Kong office with a student, desk and city skyline">
<div class="office-window"><div class="cloud cloud-one"></div><div class="cloud cloud-two"></div><div class="skyline"><i></i><i></i><i></i><i></i><i></i><i></i></div></div>
<div class="wall-note">ONE DAY<br>AT A TIME.</div><div class="clock"></div>
<div class="plant"><i></i><b></b></div>
<div class="avatar"><div class="hair"></div><div class="face"><i></i></div><div class="body"><span></span></div></div>
<div class="desk"><div class="laptop"><span>hello, intern.</span></div><div class="mug"></div><div class="notebook"></div></div>
<div class="floor"></div><div class="scene-caption">A new desk. A different kind of learning.</div>
</div>
<div class="id-card"><div class="id-icon" aria-hidden="true">ID</div><div><span>YOUR ROLE</span><strong>University intern</strong><small id="ig-type-label">Hong Kong · Your story starts here</small></div></div>
<section id="ig-stats" class="stats" aria-label="Your internship stats" hidden></section>
<div id="ig-start-note" class="side-note">${ROUNDS_PER_GAME} moments at work.<br>What will you take home?</div>
</aside>
<section class="content-panel" id="ig-screen" aria-label="Game screen"></section>
</div>
<footer class="window-footer"><span id="ig-status-label">READY WHEN YOU ARE</span><span>${ROUNDS_PER_GAME} ROUNDS${ROUNDS_PER_GAME === 6 ? ' · 3–5 MIN' : ''}</span></footer>
</div>
<footer class="page-footer">An interactive introduction to the internship experience.<span>Made of choices. Shaped by trade-offs.</span></footer>`;
const getGameElement = id => root.querySelector(`#ig-${id}`);


// Edit starting conditions here. Cash is a simulation score, not HK dollars.
const internshipTypes = {
  normal: { name: 'Normal-paid', cash: 75, energy: 65, growth: 50, career: 50, description: 'You have a paid placement and a stronger financial starting point. The work, support and opportunities ahead are still unknown.' },
  low: { name: 'Low-paid', cash: 50, energy: 65, growth: 50, career: 50, description: 'Your placement provides a modest allowance. Everyday costs will matter, alongside the work, support and opportunities ahead.' },
  unpaid: { name: 'Unpaid', cash: 30, energy: 65, growth: 50, career: 50, description: 'Your placement offers no salary. You will cover workday expenses as you discover what the experience has to offer.' }
};
const statKeys = ['cash', 'energy', 'growth', 'career'];
const statNames = { cash: 'Cash', energy: 'Energy', growth: 'Growth', career: 'Career' };
const statColors = { cash: '#a8c99a', energy: '#e8b0c5', growth: '#b9a8dd', career: '#91bdcf' };
// Content helpers only: each resulting event has a full editable data structure.
function choice(text, cash, energy, growth, career, consequence) {
  return { text, effects: { cash, energy, growth, career }, consequence };
}
function event(id, type, title, text, choices, sourceTheme) {
  return { id, pool: type === 'shared' ? 'shared' : 'pay-sensitive', eligibleInternshipTypes: type === 'shared' ? ['normal', 'low', 'unpaid'] : [type], title, text, choices, sourceNote: `Adapted from the supplied interview-pattern brief: ${sourceTheme}.` };
}

const events = [
  event('shared_expectations', 'shared', 'Just as described', 'The work on your desk matches the role you applied for. You know what is expected. How do you use that clarity?', [
    choice('Build confidence in your assigned work', 0, 4, 5, -3, 'A steady pace helps you settle in and practise. You leave less room for broader exposure.'),
    choice('Ask for additional responsibility', 0, -8, 8, 5, 'You stretch beyond the job description. There is more to learn, and more to carry.')
  ], 'duties matching expectations'),
  event('shared_light', 'shared', 'A quiet afternoon', 'You finish earlier than expected. The workload is lighter than you imagined, and there is space in your afternoon.', [
    choice('Keep the lighter pace', 0, 9, -4, -3, 'You get some breathing room. Today brings little new practice or visibility.'),
    choice('Ask for a more meaningful task', 0, -6, 8, 4, 'You find something new to work on. The quiet afternoon becomes a busy one.')
  ], 'lighter workload'),
  event('shared_difficult', 'shared', 'Bigger than the brief', 'The project is more complex than you expected. You have an outline, but several parts are unfamiliar.', [
    choice('Work through it independently', 0, -11, 9, 5, 'Trial and error builds your confidence. Finding a way through takes a lot of energy.'),
    choice('Ask your supervisor for guidance', 0, -4, 7, 3, 'A conversation clarifies the task. You spend time preparing questions and working through the advice.')
  ], 'unexpected project difficulty'),
  event('shared_checkin', 'shared', 'Time for a check-in', 'Your supervisor sits down with you to discuss progress and the problems you have encountered.', [
    choice('Bring questions and work through them', 0, -4, 9, 4, 'You leave with useful guidance and a longer list of things to practise.'),
    choice('Give a short update and keep working independently', 0, -7, 5, 6, 'You practise owning your decisions and communicating progress. More problem-solving stays with you.')
  ], 'regular supervisor guidance'),
  event('shared_feedback', 'shared', 'Notes in the margins', 'A colleague returns your work with detailed comments. You can revisit it carefully or move on to the next task.', [
    choice('Revise carefully using the feedback', 0, -7, 11, 4, 'You understand why the changes matter. Careful revision takes time and concentration.'),
    choice('Apply the key notes to your next task', 0, 4, 3, -3, 'You maintain a manageable pace and use the main lesson. Some finer points remain unexplored.')
  ], 'detailed feedback'),
  event('shared_routine', 'shared', 'Another spreadsheet', 'The next task is repetitive administrative work. It needs doing, but it offers little that is new to you.', [
    choice('Finish the routine work steadily', 0, 4, -4, 3, 'The familiar task is manageable, and colleagues can rely on you. Your learning slows for now.'),
    choice('Ask for learning-focused work alongside it', 0, -7, 8, 3, 'You make room for a new task while still helping with the admin. Your workload grows.')
  ], 'routine administrative duties'),
  event('shared_ownership', 'shared', 'This one is yours', 'You are trusted to manage a task more independently. Your supervisor leaves you room to decide how it gets done.', [
    choice('Take full ownership', 0, -10, 8, 9, 'You gain experience making decisions and being accountable. That responsibility is demanding.'),
    choice('Arrange closer supervision', 0, -4, 9, 3, 'Regular guidance helps you develop your approach. You spend more time reviewing each step together.')
  ], 'independent responsibility'),
  event('shared_lead', 'shared', 'At the front of the room', 'There is an opportunity to lead a small team activity. You can take the lead or contribute from a supporting role.', [
    choice('Lead the activity', 0, -10, 7, 10, 'You practise leading and become more visible to colleagues. Preparation uses up your spare energy.'),
    choice('Take a supporting role', 0, 5, 3, -4, 'You contribute at a comfortable pace and observe the process. You have fewer chances to build visibility.')
  ], 'leading an activity'),
  event('shared_skill', 'shared', 'Beyond the lecture hall', 'A task uses a practical skill you have not fully covered at university. You can explore it deeply or learn enough for today.', [
    choice('Spend extra effort learning the skill', 0, -9, 12, 4, 'Practice gives you a stronger grasp of the skill. It takes effort beyond the immediate task.'),
    choice('Learn what the assigned task needs', 0, -3, 5, 3, 'You gain a useful starting point while keeping the task contained. Deeper practice will have to wait.')
  ], 'new practical skills'),
  event('shared_network', 'shared', 'A conversation after work', 'Colleagues and industry contacts are staying to chat. It could be a chance to learn about their work.', [
    choice('Stay, ask questions and make connections', 0, -8, 4, 11, 'You hear different perspectives and build connections. The extra social time leaves you tired.'),
    choice('Keep conversations within the workday', 0, 6, 0, -4, 'You protect your time to recharge. There are fewer informal opportunities to get to know people.')
  ], 'networking opportunities'),
  event('shared_future', 'shared', 'Keep in touch?', 'A supervisor mentions a recommendation or possible future work. Nothing is confirmed, but you could follow up.', [
    choice('Follow up and discuss what might be possible', 0, -6, 3, 10, 'You invest time in keeping the relationship active. A possible opportunity remains just that for now.'),
    choice('Finish the placement without further commitments', 0, 7, 0, -4, 'You keep room for other plans. This connection gets less attention after the placement.')
  ], 'recommendations and future opportunities'),
  event('shared_no_return', 'shared', 'What comes next?', 'The internship is nearing its end. There is still no clear return offer or permanent role on the horizon.', [
    choice('Ask directly about future openings', 0, -5, 0, 7, 'You make your interest known and practise a difficult conversation. An offer is still uncertain.'),
    choice('Prepare to use this experience elsewhere', 0, -3, 0, 5, 'You spend time putting your experience into words for other applications. The next step takes work too.')
  ], 'no clear return opportunity'),
  event('normal_responsibility', 'normal', 'More than you signed up for', 'A demanding project brings more responsibility than expected. You are paid, but you wonder how the salary compares with what is being asked.', [
    choice('Take on the full project', 0, -13, 9, 10, 'You gain substantial responsibility and experience. Your pay stays the same while the work becomes heavier.'),
    choice('Discuss the scope before moving ahead', 0, -4, 5, 4, 'You spend time clarifying priorities and a manageable scope. The learning opportunity becomes more focused.')
  ], 'paid work exceeding expected responsibility'),
  event('normal_tradeoff', 'normal', 'The pay and the pace', 'The salary feels relatively reasonable to you. The workload is demanding, though, and workdays still have their costs.', [
    choice('Accept the pace for the experience', -5, -10, 9, 7, 'You keep investing in the work and its learning opportunities. Busy days draw on both your energy and spending money.'),
    choice('Protect your time and plan your spending', 3, 6, -4, -3, 'You make the placement more manageable. You pass on some extra tasks and exposure.')
  ], 'pay compared with demanding workload'),
  event('normal_drained', 'normal', 'Paid, but running low', 'Money is less of a worry right now. Your workload, however, is leaving you with less energy at the end of each day.', [
    choice('Push through the next stretch', 0, -14, 8, 7, 'You keep building experience, but your energy drops further. The salary does not make the tiredness disappear.'),
    choice('Raise your workload concerns', 0, 8, -3, -3, 'You agree to slow the pace and give up some additional work. There is more room to recover.')
  ], 'exhaustion despite pay'),
  event('normal_enough', 'normal', 'Is the pay enough?', 'Between difficult tasks, responsibility and long hours, you start weighing what you want from the rest of this placement.', [
    choice('Prioritise the challenging experience', 0, -11, 10, 6, 'You choose to keep stretching your skills. The pressure continues alongside the learning.'),
    choice('Prioritise a sustainable workload', 0, 8, -4, -3, 'You focus on a smaller set of responsibilities. You regain energy while giving up some chances to stretch.')
  ], 'reflection on pay and work demands'),
  event('low_expenses', 'low', 'Where did the allowance go?', 'Transport and lunch take a noticeable share of your allowance. There is less left over than you expected.', [
    choice('Keep your routine and absorb the cost', -10, 4, 0, 0, 'Your familiar routine makes the day easier. Daily expenses eat into the value of the allowance.'),
    choice('Cut spending and prepare more at home', -4, -5, 0, 0, 'You reduce the financial hit. Planning meals and managing a tighter budget takes extra effort.')
  ], 'daily costs reducing allowance'),
  event('low_light', 'low', 'Less pay, more breathing room', 'The pay is low, but the workload is lighter than expected. You have time to decide how much more you want to take on.', [
    choice('Use the breathing room to recover', -3, 10, -4, 0, 'The lighter days restore your energy. Expenses continue, and there is little new learning.'),
    choice('Use the spare time to practise new skills', -3, -5, 10, 3, 'You create more learning value from the placement. The extra effort does not change the allowance.')
  ], 'low pay with light workload'),
  event('low_feedback', 'low', 'Good feedback, modest pay', 'A colleague gives useful, practical feedback. You can see how much there is to learn, even though the salary is modest.', [
    choice('Invest more effort in the learning', 0, -9, 12, 6, 'You put the advice into practice and develop your skills. That progress asks more of your energy.'),
    choice('Keep your effort within the agreed workload', 0, 5, 3, -3, 'You use the main feedback without taking on extra work. You have less time for deeper collaboration.')
  ], 'strong feedback despite low pay'),
  event('low_future', 'low', 'A door left open', 'The allowance is small, but your supervisor mentions a recommendation or possible freelance work after the placement.', [
    choice('Invest time in continuing the relationship', 0, -7, 5, 11, 'You discuss ways to stay involved. You build a connection, though future work is not guaranteed.'),
    choice('Keep your next steps open', 0, 6, 0, -4, 'You avoid an extra commitment and keep time for other plans. This potential connection receives less attention.')
  ], 'future opportunities after low-paid work'),
  event('unpaid_cost', 'unpaid', 'It costs to show up', 'There is no salary coming in. Transport, lunch and other workday expenses still need to come out of your own budget.', [
    choice('Keep your routine to focus on the work', -12, -3, 5, 0, 'Your routine lets you concentrate on learning, but the placement continues to cost money and energy.'),
    choice('Reorganise your days around a tighter budget', -5, -7, 3, 0, 'You preserve more of your cash while gaining practice at work. Budgeting and preparation make the days more tiring.')
  ], 'costs of unpaid work'),
  event('unpaid_credit', 'unpaid', 'More than a pay decision', 'This placement is connected to an academic requirement. Completing it matters for your course as well as your experience.', [
    choice('Focus on completing the requirement', 0, -3, 4, 3, 'You keep the required work on track. The placement still takes energy, with some learning along the way.'),
    choice('Seek more learning value from the placement', 0, -9, 10, 6, 'You ask for tasks that develop your skills while meeting the requirement. Your days become fuller.')
  ], 'internship connected to academic credit'),
  event('unpaid_travel', 'unpaid', 'Another stop on the route', 'Work activities take you to different locations. The extra travel adds transport costs and time pressure to an unpaid placement.', [
    choice('Take the trips as part of the experience', -10, -9, 9, 4, 'You gain experience across different work settings. The journeys cost both time and money.'),
    choice('Discuss ways to reduce unnecessary travel', -4, -4, 4, 3, 'You work through travel priorities with your supervisor. Some travel remains, alongside a more focused learning experience.')
  ], 'additional travel during unpaid work'),
  event('unpaid_meaning', 'unpaid', 'A lot learned. Nothing paid.', 'Hands-on work and professional feedback are helping you grow. The experience feels meaningful, but there is still no salary.', [
    choice('Keep investing in the hands-on experience', -8, -9, 12, 8, 'You develop your skills and professional connections. The financial and energy costs keep adding up.'),
    choice('Limit extra tasks to contain your costs', -3, 5, 3, -4, 'You keep learning within a smaller commitment and regain some energy. There is less room for additional exposure.')
  ], 'meaningful learning without salary')
];

// Ordered rules: specific combinations precede broader profiles. No pay-type checks.
const endings = [
  { title: 'High Cost, Limited Return', test: s => s.cash < 35 && s.energy < 35 && s.growth < 65 && s.career < 65, text: 'The placement used up money and energy, while learning and career gains stayed limited. In this run, the costs were more visible than the returns.' },
  { title: 'Paid, But Drained', test: s => s.cash >= 60 && s.energy <= 30, text: 'Your financial position held up, but your energy fell sharply. The money and the workload tell different parts of your internship story.' },
  { title: 'Growth Came at a Cost', test: s => s.growth >= 75 && s.career >= 70 && (s.cash < 35 || s.energy < 35), text: 'You built skills and professional connections, with a significant cost to your finances or energy. Those gains sit alongside the resources you spent reaching them.' },
  { title: 'Learning Rich, Cash Poor', test: s => s.growth >= 70 && s.cash < 35, text: 'You leave with practical learning, but little financial breathing room. The experience developed your skills while asking you to absorb its costs.' },
  { title: 'Balanced Return', test: s => s.cash >= 45 && s.energy >= 45 && s.growth >= 60 && s.career >= 60, text: 'You found learning and career value while keeping your finances and energy relatively steady. Your choices produced a workable balance across all four dimensions.' },
  { title: 'Career Boost', test: s => s.career >= 80, text: 'Connections, visibility and future possibilities stand out in your review. Those possibilities are a career gain in this simulation, rather than a guaranteed job offer.' },
  { title: 'Mixed Experience', test: () => true, text: 'Your placement brought a mixture of gains and trade-offs. Look across all four scores: the value of your experience cannot be captured by pay alone.' }
];
let gameState;
const screen = getGameElement('screen');
const statsElement = getGameElement('stats');
function freshState() { return { phase: 'start', type: null, stats: null, deck: [], round: 0, history: [], answered: false }; }
function shuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
  return result;
}
function buildEventDeck(type) {
  const shared = events.filter(e => e.pool === 'shared');
  const specific = events.filter(e => e.pool === 'pay-sensitive' && e.eligibleInternshipTypes.includes(type));
  const paySensitiveCount = 2;
  const sharedCount = ROUNDS_PER_GAME - paySensitiveCount;
  if (!Number.isInteger(ROUNDS_PER_GAME) || sharedCount < 1 || sharedCount > shared.length || specific.length < paySensitiveCount) {
    throw new RangeError('Choose 3–14 rounds with the current event library.');
  }
  return shuffle([...shuffle(shared).slice(0, sharedCount), ...shuffle(specific).slice(0, paySensitiveCount)]);
}
function showScreen(markup, focus = true) {
  screen.innerHTML = markup;
  screen.classList.remove('enter');
  void screen.offsetWidth;
  screen.classList.add('enter');
  if (focus) { const heading = screen.querySelector('h1,h2'); heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
}
function startGame(focus = false) {
  gameState = freshState();
  root.querySelector('.desktop').classList.remove('playing', 'review');
  statsElement.hidden = true;
  getGameElement('start-note').hidden = false;
  getGameElement('type-label').textContent = 'Hong Kong · Your story starts here';
  getGameElement('scene-location').textContent = 'FIRST DAY, NEW POSSIBILITIES';
  getGameElement('status-label').textContent = 'READY WHEN YOU ARE';
  showScreen(`<p class="eyebrow">A SHORT INTERACTIVE STORY</p><span class="pill">YOUR FIRST DAY STARTS HERE</span><h1>Internship<br>Life</h1><p class="subtitle">What will your internship<br>really give you?</p><p class="muted">Step into the shoes of a university intern in Hong Kong. Navigate ${ROUNDS_PER_GAME} workplace moments and see what you take away.</p><div class="actions"><button class="primary" data-action="random">Randomise My Internship</button><button data-action="choose">Choose My Internship</button></div><p class="muted" style="margin-top:24px;font-size:12px">One placement. Four dimensions. No single right path.</p>`, focus);
}
function chooseInternship(type) {
  if (!type) {
    gameState.phase = 'choose';
    showScreen(`<p class="eyebrow">BEFORE YOU CLOCK IN</p><h2>Choose your starting point.</h2><p class="muted">Pay changes your starting Cash. Your learning, energy and career potential begin at the same level.</p><div class="actions">${Object.entries(internshipTypes).map(([key,t]) => `<button data-type="${key}">${t.name}<small>Starting Cash: ${t.cash} / 100</small></button>`).join('')}</div><button class="text-button" data-action="restart">Back to start</button>`);
    return;
  }
  const config = internshipTypes[type];
  gameState = { ...freshState(), phase: 'profile', type, stats: Object.fromEntries(statKeys.map(k => [k, config[k]])), deck: buildEventDeck(type) };
  getGameElement('type-label').textContent = `${config.name} internship`;
  getGameElement('start-note').hidden = true;
  statsElement.hidden = false;
  updateStats();
  showScreen(`<p class="eyebrow">YOUR PLACEMENT CARD</p><h2>${config.name}<br>internship</h2><p>${config.description}</p><div class="profile-values">${statKeys.map(k => `<span>${statNames[k]} · ${config[k]}</span>`).join('')}</div><p class="profile-note">Cash tracks financial breathing room; Energy tracks how you are coping. Growth is learning and support. Career is connections and future possibilities.</p><p class="muted">Each choice changes your scores. They are game values, not money amounts or a prediction of your real internship.</p><button class="primary" data-action="begin">Start my first day</button><button class="text-button" data-action="choose">Choose a different placement</button>`);
}
function randomiseInternship() { chooseInternship(['normal', 'low', 'unpaid'][Math.floor(Math.random() * 3)]); }
function selectEvent() { return gameState.deck[gameState.round]; }
function renderEvent() {
  gameState.phase = 'event'; gameState.answered = false;
  root.querySelector('.desktop').classList.add('playing');
  getGameElement('scene-location').textContent = 'AT THE OFFICE · HONG KONG';
  getGameElement('status-label').textContent = `ROUND ${gameState.round + 1} OF ${ROUNDS_PER_GAME} · YOUR MOVE`;
  const current = selectEvent();
  showScreen(`<p class="eyebrow">ROUND ${gameState.round + 1} / ${ROUNDS_PER_GAME}</p><div class="progress" aria-hidden="true">${gameState.deck.map((_,i) => `<i class="${i <= gameState.round ? 'done' : ''}"></i>`).join('')}</div><h2>${current.title}</h2><p class="scenario">${current.text}</p><div class="choices">${current.choices.map((c,i) => `<button class="choice" data-choice="${i}"><b aria-hidden="true">${i ? 'B' : 'A'}</b><span>${c.text}</span></button>`).join('')}</div><div id="ig-consequence" aria-live="polite" aria-atomic="true"></div>`);
}
function applyEffects(base) {
  const changes = {};
  for (const key of statKeys) {
    const value = base[key];
    // Zero remains zero; nonzero effects keep their direction even at small magnitudes.
    const delta = value === 0 ? 0 : Math.sign(value) * Math.max(1, Math.abs(value) + Math.floor(Math.random() * 5) - 2);
    const old = gameState.stats[key];
    gameState.stats[key] = Math.max(0, Math.min(100, old + delta));
    changes[key] = gameState.stats[key] - old;
  }
  return changes;
}
function updateStats() {
  if (!statsElement.children.length) statsElement.innerHTML = statKeys.map(k => `<div><div class="stat-label"><span>${statNames[k]}</span><span id="ig-value-${k}"></span></div><div class="track" role="progressbar" aria-label="${statNames[k]}" aria-valuemin="0" aria-valuemax="100" id="ig-bar-${k}"><div class="fill" style="--stat-color:${statColors[k]};width:0%"></div></div></div>`).join('');
  for (const key of statKeys) { const score = gameState.stats[key]; getGameElement(`value-${key}`).textContent = `${score}/100`; const bar = getGameElement(`bar-${key}`); bar.setAttribute('aria-valuenow', score); bar.firstElementChild.style.width = `${score}%`; }
}
function renderConsequence(index) {
  if (gameState.phase !== 'event' || gameState.answered) return;
  gameState.answered = true;
  const current = selectEvent(), selected = current.choices[index];
  const changes = applyEffects(selected.effects);
  gameState.history.push({ round: gameState.round + 1, eventId: current.id, title: current.title, choice: selected.text, changes });
  screen.querySelectorAll('[data-choice]').forEach((button,i) => { button.disabled = true; button.classList.toggle('selected', i === index); });
  updateStats();
  getGameElement('status-label').textContent = 'CHOICE RECORDED';
  getGameElement('consequence').innerHTML = `<div class="consequence"><div class="deltas">${statKeys.filter(k => selected.effects[k] !== 0).map(k => `<span class="delta">${statNames[k]} ${changes[k] > 0 ? '+' : ''}${changes[k]}</span>`).join('')}</div><p>${selected.consequence}</p></div><button class="next" data-action="next">${gameState.round === ROUNDS_PER_GAME - 1 ? 'See my internship review' : 'Next'}</button>`;
  screen.querySelector('[data-action="next"]').focus({preventScroll:true});
}
function calculateEnding(stats = gameState.stats) { return endings.find(ending => ending.test(stats)); }
function renderGameReview() {
  gameState.phase = 'review';
  root.querySelector('.desktop').classList.remove('playing'); root.querySelector('.desktop').classList.add('review');
  getGameElement('scene-location').textContent = 'END OF PLACEMENT';
  getGameElement('status-label').textContent = `${ROUNDS_PER_GAME} OF ${ROUNDS_PER_GAME} COMPLETE · TIME TO REFLECT`;
  const ending = calculateEnding();
  showScreen(`<p class="eyebrow">YOUR INTERNSHIP · ${internshipTypes[gameState.type].name.toUpperCase()}</p><span class="pill">PLACEMENT COMPLETE</span><h2 class="review-title">${ending.title}</h2><p>${ending.text}</p><h3>Final stats</h3><div class="profile-values">${statKeys.map(k => `<span>${statNames[k]} · ${gameState.stats[k]} / 100</span>`).join('')}</div><h3>Your journey</h3><ol class="timeline">${gameState.history.map(h => `<li>${h.choice}<small>${h.title}</small></li>`).join('')}</ol><div class="research-note story-transition"><h3>This was one possible internship experience.</h3><p>The situations in this game were adapted from patterns found in interviews with university interns in Hong Kong. But what happened to the students we actually spoke to?</p></div><div class="actions review-actions"><button class="secondary" data-action="story">Continue the Story ↓</button><button class="primary" data-action="calculator">Calculate My Internship</button><button data-action="restart">Play Again</button></div>`);
  // Copy the result so a story listener cannot mutate the game's state.
  window.dispatchEvent(new CustomEvent('internshipGameCompleted', {
    detail: { internshipType: gameState.type, stats: { ...gameState.stats }, ending: { title: ending.title, text: ending.text } }
  }));
}
// Same-page sections take precedence; standalone development keeps page fallbacks.
function navigateToSectionOrPage(sectionId, fallbackUrl) {
  const target = document.querySelector(sectionId);
  if (!target) { window.location.href = fallbackUrl; return; }
  // Move keyboard focus too, without leaving a permanent extra tab stop.
  if (!target.hasAttribute('tabindex')) {
    target.setAttribute('tabindex', '-1');
    target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
  }
  target.focus({ preventScroll: true });
  target.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
}
function restartGame() { statsElement.innerHTML = ''; startGame(true); }
screen.addEventListener('click', e => {
  const button = e.target.closest('button'); if (!button || button.disabled) return;
  if (button.dataset.type) return chooseInternship(button.dataset.type);
  if (button.dataset.choice !== undefined) return renderConsequence(Number(button.dataset.choice));
  switch (button.dataset.action) {
    case 'story': navigateToSectionOrPage('#main-story', 'story.html'); break;
    case 'calculator': navigateToSectionOrPage('#calculator', 'calculator.html'); break;
    case 'random': randomiseInternship(); break;
    case 'choose': chooseInternship(); break;
    case 'begin': if (gameState.phase === 'profile') renderEvent(); break;
    case 'restart': restartGame(); break;
    case 'next':
      if (!gameState.answered || gameState.phase !== 'event') return;
      if (gameState.round === ROUNDS_PER_GAME - 1) renderGameReview(); else { gameState.round++; renderEvent(); }
      break;
  }
});
startGame();

})();
