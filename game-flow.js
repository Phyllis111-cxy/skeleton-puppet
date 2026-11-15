import { QUIZ_QUESTIONS } from './quiz-questions.js';

export const TASKS = [
  { part:'leftArm', finger:1, instruction:'Raise the left arm.', title:'HUMERUS', fact:'Your upper arm has one long bone called the humerus. It connects your shoulder to your elbow and helps your arm move when you lift or reach.', regions:['leftHumerus'], lift:.055 },
  { part:'rightArm', finger:3, instruction:'Raise the right arm.', title:'RADIUS & ULNA', fact:'Your forearm has two bones: the radius and the ulna. They work together to let you turn your palm up and down. Try rotating your own forearm!', regions:['rightForearmA','rightForearmB'], lift:.045, pull:.20 },
  { part:'leftLeg', finger:0, instruction:'Lift the left leg.', title:'FEMUR', fact:'The femur is the longest and one of the strongest bones in your body. It connects your hip to your knee and helps support your weight when you stand, walk, or jump.', regions:['leftFemur'], lift:.035 },
  { part:null, instruction:'Find the rib cage.', title:'RIB CAGE', fact:'Most people have 12 pairs of ribs, forming a protective cage around the chest. Your ribs help protect your heart and lungs. They also move slightly as you breathe.', regions:['ribCage'] },
];

export const CHALLENGES = ['HUMERUS', 'RADIUS & ULNA', 'FEMUR', 'RIB CAGE'];
const CHALLENGE_PARTS = [
  { finger:1, part:'leftArm', side:'left', lift:.055, pull:.24 },
  { finger:3, part:'rightArm', side:'right', lift:.045, pull:.20 },
  { finger:0, part:'leftLeg', side:'left', lift:.035, pull:.24 },
  { finger:4, part:'rightLeg', side:'right', lift:.035, pull:.24 },
];

