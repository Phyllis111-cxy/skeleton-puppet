import test from 'node:test';
import assert from 'node:assert/strict';
import { celebrationPoseAt, hatDropAt, victoryButtonsReady } from './victory-timing.js';
import { GameFlow } from './game-flow.js';

test('victory begins only after the fourth challenge success',()=>{
  const flow=new GameFlow();flow.state='SKELETON_CHECK_COMPLETE';flow.startBoneChallenge(()=>.5);
  for(let i=0;i<3;i++) {
    flow.state='LEVEL_3_SUCCESS';flow.nextChallenge();
    assert.equal(flow.state,'LEVEL_3_TASK');
  }
  flow.state='LEVEL_3_SUCCESS';flow.nextChallenge();
  assert.equal(flow.state,'LEVEL_3_COMPLETE');
});

test('the hat settles after a short drop and the arms return to rest',()=>{
  assert.ok(hatDropAt(0)>.2);
  assert.ok(hatDropAt(650)<.03);
  assert.equal(hatDropAt(850),0);
  assert.equal(celebrationPoseAt(0).arms,0);
  assert.ok(celebrationPoseAt(550).arms>.5);
  assert.equal(celebrationPoseAt(2000).arms,0);
  assert.equal(celebrationPoseAt(2000).head,0);
  assert.equal(victoryButtonsReady(2500),false);
  assert.equal(victoryButtonsReady(2600),true);
});

test('reduced motion has no puppet dance or hat drop',()=>{
  assert.deepEqual(celebrationPoseAt(600,true),{arms:0,head:0});
  assert.equal(hatDropAt(0,true),0);
  assert.equal(victoryButtonsReady(350,true),true);
});
