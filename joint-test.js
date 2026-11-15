import * as THREE from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {PuppetRig} from './puppet-rig.js';
const $=s=>document.querySelector(s),host=$('#view'),scene=new THREE.Scene();scene.background=new THREE.Color(0x160f25);
const camera=new THREE.PerspectiveCamera(35,1,.01,200);camera.position.set(0,1,5);scene.add(new THREE.HemisphereLight(0xd8c9e9,0x665142,3));const lamp=new THREE.DirectionalLight(0xffd2a0,2.5);lamp.position.set(-3,5,5);scene.add(lamp);
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));host.append(renderer.domElement);let root=null,nodes=[],selected=null,original=new Map(),puppetRig=null;
function resize(){const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix()}window.addEventListener('resize',resize);resize();function frame(){puppetRig?.tick();renderer.render(scene,camera);requestAnimationFrame(frame)}frame();
async function inspect(gltf,fileName){try{if(root)scene.remove(root);puppetRig=new PuppetRig(gltf);root=puppetRig.root;scene.add(root);nodes=[];original.clear();let meshes=0,skinned=0,bones=0;root.traverse(o=>{if(o.isMesh||o.isSkinnedMesh){meshes++;if(o.isSkinnedMesh)skinned++}if(o.isBone)bones++;if(o.name||o.isBone){nodes.push(o);original.set(o,o.quaternion.clone())}});const box=new THREE.Box3().setFromObject(root),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());root.position.sub(center);const span=Math.max(size.x,size.y,size.z);camera.position.set(0,span*.2,span*2.4);camera.lookAt(0,0,0);camera.near=Math.max(.001,span/1000);camera.far=span*100;camera.updateProjectionMatrix();$('#stats').textContent=`${meshes} meshes · ${skinned} skinned meshes · ${bones} joints · ${gltf.animations.length} animations`;const list=$('#joints');list.replaceChildren(...nodes.map((o,i)=>{const option=document.createElement('option');option.value=i;option.textContent=`${o.isBone?'◆ ':''}${o.name||'(unnamed bone)'}`;return option}));$('#status').textContent=`Loaded ${fileName}; ready to test five pull points`;selected=null}catch(err){$('#status').textContent=`Could not load: ${err.message}`;console.error(err)}}
$('#file').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;$('#status').textContent='Reading model…';try{inspect(await new GLTFLoader().parseAsync(await file.arrayBuffer(),''),file.name)}catch(err){$('#status').textContent=`Could not load: ${err.message}`}});
new GLTFLoader().load('./assets/void-original/model/Lowpoly Human Skeleton (Rigged).gltf',gltf=>inspect(gltf,'Void original glTF'),undefined,err=>{$('#status').textContent=`Model failed to load: ${err.message}`;console.error(err)});
$('#joints').addEventListener('change',e=>{selected=nodes[Number(e.target.value)];for(const axis of ['x','y','z'])$('#'+axis).value='0'});
for(const axis of ['x','y','z'])$('#'+axis).addEventListener('input',()=>{if(!selected)return;if(selected.isBone){for(const a of ['x','y','z'])puppetRig?.setJointAngle(selected.name,a,$('#'+a).value)}else{selected.quaternion.copy(original.get(selected));selected.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(...['x','y','z'].map(a=>Number($('#'+a).value)*Math.PI/180))))}});
$('#reset').onclick=()=>{for(const [o,q] of original)o.quaternion.copy(q);puppetRig?.resetJointAngles();for(const a of ['x','y','z'])$('#'+a).value='0';for(const part of ['leftArm','rightArm','leftLeg','rightLeg','head']){$('#pull-'+part).value='0';puppetRig?.setPull(part,0)}};

const pullLabels = {leftArm:'Left wrist',rightArm:'Right wrist',leftLeg:'Left ankle',rightLeg:'Right ankle',head:'Head'};
for (const [part,label] of Object.entries(pullLabels)) {
  const row=document.createElement('label');
  row.textContent=label+' pull ';
  const slider=document.createElement('input');
  slider.type='range';slider.min='0';slider.max='100';slider.value='0';slider.id='pull-'+part;
  slider.addEventListener('input',()=>puppetRig?.setPull(part,Number(slider.value)/100));
  row.append(slider);$('#pull-tests').append(row);
}

const jointPresets = [
 ['Left shoulder','Bone001_031'],['Left elbow','Bone002_032'],
 ['Right shoulder','Bone001(mirrored)_07'],['Right elbow','Bone002(mirrored)_08'],
 ['Left hip','bone_Leg_L_thig_054'],['Left knee','bone_Leg_L_calf_055'],
 ['Right hip','bone_Leg_R_thig_057'],['Right knee','bone_Leg_R_calf_058'],
 ['Neck','Bone023_04'],
];
for(const [label,name] of jointPresets){
 const button=document.createElement('button');button.textContent=label;
 button.onclick=()=>{
  const index=nodes.findIndex(node=>node.name===name);
  if(index<0)return;
  $('#joints').value=String(index);selected=nodes[index];
  for(const a of ['x','y','z'])$('#'+a).value='0';
  $('#z').value='45';puppetRig?.setJointAngle(name,'z',45);
 };
 $('#joint-presets').append(button);
}
