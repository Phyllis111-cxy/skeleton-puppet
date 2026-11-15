import * as THREE from 'three';
import { celebrationPoseAt, hatDropAt, victoryButtonsReady } from './victory-timing.js';

const COLORS=['#eb8544','#f4be67','#78558d','#b999d0','#e6a8bb','#79b9ad'];
const confettiCount = 112;

function makeCone(radius,height) {
  const geometry=new THREE.BufferGeometry(), positions=[], indices=[];
  const segments=24, rings=7;
  for(let row=0;row<=rings;row++) {
    const t=row/rings, r=Math.max(.004,radius*(1-t)*(.97+.04*Math.sin(t*Math.PI)));
    const bend=height*.19*t*t;
    for(let col=0;col<=segments;col++) {
      const angle=col/segments*Math.PI*2;
      positions.push(Math.cos(angle)*r+bend,t*height,Math.sin(angle)*r);
    }
  }
  for(let row=0;row<rings;row++) for(let col=0;col<segments;col++) {
    const a=row*(segments+1)+col, b=a+1, c=a+segments+1, d=c+1;
    indices.push(a,c,b,b,c,d);
  }
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}

function makeHat(rig) {
  const skull=rig.model.getObjectByName('skeleton_lowpoly_skeleton_skull_texture_0') ||
    rig.model.getObjectByName('skeleton_lowpoly_skeleton_skull_texture_0_1') ||
    [...rig.bones.values()].map(item=>item.object).find(object=>object.name.toLowerCase().includes('skull'));
  const skullMesh=skull?.isSkinnedMesh ? skull : (()=>{
    let found=null;
    rig.model.traverse(object=>{if(object.isSkinnedMesh&&object.name.toLowerCase().includes('skull')) found=object});
    return found;
  })();
  if(!skullMesh) throw Error('Cannot attach victory hat: skull mesh missing');
  rig.root.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(skullMesh);
  const size=box.getSize(new THREE.Vector3());
  const width=THREE.MathUtils.clamp(Math.max(size.x,size.z)*.62,.13,.22);
  const bone=rig.chains.head.end;
  const worldTop=new THREE.Vector3((box.min.x+box.max.x)/2,box.max.y-width*.025,(box.min.z+box.max.z)/2);
  const worldQuaternion=bone.getWorldQuaternion(new THREE.Quaternion());
  const worldScale=bone.getWorldScale(new THREE.Vector3());
  const mount=new THREE.Group();
  mount.name='victory-witch-hat-mount';
  bone.add(mount);
  mount.position.copy(bone.worldToLocal(worldTop));
  mount.quaternion.copy(worldQuaternion.invert());
  mount.scale.set(1/worldScale.x,1/worldScale.y,1/worldScale.z);

  const hat=new THREE.Group(); hat.name='victory-witch-hat'; mount.add(hat);
  const dark=new THREE.MeshStandardMaterial({color:0x302239,roughness:.88,metalness:0,side:THREE.DoubleSide});
  const edge=new THREE.MeshStandardMaterial({color:0x51405d,roughness:.9});
  const ribbon=new THREE.MeshStandardMaterial({color:0xe89a55,roughness:.75,emissive:0x4d260d,emissiveIntensity:.25});
  const brimRadius=width*.69, coneRadius=width*.47, coneHeight=width*1.28;
  const brim=new THREE.Mesh(new THREE.CylinderGeometry(brimRadius,brimRadius*.94,width*.075,40),dark);
  brim.position.y=0; hat.add(brim);
  const brimEdge=new THREE.Mesh(new THREE.TorusGeometry(brimRadius*.97,width*.025,8,40),edge);
  brimEdge.rotation.x=Math.PI/2; brimEdge.position.y=width*.008;hat.add(brimEdge);
  const point=new THREE.Mesh(makeCone(coneRadius,coneHeight),dark);
  point.position.y=width*.03;hat.add(point);
  const band=new THREE.Mesh(new THREE.CylinderGeometry(coneRadius*.97,coneRadius,width*.13,32,1,true),ribbon);
  band.position.y=width*.11;hat.add(band);
  mount.visible=false;
  return { mount, hat };
}

export class VictoryCelebration {
  constructor(rig,app) {
    this.rig=rig; this.app=app;
    ({mount:this.mount,hat:this.hat}=makeHat(rig));
    this.startedAt=null; this.canvas=null; this.pieces=[];
    this.reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  get active() { return this.startedAt!==null; }
  elapsed(now) { return this.active ? Math.max(0,now-this.startedAt) : 0; }
  pose(now) { return this.active ? celebrationPoseAt(this.elapsed(now),this.reducedMotion) : {arms:0,head:0}; }
  buttonsReady(now) { return this.active&&victoryButtonsReady(this.elapsed(now),this.reducedMotion); }
  start(now=performance.now()) {
    this.reset(); this.startedAt=now; this.mount.visible=true;
    this.hat.position.y=hatDropAt(0,this.reducedMotion);
    this.pieces=Array.from({length:this.reducedMotion?18:confettiCount},(_,i)=>({
      x:Math.random(), delay:this.reducedMotion?0:Math.random()*.22,
      speed:.78+Math.random()*.45, sway:8+Math.random()*23,
      phase:Math.random()*Math.PI*2, angle:Math.random()*Math.PI*2,
      spin:(Math.random()-.5)*5, width:5+Math.random()*5,
      height:5+Math.random()*8, color:COLORS[i%COLORS.length],
    }));
    this.canvas=document.createElement('canvas');
    this.canvas.className='victory-confetti';
    this.canvas.setAttribute('aria-hidden','true');
    this.app.append(this.canvas);
    this.resize();
  }
  resize() {
    if(!this.canvas) return;
    const dpr=Math.min(devicePixelRatio||1,2);
    this.canvas.width=Math.round(innerWidth*dpr);
    this.canvas.height=Math.round(innerHeight*dpr);
    this.canvas.getContext('2d').setTransform(dpr,0,0,dpr,0,0);
  }
  tick(now=performance.now()) {
    if(!this.active) return;
    const elapsed=this.elapsed(now);
    this.hat.position.y=hatDropAt(elapsed,this.reducedMotion);
    const duration=this.reducedMotion?900:3800;
    if(elapsed>=duration) { this.clearConfetti(); return; }
    if(!this.canvas) return;
    const ctx=this.canvas.getContext('2d');
    ctx.clearRect(0,0,innerWidth,innerHeight);
    const progress=elapsed/duration;
    for(const piece of this.pieces) {
      const t=(progress-piece.delay)/(1-piece.delay);
      if(t<0||t>1) continue;
      const x=piece.x*innerWidth+Math.sin(t*9+piece.phase)*piece.sway;
      const y=this.reducedMotion ? piece.x*innerHeight*.8+45 : -18+(innerHeight+45)*t*piece.speed;
      ctx.save(); ctx.translate(x,y);ctx.rotate(piece.angle+piece.spin*elapsed/1000);
      ctx.globalAlpha=this.reducedMotion ? Math.min(1,(1-progress)*1.6) : Math.min(1,(1-t)*4);
      ctx.fillStyle=piece.color;ctx.fillRect(-piece.width/2,-piece.height/2,piece.width,piece.height);
      ctx.restore();
    }
  }
  clearConfetti() { this.canvas?.remove();this.canvas=null;this.pieces=[]; }
  reset() {
    this.clearConfetti(); this.startedAt=null;
    this.mount.visible=false; this.hat.position.y=0;
  }
}
