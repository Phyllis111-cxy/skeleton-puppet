import {readFileSync} from 'node:fs';
import {basename} from 'node:path';
const path=process.argv[2];
if(!path){console.error('Usage: node tools/inspect-glb.mjs /path/to/model.glb');process.exit(2)}
const file=readFileSync(path);
if(file.toString('ascii',0,4)!=='glTF')throw Error('Not a GLB file');
const version=file.readUInt32LE(4),total=file.readUInt32LE(8);
if(version!==2||total!==file.length)throw Error('Invalid GLB 2.0 header');
const length=file.readUInt32LE(12),type=file.toString('ascii',16,20);
if(type!=='JSON')throw Error('GLB JSON chunk missing');
const gltf=JSON.parse(file.toString('utf8',20,20+length));
const nodes=gltf.nodes||[],meshes=gltf.meshes||[],skins=gltf.skins||[],animations=gltf.animations||[];
const names=nodes.map((n,i)=>({index:i,name:n.name||'',mesh:n.mesh,skin:n.skin,children:n.children||[]}));
const match=(rx)=>names.filter(n=>rx.test(n.name)).map(n=>`${n.index}:${n.name}`);
const bones={head:match(/skull|cranium|head|neck|cervical/i),leftShoulder:match(/left.*(shoulder|clavicle|upper.?arm|humerus)|(?:shoulder|clavicle|upper.?arm|humerus).*left|[._ -]L[._ -]/i),rightShoulder:match(/right.*(shoulder|clavicle|upper.?arm|humerus)|(?:shoulder|clavicle|upper.?arm|humerus).*right|[._ -]R[._ -]/i),elbows:match(/elbow|forearm|ulna|radius/i),wrists:match(/wrist|hand|carpal/i),hips:match(/hip|pelvis|femur|thigh/i),knees:match(/knee|patella|tibia|shin/i),ankles:match(/ankle|foot|tarsal/i),ribs:match(/rib|thorax|chest/i)};
const skinned=names.filter(n=>n.skin!==undefined);const jointSets=skins.map((s,i)=>({skin:i,joints:s.joints?.length||0,names:(s.joints||[]).map(j=>nodes[j]?.name||`#${j}`)}));
const report={file:basename(path),bytes:file.length,version,nodes:nodes.length,meshes:meshes.length,skins:skins.length,skinnedNodes:skinned.length,animations:animations.length,materials:gltf.materials?.length||0,images:gltf.images?.length||0,extensions:gltf.extensionsUsed||[],jointSets,bones,allNamedNodes:names.filter(n=>n.name).map(n=>`${n.index}:${n.name}`)};
console.log(JSON.stringify(report,null,2));
