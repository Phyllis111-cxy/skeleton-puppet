import * as THREE from 'three';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { FINGERS, HandCalibration, PalmFloat } from './hand-control.js';
import { PuppetRig } from './puppet-rig.js';
import { StageHand } from './stage-hand.js';
import { GameFlow } from './game-flow.js';
import { QUIZ_QUESTIONS } from './quiz-questions.js';
import { BoneHighlights } from './bone-highlights.js';
import { renderBoneCard } from './bone-card-content.js';
import { VictoryCelebration } from './victory-celebration.js';

const MODEL_URL = './assets/void-original/model/Lowpoly Human Skeleton (Rigged).gltf';
const VISION_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/vision_bundle.mjs';
const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';
const HAND_MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const $ = selector => document.querySelector(selector);
const stage = $('#stage'), overlay = $('#rig'), loading = $('#loading');
const video = $('#preview'), cameraBox = $('#camera'), cameraStatus = $('#camera-status');
const landmarkCanvas = $('#landmarks'), fingerReadout = $('#finger-readout');
const sceneLabel = $('#scene-label');
const phase = $('#phase'), readyPanel = $('#ready-panel'), factCard = $('#fact-card');
const continueButton = $('#continue'), helpButton = $('#help'), completePanel = $('#complete-panel');
const quizCard = $('#quiz-card'), quizComplete = $('#quiz-complete');
const challengePanel = $('#bone-challenge'), challengeComplete = $('#challenge-complete');
const quizOptions = [...document.querySelectorAll('#quiz-options button')];
const flow = new GameFlow();
let highlights = null, handVisible = false, calibrated = false, helpOpen = false;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x11100e, .11);
const camera = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, .01, 100);
camera.position.set(0, 1.3, 6.2);
camera.lookAt(0, 1.3, 0);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
stage.append(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xb8c7d1, 0x5a3020, 2.3));
const key = new THREE.DirectionalLight(0xffc78c, 2.6);
key.position.set(-2, 4, 4);
scene.add(key);
const rim = new THREE.DirectionalLight(0x6c8592, 1.3);
rim.position.set(3, 2, -3);
scene.add(rim);
const floor = new THREE.Mesh(
  new THREE.CircleGeometry(1.9, 64),
  new THREE.MeshBasicMaterial({ color: 0x7c4426, transparent: true, opacity: .16 }),
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = .005;
scene.add(floor);

const ensemble = new THREE.Group();
scene.add(ensemble);
const puppet = new THREE.Group();
ensemble.add(puppet);
const controlHand = new StageHand();
ensemble.add(controlHand.root);
let puppetRig = null;
let victory = null;
let modelReady = false;
new GLTFLoader().load(MODEL_URL, async gltf => {
  try {
    puppetRig = new PuppetRig(gltf);
    puppet.add(puppetRig.root);
    const regions = await (await fetch('./assets/void-original/regions.json')).json();
    highlights = new BoneHighlights(puppetRig, regions);
    victory = new VictoryCelebration(puppetRig,$('#app'));
    modelReady = true;
    loading.textContent = 'Skeleton ready';
    setTimeout(() => loading.classList.add('hidden'), 1200);
  } catch (error) {
    loading.textContent = `Skeleton rig error: ${error.message}`;
    console.error(error);
  }
}, undefined, error => {
  loading.textContent = 'Skeleton failed to load. Please refresh.';
  console.error(error);
});

const NS = 'http://www.w3.org/2000/svg';
const svg = (tag, attributes = {}) => {
  const node = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  overlay.append(node);
  return node;
};
const strings = FINGERS.map(() => svg('path', { fill: 'none', stroke: '#e3c59a', 'stroke-width': '1.1', opacity: '.48' }));
const knots = FINGERS.map(() => svg('circle', { r: '2.1', fill: '#e8c292' }));
let pulls = [0, 0, 0, 0, 0];
const devMode = new URLSearchParams(location.search).has('dev');
if(devMode && new URLSearchParams(location.search).has('task')) {
  flow.state='LEVEL_2_TASK';
  flow.taskIndex=Math.max(0,Math.min(3,Number(new URLSearchParams(location.search).get('task'))-1||0));
}
if(devMode && new URLSearchParams(location.search).has('check')) flow.state='LEVEL_2_COMPLETE';
const devPulls = devMode ? [0,0,0,0,0] : null;
let ringDiagnostics = null;
if(devMode) {
  const panel=document.createElement('div');
  panel.id='dev-pulls';
  panel.style.cssText='position:absolute;left:8px;bottom:8px;z-index:8;width:128px;padding:8px;background:#211a1eea;color:#fff;font:10px Arial';
  for(const [i,name] of ['Thumb','Index','Middle','Ring','Little'].entries()) {
    const label=document.createElement('label'); label.textContent=name;
    const slider=document.createElement('input'); slider.type='range'; slider.min=0; slider.max=100; slider.value=0;
    slider.style.width='100%'; slider.setAttribute('aria-label',`${name} test pull`);
    slider.addEventListener('input',()=>{devPulls[i]=Number(slider.value)/100;pulls=[...devPulls];controlHand.pose(pulls)});
    label.append(slider);panel.append(label);
  }
  ringDiagnostics=document.createElement('div');
  ringDiagnostics.id='ring-diagnostics';
  ringDiagnostics.textContent='R raw 0.00 · normalized 0.00 · filtered 0.00 · control 0.00';
  panel.append(ringDiagnostics);
  $('#app').append(panel);
}
const restY = {};
let displayedState = flow.state;
let lastFrameTime = performance.now();
let shownQuizKey = '';
let challengeSuccessAt = 0;
let challengeBaseY = null;
let victoryButtonsShown = false;

function localAnchorY(part) {
  ensemble.updateMatrixWorld(true);
  return ensemble.worldToLocal(puppetRig.anchor(part).clone()).y;
}

function renderGameUI() {
  const state=flow.state;
  if(state!==displayedState) {
    for(const element of [phase,sceneLabel]) {
      element.classList.remove('level-change');
      void element.offsetWidth;
      element.classList.add('level-change');
    }
    displayedState=state;
  }
  phase.textContent=state.startsWith('LEVEL_1') ? 'LEVEL 01 · DISCOVER' : state.startsWith('SKELETON_CHECK') ? 'SKELETON CHECK' : state.startsWith('LEVEL_3') ? 'LEVEL 03 · BONE CHALLENGE' : 'LEVEL 02 · MOVE & LEARN';
  readyPanel.hidden=state!=='LEVEL_1_READY';
  factCard.hidden=state!=='LEVEL_2_FEEDBACK';
  completePanel.hidden=state!=='LEVEL_2_COMPLETE';
  quizCard.hidden=state!=='SKELETON_CHECK_QUESTION'&&state!=='SKELETON_CHECK_FEEDBACK';
  quizComplete.hidden=state!=='SKELETON_CHECK_COMPLETE';
  challengePanel.hidden=state!=='LEVEL_3_TASK'&&state!=='LEVEL_3_SUCCESS';
  challengeComplete.hidden=state!=='LEVEL_3_COMPLETE';
  if(state==='LEVEL_3_COMPLETE') {
    const ready=victory?.buttonsReady(performance.now())||false;
    $('#challenge-again').hidden=!ready;
    $('#challenge-over').hidden=!ready;
  }
  if(devMode) $('#dev-pulls').hidden=state.startsWith('SKELETON_CHECK');
  continueButton.hidden=state!=='LEVEL_1_EXPLORE';
  helpButton.hidden=state!=='LEVEL_2_TASK';
  if(state==='LEVEL_1_EXPLORE') sceneLabel.textContent='Move your fingers. See what happens.';
  else if(state==='LEVEL_1_READY') sceneLabel.textContent='';
  else if(state==='LEVEL_2_TASK') {
    sceneLabel.textContent=helpOpen ? ['Try lifting your index finger.','Try lifting your ring finger.','Try lifting your thumb.','Click the ribs in the chest.'][flow.taskIndex] : flow.task.instruction;
    if(!helpOpen && !devMode && !handVisible && flow.taskIndex<3) sceneLabel.textContent='Show your hand to the camera.';
    else if(!helpOpen && !devMode && !calibrated && flow.taskIndex<3) sceneLabel.textContent='Relax your fingers to calibrate.';
    else if(!flow.armed && flow.taskIndex<3 && pulls[flow.task.finger]>.1) sceneLabel.textContent='Relax that finger, then lift it again.';
  } else if(state==='LEVEL_2_FEEDBACK') {
    renderBoneCard(flow.taskIndex, $('#fact-image'), $('#fact-title'), $('#fact-text'));
    $('#fact-next').textContent=flow.taskIndex===3?'FINISH':'NEXT';
    sceneLabel.textContent='';
    requestAnimationFrame(()=>{if(flow.state==='LEVEL_2_FEEDBACK') positionFactCard()});
  } else sceneLabel.textContent='';
  if(!quizCard.hidden) renderQuizUI();
  if(!challengePanel.hidden) {
    $('#challenge-progress').textContent=`${String(flow.challengeIndex+1).padStart(2,'0')} / 04`;
    $('#challenge-name').textContent=flow.challenge;
    const success=state==='LEVEL_3_SUCCESS';
    $('#challenge-prompt').hidden=success;
    $('#challenge-feedback').hidden=!success&&!flow.challengeWrong;
    $('#challenge-feedback').textContent=success?'Great! You found it!':'Not quite. Try another part!';
    $('#challenge-next').hidden=!success||performance.now()-challengeSuccessAt<1250;
  }
}

function renderQuizUI() {
  const key=`${flow.state}:${flow.quizIndex}:${flow.selectedAnswer||''}`;
  if(key===shownQuizKey) return;
  shownQuizKey=key;
  const question=flow.quizQuestion, answered=flow.state==='SKELETON_CHECK_FEEDBACK';
  $('#quiz-progress').textContent=`${String(flow.quizIndex+1).padStart(2,'0')} / ${String(QUIZ_QUESTIONS.length).padStart(2,'0')}`;
  $('#quiz-question').textContent=question.question;
  quizOptions.forEach((button,index)=>{
    const choice='ABC'[index];
    button.querySelector('span').textContent=question.options[index];
    button.disabled=answered;
    button.classList.toggle('correct',answered&&choice===question.correctAnswer);
    button.classList.toggle('incorrect',answered&&choice===flow.selectedAnswer&&choice!==question.correctAnswer);
  });
  $('#quiz-feedback').hidden=!answered;
  $('#quiz-next').hidden=!answered;
  if(answered) {
    const correct=flow.selectedAnswer===question.correctAnswer;
    $('#quiz-result').textContent=correct ? "That's right!" : 'Good try!';
    $('#quiz-explanation').textContent=correct ? question.explanation : `The correct answer is ${question.correctAnswer}: ${question.options['ABC'.indexOf(question.correctAnswer)]}. ${question.explanation}`;
    $('#quiz-next').textContent=flow.quizIndex===QUIZ_QUESTIONS.length-1?'FINISH':'NEXT';
  }
}

continueButton.onclick=()=>{flow.openReady();renderGameUI()};
$('#keep-exploring').onclick=()=>{flow.keepExploring();renderGameUI()};
$('#start-level-2').onclick=()=>{flow.startLevel2();helpOpen=false;renderGameUI()};
helpButton.onclick=()=>{helpOpen=!helpOpen;renderGameUI()};
$('#fact-next').onclick=()=>{flow.next();helpOpen=false;renderGameUI()};
$('#start-check').onclick=()=>{if(flow.startSkeletonCheck()) renderGameUI()};
quizOptions.forEach(button=>button.addEventListener('click',()=>{if(flow.answerQuiz(button.dataset.answer)) renderGameUI()}));
$('#quiz-next').onclick=()=>{if(flow.nextQuiz()) renderGameUI()};
$('#quiz-again').onclick=()=>{if(flow.playQuizAgain()) renderGameUI()};
$('#start-bone-challenge').onclick=()=>{if(flow.startBoneChallenge()) {challengeSuccessAt=0;challengeBaseY=null;renderGameUI()}};
$('#challenge-next').onclick=()=>{if(flow.nextChallenge()) {
  challengeSuccessAt=0;challengeBaseY=null;
  if(flow.state==='LEVEL_3_COMPLETE') {
    victory?.start(); victoryButtonsShown=false;controlHand.pose([0,0,0,0,0]);
  }
  renderGameUI();
}};
$('#challenge-again').onclick=()=>{if(flow.startBoneChallenge()) {
  victory?.reset(); victoryButtonsShown=false;controlHand.pose(pulls);
  challengeSuccessAt=0;challengeBaseY=null;renderGameUI();
}};
$('#challenge-over').onclick=()=>{if(flow.startOver()) {
  victory?.reset(); victoryButtonsShown=false;controlHand.pose(pulls);
  helpOpen=false;challengeSuccessAt=0;challengeBaseY=null;renderGameUI();
}};

const raycaster=new THREE.Raycaster(), pointer=new THREE.Vector2();
renderer.domElement.addEventListener('click',event=>{
  const level2Ribs=flow.state==='LEVEL_2_TASK'&&flow.taskIndex===3;
  const challenge=flow.state==='LEVEL_3_TASK';
  if((!level2Ribs&&!challenge)||!highlights) return;
  const rect=renderer.domElement.getBoundingClientRect();
  pointer.set((event.clientX-rect.left)/rect.width*2-1,1-(event.clientY-rect.top)/rect.height*2);
  raycaster.setFromCamera(pointer,camera);
  const body=[];
  puppetRig.model.traverse(object=>{if(object.isSkinnedMesh&&!object.name.startsWith('highlight-')) body.push(object)});
  const hit=raycaster.intersectObjects(body,false)[0];
  if(level2Ribs) {
    if(hit && highlights.ribHit(hit.point) && flow.clickRibs()) renderGameUI();
  } else if(hit) {
    if(flow.clickChallengeRibs(highlights.ribHit(hit.point))) challengeSuccessAt=performance.now();
    renderGameUI();
  }
});

function project(world) {
  const point = world.clone().project(camera);
  return { x: (point.x + 1) * innerWidth / 2, y: (1 - point.y) * innerHeight / 2 };
}

function positionFactCard() {
  const part=flow.task.part;
  const bone=part ? puppetRig.chains[part][flow.taskIndex===1?'lower':'upper'] : puppetRig.model.getObjectByName('Bone021_02');
  const spot=project(bone.getWorldPosition(new THREE.Vector3()));
  const width=factCard.offsetWidth||Math.min(370,innerWidth-24);
  const height=factCard.offsetHeight||170;
  const margin=12, boneGap=48;
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  let left,top;
  if(innerWidth>=900 && spot.x-width-90>=margin) {
    // Keep all four cards in the empty left wing, beside their highlighted bone.
    left=Math.min(innerWidth*.105,spot.x-width-90);
    left=clamp(left,margin,innerWidth-width-margin);
    top=clamp(spot.y-height/2,Math.max(90,innerHeight*.25),innerHeight-height-50);
  } else {
    // A narrow screen cannot fit a card next to the puppet. Keep the target bone visible above or below it.
    left=clamp(spot.x-width/2,margin,innerWidth-width-margin);
    const below=spot.y+35;
    top=below+height+margin<=innerHeight-45 ? below : spot.y-height-35;
    top=clamp(top,125,innerHeight-height-50);
  }
  factCard.style.left=`${left}px`;
  factCard.style.top=`${top}px`;
}

function attachmentPoint(part) {
  return puppetRig?.anchor(part) || new THREE.Vector3();
}

function drawRig() {
  overlay.setAttribute('viewBox', `0 0 ${innerWidth} ${innerHeight}`);
  const displayPulls=flow.state==='LEVEL_3_COMPLETE' ? [0,0,0,0,0] : pulls;
  FINGERS.forEach((finger, i) => {
    const from = project(controlHand.tip(i));
    const to = modelReady ? project(attachmentPoint(finger.part)) : { x: innerWidth / 2, y: innerHeight * .65 };
    const drop = Math.min(72, Math.max(18, (to.y - from.y) * .25));
    const sag = (1 - displayPulls[i]) * 5;
    strings[i].setAttribute('d', `M ${from.x} ${from.y} C ${from.x + sag} ${from.y + drop} ${to.x + sag} ${to.y - drop} ${to.x} ${to.y}`);
    strings[i].setAttribute('stroke', displayPulls[i] > .12 ? '#f5b86b' : '#bba98d');
    knots[i].setAttribute('cx', to.x);
    knots[i].setAttribute('cy', to.y);
  });
}

function animate() {
  requestAnimationFrame(animate);
  const now=performance.now(), deltaSeconds=Math.min(.05,(now-lastFrameTime)/1000);
  lastFrameTime=now;
  const settleChallenge=flow.state==='LEVEL_3_TASK'&&!flow.challengeArmed;
  const celebrating=flow.state==='LEVEL_3_COMPLETE'&&victory?.active;
  const victoryPose=celebrating ? victory.pose(now) : null;
  FINGERS.forEach(({ part }, i) => puppetRig?.setPull(part,
    celebrating ? (i===1||i===3 ? victoryPose.arms : i===2 ? victoryPose.head : 0)
      : settleChallenge ? 0 : i===3 ? Math.min(1,pulls[i]*1.2) : pulls[i]));
  puppetRig?.tick();
  victory?.tick(now);
  if(celebrating&&!victoryButtonsShown&&victory.buttonsReady(now)) {
    victoryButtonsShown=true;renderGameUI();
  }
  ensemble.updateMatrixWorld(true);
  if(modelReady) {
    for(const part of ['leftArm','rightArm','leftLeg','rightLeg']) restY[part] ??= localAnchorY(part);
    if(flow.state==='LEVEL_2_TASK'&&flow.task.part) {
      const lift=localAnchorY(flow.task.part)-restY[flow.task.part];
      if(flow.update(pulls,lift,performance.now())) renderGameUI();
    }
    if(flow.state==='LEVEL_3_TASK') {
      const previousWrong=flow.challengeWrong;
      const anchors=Object.fromEntries(['leftArm','rightArm','leftLeg','rightLeg'].map(part=>[part,localAnchorY(part)]));
      if(!flow.challengeArmed&&pulls.every(value=>value<.10)) challengeBaseY=anchors;
      const lifts=Object.fromEntries(Object.entries(anchors).map(([part,y])=>[part,y-(challengeBaseY?.[part]??restY[part])]));
      if(flow.updateChallenge(pulls,lifts,performance.now())) {
        challengeSuccessAt=performance.now(); renderGameUI();
      } else if(previousWrong!==flow.challengeWrong) renderGameUI();
    }
    if(flow.state==='LEVEL_3_SUCCESS'&&$('#challenge-next').hidden&&now-challengeSuccessAt>=1250) renderGameUI();
    const targets={};
    if(flow.state==='LEVEL_1_EXPLORE'||flow.state==='LEVEL_1_READY') {
      if(pulls[0]>.18) targets.leftFemur=pulls[0]*.22;
      if(pulls[1]>.18) targets.leftHumerus=pulls[1]*.22;
      if(pulls[2]>.18) targets.skull=pulls[2]*.18;
      if(pulls[3]>.18) {targets.rightForearmA=pulls[3]*.22;targets.rightForearmB=pulls[3]*.22;}
      if(pulls[4]>.18) targets.rightFemur=pulls[4]*.22;
    } else if(flow.state==='LEVEL_2_FEEDBACK') {
      for(const region of flow.task.regions) targets[region]=.88;
    } else if(flow.state==='SKELETON_CHECK_FEEDBACK') {
      for(const region of flow.quizQuestion.regions) targets[region]=.88;
    } else if(flow.state==='LEVEL_3_SUCCESS') {
      for(const region of flow.challengeRegions) targets[region]=.88;
    }
    highlights.setTargets(targets); highlights.tick(deltaSeconds);
  }
  drawRig();
  renderer.render(scene, camera);
}
animate();
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  victory?.resize();
  if(flow.state==='LEVEL_2_FEEDBACK') positionFactCard();
});

