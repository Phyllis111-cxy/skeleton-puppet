// Display-only Level 2 card content. GameFlow retains the original task logic.
export const BONE_CARDS = [
  { image: 'humerus.png', title: 'HUMERUS', paragraphs: [
    [['Your ', false], ['upper arm', true], [' has one long bone called the ', false], ['humerus', true], ['.', false]],
    [['It connects your ', false], ['shoulder', true], [' to your ', false], ['elbow', true], ['.', false]],
    [['It helps your arm ', false], ['move', true], [' when you lift or reach.', false]],
  ] },
  { image: 'radius-ulna.png', title: 'RADIUS & ULNA', paragraphs: [
    [['Your ', false], ['forearm', true], [' has ', false], ['two bones', true], [': the ', false], ['radius', true], [' and the ', false], ['ulna', true], ['.', false]],
    [['They work together to let you ', false], ['turn', true], [' your palm up and down.', false]],
    [['Try ', false], ['rotating', true], [' your own forearm!', false]],
  ] },
  { image: 'femur.png', title: 'FEMUR', paragraphs: [
    [['The femur is the ', false], ['longest', true], [' and one of the ', false], ['strongest', true], [' bones in your body.', false]],
    [['It connects your ', false], ['hip', true], [' to your ', false], ['knee', true], ['.', false]],
    [['It helps ', false], ['support', true], [' your weight when you stand, walk, or jump.', false]],
  ] },
  { image: 'rib-cage.png', title: 'RIB CAGE', paragraphs: [
    [['Most people have ', false], ['12 pairs', true], [' of ribs.', false]],
    [['Your ribs help ', false], ['protect', true], [' your ', false], ['heart', true], [' and ', false], ['lungs', true], ['.', false]],
    [['They also move slightly as you ', false], ['breathe', true], ['.', false]],
  ] },
];

export function renderBoneCard(index, image, title, body) {
  const card = BONE_CARDS[index];
  if (!card) return;
  image.src = `./public/images/bones/${card.image}`;
  image.alt = `${card.title.toLowerCase()} bone illustration`;
  title.textContent = card.title;
  body.replaceChildren();
  for (const segments of card.paragraphs) {
    const paragraph = document.createElement('p');
    for (const [value, emphasized] of segments) {
      if (emphasized) {
        const mark = document.createElement('span');
        mark.className = 'fact-keyword';
        mark.textContent = value;
        paragraph.append(mark);
      } else paragraph.append(document.createTextNode(value));
    }
    body.append(paragraph);
  }
}
