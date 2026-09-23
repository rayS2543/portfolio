// The abstract wire surface is drawn locally, with no animation dependency.
const canvas = document.getElementById('flow-canvas');
const ctx = canvas.getContext('2d');
const motionButton = document.getElementById('motion-toggle');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let paused = reducedMotion.matches;
let visible = true;
let frame = 0;
let time = 0;
let last = 0;
let width = 0;
let height = 0;
let targetX = 0, targetY = 0, pointerX = 0, pointerY = 0;
function updateMotionButton() {
  motionButton.textContent = paused ? 'Play animation' : 'Pause animation';
  motionButton.setAttribute('aria-pressed', String(paused));
}
function drawSurface() {
  ctx.clearRect(0, 0, width, height);
  const scale = Math.min(width, height) * .28;
  const yaw = time * .14 + pointerX * .18;
  const tilt = .86 + Math.sin(time * .18) * .12 + pointerY * .15;
  const paths = [];
  for (let ring = 0; ring < 42; ring++) {
    const v = ring / 42 * Math.PI * 2;
    const points = [];
    let depth = 0;
    for (let step = 0; step <= 112; step++) {
      const u = step / 112 * Math.PI * 2;
      const r = 1 + .32 * Math.cos(v);
      const x = r * Math.cos(u);
      const y = .32 * Math.sin(v) + .14 * Math.sin(u * 3 + time * .2);
      const z = r * Math.sin(u);
      const rx = x * Math.cos(yaw) - z * Math.sin(yaw);
      const rz = x * Math.sin(yaw) + z * Math.cos(yaw);
      const ry = y * Math.cos(tilt) - rz * Math.sin(tilt);
      const zz = y * Math.sin(tilt) + rz * Math.cos(tilt);
      const perspective = 3.9 / (3.9 + zz);
      const roll = -.42;
      points.push([width / 2 + (rx * Math.cos(roll) - ry * Math.sin(roll)) * scale * perspective,
        height / 2 - 7 + (rx * Math.sin(roll) + ry * Math.cos(roll)) * scale * perspective]);
      depth += zz;
    }
    paths.push({points, depth:depth / 113});
  }
  paths.sort((a,b)=>b.depth-a.depth);
  for (const path of paths) {
    ctx.beginPath();
    path.points.forEach(([x,y],i)=>i ? ctx.lineTo(x,y) : ctx.moveTo(x,y));
    const alpha = Math.max(.12, Math.min(.65, .38 - path.depth * .35));
    ctx.strokeStyle = `rgba(205,218,239,${alpha})`;
    ctx.lineWidth = .75;
    ctx.stroke();
  }
}
function tick(stamp) {
  frame = 0;
  if(paused || !visible || document.hidden) {last = 0;return;}
  if(last) time += Math.min((stamp-last)/1000,.05);
  last = stamp;
  pointerX += (targetX-pointerX)*.035;
  pointerY += (targetY-pointerY)*.035;
  drawSurface();
  frame = requestAnimationFrame(tick);
}
function resume() {
  if(!frame && !paused && visible && !document.hidden) frame = requestAnimationFrame(tick);
}
function resize() {
  const bounds = canvas.getBoundingClientRect();
  width = bounds.width; height = bounds.height;
  const ratio = Math.min(devicePixelRatio || 1,2);
  canvas.width = Math.round(width*ratio);canvas.height = Math.round(height*ratio);
  ctx.setTransform(ratio,0,0,ratio,0,0);drawSurface();
}
new ResizeObserver(resize).observe(canvas);
new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;resume();}).observe(canvas);
canvas.addEventListener('pointermove',event=>{const bounds=canvas.getBoundingClientRect();targetX=(event.clientX-bounds.left)/bounds.width-.5;targetY=(event.clientY-bounds.top)/bounds.height-.5;});
canvas.addEventListener('pointerleave',()=>{targetX=0;targetY=0;});
motionButton.addEventListener('click',()=>{paused=!paused;updateMotionButton();resume();});
reducedMotion.addEventListener('change',()=>{paused=reducedMotion.matches;updateMotionButton();resume();});
document.addEventListener('visibilitychange',resume);
updateMotionButton();resize();resume();

document.documentElement.classList.add('js-reveal');
const revealObserver = new IntersectionObserver(entries=>{
  for(const entry of entries){
    if(entry.isIntersecting){
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    }
  }
},{threshold:.15});
document.querySelectorAll('.reveal').forEach(el=>revealObserver.observe(el));
