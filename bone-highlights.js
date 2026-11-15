import * as THREE from 'three';

const orange = 0xffb35c;
const TRANSITION_SECONDS = .28;

export class BoneHighlights {
  constructor(rig, regions) {
    this.rig=rig;
    this.items=new Map();
    const body=[];
    rig.model.traverse(object=>{
      if(!object.isSkinnedMesh) return;
      if(object.name.includes('skull')) this.skullSource ||= object;
      else body.push(object);
    });
    for(const [name,vertices] of Object.entries(regions)) {
      const selected=new Set(vertices), overlays=[];
      for(const source of body) {
        const index=source.geometry.index;
        if(!index || source.geometry.getAttribute('position').count<=Math.max(...vertices)) continue;
        const kept=[];
        for(let i=0;i<index.count;i+=3) {
          const a=index.getX(i),b=index.getX(i+1),c=index.getX(i+2);
          if(selected.has(a)&&selected.has(b)&&selected.has(c)) kept.push(a,b,c);
        }
        if(!kept.length) continue;
        const geometry=source.geometry.clone();
        geometry.setIndex(kept);
        const material=new THREE.MeshBasicMaterial({color:orange,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2,toneMapped:false});
        const overlay=new THREE.SkinnedMesh(geometry,material);
        overlay.name=`highlight-${name}`;
        overlay.bindMode=source.bindMode;
        overlay.bind(source.skeleton,source.bindMatrix);
        overlay.position.copy(source.position); overlay.quaternion.copy(source.quaternion); overlay.scale.copy(source.scale);
        overlay.frustumCulled=false;
        source.parent.add(overlay);
        overlays.push(overlay);
      }
      this.items.set(name,{overlays,opacity:0,target:0,vertices});
    }
    this.items.set('skull',{overlays:[],opacity:0,target:0});
    if(this.skullSource) {
      const source=this.skullSource;
      const overlay=new THREE.SkinnedMesh(source.geometry.clone(),new THREE.MeshBasicMaterial({color:orange,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2,toneMapped:false}));
      overlay.bindMode=source.bindMode; overlay.bind(source.skeleton,source.bindMatrix);
      overlay.position.copy(source.position); overlay.quaternion.copy(source.quaternion); overlay.scale.copy(source.scale);
      overlay.frustumCulled=false; source.parent.add(overlay);
      this.items.get('skull').overlays.push(overlay);
    }
    this.bodySource=body[0];
    this.ribVertices=regions.ribCage||[];
  }
  setTargets(targets={}) {
    for(const [name,item] of this.items) item.target=targets[name]||0;
  }
  tick(deltaSeconds=1/60) {
    const step=Math.min(1,Math.max(0,deltaSeconds)/TRANSITION_SECONDS);
    for(const item of this.items.values()) {
      item.opacity+=Math.sign(item.target-item.opacity)*Math.min(Math.abs(item.target-item.opacity),step);
      for(const mesh of item.overlays) { mesh.material.opacity=item.opacity; mesh.visible=item.opacity>.005; }
    }
  }
  ribHit(worldPoint) {
    if(!this.bodySource) return false;
    const source=this.bodySource, pos=source.geometry.getAttribute('position');
    const bounds=new THREE.Box3();
    source.updateWorldMatrix(true,false);
    for(const i of this.ribVertices) {
      const point=new THREE.Vector3().fromBufferAttribute(pos,i);
      source.applyBoneTransform(i,point);
      bounds.expandByPoint(source.localToWorld(point));
    }
    bounds.expandByVector(new THREE.Vector3(.045,.055,.06));
    return bounds.containsPoint(worldPoint);
  }
}
