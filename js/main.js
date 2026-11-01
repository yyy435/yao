/* ============================================================
   阿尧的赛博空间 · 全局交互脚本
   主题切换 / 粒子背景 / 滚动渐入 / 导航高亮 / 音乐播放器
   技能卡片 / 相册灯箱 / 视频控制 / 工具页 / 联系页
============================================================ */
(function () {
  'use strict';

  /* ---------- 工具函数 ---------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function fmtTime(s) {
    if (!isFinite(s) || s < 0) s = 0;
    var m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return (m < 10 ? '0' + m : m) + ':' + (sec < 10 ? '0' + sec : sec);
  }
  var toastTimer = null;
  function toast(msg) {
    var t = $('#toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'toast'; t.className = 'toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2600);
  }

  /* ---------- 主题切换（localStorage 记忆） ---------- */
  (function initTheme() {
    var rootEl = document.documentElement;
    var theme = 'dark';
    try { theme = localStorage.getItem('ayao-theme') || 'dark'; } catch (e) { /* ignore */ }
    rootEl.setAttribute('data-theme', theme);
    var btn = $('#themeToggle');
    if (btn) {
      btn.textContent = theme === 'dark' ? '🌙' : '☀️';
      btn.addEventListener('click', function () {
        var next = rootEl.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        rootEl.setAttribute('data-theme', next);
        try { localStorage.setItem('ayao-theme', next); } catch (e) { /* ignore */ }
        btn.textContent = next === 'dark' ? '🌙' : '☀️';
      });
    }
  })();

  /* ---------- 粒子背景（增强版在文件末尾，含鼠标交互） ---------- */

  /* ---------- 滚动渐入（IntersectionObserver） ---------- */
  (function initReveal() {
    var els = $all('.reveal');
    if (!('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('visible'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('visible'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    els.forEach(function (el) { io.observe(el); });
  })();

  /* ---------- 导航高亮 ---------- */
  (function initNav() {
    var current = (location.pathname.split('/').pop() || 'index.html').split('?')[0];
    $all('.nav-links a').forEach(function (a) {
      var href = a.getAttribute('href').split('/').pop().split('#')[0];
      if (href === current) a.classList.add('active');
    });
  })();

  /* ---------- 封面签名打字效果 ---------- */
  (function initTyping() {
    var el = $('#heroSlogan');
    if (!el) return;
    var full = el.textContent;
    el.textContent = '';
    var i = 0;
    (function type() {
      if (i <= full.length) {
        el.textContent = full.slice(0, i);
        i++;
        setTimeout(type, 70);
      }
    })();
  })();

  /* ============================================================
     音乐播放器（所有页面通用，固定在底部）
  ============================================================ */
  var playerCore = (function () {
    var wrap = $('#music-player');
    if (!wrap) return null;
    var prefix = wrap.getAttribute('data-music-prefix') || '';
    var playlist = [
      { title: '我们', artist: '阿尧的歌单', src: prefix + 'music/我们.mp3' },
      { title: '我们的明天', artist: '阿尧的歌单', src: prefix + 'music/我们的明天.mp3' },
      { title: '第57次取消发送', artist: '阿尧的歌单', src: prefix + 'music/第57次取消发送.mp3' }
    ];
    /* 跨页面音乐状态持久化 */
    var LS_KEY = 'cyber_music_state';
    function saveMusicState() {
      try {
        localStorage.setItem(LS_KEY, JSON.stringify({
          idx: idx, currentTime: audio.currentTime,
          isPlaying: !audio.paused, volume: audio.volume,
          ts: Date.now()
        }));
      } catch(e) {}
    }
    function loadMusicState() {
      try {
        var raw = localStorage.getItem(LS_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch(e) { return null; }
    }

    var audio = new Audio();
    audio.preload = 'metadata';
    audio.volume = 0.8;
    var ui = {
      play: $('#mpPlay'), prev: $('#mpPrev'), next: $('#mpNext'),
      seek: $('#mpSeek'), vol: $('#mpVolume'), time: $('#mpTime'),
      title: $('#mpTitle'), artist: $('#mpArtist'), mode: $('#mpMode'),
      collapse: $('#mpCollapse')
    };
    var idx = 0, mode = 0; // 0 顺序 1 单曲循环 2 随机
    var dragging = false;

    function updateUI() {
      ui.title.textContent = playlist[idx].title;
      ui.artist.textContent = playlist[idx].artist;
      $all('.pl-item').forEach(function (li, i) { li.classList.toggle('active', i === idx); });
      var st = $('#songTitle'); if (st) st.textContent = playlist[idx].title;
      var sa = $('#songArtist'); if (sa) sa.textContent = playlist[idx].artist;
      $all('.vinyl').forEach(function (v) { v.classList.toggle('spinning', !audio.paused); });
      wrap.classList.toggle('playing', !audio.paused);
      ui.play.textContent = audio.paused ? '▶' : '⏸';
    }
    function load(i, autoplay) {
      idx = ((i % playlist.length) + playlist.length) % playlist.length;
      audio.src = playlist[idx].src;
      updateUI();
      if (autoplay) { audio.play().catch(function () { toast('点击播放按钮开始播放'); }); }
    }
    function play() { audio.play().catch(function () { toast('点击播放按钮开始播放'); }); }
    function pause() { audio.pause(); }
    function toggle() { if (audio.paused) play(); else pause(); }
    function next() {
      if (mode === 2) {
        var r;
        do { r = Math.floor(Math.random() * playlist.length); } while (r === idx && playlist.length > 1);
        load(r, true);
      } else { load(idx + 1, true); }
    }
    function prev() { load(idx - 1, true); }

    ui.play.addEventListener('click', toggle);
    ui.prev.addEventListener('click', prev);
    ui.next.addEventListener('click', next);
    ui.mode.addEventListener('click', function () {
      mode = (mode + 1) % 3;
      ui.mode.textContent = ['🔁', '🔂', '🎲'][mode];
      toast(['顺序播放', '单曲循环', '随机播放'][mode]);
    });
    ui.collapse.addEventListener('click', function () { wrap.classList.toggle('mini'); });
    audio.addEventListener('play', function () { updateUI(); saveMusicState(); });
    audio.addEventListener('pause', function () { updateUI(); saveMusicState(); });
    audio.addEventListener('loadedmetadata', function () {
      if (isFinite(audio.duration) && audio.duration > 0) ui.seek.max = Math.floor(audio.duration * 1000);
      if (shouldRestore) {
        audio.currentTime = saved.currentTime || 0;
        if (saved.isPlaying) { audio.play().catch(function () {}); }
        shouldRestore = false;
      }
    });
    audio.addEventListener('timeupdate', function () {
      if (dragging) return;
      var d = audio.duration || 0;
      if (d) ui.seek.value = Math.floor((audio.currentTime / d) * 1000);
      ui.time.textContent = fmtTime(audio.currentTime) + ' / ' + fmtTime(d);
    });
    ui.seek.addEventListener('input', function () { dragging = true; });
    ui.seek.addEventListener('change', function () {
      dragging = false;
      var d = audio.duration || 0;
      if (d) audio.currentTime = (ui.seek.value / 1000) * d;
    });
    ui.vol.addEventListener('input', function () { audio.volume = ui.vol.value / 100; });
    audio.addEventListener('ended', function () {
      if (mode === 1) { audio.currentTime = 0; play(); }
      else { next(); }
    });
    $all('.pl-item').forEach(function (li) {
      li.addEventListener('click', function () {
        load(parseInt(li.getAttribute('data-index'), 10) || 0, true);
      });
    });

    /* 初始化：恢复上次播放状态 */
    var saved = loadMusicState();
    var shouldRestore = false;
    if (saved && (Date.now() - (saved.ts || 0) < 300000)) {
      idx = saved.idx || 0;
      audio.src = playlist[idx].src;
      audio.volume = typeof saved.volume === 'number' ? saved.volume : 0.8;
      shouldRestore = true;
      updateUI();
    } else {
      load(0, false);
    }
    return {
      audio: audio, playlist: playlist, load: load,
      play: play, pause: pause, toggle: toggle, next: next, prev: prev,
      getIndex: function () { return idx; }
    };
  })();
  window.__player = playerCore;

  /* ---------- 音乐页：音频可视化 ---------- */
  (function initVisualizer() {
    var canvas = $('#visualizer');
    if (!canvas || !playerCore) return;
    var ctx = canvas.getContext('2d');
    var actx = null, analyser = null;
    function ensureAudio() {
      if (actx) return;
      try {
        actx = new (window.AudioContext || window.webkitAudioContext)();
        analyser = actx.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.8;
        var srcNode = actx.createMediaElementSource(playerCore.audio);
        srcNode.connect(analyser);
        analyser.connect(actx.destination);
        playerCore.audio.addEventListener('play', function () {
          if (actx && actx.state === 'suspended') { actx.resume().catch(function () { /* ignore */ }); }
        });
      } catch (e) { /* ignore */ }
    }
    function draw() {
      var t = Date.now();
      var w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      var bars = 48, gap = 4;
      var bw = Math.max(1, (w - gap * (bars - 1)) / bars);
      var data = null;
      if (analyser) {
        data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
      }
      for (var i = 0; i < bars; i++) {
        var v;
        if (data) { v = data[Math.floor(i * data.length / bars)] / 255; }
        else { v = 0.1 + 0.08 * Math.sin(t / 320 + i * 0.35) + 0.05 * Math.sin(t / 160 + i * 0.85); }
        v = Math.max(0.03, Math.min(1, v));
        var bh = v * h * 0.92;
        var hue = 180 + (i / bars) * 130;
        var col = 'hsl(' + hue + ',100%,62%)';
        var x = i * (bw + gap);
        ctx.shadowColor = col; ctx.shadowBlur = 10;
        ctx.fillStyle = col;
        ctx.fillRect(x, h - bh, bw, bh);
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,255,255,.85)';
        ctx.fillRect(x, Math.max(0, h - bh - 3), bw, 3);
      }
      requestAnimationFrame(draw);
    }
    function resize() {
      var rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = Math.floor(rect.width) || 600;
      canvas.height = 120;
    }
    resize();
    window.addEventListener('resize', resize);
    var kicked = false;
    function kick() {
      ensureAudio();
      if (actx && actx.state === 'suspended') actx.resume().catch(function () { /* ignore */ });
    }
    ['click', 'touchstart', 'keydown'].forEach(function (ev) {
      document.addEventListener(ev, function () { if (!kicked) { kicked = true; kick(); } }, { once: true });
    });
    draw(); // 先播放空闲动画
  })();

  /* ---------- 主页：技能卡片交互 ---------- */
  (function initSkills() {
    $all('.skill-card').forEach(function (card) {
      var desc = $('.skill-desc', card);
      if (!desc) return;
      var full = desc.getAttribute('data-text') || desc.textContent;
      desc.setAttribute('data-text', full);
      card.addEventListener('click', function () {
        /* 图标弹跳 */
        card.classList.remove('bounce');
        void card.offsetWidth;
        card.classList.add('bounce');
        /* 标题渐变 */
        var title = $('.skill-title', card);
        if (title) { title.classList.remove('skill-grad'); void title.offsetWidth; title.classList.add('skill-grad'); }
        /* 描述打字机 */
        desc.textContent = '';
        var i = 0;
        (function type() {
          if (i <= full.length) {
            desc.textContent = full.slice(0, i);
            i++;
            setTimeout(type, 38);
          }
        })();
      });
    });
  })();

  /* ---------- 相册：灯箱 ---------- */
  (function initLightbox() {
    var lb = $('#lightbox');
    if (!lb) return;
    var imgEl = $('#lbImg'), cap = $('#lbCaption');
    var items = $all('.gallery-item');
    var cur = 0;
    function show(i) {
      if (!items.length) return;
      cur = (i + items.length) % items.length;
      var im = $('img', items[cur]);
      imgEl.src = im.getAttribute('src');
      cap.textContent = im.getAttribute('alt') || '';
      lb.classList.add('show');
      document.body.style.overflow = 'hidden';
    }
    function hide() {
      lb.classList.remove('show');
      document.body.style.overflow = '';
    }
    items.forEach(function (it, i) { it.addEventListener('click', function () { show(i); }); });
    $('#lbClose').addEventListener('click', hide);
    $('#lbPrev').addEventListener('click', function (e) { e.stopPropagation(); show(cur - 1); });
    $('#lbNext').addEventListener('click', function (e) { e.stopPropagation(); show(cur + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) hide(); });
    document.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('show')) return;
      if (e.key === 'Escape') hide();
      if (e.key === 'ArrowLeft') show(cur - 1);
      if (e.key === 'ArrowRight') show(cur + 1);
    });
  })();

  /* ---------- 视频页：播放器控制 ---------- */
  (function initVideo() {
    var video = $('#video');
    if (!video) return;
    var box = $('#videoBox');
    var playBtn = $('#vcPlay'), seek = $('#vcSeek'), vol = $('#vcVolume');
    var timeEl = $('#vcTime'), fullBtn = $('#vcFull'), overlay = $('#videoOverlay');
    function sync() {
      playBtn.textContent = video.paused ? '▶' : '⏸';
      var d = video.duration || 0;
      if (d) seek.value = Math.floor((video.currentTime / d) * 1000);
      timeEl.textContent = fmtTime(video.currentTime) + ' / ' + fmtTime(d);
      overlay.style.opacity = video.paused ? '1' : '0';
    }
    function toggle() { if (video.paused) video.play(); else video.pause(); }
    playBtn.addEventListener('click', toggle);
    video.addEventListener('click', toggle);
    video.addEventListener('play', sync);
    video.addEventListener('pause', sync);
    video.addEventListener('timeupdate', sync);
    video.addEventListener('loadedmetadata', sync);
    seek.addEventListener('input', function () {
      var d = video.duration || 0;
      if (d) video.currentTime = (seek.value / 1000) * d;
    });
    vol.addEventListener('input', function () { video.volume = vol.value / 100; });
    fullBtn.addEventListener('click', function () {
      if (document.fullscreenElement) { document.exitFullscreen(); }
      else if (box.requestFullscreen) { box.requestFullscreen(); }
    });
    /* 控制栏自动隐藏 */
    var hideTimer = null;
    function showCtl() {
      box.classList.add('ctl-show');
      clearTimeout(hideTimer);
      hideTimer = setTimeout(function () { if (!video.paused) box.classList.remove('ctl-show'); }, 2600);
    }
    box.addEventListener('mousemove', showCtl);
    box.addEventListener('mouseleave', function () { box.classList.remove('ctl-show'); });
    showCtl();
    sync();
  })();

  /* ---------- 工具页：面板 + COMING SOON 弹窗 ---------- */
  (function initTools() {
    $all('.tool-card').forEach(function (card) {
      card.addEventListener('click', function () {
        var panel = document.getElementById(card.getAttribute('data-panel'));
        if (!panel) return;
        var open = panel.classList.contains('open');
        $all('.tool-panel').forEach(function (p) { p.classList.remove('open'); });
        if (!open) panel.classList.add('open');
      });
    });
    var modal = $('#soonModal');
    if (!modal) return;
    var nameEl = $('#soonName'), countEl = $('#soonCount');
    var timer = null;
    function openSoon(name) {
      if (nameEl) nameEl.textContent = name || '该功能';
      modal.classList.add('show');
      document.body.style.overflow = 'hidden';
      if (countEl) {
        var n = 5;
        countEl.textContent = n;
        clearInterval(timer);
        timer = setInterval(function () {
          n = n <= 1 ? 5 : n - 1;
          countEl.textContent = n;
        }, 1000);
      }
    }
    function closeSoon() {
      modal.classList.remove('show');
      document.body.style.overflow = '';
      clearInterval(timer);
    }
    $all('.tool-row').forEach(function (row) {
      row.addEventListener('click', function () {
        var nameEl2 = $('.tr-name', row);
        var name = row.getAttribute('data-tool') || (nameEl2 ? nameEl2.textContent : '该功能');
        openSoon(name);
      });
    });
    $('#soonClose').addEventListener('click', closeSoon);
    $('#soonOK').addEventListener('click', closeSoon);
    modal.addEventListener('click', function (e) { if (e.target === modal) closeSoon(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal.classList.contains('show')) closeSoon();
    });
  })();

  /* ---------- 联系页：二维码弹窗 + 复制 + 留言表单 ---------- */
  (function initContact() {
    var qrModal = $('#qrModal');
    if (qrModal) {
      var qrImg = $('#qrImg'), qrTitle = $('#qrTitle');
      function showQR(src, title) {
        qrImg.src = src;
        qrTitle.textContent = title || '扫码添加';
        qrModal.classList.add('show');
        document.body.style.overflow = 'hidden';
      }
      function hideQR() {
        qrModal.classList.remove('show');
        document.body.style.overflow = '';
      }
      $all('[data-qr]').forEach(function (el) {
        el.addEventListener('click', function () {
          showQR(el.getAttribute('data-qr'), el.getAttribute('data-title'));
        });
      });
      $('#qrClose').addEventListener('click', hideQR);
      qrModal.addEventListener('click', function (e) { if (e.target === qrModal) hideQR(); });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && qrModal.classList.contains('show')) hideQR();
      });
    }
    $all('[data-copy]').forEach(function (el) {
      el.addEventListener('click', function () {
        var val = el.getAttribute('data-copy');
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(val).then(
            function () { toast('已复制：' + val); },
            function () { toast('复制失败：' + val); }
          );
        } else {
          var ta = document.createElement('textarea');
          ta.value = val;
          document.body.appendChild(ta);
          ta.select();
          try { document.execCommand('copy'); toast('已复制：' + val); }
          catch (e) { toast(val); }
          document.body.removeChild(ta);
        }
      });
    });
    var form = $('#contactForm');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        toast('消息已发送，感谢留言！💌');
        form.reset();
      });
    }
  })();

  /* ============================================================
     炫酷增强 · 启动动画 / 自定义光标 / 3D倾斜 / 滚动进度
     / 鼠标粒子 / 文字解密 / 磁吸按钮 / 矩阵雨 / 数字滚动
   ============================================================ */

  /* ---------- 启动加载动画 ---------- */
  (function initBootScreen() {
    var boot = document.querySelector('.boot-screen');
    if (!boot) return;
    var textEl = boot.querySelector('.boot-text');
    var lines = [
      '> 初始化赛博空间...',
      '> 加载粒子引擎...',
      '> 校准霓虹光效...',
      '> 连接数据矩阵...',
      '> 启动完成 [OK]'
    ];
    var li = 0;
    function nextLine() {
      if (li < lines.length) {
        if (textEl) textEl.textContent = lines[li];
        li++;
        setTimeout(nextLine, 350);
      } else {
        setTimeout(function () {
          boot.classList.add('done');
          setTimeout(function () { if (boot.parentNode) boot.parentNode.removeChild(boot); }, 700);
        }, 300);
      }
    }
    nextLine();
  })();

  /* ---------- 自定义光标 ---------- */
  (function initCustomCursor() {
    if (window.matchMedia('(max-width: 768px)').matches) return;
    var dot = document.createElement('div');
    dot.className = 'cursor-dot';
    var ring = document.createElement('div');
    ring.className = 'cursor-ring';
    document.body.appendChild(dot);
    document.body.appendChild(ring);
    var mx = 0, my = 0, rx = 0, ry = 0;
    document.addEventListener('mousemove', function (e) {
      mx = e.clientX; my = e.clientY;
      dot.style.left = mx + 'px';
      dot.style.top = my + 'px';
    });
    function follow() {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      ring.style.left = rx + 'px';
      ring.style.top = ry + 'px';
      requestAnimationFrame(follow);
    }
    follow();
    document.addEventListener('mousedown', function () { ring.classList.add('click'); });
    document.addEventListener('mouseup', function () { ring.classList.remove('click'); });
    $all('a, button, .holo-card, .gallery-item, .tool-row, .contact-card, .pl-item, input, textarea, .nav-links a').forEach(function (el) {
      el.addEventListener('mouseenter', function () { ring.classList.add('hover'); });
      el.addEventListener('mouseleave', function () { ring.classList.remove('hover'); });
    });
  })();

  /* ---------- 3D 卡片倾斜 ---------- */
  (function init3DTilt() {
    if (window.matchMedia('(max-width: 768px)').matches) return;
    $all('.holo-card').forEach(function (card) {
      var glow = document.createElement('div');
      glow.className = 'holo-glow';
      card.appendChild(glow);
      card.classList.add('tilt-active');
      card.addEventListener('mousemove', function (e) {
        var rect = card.getBoundingClientRect();
        var x = e.clientX - rect.left;
        var y = e.clientY - rect.top;
        var cx = rect.width / 2, cy = rect.height / 2;
        var rotX = ((y - cy) / cy) * -6;
        var rotY = ((x - cx) / cx) * 6;
        card.style.transform = 'perspective(600px) rotateX(' + rotX + 'deg) rotateY(' + rotY + 'deg) translateY(-4px)';
        glow.style.setProperty('--mx', (x / rect.width * 100) + '%');
        glow.style.setProperty('--my', (y / rect.height * 100) + '%');
      });
      card.addEventListener('mouseleave', function () {
        card.style.transform = '';
      });
    });
  })();

  /* ---------- 滚动进度条 ---------- */
  (function initScrollProgress() {
    var bar = document.querySelector('.scroll-progress');
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'scroll-progress';
      document.body.appendChild(bar);
    }
    function update() {
      var st = document.documentElement.scrollTop || document.body.scrollTop;
      var sh = document.documentElement.scrollHeight || document.body.scrollHeight;
      var pct = (st / (sh - window.innerHeight)) * 100;
      bar.style.width = Math.max(0, Math.min(100, pct)) + '%';
    }
    window.addEventListener('scroll', update, { passive: true });
    update();
  })();

  /* ---------- 鼠标交互粒子增强 ---------- */
  (function initMouseParticles() {
    var canvas = $('#particles');
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext('2d');
    var mouse = { x: -9999, y: -9999, radius: 150 };
    var parts = [];
    var COLORS = ['0,240,255', '160,32,240', '255,0,255'];
    var W = 0, H = 0;
    function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
    function build() {
      resize();
      var count = Math.max(24, Math.min(80, Math.floor(W * H / 18000)));
      parts = [];
      for (var i = 0; i < count; i++) {
        parts.push({
          x: Math.random() * W, y: Math.random() * H,
          r: 0.8 + Math.random() * 2.2,
          vx: (Math.random() - 0.5) * 0.45,
          vy: (Math.random() - 0.5) * 0.45,
          ox: 0, oy: 0,
          c: COLORS[Math.floor(Math.random() * COLORS.length)],
          a: 0.25 + Math.random() * 0.55
        });
      }
    }
    build();
    window.addEventListener('resize', build);
    window.addEventListener('mousemove', function (e) { mouse.x = e.clientX; mouse.y = e.clientY; });
    window.addEventListener('mouseleave', function () { mouse.x = -9999; mouse.y = -9999; });
    var raf = null;
    function frame() {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        /* 鼠标排斥力 */
        var dx = p.x - mouse.x, dy = p.y - mouse.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < mouse.radius) {
          var force = (mouse.radius - dist) / mouse.radius;
          p.ox = (dx / Math.max(1, dist)) * force * 3;
          p.oy = (dy / Math.max(1, dist)) * force * 3;
        } else {
          p.ox *= 0.92;
          p.oy *= 0.92;
        }
        p.x += p.vx + p.ox;
        p.y += p.vy + p.oy;
        if (p.x < -10) p.x = W + 10; else if (p.x > W + 10) p.x = -10;
        if (p.y < -10) p.y = H + 10; else if (p.y > H + 10) p.y = -10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(' + p.c + ',' + p.a + ')';
        ctx.shadowColor = 'rgba(' + p.c + ',0.9)';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.lineWidth = 0.5;
      for (var i2 = 0; i2 < parts.length; i2++) {
        for (var j = i2 + 1; j < parts.length; j++) {
          var ddx = parts[i2].x - parts[j].x, ddy = parts[i2].y - parts[j].y;
          var d2 = ddx * ddx + ddy * ddy;
          if (d2 < 130 * 130) {
            var alpha = (1 - Math.sqrt(d2) / 130) * 0.14;
            ctx.strokeStyle = 'rgba(0,240,255,' + alpha.toFixed(3) + ')';
            ctx.beginPath();
            ctx.moveTo(parts[i2].x, parts[i2].y);
            ctx.lineTo(parts[j].x, parts[j].y);
            ctx.stroke();
          }
        }
        /* 鼠标连线 */
        var mdx = parts[i2].x - mouse.x, mdy = parts[i2].y - mouse.y;
        var md2 = mdx * mdx + mdy * mdy;
        if (md2 < mouse.radius * mouse.radius) {
          var malpha = (1 - Math.sqrt(md2) / mouse.radius) * 0.25;
          ctx.strokeStyle = 'rgba(255,0,255,' + malpha.toFixed(3) + ')';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(parts[i2].x, parts[i2].y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
          ctx.lineWidth = 0.5;
        }
      }
      raf = requestAnimationFrame(frame);
    }
    frame();
    document.addEventListener('visibilitychange', function () {
      if (document.hidden && raf) { cancelAnimationFrame(raf); raf = null; }
      else if (!document.hidden && !raf) { frame(); }
    });
    /* 覆盖原来的粒子初始化 - 移除旧粒子监听 */
    window.__enhancedParticles = true;
  })();

  /* ---------- 文字解密效果 ---------- */
  (function initScramble() {
    var chars = '!<>-_\\/[]{}=+*^?#01';
    function scramble(el) {
      var original = el.getAttribute('data-text') || el.textContent;
      var duration = 600;
      var frameTime = 30;
      var totalFrames = duration / frameTime;
      var frame = 0;
      function update() {
        var progress = frame / totalFrames;
        var reveal = Math.floor(original.length * progress);
        var scrambled = '';
        for (var i = 0; i < original.length; i++) {
          if (i < reveal) {
            scrambled += original[i];
          } else {
            scrambled += chars[Math.floor(Math.random() * chars.length)];
          }
        }
        el.textContent = scrambled;
        frame++;
        if (frame <= totalFrames) {
          requestAnimationFrame(update);
        } else {
          el.textContent = original;
        }
      }
      update();
    }
    /* 欢迎页名称解密 */
    var heroName = $('.hero-name.glitch');
    if (heroName) {
      setTimeout(function () { scramble(heroName); }, 600);
    }
    /* 标题鼠标悬停解密 */
    $all('.section-title').forEach(function (el) {
      el.addEventListener('mouseenter', function () { scramble(el); });
    });
    /* 技能卡片标题 */
    $all('.skill-title').forEach(function (el) {
      el.addEventListener('mouseenter', function () { scramble(el); });
    });
  })();

  /* ---------- 磁吸按钮 ---------- */
  (function initMagnetic() {
    if (window.matchMedia('(max-width: 768px)').matches) return;
    $all('.btn, .enter-btn, .mp-play-btn').forEach(function (btn) {
      btn.classList.add('magnetic');
      btn.addEventListener('mousemove', function (e) {
        var rect = btn.getBoundingClientRect();
        var x = e.clientX - rect.left - rect.width / 2;
        var y = e.clientY - rect.top - rect.height / 2;
        btn.style.transform = 'translate(' + (x * 0.2) + 'px, ' + (y * 0.3) + 'px)';
      });
      btn.addEventListener('mouseleave', function () {
        btn.style.transform = '';
      });
    });
  })();

  /* ---------- 矩阵雨背景 ---------- */
  (function initMatrixRain() {
    var canvas = document.getElementById('matrix-rain');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'matrix-rain';
      document.body.appendChild(canvas);
    }
    var ctx = canvas.getContext('2d');
    function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    resize();
    window.addEventListener('resize', resize);
    var cols = Math.floor(canvas.width / 14);
    var drops = [];
    for (var i = 0; i < cols; i++) drops[i] = Math.random() * canvas.height;
    var chars = '01ABCDEFGHIJKLMNOPQRSTUVWXYZ#@$%&*+<>=?{}[]';
    var raf = null;
    function draw() {
      ctx.fillStyle = 'rgba(0, 5, 26, 0.06)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#00f0ff';
      ctx.font = '12px monospace';
      for (var i = 0; i < drops.length; i++) {
        var text = chars[Math.floor(Math.random() * chars.length)];
        var y = drops[i];
        ctx.fillText(text, i * 14, y);
        if (y > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i] += 14;
      }
      raf = requestAnimationFrame(draw);
    }
    draw();
    document.addEventListener('visibilitychange', function () {
      if (document.hidden && raf) { cancelAnimationFrame(raf); raf = null; }
      else if (!document.hidden && !raf) { draw(); }
    });
  })();

  /* ---------- 数字滚动计数 ---------- */
  (function initCounters() {
    var counters = $all('.stat-num[data-count]');
    if (!counters.length) return;
    if (!('IntersectionObserver' in window)) {
      counters.forEach(function (el) {
        var target = parseInt(el.getAttribute('data-count'), 10) || 0;
        el.textContent = target + (el.getAttribute('data-suffix') || '');
      });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        io.unobserve(el);
        var target = parseInt(el.getAttribute('data-count'), 10) || 0;
        var suffix = el.getAttribute('data-suffix') || '';
        var dur = 1500, start = Date.now();
        function tick() {
          var elapsed = Date.now() - start;
          var progress = Math.min(elapsed / dur, 1);
          var eased = 1 - Math.pow(1 - progress, 3);
          el.textContent = Math.floor(eased * target) + suffix;
          if (progress < 1) requestAnimationFrame(tick);
          else el.textContent = target + suffix;
        }
        tick();
      });
    }, { threshold: 0.4 });
    counters.forEach(function (el) { io.observe(el); });
  })();

  /* ---------- 彩蛋：Konami Code ---------- */
  (function initEasterEgg() {
    var konami = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    var idx = 0;
    document.addEventListener('keydown', function (e) {
      if (e.key === konami[idx] || e.key.toLowerCase() === konami[idx]) {
        idx++;
        if (idx === konami.length) {
          idx = 0;
          toast('🎮 KONAMI! 你发现了隐藏彩蛋！赛博空间秘密通道已开启！');
          document.body.style.animation = 'hueRotate 2s linear';
          setTimeout(function () { document.body.style.animation = ''; }, 2000);
        }
      } else {
        idx = 0;
      }
    });
    /* 注入色相旋转动画 */
    var style = document.createElement('style');
    style.textContent = '@keyframes hueRotate { 0% { filter: hue-rotate(0deg); } 100% { filter: hue-rotate(360deg); } }';
    document.head.appendChild(style);
  })();

  /* ---------- 平滑滚动增强 ---------- */
  (function initSmoothScroll() {
    $all('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var href = a.getAttribute('href');
        if (href === '#' || href === '#start-of-content') return;
        var target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  })();

  /* ---------- 增强导航栏滚动效果 ---------- */
  (function initNavScroll() {
    var navbar = $('.navbar');
    if (!navbar) return;
    var lastScroll = 0;
    window.addEventListener('scroll', function () {
      var st = window.scrollY;
      if (st > 100) {
        navbar.style.boxShadow = '0 4px 30px rgba(0, 240, 255, 0.15)';
      } else {
        navbar.style.boxShadow = '0 2px 24px rgba(0, 240, 255, 0.08)';
      }
      lastScroll = st;
    }, { passive: true });
  })();

  /* ---------- 图片懒加载淡入 ---------- */
  (function initLazyFade() {
    $all('img[loading="lazy"]').forEach(function (img) {
      if (img.complete) { img.style.opacity = '1'; return; }
      img.style.opacity = '0';
      img.style.transition = 'opacity 0.6s ease';
      img.addEventListener('load', function () { img.style.opacity = '1'; });
    });
  })();

})();
