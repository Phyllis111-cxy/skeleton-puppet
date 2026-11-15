import * as THREE from 'three';

const boneMaterial = new THREE.MeshStandardMaterial({ color: 0xeee2cc, roughness: .76 });
const jointMaterial = new THREE.MeshStandardMaterial({ color: 0xd9c7ac, roughness: .84 });
const oval = new THREE.SphereGeometry(1, 10, 8);

function bone(parent, length, radius) {
  const shaft = new THREE.Mesh(oval, boneMaterial);
  shaft.position.z = length / 2;
  shaft.scale.set(radius, radius * .8, length * .57);
  parent.add(shaft);
  for (const z of [0, length]) {
    const end = new THREE.Mesh(oval, jointMaterial);
    end.position.z = z;
    end.scale.setScalar(radius * 1.27);
    parent.add(end);
  }
}

function bridge(parent, from, to, radius) {
  const start = new THREE.Vector3(...from), end = new THREE.Vector3(...to);
  const shaft = new THREE.Mesh(oval, boneMaterial);
  shaft.position.copy(start).add(end).multiplyScalar(.5);
  shaft.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), end.clone().sub(start).normalize());
  shaft.scale.set(radius, radius * .8, start.distanceTo(end) * .57);
  parent.add(shaft);
  const knuckle = new THREE.Mesh(oval, jointMaterial);
  knuckle.position.copy(start);
  knuckle.scale.setScalar(radius * 1.25);
  parent.add(knuckle);
}

export class StageHand {
  constructor() {
    this.root = new THREE.Group();
    this.root.name = 'five-finger-stage-hand';
    this.root.position.set(-.28, 2.57, -.05);
    this.root.rotation.y = .65;
    this.digits = [];
    // Match the projected order of the five puppet anchors so strings do not cross.
    const spacing = [-.25, -.50, 0, .50, .25];
    const total = [.40, .40, .40, .40, .40];
    spacing.forEach((x, i) => {
      bridge(this.root, [x * .46, (i - 2) * .014, -.34], [x, (i - 2) * .014, -.08], .029);
      const base = new THREE.Group();
      base.position.set(x, (i - 2) * .014, -.08);
      this.root.add(base);
      const segments = i === 0 ? 2 : 3;
      const lengths = segments === 2 ? [total[i] * .58, total[i] * .42]
        : [total[i] * .43, total[i] * .33, total[i] * .24];
      const joints = [];
      let parent = base;
      lengths.forEach((length, segment) => {
        const joint = new THREE.Group();
        joint.name = `${['thumb','index','middle','ring','little'][i]}-joint-${segment+1}`;
        if (segment) joint.position.z = lengths[segment - 1];
        parent.add(joint);
        bone(joint, length, .031 - segment * .004);
        joints.push(joint);
        parent = joint;
      });
      this.digits.push({ joints, lengths });
    });
    this.root.updateMatrixWorld(true);
  }

  pose(lifts) {
    this.digits.forEach(({ joints }, i) => {
      const amount = THREE.MathUtils.clamp(lifts[i] || 0, 0, 1);
      joints.forEach((joint, segment) => { joint.rotation.x = -amount * [0.7, 0.28, 0.12][segment]; });
    });
    this.root.updateMatrixWorld(true);
  }

  tip(index) {
    const { joints, lengths } = this.digits[index];
    return joints.at(-1).localToWorld(new THREE.Vector3(0, 0, lengths.at(-1)));
  }
}
