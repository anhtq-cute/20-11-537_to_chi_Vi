(() => {
  'use strict';

  const scenes = [...document.querySelectorAll('.scene')];
  const previousButton = document.getElementById('previousButton');
  const nextButton = document.getElementById('nextButton');
  const progressLabel = document.getElementById('progressLabel');
  const progressFill = document.getElementById('progressFill');
  const navDots = [...document.querySelectorAll('.nav-dot')];
  const music = document.getElementById('backgroundMusic');
  const musicToggle = document.getElementById('musicToggle');
  const toast = document.getElementById('toast');
  const mediaModal = document.getElementById('mediaModal');
  const mediaModalContent = document.getElementById('mediaModalContent');
  const surpriseModal = document.getElementById('surpriseModal');
  const surpriseModalContent = document.getElementById('surpriseModalContent');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const content = window.FT537_CONTENT;
  if (!content) {
    throw new Error('Không tìm thấy js/content.js. Hãy kiểm tra file này có nằm cạnh main.js không.');
  }

  // Đổ toàn bộ nội dung do người dùng chỉnh sửa từ content.js vào giao diện.
  function readPath(object, path) {
    return path.split('.').reduce((value, key) => value == null ? undefined : value[key], object);
  }

  function applyContent() {
    document.title = content.meta.title;
    const description = document.querySelector('meta[name="description"]');
    if (description) description.content = content.meta.description;

    const musicSource = document.querySelector('[data-audio-source]');
    if (musicSource && content.audio && content.audio.musicSrc) {
      musicSource.src = content.audio.musicSrc;
      music.load();
    }

    document.querySelectorAll('[data-copy]').forEach(element => {
      const value = readPath(content, element.dataset.copy);
      if (value !== undefined) element.textContent = value;
    });

    document.querySelectorAll('[data-surprise-label]').forEach(element => {
      const item = content.surprises[element.dataset.surpriseLabel];
      if (item && item.label) element.textContent = item.label;
    });

    const letterCopy = document.querySelector('.letter-copy');
    letterCopy.replaceChildren();
    content.letter.paragraphs.forEach(paragraph => {
      const p = document.createElement('p');
      p.textContent = paragraph;
      letterCopy.appendChild(p);
    });
  }

  applyContent();

  let currentScene = 0;
  let isTransitioning = false;
  let toastTimer = null;
  let musicOn = false;
  let discovered = new Set();
  let lastFocused = null;

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
  }

  function updateNavigation(index) {
    const number = String(index + 1).padStart(2, '0');
    progressLabel.innerHTML = `${number} <i>/</i> 06`;
    progressFill.style.width = `${((index + 1) / scenes.length) * 100}%`;
    previousButton.disabled = index === 0;
    nextButton.disabled = index === scenes.length - 1;
    nextButton.innerHTML = index === scenes.length - 1
      ? `<span class="nav-word">${content.ui.end}</span> <span>✦</span>`
      : `<span class="nav-word">${content.ui.next}</span> <span>→</span>`;
    navDots.forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
      dot.setAttribute('aria-current', i === index ? 'step' : 'false');
    });
  }

  function goToScene(index, force = false) {
    if (index < 0 || index >= scenes.length || index === currentScene || isTransitioning) return;
    if (!force && (mediaModal && !mediaModal.hidden || surpriseModal && !surpriseModal.hidden)) return;
    isTransitioning = true;
    const oldScene = scenes[currentScene];
    const newScene = scenes[index];
    newScene.hidden = false;
    newScene.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        oldScene.classList.remove('is-active');
        oldScene.setAttribute('aria-hidden', 'true');
        newScene.classList.add('is-active');
        currentScene = index;
        updateNavigation(index);
        const delay = reduceMotion ? 20 : 850;
        setTimeout(() => {
          if (oldScene !== scenes[currentScene]) oldScene.hidden = true;
          isTransitioning = false;
        }, delay);
      });
    });
  }

  previousButton.addEventListener('click', () => goToScene(currentScene - 1));
  nextButton.addEventListener('click', () => goToScene(currentScene + 1));
  navDots.forEach(dot => dot.addEventListener('click', () => goToScene(Number(dot.dataset.go))));
  document.getElementById('openGift').addEventListener('click', () => goToScene(1));
  document.getElementById('finalUnlock').addEventListener('click', () => goToScene(5));
  document.getElementById('replayButton').addEventListener('click', () => {
    discovered.clear();
    document.querySelectorAll('.star-node').forEach(node => node.classList.remove('discovered'));
    updateStarCount();
    goToScene(0);
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      closeModals();
      return;
    }
    if (mediaModal.hidden && surpriseModal.hidden) {
      if (event.key === 'ArrowRight' || event.key === 'PageDown') goToScene(currentScene + 1);
      if (event.key === 'ArrowLeft' || event.key === 'PageUp') goToScene(currentScene - 1);
    }
  });

  // Touch navigation: only a deliberate horizontal swipe changes slides.
  let touchStartX = 0;
  let touchStartY = 0;
  document.addEventListener('touchstart', event => {
    if (event.touches.length !== 1) return;
    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
  }, { passive: true });
  document.addEventListener('touchend', event => {
    if (!mediaModal.hidden || !surpriseModal.hidden || !event.changedTouches.length) return;
    const dx = event.changedTouches[0].clientX - touchStartX;
    const dy = event.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) > 75 && Math.abs(dx) > Math.abs(dy) * 1.3) goToScene(currentScene + (dx < 0 ? 1 : -1));
  }, { passive: true });

  // Background music starts only after the visitor explicitly asks for it.
  musicToggle.addEventListener('click', async () => {
    if (!musicOn) {
      try {
        await music.play();
        musicOn = true;
        musicToggle.classList.add('is-playing');
        musicToggle.querySelector('.music-state').textContent = content.ui.musicOn;
        musicToggle.setAttribute('aria-label', content.ui.musicOnLabel);
      } catch (error) {
        showToast(content.ui.missingMusicToast);
      }
    } else {
      music.pause();
      musicOn = false;
      musicToggle.classList.remove('is-playing');
      musicToggle.querySelector('.music-state').textContent = content.ui.musicOff;
      musicToggle.setAttribute('aria-label', content.ui.musicOffLabel);
    }
  });

  // Letter opening animation.
  const openLetter = document.getElementById('openLetter');
  const letterIntro = document.getElementById('letterIntro');
  const letterPaper = document.getElementById('letterPaper');
  openLetter.addEventListener('click', () => {
    if (openLetter.classList.contains('is-opening')) return;
    // Phong thư mở ra (xem css/effects.css) rồi mới chuyển sang tờ thư.
    openLetter.classList.add('is-opening');
    setTimeout(() => {
      letterIntro.style.opacity = '0';
      letterIntro.style.transform = 'translateY(-18px) scale(.96)';
      setTimeout(() => {
        letterIntro.hidden = true;
        letterPaper.hidden = false;
      }, reduceMotion ? 20 : 450);
    }, reduceMotion ? 0 : 1050);
  });

  // Photo collage: 14 floating Polaroids + 16 frames spread across two irregular film ribbons.
  function createPhotoCard(photo, index, position) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `photo-card${position.feature ? ' polaroid-feature' : ''}`;
    button.style.left = `${position.x}%`;
    button.style.top = `${position.y}%`;
    button.style.setProperty('--rot', `${position.rotate}deg`);
    button.style.setProperty('--w', `${position.width}px`);
    button.style.setProperty('--mw', `${Math.max(70, position.width * .72)}px`);
    button.style.setProperty('--z', String(position.z));
    button.setAttribute('aria-label', `Mở ảnh kỷ niệm ${index + 1}`);
    const img = document.createElement('img');
    img.src = photo.src;
    img.alt = `Kỷ niệm ${index + 1} của ${content.className}`;
    img.loading = 'lazy';
    const caption = document.createElement('span');
    caption.className = 'photo-caption';
    caption.textContent = photo.caption;
    button.append(img, caption);
    button.addEventListener('click', () => openImage(photo.src, photo.caption));
    return button;
  }

  function makeFilmFrame(photo, index) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'film-frame';
    button.setAttribute('aria-label', `Mở khung hình ${index + 1}`);
    const img = document.createElement('img');
    img.src = photo.src;
    img.alt = `Khung hình kỷ niệm ${index + 1}`;
    img.loading = 'lazy';
    const perf = document.createElement('span');
    perf.className = 'film-perf';
    perf.innerHTML = '<i></i><i></i><i></i><i></i><i></i><i></i>';
    button.append(img, perf);
    button.addEventListener('click', () => openImage(photo.src, photo.caption));
    return button;
  }

  function buildGallery() {
    const data = content;
    if (!data || !data.photos) return;
    const cloud = document.getElementById('polaroidCloud');
    const ribbonOne = document.getElementById('filmRibbonOne');
    const ribbonTwo = document.getElementById('filmRibbonTwo');
    const pins = document.getElementById('videoPins');
    const positions = [
      {x:10,y:20,rotate:-12,width:106,z:3},{x:25,y:18,rotate:8,width:118,z:5},{x:42,y:22,rotate:-5,width:130,z:3},
      {x:60,y:16,rotate:11,width:105,z:5},{x:78,y:23,rotate:-9,width:122,z:3},{x:92,y:38,rotate:7,width:100,z:5},
      {x:9,y:62,rotate:8,width:116,z:3},{x:27,y:51,rotate:-10,width:106,z:5},{x:46,y:68,rotate:9,width:125,z:3},
      {x:65,y:55,rotate:-7,width:114,z:5},{x:84,y:69,rotate:12,width:120,z:3},{x:19,y:86,rotate:-5,width:108,z:5},
      {x:55,y:88,rotate:7,width:112,z:3},{x:78,y:88,rotate:-11,width:104,z:5}
    ];
    data.photos.slice(0, 14).forEach((photo, index) => cloud.appendChild(createPhotoCard(photo, index, positions[index])));
    data.photos.slice(14, 22).forEach((photo, i) => ribbonOne.appendChild(makeFilmFrame(photo, i + 14)));
    data.photos.slice(22, 30).forEach((photo, i) => ribbonTwo.appendChild(makeFilmFrame(photo, i + 22)));
    const pinPositions = [{left:'5%',top:'8%'},{left:'70%',top:'36%'},{left:'38%',top:'83%'}];
    data.videos.forEach((video, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'video-pin';
      button.style.left = pinPositions[index].left;
      button.style.top = pinPositions[index].top;
      button.innerHTML = `<span class="play-small">▶</span><span>${video.label}</span>`;
      button.addEventListener('click', () => openVideo(video));
      pins.appendChild(button);
    });
  }

  function openImage(src, caption) {
    lastFocused = document.activeElement;
    mediaModalContent.replaceChildren();
    const img = document.createElement('img');
    img.src = src;
    img.alt = caption || `Ảnh kỷ niệm ${content.className}`;
    const label = document.createElement('div');
    label.className = 'modal-caption';
    label.textContent = caption || `A little memory from ${content.className}`;
    mediaModalContent.append(img, label);
    openModal(mediaModal);
  }

  function openVideo(video) {
    lastFocused = document.activeElement;
    mediaModalContent.replaceChildren();
    const player = document.createElement('video');
    player.controls = true;
    player.playsInline = true;
    player.preload = 'metadata';
    player.src = video.src;
    player.poster = video.poster;
    player.addEventListener('error', () => {
      if (!mediaModal.hidden) {
        const placeholder = document.createElement('div');
        placeholder.className = 'video-missing';
        const playIcon = document.createElement('div');
        playIcon.className = 'big-play';
        playIcon.textContent = '▷';
        const heading = document.createElement('h3');
        heading.textContent = content.ui.videoMissingTitle;
        const message = document.createElement('p');
        message.textContent = `${content.ui.videoMissingText} (${video.src})`;
        placeholder.append(playIcon, heading, message);
        mediaModalContent.replaceChildren(placeholder);
      }
    }, { once: true });
    mediaModalContent.appendChild(player);
    const label = document.createElement('div');
    label.className = 'modal-caption';
    label.textContent = video.label;
    mediaModalContent.appendChild(label);
    openModal(mediaModal);
    player.load();
  }

  function openModal(modal) {
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    const close = modal.querySelector('.modal-close');
    if (close) close.focus();
  }

  function closeModals() {
    [mediaModal, surpriseModal].forEach(modal => {
      if (!modal.hidden) {
        const video = modal.querySelector('video');
        if (video) video.pause();
        modal.hidden = true;
      }
    });
    document.body.style.overflow = '';
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
  }

  document.querySelectorAll('[data-close-modal]').forEach(button => button.addEventListener('click', closeModals));
  [mediaModal, surpriseModal].forEach(modal => modal.addEventListener('click', event => {
    if (event.target === modal) closeModals();
  }));

  // Lời nhắn của bốn ngôi sao được chỉnh trong js/content.js.
  const surprises = content.surprises;

  function updateStarCount() {
    document.getElementById('starCount').textContent = `${discovered.size} / 4 ${content.surpriseSection.progressLabel}`;
    document.getElementById('finalUnlock').disabled = discovered.size !== 4;
  }

  document.querySelectorAll('.star-node').forEach(node => {
    node.addEventListener('click', () => {
      const key = node.dataset.surprise;
      const item = surprises[key];
      discovered.add(key);
      node.classList.add('discovered');
      updateStarCount();
      surpriseModalContent.replaceChildren();
      const symbol = document.createElement('div');
      symbol.className = 'surprise-symbol';
      symbol.textContent = item.symbol;
      const title = document.createElement('h3');
      title.textContent = item.title;
      const text = document.createElement('p');
      text.textContent = item.text;
      surpriseModalContent.append(symbol, title, text);
      if (key === 'mystery') {
        const constellation = document.createElement('div');
        constellation.className = 'gratitude-constellation';
        constellation.setAttribute('aria-label', 'Chòm sao FT 537');
        constellation.innerHTML = `
          <svg viewBox="0 0 320 190" role="img" aria-hidden="true">
            <defs><filter id="constellationGlow"><feGaussianBlur stdDeviation="3.5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
            <path class="constellation-draw" d="M42 116 L105 48 L177 91 L251 35 L278 132 L177 91 L105 48 L42 116 L118 157 L177 91" />
            <path class="constellation-draw constellation-extra" d="M118 157 L278 132" />
            <g class="constellation-points" filter="url(#constellationGlow)">
              <circle cx="42" cy="116" r="5"/><circle cx="105" cy="48" r="6"/><circle cx="177" cy="91" r="7"/><circle cx="251" cy="35" r="5"/><circle cx="278" cy="132" r="5"/><circle cx="118" cy="157" r="4"/>
            </g>
          </svg>
          <div class="constellation-caption">${item.constellationNote || 'Four little stars, one universe of gratitude · FT 537'}</div>`;
        surpriseModalContent.appendChild(constellation);
      }
      openModal(surpriseModal);
    });
  });

  buildGallery();
  updateNavigation(0);
  updateStarCount();

  // Layered cosmic background: distant stars, twinkling stars, dust and shooting stars.
  // All drawing is decorative and stays behind the interactive scenes.
  const canvas = document.getElementById('starfield');
  const ctx = canvas.getContext('2d', { alpha: true });
  const cursorGlow = document.getElementById('cursorGlow');
  let width = 0;
  let height = 0;
  let stars = [];
  let dust = [];
  let shootingStars = [];
  let nextShootingStarAt = 0;
  let animationFrame = null;

  const starColors = [
    [255, 247, 225], // warm white
    [242, 217, 155], // champagne gold
    [190, 180, 238], // lavender
    [157, 198, 226]  // cool blue
  ];

  function randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const isSmallScreen = width < 760;
    const starCount = Math.min(isSmallScreen ? 175 : 360, Math.max(isSmallScreen ? 105 : 190, Math.floor(width * height / (isSmallScreen ? 5100 : 3900))));
    stars = Array.from({ length: starCount }, (_, index) => {
      const layer = Math.random();
      const color = starColors[Math.floor(Math.random() * starColors.length)];
      const isBeacon = index % 23 === 0;
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        radius: layer < .48 ? randomBetween(.35, .8) : layer < .86 ? randomBetween(.7, 1.25) : randomBetween(1.15, isBeacon ? 2.15 : 1.65),
        alpha: layer < .48 ? randomBetween(.15, .4) : randomBetween(.3, .82),
        phase: Math.random() * Math.PI * 2,
        twinkleSpeed: randomBetween(.00035, .00115),
        drift: randomBetween(-.035, .035),
        rise: randomBetween(.012, .055),
        color,
        beacon: isBeacon,
        parallax: randomBetween(.15, .9)
      };
    });

    const dustCount = isSmallScreen ? 24 : 54;
    dust = Array.from({ length: dustCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: randomBetween(.6, 1.7),
      alpha: randomBetween(.08, .23),
      phase: Math.random() * Math.PI * 2,
      speed: randomBetween(.12, .48),
      drift: randomBetween(-.12, .12)
    }));
    shootingStars = [];
    nextShootingStarAt = performance.now() + randomBetween(2800, 5200);
  }

  function drawBeacon(star, opacity) {
    const glow = star.radius * 5.5;
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = `rgba(${star.color.join(',')}, .9)`;
    ctx.lineWidth = .75;
    ctx.shadowColor = `rgba(${star.color.join(',')}, .95)`;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(star.x - glow, star.y);
    ctx.lineTo(star.x + glow, star.y);
    ctx.moveTo(star.x, star.y - glow);
    ctx.lineTo(star.x, star.y + glow);
    ctx.stroke();
    ctx.restore();
  }

  function spawnShootingStar() {
    const fromLeft = Math.random() > .22;
    const x = fromLeft ? randomBetween(-width * .1, width * .72) : randomBetween(width * .55, width * 1.08);
    const y = randomBetween(-height * .12, height * .58);
    const speed = randomBetween(5.2, 9.2);
    shootingStars.push({
      x, y,
      vx: speed,
      vy: speed * randomBetween(.22, .46),
      life: 0,
      maxLife: randomBetween(34, 58),
      tail: randomBetween(75, 155),
      width: randomBetween(.8, 1.55)
    });
  }

  function drawShootingStars(time) {
    if (!reduceMotion && time >= nextShootingStarAt) {
      spawnShootingStar();
      nextShootingStarAt = time + randomBetween(4300, 8500);
    }

    shootingStars = shootingStars.filter(item => item.life < item.maxLife);
    shootingStars.forEach(item => {
      const progress = item.life / item.maxLife;
      const x = item.x + item.vx * item.life;
      const y = item.y + item.vy * item.life;
      const fade = Math.sin(Math.PI * progress);
      const tailX = x - item.vx * (item.tail / 9);
      const tailY = y - item.vy * (item.tail / 9);
      const gradient = ctx.createLinearGradient(x, y, tailX, tailY);
      gradient.addColorStop(0, `rgba(255,250,231,${.95 * fade})`);
      gradient.addColorStop(.22, `rgba(242,217,155,${.52 * fade})`);
      gradient.addColorStop(1, 'rgba(184,169,232,0)');
      ctx.save();
      ctx.strokeStyle = gradient;
      ctx.lineWidth = item.width;
      ctx.shadowColor = 'rgba(242,217,155,.85)';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();
      ctx.fillStyle = `rgba(255,250,235,${fade})`;
      ctx.beginPath();
      ctx.arc(x, y, item.width * 1.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      item.life += 1;
    });
  }

  function drawStars(time) {
    ctx.clearRect(0, 0, width, height);

    // Deep-space pinpoints with different sizes, colors and twinkle speeds.
    stars.forEach(star => {
      const pulse = .58 + Math.sin(time * star.twinkleSpeed + star.phase) * .34;
      const alpha = Math.max(.04, star.alpha * pulse);
      ctx.beginPath();
      ctx.fillStyle = `rgba(${star.color.join(',')}, ${alpha})`;
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      ctx.fill();
      if (star.beacon && pulse > .72) drawBeacon(star, alpha * .8);

      if (!reduceMotion) {
        star.y -= star.rise * star.parallax;
        star.x += star.drift * star.parallax;
        if (star.y < -3) star.y = height + 3;
        if (star.x < -3) star.x = width + 3;
        if (star.x > width + 3) star.x = -3;
      }
    });

    // A sparse layer of drifting cosmic dust adds depth without obscuring text.
    dust.forEach(particle => {
      const pulse = .55 + Math.sin(time * .0007 * particle.speed + particle.phase) * .3;
      ctx.beginPath();
      ctx.fillStyle = `rgba(199,190,236,${particle.alpha * pulse})`;
      ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      ctx.fill();
      if (!reduceMotion) {
        particle.y -= .08 * particle.speed;
        particle.x += particle.drift;
        if (particle.y < -3) particle.y = height + 3;
        if (particle.x < -3) particle.x = width + 3;
        if (particle.x > width + 3) particle.x = -3;
      }
    });

    drawShootingStars(time);
    if (!reduceMotion) animationFrame = requestAnimationFrame(drawStars);
  }

  resizeCanvas();
  if (!reduceMotion) animationFrame = requestAnimationFrame(drawStars);
  else drawStars(0);
  window.addEventListener('resize', resizeCanvas, { passive: true });

  // A faint lavender glow follows the pointer on desktop only.
  if (cursorGlow && window.matchMedia('(pointer: fine)').matches && !reduceMotion) {
    window.addEventListener('pointermove', event => {
      document.body.classList.add('has-pointer');
      document.documentElement.style.setProperty('--pointer-x', `${event.clientX}px`);
      document.documentElement.style.setProperty('--pointer-y', `${event.clientY}px`);
    }, { passive: true });
    window.addEventListener('pointerleave', () => document.body.classList.remove('has-pointer'));
  }
})();