export class GameFlow {
  constructor() { this.state='LEVEL_1_EXPLORE'; this.taskIndex=0; this.armed=false; this.since=null; this.quizIndex=0; this.selectedAnswer=null; this.challengeOrder=[]; this.challengeIndex=0; this.challengeSide=null; this.challengeArmed=false; this.challengeSince={}; this.challengeWrong=false; }
  get task() { return TASKS[this.taskIndex]; }
  get quizQuestion() { return QUIZ_QUESTIONS[this.quizIndex]; }
  openReady() { if(this.state==='LEVEL_1_EXPLORE') this.state='LEVEL_1_READY'; }
  keepExploring() { if(this.state==='LEVEL_1_READY') this.state='LEVEL_1_EXPLORE'; }
  startLevel2() { if(this.state==='LEVEL_1_READY') { this.state='LEVEL_2_TASK'; this.taskIndex=0; this.armed=false; this.since=null; } }
  update(pulls, lift, now) {
    if(this.state!=='LEVEL_2_TASK' || !this.task.part) return false;
    const value=pulls[this.task.finger] || 0;
    if(value<.10) { this.armed=true; this.since=null; return false; }
    if(!this.armed || value<(this.task.pull ?? .24) || lift<this.task.lift) { this.since=null; return false; }
    this.since ??= now;
    if(now-this.since<320) return false;
    this.state='LEVEL_2_FEEDBACK'; this.since=null; return true;
  }
  clickRibs() {
    if(this.state==='LEVEL_2_TASK' && this.taskIndex===3) { this.state='LEVEL_2_FEEDBACK'; return true; }
    return false;
  }
  next() {
    if(this.state!=='LEVEL_2_FEEDBACK') return;
    if(this.taskIndex===TASKS.length-1) { this.state='LEVEL_2_COMPLETE'; return; }
    this.taskIndex++; this.state='LEVEL_2_TASK'; this.armed=false; this.since=null;
  }
  startSkeletonCheck() {
    if(this.state!=='LEVEL_2_COMPLETE') return false;
    this.quizIndex=0; this.selectedAnswer=null; this.state='SKELETON_CHECK_QUESTION';
    return true;
  }
  answerQuiz(choice) {
    if(this.state!=='SKELETON_CHECK_QUESTION'||!['A','B','C'].includes(choice)) return false;
    this.selectedAnswer=choice; this.state='SKELETON_CHECK_FEEDBACK';
    return true;
  }
  nextQuiz() {
    if(this.state!=='SKELETON_CHECK_FEEDBACK') return false;
    if(this.quizIndex===QUIZ_QUESTIONS.length-1) this.state='SKELETON_CHECK_COMPLETE';
    else { this.quizIndex++; this.selectedAnswer=null; this.state='SKELETON_CHECK_QUESTION'; }
    return true;
  }
  playQuizAgain() {
    if(this.state!=='SKELETON_CHECK_COMPLETE') return false;
    this.quizIndex=0; this.selectedAnswer=null; this.state='SKELETON_CHECK_QUESTION';
    return true;
  }
  get challenge() { return this.challengeOrder[this.challengeIndex]; }
  get challengeRegions() {
    if(this.state!=='LEVEL_3_SUCCESS') return [];
    if(this.challenge==='RIB CAGE') return ['ribCage'];
    if(this.challenge==='HUMERUS') return [`${this.challengeSide}Humerus`];
    if(this.challenge==='FEMUR') return [`${this.challengeSide}Femur`];
    return [`${this.challengeSide}ForearmA`,`${this.challengeSide}ForearmB`];
  }
  startBoneChallenge(random=Math.random) {
    if(this.state!=='SKELETON_CHECK_COMPLETE'&&this.state!=='LEVEL_3_COMPLETE') return false;
    this.challengeOrder=[...CHALLENGES];
    for(let i=this.challengeOrder.length-1;i>0;i--) {
      const j=Math.floor(random()*(i+1));
      [this.challengeOrder[i],this.challengeOrder[j]]=[this.challengeOrder[j],this.challengeOrder[i]];
    }
    this.challengeIndex=0;
    this.resetChallengeRound();
    return true;
  }
  resetChallengeRound() {
    this.state='LEVEL_3_TASK'; this.challengeSide=null; this.challengeArmed=false;
    this.challengeSince={}; this.challengeWrong=false;
  }
  updateChallenge(pulls,lifts,now) {
    if(this.state!=='LEVEL_3_TASK') return false;
    if(pulls.every(value=>value<.10)) {
      this.challengeArmed=true; this.challengeSince={}; this.challengeWrong=false;
      return false;
    }
    if(!this.challengeArmed) return false;
    let wrong=false;
    for(const {finger,part,side,lift,pull} of CHALLENGE_PARTS) {
      const active=(pulls[finger]||0)>=pull && (lifts[part]||0)>=lift;
      if(!active) { delete this.challengeSince[part]; continue; }
      this.challengeSince[part] ??= now;
      if(now-this.challengeSince[part]<320) continue;
      const correct=this.challenge==='FEMUR' ? part.endsWith('Leg') : this.challenge!=='RIB CAGE'&&part.endsWith('Arm');
      if(correct) {
        this.challengeSide=side; this.challengeWrong=false; this.state='LEVEL_3_SUCCESS';
        return true;
      }
      wrong=true;
    }
    if(wrong) this.challengeWrong=true;
    return false;
  }
  clickChallengeRibs(isRibHit) {
    if(this.state!=='LEVEL_3_TASK') return false;
    if(this.challenge==='RIB CAGE'&&isRibHit) {
      this.challengeWrong=false; this.state='LEVEL_3_SUCCESS'; return true;
    }
    this.challengeWrong=true;
    return false;
  }
  nextChallenge() {
    if(this.state!=='LEVEL_3_SUCCESS') return false;
    if(this.challengeIndex===CHALLENGES.length-1) this.state='LEVEL_3_COMPLETE';
    else { this.challengeIndex++; this.resetChallengeRound(); }
    return true;
  }
  startOver() {
    if(this.state!=='LEVEL_3_COMPLETE') return false;
    Object.assign(this,new GameFlow());
    return true;
  }
}
