/* =========================================================
   EFFECTS — hiệu ứng bổ sung cho "A Little Universe" (FT 537)
   ---------------------------------------------------------
   Chạy SAU main.js, chỉ "nghe" DOM (đổi cảnh, bấm sao, mở thư…)
   nên không cần sửa logic trong main.js / content.js.

   Gồm có:
   • Chữ tiêu đề hiện từng ký tự + sóng ánh vàng
   • Pháo hoa (hình tròn, trái tim, ngôi sao, chữ "20/11"…) ở cảnh 2 và 6
   • Pháo giấy confetti, cánh hoa rơi, trái tim bay, sao băng
   • Vệt sao theo con trỏ, bắn tia sáng khi bấm, lấp lánh khi rê chuột
   • Hiệu ứng "nhảy sao" (warp) khi chuyển cảnh
   • Quầng sáng bokeh, parallax nền theo con trỏ
   • Ảnh Polaroid xoay 3D theo chuột, ánh sáng lướt qua
   • Phong thư mở ra kèm tim / hoa, chòm sao hoàn thiện có pháo hoa…

   Chỉnh nhanh ở khối FX bên dưới. Tắt cả file: xóa thẻ <script> trong index.html.
   ========================================================= */
(() => {
  'use strict';

  // ======================= CẤU HÌNH =======================
  const FX = {
    cursorTrail: true,   // vệt sao theo con trỏ (chỉ máy tính)
    clickBurst: true,    // bấm / chạm là bắn tia sáng
    hoverSparkle: true,  // rê chuột lên nút / ảnh / ngôi sao thì lấp lánh
    fireworks: true,     // pháo hoa cảnh 2 và cảnh 6
    confetti: true,      // pháo giấy
    petals: true,        // cánh hoa rơi
    hearts: true,        // trái tim bay lên
    warp: true,          // hiệu ứng nhảy sao khi chuyển cảnh
    twinkles: true,      // sao nhỏ lấp lánh trong từng cảnh
    parallax: true,      // nền xê dịch nhẹ theo con trỏ
    bokeh: 16,           // số quầng sáng bay lên ở nền (0 = tắt)
    intensity: 1         // 0.5 = nhẹ hơn · 1 = mặc định · 1.5 = nhiều hơn
  };
  // Chữ sẽ "nổ" thành hình bằng pháo hoa (đổi tên lớp, ngày… tại đây)
  const FIREWORK_TEXTS = ['20/11', 'FT 537', '537'];
  // =========================================================

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;                       // người xem tắt chuyển động → giữ trang tĩnh

  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const root = document.documentElement;
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const TAU = Math.PI * 2;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = list => list[(Math.random() * list.length) | 0];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const isSmall = () => window.innerWidth < 760;

  const scenes = $$('.scene');
  if (!scenes.length) return;

  // ===================================================================
  // 1. CHỮ TIÊU ĐỀ: tách thành từng ký tự để hiện lần lượt
  // ===================================================================
  function splitTextNode(node, counter) {
    const frag = document.createDocumentFragment();
    node.nodeValue.split(/(\s+)/).forEach(part => {
      if (!part) return;
      if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
      const word = document.createElement('span');
      word.className = 'fx-word';
      word.setAttribute('aria-hidden', 'true');
      Array.from(part).forEach(ch => {
        const c = document.createElement('span');
        c.className = 'fx-char';
        c.textContent = ch;
        c.style.setProperty('--i', counter.n++);
        word.appendChild(c);
      });
      frag.appendChild(word);
    });
    node.replaceWith(frag);
  }

  function walkText(node, counter) {
    Array.from(node.childNodes).forEach(child => {
      if (child.nodeType === 3) splitTextNode(child, counter);
      else if (child.nodeType === 1 && child.tagName !== 'BR') walkText(child, counter);
    });
  }

  function splitHeadings() {
    $$('.intro-title, .celebrate-title, .section-title, .finale-title').forEach(heading => {
      if (heading.dataset.fxSplit) return;
      heading.dataset.fxSplit = '1';
      const parts = $$('[data-copy]', heading).map(el => el.textContent.trim()).filter(Boolean);
      heading.setAttribute('aria-label', parts.length ? parts.join(' ') : heading.textContent.replace(/\s+/g, ' ').trim());
      walkText(heading, { n: 0 });
    });
    const deco = $('.finale-constellation');
    if (deco && !deco.dataset.fxSplit) {
      deco.dataset.fxSplit = '1';
      deco.setAttribute('aria-hidden', 'true');
      walkText(deco, { n: 0 });
    }
  }

  // ===================================================================
  // 2. TRANG TRÍ DOM: sao lấp lánh, bokeh, nhạc equalizer, ảnh, thư…
  // ===================================================================
  const TWINKLE_COLORS = ['#f2d99b', '#fff4cf', '#c9b8ff', '#9fd0ff', '#ffc4d8'];
  function twinkleHTML() {
    const glyph = pick(['✦', '✧', '✦', '·', '⋆', '✶']);
    return `<i style="--x:${rand(2, 98).toFixed(1)}%;--y:${rand(4, 96).toFixed(1)}%;--s:${rand(7, 18).toFixed(0)}px;` +
      `--d:${rand(3, 7).toFixed(1)}s;--dl:${(-rand(0, 7)).toFixed(1)}s;--tc:${pick(TWINKLE_COLORS)};--o:${rand(.45, .95).toFixed(2)}">${glyph}</i>`;
  }

  function buildTwinkles() {
    if (!FX.twinkles) return;
    const counts = [26, 8, 6, 8, 20, 0];
    scenes.forEach((scene, i) => {
      const n = Math.round((counts[i] ?? 18) * FX.intensity * (isSmall() ? .7 : 1));
      if (!n) return;
      const box = document.createElement('div');
      box.className = 'fx-twinkles';
      box.setAttribute('aria-hidden', 'true');
      box.innerHTML = Array.from({ length: n }, twinkleHTML).join('');
      scene.prepend(box);
    });
    const finale = $('.finale-sparkles');
    if (finale) finale.innerHTML = Array.from({ length: Math.round(14 * FX.intensity) }, twinkleHTML).join('');
  }

  function buildBokeh() {
    const box = $('#bokeh');
    if (!box || !FX.bokeh) return;
    const colors = ['255,226,160', '190,170,255', '150,200,255', '255,170,205', '170,235,215'];
    const n = Math.round(FX.bokeh * FX.intensity);
    for (let i = 0; i < n; i++) {
      const orb = document.createElement('i');
      orb.className = 'bokeh-orb';
      const duration = rand(26, 52);
      orb.style.setProperty('--x', `${rand(0, 96).toFixed(1)}%`);
      orb.style.setProperty('--s', `${rand(26, 110).toFixed(0)}px`);
      orb.style.setProperty('--b', `${rand(1, 5).toFixed(1)}px`);
      orb.style.setProperty('--d', `${duration.toFixed(1)}s`);
      orb.style.setProperty('--dl', `${(-rand(0, duration)).toFixed(1)}s`);
      orb.style.setProperty('--dx', `${rand(-90, 90).toFixed(0)}px`);
      orb.style.setProperty('--o', rand(.14, .36).toFixed(2));
      orb.style.setProperty('--c', pick(colors));
      box.appendChild(orb);
    }
  }

  function decorateMusicButton() {
    const state = $('.music-toggle .music-state');
    if (!state || $('.music-toggle .eq')) return;
    const eq = document.createElement('span');
    eq.className = 'eq';
    eq.setAttribute('aria-hidden', 'true');
    eq.innerHTML = '<i></i><i></i><i></i><i></i>';
    state.before(eq);
  }

  function decoratePhotos() {
    $$('.photo-card').forEach((card, i) => {
      card.style.setProperty('--i', i);
      card.style.setProperty('--bd', `${rand(5.5, 9).toFixed(1)}s`);
      card.style.setProperty('--bl', `${(-rand(0, 8)).toFixed(1)}s`);
      card.style.setProperty('--ba', `${(-rand(5, 11)).toFixed(0)}px`);
      if (!finePointer) return;
      card.addEventListener('pointermove', event => {
        const r = card.getBoundingClientRect();
        const px = clamp((event.clientX - r.left) / r.width, 0, 1);
        const py = clamp((event.clientY - r.top) / r.height, 0, 1);
        card.style.setProperty('--ry', `${((px - .5) * 18).toFixed(1)}deg`);
        card.style.setProperty('--rx', `${(-(py - .5) * 18).toFixed(1)}deg`);
        card.style.setProperty('--gx', `${(px * 100).toFixed(0)}%`);
        card.style.setProperty('--gy', `${(py * 100).toFixed(0)}%`);
      });
      card.addEventListener('pointerleave', () => {
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      });
    });
    $$('.film-ribbon').forEach(ribbon => $$('.film-frame', ribbon).forEach((frame, i) => frame.style.setProperty('--i', i)));
  }

  function decorateLetter() {
    const paragraphs = $$('.letter-copy p');
    paragraphs.forEach((p, i) => p.style.setProperty('--pi', i));
    const signoff = $('.letter-signoff');
    if (signoff) signoff.style.setProperty('--np', paragraphs.length);
  }

  // Nền dịch chuyển nhẹ theo con trỏ (parallax)
  function setupParallax() {
    if (!FX.parallax || !finePointer) return;
    let tx = 0, ty = 0, cx = 0, cy = 0, frame = 0;
    const tick = () => {
      cx += (tx - cx) * .06;
      cy += (ty - cy) * .06;
      root.style.setProperty('--mx', cx.toFixed(4));
      root.style.setProperty('--my', cy.toFixed(4));
      frame = (Math.abs(tx - cx) > .002 || Math.abs(ty - cy) > .002) ? requestAnimationFrame(tick) : 0;
    };
    window.addEventListener('pointermove', event => {
      if (event.pointerType === 'touch') return;
      tx = (event.clientX / window.innerWidth) * 2 - 1;
      ty = (event.clientY / window.innerHeight) * 2 - 1;
      if (!frame) frame = requestAnimationFrame(tick);
    }, { passive: true });
  }

  // ===================================================================
  // 3. ĐỘNG CƠ HẠT (canvas): pháo hoa, confetti, cánh hoa, tia sáng…
  // ===================================================================
  const PAL = {
    gold: [255, 222, 150], white: [255, 250, 236], lav: [196, 176, 255], rose: [255, 160, 196],
    sky: [140, 200, 255], peach: [255, 190, 140], mint: [160, 235, 210]
  };
  const rgba = (name, a) => `rgba(${PAL[name].join(',')},${a})`;
  const STROKE = {};
  Object.keys(PAL).forEach(name => { STROKE[name] = `rgb(${PAL[name].join(',')})`; });

  // Vẽ sẵn các "sprite" phát sáng để dùng lại cho nhanh
  const sprites = {};
  function makeCanvas(size, draw) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    draw(canvas.getContext('2d'), size);
    return canvas;
  }
  Object.keys(PAL).forEach(name => {
    const [r, g, b] = PAL[name];
    sprites[name] = {
      glow: makeCanvas(64, (x, s) => {
        const grad = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
        grad.addColorStop(0, 'rgba(255,255,255,1)');
        grad.addColorStop(.16, `rgba(${r},${g},${b},.95)`);
        grad.addColorStop(.45, `rgba(${r},${g},${b},.28)`);
        grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
        x.fillStyle = grad;
        x.fillRect(0, 0, s, s);
      }),
      star: makeCanvas(96, (x, s) => {
        const h = s / 2;
        const halo = x.createRadialGradient(h, h, 0, h, h, h * .6);
        halo.addColorStop(0, `rgba(${r},${g},${b},.5)`);
        halo.addColorStop(1, `rgba(${r},${g},${b},0)`);
        x.fillStyle = halo;
        x.fillRect(0, 0, s, s);
        const spike = (R, k, alpha) => {
          x.beginPath();
          x.moveTo(h, h - R);
          x.quadraticCurveTo(h + k, h - k, h + R, h);
          x.quadraticCurveTo(h + k, h + k, h, h + R);
          x.quadraticCurveTo(h - k, h + k, h - R, h);
          x.quadraticCurveTo(h - k, h - k, h, h - R);
          x.closePath();
          const grad = x.createRadialGradient(h, h, 0, h, h, R);
          grad.addColorStop(0, `rgba(255,255,255,${alpha})`);
          grad.addColorStop(.4, `rgba(${r},${g},${b},${alpha * .9})`);
          grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
          x.fillStyle = grad;
          x.fill();
        };
        spike(h * .96, h * .09, 1);
        x.save(); x.translate(h, h); x.rotate(Math.PI / 4); x.translate(-h, -h);
        spike(h * .5, h * .08, .7);
        x.restore();
      }),
      heart: makeCanvas(64, (x, s) => {
        x.translate(s / 2, s / 2 + 2);
        x.beginPath();
        for (let i = 0; i <= 64; i++) {
          const t = (i / 64) * TAU;
          const px = 16 * Math.pow(Math.sin(t), 3) * 1.5;
          const py = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * 1.5;
          if (i) x.lineTo(px, py); else x.moveTo(px, py);
        }
        x.closePath();
        x.shadowColor = `rgba(${r},${g},${b},.9)`;
        x.shadowBlur = 8;
        const grad = x.createRadialGradient(-5, -6, 1, 0, 0, 26);
        grad.addColorStop(0, 'rgba(255,255,255,.95)');
        grad.addColorStop(.5, `rgba(${r},${g},${b},.95)`);
        grad.addColorStop(1, `rgba(${r},${g},${b},.78)`);
        x.fillStyle = grad;
        x.fill();
      })
    };
  });

  const canvasBack = $('#fxBack');
  const canvasFront = $('#fxFront');
  if (!canvasBack || !canvasFront) return;

  function makeLayer(canvas, fade) {
    canvas.style.display = 'none';
    return { canvas, ctx: canvas.getContext('2d'), p: [], w: 0, h: 0, dpr: 1, fade, shown: false };
  }
  const back = makeLayer(canvasBack, 0);    // phía sau chữ: pháo hoa
  const front = makeLayer(canvasFront, 0);  // phía trước: con trỏ, confetti, cánh hoa…
  const layers = [back, front];

  function sizeLayers() {
    layers.forEach(L => {
      L.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      L.w = window.innerWidth;
      L.h = window.innerHeight;
      L.canvas.width = Math.floor(L.w * L.dpr);
      L.canvas.height = Math.floor(L.h * L.dpr);
      L.ctx.setTransform(L.dpr, 0, 0, L.dpr, 0, 0);
    });
  }
  sizeLayers();
  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { sizeLayers(); positionRays(); }, 150);
  }, { passive: true });

  let quality = 1;                                  // tự giảm khi máy yếu
  const N = n => Math.max(1, Math.round(n * quality * FX.intensity * (isSmall() ? .72 : 1)));

  let raf = 0, lastTime = 0, fpsTime = 0, fpsFrames = 0;
  function kick() {
    if (!raf) { lastTime = performance.now(); raf = requestAnimationFrame(frame); }
  }
  function push(L, particle) {
    if (L.p.length > 1500) return;
    L.p.push(particle);
    if (!L.shown) { L.canvas.style.display = 'block'; L.shown = true; }
    kick();
  }

  function move(a, k) {
    if (a.drag) { const d = Math.pow(a.drag, k); a.vx *= d; a.vy *= d; }
    a.vy += (a.g || 0) * k;
    a.x += a.vx * k;
    a.y += a.vy * k;
  }

  function stepLayer(L, k) {
    const { ctx, p, dpr } = L;
    if (L.fade) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.globalAlpha = 1 - Math.pow(1 - L.fade, k);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, L.w, L.h);
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, L.w, L.h);
    }

    for (let i = p.length - 1; i >= 0; i--) {
      const a = p[i];
      if (a.delay > 0) { a.delay -= k; continue; }
      a.age += k;
      const t = Math.min(1, a.age / a.life);
      let dead = a.age >= a.life;

      if (!dead) {
        switch (a.k) {
          case 'glow': {                                   // hạt sáng (pháo hoa, đuôi tên lửa)
            move(a, k);
            const alpha = a.a * Math.pow(1 - t, 1.25) * (a.fl ? .62 + .38 * Math.sin(a.age * 1.8 + a.seed) : 1);
            const s = a.size * (1 - .4 * t);
            ctx.globalCompositeOperation = 'lighter';
            if (a.tr) {                                    // đuôi sáng kéo dài theo hướng bay
              ctx.globalAlpha = alpha * .6;
              ctx.strokeStyle = STROKE[a.col];
              ctx.lineWidth = Math.max(1, s * .2);
              ctx.lineCap = 'round';
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(a.x - a.vx * a.tr, a.y - a.vy * a.tr);
              ctx.stroke();
            }
            ctx.globalAlpha = alpha;
            ctx.drawImage(sprites[a.col].glow, a.x - s / 2, a.y - s / 2, s, s);
            break;
          }
          case 'spark': {                                  // ngôi sao 4 cánh
            move(a, k);
            a.rot += a.vr * k;
            const f = Math.sin(Math.PI * t);
            const alpha = a.a * Math.pow(f, .7) * (a.tw ? .75 + .25 * Math.sin(a.age * .45 + a.seed) : 1);
            const s = a.size * (.5 + .5 * f);
            const c = Math.cos(a.rot) * dpr, sn = Math.sin(a.rot) * dpr;
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = alpha;
            ctx.setTransform(c, sn, -sn, c, a.x * dpr, a.y * dpr);
            ctx.drawImage(sprites[a.col].star, -s / 2, -s / 2, s, s);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            break;
          }
          case 'ring': {                                   // vòng sóng lan ra
            const e = 1 - Math.pow(1 - t, 3);
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 1;
            ctx.strokeStyle = rgba(a.col, a.a * (1 - t));
            ctx.lineWidth = Math.max(.5, a.lw * (1 - t));
            ctx.beginPath();
            ctx.arc(a.x, a.y, a.r0 + (a.r1 - a.r0) * e, 0, TAU);
            ctx.stroke();
            break;
          }
          case 'flash': {                                  // quầng sáng lóe
            const s = a.s0 + (a.s1 - a.s0) * (1 - Math.pow(1 - t, 2));
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = a.a * Math.pow(1 - t, 1.6);
            ctx.drawImage(sprites[a.col].glow, a.x - s / 2, a.y - s / 2, s, s);
            break;
          }
          case 'rocket': {                                 // tên lửa pháo hoa
            move(a, k);
            if (Math.random() < .35 * Math.min(1, k)) {
              push(back, { k: 'glow', x: a.x, y: a.y, vx: rand(-.3, .3), vy: rand(.2, .9), drag: .96, g: .02, age: 0, life: rand(16, 28), size: rand(4, 7), col: 'gold', a: .55, seed: 0 });
            }
            const tx = a.x - a.vx * 9, ty = a.y - a.vy * 9;
            const rg = ctx.createLinearGradient(a.x, a.y, tx, ty);
            rg.addColorStop(0, 'rgba(255,240,200,.95)');
            rg.addColorStop(1, 'rgba(255,200,110,0)');
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 1;
            ctx.strokeStyle = rg;
            ctx.lineWidth = 2.2;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(tx, ty);
            ctx.stroke();
            ctx.drawImage(sprites.white.glow, a.x - 6, a.y - 6, 12, 12);
            if (a.vy >= -.7) dead = true;
            break;
          }
          case 'confetti': {                               // pháo giấy
            move(a, k);
            a.x += Math.sin(a.age * .08 + a.ph) * .35 * k;
            a.rot += a.vr * k;
            if (a.y > L.h + 30) { dead = true; break; }
            const flip = Math.cos(a.ph + a.age * a.fs);
            const c = Math.cos(a.rot) * dpr, sn = Math.sin(a.rot) * dpr;
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = (t > .88 ? (1 - t) / .12 : 1) * (.62 + .38 * Math.abs(flip));
            ctx.fillStyle = a.fill;
            ctx.setTransform(c, sn, -sn * flip, c * flip, a.x * dpr, a.y * dpr);
            ctx.fillRect(-a.w / 2, -a.h / 2, a.w, a.h);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            break;
          }
          case 'petal': {                                  // cánh hoa rơi
            a.by += a.vy * k;
            a.bx += a.vx * k;
            a.x = a.bx + Math.sin(a.age * a.sf + a.ph) * a.amp;
            a.y = a.by;
            a.rot += a.vr * k;
            if (a.y > L.h + 24) { dead = true; break; }
            const flip = Math.cos(a.ph + a.age * .05);
            const c = Math.cos(a.rot) * dpr, sn = Math.sin(a.rot) * dpr;
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = (t > .9 ? (1 - t) / .1 : 1) * Math.min(1, a.age / 12) * (.7 + .3 * Math.abs(flip));
            ctx.fillStyle = a.fill;
            ctx.setTransform(c, sn, -sn * flip, c * flip, a.x * dpr, a.y * dpr);
            ctx.beginPath();
            ctx.moveTo(0, -a.size * .55);
            ctx.quadraticCurveTo(a.size * .5, -a.size * .1, 0, a.size * .55);
            ctx.quadraticCurveTo(-a.size * .5, -a.size * .1, 0, -a.size * .55);
            ctx.fill();
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            break;
          }
          case 'heart': {                                  // trái tim bay lên
            a.by += a.vy * k;
            a.x = a.bx + Math.sin(a.age * .035 + a.ph) * a.amp;
            a.y = a.by;
            const f = Math.sin(Math.PI * t);
            const s = a.size * (.7 + .3 * f);
            const rot = Math.sin(a.age * .04 + a.ph) * .35;
            const c = Math.cos(rot) * dpr, sn = Math.sin(rot) * dpr;
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = a.a * Math.pow(f, .55);
            ctx.setTransform(c, sn, -sn, c, a.x * dpr, a.y * dpr);
            ctx.drawImage(sprites[a.col].heart, -s / 2, -s / 2, s, s);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            break;
          }
          case 'meteor': {                                 // sao băng
            move(a, k);
            const f = Math.sin(Math.PI * t);
            const speed = Math.hypot(a.vx, a.vy) || 1;
            const tx = a.x - (a.vx / speed) * a.tail, ty = a.y - (a.vy / speed) * a.tail;
            const grad = ctx.createLinearGradient(a.x, a.y, tx, ty);
            grad.addColorStop(0, rgba(a.col, .95 * f));
            grad.addColorStop(.3, rgba(a.col, .35 * f));
            grad.addColorStop(1, rgba(a.col, 0));
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 1;
            ctx.strokeStyle = grad;
            ctx.lineWidth = a.w;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(tx, ty);
            ctx.stroke();
            ctx.globalAlpha = f;
            ctx.drawImage(sprites[a.col].glow, a.x - 8, a.y - 8, 16, 16);
            break;
          }
          case 'streak': {                                 // vệt sao khi "nhảy sao"
            a.vr *= Math.pow(a.vr > 0 ? 1.075 : .955, k);
            a.r += a.vr * k;
            if (a.r < -50) { dead = true; break; }
            const dx = Math.cos(a.ang), dy = Math.sin(a.ang);
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = a.a * Math.sin(Math.PI * t);
            ctx.strokeStyle = a.stroke;
            ctx.lineWidth = a.w;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(a.cx + dx * a.r, a.cy + dy * a.r);
            ctx.lineTo(a.cx + dx * (a.r - a.vr * a.lf), a.cy + dy * (a.r - a.vr * a.lf));
            ctx.stroke();
            break;
          }
          default: dead = true;
        }
      }

      if (dead) {
        p[i] = p[p.length - 1];
        p.pop();
        if (a.end) a.end(a);
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  function frame(now) {
    raf = 0;
    const dt = Math.min(50, now - lastTime);
    lastTime = now;
    const k = dt / 16.667;
    let alive = 0;
    layers.forEach(L => {
      if (!L.p.length) return;
      stepLayer(L, k);
      if (!L.p.length) {
        L.ctx.clearRect(0, 0, L.w, L.h);
        L.canvas.style.display = 'none';
        L.shown = false;
      }
      alive += L.p.length;
    });
    // máy yếu → tự giảm số hạt; máy khỏe → tăng dần trở lại
    fpsTime += dt; fpsFrames++;
    if (fpsFrames >= 45) {
      const avg = fpsTime / fpsFrames;
      if (avg > 26) quality = Math.max(.45, quality - .15);
      else if (avg < 19 && quality < 1) quality = Math.min(1, quality + .05);
      fpsTime = 0; fpsFrames = 0;
    }
    if (alive) raf = requestAnimationFrame(frame);
  }

  // ===================================================================
  // 4. CÁC "MẪU" HIỆU ỨNG (tia sáng, pháo hoa, confetti…)
  // ===================================================================
  const SPARK_COLORS = ['gold', 'white', 'lav', 'sky', 'rose'];

  function spark(L, x, y, o = {}) {
    push(L, {
      k: 'spark', x, y, vx: o.vx ?? rand(-.5, .5), vy: o.vy ?? rand(-.7, .3), drag: o.drag ?? .985, g: o.g ?? .01,
      age: 0, life: o.life ?? rand(40, 75), size: o.size ?? rand(8, 16), col: o.col ?? pick(SPARK_COLORS),
      rot: rand(0, TAU), vr: o.vr ?? rand(-.04, .04), a: o.a ?? 1, seed: rand(0, TAU), tw: true
    });
  }

  // Lấp lánh đứng yên trong một vùng chữ nhật (như hạt kim tuyến)
  function sparkleIn(rect, n = 1, o = {}) {
    for (let i = 0; i < N(n); i++) {
      spark(front, rand(rect.left, rect.right), rand(rect.top, rect.bottom), {
        vx: 0, vy: 0, g: 0, drag: 1, life: rand(50, 90), size: rand(11, 24),
        col: pick(['gold', 'white', 'white', 'lav']), a: .95, vr: rand(-.02, .02), ...o
      });
    }
  }

  // Bắn tia sáng tỏa tròn + vòng sóng
  function burst(x, y, o = {}) {
    const L = o.layer || front;
    const n = N(o.n ?? 14);
    const cols = o.cols || ['gold', 'white', 'lav', 'rose'];
    const speed = o.speed || [1.5, 4.2];
    const size = o.size || [7, 14];
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * TAU + rand(-.25, .25);
      const sp = rand(speed[0], speed[1]);
      spark(L, x, y, { vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, drag: .955, g: .018, life: rand(34, 64), size: rand(size[0], size[1]), col: pick(cols) });
    }
    if (o.ring !== false) push(L, { k: 'ring', x, y, r0: 4, r1: o.r1 || rand(38, 58), life: 28, lw: 2.2, col: o.ringCol || 'gold', a: .8, age: 0 });
  }

  // ---- Pháo hoa ----
  const COLOR_SETS = [['gold', 'white'], ['rose', 'white'], ['lav', 'sky'], ['gold', 'rose'], ['sky', 'white'], ['mint', 'gold'], ['peach', 'rose'], ['lav', 'rose']];

  function glowParticle(x, y, vx, vy, o) {
    push(back, { k: 'glow', x, y, vx, vy, drag: o.drag, g: o.g, age: 0, life: o.life, size: o.size, col: o.col, a: o.a ?? 1, fl: o.fl, seed: rand(0, TAU), tr: o.tr, end: o.end });
  }

  function heartPoints(n) {
    return Array.from({ length: n }, (_, i) => {
      const t = (i / n) * TAU;
      return { x: 16 * Math.pow(Math.sin(t), 3) / 17, y: -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 17 };
    });
  }

  function starPoints(perEdge) {
    const verts = Array.from({ length: 10 }, (_, i) => {
      const ang = -Math.PI / 2 + (i * Math.PI) / 5;
      const r = i % 2 ? .42 : 1;
      return { x: Math.cos(ang) * r, y: Math.sin(ang) * r };
    });
    const pts = [];
    verts.forEach((v, i) => {
      const w = verts[(i + 1) % verts.length];
      for (let j = 0; j < perEdge; j++) pts.push({ x: v.x + (w.x - v.x) * (j / perEdge), y: v.y + (w.y - v.y) * (j / perEdge) });
    });
    return pts;
  }

  const textCache = {};
  function textPoints(text) {
    if (textCache[text]) return textCache[text];
    const W = 420, H = 150;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const x = canvas.getContext('2d');
    let size = 124;
    const font = s => `700 ${s}px "Playfair Display", Georgia, "Times New Roman", serif`;
    x.font = font(size);
    while (x.measureText(text).width > W - 24 && size > 40) { size -= 6; x.font = font(size); }
    x.fillStyle = '#fff';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillText(text, W / 2, H / 2 + 4);
    const data = x.getImageData(0, 0, W, H).data;
    let pts = [];
    for (let py = 0; py < H; py += 6) {
      for (let px = 0; px < W; px += 6) {
        if (data[(py * W + px) * 4 + 3] > 128) pts.push({ x: (px - W / 2) / (W / 2), y: (py - H / 2) / (W / 2) });
      }
    }
    if (pts.length > 240) pts = pts.filter(() => Math.random() < 240 / pts.length);
    textCache[text] = pts;
    return pts;
  }

  // Nổ ra đúng một hình (tim, sao, chữ…)
  function shapeBurst(x, y, pts, R, col, o = {}) {
    const D = .93;
    const v = (R * (1 - D)) / D;
    const keep = quality < .7 ? .65 : 1;
    pts.forEach(pt => {
      if (keep < 1 && Math.random() > keep) return;
      glowParticle(x, y, pt.x * v, pt.y * v, { drag: D, g: .01, life: rand(88, 112), size: o.size ?? 11, col, a: .85, tr: 2 });
    });
  }

  function explode(x, y, kind, cols) {
    const base = clamp(Math.min(back.w, back.h) * .17, 72, 150);
    const set = cols || pick(COLOR_SETS);
    push(back, { k: 'flash', x, y, s0: 40, s1: base * 2.2, life: 14, a: .3, col: set[0], age: 0 });
    const D = .965;
    const v = R => (R * (1 - D)) / D;
    switch (kind) {
      case 'ring': {
        const n = N(60), m = N(30);
        for (let i = 0; i < n; i++) { const a = (i / n) * TAU, sp = v(base * 1.05); glowParticle(x, y, Math.cos(a) * sp, Math.sin(a) * sp, { drag: D, g: .02, life: rand(60, 80), size: 11, col: set[0], tr: 4 }); }
        for (let i = 0; i < m; i++) { const a = (i / m) * TAU + .1, sp = v(base * .55); glowParticle(x, y, Math.cos(a) * sp, Math.sin(a) * sp, { drag: D, g: .02, life: rand(56, 72), size: 10, col: set[1], tr: 4 }); }
        break;
      }
      case 'willow': {
        const D2 = .978, n = N(64);
        for (let i = 0; i < n; i++) {
          const a = rand(0, TAU), sp = (base * (1 - D2) / D2) * rand(.5, 1);
          glowParticle(x, y, Math.cos(a) * sp, Math.sin(a) * sp, { drag: D2, g: .05, life: rand(100, 150), size: rand(8, 12), col: 'gold', fl: true, a: .9, tr: 7 });
        }
        break;
      }
      case 'crackle': {
        const n = N(44);
        for (let i = 0; i < n; i++) {
          const a = rand(0, TAU), sp = v(base * rand(.7, 1));
          const cracks = Math.random() < .5;
          glowParticle(x, y, Math.cos(a) * sp, Math.sin(a) * sp, {
            drag: D, g: .03, life: rand(40, 60), size: rand(10, 14), col: pick(set), tr: 4,
            end: cracks ? p => { for (let j = 0; j < 3; j++) glowParticle(p.x, p.y, rand(-1.6, 1.6), rand(-1.6, 1.6), { drag: .94, g: .03, life: rand(14, 26), size: rand(6, 9), col: 'white', fl: true }); } : undefined
          });
        }
        break;
      }
      case 'heart':
        shapeBurst(x, y, heartPoints(N(72)), base * 1.05, set[0]);
        shapeBurst(x, y, heartPoints(N(38)), base * .56, set[1], { size: 10 });
        break;
      case 'star':
        shapeBurst(x, y, starPoints(Math.max(4, N(9))), base * 1.1, set[0]);
        shapeBurst(x, y, starPoints(Math.max(3, N(5))), base * .5, set[1], { size: 10 });
        break;
      case 'text':
        shapeBurst(x, y, textPoints(pick(FIREWORK_TEXTS)), Math.min(base * 1.55, back.w * .2), pick(['gold', 'rose', 'sky']), { size: 6 });
        break;
      default: {                                           // peony: cầu hoa
        const n = N(92);
        for (let i = 0; i < n; i++) {
          const a = rand(0, TAU), inner = i % 3 === 0;
          const sp = v(base) * (inner ? rand(.35, .55) : rand(.88, 1));
          glowParticle(x, y, Math.cos(a) * sp, Math.sin(a) * sp, { drag: D, g: .028, life: rand(56, 88), size: rand(10, 16), col: inner ? set[1] : set[0], fl: Math.random() < .3, tr: 5 });
        }
      }
    }
  }

  function avoidRect() {
    const el = $('.scene.is-active .celebrate-content, .scene.is-active .finale-content');
    return el ? el.getBoundingClientRect() : null;
  }

  function fireZone() {
    const r = avoidRect();
    for (let tries = 0; tries < 10; tries++) {
      const x = rand(back.w * .08, back.w * .92), y = rand(back.h * .13, back.h * .5);
      if (!r || x < r.left - 70 || x > r.right + 70 || y < r.top - 50 || y > r.bottom + 40 || Math.random() < .1) return { x, y };
    }
    return { x: rand(back.w * .1, back.w * .9), y: rand(back.h * .12, back.h * .28) };
  }

  const KINDS_NORMAL = ['peony', 'peony', 'peony', 'peony', 'ring', 'ring', 'willow', 'willow', 'crackle', 'crackle', 'heart', 'heart', 'star', 'text'];
  const KINDS_GRAND = ['peony', 'ring', 'willow', 'crackle', 'heart', 'heart', 'heart', 'star', 'star', 'text', 'text'];

  function launchFirework(o = {}) {
    if (!FX.fireworks) return;
    const zone = fireZone();
    const x = o.x ?? zone.x;
    const ty = o.y ?? zone.y;
    const kind = o.kind || pick(o.grand ? KINDS_GRAND : KINDS_NORMAL);
    const sx = x + rand(-30, 30), sy = back.h + 10;
    const g = .11;
    const v0 = Math.sqrt(2 * g * (sy - ty));
    push(back, { k: 'rocket', x: sx, y: sy, vx: (x - sx) / (v0 / g), vy: -v0, g, age: 0, life: 9999, end: r => explode(r.x, r.y, kind, o.cols) });
  }

  function fireworkSalvo(n, gap, o = {}) {
    for (let i = 0; i < n; i++) later(() => launchFirework(o), i * gap);
  }

  // ---- Confetti ----
  const CONFETTI = ['gold', 'gold', 'white', 'lav', 'rose', 'sky', 'mint', 'peach'];
  function confettiPiece(x, y, vx, vy, drag, g) {
    const [r, gr, b] = PAL[pick(CONFETTI)];
    const shade = rand(.82, 1);
    push(front, {
      k: 'confetti', x, y, vx, vy, drag, g, age: 0, life: rand(420, 620), w: rand(7, 13), h: rand(4, 7),
      rot: rand(0, TAU), vr: rand(-.25, .25), ph: rand(0, TAU), fs: rand(.1, .3),
      fill: `rgb(${Math.round(r * shade)},${Math.round(gr * shade)},${Math.round(b * shade)})`
    });
  }

  function cannon(side, n) {
    if (!FX.confetti) return;
    const x = side < 0 ? -12 : front.w + 12;
    const y = front.h * rand(.72, .92);
    for (let i = 0; i < N(n); i++) {
      const ang = side < 0 ? -rand(.9, 1.45) : Math.PI + rand(.9, 1.45);
      const sp = rand(11, 24);
      confettiPiece(x, y, Math.cos(ang) * sp, Math.sin(ang) * sp, .955, .1);
    }
  }

  function confettiFan(x, y, n) {
    if (!FX.confetti) return;
    for (let i = 0; i < N(n); i++) {
      const ang = -Math.PI / 2 + rand(-1.05, 1.05);
      const sp = rand(8, 17);
      confettiPiece(x, y, Math.cos(ang) * sp, Math.sin(ang) * sp, .955, .1);
    }
  }

  function confettiRain(n) {
    if (!FX.confetti) return;
    for (let i = 0; i < N(n); i++) confettiPiece(rand(0, front.w), rand(-40, -8), rand(-.6, .6), rand(1, 2.4), .99, .02);
  }

  // ---- Cánh hoa & trái tim ----
  const PETALS = ['rgba(255,176,202,.92)', 'rgba(255,198,214,.9)', 'rgba(255,225,200,.88)', 'rgba(255,244,228,.88)', 'rgba(245,165,195,.9)'];
  function petalRain(n) {
    if (!FX.petals) return;
    for (let i = 0; i < N(n); i++) {
      const x = rand(0, front.w);
      push(front, {
        k: 'petal', bx: x, by: rand(-50, -10), x, y: -20, vx: rand(-.35, .35), vy: rand(.7, 1.5), amp: rand(14, 38), sf: rand(.02, .04),
        ph: rand(0, TAU), rot: rand(0, TAU), vr: rand(-.05, .05), size: rand(10, 17), fill: pick(PETALS), age: 0, life: rand(900, 1300)
      });
    }
  }

  function heartAt(x, y, o = {}) {
    push(front, {
      k: 'heart', bx: x, by: y, x, y, vy: o.vy ?? -rand(.45, .95), amp: rand(8, 20), ph: rand(0, TAU),
      size: o.size ?? rand(14, 28), a: o.a ?? .8, col: pick(['rose', 'rose', 'gold', 'lav']), age: 0, life: o.life ?? rand(260, 400)
    });
  }

  function heartsRise(n) {
    if (!FX.hearts) return;
    for (let i = 0; i < N(n); i++) heartAt(rand(front.w * .06, front.w * .94), front.h + 20);
  }

  function heartsFrom(x, y, n) {
    if (!FX.hearts) return;
    for (let i = 0; i < N(n); i++) heartAt(x + rand(-60, 60), y + rand(-20, 30), { vy: -rand(.9, 1.8), life: rand(150, 260) });
  }

  // ---- Sao băng ----
  function meteorShower(n) {
    for (let i = 0; i < n; i++) {
      later(() => {
        const sp = rand(13, 19), ang = rand(.35, .6);
        push(front, {
          k: 'meteor', x: rand(front.w * .25, front.w * 1.05), y: rand(-40, front.h * .35), vx: -Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
          age: 0, life: rand(34, 52), tail: rand(120, 220), w: rand(1.2, 2.2), col: pick(['white', 'gold', 'sky'])
        });
      }, i * 260);
    }
  }

  // ---- Nhảy sao khi chuyển cảnh ----
  function warp(dir) {
    if (!FX.warp) return;
    const cx = front.w / 2, cy = front.h * .48;
    const n = Math.min(40, N(32));
    for (let i = 0; i < n; i++) {
      const col = pick(['white', 'gold', 'lav', 'sky']);
      push(front, {
        k: 'streak', cx, cy, ang: rand(0, TAU), r: dir > 0 ? rand(30, 160) : rand(front.w * .5, front.w * .8),
        vr: dir > 0 ? rand(2, 5) : -rand(8, 16), lf: rand(2.5, 5), w: rand(.8, 1.8), a: rand(.4, .8), age: 0, life: rand(22, 36),
        stroke: `rgb(${PAL[col].join(',')})`
      });
    }
    push(front, { k: 'flash', x: cx, y: cy, s0: 80, s1: Math.max(front.w, front.h) * 1.4, life: 30, a: .16, col: 'lav', age: 0 });
  }

  // ===================================================================
  // 5. HẸN GIỜ THEO TỪNG CẢNH (tự dừng khi rời cảnh)
  // ===================================================================
  const timers = new Set();
  function later(fn, ms) {
    const id = setTimeout(() => {
      timers.delete(id);
      if (!document.hidden) { try { fn(); } catch (error) { console.warn('[effects]', error); } }
    }, ms);
    timers.add(id);
    return id;
  }
  function loop(fn, min, max = min) {
    const run = () => {
      const id = setTimeout(() => {
        timers.delete(id);
        if (!document.hidden) { try { fn(); } catch (error) { console.warn('[effects]', error); } }
        run();
      }, rand(min, max));
      timers.add(id);
    };
    run();
  }
  function stopTimers() {
    timers.forEach(clearTimeout);
    timers.clear();
  }

  let activeIndex = 0;

  // Căn tia sáng cảnh 2 theo đúng tâm của tiêu đề
  function positionRays() {
    const content = $('.celebrate-content');
    const rays = $('.god-rays');
    if (!content || !rays) return;
    rays.style.setProperty('--cx', `${content.offsetLeft + content.offsetWidth / 2}px`);
    rays.style.setProperty('--cy', `${content.offsetTop + content.offsetHeight / 2}px`);
  }

  // Dải film tự trượt nhẹ, dừng khi người xem chạm vào
  const ribbons = [];
  let ribbonFrame = 0;
  function setupRibbons() {
    $$('.film-ribbon').forEach((el, i) => {
      const state = { el, dir: i ? -1 : 1, pos: 0, hold: 0, hover: false };
      el.addEventListener('pointerenter', () => { state.hover = true; });
      el.addEventListener('pointerleave', () => { state.hover = false; state.hold = 1.5; });
      ['wheel', 'touchstart', 'pointerdown'].forEach(name => el.addEventListener(name, () => { state.hold = 4; }, { passive: true }));
      ribbons.push(state);
    });
  }
  function startRibbons() {
    cancelAnimationFrame(ribbonFrame);
    ribbons.forEach(s => { s.pos = s.el.scrollLeft; });
    let last = performance.now();
    const tick = now => {
      ribbonFrame = requestAnimationFrame(tick);
      const dt = Math.min(.05, (now - last) / 1000);
      last = now;
      ribbons.forEach(s => {
        const max = s.el.scrollWidth - s.el.clientWidth;
        if (s.hover || max <= 6) return;
        if (s.hold > 0) { s.hold -= dt; s.pos = s.el.scrollLeft; return; }
        s.pos += s.dir * 24 * dt;
        if (s.pos <= 0) { s.pos = 0; s.dir = 1; } else if (s.pos >= max) { s.pos = max; s.dir = -1; }
        s.el.scrollLeft = s.pos;
      });
    };
    ribbonFrame = requestAnimationFrame(tick);
  }
  function stopRibbons() {
    cancelAnimationFrame(ribbonFrame);
    ribbonFrame = 0;
  }

  const rectOf = selector => { const el = $(selector); return el ? el.getBoundingClientRect() : null; };
  const centerOf = rect => ({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });

  function introFx() {
    loop(() => { const r = rectOf('.intro-title'); if (r) sparkleIn(r, 1); }, 360, 720);
    loop(() => {
      const r = rectOf('#openGift');
      if (r) spark(front, rand(r.left, r.right), rand(r.top - 10, r.bottom + 10), { vx: rand(-.3, .3), vy: -rand(.2, .7), life: rand(40, 70), size: rand(8, 14), col: pick(['gold', 'white']) });
    }, 500, 1000);
  }

  function celebrateFx() {
    positionRays();
    later(() => { cannon(-1, 28); cannon(1, 28); }, 700);
    later(() => fireworkSalvo(2, 700), 1100);
    loop(() => launchFirework(), 5000, 8000);
  }

  function memoriesFx() {
    loop(() => {
      const card = pick($$('.photo-card'));
      if (!card) return;
      card.classList.add('glint');
      setTimeout(() => card.classList.remove('glint'), 1300);
    }, 1800, 3000);
  }

  function letterFx() {
    const paper = $('#letterPaper');
    const intro = $('#letterIntro');
    let paperOn = false;
    loop(() => {
      if (!paper || !paper.hidden) return;                          // thư đã mở thì thôi
      const env = $('.envelope');
      if (!env || (intro && intro.hidden)) return;
      const r = env.getBoundingClientRect();
      const ang = rand(0, TAU), rad = rand(.55, .9) * Math.max(r.width, r.height);
      const c = centerOf(r);
      spark(front, c.x + Math.cos(ang) * rad, c.y + Math.sin(ang) * rad * .6, { vx: Math.cos(ang) * .3, vy: -.35, life: rand(45, 80), size: rand(9, 18), col: pick(['gold', 'white', 'rose']) });
    }, 800, 1400);
    loop(() => {
      if (!paper || paper.hidden || paperOn) return;
      paperOn = true;                                               // tờ thư vừa hiện ra
      petalRain(8);
      loop(() => petalRain(1), 3000, 5000);
    }, 300, 300);
  }

  function surprisesFx() {
    loop(() => {
      const node = pick($$('.star-node'));
      const star = node && $('.node-star', node);
      if (!star) return;
      const c = centerOf(star.getBoundingClientRect());
      const ang = rand(0, TAU), rad = rand(18, 44);
      spark(front, c.x + Math.cos(ang) * rad, c.y + Math.sin(ang) * rad, { vx: Math.cos(ang) * .2, vy: Math.sin(ang) * .2 - .15, life: rand(40, 70), size: rand(8, 15) });
    }, 300, 650);
  }

  function finaleFx() {
    // Cảnh cuối: giữ nhẹ nhàng — một đợt pháo hoa mở màn, đóng dấu lớp, rồi thưa dần
    later(() => { cannon(-1, 36); cannon(1, 36); }, 800);
    later(() => fireworkSalvo(2, 600, { grand: true }), 700);
    later(() => {                                                   // đóng dấu lớp → bắn tia sáng
      const r = rectOf('.class-seal');
      if (!r) return;
      const c = centerOf(r);
      burst(c.x, c.y, { n: 24, speed: [2, 6], size: [9, 16], r1: 100 });
    }, 3050);
    loop(() => launchFirework({ grand: true }), 4500, 7500);
    loop(() => heartsRise(1), 6000, 9000);
  }

  const sceneEffects = [introFx, celebrateFx, memoriesFx, letterFx, surprisesFx, finaleFx];

  function onSceneChange(index, previous) {
    stopTimers();
    stopRibbons();
    activeIndex = index;
    warp(index > previous ? 1 : -1);
    later(() => { if (sceneEffects[index]) sceneEffects[index](); }, 80);
  }

  const sceneObserver = new MutationObserver(records => {
    records.forEach(record => {
      const el = record.target;
      if (!el.classList.contains('is-active')) return;
      const index = scenes.indexOf(el);
      if (index !== activeIndex) onSceneChange(index, activeIndex);
    });
  });
  scenes.forEach(scene => sceneObserver.observe(scene, { attributes: true, attributeFilter: ['class'] }));

  // ===================================================================
  // 6. TƯƠNG TÁC: con trỏ, bấm, rê chuột, thư, ngôi sao bí mật
  // ===================================================================
  // vệt sao theo con trỏ
  if (FX.cursorTrail && finePointer) {
    let lastX = -999, lastY = -999, acc = 0;
    window.addEventListener('pointermove', event => {
      if (event.pointerType === 'touch') return;
      const d = Math.hypot(event.clientX - lastX, event.clientY - lastY);
      lastX = event.clientX; lastY = event.clientY;
      if (d > 120) return;                                          // vừa nhảy chuột, bỏ qua
      acc += d;
      while (acc > 16 && front.p.length < 600) {
        acc -= 16;
        spark(front, event.clientX + rand(-4, 4), event.clientY + rand(-4, 4), {
          vx: rand(-.4, .4), vy: rand(-.2, .6), g: .015, life: rand(28, 52), size: rand(6, 13), a: .85, col: pick(SPARK_COLORS)
        });
      }
    }, { passive: true });
  }

  // bấm / chạm → bắn tia sáng
  if (FX.clickBurst) {
    window.addEventListener('pointerdown', event => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      burst(event.clientX, event.clientY, { n: 12 });
    }, { passive: true });
  }

  // rê chuột lên nút / ảnh / sao → lấp lánh quanh phần tử
  if (FX.hoverSparkle && finePointer) {
    const HOVER = '.primary-button, .final-unlock:not(:disabled), .star-node, .envelope-button, .video-pin, .replay-button, .photo-card, .film-frame, .icon-button, .nav-button:not(:disabled)';
    let hoverEl = null, hoverTimer = 0;
    const stopHover = () => { clearInterval(hoverTimer); hoverTimer = 0; hoverEl = null; };
    document.addEventListener('pointerover', event => {
      if (event.pointerType !== 'mouse') return;
      const el = event.target.closest ? event.target.closest(HOVER) : null;
      if (el === hoverEl) return;
      stopHover();
      if (!el) return;
      hoverEl = el;
      hoverTimer = setInterval(() => {
        if (document.hidden || front.p.length > 500) return;
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) return;
        const star = el.classList.contains('star-node');
        const x = star ? r.left + r.width / 2 + rand(-34, 34) : rand(r.left, r.right);
        const y = star ? r.top + 37 + rand(-34, 34) : rand(r.top - 4, r.bottom + 4);
        spark(front, x, y, { vx: rand(-.3, .3), vy: -rand(.2, .8), life: rand(30, 55), size: rand(7, 13), col: pick(['gold', 'white', 'rose']) });
      }, 90);
    });
    document.documentElement.addEventListener('mouseleave', stopHover);
  }

  // phong thư mở ra: tia sáng, trái tim, pháo giấy
  let letterOpened = false;
  const openLetterButton = $('#openLetter');
  if (openLetterButton) {
    openLetterButton.addEventListener('click', () => {
      if (letterOpened) return;
      letterOpened = true;
      const env = $('.envelope', openLetterButton);
      if (!env) return;
      const c = centerOf(env.getBoundingClientRect());
      burst(c.x, c.y, { n: 22, speed: [1.5, 4.5], cols: ['gold', 'white', 'rose'] });
      later(() => {
        burst(c.x, c.y - 40, { n: 34, speed: [2, 6.5], size: [9, 18], r1: 95, cols: ['gold', 'white', 'rose', 'lav'] });
        heartsFrom(c.x, c.y, 14);
        confettiFan(c.x, c.y - 30, 50);
      }, 560);
      later(() => { burst(c.x, c.y - 60, { n: 20, speed: [1, 3.5], ringCol: 'white', r1: 140 }); heartsFrom(c.x, c.y - 50, 8); }, 1050);
    });
  }

  // ngôi sao bí mật: bắn tia sáng, vòng quỹ đạo, chòm sao sáng dần
  const constellationArea = $('#constellationArea');
  const starNodes = $$('.star-node');
  function updateFound() {
    if (!constellationArea) return;
    const found = starNodes.filter(n => n.classList.contains('discovered')).length;
    constellationArea.style.setProperty('--found', (found / 4).toFixed(2));
  }
  starNodes.forEach(node => {
    node.addEventListener('click', () => {
      const star = $('.node-star', node);
      if (!star) return;
      if (!$('.star-orbit', star)) {
        const orbit = document.createElement('i');
        orbit.className = 'star-orbit';
        star.appendChild(orbit);
      }
      const c = centerOf(star.getBoundingClientRect());
      burst(c.x, c.y, { n: 26, speed: [2, 6.5], size: [8, 18], r1: 80, cols: ['gold', 'white', 'lav', 'sky', 'rose'] });
      push(front, { k: 'ring', x: c.x, y: c.y, r0: 10, r1: 150, life: 44, lw: 2.5, col: 'white', a: .55, age: 0 });
      updateFound();
      later(() => {                                                 // bùng sáng ở biểu tượng trong popup
        const symbol = $('.surprise-symbol');
        if (!symbol) return;
        const s = centerOf(symbol.getBoundingClientRect());
        burst(s.x, s.y, { n: 18, speed: [1.5, 5], size: [8, 16], r1: 70 });
      }, 260);
    });
  });
  const replayButton = $('#replayButton');
  if (replayButton) {
    replayButton.addEventListener('click', () => {
      updateFound();
      $$('.star-orbit').forEach(el => el.remove());
      pendingCelebrate = false;
    });
  }

  // đủ 4 ngôi sao → ăn mừng sau khi đóng popup
  let pendingCelebrate = false;
  function celebrateUnlock() {
    if (!pendingCelebrate || activeIndex !== 4) return;
    pendingCelebrate = false;
    launchFirework({ kind: 'heart', x: back.w * .5, y: back.h * .26, grand: true });
    later(() => launchFirework({ kind: 'star', x: back.w * .22, y: back.h * .32 }), 450);
    later(() => launchFirework({ kind: 'star', x: back.w * .78, y: back.h * .32 }), 650);
    later(() => launchFirework({ kind: 'peony', x: back.w * .5, y: back.h * .2 }), 1000);
    const r = rectOf('#finalUnlock');
    if (r) {
      const c = centerOf(r);
      burst(c.x, c.y, { n: 30, speed: [2, 6], size: [9, 17], r1: 110 });
    }
    cannon(-1, 40);
    cannon(1, 40);
    meteorShower(3);
  }
  const finalButton = $('#finalUnlock');
  const surpriseModal = $('#surpriseModal');
  if (finalButton) {
    new MutationObserver(() => {
      if (finalButton.disabled) { pendingCelebrate = false; return; }
      pendingCelebrate = true;
      if (!surpriseModal || surpriseModal.hidden) celebrateUnlock();
    }).observe(finalButton, { attributes: true, attributeFilter: ['disabled'] });
  }
  if (surpriseModal) {
    new MutationObserver(() => { if (surpriseModal.hidden && pendingCelebrate) later(celebrateUnlock, 350); })
      .observe(surpriseModal, { attributes: true, attributeFilter: ['hidden'] });
  }

  // bộ đếm sao nảy lên mỗi khi đổi
  const starCount = $('#starCount');
  if (starCount) {
    new MutationObserver(() => {
      starCount.classList.remove('bump');
      void starCount.offsetWidth;
      starCount.classList.add('bump');
      setTimeout(() => starCount.classList.remove('bump'), 800);
    }).observe(starCount, { childList: true, characterData: true, subtree: true });
  }

  // ===================================================================
  // 7. KHỞI ĐỘNG
  // ===================================================================
  splitHeadings();
  buildTwinkles();
  buildBokeh();
  decorateMusicButton();
  decoratePhotos();
  decorateLetter();
  setupParallax();
  setupRibbons();
  positionRays();
  introFx();

  // Cho phép gọi thử từ Console, ví dụ: FT537_FX.launchFirework({ kind: 'heart' })
  window.FT537_FX = { burst, launchFirework, fireworkSalvo, cannon, confettiRain, petalRain, heartsRise, meteorShower, warp, FX };
})();