const calibration = new HandCalibration();
const palmFloat = new PalmFloat();
let landmarker, stream, tracking = false, starting = false, lastVideoTime = -1;

const HAND_EDGES = [[0,1,2,3,4],[0,5,6,7,8],[0,9,10,11,12],[0,13,14,15,16],[0,17,18,19,20],[5,9,13,17]];
function drawLandmarks(points) {
  const size = Math.round(cameraBox.clientWidth * devicePixelRatio);
  if (landmarkCanvas.width !== size) landmarkCanvas.width = size;
  if (landmarkCanvas.height !== size) landmarkCanvas.height = size;
  const ctx = landmarkCanvas.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  if (!points || !video.videoWidth) { fingerReadout.textContent = 'No hand detected'; return; }
  const vw = video.videoWidth, vh = video.videoHeight;
  const scale = Math.max(size / vw, size / vh);
  const offsetX = (size - vw * scale) / 2, offsetY = (size - vh * scale) / 2;
  const xy = p => [size - (p.x * vw * scale + offsetX), p.y * vh * scale + offsetY];
  ctx.lineWidth = Math.max(1.3, size / 90);
  ctx.strokeStyle = '#f5b66c';
  HAND_EDGES.forEach(chain => {
    ctx.beginPath();
    chain.forEach((id, i) => { const [x,y] = xy(points[id]); i ? ctx.lineTo(x,y) : ctx.moveTo(x,y); });
    ctx.stroke();
  });
  points.forEach((point, i) => {
    const [x,y] = xy(point);
    ctx.beginPath(); ctx.arc(x,y, FINGERS.some(f => f.tip === i) ? size / 65 : size / 115, 0, Math.PI * 2);
    ctx.fillStyle = FINGERS.some(f => f.tip === i) ? '#fff0c9' : '#e8a660';
    ctx.fill();
  });
  fingerReadout.textContent = FINGERS.map((finger, i) => `${['T','I','M','R','P'][i]}${Math.round(pulls[i] * 100)}`).join(' · ');
}

