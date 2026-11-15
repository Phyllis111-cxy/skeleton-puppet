import test from 'node:test';
import assert from 'node:assert/strict';
import { liftScores, HandCalibration, PalmFloat } from './hand-control.js';

function palm() {
  const p = Array.from({ length: 21 }, () => ({ x: .5, y: .5, z: 0 }));
  p[0] = { x: .4, y: .5, z: 0 };
  for (const [base, tip, z] of [[2,4,-.12],[5,8,-.08],[9,12,0],[13,16,.08],[17,20,.12]]) {
    p[base] = { x: .6, y: .5, z };
    p[tip] = { x: .84, y: .5, z };
  }
  return p;
}

test('palm translation and rotation do not pull fingers', () => {
  const rest = palm(), a = liftScores(rest);
  const moved = rest.map(p => ({ x: p.x + .15, y: p.y - .1, z: p.z + .03 }));
  const angle = .4, rotated = rest.map(p => ({
    x: .5 + (p.x-.5)*Math.cos(angle) - (p.y-.5)*Math.sin(angle),
    y: .5 + (p.x-.5)*Math.sin(angle) + (p.y-.5)*Math.cos(angle), z:p.z,
  }));
  for (const points of [moved,rotated]) liftScores(points).forEach((v,i)=>assert.ok(Math.abs(v-a[i])<1e-8));
});

test('one raised fingertip moves only its own control and releases', () => {
  const rest=palm(), tracker=new HandCalibration(2);
  tracker.update(rest); tracker.update(rest);
  const raised=palm(); raised[8].y-=.12;
  for(let i=0;i<30;i++) tracker.update(raised);
  assert.ok(tracker.smoothed[1]>.5);
  assert.ok(tracker.smoothed.filter((_,i)=>i!==1).every(v=>v<.01));
  for(let i=0;i<35;i++) tracker.update(rest);
  assert.ok(tracker.smoothed[1]<.01);
});

test('sideways fingertip movement does not pull', () => {
  const rest=palm(), tracker=new HandCalibration(2);
  tracker.update(rest); tracker.update(rest);
  const sideways=palm(); sideways[8].z+=.18;
  for(let i=0;i<25;i++) tracker.update(sideways);
  assert.equal(tracker.smoothed[1],0);
});

test('landmark depth noise does not activate another finger', () => {
  const rest=palm(), tracker=new HandCalibration(2);
  tracker.update(rest); tracker.update(rest);
  const noisy=palm();
  noisy[4].z-=.3; noisy[12].z+=.2; noisy[20].z-=.25;
  for(let i=0;i<25;i++) tracker.update(noisy);
  assert.ok(tracker.smoothed.every(value=>value===0));
});

test('a small thumb lift pulls the left ankle without pulling other parts', () => {
  const rest=palm(), tracker=new HandCalibration(2);
  tracker.update(rest); tracker.update(rest);
  const raised=palm(); raised[4].y-=.055;
  for(let i=0;i<30;i++) tracker.update(raised);
  assert.ok(tracker.smoothed[0]>.4);
  assert.ok(tracker.smoothed.slice(1).every(value=>value<.01));
});

test('a modest ring lift responds without changing other fingers', () => {
  const tracker=new HandCalibration(2), rest=palm();
  tracker.update(rest); tracker.update(rest);
  const raised=palm(); raised[16].y-=.05;
  for(let i=0;i<10;i++) tracker.update(raised);
  assert.ok(tracker.debug.raw>.24 && tracker.debug.normalized>.3);
  assert.ok(tracker.debug.filtered>.2 && tracker.debug.final>.2);
  assert.ok(tracker.smoothed.filter((_,i)=>i!==3).every(value=>value<.01));
});

test('neighbor lifts do not trigger ring, while combined lifts remain possible', () => {
  const tracker=new HandCalibration(2), rest=palm();
  tracker.update(rest); tracker.update(rest);
  const neighbors=palm(); neighbors[12].y-=.12; neighbors[20].y-=.12; neighbors[16].y-=.015;
  for(let i=0;i<20;i++) tracker.update(neighbors);
  assert.ok(tracker.smoothed[3]<.05);
  const together=palm(); together[12].y-=.10; together[16].y-=.10; together[20].y-=.10;
  for(let i=0;i<20;i++) tracker.update(together);
  assert.ok(tracker.smoothed[2]>.2 && tracker.smoothed[3]>.2 && tracker.smoothed[4]>.2);
});

test('the whole puppet floats a little with the palm and settles when lost', () => {
  const float=new PalmFloat(), rest=palm();
  for(let i=0;i<20;i++) float.update(rest,false);
  const moved=rest.map(p=>({ ...p, x:p.x-.4, y:p.y-.3 }));
  for(let i=0;i<40;i++) float.update(moved,true);
  assert.ok(float.offset.x>.12 && float.offset.x<=.14);
  assert.ok(float.offset.y>.08 && float.offset.y<=.10);
  for(let i=0;i<100;i++) float.update(null,true);
  assert.ok(Math.abs(float.offset.x)<.001 && Math.abs(float.offset.y)<.001);
});
