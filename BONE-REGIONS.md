# Highlight mapping in the imported skeleton

The original glTF combines most body bones into two skinned meshes. The highlight layer copies only triangles from connected surface components in the body mesh; it shares the original skin and does not change the source geometry or material.

- `leftHumerus`: one isolated upper-arm component (124 vertices, source component 17).
- `rightForearmA` and `rightForearmB`: two separate, parallel right-forearm components (82 vertices each, components 34 and 36). The source does not name these surfaces individually, so their exact radius-versus-ulna identity remains unverified. The game highlights both together and labels the pair “Radius & Ulna.”
- `leftFemur`: one isolated thigh component (155 vertices, component 4).
- `ribCage`: left and right rib surface components (952 vertices across 24 connected components). Chest clicks use a raycast hit on the actual skinned mesh plus a small world-space rib bound.
- `rightFemur`: isolated thigh component for Level 1 exploration.
- `rightHumerus`, `leftForearmA`, `leftForearmB`: Bone Challenge counterparts selected by reflecting the existing arm-region vertex positions across the model's center and retaining the matching surface vertices (126, 82, and 82 vertices). The left forearm pair shares the same radius-versus-ulna naming limitation as the right pair.
- `skull`: the model's separately skinned skull mesh for Level 1 exploration.

The component IDs are from descending connected-component size in the original body mesh; the checked vertex lists are saved in `assets/void-original/regions.json`.

The teaching highlight uses a separate skinned surface overlay with warm orange-gold color and a 280ms fade. It does not modify the original mesh, materials, joint animation, or rig. The forearm pair is still labeled together because the source does not identify which individual surface is the radius or ulna.
