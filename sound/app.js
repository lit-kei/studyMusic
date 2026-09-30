const NOTES=[
  {pitch:0,name:'ド',western:'C',type:'natural',frequency:261.63},
  {pitch:1,name:'ド♯ / レ♭',western:'C♯ / D♭',type:'accidental',frequency:277.18},
  {pitch:2,name:'レ',western:'D',type:'natural',frequency:293.66},
  {pitch:3,name:'レ♯ / ミ♭',western:'D♯ / E♭',type:'accidental',frequency:311.13},
  {pitch:4,name:'ミ',western:'E',type:'natural',frequency:329.63},
  {pitch:5,name:'ファ',western:'F',type:'natural',frequency:349.23},
  {pitch:6,name:'ファ♯ / ソ♭',western:'F♯ / G♭',type:'accidental',frequency:369.99},
  {pitch:7,name:'ソ',western:'G',type:'natural',frequency:392.00},
  {pitch:8,name:'ソ♯ / ラ♭',western:'G♯ / A♭',type:'accidental',frequency:415.30},
  {pitch:9,name:'ラ',western:'A',type:'natural',frequency:440.00},
  {pitch:10,name:'ラ♯ / シ♭',western:'A♯ / B♭',type:'accidental',frequency:466.16},
  {pitch:11,name:'シ',western:'B',type:'natural',frequency:493.88}
];
const WHITE_PITCHES=[0,2,4,5,7,9,11];
const $=selector=>document.querySelector(selector);
const state={question:0,correct:0,streak:0,current:null,lastPitch:null,answered:false,hasPlayed:false,audioContext:null};

function allowedNotes(){
  const natural=$('#natural-notes').checked;
  const accidental=$('#accidental-notes').checked;
  return NOTES.filter(note=>(natural&&note.type==='natural')||(accidental&&note.type==='accidental'));
}

function ensureSelection(changed){
  const available=allowedNotes();
  if(available.length){
    $('#setting-error').hidden=true;
    if(state.current&&!available.some(note=>note.pitch===state.current.pitch)) startQuestion(false);
    return;
  }
  changed.checked=true;
  $('#setting-error').hidden=false;
}

function createPiano(){
  const piano=$('#piano');
  WHITE_PITCHES.forEach(pitch=>piano.append(makeKey(NOTES[pitch],'white-key')));
  NOTES.filter(note=>note.type==='accidental').forEach(note=>piano.append(makeKey(note,'black-key')));
}

function makeKey(note,className){
  const key=document.createElement('button');
  key.type='button';
  key.className=`key ${className}`;
  key.dataset.pitch=note.pitch;
  key.setAttribute('aria-label',`${note.name}（${note.western}）`);
  key.innerHTML=`<span>${note.name.replace(' / ','<br>')}</span>`;
  key.addEventListener('click',()=>answer(note,key));
  return key;
}

function getAudioContext(){
  if(!state.audioContext) state.audioContext=new (window.AudioContext||window.webkitAudioContext)();
  return state.audioContext;
}

async function playTone(note,duration=1.15){
  const context=getAudioContext();
  if(context.state==='suspended') await context.resume();
  const now=context.currentTime;
  const master=context.createGain();
  master.gain.setValueAtTime(.0001,now);
  master.gain.exponentialRampToValueAtTime(.32,now+.025);
  master.gain.exponentialRampToValueAtTime(.13,now+.3);
  master.gain.exponentialRampToValueAtTime(.0001,now+duration);
  master.connect(context.destination);
  [
    {ratio:1,gain:1,type:'triangle'},
    {ratio:2,gain:.22,type:'sine'},
    {ratio:3,gain:.09,type:'sine'}
  ].forEach(part=>{
    const oscillator=context.createOscillator();
    const gain=context.createGain();
    oscillator.type=part.type;
    oscillator.frequency.setValueAtTime(note.frequency*part.ratio,now);
    gain.gain.value=part.gain;
    oscillator.connect(gain).connect(master);
    oscillator.start(now);
    oscillator.stop(now+duration+.04);
  });
  const mark=$('.sound-mark');
  mark.classList.remove('playing');
  void mark.offsetWidth;
  mark.classList.add('playing');
  setTimeout(()=>mark.classList.remove('playing'),1300);
}

async function playQuestion(){
  if(!state.current)return;
  state.hasPlayed=true;
  $('#play-label').textContent='もう一度再生';
  $('#sound-caption').textContent='音を聴いて、下の鍵盤から答えてください。';
  await playTone(state.current);
}

function startQuestion(autoPlay){
  const pool=allowedNotes();
  const alternatives=pool.filter(note=>note.pitch!==state.lastPitch);
  state.current=alternatives.length?alternatives[Math.floor(Math.random()*alternatives.length)]:pool[0];
  state.lastPitch=state.current.pitch;
  state.question++;
  state.answered=false;
  state.hasPlayed=false;
  $('#question-number').textContent=`QUESTION ${String(state.question).padStart(2,'0')}`;
  $('#play-label').textContent='音を再生';
  $('#sound-caption').textContent=autoPlay?'次の音を再生しています。':'まず音を再生してください。';
  $('#feedback').hidden=true;
  $('#feedback').className='feedback';
  $('#next-button').hidden=true;
  document.querySelectorAll('.key').forEach(key=>{key.disabled=false;key.classList.remove('correct','incorrect','active')});
  if(autoPlay) playQuestion();
}

function answer(note,key){
  if(state.answered)return;
  playTone(note,.75);
  if(!state.hasPlayed){
    $('#sound-caption').textContent='問題の音を再生してから答えてください。';
    return;
  }
  state.answered=true;
  const isCorrect=note.pitch===state.current.pitch;
  if(isCorrect){state.correct++;state.streak++}else state.streak=0;
  $('#correct-count').textContent=state.correct;
  $('#streak-count').textContent=state.streak;
  document.querySelectorAll('.key').forEach(button=>{
    button.disabled=true;
    if(Number(button.dataset.pitch)===state.current.pitch)button.classList.add('correct');
  });
  if(!isCorrect)key.classList.add('incorrect');
  const feedback=$('#feedback');
  feedback.classList.toggle('wrong',!isCorrect);
  feedback.innerHTML=`<strong>${isCorrect?'正解！':'おしい！ 正解は '+state.current.name}</strong><span>${state.current.western} の音です。</span>`;
  feedback.hidden=false;
  $('#next-button').hidden=false;
}

$('#play-button').addEventListener('click',playQuestion);
$('#next-button').addEventListener('click',()=>startQuestion(true));
$('#natural-notes').addEventListener('change',event=>ensureSelection(event.currentTarget));
$('#accidental-notes').addEventListener('change',event=>ensureSelection(event.currentTarget));
createPiano();
startQuestion(false);