function track() {
  if (!tracking) return;
  if (video.readyState >= 2 && video.currentTime !== lastVideoTime) {
    lastVideoTime = video.currentTime;
    try {
      const points = landmarker.detectForVideo(video, performance.now()).landmarks?.[0] || null;
      const result = calibration.update(points);
      pulls = devMode ? [...devPulls] : result.pulls;
      if(ringDiagnostics) {
        const d=calibration.debug;
        ringDiagnostics.textContent=`R raw ${d.raw.toFixed(2)} · normalized ${d.normalized.toFixed(2)} · filtered ${d.filtered.toFixed(2)} · control ${Math.min(1,pulls[3]*1.2).toFixed(2)}`;
      }
      handVisible=Boolean(points); calibrated=result.ready;
      const drift = palmFloat.update(points, result.ready);
      if(flow.state!=='LEVEL_3_COMPLETE') {
        ensemble.position.set(drift.x, drift.y, 0);
        ensemble.rotation.z = -drift.x * .08;
      }
      drawLandmarks(points);
      if(flow.state!=='LEVEL_3_COMPLETE') controlHand.pose(pulls);
      renderGameUI();
    } catch (error) {
      tracking = false;
      handVisible=false; renderGameUI();
      console.error(error);
    }
  }
  requestAnimationFrame(track);
}

