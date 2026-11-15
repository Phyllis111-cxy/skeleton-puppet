import test from 'node:test';
import assert from 'node:assert/strict';
import { GameFlow, CHALLENGES } from './game-flow.js';

const neutral=[0,0,0,0,0];
const still={leftArm:0,rightArm:0,leftLeg:0,rightLeg:0};
const newChallenge=(random=()=>0)=>{
  const flow=new GameFlow(); flow.state='SKELETON_CHECK_COMPLETE';
  assert.equal(flow.startBoneChallenge(random),true);
  return flow;
};
const setQuestion=(flow,name)=>{flow.challengeIndex=flow.challengeOrder.indexOf(name);flow.resetChallengeRound()};
const pull=(flow,finger,part,lift=.1)=>{
  flow.updateChallenge(neutral,still,0);
  const values=[...neutral];values[finger]=.8;
  assert.equal(flow.updateChallenge(values,{...still,[part]:lift},100),false);
  return flow.updateChallenge(values,{...still,[part]:lift},430);
};

test('four challenge questions are shuffled without repetition and replay resets the round',()=>{
  const flow=newChallenge();
  assert.equal(flow.state,'LEVEL_3_TASK');
  assert.deepEqual([...flow.challengeOrder].sort(),[...CHALLENGES].sort());
  assert.equal(new Set(flow.challengeOrder).size,4);
  flow.state='LEVEL_3_COMPLETE';
  assert.equal(flow.startBoneChallenge(()=>.99),true);
  assert.equal(flow.challengeIndex,0);
  assert.equal(flow.challengeSide,null);
  assert.equal(flow.challengeArmed,false);
});

test('arm and leg challenges require neutral, the correct category, actual lift, and a hold',()=>{
  const flow=newChallenge();setQuestion(flow,'HUMERUS');
  assert.equal(flow.updateChallenge([0,.8,0,0,0],{...still,leftArm:.2},500),false);
  assert.equal(flow.state,'LEVEL_3_TASK');
  assert.equal(pull(flow,0,'leftLeg'),false);
  assert.equal(flow.challengeWrong,true);
  flow.updateChallenge(neutral,still,500);
  const arm=[0,0,0,.8,0];
  assert.equal(flow.updateChallenge(arm,{...still,rightArm:.01},600),false);
  assert.equal(flow.updateChallenge(arm,{...still,rightArm:.1},700),false);
  assert.equal(flow.updateChallenge(arm,{...still,rightArm:.1},1010),false);
  assert.equal(flow.updateChallenge(arm,{...still,rightArm:.1},1030),true);
  assert.equal(flow.challengeSide,'right');
  assert.deepEqual(flow.challengeRegions,['rightHumerus']);
  assert.equal(flow.updateChallenge(arm,{...still,rightArm:.1},1400),false);
  flow.challengeIndex=0;
  assert.equal(flow.nextChallenge(),true);
  assert.equal(flow.challengeArmed,false);
  assert.equal(flow.updateChallenge(arm,{...still,rightArm:.1},1500),false);
  setQuestion(flow,'RADIUS & ULNA');
  assert.equal(pull(flow,1,'leftArm'),true);
  assert.deepEqual(flow.challengeRegions,['leftForearmA','leftForearmB']);
  setQuestion(flow,'FEMUR');
  assert.equal(pull(flow,4,'rightLeg'),true);
  assert.deepEqual(flow.challengeRegions,['rightFemur']);
});

test('rib challenge only accepts a chest hit and wrong clicks remain retryable',()=>{
  const flow=newChallenge();setQuestion(flow,'RIB CAGE');
  assert.equal(pull(flow,1,'leftArm'),false);
  assert.equal(flow.challengeWrong,true);
  assert.equal(flow.clickChallengeRibs(false),false);
  assert.equal(flow.state,'LEVEL_3_TASK');
  assert.equal(flow.clickChallengeRibs(true),true);
  assert.deepEqual(flow.challengeRegions,['ribCage']);
  assert.equal(flow.clickChallengeRibs(true),false);
});

test('four NEXT actions finish, then START OVER returns to Level 1',()=>{
  const flow=newChallenge();
  for(let i=0;i<4;i++) {
    flow.state='LEVEL_3_SUCCESS';
    assert.equal(flow.nextChallenge(),true);
  }
  assert.equal(flow.state,'LEVEL_3_COMPLETE');
  assert.equal(flow.startOver(),true);
  assert.equal(flow.state,'LEVEL_1_EXPLORE');
  assert.deepEqual(flow.challengeOrder,[]);
});
