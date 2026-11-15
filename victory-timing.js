const clamp = value => Math.max(0, Math.min(1, value));
const smooth = value => { const t=clamp(value); return t*t*(3-2*t); };

export function celebrationPoseAt(elapsedMs, reducedMotion=false) {
  if(reducedMotion) return { arms:0, head:0 };
  const rise=smooth(elapsedMs/340);
  const fall=1-smooth((elapsedMs-850)/1150);
  const amount=rise*fall;
  return { arms:amount*.8, head:amount*.55 };
}

export function hatDropAt(elapsedMs, reducedMotion=false) {
  if(reducedMotion) return 0;
  const t=clamp(elapsedMs/850);
  const overshoot=1+2.2*Math.pow(t-1,3)+1.2*Math.pow(t-1,2);
  return .22*(1-overshoot);
}

export const victoryButtonsReady = (elapsedMs,reducedMotion=false) => elapsedMs >= (reducedMotion?350:2600);