async function startCamera() {
  if (starting || tracking) return;
  starting = true;
  cameraStatus.textContent = 'Connecting camera…';
  try {
    if (!navigator.mediaDevices?.getUserMedia) throw Error('Open on localhost or HTTPS');
    stream ||= await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
    video.srcObject = stream;
    await video.play();
    cameraBox.classList.add('active');
    renderGameUI();
    const { HandLandmarker, FilesetResolver } = await import(VISION_URL);
    const vision = await FilesetResolver.forVisionTasks(WASM_URL);
    try {
      landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: HAND_MODEL_URL, delegate: 'GPU' },
        runningMode: 'VIDEO', numHands: 1,
        minHandDetectionConfidence: .6, minTrackingConfidence: .55,
      });
    } catch {
      landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: HAND_MODEL_URL, delegate: 'CPU' },
        runningMode: 'VIDEO', numHands: 1,
      });
    }
    calibration.reset();
    palmFloat.reset();
    tracking = true;
    track();
  } catch (error) {
    cameraStatus.textContent = 'Click to retry';
    cameraBox.classList.remove('active');
    sceneLabel.textContent = error.name === 'NotAllowedError' ? 'Please allow camera access' : `Hand tracking failed: ${error.message}`;
    console.error(error);
  } finally {
    starting = false;
  }
}
cameraBox.addEventListener('click', () => {
  if (tracking) { calibration.reset(); palmFloat.reset(); calibrated=false; renderGameUI(); }
  else startCamera();
});
startCamera();
renderGameUI();
addEventListener('pagehide', () => { tracking = false; victory?.reset(); stream?.getTracks().forEach(track => track.stop()); });
