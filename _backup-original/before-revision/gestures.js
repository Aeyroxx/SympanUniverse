/* Exercises the spring/gesture layer with real pointer events: drag-to-dismiss
   on a sheet, and a flick through the product gallery. These paths cannot be
   covered by clicking alone, and they are the whole point of the motion work. */
const puppeteer = require('puppeteer-core');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://127.0.0.1:8777';

const problems = [];
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function dragDown(page, from, distance, steps, holdMs) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(from.x, from.y + (distance * i) / steps);
    if (holdMs) await sleep(holdMs);
  }
  await page.mouse.up();
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--no-sandbox'], defaultViewport: { width: 420, height: 880, hasTouch: true },
  });
  const page = await browser.newPage();
  page.on('pageerror', e => problems.push('pageerror: ' + e.message));
  // Headless Chrome reports prefers-reduced-motion: reduce by default, which
  // makes every spring arrive instantly. Ask for full motion so the physics
  // is actually exercised; reduced motion is covered separately below.
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
  await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle2' });
  await sleep(800);

  // ---- 1. Spring maths: a critically damped spring must not overshoot ----
  const springs = await page.evaluate(async () => {
    function run(opts, target) {
      return new Promise(resolve => {
        const samples = [];
        const s = new Motion.Spring(Object.assign({
          value: 0,
          onUpdate: v => samples.push(v),
          onRest: () => resolve(samples),
        }, opts));
        s.setTarget(target);
        setTimeout(() => resolve(samples), 3000);
      });
    }
    const critical = await run({ damping: 1.0, response: 0.3 }, 100);
    const bouncy = await run({ damping: 0.7, response: 0.3 }, 100);
    return {
      criticalMax: Math.max(...critical),
      criticalSettled: critical[critical.length - 1],
      criticalFrames: critical.length,
      bouncyMax: Math.max(...bouncy),
      bouncySettled: bouncy[bouncy.length - 1],
      projectSlow: Motion.project(200),
      projectFast: Motion.project(2000),
      rubberHalf: Motion.rubberband(100, 400),
    };
  });
  console.log('springs:', JSON.stringify(springs));
  if (springs.criticalMax > 100.5) problems.push(`critically damped spring overshot to ${springs.criticalMax}`);
  if (Math.abs(springs.criticalSettled - 100) > 0.1) problems.push('critical spring did not settle on target');
  if (springs.bouncyMax <= 100.5) problems.push('under-damped spring did not overshoot at all');
  if (Math.abs(springs.bouncySettled - 100) > 0.1) problems.push('bouncy spring did not settle on target');
  if (springs.criticalFrames < 5) problems.push('spring resolved in too few frames to be an animation');
  if (!(springs.projectFast > springs.projectSlow * 5)) problems.push('momentum projection does not scale with velocity');
  if (!(springs.rubberHalf < 100)) problems.push('rubber-banding did not resist');

  // ---- 2. Interruption: re-targeting mid-flight must not jump ----
  const interrupt = await page.evaluate(async () => {
    return new Promise(resolve => {
      const seen = [];
      const s = new Motion.Spring({ value: 0, spring: 'gentle', onUpdate: v => seen.push(v) });
      s.setTarget(500);
      setTimeout(() => {
        const atSwitch = s.value;
        s.setTarget(0);                       // reverse mid-flight
        setTimeout(() => {
          // The largest single-frame step after the reversal.
          const after = seen.slice(seen.length - 20);
          let maxStep = 0;
          for (let i = 1; i < after.length; i++) maxStep = Math.max(maxStep, Math.abs(after[i] - after[i - 1]));
          resolve({ atSwitch, maxStep, continued: Math.abs(after[0] - atSwitch) });
        }, 260);
      }, 140);
    });
  });
  console.log('interruption:', JSON.stringify(interrupt));
  if (interrupt.atSwitch <= 0) problems.push('spring had not moved before the reversal');
  if (interrupt.maxStep > 40) problems.push(`reversal jumped ${interrupt.maxStep}px in one frame`);

  // ---- 3. Drag a sheet to dismiss ----
  await page.evaluate(() => document.querySelector('[data-open]').click());
  await sleep(900);
  let open = await page.evaluate(() => document.getElementById('productSheet').classList.contains('is-open'));
  if (!open) problems.push('sheet did not open before the drag test');

  const grip = await page.evaluate(() => {
    const r = document.querySelector('#productSheet .sheet-grip').getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });

  // A short, slow drag must spring back rather than dismiss.
  await dragDown(page, grip, 60, 8, 22);
  await sleep(900);
  const afterSmall = await page.evaluate(() => ({
    open: document.getElementById('productSheet').classList.contains('is-open'),
    hidden: document.getElementById('productSheet').getAttribute('aria-hidden'),
  }));
  console.log('short slow drag ->', JSON.stringify(afterSmall));
  if (afterSmall.hidden === 'true') problems.push('a short slow drag dismissed the sheet');

  // A fast flick must dismiss even from a short distance.
  await dragDown(page, grip, 140, 6, 0);
  await sleep(1100);
  const afterFlick = await page.evaluate(() => ({
    hidden: document.getElementById('productSheet').getAttribute('aria-hidden'),
    scrollUnlocked: document.body.style.position !== 'fixed',
  }));
  console.log('fast flick ->', JSON.stringify(afterFlick));
  if (afterFlick.hidden !== 'true') problems.push('a fast downward flick did not dismiss the sheet');
  if (!afterFlick.scrollUnlocked) problems.push('scroll stayed locked after a drag dismiss');

  // ---- 4. Swipe the gallery ----
  await page.evaluate(() => {
    [...document.querySelectorAll('.card-product')]
      .find(c => c.dataset.id === '108').querySelector('[data-open]').click();
  });
  await sleep(900);

  const frame = await page.evaluate(() => {
    const r = document.getElementById('galleryFrame').getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width };
  });
  const firstDot = await page.evaluate(() =>
    [...document.querySelectorAll('#galleryDots button')].findIndex(d => d.getAttribute('aria-current') === 'true'));

  await page.mouse.move(frame.x, frame.y);
  await page.mouse.down();
  for (let i = 1; i <= 6; i++) await page.mouse.move(frame.x - (frame.w * 0.5 * i) / 6, frame.y);
  await page.mouse.up();
  await sleep(1000);

  const afterSwipe = await page.evaluate(() => ({
    dot: [...document.querySelectorAll('#galleryDots button')].findIndex(d => d.getAttribute('aria-current') === 'true'),
    transform: document.getElementById('galleryTrack').style.transform,
  }));
  console.log('gallery swipe: frame', firstDot, '->', afterSwipe.dot, '| track', afterSwipe.transform);
  if (afterSwipe.dot !== firstDot + 1) problems.push(`swipe moved to frame ${afterSwipe.dot}, expected ${firstDot + 1}`);

  // The track must land exactly on a frame boundary, not between two.
  const offset = Math.abs(parseFloat(afterSwipe.transform.match(/translate3d\(\s*(-?[\d.]+)px/)[1]));
  const remainder = Math.abs((offset % frame.w));
  if (remainder > 1 && Math.abs(remainder - frame.w) > 1) {
    problems.push(`gallery settled between frames (offset ${offset}, frame ${frame.w})`);
  }

  // ---- 5. Under reduced motion the same journeys still complete ----
  const calm = await browser.newPage();
  calm.on('pageerror', e => problems.push('[reduced] pageerror: ' + e.message));
  await calm.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await calm.goto(`${BASE}/index.html`, { waitUntil: 'networkidle2' });
  await sleep(700);

  const calmSpring = await calm.evaluate(() => new Promise(resolve => {
    const seen = [];
    const s = new Motion.Spring({ value: 0, spring: 'gentle', onUpdate: v => seen.push(v) });
    s.setTarget(240);
    setTimeout(() => resolve({ frames: seen.length, settled: s.value }), 220);
  }));

  await calm.evaluate(() => document.querySelector('[data-open]').click());
  await sleep(400);
  const calmOpen = await calm.evaluate(() => ({
    open: document.getElementById('productSheet').classList.contains('is-open'),
    focused: document.getElementById('productSheet').contains(document.activeElement),
  }));
  console.log('reduced motion: spring', JSON.stringify(calmSpring), '| sheet', JSON.stringify(calmOpen));
  if (calmSpring.frames > 2) problems.push('reduced motion still animated over many frames');
  if (calmSpring.settled !== 240) problems.push('reduced motion did not arrive at the target');
  if (!calmOpen.open) problems.push('sheet did not open under reduced motion');
  if (!calmOpen.focused) problems.push('focus did not move into the sheet under reduced motion');
  await calm.close();

  await browser.close();
  console.log('\n================ PROBLEMS ================');
  console.log(problems.length ? problems.map(p => ' - ' + p).join('\n') : 'none');
  process.exit(problems.length ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR:', e); process.exit(2); });
