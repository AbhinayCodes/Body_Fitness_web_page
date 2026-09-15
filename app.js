const API_BASE = location.protocol === 'file:' ? 'http://127.0.0.1:8000/api' : '/api';
const state = { view: 'dashboard', modal: null, step: 1, mealDone: false, exerciseDone: [], profile: { name: 'Rahul', goal: 'Build muscle', days: '4 days / week', diet: 'Vegetarian' } };

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, { headers: { 'Content-Type': 'application/json' }, ...options });
  if (!response.ok) throw new Error(`API request failed: ${response.status}`);
  return response.json();
}

async function hydrate() {
  try {
    const saved = await api('/state');
    state.profile = saved.profile || state.profile;
    state.mealDone = Boolean(saved.mealDone);
  } catch (error) {
    console.info('Backend unavailable; using local preview state.', error);
  }
  render();
}

function saveProfile() {
  api('/profile', { method: 'PUT', body: JSON.stringify(state.profile) }).catch(console.error);
}

const exercises = [
  ['Incline dumbbell press', '3 sets  ·  8–10 reps'],
  ['Single-arm cable row', '3 sets  ·  10–12 reps'],
  ['Seated shoulder press', '3 sets  ·  8–10 reps'],
  ['Cable lateral raise', '3 sets  ·  12–15 reps'],
  ['Rope triceps extension', '2 sets  ·  12–15 reps']
];

