export const FINGERS = [
  { name: 'thumb', tip: 4, base: 2, part: 'leftLeg' },
  { name: 'index', tip: 8, base: 5, part: 'leftArm' },
  { name: 'middle', tip: 12, base: 9, part: 'head' },
  { name: 'ring', tip: 16, base: 13, part: 'rightArm' },
  { name: 'little', tip: 20, base: 17, part: 'rightLeg' },
];

const clamp = value => Math.max(0, Math.min(1, value));
const sub = (a,b) => [a.x-b.x,a.y-b.y,a.z-b.z];

// Use the palm plane as a local reference so a flat, side-view hand can move
// or pitch without falsely pulling the strings.
export function liftScores(points) {
  if (!points || points.length < 21) return null;
  if (points.some(p=>!p || ![p.x,p.y,p.z].every(Number.isFinite))) return null;
  // A horizontal, palm-down hand seen from the side has unreliable landmark z.
  // Measure each tip in the image plane, perpendicular to the wrist-to-knuckle
  // direction. This removes whole-hand translation and most hand pitch.
  const forward=sub(points[9],points[0]);
  const length=Math.hypot(forward[0],forward[1]);
  if (length < .025) return null;
  const up=[forward[1]/length,-forward[0]/length];
  if (up[1]>0) { up[0]*=-1; up[1]*=-1; }
  return FINGERS.map(({ tip, base }, i) => {
    const delta=sub(points[tip],points[base]);
    // The thumb is shorter and travels less in the image than the other digits.
    return (delta[0]*up[0] + delta[1]*up[1])/length * (i === 0 ? 1.8 : 1);
  });
}

export class HandCalibration {
  constructor(samplesNeeded = 20) {
    this.samplesNeeded = samplesNeeded;
    this.reset();
  }

  reset() {
    this.samples = [];
    this.baseline = null;
    this.smoothed = [0, 0, 0, 0, 0];
    this.debug = { raw: 0, normalized: 0, filtered: 0, final: 0 };
  }

  update(points) {
    const scores = liftScores(points);
    if (!scores) {
      this.smoothed = this.smoothed.map(value => value * .85);
      return { ready: Boolean(this.baseline), pulls: [...this.smoothed] };
    }
    if (!this.baseline) {
      this.samples.push(scores);
      if (this.samples.length >= this.samplesNeeded) {
        this.baseline = scores.map((_, i) =>
          this.samples.reduce((sum, row) => sum + row[i], 0) / this.samples.length);
      }
      return { ready: Boolean(this.baseline), pulls: [...this.smoothed] };
    }
    const deltas=scores.map((score,i)=>score-this.baseline[i]);
    // Suppress neighboring-finger spillover without penalizing an intentional combined lift.
    const ringRaw=deltas[3];
    const neighborLead=Math.max(0,deltas[2]-ringRaw,deltas[4]-ringRaw);
    const ringIsolated=ringRaw-neighborLead*.25;
    const ringNormalized=clamp((ringIsolated-.11)/.43);
    this.smoothed = scores.map((score, i) => {
      const pull=i===3 ? ringNormalized : clamp((score - this.baseline[i] - (i === 0 ? .07 : .18)) / (i === 0 ? .38 : .55));
      return this.smoothed[i] + (pull - this.smoothed[i]) * (i===3 ? .24 : .18);
    });
    this.debug={raw:ringRaw,normalized:ringNormalized,filtered:this.smoothed[3],final:this.smoothed[3]};
    return { ready: true, pulls: [...this.smoothed] };
  }
}

export class PalmFloat {
  constructor() { this.reset(); }
  reset() { this.baseline = null; this.offset = { x: 0, y: 0 }; }

  update(points, calibrated) {
    const valid = points?.length >= 21 && [0,5,9,13,17].every(i =>
      points[i] && Number.isFinite(points[i].x) && Number.isFinite(points[i].y));
    if (valid) {
      const ids = [0,5,9,13,17];
      const palm = {
        x: ids.reduce((sum,i)=>sum+points[i].x,0)/ids.length,
        y: ids.reduce((sum,i)=>sum+points[i].y,0)/ids.length,
      };
      if (!this.baseline) this.baseline = palm;
      if (!calibrated) {
        this.baseline.x += (palm.x-this.baseline.x)*.12;
        this.baseline.y += (palm.y-this.baseline.y)*.12;
      }
      const targetX = calibrated ? Math.max(-.14, Math.min(.14, (this.baseline.x-palm.x)*.42)) : 0;
      const targetY = calibrated ? Math.max(-.10, Math.min(.10, (this.baseline.y-palm.y)*.32)) : 0;
      this.offset.x += (targetX-this.offset.x)*.10;
      this.offset.y += (targetY-this.offset.y)*.10;
    } else {
      this.offset.x *= .92;
      this.offset.y *= .92;
    }
    return { ...this.offset };
  }
}
