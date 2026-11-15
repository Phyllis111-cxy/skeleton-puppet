// MediaPipe landmarks locate the surface of the hand; these angles are visual controls,
// not measurements of a person's internal bones or tendons.
export const INDEX_IDS = [0, 5, 6, 7, 8];
export const BONE_NAMES = ['metacarpal', 'proximal', 'middle', 'distal'];
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export function bendDegrees(a, b, c) {
  const u = [a.x - b.x, a.y - b.y, (a.z - b.z) * .6];
  const v = [c.x - b.x, c.y - b.y, (c.z - b.z) * .6];
  const dot = u[0]*v[0] + u[1]*v[1] + u[2]*v[2];
  const lengths = Math.hypot(...u) * Math.hypot(...v);
  return 180 - Math.acos(clamp(dot / (lengths || 1), -1, 1)) * 180 / Math.PI;
}
export function indexFlexion(points) {
  if (!points || points.length !== 21) return 0;
  const mcp = bendDegrees(points[0], points[5], points[6]);
  const pip = bendDegrees(points[5], points[6], points[7]);
  const dip = bendDegrees(points[6], points[7], points[8]);
  return clamp((mcp * .28 + pip * .47 + dip * .25 - 12) / 90, 0, 1);
}
export function smoothLandmarks(previous, current, alpha) {
  if (!previous) return current.map(p => ({x:p.x,y:p.y,z:p.z}));
  return current.map((p,i) => ({
    x: previous[i].x + (p.x - previous[i].x) * alpha,
    y: previous[i].y + (p.y - previous[i].y) * alpha,
    z: previous[i].z + (p.z - previous[i].z) * alpha
  }));
}