function icon(name) { return { home: '⌂', workout: '↗', diet: '◒', calendar: '□', progress: '⌁', profile: '○' }[name] || '•'; }
function navButton(view, label) { return `<button class="${state.view === view ? 'active' : ''}" data-view="${view}"><span class="nav-icon">${icon(view)}</span>${label}</button>`; }
function render() {
  document.querySelector('#app').innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        <a class="brand" href="#"><span class="brand-mark"></span>formwell</a>
        <div class="nav-label">Your space</div>
        <nav class="nav">${navButton('dashboard','Today')}${navButton('workout','Workout')}${navButton('diet','Nutrition')}${navButton('calendar','Calendar')}${navButton('progress','Progress')}</nav>
        <div class="nav-label" style="margin-top:34px">Account</div><nav class="nav">${navButton('profile','Profile')}<button data-action="settings"><span class="nav-icon">⚙</span>Settings</button></nav>
        <div class="sidebar-bottom"><div class="avatar">RK</div><div><span class="user-name">${state.profile.name} Kumar</span><span class="user-meta">Build muscle · Week 06</span></div></div>
      </aside>
      <main class="main">${state.view === 'dashboard' ? dashboard() : pageView()}</main>
      <nav class="mobile-nav">${navButton('dashboard','Today')}${navButton('workout','Workout')}${navButton('diet','Nutrition')}${navButton('progress','Progress')}${navButton('profile','Profile')}</nav>
    </div>${state.modal ? modal() : ''}`;
  bind();
}
function dashboard() { return `
  <div class="topbar"><span class="eyebrow">Thursday · September 10, 2026</span><span class="date">Week 06 of 12</span></div>
  <section class="greeting"><div><span class="eyebrow">Good evening, ${state.profile.name}</span><h1>Make today count<br><em>without overthinking it.</em></h1></div><div class="streak"><strong>06</strong><span>day consistency streak</span></div></section>
  <section class="grid"><article class="card workout-card"><div class="card-title"><span class="micro">Today's workout · 07:00 PM</span><span class="micro">52 min</span></div><div class="workout-name">Upper<br>strength</div><div class="subtle">5 exercises · 15 working sets</div><div class="workout-footer"><span class="subtle">Focus: chest · back · shoulders</span><button class="primary" data-action="workout">Start workout&nbsp; ↗</button></div></article>
  <div><article class="card nutrition"><div class="card-title"><h2>Fuel for today</h2><span class="micro">82% on track</span></div><div class="macro-total">1,820 <span>/ 2,400 kcal</span></div><div class="progress-bar"><i style="width:76%"></i></div><div class="macro-row"><span>Protein</span><b>112 / 160 g</b></div><div class="macro-row"><span>Carbs</span><b>218 / 300 g</b></div><div class="macro-row"><span>Fats</span><b>48 / 75 g</b></div></article>
  <article class="card next-meal"><div class="card-title"><span class="micro">Next meal · 08:30 PM</span><span>↗</span></div><div class="meal-title">Paneer rice bowl</div><div class="meal-info"><span><b>520 kcal</b>energy</span><span><b>28g</b>protein</span><span><b>20 min</b>prep time</span></div><button class="outline" style="margin-top:21px" data-action="meal">${state.mealDone ? '✓ Logged for today' : 'View meal'}</button></article></div></section>
  <section class="lower-grid"><article class="card schedule"><div class="card-title"><h2>Your rhythm</h2><span class="micro">Today</span></div><div class="schedule-list"><div class="schedule-item"><span>07:30 AM</span>Breakfast</div><div class="schedule-item"><span>01:00 PM</span>Lunch</div><div class="schedule-item current"><span>07:00 PM</span>Workout <b>now</b></div><div class="schedule-item"><span>08:30 PM</span>Dinner</div><div class="schedule-item"><span>11:00 PM</span>Sleep</div></div></article><article class="card"><div class="card-title"><h2>Keep the momentum</h2><span class="micro">This week</span></div><div class="goal-row"><div class="goal-ring"><strong>82%</strong></div><div class="goal-copy"><h3>You're building a habit.</h3><p>3 of 4 workouts complete.<br>One focused session left.</p></div></div><div class="bars"><i style="height:48%"></i><i style="height:70%"></i><i style="height:85%"></i><i style="height:35%"></i><i style="height:60%"></i><i style="height:90%"></i><i style="height:20%"></i></div><div class="bar-labels"><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span></div></article></section>`; }
function pageView() { const title = { workout:'Workout plan', diet:'Nutrition plan', calendar:'Your calendar', progress:'Progress overview', profile:'Your profile' }[state.view] || 'Your space'; return `<div class="topbar"><span class="eyebrow">Formwell / ${title}</span><span class="date">${state.profile.name} Kumar</span></div><section class="greeting"><div><span class="eyebrow">Personalized for your life</span><h1>${title}<br><em>kept simple.</em></h1></div><button class="primary dark-button" data-action="onboarding">Edit my plan</button></section><div class="grid"><article class="card">${state.view === 'workout' ? workoutPage() : state.view === 'diet' ? dietPage() : state.view === 'progress' ? progressPage() : state.view === 'profile' ? profilePage() : calendarPage()}</article><article class="card nutrition"><div class="card-title"><h2>Today at a glance</h2></div><div class="macro-total">82 <span>consistency score</span></div><div class="progress-bar"><i style="width:82%"></i></div><p class="subtle" style="color:var(--muted);line-height:1.6">Small actions compound. Your plan adapts around the life you actually live.</p></article></div>`; }
function workoutPage(){ return `<div class="card-title"><h2>Upper strength</h2><span class="micro">52 min</span></div><div class="workout-list">${exercises.map((e,i)=>`<div class="exercise"><div><strong>${i+1}. ${e[0]}</strong><span>${e[1]}</span></div><button class="check ${state.exerciseDone.includes(i)?'done':''}" data-exercise="${i}">${state.exerciseDone.includes(i)?'✓':''}</button></div>`).join('')}</div><button class="primary dark-button" style="margin-top:22px" data-action="complete">${state.exerciseDone.length === 5 ? 'Finish workout' : 'Log each set above'}</button>`; }
function dietPage(){ return `<div class="card-title"><h2>Thursday's meals</h2><span class="micro">2,400 kcal target</span></div><div class="schedule-list"><div class="schedule-item"><span>07:30 AM</span>Greek yogurt & oats <b>520 kcal</b></div><div class="schedule-item"><span>01:00 PM</span>Rajma quinoa bowl <b>640 kcal</b></div><div class="schedule-item current"><span>05:30 PM</span>Banana protein shake <b>280 kcal</b></div><div class="schedule-item"><span>08:30 PM</span>Paneer rice bowl <b>520 kcal</b></div></div><button class="primary dark-button" style="margin-top:24px" data-action="meal">${state.mealDone?'Meal logged ✓':'Log next meal'}</button>`; }
function progressPage(){ return `<div class="card-title"><h2>Progress worth noticing</h2><span class="micro">Last 6 weeks</span></div><div class="goal-row"><div class="goal-ring"><strong>+8%</strong></div><div class="goal-copy"><h3>Strength is trending up.</h3><p>Bench press: 50kg → 60kg<br>Average workout: 4 / week</p></div></div><div class="bars" style="height:150px;margin-top:28px"><i style="height:30%"></i><i style="height:48%"></i><i style="height:44%"></i><i style="height:65%"></i><i style="height:71%"></i><i style="height:86%"></i></div><div class="bar-labels"><span>W1</span><span>W2</span><span>W3</span><span>W4</span><span>W5</span><span>W6</span></div>`; }
function calendarPage(){ return `<div class="card-title"><h2>September 2026</h2><span class="micro">4 workouts planned</span></div><div class="schedule-list"><div class="schedule-item"><span>Mon 07</span>Lower body <b>✓</b></div><div class="schedule-item"><span>Tue 08</span>Rest day</div><div class="schedule-item current"><span>Thu 10</span>Upper strength <b>Today</b></div><div class="schedule-item"><span>Sat 12</span>Lower body</div></div>`; }
function profilePage(){ return `<div class="card-title"><h2>${state.profile.name} Kumar</h2><span class="micro">Profile</span></div><div class="schedule-list"><div class="schedule-item"><span>Primary goal</span><b>${state.profile.goal}</b></div><div class="schedule-item"><span>Training rhythm</span><b>${state.profile.days}</b></div><div class="schedule-item"><span>Nutrition</span><b>${state.profile.diet}</b></div><div class="schedule-item"><span>Plan created</span><b>Aug 03, 2026</b></div></div><button class="primary dark-button" style="margin-top:24px" data-action="onboarding">Update preferences</button>`; }
function modal(){ if(state.modal==='workout') return `<div class="modal-backdrop"><div class="modal"><div class="modal-head"><div><span class="eyebrow">Today's session</span><h2>Upper strength</h2><p class="subtle">Log your work as you go. No pressure to be perfect.</p></div><button class="close" data-action="close">×</button></div><div class="workout-list" style="margin-top:24px">${exercises.map((e,i)=>`<div class="exercise"><div><strong>${e[0]}</strong><span>${e[1]} · 90 sec rest</span></div><button class="check ${state.exerciseDone.includes(i)?'done':''}" data-exercise="${i}">${state.exerciseDone.includes(i)?'✓':''}</button></div>`).join('')}</div><div class="modal-footer"><span class="micro">${state.exerciseDone.length} / 5 complete</span><button class="primary" data-action="complete">${state.exerciseDone.length===5?'Finish workout':'Complete a set'}</button></div></div></div>`; if(state.modal==='meal') return `<div class="modal-backdrop"><div class="modal"><div class="modal-head"><div><span class="eyebrow">Dinner · 08:30 PM</span><h2>Paneer rice bowl</h2><p class="subtle">A balanced, high-protein dinner built around your targets.</p></div><button class="close" data-action="close">×</button></div><div class="meal-info" style="margin:28px 0"><span><b>520 kcal</b>energy</span><span><b>28g</b>protein</span><span><b>62g</b>carbs</span><span><b>20g</b>fat</span></div><div class="schedule-list"><div class="schedule-item"><span>200g</span>Cooked basmati rice</div><div class="schedule-item"><span>150g</span>Paneer, cubed</div><div class="schedule-item"><span>100g</span>Seasonal vegetables</div><div class="schedule-item"><span>10g</span>Olive oil & spices</div></div><div class="modal-footer"><button class="outline" data-action="replace">Replace meal</button><button class="primary" data-action="logmeal">${state.mealDone?'Logged ✓':'I ate this'}</button></div></div></div>`; return onboarding(); }
function onboarding(){ const steps=['Basics','Goal','Schedule','Food']; return `<div class="modal-backdrop"><div class="modal"><div class="modal-head"><div><span class="eyebrow">Personal setup · Step ${state.step} of 4</span><h2>Build around your life.</h2><p class="subtle">A few details help us make your plan feel like yours.</p></div><button class="close" data-action="close">×</button></div><div class="steps">${steps.map((_,i)=>`<i class="${i<state.step?'active':''}"></i>`).join('')}</div>${state.step===1?`<div class="form-grid"><div class="field"><label>Name</label><input value="${state.profile.name}" data-profile="name"></div><div class="field"><label>Age</label><input value="26"></div><div class="field"><label>Height</label><input value="175 cm"></div><div class="field"><label>Weight</label><input value="72 kg"></div></div>`:state.step===2?`<div class="field"><label>Primary goal</label><div class="choices">${['Build muscle','Lose fat','Maintain fitness','Improve strength'].map(x=>`<button class="choice ${x===state.profile.goal?'selected':''}" data-goal="${x}">${x}</button>`).join('')}</div></div>`:state.step===3?`<div class="field"><label>Days you can train</label><div class="choices">${['3 days / week','4 days / week','5 days / week'].map(x=>`<button class="choice ${x===state.profile.days?'selected':''}" data-days="${x}">${x}</button>`).join('')}</div></div><div class="field" style="margin-top:20px"><label>Typical session</label><div class="choices"><button class="choice selected">45–60 minutes</button><button class="choice">60–90 minutes</button></div></div>`:`<div class="field"><label>Diet style</label><div class="choices">${['Vegetarian','Non-vegetarian','Vegan'].map(x=>`<button class="choice ${x===state.profile.diet?'selected':''}" data-diet="${x}">${x}</button>`).join('')}</div></div><p class="subtle" style="margin-top:20px">We use defined recipes and serving sizes so your nutrition targets stay useful, without pretending homemade food is perfectly exact.</p>`}<div class="modal-footer"><span class="micro">${steps[state.step-1]}</span><button class="primary" data-action="next">${state.step===4?'Save my plan':'Continue'} ↗</button></div></div></div>`; }
function bind(){ document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{state.view=b.dataset.view;render()}); document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>action(b.dataset.action)); document.querySelectorAll('[data-exercise]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.exercise);state.exerciseDone=state.exerciseDone.includes(i)?state.exerciseDone.filter(x=>x!==i):[...state.exerciseDone,i];render()}); document.querySelectorAll('[data-goal]').forEach(b=>b.onclick=()=>{state.profile.goal=b.dataset.goal;render()}); document.querySelectorAll('[data-days]').forEach(b=>b.onclick=()=>{state.profile.days=b.dataset.days;render()}); document.querySelectorAll('[data-diet]').forEach(b=>b.onclick=()=>{state.profile.diet=b.dataset.diet;render()}); document.querySelectorAll('[data-profile]').forEach(i=>i.oninput=e=>state.profile.name=e.target.value); }
function action(type){
  if(type==='workout')state.modal='workout';
  if(type==='meal')state.modal='meal';
  if(type==='onboarding'){state.modal='onboarding';state.step=1;}
  if(type==='close')state.modal=null;
  if(type==='logmeal'){
    state.mealDone=true;
    state.modal=null;
    api('/meals', { method: 'POST', body: JSON.stringify({ meal: 'Paneer rice bowl' }) }).catch(console.error);
  }
  if(type==='replace')alert('Meal alternatives will preserve a similar calorie and protein target.');
  if(type==='complete'){
    if(state.exerciseDone.length<5){
      state.exerciseDone=[...new Set([...state.exerciseDone, state.exerciseDone.length])];
    } else {
      state.modal=null;
      api('/workouts', { method: 'POST', body: JSON.stringify({ exercises: state.exerciseDone, durationMinutes: 52 }) }).catch(console.error);
    }
  }
  if(type==='next'){
    if(state.step<4)state.step++;
    else { state.modal=null; saveProfile(); }
  }
  render();
}
hydrate();
