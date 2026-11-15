import * as THREE from 'three';

// Names come from the downloaded source glTF. The controllers beside the skin
// are animation helpers; these skin joints are the nodes that deform the mesh.
export const CHAINS = {
  leftArm: { upper: 'Bone001_031', lower: 'Bone002_032', end: 'Bone003_033', sign: -1 },
  rightArm: { upper: 'Bone001(mirrored)_07', lower: 'Bone002(mirrored)_08', end: 'Bone003(mirrored)_09', sign: 1 },
  leftLeg: { upper: 'bone_Leg_L_thig_054', lower: 'bone_Leg_L_calf_055', end: 'bone_L_foot_056', sign: 1 },
  rightLeg: { upper: 'bone_Leg_R_thig_057', lower: 'bone_Leg_R_calf_058', end: 'bone_R_foot_059', sign: -1 },
  head: { upper: 'Bone023_04', end: 'Bone024_05', sign: 1 },
};

const clamp = x => Math.max(0, Math.min(1, Number(x) || 0));
export class PuppetRig {
  constructor(gltf) {
    this.root = new THREE.Group();
    this.model = gltf.scene;
    this.root.add(this.model);
    this.model.traverse(object => {
      if (!object.isSkinnedMesh) return;
      object.material = object.material.clone();
      object.material.map = null;
      object.material.color.set(0xe9ddc6);
      object.material.roughness = .88;
      object.material.needsUpdate = true;
    });
    this.model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(this.model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    this.model.scale.setScalar(1.78 / size.y);
    this.model.position.copy(center.multiplyScalar(-1.78 / size.y));
    this.root.position.y = 1.06;
    this.root.updateMatrixWorld(true);
    this.bones = new Map();
    this.model.traverse(object => {
      if (object.isBone) this.bones.set(object.name, { object, rest: object.quaternion.clone(), angles: new THREE.Euler() });
    });
    this.chains = {};
    for (const [part, config] of Object.entries(CHAINS)) {
      const upper = this.model.getObjectByName(config.upper);
      const lower = config.lower && this.model.getObjectByName(config.lower);
      const end = this.model.getObjectByName(config.end);
      if (!upper || !end || (config.lower && !lower)) throw Error(`Missing skin joint: ${part}`);
      this.chains[part] = { ...config, upper, lower, end,
        upperRest: upper.quaternion.clone(), lowerRest: lower?.quaternion.clone(),
        amount: 0, velocity: 0, follow: 0, followVelocity: 0, target: 0 };
    }
  }

  setPull(part, value) { this.chains[part].target = clamp(value); }

  // Any of the 61 skin joints can be posed independently in the development
  // scene. Pull motion and a manual angle are combined instead of overwriting
  // one another on the next animation frame.
  setJointAngle(name, axis, degrees) {
    const bone = this.bones.get(name);
    if (!bone || !['x', 'y', 'z'].includes(axis)) return false;
    bone.angles[axis] = THREE.MathUtils.degToRad(THREE.MathUtils.clamp(Number(degrees) || 0, -90, 90));
    return true;
  }

  resetJointAngles() { for (const bone of this.bones.values()) bone.angles.set(0, 0, 0); }

  tick(time = performance.now() / 1000) {
    let activity = 0;
    for (const [part, chain] of Object.entries(this.chains)) {
      chain.velocity = (chain.velocity + (chain.target - chain.amount) * .075) * .80;
      chain.amount = clamp(chain.amount + chain.velocity);
      chain.followVelocity = (chain.followVelocity + (chain.amount - chain.follow) * .045) * .82;
      chain.follow = clamp(chain.follow + chain.followVelocity);
      activity += chain.amount;
      const a = chain.amount;
      const drift = Math.sin(time * .95 + (part.startsWith('left') ? 0 : 1.7)) * .018;
      const upperAngle = part === 'head' ? a * .16 : part.endsWith('Arm') ? a * .67 : a * .68;
      const lowerAngle = part.endsWith('Arm') ? chain.follow * .75 : chain.follow * .42;
      chain.upper.userData.pullAngle = chain.sign * (upperAngle + chain.velocity * .55 + drift);
      if (chain.lower) chain.lower.userData.pullAngle = chain.sign * (lowerAngle + chain.followVelocity * .7 + drift * .6);
    }
    // The center stays fixed while the puppet gently rocks as if in a draft.
    const breeze = Math.sin(time * .72) * .012 + Math.sin(time * 1.31 + .9) * .006;
    this.root.rotation.z = breeze * (1 + Math.min(activity, 2) * .35);
    this.root.rotation.x = Math.sin(time * .58 + 1.2) * .008;
    for (const bone of this.bones.values()) {
      bone.object.quaternion.copy(bone.rest)
        .multiply(new THREE.Quaternion().setFromEuler(bone.angles))
        .multiply(new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(0, 0, 1), bone.object.userData.pullAngle || 0));
    }
    this.root.updateMatrixWorld(true);
  }

  anchor(part) {
    this.root.updateMatrixWorld(true);
    return this.chains[part].end.getWorldPosition(new THREE.Vector3());
  }
}
