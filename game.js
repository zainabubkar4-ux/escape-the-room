(() => {
  "use strict";

  // ============================================================
  // DEVICE DETECTION
  // ============================================================
  const IS_MOBILE = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || (('ontouchstart' in window) && window.innerWidth < 900);

  // ============================================================
  // AUDIO ENGINE (unchanged, but respects quality)
  // ============================================================
  const AudioEngine = {
    ctx: null, masterGain: null, sfxGain: null, musicGain: null, enabled: true,
    init() {
      if (this.ctx) return;
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.sfxGain = this.ctx.createGain();
        this.musicGain = this.ctx.createGain();
        this.sfxGain.connect(this.masterGain);
        this.musicGain.connect(this.masterGain);
        this.masterGain.connect(this.ctx.destination);
      } catch (_) { this.enabled = false; }
    },
    resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
    updateVolumes() {
      if (!this.ctx) return;
      this.masterGain.gain.value = settings.masterVolume / 100;
      this.sfxGain.gain.value = settings.sfxVolume / 100;
      this.musicGain.gain.value = settings.musicVolume / 100 * 0.4;
    },
    playTone(freq, duration, type = 'sine', gain = 0.2, target = 'sfx') {
      if (!this.enabled || !this.ctx) return;
      this.resume();
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      const now = this.ctx.currentTime;
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(gain, now + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(g);
      g.connect(target === 'music' ? this.musicGain : this.sfxGain);
      osc.start(now); osc.stop(now + duration);
    },
    playNoise(duration, gain = 0.15) {
      if (!this.enabled || !this.ctx) return;
      this.resume();
      const bufferSize = this.ctx.sampleRate * duration;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      const g = this.ctx.createGain();
      g.gain.value = gain;
      source.connect(g); g.connect(this.sfxGain);
      source.start();
    },
    jump() { this.playTone(440, 0.12, 'square', 0.12); setTimeout(() => this.playTone(660, 0.1, 'square', 0.1), 40); },
    land() { this.playTone(120, 0.08, 'sine', 0.15); },
    coin() { this.playTone(880, 0.08, 'square', 0.15); setTimeout(() => this.playTone(1320, 0.12, 'square', 0.12), 60); },
    hit() { this.playNoise(0.25, 0.2); this.playTone(80, 0.3, 'sawtooth', 0.2); },
    complete() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.playTone(f, 0.3, 'triangle', 0.18), i * 120)); },
    trap() { this.playTone(200, 0.15, 'sawtooth', 0.18); setTimeout(() => this.playTone(150, 0.2, 'sawtooth', 0.15), 80); },
    click() { this.playTone(600, 0.05, 'sine', 0.08); },
    countdown() { this.playTone(440, 0.15, 'sine', 0.15); },
    countdownGo() { this.playTone(880, 0.4, 'triangle', 0.25); setTimeout(() => this.playTone(1320, 0.5, 'triangle', 0.2), 100); },
    purchase() { this.playTone(660, 0.1, 'square', 0.15); setTimeout(() => this.playTone(880, 0.15, 'square', 0.12), 80); setTimeout(() => this.playTone(1100, 0.2, 'square', 0.1), 160); },
    equip() { this.playTone(800, 0.1, 'sine', 0.12); setTimeout(() => this.playTone(1200, 0.15, 'sine', 0.1), 60); },
    whoosh() { this.playNoise(0.4, 0.1); this.playTone(150, 0.4, 'sawtooth', 0.08); },
    thud() { this.playTone(60, 0.5, 'sine', 0.3); this.playNoise(0.3, 0.15); },
    shatter() { this.playNoise(0.5, 0.25); for (let i = 0; i < 8; i++) setTimeout(() => this.playTone(600 + Math.random() * 1400, 0.15, 'triangle', 0.08), i * 40); },
    zap() { this.playTone(1200, 0.08, 'sawtooth', 0.15); setTimeout(() => this.playTone(800, 0.1, 'sawtooth', 0.1), 50); },
    chime() { [784, 1047, 1319].forEach((f, i) => setTimeout(() => this.playTone(f, 0.5, 'sine', 0.15), i * 100)); }
  };

  // ============================================================
  // ELEMENTS
  // ============================================================
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d", { alpha: false });
  const lobbyCanvas = document.getElementById("lobbyCanvas");
  const lctx = lobbyCanvas.getContext("2d", { alpha: false });

  const screens = {
    intro: document.getElementById("introScreen"),
    createId: document.getElementById("createIdScreen"),
    lobby: document.getElementById("lobbyScreen"),
    store: document.getElementById("storeScreen"),
    game: document.getElementById("gameScreen"),
    how: document.getElementById("howScreen"),
    settings: document.getElementById("settingsScreen"),
  };

  const el = (id) => document.getElementById(id);
  const levelNumber = el("levelNumber");
  const messageBox = el("messageBox");
  const pauseOverlay = el("pauseOverlay");
  const completeOverlay = el("completeOverlay");
  const completeTitle = el("completeTitle");
  const completeText = el("completeText");
  const nextBtn = el("nextBtn");
  const countdownOverlay = el("countdownOverlay");
  const countdownNumber = el("countdownNumber");
  const interactionPrompt = el("interactionPrompt");
  const promptText = el("promptText");
  const coinCount = el("coinCount");
  const skillCount = el("skillCount");
  const storeCoinCount = el("storeCoinCount");
  const rewardCoins = el("rewardCoins");
  const rewardSkills = el("rewardSkills");
  const storeContent = el("storeContent");
  const damageFlash = el("damageFlash");
  const skillHud = el("skillHud");
  const playerBadgeAvatar = el("playerBadgeAvatar");
  const playerBadgeName = el("playerBadgeName");

  const W = canvas.width;
  const H = canvas.height;

  // Lobby dimensions are dynamic — will be set on resize
  let LW = lobbyCanvas.width;
  let LH = lobbyCanvas.height;

  const input = { left: false, right: false, jump: false, jumpPressed: false };

  // ============================================================
  // SHARED GAME STATE
  // ============================================================
  let currentLevel = 31;
  let paused = false;
  let completed = false;
  let lastTime = 0;
  let rafId = null;
  let level = null;
  let messageTimer = 0;
  let countdownActive = false;
  let gameRunning = false;
  let reviveUsed = false;

  // ============================================================
  // PLAYER DATA
  // ============================================================
  const playerData = {
    name: '', avatar: null, profileCreated: false,
    coins: 0, skillPoints: 0,
    ownedCharacters: ['default'], ownedOutfits: ['default'], ownedSkills: [],
    equippedCharacter: 'default', equippedOutfit: 'default', equippedSkills: [],
    currentLevel: 31, highestLevel: 31, totalRuns: 0, totalDeaths: 0,
    load() { try { const s = localStorage.getItem('escapeRoomPlayerData'); if (s) Object.assign(this, JSON.parse(s)); } catch (_) {} },
    save() {
      try {
        localStorage.setItem('escapeRoomPlayerData', JSON.stringify({
          name: this.name, avatar: this.avatar, profileCreated: this.profileCreated,
          coins: this.coins, skillPoints: this.skillPoints,
          ownedCharacters: this.ownedCharacters, ownedOutfits: this.ownedOutfits, ownedSkills: this.ownedSkills,
          equippedCharacter: this.equippedCharacter, equippedOutfit: this.equippedOutfit, equippedSkills: this.equippedSkills,
          currentLevel: this.currentLevel, highestLevel: this.highestLevel,
          totalRuns: this.totalRuns, totalDeaths: this.totalDeaths
        }));
      } catch (_) {}
    }
  };
  playerData.load();

  // ============================================================
  // SETTINGS — quality gates every effect
  // ============================================================
  const settings = {
    graphicsQuality: IS_MOBILE ? 'low' : 'high', // smart default
    showGrid: !IS_MOBILE,
    showShadows: !IS_MOBILE,
    masterVolume: 80, sfxVolume: 70, musicVolume: 50,
    moveBtnSize: 74, jumpBtnSize: 74,
    controlsPosition: 'default', screenMode: 'auto'
  };

  // Effect gates (recomputed when quality changes)
  const fx = {
    particles: true,
    shockwaves: true,
    floatingTexts: true,
    lightning: true,
    screenFlash: true,
    aberration: true,
    shake: true,
    stars: true,
    ambientParticles: true,
    nebulas: true,
    shadows: true,
    trails: true,
    coinSpin: true,
    animatedBg: true,
    glowEffects: true,
    portalExtras: true,
    traderCoins: true,
    detailPlatforms: true
  };

  function recomputeFx() {
    const q = settings.graphicsQuality;
    if (q === 'low') {
      Object.assign(fx, {
        particles: false, shockwaves: false, floatingTexts: false,
        lightning: false, screenFlash: false, aberration: false, shake: false,
        stars: false, ambientParticles: false, nebulas: false,
        shadows: false, trails: false, coinSpin: false, animatedBg: false,
        glowEffects: false, portalExtras: false, traderCoins: false, detailPlatforms: false
      });
    } else if (q === 'medium') {
      Object.assign(fx, {
        particles: true, shockwaves: true, floatingTexts: true,
        lightning: false, screenFlash: false, aberration: false, shake: true,
        stars: false, ambientParticles: false, nebulas: true,
        shadows: settings.showShadows, trails: true, coinSpin: true,
        animatedBg: false, glowEffects: true, portalExtras: false,
        traderCoins: false, detailPlatforms: false
      });
    } else {
      Object.assign(fx, {
        particles: true, shockwaves: true, floatingTexts: true,
        lightning: true, screenFlash: true, aberration: true, shake: true,
        stars: true, ambientParticles: true, nebulas: true,
        shadows: settings.showShadows, trails: true, coinSpin: true,
        animatedBg: true, glowEffects: true, portalExtras: true,
        traderCoins: true, detailPlatforms: true
      });
    }
  }

  function loadSettings() {
    try { const s = localStorage.getItem('escapeRoomSettings'); if (s) Object.assign(settings, JSON.parse(s)); } catch (_) {}
    recomputeFx();
    applySettings();
  }
  function saveSettings() { try { localStorage.setItem('escapeRoomSettings', JSON.stringify(settings)); } catch (_) {} }

  function applySettings() {
    ctx.imageSmoothingEnabled = settings.graphicsQuality !== 'low';
    lctx.imageSmoothingEnabled = settings.graphicsQuality !== 'low';
    document.querySelectorAll('.move-controls .control-btn').forEach(btn => {
      btn.style.width = settings.moveBtnSize + 'px';
      btn.style.height = settings.moveBtnSize + 'px';
    });
    const jb = el('jumpBtn');
    if (jb) { jb.style.width = settings.jumpBtnSize + 'px'; jb.style.height = settings.jumpBtnSize + 'px'; }
    const mc = el('mobileControls');
    if (mc) {
      mc.style.justifyContent = settings.controlsPosition === 'left' ? 'flex-start' :
        settings.controlsPosition === 'right' ? 'flex-end' : 'space-between';
      if (settings.controlsPosition === 'center') { mc.style.justifyContent = 'center'; mc.style.gap = '30px'; }
      else mc.style.gap = '20px';
    }
    if (el('moveBtnSize')) el('moveBtnSize').value = settings.moveBtnSize;
    if (el('jumpBtnSize')) el('jumpBtnSize').value = settings.jumpBtnSize;
    if (el('moveSizePreview')) { el('moveSizePreview').style.width = Math.min(settings.moveBtnSize, 80) + 'px'; el('moveSizePreview').style.height = Math.min(settings.moveBtnSize, 80) + 'px'; }
    if (el('jumpSizePreview')) { el('jumpSizePreview').style.width = Math.min(settings.jumpBtnSize, 80) + 'px'; el('jumpSizePreview').style.height = Math.min(settings.jumpBtnSize, 80) + 'px'; }
    if (el('gridToggle')) el('gridToggle').classList.toggle('on', settings.showGrid);
    if (el('shadowToggle')) el('shadowToggle').classList.toggle('on', settings.showShadows);
    if (el('graphicsQuality')) el('graphicsQuality').value = settings.graphicsQuality;
    if (el('controlsPosition')) el('controlsPosition').value = settings.controlsPosition;
    if (el('screenMode')) el('screenMode').value = settings.screenMode;
    if (el('masterVolume')) el('masterVolume').value = settings.masterVolume;
    if (el('sfxVolume')) el('sfxVolume').value = settings.sfxVolume;
    if (el('musicVolume')) el('musicVolume').value = settings.musicVolume;
    canvas.style.objectFit = settings.screenMode === 'stretch' ? 'fill' : 'contain';
    AudioEngine.updateVolumes();
  }
  function resetSettings() {
    Object.assign(settings, {
      graphicsQuality: IS_MOBILE ? 'low' : 'high',
      showGrid: !IS_MOBILE, showShadows: !IS_MOBILE,
      masterVolume: 80, sfxVolume: 70, musicVolume: 50,
      moveBtnSize: 74, jumpBtnSize: 74,
      controlsPosition: 'default', screenMode: 'auto'
    });
    recomputeFx(); applySettings(); saveSettings();
  }

  // ============================================================
  // BANNED NAME FILTER
  // ============================================================
  const BANNED_PATTERNS = [
    /\bf+u+c+k+/i, /\bs+h+i+t+/i, /\bb+i+t+c+h+/i, /\ba+s+s+h+o+l+e+/i,
    /\bd+i+c+k+/i, /\bc+o+c+k+/i, /\bp+u+s+s+y+/i, /\bc+u+n+t+/i,
    /\bn+i+g+g+/i, /\bf+a+g+/i, /\br+e+t+a+r+d+/i, /\bk+i+k+e+/i,
    /\bs+p+i+c+/i, /\bc+h+i+n+k+/i, /\bw+e+t+b+a+c+k+/i,
    /\bw+h+o+r+e+/i, /\bs+l+u+t+/i, /\bb+a+s+t+a+r+d+/i,
    /\bhitler/i, /\bnazi/i, /\bkkk/i,
    /\bk+y+s+/i, /\bf+a+g+g+o+t+/i, /\bn+i+g+g+e+r+/i,
    /\bnoob/i, /\bidi?ot/i, /\bstupid/i, /\bdumb/i,
    /\bkill\s*you/i, /\bdie\b/i, /\bhate\s*you/i,
    /\btrash/i, /\bgarbage/i, /\bworst/i,
    /\badmin/i, /\bmoderator/i, /\bmod\b/i, /\bowner/i,
    /\bsystem/i, /\bnull/i, /\bundefined/i, /\bnan\b/i
  ];

  function isNameAllowed(name) {
    const trimmed = name.trim();
    if (trimmed.length < 2) return { ok: false, reason: 'Name must be at least 2 characters' };
    if (trimmed.length > 16) return { ok: false, reason: 'Name must be 16 characters or less' };
    if (!/^[a-zA-Z0-9_\-\s\.]+$/.test(trimmed)) return { ok: false, reason: 'Only letters, numbers, spaces, _ - . allowed' };
    const lower = trimmed.toLowerCase();
    for (const pattern of BANNED_PATTERNS) if (pattern.test(lower)) return { ok: false, reason: 'This name contains a banned word' };
    if (/^(.)\1+$/.test(trimmed)) return { ok: false, reason: 'Name cannot be all the same character' };
    return { ok: true };
  }

  // ============================================================
  // STORE CATALOG
  // ============================================================
  const CHARACTERS = {
    default: { name: 'Runner', desc: 'The original escapee.', price: 0, color: '#f7f9ff', accent: '#7c5cff', emoji: '🏃' },
    joker: { name: 'Joker', desc: 'Why so serious?', price: 500, color: '#4a2a6a', accent: '#2fb87a', emoji: '🃏' },
    spiderman: { name: 'Spider-Man', desc: 'With great power...', price: 800, color: '#cc2222', accent: '#1a3a8a', emoji: '🕷️' },
    batman: { name: 'Batman', desc: 'I am vengeance.', price: 1000, color: '#1a1a2e', accent: '#f0c040', emoji: '🦇' },
    ironman: { name: 'Iron Man', desc: 'I am Iron Man.', price: 1200, color: '#8a1a1a', accent: '#ffd74a', emoji: '🤖' },
    hulk: { name: 'Hulk', desc: 'HULK SMASH!', price: 900, color: '#2a6a2a', accent: '#7cff5c', emoji: '💚' },
    flash: { name: 'The Flash', desc: 'Fastest man alive.', price: 1500, color: '#cc2222', accent: '#ffd74a', emoji: '⚡' },
    thanos: { name: 'Thanos', desc: 'I am inevitable.', price: 2000, color: '#4a2a6a', accent: '#ffd74a', emoji: '💜' },
    deadpool: { name: 'Deadpool', desc: 'Maximum effort!', price: 700, color: '#8a1a1a', accent: '#1a1a1a', emoji: '🗡️' },
    superman: { name: 'Superman', desc: 'Man of Steel.', price: 1800, color: '#1a3a8a', accent: '#cc2222', emoji: '🦸' },
    venom: { name: 'Venom', desc: 'We are Venom.', price: 1600, color: '#1a1a2e', accent: '#2fb87a', emoji: '🖤' },
    groot: { name: 'Groot', desc: 'I am Groot.', price: 1100, color: '#4a2a1a', accent: '#2fb87a', emoji: '🌳' },
    wolverine: { name: 'Wolverine', desc: 'Best there is.', price: 1300, color: '#f0c040', accent: '#8a1a1a', emoji: '🐺' },
    captain: { name: 'Captain America', desc: 'I can do this all day.', price: 1400, color: '#1a3a8a', accent: '#cc2222', emoji: '🛡️' },
    blackwidow: { name: 'Black Widow', desc: 'Red in my ledger.', price: 1200, color: '#1a1a1a', accent: '#cc2222', emoji: '🕸️' }
  };
  const OUTFITS = {
    default: { name: 'Casual', desc: 'Everyday clothes.', price: 0, color: '#f7f9ff', emoji: '👕' },
    ninja: { name: 'Ninja', desc: 'Silent but deadly.', price: 300, color: '#1a1a1a', emoji: '🥷' },
    knight: { name: 'Knight', desc: 'Armored up.', price: 600, color: '#c0c0c0', emoji: '⚔️' },
    wizard: { name: 'Wizard', desc: 'Magical robes.', price: 700, color: '#4a2a8a', emoji: '🧙' },
    astronaut: { name: 'Astronaut', desc: 'Space ready.', price: 800, color: '#e0e0e0', emoji: '👨‍🚀' },
    pirate: { name: 'Pirate', desc: 'Arrr!', price: 500, color: '#3a2a1a', emoji: '🏴‍☠️' },
    cyberpunk: { name: 'Cyberpunk', desc: 'Neon future.', price: 1000, color: '#26d9ff', emoji: '🤖' },
    viking: { name: 'Viking', desc: 'To Valhalla!', price: 750, color: '#8a6a3a', emoji: '🪓' },
    samurai: { name: 'Samurai', desc: 'Way of the warrior.', price: 900, color: '#8a1a1a', emoji: '🗡️' },
    ghost: { name: 'Ghost', desc: 'Boo!', price: 400, color: '#e0e0ff', emoji: '👻' },
    demon: { name: 'Demon', desc: 'From the abyss.', price: 1500, color: '#8a1a1a', emoji: '😈' },
    angel: { name: 'Angel', desc: 'Heaven sent.', price: 1500, color: '#ffffff', emoji: '👼' },
    neon: { name: 'Neon', desc: 'Glowing bright.', price: 1200, color: '#26d9ff', emoji: '💡' },
    shadow: { name: 'Shadow', desc: 'One with darkness.', price: 1300, color: '#0a0a0a', emoji: '🌑' }
  };
  const SKILLS = {
    doubleJump: { name: 'Double Jump', desc: 'Jump once more in mid-air.', price: 400, emoji: '🦅', skillPrice: 2 },
    speedBoost: { name: 'Speed Boost', desc: 'Move 25% faster.', price: 300, emoji: '💨', skillPrice: 1 },
    shield: { name: 'Shield', desc: 'Survive one hit per level.', price: 600, emoji: '🛡️', skillPrice: 3 },
    magnet: { name: 'Coin Magnet', desc: 'Attract nearby coins.', price: 500, emoji: '🧲', skillPrice: 2 },
    slowTime: { name: 'Slow Time', desc: 'Slow moving platforms.', price: 700, emoji: '⏱️', skillPrice: 3 },
    highJump: { name: 'High Jump', desc: 'Jump 20% higher.', price: 350, emoji: '🦘', skillPrice: 1 },
    dash: { name: 'Dash', desc: 'Quick horizontal dash.', price: 550, emoji: '⚡', skillPrice: 2 },
    revive: { name: 'Revive', desc: 'Auto-revive once per run.', price: 1000, emoji: '💖', skillPrice: 4 }
  };
  const BUNDLES = {
    starter: { name: 'Starter Pack', desc: 'Joker + Ninja + 500 coins', price: 800, emoji: '📦', includes: { characters: ['joker'], outfits: ['ninja'], coins: 500 } },
    hero: { name: 'Hero Bundle', desc: 'Spider-Man + Superman + Knight', price: 2000, emoji: '🦸', includes: { characters: ['spiderman', 'superman'], outfits: ['knight'] } },
    villain: { name: 'Villain Bundle', desc: 'Joker + Thanos + Deadpool', price: 2500, emoji: '😈', includes: { characters: ['joker', 'thanos', 'deadpool'] } },
    cosmic: { name: 'Cosmic Bundle', desc: 'Thanos + Iron Man + Flash', price: 3500, emoji: '🌌', includes: { characters: ['thanos', 'ironman', 'flash'] } },
    skillsPack: { name: 'Skill Pack', desc: 'All skills unlocked + 5 skill points', price: 2000, emoji: '✨', includes: { skills: ['doubleJump', 'speedBoost', 'shield', 'magnet', 'highJump'], skillPoints: 5 } },
    legends: { name: 'Legends Bundle', desc: 'Venom + Groot + Wolverine', price: 3000, emoji: '🏆', includes: { characters: ['venom', 'groot', 'wolverine'] } },
    avengers: { name: 'Avengers Bundle', desc: 'Captain + Black Widow + Iron Man', price: 3200, emoji: '🛡️', includes: { characters: ['captain', 'blackwidow', 'ironman'] } }
  };

  // ============================================================
  // UTILS
  // ============================================================
  function shadeColor(color, percent) {
    if (!color || color[0] !== '#') return color;
    const num = parseInt(color.slice(1), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, Math.min(255, (num >> 16) + amt));
    const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amt));
    const B = Math.max(0, Math.min(255, (num & 0x0000FF) + amt));
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
  }

  function drawCharacterHead(c, charId, cx, cy, r, facing) {
    if (charId === 'spiderman') {
      c.fillStyle = '#cc2222'; c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#1a1a1a'; c.lineWidth = r * 0.08;
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) { c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); c.stroke(); }
      c.fillStyle = 'white';
      c.beginPath();
      c.ellipse(cx - r*0.35, cy - r*0.15, r*0.35, r*0.25, 0.3, 0, Math.PI * 2);
      c.ellipse(cx + r*0.35, cy - r*0.15, r*0.35, r*0.25, -0.3, 0, Math.PI * 2);
      c.fill();
    } else if (charId === 'batman') {
      c.fillStyle = '#1a1a2e'; c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.moveTo(cx - r*0.8, cy - r*0.7); c.lineTo(cx - r*1.0, cy - r*1.8); c.lineTo(cx - r*0.4, cy - r*0.8); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(cx + r*0.8, cy - r*0.7); c.lineTo(cx + r*1.0, cy - r*1.8); c.lineTo(cx + r*0.4, cy - r*0.8); c.closePath(); c.fill();
      c.fillStyle = 'white';
      c.beginPath();
      c.ellipse(cx - r*0.35, cy - r*0.15, r*0.3, r*0.15, 0, 0, Math.PI * 2);
      c.ellipse(cx + r*0.35, cy - r*0.15, r*0.3, r*0.15, 0, 0, Math.PI * 2);
      c.fill();
    } else if (charId === 'ironman') {
      c.fillStyle = '#8a1a1a'; c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#ffd74a';
      c.beginPath();
      c.moveTo(cx - r*0.55, cy - r*0.55); c.lineTo(cx + r*0.55, cy - r*0.55);
      c.lineTo(cx + r*0.45, cy + r*0.15); c.lineTo(cx - r*0.45, cy + r*0.15);
      c.closePath(); c.fill();
      c.fillStyle = '#26d9ff';
      if (fx.glowEffects) { c.shadowColor = '#26d9ff'; c.shadowBlur = r * 0.8; }
      c.beginPath();
      c.ellipse(cx - r*0.28, cy - r*0.1, r*0.22, r*0.15, 0, 0, Math.PI * 2);
      c.ellipse(cx + r*0.28, cy - r*0.1, r*0.22, r*0.15, 0, 0, Math.PI * 2);
      c.fill(); c.shadowBlur = 0;
    } else if (charId === 'joker') {
      c.fillStyle = '#f0f0f0'; c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#2fb87a'; c.beginPath(); c.arc(cx, cy - r*0.3, r*0.9, Math.PI, 0); c.fill();
      c.strokeStyle = '#cc2222'; c.lineWidth = r * 0.16;
      c.beginPath(); c.arc(cx, cy + r*0.3, r*0.45, 0.2, Math.PI - 0.2); c.stroke();
      c.fillStyle = '#1a1a1a';
      c.beginPath();
      c.arc(cx - r*0.35, cy - r*0.1, r*0.16, 0, Math.PI * 2);
      c.arc(cx + r*0.35, cy - r*0.1, r*0.16, 0, Math.PI * 2);
      c.fill();
    } else if (charId === 'thanos') {
      c.fillStyle = '#6a2a8a'; c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#4a1a6a';
      c.beginPath();
      c.moveTo(cx - r*0.5, cy + r*0.3); c.lineTo(cx + r*0.5, cy + r*0.3);
      c.lineTo(cx + r*0.35, cy + r*0.85); c.lineTo(cx - r*0.35, cy + r*0.85);
      c.closePath(); c.fill();
      c.fillStyle = '#ffd74a';
      if (fx.glowEffects) { c.shadowColor = '#ffd74a'; c.shadowBlur = r * 0.5; }
      c.beginPath();
      c.arc(cx - r*0.35, cy - r*0.1, r*0.16, 0, Math.PI * 2);
      c.arc(cx + r*0.35, cy - r*0.1, r*0.16, 0, Math.PI * 2);
      c.fill(); c.shadowBlur = 0;
    } else if (charId === 'hulk') {
      c.fillStyle = '#2a6a2a'; c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#1a1a1a';
      c.beginPath();
      c.arc(cx - r*0.35, cy - r*0.1, r*0.2, 0, Math.PI * 2);
      c.arc(cx + r*0.35, cy - r*0.1, r*0.2, 0, Math.PI * 2);
      c.fill();
    } else if (charId === 'flash') {
      c.fillStyle = '#cc2222'; c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#ffd74a';
      c.beginPath();
      c.moveTo(cx - r*0.65, cy - r*0.65); c.lineTo(cx + r*0.3, cy - r*0.65);
      c.lineTo(cx - r*0.2, cy - r*0.1); c.lineTo(cx + r*0.65, cy - r*0.1);
      c.lineTo(cx - r*0.65, cy + r*0.65); c.closePath(); c.fill();
    } else if (charId === 'venom') {
      c.fillStyle = '#1a1a2e'; c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'white';
      c.beginPath();
      c.ellipse(cx - r*0.4, cy - r*0.15, r*0.35, r*0.2, 0.3, 0, Math.PI * 2);
      c.ellipse(cx + r*0.4, cy - r*0.15, r*0.35, r*0.2, -0.3, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = 'white'; c.lineWidth = r * 0.12;
      c.beginPath();
      for (let i = 0; i < 6; i++) { c.moveTo(cx - r*0.55 + i * r*0.22, cy + r*0.35); c.lineTo(cx - r*0.45 + i * r*0.22, cy + r*0.65); }
      c.stroke();
    } else if (charId === 'groot') {
      c.fillStyle = '#4a2a1a'; c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#2fb87a';
      c.beginPath();
      c.arc(cx - r*0.45, cy - r*1.3, r*0.25, 0, Math.PI * 2);
      c.arc(cx + r*0.45, cy - r*1.5, r*0.2, 0, Math.PI * 2);
      c.arc(cx, cy - r*1.7, r*0.22, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#1a1a1a';
      c.beginPath();
      c.arc(cx - r*0.35, cy - r*0.1, r*0.16, 0, Math.PI * 2);
      c.arc(cx + r*0.35, cy - r*0.1, r*0.16, 0, Math.PI * 2);
      c.fill();
    } else if (charId === 'deadpool') {
      c.fillStyle = '#8a1a1a'; c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#1a1a1a';
      c.beginPath();
      c.ellipse(cx - r*0.4, cy - r*0.15, r*0.28, r*0.18, 0.3, 0, Math.PI * 2);
      c.ellipse(cx + r*0.4, cy - r*0.15, r*0.28, r*0.18, -0.3, 0, Math.PI * 2);
      c.fill();
    } else if (charId === 'superman') {
      c.fillStyle = '#1a3a8a'; c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#cc2222';
      c.beginPath();
      c.moveTo(cx - r*0.5, cy - r*0.4); c.lineTo(cx + r*0.5, cy - r*0.4);
      c.lineTo(cx + r*0.3, cy + r*0.2); c.lineTo(cx - r*0.3, cy + r*0.2);
      c.closePath(); c.fill();
      c.fillStyle = 'white';
      c.beginPath();
      c.arc(cx - r*0.3, cy - r*0.1, r*0.15, 0, Math.PI * 2);
      c.arc(cx + r*0.3, cy - r*0.1, r*0.15, 0, Math.PI * 2);
      c.fill();
    } else if (charId === 'wolverine') {
      c.fillStyle = '#f0c040'; c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#8a1a1a';
      c.beginPath(); c.moveTo(cx - r*0.9, cy - r*0.3); c.lineTo(cx - r*0.5, cy - r*0.9); c.lineTo(cx - r*0.3, cy - r*0.3); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(cx + r*0.9, cy - r*0.3); c.lineTo(cx + r*0.5, cy - r*0.9); c.lineTo(cx + r*0.3, cy - r*0.3); c.closePath(); c.fill();
      c.fillStyle = '#1a1a1a';
      c.beginPath();
      c.arc(cx - r*0.35, cy - r*0.1, r*0.15, 0, Math.PI * 2);
      c.arc(cx + r*0.35, cy - r*0.1, r*0.15, 0, Math.PI * 2);
      c.fill();
    } else if (charId === 'captain') {
      c.fillStyle = '#1a3a8a'; c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#cc2222'; c.beginPath(); c.arc(cx, cy - r*0.4, r*0.9, Math.PI, 0); c.fill();
      c.fillStyle = 'white';
      c.beginPath();
      c.moveTo(cx, cy - r*0.5); c.lineTo(cx + r*0.15, cy - r*0.2);
      c.lineTo(cx + r*0.5, cy - r*0.2); c.lineTo(cx + r*0.2, cy + r*0.05);
      c.lineTo(cx + r*0.3, cy + r*0.4); c.lineTo(cx, cy + r*0.2);
      c.lineTo(cx - r*0.3, cy + r*0.4); c.lineTo(cx - r*0.2, cy + r*0.05);
      c.lineTo(cx - r*0.5, cy - r*0.2); c.lineTo(cx - r*0.15, cy - r*0.2);
      c.closePath(); c.fill();
    } else if (charId === 'blackwidow') {
      c.fillStyle = '#1a1a1a'; c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#cc2222';
      c.beginPath(); c.moveTo(cx - r*0.9, cy - r*0.2); c.lineTo(cx - r*0.3, cy - r*0.6); c.lineTo(cx - r*0.3, cy + r*0.1); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(cx + r*0.9, cy - r*0.2); c.lineTo(cx + r*0.3, cy - r*0.6); c.lineTo(cx + r*0.3, cy + r*0.1); c.closePath(); c.fill();
      c.fillStyle = '#1a1a1a';
      c.beginPath();
      c.arc(cx - r*0.35, cy - r*0.05, r*0.14, 0, Math.PI * 2);
      c.arc(cx + r*0.35, cy - r*0.05, r*0.14, 0, Math.PI * 2);
      c.fill();
    } else {
      const facingDir = facing || 1;
      c.fillStyle = '#0d1220';
      c.beginPath();
      c.arc(cx + facingDir * r*0.28, cy - r*0.08, r*0.12, 0, Math.PI * 2);
      c.arc(cx - facingDir * r*0.28, cy - r*0.08, r*0.12, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = 'rgba(38,217,255,.8)';
      c.lineWidth = r * 0.1;
      if (fx.glowEffects) { c.shadowColor = '#26d9ff'; c.shadowBlur = r * 0.7; }
      c.beginPath(); c.arc(cx, cy - r*0.08, r*0.4, -0.5, 0.5); c.stroke();
      c.shadowBlur = 0;
    }
  }

  // ============================================================
  // SCREEN MANAGEMENT
  // ============================================================
  function showScreen(name) {
    Object.values(screens).forEach(s => s && s.classList.remove("active"));
    if (screens[name]) screens[name].classList.add("active");
    if (name === 'lobby') { resizeLobby(); ensureLobbyLoop(); updateCurrencyDisplay(); updatePlayerBadge(); }
    if (name === 'createId') setupCreateIdScreen();
  }
  function enterLobby() {
    showScreen('lobby');
    screens.lobby.classList.remove('fade-in');
    void screens.lobby.offsetWidth;
    setTimeout(() => screens.lobby.classList.add('fade-in'), 50);
  }
  function updateCurrencyDisplay() {
    coinCount.textContent = playerData.coins;
    skillCount.textContent = playerData.skillPoints;
    if (storeCoinCount) storeCoinCount.textContent = playerData.coins;
  }
  function updatePlayerBadge() {
    if (playerData.avatar) playerBadgeAvatar.innerHTML = `<img src="${playerData.avatar}" alt="" />`;
    else playerBadgeAvatar.textContent = (playerData.name || '?')[0].toUpperCase();
    playerBadgeName.textContent = playerData.name || 'Player';
  }

  // ============================================================
  // INTRO ANIMATION (quality-gated)
  // ============================================================
  const intro = {
    running: false, uCount: 0, maxU: 9,
    start() {
      if (this.running) return;
      this.running = true; this.uCount = 0;
      const base = el('introNameBase');
      const uContainer = el('introUContainer');
      const bgFlash = el('introBgFlash');
      const flash = el('introFlash');
      const particles = el('introParticles');

      base.classList.add('stage1');
      AudioEngine.init(); AudioEngine.resume(); AudioEngine.whoosh();
      setTimeout(() => bgFlash.classList.add('pulse'), 200);
      setTimeout(() => this.addU(uContainer, particles), 700);
      setTimeout(() => base.classList.add('intro-name-shake'), 2200);
      setTimeout(() => { this.crackScreen(); AudioEngine.shatter(); }, 3500);
      setTimeout(() => { flash.style.transition = 'opacity .5s'; flash.style.opacity = '1'; AudioEngine.thud(); }, 4100);
      setTimeout(() => {
        flash.style.opacity = '0';
        this.running = false;
        if (playerData.profileCreated && playerData.name) enterLobby();
        else { showScreen('createId'); setupCreateIdScreen(); }
      }, 4700);
    },
    addU(uContainer, particleContainer) {
      if (this.uCount >= this.maxU) return;
      const u = document.createElement('span');
      u.className = 'intro-u';
      u.textContent = 'U';
      uContainer.appendChild(u);

      // Particles only on medium/high
      if (fx.particles) {
        const rect = u.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const pCount = settings.graphicsQuality === 'high' ? 4 : 2;
        for (let i = 0; i < pCount; i++) {
          const p = document.createElement('div');
          p.className = 'intro-particle';
          p.style.left = cx + 'px'; p.style.top = cy + 'px';
          p.style.width = (4 + Math.random() * 6) + 'px';
          p.style.height = p.style.width;
          p.style.background = ['#26d9ff', '#7c5cff', '#ffd74a', '#ff4f6d'][Math.floor(Math.random() * 4)];
          p.style.setProperty('--px', (Math.random() - 0.5) * 300 + 'px');
          p.style.setProperty('--py', (Math.random() - 0.5) * 300 + 'px');
          p.classList.add('emit');
          particleContainer.appendChild(p);
          setTimeout(() => p.remove(), 1600);
        }
      }
      AudioEngine.zap();
      this.uCount++;
      if (this.uCount > 4) {
        const allU = uContainer.querySelectorAll('.intro-u');
        const ci = Math.floor(Math.random() * (allU.length - 2));
        if (allU[ci] && !allU[ci].classList.contains('chaos')) {
          allU[ci].classList.add('chaos');
          setTimeout(() => allU[ci].classList.remove('chaos'), 300);
        }
      }
      setTimeout(() => this.addU(uContainer, particleContainer), 180 + Math.random() * 100);
    },
    crackScreen() {
      const crack = el('introCrack');
      const shards = el('introShards');
      const wrapper = el('introNameWrapper');
      crack.classList.add('cracking');
      if (fx.shake) document.body.style.animation = 'introShake .08s 8';

      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const lineCount = settings.graphicsQuality === 'low' ? 5 : 12;
      for (let i = 0; i < lineCount; i++) {
        const line = document.createElement('div');
        line.className = 'crack-line';
        const angle = (i / lineCount) * Math.PI * 2 + Math.random() * 0.4;
        const length = 200 + Math.random() * 400;
        line.style.left = cx + 'px'; line.style.top = cy + 'px';
        line.style.width = length + 'px';
        line.style.height = (1 + Math.random() * 3) + 'px';
        line.style.transform = `rotate(${angle}rad)`;
        line.style.transformOrigin = '0 50%';
        crack.appendChild(line);
        setTimeout(() => line.classList.add('show'), i * 40);
      }
      if (settings.graphicsQuality !== 'low') {
        setTimeout(() => {
          wrapper.style.transition = 'transform .8s ease-out, opacity .8s ease-out';
          wrapper.style.transform = 'scale(1.2)';
          wrapper.style.opacity = '0.3';
          const shardCount = settings.graphicsQuality === 'high' ? 40 : 15;
          for (let i = 0; i < shardCount; i++) {
            const shard = document.createElement('div');
            shard.className = 'intro-shard';
            const size = 20 + Math.random() * 80;
            shard.style.width = size + 'px'; shard.style.height = size + 'px';
            shard.style.left = (window.innerWidth / 2 - size / 2) + 'px';
            shard.style.top = (window.innerHeight / 2 - size / 2) + 'px';
            shard.style.setProperty('--tx', (Math.random() - 0.5) * window.innerWidth * 1.5 + 'px');
            shard.style.setProperty('--ty', (Math.random() - 0.5) * window.innerHeight * 1.5 + 'px');
            shard.style.setProperty('--rot', (Math.random() - 0.5) * 1080 + 'deg');
            shards.appendChild(shard);
            setTimeout(() => shard.classList.add('shatter'), i * 15);
          }
        }, 400);
      }
    }
  };

  // ============================================================
  // CREATE ID
  // ============================================================
  let pendingAvatarData = null;
  function setupCreateIdScreen() {
    const input = el('idInput');
    const error = el('idError');
    const continueBtn = el('continueBtn');
    const avatarInput = el('avatarInput');
    const avatarPlaceholder = el('avatarPlaceholder');

    if (playerData.name) input.value = playerData.name;
    if (playerData.avatar) {
      avatarPlaceholder.innerHTML = `<img src="${playerData.avatar}" alt="avatar" />`;
      pendingAvatarData = playerData.avatar;
    }
    function validate() {
      const val = input.value.trim();
      if (val.length === 0) { error.classList.add('hidden'); continueBtn.disabled = true; input.classList.remove('invalid'); return; }
      const r = isNameAllowed(val);
      if (r.ok) { error.classList.add('hidden'); input.classList.remove('invalid'); continueBtn.disabled = false; }
      else { error.textContent = r.reason; error.classList.remove('hidden'); input.classList.add('invalid'); continueBtn.disabled = true; }
    }
    input.addEventListener('input', validate);
    validate();

    avatarInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 3 * 1024 * 1024) { alert('Image too large. Please choose one under 3MB.'); return; }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const c = document.createElement('canvas');
          const size = 200; c.width = size; c.height = size;
          const cctx = c.getContext('2d');
          const min = Math.min(img.width, img.height);
          cctx.drawImage(img, (img.width - min) / 2, (img.height - min) / 2, min, min, 0, 0, size, size);
          const dataUrl = c.toDataURL('image/jpeg', 0.85);
          pendingAvatarData = dataUrl;
          avatarPlaceholder.innerHTML = `<img src="${dataUrl}" alt="avatar" />`;
          AudioEngine.click();
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });

    continueBtn.addEventListener('click', () => {
      const val = input.value.trim();
      if (!isNameAllowed(val).ok) return;
      playerData.name = val;
      if (pendingAvatarData) playerData.avatar = pendingAvatarData;
      playerData.profileCreated = true;
      playerData.save();
      AudioEngine.chime();
      updatePlayerBadge();
      enterLobby();
    });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !continueBtn.disabled) continueBtn.click(); });
  }

  // ============================================================
  // LOBBY — dynamic sizing + scaled characters
  // ============================================================
  function resizeLobby() {
    const rect = lobbyCanvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, settings.graphicsQuality === 'low' ? 1.25 : 2);
    const cssW = Math.max(320, Math.floor(rect.width));
    const cssH = Math.max(240, Math.floor(rect.height));
    // Cap internal resolution to keep mobile fast
    const maxW = settings.graphicsQuality === 'low' ? 900 : 1400;
    const maxH = settings.graphicsQuality === 'low' ? 600 : 900;
    let drawW = Math.min(maxW, Math.floor(cssW * (settings.graphicsQuality === 'low' ? 1 : dpr)));
    let drawH = Math.min(maxH, Math.floor(cssH * (settings.graphicsQuality === 'low' ? 1 : dpr)));
    if (lobbyCanvas.width !== drawW || lobbyCanvas.height !== drawH) {
      lobbyCanvas.width = drawW;
      lobbyCanvas.height = drawH;
      LW = drawW; LH = drawH;
      if (lobby && lobby.init) { lobby.stars.length = 0; lobby.ambientParticles.length = 0; lobby.floatingCoins.length = 0; lobby.init(); }
    }
  }

  const lobby = {
    playerX: 0, playerY: 0, playerVX: 0, speed: 0, facing: 1, animTime: 0,
    traderX: 0, traderY: 0, traderBob: 0,
    portalX: 0, portalY: 0,
    particles: [], stars: [], floatingCoins: [], ambientParticles: [],
    keys: {}, nearTrader: false, nearPortal: false,
    scale: 1, floorY: 0,

    init() {
      this.recomputeLayout();
      const starCount = fx.stars ? (settings.graphicsQuality === 'high' ? 120 : 60) : 0;
      const coinCount = settings.graphicsQuality === 'low' ? 6 : 12;
      const ambientCount = fx.ambientParticles ? (settings.graphicsQuality === 'high' ? 40 : 20) : 0;
      this.stars = [];
      this.floatingCoins = [];
      this.ambientParticles = [];
      for (let i = 0; i < starCount; i++) this.stars.push({ x: Math.random() * LW, y: Math.random() * LH, size: 0.5 + Math.random() * 2, phase: Math.random() * Math.PI * 2, speed: 0.5 + Math.random() * 2, color: ['#ffffff', '#7c5cff', '#26d9ff', '#ffd74a'][Math.floor(Math.random() * 4)] });
      for (let i = 0; i < coinCount; i++) this.floatingCoins.push({ x: 60 + Math.random() * (LW - 120), y: 60 + Math.random() * (LH - 180), phase: Math.random() * Math.PI * 2, size: Math.max(8, LW * 0.012) + Math.random() * 6 });
      for (let i = 0; i < ambientCount; i++) this.ambientParticles.push({ x: Math.random() * LW, y: Math.random() * LH, vx: (Math.random() - 0.5) * 20, vy: -20 - Math.random() * 30, size: 1 + Math.random() * 2, life: Math.random() * 5 + 3, maxLife: 8, color: ['#7c5cff', '#26d9ff', '#ffd74a', '#48e29b'][Math.floor(Math.random() * 4)] });
    },

    recomputeLayout() {
      this.floorY = LH * 0.68;
      const bottomPad = Math.min(LH * 0.15, 120);
      this.playerY = this.floorY - Math.min(LH * 0.08, 60);
      this.traderY = this.floorY - Math.min(LH * 0.06, 45);
      this.portalY = this.floorY - Math.min(LH * 0.10, 75);
      // Character scale — bigger on small screens so they're visible
      this.scale = Math.max(0.75, Math.min(1.6, LW / 900));

      // Horizontal layout: portal-left, player-center, trader-right
      const margin = Math.min(LW * 0.18, 260);
      this.portalX = margin + 40;
      this.traderX = LW - margin - 40;
      this.playerX = LW / 2;
      this.speed = Math.max(180, LW * 0.28);
    },

    update(dt) {
      this.playerVX = 0;
      if (this.keys.left) this.playerVX -= this.speed;
      if (this.keys.right) this.playerVX += this.speed;
      if (this.playerVX !== 0) this.facing = Math.sign(this.playerVX);
      this.playerX += this.playerVX * dt;
      this.playerX = Math.max(60, Math.min(LW - 60, this.playerX));
      this.animTime += dt;
      this.traderBob = Math.sin(this.animTime * 2) * 6 * this.scale;

      const dxT = this.playerX - this.traderX, dyT = this.playerY - this.traderY;
      this.nearTrader = Math.sqrt(dxT * dxT + dyT * dyT) < 130 * this.scale;
      const dxP = this.playerX - this.portalX, dyP = this.playerY - this.portalY;
      this.nearPortal = Math.sqrt(dxP * dxP + dyP * dyP) < 130 * this.scale;

      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 200 * dt; p.life -= dt;
        if (p.life <= 0) this.particles.splice(i, 1);
      }
      if (fx.ambientParticles) {
        for (const p of this.ambientParticles) {
          p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
          if (p.life <= 0) { p.x = Math.random() * LW; p.y = LH + 20; p.life = p.maxLife; }
        }
      }
    },

    draw() {
      const time = performance.now() / 1000;
      const grd = lctx.createLinearGradient(0, 0, 0, LH);
      grd.addColorStop(0, '#0d1220'); grd.addColorStop(0.5, '#0a0e1a'); grd.addColorStop(1, '#05070c');
      lctx.fillStyle = grd; lctx.fillRect(0, 0, LW, LH);

      if (fx.nebulas) {
        for (let i = 0; i < 3; i++) {
          const nx = LW/2 + Math.sin(time * 0.3 + i) * LW * 0.15;
          const ny = LH/2 + Math.cos(time * 0.2 + i) * LH * 0.15;
          const nGrd = lctx.createRadialGradient(nx, ny, 0, nx, ny, LW * 0.3);
          nGrd.addColorStop(0, ['rgba(124,92,255,.08)', 'rgba(38,217,255,.06)', 'rgba(255,79,109,.05)'][i]);
          nGrd.addColorStop(1, 'transparent');
          lctx.fillStyle = nGrd; lctx.fillRect(nx - LW * 0.3, ny - LW * 0.3, LW * 0.6, LW * 0.6);
        }
      }

      if (fx.stars) {
        for (const star of this.stars) {
          const twinkle = 0.4 + 0.6 * Math.abs(Math.sin(star.phase + time * star.speed));
          lctx.fillStyle = star.color; lctx.globalAlpha = twinkle * 0.5;
          lctx.beginPath(); lctx.arc(star.x, star.y, star.size, 0, Math.PI * 2); lctx.fill();
        }
        lctx.globalAlpha = 1;
      }

      // Floor
      const floorGrd = lctx.createLinearGradient(0, this.floorY, 0, LH);
      floorGrd.addColorStop(0, 'rgba(124,92,255,.08)');
      floorGrd.addColorStop(1, 'rgba(124,92,255,.2)');
      lctx.fillStyle = floorGrd; lctx.fillRect(0, this.floorY, LW, LH - this.floorY);
      lctx.strokeStyle = 'rgba(124,92,255,.2)'; lctx.lineWidth = 1;
      for (let x = 0; x < LW; x += 60) { lctx.beginPath(); lctx.moveTo(x, this.floorY); lctx.lineTo(x + 100, LH); lctx.stroke(); }
      lctx.beginPath(); lctx.moveTo(0, this.floorY); lctx.lineTo(LW, this.floorY);
      lctx.strokeStyle = 'rgba(124,92,255,.5)'; lctx.lineWidth = 2; lctx.stroke();

      if (settings.graphicsQuality !== 'low') {
        for (const coin of this.floatingCoins) {
          const bob = Math.sin(time * 2 + coin.phase) * 10;
          const spin = fx.coinSpin ? time * 3 + coin.phase : 0;
          lctx.save(); lctx.translate(coin.x, coin.y + bob);
          lctx.scale(Math.cos(spin) || 1, 1);
          if (fx.glowEffects) { lctx.shadowColor = '#ffd74a'; lctx.shadowBlur = 20; }
          lctx.fillStyle = '#ffd74a';
          lctx.beginPath(); lctx.arc(0, 0, coin.size, 0, Math.PI * 2); lctx.fill();
          lctx.shadowBlur = 0;
          lctx.fillStyle = '#8a6a1a'; lctx.font = `bold ${coin.size}px Arial`;
          lctx.textAlign = 'center'; lctx.textBaseline = 'middle'; lctx.fillText('$', 0, 1);
          lctx.restore();
        }
      }

      if (fx.ambientParticles) {
        for (const p of this.ambientParticles) {
          const alpha = Math.min(1, p.life / p.maxLife) * 0.4;
          lctx.globalAlpha = alpha; lctx.fillStyle = p.color;
          if (fx.glowEffects) { lctx.shadowColor = p.color; lctx.shadowBlur = 10; }
          lctx.beginPath(); lctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); lctx.fill();
        }
        lctx.globalAlpha = 1; lctx.shadowBlur = 0;
      }

      this.drawPortal(time);
      this.drawTrader(time);
      this.drawPlayer(time);

      if (fx.particles) {
        for (const p of this.particles) {
          const alpha = Math.max(0, p.life / p.maxLife);
          lctx.globalAlpha = alpha; lctx.fillStyle = p.color;
          if (fx.glowEffects) { lctx.shadowColor = p.color; lctx.shadowBlur = 10; }
          lctx.beginPath(); lctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2); lctx.fill();
        }
        lctx.globalAlpha = 1; lctx.shadowBlur = 0;
      }
    },

    drawPortal(time) {
      const x = this.portalX, y = this.portalY, s = this.scale;
      const pulse = 0.5 + 0.5 * Math.sin(time * 3);
      const rBase = 55 * s;

      if (fx.glowEffects) { lctx.shadowColor = '#7c5cff'; lctx.shadowBlur = (40 + pulse * 30) * s; }
      const ringCount = fx.portalExtras ? 3 : 1;
      for (let ring = 0; ring < ringCount; ring++) {
        const r = rBase + ring * 12 * s + Math.sin(time * 2 + ring) * 5;
        lctx.strokeStyle = `rgba(124,92,255,${0.6 - ring * 0.15 + pulse * 0.3})`;
        lctx.lineWidth = (4 - ring) * s;
        lctx.beginPath(); lctx.ellipse(x, y, r, r + 15 * s, 0, 0, Math.PI * 2); lctx.stroke();
      }
      const innerR = 70 * s;
      const innerGrd = lctx.createRadialGradient(x, y, 0, x, y, innerR);
      innerGrd.addColorStop(0, `rgba(38,217,255,${0.6 + pulse * 0.3})`);
      innerGrd.addColorStop(0.5, `rgba(124,92,255,${0.3 + pulse * 0.3})`);
      innerGrd.addColorStop(1, 'transparent');
      lctx.fillStyle = innerGrd;
      lctx.beginPath(); lctx.ellipse(x, y, rBase, rBase + 15 * s, 0, 0, Math.PI * 2); lctx.fill();

      if (fx.portalExtras) {
        lctx.save(); lctx.translate(x, y); lctx.rotate(time * 0.7);
        lctx.strokeStyle = `rgba(38,217,255,${0.5 + pulse * 0.4})`; lctx.lineWidth = 3 * s;
        lctx.beginPath(); lctx.ellipse(0, 0, 75 * s, 85 * s, 0, 0, Math.PI * 1.3); lctx.stroke();
        lctx.restore();
      }

      lctx.fillStyle = `rgba(255,255,255,${0.7 + pulse * 0.3})`;
      lctx.font = `bold ${36 * s}px Arial`; lctx.textAlign = 'center'; lctx.textBaseline = 'middle';
      lctx.fillText('▶', x, y);

      lctx.fillStyle = 'white'; lctx.font = `bold ${16 * s}px Arial`; lctx.textAlign = 'center';
      if (fx.glowEffects) { lctx.shadowColor = '#7c5cff'; lctx.shadowBlur = 15; }
      lctx.fillText('START RUN', x, y - 100 * s);
      lctx.shadowBlur = 0;
    },

    drawTrader(time) {
      const x = this.traderX;
      const y = this.traderY + this.traderBob;
      const s = this.scale;
      if (fx.glowEffects) { lctx.shadowColor = '#ffd74a'; lctx.shadowBlur = 30; }

      const baseGrd = lctx.createRadialGradient(x, y + 50 * s, 0, x, y + 50 * s, 60 * s);
      baseGrd.addColorStop(0, `rgba(255,215,74,${0.3 + Math.sin(time * 3) * 0.15})`);
      baseGrd.addColorStop(1, 'transparent');
      lctx.fillStyle = baseGrd; lctx.fillRect(x - 60 * s, y - 10 * s, 120 * s, 120 * s);

      const robeGrd = lctx.createLinearGradient(x, y - 20 * s, x, y + 80 * s);
      robeGrd.addColorStop(0, '#4a2a6a'); robeGrd.addColorStop(1, '#2a1a3a');
      lctx.fillStyle = robeGrd;
      lctx.beginPath(); lctx.moveTo(x - 35 * s, y + 10 * s); lctx.lineTo(x + 35 * s, y + 10 * s);
      lctx.lineTo(x + 45 * s, y + 90 * s); lctx.lineTo(x - 45 * s, y + 90 * s); lctx.closePath(); lctx.fill();

      lctx.fillStyle = '#2a1a4a';
      lctx.beginPath(); lctx.ellipse(x, y + 15 * s, 32 * s, 38 * s, 0, 0, Math.PI * 2); lctx.fill();

      lctx.fillStyle = '#ffd3b6';
      lctx.beginPath(); lctx.arc(x, y - 25 * s, 20 * s, 0, Math.PI * 2); lctx.fill();

      const hoodGrd = lctx.createLinearGradient(x, y - 50 * s, x, y - 10 * s);
      hoodGrd.addColorStop(0, '#6a3a9a'); hoodGrd.addColorStop(1, '#4a2a6a');
      lctx.fillStyle = hoodGrd;
      lctx.beginPath(); lctx.arc(x, y - 25 * s, 22 * s, Math.PI, 0); lctx.fill();

      lctx.fillStyle = '#ffd74a';
      if (fx.glowEffects) { lctx.shadowColor = '#ffd74a'; lctx.shadowBlur = 15; }
      lctx.beginPath();
      lctx.arc(x - 7 * s, y - 28 * s, 3 * s, 0, Math.PI * 2);
      lctx.arc(x + 7 * s, y - 28 * s, 3 * s, 0, Math.PI * 2); lctx.fill();
      lctx.shadowBlur = 0;

      if (fx.traderCoins) {
        for (let i = 0; i < 4; i++) {
          const angle = time * 1.5 + i * Math.PI / 2;
          const fx_ = x + Math.cos(angle) * 55 * s;
          const fy = y - 50 * s + Math.sin(angle) * 15 * s;
          lctx.save(); lctx.translate(fx_, fy); lctx.scale(Math.cos(time * 4 + i) || 1, 1);
          lctx.fillStyle = '#ffd74a';
          lctx.beginPath(); lctx.arc(0, 0, 8 * s, 0, Math.PI * 2); lctx.fill();
          lctx.fillStyle = '#8a6a1a'; lctx.font = `bold ${10 * s}px Arial`;
          lctx.textAlign = 'center'; lctx.textBaseline = 'middle'; lctx.fillText('$', 0, 1);
          lctx.restore();
        }
      }

      lctx.fillStyle = 'white'; lctx.font = `bold ${16 * s}px Arial`; lctx.textAlign = 'center';
      if (fx.glowEffects) { lctx.shadowColor = '#ffd74a'; lctx.shadowBlur = 15; }
      lctx.fillText('TRADER', x, y + 120 * s);
      lctx.shadowBlur = 0;
    },

    drawPlayer(time) {
      const x = this.playerX, y = this.playerY;
      const facing = this.facing;
      const walk = Math.abs(this.playerVX) > 10;
      const bob = walk ? Math.sin(this.animTime * 12) * 4 : 0;
      const s = this.scale;

      lctx.save(); lctx.translate(x, y + bob); lctx.scale(s, s);

      const charData = CHARACTERS[playerData.equippedCharacter] || CHARACTERS.default;
      const outfitData = OUTFITS[playerData.equippedOutfit] || OUTFITS.default;
      const bodyColor = outfitData.color !== '#f7f9ff' ? outfitData.color : charData.color;

      lctx.fillStyle = 'rgba(0,0,0,.5)';
      lctx.beginPath(); lctx.ellipse(0, 45 - bob / s, 30, 10, 0, 0, Math.PI * 2); lctx.fill();

      if (fx.glowEffects) {
        const glowGrd = lctx.createRadialGradient(0, 40, 0, 0, 40, 50);
        glowGrd.addColorStop(0, charData.accent + '30');
        glowGrd.addColorStop(1, 'transparent');
        lctx.fillStyle = glowGrd; lctx.fillRect(-50, -10, 100, 100);
      }

      if (fx.glowEffects) { lctx.shadowColor = charData.accent; lctx.shadowBlur = 25; }

      const legSwing = walk ? Math.sin(this.animTime * 12) * 10 : 0;
      lctx.fillStyle = shadeColor(bodyColor, -25);
      lctx.beginPath(); lctx.roundRect(-14, 35 + legSwing, 12, 25, 5); lctx.fill();
      lctx.beginPath(); lctx.roundRect(2, 35 - legSwing, 12, 25, 5); lctx.fill();

      const bodyGrd = lctx.createLinearGradient(0, -5, 0, 45);
      bodyGrd.addColorStop(0, shadeColor(bodyColor, 20));
      bodyGrd.addColorStop(0.5, bodyColor);
      bodyGrd.addColorStop(1, shadeColor(bodyColor, -25));
      lctx.fillStyle = bodyGrd;
      lctx.beginPath(); lctx.roundRect(-20, -5, 40, 50, 10); lctx.fill();

      lctx.strokeStyle = charData.accent; lctx.lineWidth = 2;
      lctx.beginPath(); lctx.roundRect(-20, -5, 40, 50, 10); lctx.stroke();

      lctx.fillStyle = '#ffd3b6';
      lctx.beginPath(); lctx.arc(0, -25, 18, 0, Math.PI * 2); lctx.fill();

      drawCharacterHead(lctx, playerData.equippedCharacter, 0, -25, 18, facing);

      if (playerData.name) {
        lctx.shadowBlur = 0;
        lctx.font = 'bold 12px Arial';
        const nameWidth = lctx.measureText(playerData.name).width + 24;
        lctx.fillStyle = 'rgba(8,10,17,.85)';
        lctx.beginPath(); lctx.roundRect(-nameWidth/2, -80, nameWidth, 24, 8); lctx.fill();
        lctx.strokeStyle = 'rgba(124,92,255,.5)'; lctx.lineWidth = 1; lctx.stroke();
        lctx.fillStyle = 'white'; lctx.textAlign = 'center'; lctx.textBaseline = 'middle';
        lctx.fillText(playerData.name, 0, -68);
      }
      lctx.restore();
    },

    handleInteraction() {
      if (this.nearTrader) { AudioEngine.click(); openStore(); return true; }
      if (this.nearPortal) { AudioEngine.click(); startRun(true); return true; }
      return false;
    }
  };

  let lobbyRafId = null, lobbyLastTime = 0;
  function lobbyLoop(timestamp) {
    const dt = Math.min((timestamp - lobbyLastTime) / 1000 || 0, 1/30);
    lobbyLastTime = timestamp;
    if (screens.lobby.classList.contains('active')) {
      lobby.update(dt);
      lobby.draw();
      if (lobby.nearTrader) { promptText.textContent = 'Talk to Trader (Store)'; interactionPrompt.classList.add('show'); }
      else if (lobby.nearPortal) { promptText.textContent = 'Start Troll Run'; interactionPrompt.classList.add('show'); }
      else interactionPrompt.classList.remove('show');
    }
    lobbyRafId = requestAnimationFrame(lobbyLoop);
  }
  function ensureLobbyLoop() {
    if (lobbyRafId === null) { lobbyLastTime = performance.now(); lobbyRafId = requestAnimationFrame(lobbyLoop); }
  }

  window.addEventListener('resize', () => {
    if (screens.lobby.classList.contains('active')) resizeLobby();
  });

  // ============================================================
  // GAME PARTICLES / EFFECTS (quality-gated)
  // ============================================================
  const particles = [];
  const MAX_PARTICLES = 300;
  const shockwaves = [];
  const floatingTexts = [];
  const coins = [];
  const lightningBolts = [];
  const screenFlashEffects = [];

  function spawnParticle(x, y, color, count = 5, options = {}) {
    if (!fx.particles) return;
    const { speed = 180, size = 3, life = 0.6, gravity = 320, spread = 1 } = options;
    const cap = settings.graphicsQuality === 'low' ? 0 : (settings.graphicsQuality === 'medium' ? Math.floor(count * 0.6) : count);
    for (let i = 0; i < cap; i++) {
      if (particles.length >= MAX_PARTICLES) particles.shift();
      const angle = (Math.PI * 2 * i) / cap + Math.random() * 0.5;
      const velocity = speed * (0.5 + Math.random() * 0.5) * spread;
      particles.push({ x, y, vx: Math.cos(angle) * velocity, vy: Math.sin(angle) * velocity, life: life * (0.7 + Math.random() * 0.3), maxLife: life, color, size: size * (0.6 + Math.random() * 0.6), gravity });
    }
  }
  function spawnShockwave(x, y, color, maxRadius = 60, life = 0.4) {
    if (!fx.shockwaves) return;
    shockwaves.push({ x, y, color, radius: 0, maxRadius, life, maxLife: life });
  }
  function spawnFloatingText(x, y, text, color) {
    if (!fx.floatingTexts) return;
    floatingTexts.push({ x, y, text, color, life: 1.2, maxLife: 1.2 });
  }
  function spawnCoin(x, y, value = 1) {
    coins.push({ x, y, vx: (Math.random() - 0.5) * 200, vy: -200 - Math.random() * 100, life: 5, maxLife: 5, value, phase: Math.random() * Math.PI * 2, size: 12 });
  }
  function spawnLightning(x1, y1, x2, y2, color = '#26d9ff') {
    if (!fx.lightning) return;
    const segments = []; const segCount = 8;
    for (let i = 0; i <= segCount; i++) {
      const t = i / segCount;
      const jitter = (1 - Math.abs(t - 0.5) * 2) * 20;
      segments.push({ x: x1 + (x2 - x1) * t + (Math.random() - 0.5) * jitter, y: y1 + (y2 - y1) * t + (Math.random() - 0.5) * jitter });
    }
    lightningBolts.push({ segments, color, life: 0.3, maxLife: 0.3 });
  }
  function screenFlash(color, duration = 0.2) {
    if (!fx.screenFlash) return;
    screenFlashEffects.push({ color, life: duration, maxLife: duration });
  }

  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.gravity * dt; p.vx *= 0.98; p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
    for (let i = shockwaves.length - 1; i >= 0; i--) {
      const s = shockwaves[i];
      s.radius += (s.maxRadius - s.radius) * dt * 12; s.life -= dt;
      if (s.life <= 0) shockwaves.splice(i, 1);
    }
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const f = floatingTexts[i]; f.y -= 45 * dt; f.life -= dt;
      if (f.life <= 0) floatingTexts.splice(i, 1);
    }
    for (let i = lightningBolts.length - 1; i >= 0; i--) { lightningBolts[i].life -= dt; if (lightningBolts[i].life <= 0) lightningBolts.splice(i, 1); }
    for (let i = screenFlashEffects.length - 1; i >= 0; i--) { screenFlashEffects[i].life -= dt; if (screenFlashEffects[i].life <= 0) screenFlashEffects.splice(i, 1); }
    for (let i = coins.length - 1; i >= 0; i--) {
      const c = coins[i];
      if (playerData.equippedSkills.includes('magnet') && level) {
        const dx = (player.x + player.w/2) - c.x, dy = (player.y + player.h/2) - c.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 200) { c.vx += (dx / dist) * 900 * dt; c.vy += (dy / dist) * 900 * dt; }
      }
      c.x += c.vx * dt; c.y += c.vy * dt; c.vy += 600 * dt; c.vx *= 0.98; c.life -= dt;
      if (level) {
        const dx = (player.x + player.w/2) - c.x, dy = (player.y + player.h/2) - c.y;
        if (Math.sqrt(dx*dx + dy*dy) < 40) {
          playerData.coins += c.value; playerData.save(); updateCurrencyDisplay();
          AudioEngine.coin();
          spawnFloatingText(c.x, c.y, `+${c.value}🪙`, '#ffd74a');
          spawnParticle(c.x, c.y, '#ffd74a', 8, { speed: 180, size: 3 });
          spawnShockwave(c.x, c.y, '#ffd74a', 30, 0.3);
          coins.splice(i, 1); continue;
        }
      }
      if (c.life <= 0) coins.splice(i, 1);
    }
  }

  function drawParticles() {
    if (!fx.particles && !fx.shockwaves && !fx.floatingTexts && !fx.lightning && !fx.screenFlash) {
      // Still draw coins since they're gameplay-relevant
      drawCoins();
      return;
    }
    for (const s of shockwaves) {
      const alpha = Math.max(0, s.life / s.maxLife);
      ctx.strokeStyle = s.color; ctx.globalAlpha = alpha * 0.7; ctx.lineWidth = 4 * alpha;
      if (fx.glowEffects) { ctx.shadowColor = s.color; ctx.shadowBlur = 15; }
      ctx.beginPath(); ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    for (const p of particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha; ctx.fillStyle = p.color;
      if (fx.glowEffects) { ctx.shadowColor = p.color; ctx.shadowBlur = 12; }
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2); ctx.fill();
    }
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    for (const f of floatingTexts) {
      const alpha = Math.max(0, f.life / f.maxLife);
      ctx.globalAlpha = alpha; ctx.font = "900 18px Arial"; ctx.textAlign = "center";
      if (fx.glowEffects) { ctx.shadowColor = f.color; ctx.shadowBlur = 15; }
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.textAlign = "left"; ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    for (const bolt of lightningBolts) {
      const alpha = bolt.life / bolt.maxLife;
      ctx.globalAlpha = alpha; ctx.strokeStyle = bolt.color; ctx.lineWidth = 3;
      ctx.shadowColor = bolt.color; ctx.shadowBlur = 20;
      ctx.beginPath(); ctx.moveTo(bolt.segments[0].x, bolt.segments[0].y);
      for (let i = 1; i < bolt.segments.length; i++) ctx.lineTo(bolt.segments[i].x, bolt.segments[i].y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    drawCoins();
    for (const f of screenFlashEffects) {
      const alpha = (f.life / f.maxLife) * 0.5;
      ctx.globalAlpha = alpha; ctx.fillStyle = f.color;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.globalAlpha = 1;
  }

  function drawCoins() {
    const time = performance.now() / 1000;
    for (const c of coins) {
      const spin = fx.coinSpin ? time * 4 + c.phase : 0;
      ctx.save(); ctx.translate(c.x, c.y); ctx.scale(Math.cos(spin) || 1, 1);
      ctx.fillStyle = '#ffd74a';
      if (fx.glowEffects) { ctx.shadowColor = '#ffd74a'; ctx.shadowBlur = 20; }
      ctx.beginPath(); ctx.arc(0, 0, c.size, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#8a6a1a'; ctx.font = `bold ${c.size}px Arial`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('$', 0, 1);
      ctx.restore();
    }
    ctx.shadowBlur = 0;
  }

  let shakeAmount = 0, shakeDecay = 0.88;
  function triggerShake(amount = 6) { if (fx.shake) shakeAmount = Math.max(shakeAmount, amount); }
  let aberrationAmount = 0;
  function triggerAberration(amount = 5) { if (fx.aberration) aberrationAmount = Math.max(aberrationAmount, amount); }
  const playerTrail = [];

  // ============================================================
  // LEVEL GENERATION (unchanged)
  // ============================================================
  function seededRandom(seed) {
    let state = (seed >>> 0) || 1;
    return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
  }
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const randInt = (rnd, min, max) => Math.floor(rnd() * (max - min + 1)) + min;
  const chance = (rnd, p) => rnd() < p;
  const pick = (rnd, arr) => arr[Math.floor(rnd() * arr.length)];
  function shuffle(rnd, arr) {
    const out = [...arr];
    for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
    return out;
  }
  const P = (x, y, w, h = 22) => ({ x, y, w, h });
  const S = (x, y, w = 42, h = 20) => ({ x, y, w, h });
  const M = (x, y, w, h, axis, distance, speed) => ({ x, y, w, h, axis, distance, speed, startX: x, startY: y, t: 0, prevX: x, prevY: y });
  function trollPlatform(x, y, w, h = 22, extra = {}) { return { ...P(Math.round(x), Math.round(y), Math.round(w), h), active: true, ...extra }; }

  function buildProceduralRoute(rnd) {
    const platforms = [], route = [];
    const style = randInt(rnd, 0, 9);
    const middleCount = randInt(rnd, 5, 8);
    const startW = randInt(rnd, 150, 205);
    const start = trollPlatform(0, 500, startW, 40, { route: true, safe: true });
    platforms.push(start); route.push(start);
    let previousY = 500;
    for (let i = 0; i < middleCount; i++) {
      const t = (i + 1) / (middleCount + 1);
      const x = 125 + t * 650 + randInt(rnd, -18, 18);
      let targetY;
      if (style === 0) targetY = previousY + randInt(rnd, -78, 65);
      else if (style === 1) targetY = 445 - t * 205 + randInt(rnd, -18, 18);
      else if (style === 2) targetY = (i % 2 === 0 ? 405 : 325) + randInt(rnd, -22, 22);
      else if (style === 3) targetY = 355 + Math.sin((i + 1) * 1.35) * 78 + randInt(rnd, -14, 14);
      else if (style === 4) targetY = 455 - Math.sin(t * Math.PI) * 205 + randInt(rnd, -15, 15);
      else if (style === 5) targetY = 435 - Math.abs(Math.sin(t * Math.PI * 2)) * 150 + randInt(rnd, -18, 18);
      else if (style === 6) { const step = (i < Math.ceil(middleCount / 2) ? -58 : 48); targetY = previousY + step + randInt(rnd, -12, 12); }
      else if (style === 7) targetY = 400 + Math.cos(t * Math.PI * 3) * 90 + randInt(rnd, -15, 15);
      else if (style === 8) targetY = 350 + Math.sin(t * Math.PI * 4) * 70 + randInt(rnd, -10, 10);
      else targetY = pick(rnd, [245, 285, 325, 365, 405, 435]) + randInt(rnd, -15, 15);
      targetY = clamp(targetY, 220, 440);
      targetY = clamp(targetY, previousY - 82, previousY + 82);
      const w = randInt(rnd, 82, 128);
      const p = trollPlatform(x, targetY, w, 22, { route: true });
      platforms.push(p); route.push(p); previousY = targetY;
    }
    const endY = clamp(previousY + randInt(rnd, -55, 55), 300, 500);
    const reachableEndY = clamp(endY, previousY - 82, previousY + 82);
    const end = trollPlatform(randInt(rnd, 790, 815), reachableEndY, randInt(rnd, 135, 170), reachableEndY >= 485 ? 40 : 22, { route: true, safe: true });
    platforms.push(end); route.push(end);
    return { platforms, route, style };
  }

  function addSecretKeyBranch(level, rnd) {
    const route = level._route;
    const anchorIndex = randInt(rnd, 2, Math.max(2, route.length - 3));
    const anchor = route[anchorIndex];
    const branchY = clamp(anchor.y - randInt(rnd, 65, 95), 175, 405);
    const branchX = clamp(anchor.x + randInt(rnd, -55, 55), 145, 760);
    const branch = trollPlatform(branchX, branchY, randInt(rnd, 90, 125), 20, { hidden: true, revealed: false, secret: true });
    level.platforms.push(branch);
    level.key = [branch.x + Math.floor(branch.w / 2) - 15, branch.y - 34];
  }
  function addHiddenPlatforms(level, rnd) {
    const candidates = level._route.slice(1, -1).filter(p => level.platforms.includes(p) && !p.safe && !p.ghost);
    const count = Math.min(candidates.length, randInt(rnd, 1, 2));
    shuffle(rnd, candidates).slice(0, count).forEach(p => { p.hidden = true; p.revealed = false; });
  }
  function addCrumble(level, rnd, tier) {
    const candidates = level._route.slice(1, -1).filter(p => level.platforms.includes(p) && !p.safe && !p.ghost);
    if (!candidates.length) return;
    const p = pick(rnd, candidates);
    p.crumble = true; p.crumbleDelay = Math.max(260, 640 - tier * 12 - randInt(rnd, 0, 120));
  }
  function addFakeFloor(level, rnd) {
    const candidates = level._route.slice(1, -1).filter(p => level.platforms.includes(p) && !p.safe && !p.ghost);
    if (!candidates.length) return;
    const p = pick(rnd, candidates);
    p.ghost = true;
    const rescueY = clamp(p.y + randInt(rnd, 55, 82), 270, 462);
    const rescue = trollPlatform(clamp(p.x + randInt(rnd, -25, 25), 80, 820), rescueY, randInt(rnd, 95, 135), 20, { hidden: true, revealed: false, secret: true, rescue: true });
    level.platforms.push(rescue);
  }
  function addSurpriseSpikes(level, rnd) {
    const candidates = level._route.slice(2, -1).filter(p => level.platforms.includes(p) && !p.ghost && p.w >= 88);
    if (!candidates.length) return;
    const p = pick(rnd, candidates);
    const hazard = { ...S(p.x + Math.max(8, Math.floor(p.w * 0.28)), p.y - 20, Math.min(58, Math.floor(p.w * 0.48))), active: false };
    const hazardIndex = level.hazards.push(hazard) - 1;
    level.trolls.push({ type: "surprise-spikes", triggerX: Math.max(90, p.x - randInt(rnd, 95, 145)), hazardIndexes: [hazardIndex], fired: false });
  }
  function addCutAhead(level, rnd, tier) {
    const candidates = level._route.slice(2, -1).filter(p => level.platforms.includes(p) && !p.safe && !p.ghost);
    if (!candidates.length) return;
    const p = pick(rnd, candidates);
    p.crumble = true; p.crumbleDelay = Math.max(260, 560 - tier * 10);
    level.platforms.push(trollPlatform(clamp(p.x + randInt(rnd, -40, 35), 90, 810), clamp(p.y + randInt(rnd, 60, 88), 290, 465), randInt(rnd, 95, 135), 20, { hidden: true, revealed: false, secret: true }));
    level.trolls.push({ type: "cut-platform", triggerX: Math.max(110, p.x - randInt(rnd, 115, 175)), platformIndex: level.platforms.indexOf(p), fired: false });
  }
  function addMovingRoute(level, rnd, tier) {
    const candidates = level._route.slice(1, -1).filter(p => level.platforms.includes(p) && !p.safe && !p.ghost && !p.hidden);
    if (!candidates.length) return;
    const p = pick(rnd, candidates);
    const idx = level.platforms.indexOf(p);
    if (idx < 0) return;
    level.platforms.splice(idx, 1);
    const axis = chance(rnd, 0.55) ? "x" : "y";
    const distance = axis === "x" ? randInt(rnd, 35, 75) : randInt(rnd, 30, 62);
    const speed = 1.15 + rnd() * 0.85 + Math.min(0.65, tier * 0.02);
    level.moving.push(M(p.x, p.y, p.w, 18, axis, distance, speed));
  }
  function addFakeDoor(level, rnd) {
    const candidates = level._route.slice(2, -1).filter(p => level.platforms.includes(p) && !p.ghost);
    if (!candidates.length) return;
    const p = pick(rnd, candidates);
    level.fakeDoor = { x: p.x + Math.max(5, p.w - 52), y: p.y - 52, w: 46, h: 52, active: true };
    level.doorVisible = false;
  }
  function addRunawayDoor(level, rnd) {
    const candidates = level._route.slice(1, -2).filter(p => level.platforms.includes(p) && !p.ghost);
    if (!candidates.length) return;
    const target = pick(rnd, candidates);
    level.trolls.push({ type: "runaway-door", triggerDistance: randInt(rnd, 105, 155), newDoor: [target.x + Math.max(4, target.w - 52), target.y - 52], fired: false });
  }
  function addFloorHazards(level, rnd) {
    const route = level._route;
    const amount = randInt(rnd, 1, 4);
    for (let i = 0; i < amount; i++) {
      const a = pick(rnd, route.slice(0, -1));
      const x = clamp(a.x + a.w + randInt(rnd, 10, 55), 160, 820);
      level.hazards.push(S(x, 480, randInt(rnd, 28, 58)));
    }
  }
  function addCoinTrail(level, rnd) {
    const route = level._route;
    const amount = randInt(rnd, 4, 8);
    for (let i = 0; i < amount; i++) {
      const p = pick(rnd, route.slice(1, -1));
      level.coinSpawns.push([p.x + p.w / 2 + randInt(rnd, -30, 30), p.y - 30]);
    }
  }
  function generateEndlessLevel(num) {
    const seed = (Math.imul((num + 0x9e3779b9) >>> 0, 2246822519) ^ Math.imul((num * 13 + 0x85ebca6b) >>> 0, 3266489917)) >>> 0;
    const rnd = seededRandom(seed);
    const tier = Math.max(0, Math.floor((num - 31) / 8));
    const built = buildProceduralRoute(rnd);
    const end = built.route[built.route.length - 1];
    const names = ["TRUST NOTHING", "WRONG WAY?", "KEEP MOVING", "NOT SO EASY", "WHERE NOW?", "NOPE", "SECRET ROOM", "BAD IDEA", "ONE MORE STEP", "DON'T BLINK", "GOOD LUCK", "THE ROOM LIES", "DARKNESS", "ABYSS", "NIGHTMARE", "CHAOS", "MADNESS", "VOID"];
    const level = {
      name: `${pick(rnd, names)} • ${num}`,
      start: [55, 456],
      door: [end.x + Math.max(5, end.w - 52), end.y - 52],
      platforms: built.platforms, moving: [], hazards: [], key: null,
      endless: true, doorVisible: true, revealAll: false, trollMessageShown: false,
      trolls: [], coinSpawns: [], _route: built.route
    };
    if (chance(rnd, 0.5)) addSecretKeyBranch(level, rnd);
    if (chance(rnd, 0.7)) addFloorHazards(level, rnd);
    addCoinTrail(level, rnd);
    const mechanics = shuffle(rnd, ["hidden", "crumble", "fake-floor", "surprise-spikes", "cut-ahead", "moving", "fake-door", "runaway-door"]);
    const mechanicCount = clamp(2 + Math.floor(tier / 2) + randInt(rnd, 0, 2), 2, 6);
    let usedDoorTrick = false;
    for (const mechanic of mechanics) {
      if (level._usedMechanics?.length >= mechanicCount) break;
      if (!level._usedMechanics) level._usedMechanics = [];
      if ((mechanic === "fake-door" || mechanic === "runaway-door") && usedDoorTrick) continue;
      if (mechanic === "hidden") addHiddenPlatforms(level, rnd);
      if (mechanic === "crumble") addCrumble(level, rnd, tier);
      if (mechanic === "fake-floor") addFakeFloor(level, rnd);
      if (mechanic === "surprise-spikes") addSurpriseSpikes(level, rnd);
      if (mechanic === "cut-ahead") addCutAhead(level, rnd, tier);
      if (mechanic === "moving") addMovingRoute(level, rnd, tier);
      if (mechanic === "fake-door") { addFakeDoor(level, rnd); usedDoorTrick = true; }
      if (mechanic === "runaway-door") { addRunawayDoor(level, rnd); usedDoorTrick = true; }
      level._usedMechanics.push(mechanic);
    }
    delete level._route; delete level._usedMechanics;
    return level;
  }

  // ============================================================
  // GAME LOGIC
  // ============================================================
  const player = {
    x: 70, y: 420, w: 34, h: 44,
    vx: 0, vy: 0, speed: 270, jumpPower: 590,
    grounded: false, color: "#f7f9ff",
    jumpsLeft: 2, hasShield: false,
    dashCooldown: 0, isDashing: false, dashTimer: 0, invulnerable: 0
  };

  function cloneLevel(src) {
    return {
      ...src,
      platforms: (src.platforms || []).map(o => ({...o})),
      hazards: (src.hazards || []).map(o => ({...o})),
      moving: (src.moving || []).map(o => ({...o})),
      key: src.key ? [...src.key] : null,
      door: [...src.door], start: [...src.start],
      fakeDoor: src.fakeDoor ? {...src.fakeDoor} : null,
      trolls: src.trolls ? JSON.parse(JSON.stringify(src.trolls)) : [],
      coinSpawns: src.coinSpawns ? [...src.coinSpawns] : [],
      hasKey: false
    };
  }

  function loadLevel(num, skipCountdown = false) {
    const parsed = Number(num);
    currentLevel = Number.isFinite(parsed) ? Math.max(31, Math.floor(parsed)) : 31;
    playerData.currentLevel = currentLevel;
    if (currentLevel > playerData.highestLevel) playerData.highestLevel = currentLevel;
    playerData.save();
    level = cloneLevel(generateEndlessLevel(currentLevel));
    player.x = level.start[0]; player.y = level.start[1];
    player.vx = 0; player.vy = 0; player.grounded = false;
    player.jumpsLeft = playerData.equippedSkills.includes('doubleJump') ? 2 : 1;
    player.hasShield = playerData.equippedSkills.includes('shield');
    player.dashCooldown = 0; player.isDashing = false; player.dashTimer = 0; player.invulnerable = 0;
    reviveUsed = false;
    completed = false; paused = false;
    levelNumber.textContent = String(currentLevel).padStart(2, "0");
    pauseOverlay.classList.add("hidden"); completeOverlay.classList.add("hidden");
    particles.length = 0; shockwaves.length = 0; floatingTexts.length = 0;
    playerTrail.length = 0; coins.length = 0; lightningBolts.length = 0; screenFlashEffects.length = 0;
    for (const [cx, cy] of level.coinSpawns) spawnCoin(cx, cy, 1 + Math.floor(Math.random() * 3));
    updateSkillHUD();
    if (skipCountdown) {
      gameRunning = true;
      countdownOverlay.classList.add("hidden");
      countdownActive = false;
      ensureGameLoop();
    } else startCountdown();
  }

  function startCountdown() {
    countdownActive = true; gameRunning = false;
    countdownOverlay.classList.remove("hidden");
    let count = 3;
    countdownNumber.textContent = count;
    countdownNumber.style.animation = 'none'; void countdownNumber.offsetWidth;
    countdownNumber.style.animation = 'countdownPop 1s ease-out';
    AudioEngine.countdown();
    const interval = setInterval(() => {
      count--;
      if (count > 0) {
        countdownNumber.textContent = count;
        countdownNumber.style.animation = 'none'; void countdownNumber.offsetWidth;
        countdownNumber.style.animation = 'countdownPop 1s ease-out';
        AudioEngine.countdown();
      } else if (count === 0) {
        countdownNumber.textContent = 'GO!';
        countdownNumber.style.animation = 'none'; void countdownNumber.offsetWidth;
        countdownNumber.style.animation = 'countdownPop 1s ease-out';
        AudioEngine.countdownGo();
        screenFlash('#7c5cff', 0.3);
      } else {
        clearInterval(interval);
        countdownOverlay.classList.add("hidden");
        countdownActive = false; gameRunning = true;
        ensureGameLoop();
      }
    }, 1000);
  }

  function restartLevel() { if (!level) return; loadLevel(currentLevel, true); }
  function showMessage(text, duration = 1600) {
    messageBox.textContent = text;
    messageBox.classList.remove("hidden");
    clearTimeout(messageTimer);
    messageTimer = setTimeout(() => messageBox.classList.add("hidden"), duration);
  }
  function rectsOverlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
  function triggerDamageFlash() { damageFlash.classList.add('active'); setTimeout(() => damageFlash.classList.remove('active'), 150); }

  function resetPlayer(show = true) {
    if (player.hasShield && player.invulnerable <= 0) {
      player.hasShield = false; player.invulnerable = 1.5;
      showMessage("SHIELD BROKEN! 🛡️", 1200);
      AudioEngine.trap();
      spawnParticle(player.x + player.w / 2, player.y + player.h / 2, "#26d9ff", 35, { speed: 400, size: 5 });
      spawnShockwave(player.x + player.w / 2, player.y + player.h / 2, "#26d9ff", 150, 0.8);
      spawnLightning(player.x, player.y, player.x + player.w, player.y + player.h, '#26d9ff');
      triggerShake(12); screenFlash('#26d9ff', 0.2);
      return;
    }
    if (playerData.equippedSkills.includes('revive') && !reviveUsed) {
      reviveUsed = true; player.invulnerable = 2;
      showMessage("REVIVED! 💖", 1400);
      AudioEngine.complete();
      spawnParticle(player.x + player.w / 2, player.y + player.h / 2, "#ff6bcb", 40, { speed: 400, size: 5 });
      spawnShockwave(player.x + player.w / 2, player.y + player.h / 2, "#ff6bcb", 150, 0.9);
      screenFlash('#ff6bcb', 0.3); triggerShake(10);
      return;
    }
    playerData.totalDeaths++; playerData.save();
    spawnParticle(player.x + player.w / 2, player.y + player.h / 2, "#ff4f6d", 30, { speed: 380, size: 5 });
    spawnParticle(player.x + player.w / 2, player.y + player.h / 2, "#ffd74a", 15, { speed: 280, size: 4 });
    spawnShockwave(player.x + player.w / 2, player.y + player.h / 2, "#ff4f6d", 120, 0.7);
    spawnShockwave(player.x + player.w / 2, player.y + player.h / 2, "#ffd74a", 80, 0.5);
    triggerShake(18); triggerAberration(12); AudioEngine.hit();
    screenFlash('#ff4f6d', 0.25); triggerDamageFlash();
    player.x = level.start[0]; player.y = level.start[1];
    player.vx = 0; player.vy = 0;
    player.jumpsLeft = playerData.equippedSkills.includes('doubleJump') ? 2 : 1;
    player.invulnerable = 1;
    if (show) showMessage("Try again 😈", 1200);
  }

  function updateSkillHUD() {
    skillHud.innerHTML = '';
    for (const skill of playerData.equippedSkills) {
      const sd = SKILLS[skill];
      if (!sd) continue;
      const slot = document.createElement('div');
      slot.className = 'skill-slot';
      slot.textContent = sd.emoji;
      slot.title = sd.name;
      skillHud.appendChild(slot);
    }
  }

  function updateTrolls() {
    if (!level) return;
    const now = performance.now();
    for (const p of level.platforms || []) {
      if (p.hidden && !p.revealed) {
        const nearX = player.x + player.w > p.x - 90 && player.x < p.x + p.w + 90;
        const nearY = player.y + player.h > p.y - 125 && player.y < p.y + p.h + 105;
        if (nearX && nearY) {
          p.revealed = true;
          spawnParticle(p.x + p.w / 2, p.y + p.h / 2, "#26d9ff", 12, { speed: 180, size: 3 });
          spawnShockwave(p.x + p.w / 2, p.y + p.h / 2, "#26d9ff", 40, 0.4);
        }
      }
      if (p.crumbleStartedAt && p.active !== false) {
        const delay = p.crumbleDelay || 500;
        if (now - p.crumbleStartedAt >= delay) {
          p.active = false;
          spawnParticle(p.x + p.w / 2, p.y + p.h / 2, "#7c5cff", 15, { speed: 220, size: 4 });
          spawnShockwave(p.x + p.w / 2, p.y + p.h / 2, "#7c5cff", 50, 0.4);
        }
      }
    }
    for (const troll of level.trolls || []) {
      if (troll.fired) continue;
      if (troll.type === "cut-platform" && player.x > troll.triggerX) {
        const p = level.platforms[troll.platformIndex];
        if (p && p.active !== false && !p.crumbleStartedAt) p.crumbleStartedAt = now;
        troll.fired = true;
        showMessage("THE ROAD JUST BROKE 😈", 1400);
        triggerShake(12); triggerAberration(8); AudioEngine.trap();
        continue;
      }
      if (troll.type === "surprise-spikes" && player.x > troll.triggerX) {
        for (const index of troll.hazardIndexes || []) {
          if (level.hazards[index]) {
            level.hazards[index].active = true;
            spawnParticle(level.hazards[index].x + level.hazards[index].w / 2, level.hazards[index].y, "#ff4f6d", 15, { speed: 250, size: 4 });
            spawnLightning(level.hazards[index].x, level.hazards[index].y + 20, level.hazards[index].x + level.hazards[index].w, level.hazards[index].y, '#ff4f6d');
          }
        }
        troll.fired = true;
        showMessage("SURPRISE! 😈", 1050);
        triggerShake(14); triggerAberration(10); AudioEngine.trap();
        continue;
      }
      if (troll.type === "runaway-door" && level.doorVisible !== false) {
        const doorCenterX = level.door[0] + 23;
        const playerCenterX = player.x + player.w / 2;
        if (Math.abs(doorCenterX - playerCenterX) < troll.triggerDistance) {
          level.door = [...troll.newDoor];
          level.revealAll = true;
          troll.fired = true;
          showMessage("NOPE. THE EXIT MOVED 😂", 1550);
          triggerShake(15); triggerAberration(10); AudioEngine.trap();
          spawnParticle(doorCenterX, level.door[1] + 26, "#48e29b", 25, { speed: 300, size: 5 });
          spawnShockwave(doorCenterX, level.door[1] + 26, "#48e29b", 80, 0.6);
        }
      }
    }
  }

  function updateMovingPlatforms(dt) {
    const slowFactor = playerData.equippedSkills.includes('slowTime') ? 0.5 : 1;
    for (const m of level.moving || []) {
      m.prevX = m.x; m.prevY = m.y;
      m.t += dt * m.speed * slowFactor;
      const offset = Math.sin(m.t) * m.distance;
      if (m.axis === "x") m.x = m.startX + offset;
      else m.y = m.startY + offset;
    }
  }

  function resolvePlatforms(dt) {
    player.grounded = false;
    // Avoid per-frame array spread — iterate two lists
    const lists = [level.platforms, level.moving || []];
    for (let li = 0; li < lists.length; li++) {
      const list = lists[li];
      for (let i = 0; i < list.length; i++) {
        const p = list[i];
        if (p.active === false) continue;
        if (p.ghost) {
          const passingThrough = player.x + player.w > p.x && player.x < p.x + p.w && player.y + player.h >= p.y - 4 && player.y < p.y + p.h + 22;
          if (passingThrough && !p.ghostTriggered) {
            p.ghostTriggered = true;
            showMessage("FAKE FLOOR 😭", 1000);
            triggerShake(11); AudioEngine.trap();
            spawnParticle(p.x + p.w / 2, p.y + p.h / 2, "#ff4f6d", 15, { speed: 250, size: 4 });
            spawnLightning(p.x, p.y, p.x + p.w, p.y + p.h, '#ff4f6d');
          }
          continue;
        }
        const prevBottom = player.y + player.h - player.vy * dt;
        const currBottom = player.y + player.h;
        const withinX = player.x + player.w > p.x + 3 && player.x < p.x + p.w - 3;
        if (player.vy >= 0 && withinX && prevBottom <= p.y + 8 && currBottom >= p.y && player.y < p.y) {
          player.y = p.y - player.h;
          player.vy = 0;
          if (!player.grounded) {
            player.grounded = true;
            player.jumpsLeft = playerData.equippedSkills.includes('doubleJump') ? 2 : 1;
            AudioEngine.land();
            spawnParticle(player.x + player.w / 2, player.y + player.h, "#7c5cff", 6, { speed: 140, size: 3 });
          }
          player.grounded = true;
          if (p.hidden) { p.revealed = true; spawnParticle(p.x + p.w / 2, p.y + p.h / 2, "#26d9ff", 12, { speed: 180, size: 3 }); }
          if (p.crumble && !p.crumbleStartedAt) {
            p.crumbleStartedAt = performance.now();
            if (!level.trollMessageShown) { level.trollMessageShown = true; showMessage("MOVE! 😈", 900); triggerShake(6); }
          }
          if (p.startX !== undefined) player.x += p.x - p.prevX;
        }
      }
    }
  }

  function useSkill(skillName) {
    if (!gameRunning || completed || paused) return;
    if (skillName === 'dash' && player.dashCooldown <= 0) {
      player.isDashing = true; player.dashTimer = 0.15; player.dashCooldown = 2;
      AudioEngine.jump();
      spawnParticle(player.x + player.w / 2, player.y + player.h / 2, "#26d9ff", 20, { speed: 350, size: 4 });
      spawnShockwave(player.x + player.w / 2, player.y + player.h / 2, "#26d9ff", 60, 0.4);
    }
  }

  function update(dt) {
    if (!level || paused || completed || !gameRunning) return;
    updateMovingPlatforms(dt);
    updateTrolls();
    updateParticles(dt);
    if (aberrationAmount > 0.1) aberrationAmount *= 0.9; else aberrationAmount = 0;
    if (player.invulnerable > 0) player.invulnerable -= dt;
    if (player.dashCooldown > 0) player.dashCooldown -= dt;
    if (player.isDashing) {
      player.dashTimer -= dt;
      player.vx = (input.left ? -1 : input.right ? 1 : 1) * 900;
      if (player.dashTimer <= 0) player.isDashing = false;
    } else {
      const speedMult = playerData.equippedSkills.includes('speedBoost') ? 1.25 : 1;
      const accel = player.speed * speedMult;
      player.vx = 0;
      if (input.left) player.vx -= accel;
      if (input.right) player.vx += accel;
    }
    const jumpMult = playerData.equippedSkills.includes('highJump') ? 1.2 : 1;
    if (input.jumpPressed && player.jumpsLeft > 0) {
      player.vy = -player.jumpPower * jumpMult;
      player.jumpsLeft--; player.grounded = false;
      AudioEngine.jump();
      spawnParticle(player.x + player.w / 2, player.y + player.h, "#7c5cff", 12, { speed: 200, size: 4 });
      spawnShockwave(player.x + player.w / 2, player.y + player.h, "#7c5cff", 40, 0.3);
    }
    input.jumpPressed = false;
    player.vy += 1450 * dt;
    player.vy = Math.min(player.vy, 900);
    player.x += player.vx * dt;
    player.x = Math.max(0, Math.min(W - player.w, player.x));
    player.y += player.vy * dt;
    resolvePlatforms(dt);
    if (fx.trails) {
      playerTrail.push({ x: player.x + player.w / 2, y: player.y + player.h / 2, life: 0.4 });
      if (playerTrail.length > 15) playerTrail.shift();
      for (let i = playerTrail.length - 1; i >= 0; i--) { playerTrail[i].life -= dt; if (playerTrail[i].life <= 0) playerTrail.splice(i, 1); }
    }
    if (player.y > H + 100) { resetPlayer(); return; }
    for (const hazard of level.hazards) {
      if (hazard.active === false) continue;
      if (rectsOverlap(player, hazard)) { resetPlayer(); return; }
    }
    if (level.fakeDoor && level.fakeDoor.active !== false && rectsOverlap(player, level.fakeDoor)) {
      level.fakeDoor.active = false;
      level.doorVisible = true; level.revealAll = true;
      showMessage("FAKE EXIT 😈 Find the real one!", 1700);
      triggerShake(12); triggerAberration(8); AudioEngine.trap();
      spawnParticle(player.x + player.w / 2, player.y, "#ff4f6d", 25, { speed: 300, size: 5 });
      spawnLightning(player.x, player.y, level.fakeDoor.x, level.fakeDoor.y, '#ff4f6d');
      player.x -= Math.sign(player.vx || 1) * 14;
      return;
    }
    if (level.key && !level.hasKey) {
      const keyRect = { x: level.key[0], y: level.key[1], w: 30, h: 30 };
      if (rectsOverlap(player, keyRect)) {
        level.hasKey = true;
        showMessage("Key collected! 🔑");
        AudioEngine.coin();
        spawnParticle(level.key[0] + 15, level.key[1] + 15, "#ffd74a", 30, { speed: 300, size: 5 });
        spawnShockwave(level.key[0] + 15, level.key[1] + 15, "#ffd74a", 100, 0.7);
        triggerShake(8); triggerAberration(6);
        spawnFloatingText(level.key[0] + 15, level.key[1], "+KEY", "#ffd74a");
      }
    }
    if (level.doorVisible !== false) {
      const door = { x: level.door[0], y: level.door[1], w: 46, h: 52 };
      if (rectsOverlap(player, door)) {
        if (level.key && !level.hasKey) {
          showMessage("The door is locked. Find the key!");
          player.x -= Math.sign(player.vx || 1) * 8;
        } else finishLevel();
      }
    }
  }

  function finishLevel() {
    if (completed) return;
    completed = true; gameRunning = false;
    const baseCoins = 50 + Math.floor(currentLevel * 3);
    const baseSkills = currentLevel >= 33 ? 1 : 0;
    const bonusCoins = Math.floor(Math.random() * 50);
    playerData.coins += baseCoins + bonusCoins;
    playerData.skillPoints += baseSkills;
    playerData.currentLevel = currentLevel + 1;
    if (currentLevel + 1 > playerData.highestLevel) playerData.highestLevel = currentLevel + 1;
    playerData.save();
    updateCurrencyDisplay();
    rewardCoins.textContent = (baseCoins + bonusCoins);
    rewardSkills.textContent = baseSkills;
    const cx = player.x + player.w / 2, cy = player.y + player.h / 2;
    const colors = ["#48e29b", "#7c5cff", "#26d9ff", "#ffd74a", "#ff4f6d"];
    AudioEngine.complete();
    if (settings.graphicsQuality === 'high') {
      for (let i = 0; i < 80; i++) {
        setTimeout(() => {
          const color = colors[Math.floor(Math.random() * colors.length)];
          spawnParticle(cx + (Math.random() - 0.5) * 150, cy + (Math.random() - 0.5) * 150, color, 4, { speed: 400, size: 5 });
        }, i * 15);
      }
    } else if (settings.graphicsQuality === 'medium') {
      for (let i = 0; i < 30; i++) {
        setTimeout(() => {
          const color = colors[Math.floor(Math.random() * colors.length)];
          spawnParticle(cx + (Math.random() - 0.5) * 100, cy + (Math.random() - 0.5) * 100, color, 2, { speed: 300, size: 4 });
        }, i * 25);
      }
    }
    spawnShockwave(cx, cy, "#48e29b", 180, 1.0);
    spawnShockwave(cx, cy, "#7c5cff", 250, 1.2);
    triggerShake(20); triggerAberration(14);
    screenFlash('#48e29b', 0.4);
    for (let i = 0; i < 8; i++) spawnCoin(cx + (Math.random() - 0.5) * 120, cy, 3);
    completeTitle.textContent = `TROLL ${currentLevel} SURVIVED ✓`;
    completeText.textContent = `${level.name}`;
    nextBtn.textContent = "NEXT TROLL →";
    completeOverlay.classList.remove("hidden");
  }

  // ============================================================
  // GAME RENDER (quality-gated)
  // ============================================================
  const bgStars = [];
  const bgStarCount = fx.stars ? 60 : 0;
  for (let i = 0; i < bgStarCount; i++) bgStars.push({ x: Math.random() * W, y: Math.random() * H, size: 0.5 + Math.random() * 2, speed: 0.2 + Math.random() * 1.2, phase: Math.random() * Math.PI * 2, color: ['#ffffff', '#7c5cff', '#26d9ff', '#ffd74a'][Math.floor(Math.random() * 4)] });
  const bgNebulas = [
    { x: 200, y: 150, r: 300, color: "rgba(124,92,255,.08)" },
    { x: 750, y: 400, r: 350, color: "rgba(38,217,255,.06)" },
    { x: 500, y: 250, r: 250, color: "rgba(255,79,109,.05)" }
  ];

  function drawBackground() {
    const time = performance.now() / 1000;
    const grd = ctx.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, "#0d1220"); grd.addColorStop(0.5, "#0a0e1a"); grd.addColorStop(1, "#05070c");
    ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
    if (fx.nebulas) {
      for (const n of bgNebulas) {
        const nebulaGrd = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
        nebulaGrd.addColorStop(0, n.color); nebulaGrd.addColorStop(1, "transparent");
        ctx.fillStyle = nebulaGrd; ctx.fillRect(n.x - n.r, n.y - n.r, n.r * 2, n.r * 2);
      }
    }
    if (fx.stars) {
      for (const star of bgStars) {
        const twinkle = 0.4 + 0.6 * Math.abs(Math.sin(star.phase + time * 2));
        ctx.fillStyle = star.color; ctx.globalAlpha = twinkle * 0.4;
        ctx.beginPath(); ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2); ctx.fill();
        if (fx.animatedBg) {
          star.y += star.speed * 0.02;
          if (star.y > H) { star.y = 0; star.x = Math.random() * W; }
        }
      }
      ctx.globalAlpha = 1;
    }
    if (settings.showGrid && settings.graphicsQuality !== 'low') {
      ctx.strokeStyle = "rgba(255,255,255,.02)"; ctx.lineWidth = 1;
      const size = 48;
      for (let x = 0; x <= W; x += size) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y <= H; y += size) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    }
    if (fx.glowEffects) {
      const glowGrd = ctx.createLinearGradient(0, H - 200, 0, H);
      glowGrd.addColorStop(0, "rgba(124,92,255,0)");
      glowGrd.addColorStop(0.7, "rgba(124,92,255,.1)");
      glowGrd.addColorStop(1, "rgba(124,92,255,.22)");
      ctx.fillStyle = glowGrd; ctx.fillRect(0, H - 200, W, 200);
    }
  }

  function roundRect(x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath(); ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function drawPlatform(p, moving = false) {
    ctx.save();
    if (fx.shadows) { ctx.shadowColor = moving ? "rgba(38,217,255,.6)" : "rgba(124,92,255,.4)"; ctx.shadowBlur = moving ? 25 : 15; }
    const grd = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
    if (moving) { grd.addColorStop(0, "#2a5570"); grd.addColorStop(0.5, "#1e4257"); grd.addColorStop(1, "#142e3e"); }
    else { grd.addColorStop(0, "#2a3152"); grd.addColorStop(0.5, "#20263e"); grd.addColorStop(1, "#141828"); }
    ctx.fillStyle = grd;
    roundRect(p.x, p.y, p.w, p.h, 8); ctx.fill();
    ctx.fillStyle = moving ? "#42ddff" : "#7c5cff";
    if (fx.shadows) { ctx.shadowColor = moving ? "#42ddff" : "#7c5cff"; ctx.shadowBlur = 15; }
    ctx.fillRect(p.x + 8, p.y + 3, Math.max(0, p.w - 16), 3);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = moving ? "rgba(66,221,255,.5)" : "rgba(124,92,255,.35)";
    ctx.lineWidth = 1.5;
    roundRect(p.x, p.y, p.w, p.h, 8); ctx.stroke();
    if (fx.detailPlatforms) {
      ctx.fillStyle = "rgba(255,255,255,.03)";
      for (let i = 0; i < p.w; i += 12) ctx.fillRect(p.x + i + 4, p.y + 8, 4, p.h - 12);
    }
    ctx.restore();
  }

  function drawHazard(h) {
    ctx.save();
    if (fx.shadows) { ctx.shadowColor = "rgba(255,79,109,.8)"; ctx.shadowBlur = 22; }
    const spikeW = 14;
    const count = Math.max(1, Math.floor(h.w / spikeW));
    const realW = h.w / count;
    for (let i = 0; i < count; i++) {
      const x = h.x + i * realW;
      const grd = ctx.createLinearGradient(x, h.y, x, h.y + h.h);
      grd.addColorStop(0, "#ff8fa6"); grd.addColorStop(0.5, "#ff4f6d"); grd.addColorStop(1, "#aa1f3a");
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.moveTo(x, h.y + h.h); ctx.lineTo(x + realW / 2, h.y); ctx.lineTo(x + realW, h.y + h.h); ctx.closePath(); ctx.fill();
      if (fx.detailPlatforms) {
        ctx.fillStyle = "rgba(255,255,255,.25)";
        ctx.beginPath(); ctx.moveTo(x + realW * 0.3, h.y + h.h); ctx.lineTo(x + realW / 2, h.y + 2); ctx.lineTo(x + realW * 0.5, h.y + h.h); ctx.closePath(); ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawDoor() {
    if (level.doorVisible === false) return;
    const x = level.door[0], y = level.door[1];
    const unlocked = !level.key || level.hasKey;
    const time = performance.now() / 1000;
    ctx.save();
    if (fx.shadows) { ctx.shadowColor = unlocked ? "rgba(72,226,155,.8)" : "rgba(255,79,109,.7)"; ctx.shadowBlur = 35; }
    const grd = ctx.createLinearGradient(x, y, x, y + 52);
    if (unlocked) { grd.addColorStop(0, "#1e5548"); grd.addColorStop(0.5, "#163f35"); grd.addColorStop(1, "#0a1f18"); }
    else { grd.addColorStop(0, "#5a2a38"); grd.addColorStop(0.5, "#43202a"); grd.addColorStop(1, "#1f0e14"); }
    ctx.fillStyle = grd;
    roundRect(x, y, 46, 52, 6); ctx.fill();
    const pulse = 0.5 + 0.5 * Math.sin(time * 5);
    ctx.strokeStyle = unlocked ? `rgba(72,226,155,${0.6 + pulse * 0.4})` : `rgba(255,79,109,${0.6 + pulse * 0.4})`;
    ctx.lineWidth = 3.5;
    roundRect(x, y, 46, 52, 6); ctx.stroke();
    ctx.fillStyle = unlocked ? "#48e29b" : "#ff4f6d";
    if (fx.glowEffects) { ctx.shadowColor = unlocked ? "#48e29b" : "#ff4f6d"; ctx.shadowBlur = 15; }
    ctx.beginPath(); ctx.arc(x + 35, y + 27, 4, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    if (unlocked) {
      ctx.fillStyle = `rgba(72,226,155,${0.5 + pulse * 0.5})`;
      ctx.font = "bold 20px Arial"; ctx.textAlign = "center";
      if (fx.glowEffects) { ctx.shadowColor = "#48e29b"; ctx.shadowBlur = 15; }
      ctx.fillText("▼", x + 23, y - 10);
      ctx.textAlign = "left"; ctx.shadowBlur = 0;
    }
    ctx.restore();
  }

  function drawFakeDoor() {
    if (!level.fakeDoor || level.fakeDoor.active === false) return;
    const { x, y } = level.fakeDoor;
    const time = performance.now() / 1000;
    ctx.save();
    if (fx.shadows) { ctx.shadowColor = "rgba(72,226,155,.8)"; ctx.shadowBlur = 35; }
    const grd = ctx.createLinearGradient(x, y, x, y + 52);
    grd.addColorStop(0, "#1e5548"); grd.addColorStop(1, "#0a1f18");
    ctx.fillStyle = grd;
    roundRect(x, y, 46, 52, 6); ctx.fill();
    const pulse = 0.5 + 0.5 * Math.sin(time * 5);
    ctx.strokeStyle = `rgba(72,226,155,${0.6 + pulse * 0.4})`;
    ctx.lineWidth = 3.5;
    roundRect(x, y, 46, 52, 6); ctx.stroke();
    ctx.fillStyle = "#48e29b"; ctx.shadowColor = "#48e29b"; ctx.shadowBlur = 15;
    ctx.beginPath(); ctx.arc(x + 35, y + 27, 4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawKey() {
    if (!level.key || level.hasKey) return;
    const [x, y] = level.key;
    const time = performance.now() / 1000;
    const bob = Math.sin(time * 4) * 6;
    const rotation = fx.animatedBg ? Math.sin(time * 2) * 0.25 : 0;
    ctx.save();
    ctx.translate(x + 15, y + 15 + bob);
    ctx.rotate(rotation);
    if (fx.shadows) { ctx.shadowColor = "rgba(255,215,74,.9)"; ctx.shadowBlur = 35; }
    const pulse = 0.6 + 0.4 * Math.sin(time * 3);
    ctx.strokeStyle = `rgba(255,215,74,${0.5 + pulse * 0.5})`; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, 25, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = `rgba(255,215,74,${0.9 + pulse * 0.1})`; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.arc(-6, 0, 8, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(2, 0); ctx.lineTo(16, 0); ctx.lineTo(16, 8);
    ctx.moveTo(9, 0); ctx.lineTo(9, 7); ctx.stroke();
    ctx.restore();
  }

  function drawPlayer() {
    ctx.save();
    if (fx.trails) {
      for (let i = 0; i < playerTrail.length; i++) {
        const t = playerTrail[i];
        const alpha = (i / playerTrail.length) * 0.35 * (t.life / 0.4);
        const size = 5 + (i / playerTrail.length) * 8;
        ctx.globalAlpha = alpha; ctx.fillStyle = "#7c5cff";
        if (fx.glowEffects) { ctx.shadowColor = "#7c5cff"; ctx.shadowBlur = 20; }
        ctx.beginPath(); ctx.arc(t.x, t.y, size, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    }
    if (player.invulnerable > 0 && Math.floor(performance.now() / 80) % 2 === 0) ctx.globalAlpha = 0.4;
    const charData = CHARACTERS[playerData.equippedCharacter] || CHARACTERS.default;
    const outfitData = OUTFITS[playerData.equippedOutfit] || OUTFITS.default;
    const bodyColor = outfitData.color !== '#f7f9ff' ? outfitData.color : charData.color;
    if (fx.shadows) { ctx.shadowColor = charData.accent; ctx.shadowBlur = 25; }
    const bodyGrd = ctx.createLinearGradient(player.x, player.y + 10, player.x, player.y + player.h);
    bodyGrd.addColorStop(0, shadeColor(bodyColor, 25));
    bodyGrd.addColorStop(0.5, bodyColor);
    bodyGrd.addColorStop(1, shadeColor(bodyColor, -30));
    ctx.fillStyle = bodyGrd;
    roundRect(player.x, player.y + 10, player.w, player.h - 10, 9); ctx.fill();
    ctx.strokeStyle = charData.accent; ctx.lineWidth = 2;
    roundRect(player.x, player.y + 10, player.w, player.h - 10, 9); ctx.stroke();
    ctx.fillStyle = "#ffd3b6"; ctx.shadowColor = "rgba(255,211,182,.6)"; ctx.shadowBlur = 15;
    ctx.beginPath(); ctx.arc(player.x + player.w / 2, player.y + 9, 11, 0, Math.PI * 2); ctx.fill();
    const cx = player.x + player.w / 2, cy = player.y + 9;
    drawCharacterHead(ctx, playerData.equippedCharacter, cx, cy, 11, input.left ? -1 : 1);
    if (player.hasShield) {
      const pulse = 0.5 + 0.3 * Math.sin(performance.now() / 200);
      ctx.strokeStyle = `rgba(38,217,255,${pulse + 0.3})`; ctx.lineWidth = 3;
      if (fx.glowEffects) { ctx.shadowColor = "#26d9ff"; ctx.shadowBlur = 20; }
      ctx.beginPath(); ctx.arc(cx, cy + 12, 30, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.restore();
  }

  function drawHUD() {
    ctx.save();
    if (fx.glowEffects) { ctx.shadowColor = "rgba(124,92,255,.8)"; ctx.shadowBlur = 15; }
    ctx.font = "700 18px Arial"; ctx.fillStyle = "rgba(255,255,255,.95)";
    ctx.fillText(level.name.toUpperCase(), 24, 34);
    ctx.shadowBlur = 0;
    ctx.font = "600 14px Arial"; ctx.fillStyle = "rgba(255,255,255,.6)";
    const objective = level.key ? (level.hasKey ? "KEY ✓  →  FIND EXIT" : "FIND KEY 🔑") : "FIND EXIT";
    ctx.fillText(objective, 24, 58);
    if (fx.glowEffects) { ctx.shadowColor = "#ffd74a"; ctx.shadowBlur = 12; }
    ctx.fillStyle = "#ffd74a";
    ctx.font = "700 16px Arial"; ctx.textAlign = "right";
    ctx.fillText(`🪙 ${playerData.coins}`, W - 24, 34);
    if (fx.glowEffects) { ctx.shadowColor = "#26d9ff"; }
    ctx.fillStyle = "#26d9ff";
    ctx.fillText(`✨ ${playerData.skillPoints}`, W - 24, 58);
    ctx.textAlign = "left";
    ctx.restore();
  }

  function draw() {
    if (!level) return;
    ctx.save();
    if (shakeAmount > 0.5) {
      ctx.translate((Math.random() - 0.5) * shakeAmount, (Math.random() - 0.5) * shakeAmount);
      shakeAmount *= shakeDecay;
    } else shakeAmount = 0;
    drawBackground();
    for (const p of level.platforms) {
      if (p.active === false) continue;
      if (p.hidden && !p.revealed && !level.revealAll) continue;
      drawPlatform(p, false);
    }
    for (const p of (level.moving || [])) { if (p.active !== false) drawPlatform(p, true); }
    for (const h of level.hazards) { if (h.active !== false) drawHazard(h); }
    drawFakeDoor(); drawDoor(); drawKey();
    drawParticles();
    drawPlayer(); drawHUD();
    ctx.restore();
    if (fx.aberration && aberrationAmount > 0.5) {
      try {
        const imgData = ctx.getImageData(0, 0, W, H);
        const data = imgData.data;
        const offset = Math.floor(aberrationAmount);
        const copy = new Uint8ClampedArray(data);
        for (let y = 0; y < H; y++) {
          for (let x = 0; x < W; x++) {
            const i = (y * W + x) * 4;
            const rx = Math.min(W - 1, Math.max(0, x - offset));
            const bx = Math.min(W - 1, Math.max(0, x + offset));
            const ri = (y * W + rx) * 4;
            const bi = (y * W + bx) * 4;
            data[i] = copy[ri];
            data[i + 2] = copy[bi + 2];
          }
        }
        ctx.putImageData(imgData, 0, 0);
      } catch (_) {}
    }
  }

  function loop(timestamp) {
    const dt = Math.min((timestamp - lastTime) / 1000 || 0, 1 / 30);
    lastTime = timestamp;
    update(dt); draw();
    rafId = requestAnimationFrame(loop);
  }
  function ensureGameLoop() {
    if (rafId === null) { lastTime = performance.now(); rafId = requestAnimationFrame(loop); }
  }

  function setPaused(value) {
    if (completed || !gameRunning) return;
    paused = value;
    pauseOverlay.classList.toggle("hidden", !paused);
  }

  // ============================================================
  // STORE
  // ============================================================
  let currentStoreTab = 'skills';
  function renderStore(tab) {
    currentStoreTab = tab;
    document.querySelectorAll('.store-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    storeContent.innerHTML = '';
    updateCurrencyDisplay();
    let items = [];
    if (tab === 'skills') items = Object.entries(SKILLS);
    else if (tab === 'characters') items = Object.entries(CHARACTERS);
    else if (tab === 'outfits') items = Object.entries(OUTFITS);
    else if (tab === 'bundles') items = Object.entries(BUNDLES);
    for (const [key, item] of items) {
      const div = document.createElement('div');
      div.className = 'store-item';
      let owned = false, equipped = false, priceLabel = '';
      if (tab === 'skills') { owned = playerData.ownedSkills.includes(key); equipped = playerData.equippedSkills.includes(key); priceLabel = `${item.price} 🪙`; }
      else if (tab === 'characters') { owned = playerData.ownedCharacters.includes(key); equipped = playerData.equippedCharacter === key; priceLabel = `${item.price} 🪙`; }
      else if (tab === 'outfits') { owned = playerData.ownedOutfits.includes(key); equipped = playerData.equippedOutfit === key; priceLabel = `${item.price} 🪙`; }
      else if (tab === 'bundles') { priceLabel = `${item.price} 🪙`; }
      if (owned && !equipped) div.classList.add('owned');
      if (equipped) div.classList.add('equipped');
      const iconDiv = document.createElement('div');
      iconDiv.className = 'store-item-icon';
      iconDiv.textContent = item.emoji || '❓';
      div.appendChild(iconDiv);
      const nameDiv = document.createElement('div');
      nameDiv.className = 'store-item-name';
      nameDiv.textContent = item.name;
      div.appendChild(nameDiv);
      const descDiv = document.createElement('div');
      descDiv.className = 'store-item-desc';
      descDiv.textContent = item.desc;
      div.appendChild(descDiv);
      if (tab !== 'bundles') {
        const priceDiv = document.createElement('div');
        priceDiv.className = 'store-item-price';
        if (tab === 'skills' && !owned) priceDiv.classList.add('skill-price');
        priceDiv.textContent = owned ? '✓ OWNED' : priceLabel;
        div.appendChild(priceDiv);
      } else {
        const priceDiv = document.createElement('div');
        priceDiv.className = 'store-item-price';
        priceDiv.textContent = priceLabel;
        div.appendChild(priceDiv);
      }
      const btn = document.createElement('button');
      btn.className = 'store-item-btn';
      if (tab === 'bundles') {
        btn.textContent = 'BUY BUNDLE'; btn.classList.add('buy');
        if (playerData.coins < item.price) btn.classList.add('cant-afford');
        btn.addEventListener('click', () => {
          if (playerData.coins < item.price) { showStoreToast('Not enough coins!'); return; }
          playerData.coins -= item.price;
          if (item.includes.characters) item.includes.characters.forEach(c => { if (!playerData.ownedCharacters.includes(c)) playerData.ownedCharacters.push(c); });
          if (item.includes.outfits) item.includes.outfits.forEach(o => { if (!playerData.ownedOutfits.includes(o)) playerData.ownedOutfits.push(o); });
          if (item.includes.skills) item.includes.skills.forEach(s => { if (!playerData.ownedSkills.includes(s)) playerData.ownedSkills.push(s); });
          if (item.includes.coins) playerData.coins += item.includes.coins;
          if (item.includes.skillPoints) playerData.skillPoints += item.includes.skillPoints;
          playerData.save(); AudioEngine.purchase();
          updateCurrencyDisplay(); renderStore(currentStoreTab);
          showStoreToast(`Unlocked ${item.name}!`);
        });
      } else if (owned) {
        if (equipped) { btn.textContent = tab === 'skills' ? 'UNEQUIP' : 'EQUIPPED'; btn.classList.add('unequip'); }
        else { btn.textContent = 'EQUIP'; btn.classList.add('equip'); }
        btn.addEventListener('click', () => {
          if (tab === 'skills') {
            const idx = playerData.equippedSkills.indexOf(key);
            if (idx >= 0) playerData.equippedSkills.splice(idx, 1);
            else {
              if (playerData.equippedSkills.length >= 3) { showStoreToast('Max 3 skills equipped!'); return; }
              playerData.equippedSkills.push(key);
            }
          } else if (tab === 'characters') playerData.equippedCharacter = key;
          else if (tab === 'outfits') playerData.equippedOutfit = key;
          playerData.save(); AudioEngine.equip();
          renderStore(currentStoreTab); updateCurrencyDisplay(); updateSkillHUD();
        });
      } else {
        btn.textContent = 'BUY'; btn.classList.add('buy');
        if (playerData.coins < item.price) btn.classList.add('cant-afford');
        btn.addEventListener('click', () => {
          if (playerData.coins < item.price) { showStoreToast('Not enough coins!'); return; }
          playerData.coins -= item.price;
          if (tab === 'skills') playerData.ownedSkills.push(key);
          else if (tab === 'characters') playerData.ownedCharacters.push(key);
          else if (tab === 'outfits') playerData.ownedOutfits.push(key);
          playerData.save(); AudioEngine.purchase();
          updateCurrencyDisplay(); renderStore(currentStoreTab);
          showStoreToast(`Purchased ${item.name}!`);
        });
      }
      div.appendChild(btn);
      storeContent.appendChild(div);
    }
  }
  function showStoreToast(text) {
    const toast = document.createElement('div');
    toast.style.cssText = `position:fixed;bottom:30px;left:50%;transform:translateX(-50%);background:rgba(8,10,17,.95);color:white;padding:14px 24px;border-radius:14px;border:1px solid #7c5cff;font-weight:800;z-index:9999;box-shadow:0 0 40px rgba(124,92,255,.6);`;
    toast.textContent = text;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  }
  function openStore() { showScreen('store'); renderStore('skills'); updateCurrencyDisplay(); }
  function startRun(withCountdown = true) {
    playerData.totalRuns++; playerData.save();
    showScreen('game');
    loadLevel(playerData.currentLevel, !withCountdown);
  }

  // ============================================================
  // INPUT
  // ============================================================
  function bindHoldButton(el_, key) {
    if (!el_) return;
    const down = (e) => {
      e.preventDefault();
      input[key] = true;
      if (key === "jump") input.jumpPressed = true;
      if (el_.setPointerCapture && e.pointerId !== undefined) { try { el_.setPointerCapture(e.pointerId); } catch (_) {} }
    };
    const up = (e) => { e.preventDefault(); input[key] = false; };
    el_.addEventListener("pointerdown", down);
    el_.addEventListener("pointerup", up);
    el_.addEventListener("pointercancel", up);
    el_.addEventListener("pointerleave", up);
  }

  window.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if (["arrowleft","arrowright","arrowup"," ","a","d","w"].includes(k)) e.preventDefault();
    if (screens.lobby.classList.contains("active")) {
      if (k === "arrowleft" || k === "a") lobby.keys.left = true;
      if (k === "arrowright" || k === "d") lobby.keys.right = true;
      if (k === "arrowup" || k === "w" || k === " " || k === "e" || k === "enter") { if (!e.repeat) lobby.handleInteraction(); }
    }
    if (screens.game.classList.contains("active")) {
      if (k === "arrowleft" || k === "a") input.left = true;
      if (k === "arrowright" || k === "d") input.right = true;
      if ((k === "arrowup" || k === "w" || k === " ") && !e.repeat) input.jumpPressed = true;
      if (k === "r") restartLevel();
      if (k === "escape") setPaused(!paused);
      if (k === "q") useSkill('dash');
    }
  });
  window.addEventListener("keyup", (e) => {
    const k = e.key.toLowerCase();
    if (k === "arrowleft" || k === "a") { input.left = false; lobby.keys.left = false; }
    if (k === "arrowright" || k === "d") { input.right = false; lobby.keys.right = false; }
  });

  let lobbyTouchX = null;
  lobbyCanvas.addEventListener('pointerdown', (e) => {
    if (!screens.lobby.classList.contains('active')) return;
    const rect = lobbyCanvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width * LW;
    const y = (e.clientY - rect.top) / rect.height * LH;
    const dxT = x - lobby.traderX, dyT = y - lobby.traderY;
    if (Math.sqrt(dxT * dxT + dyT * dyT) < 100 * lobby.scale) { AudioEngine.click(); openStore(); return; }
    const dxP = x - lobby.portalX, dyP = y - lobby.portalY;
    if (Math.sqrt(dxP * dxP + dyP * dyP) < 100 * lobby.scale) { AudioEngine.click(); startRun(true); return; }
    lobbyTouchX = x;
  });
  lobbyCanvas.addEventListener('pointermove', (e) => {
    if (!screens.lobby.classList.contains('active') || lobbyTouchX === null) return;
    const rect = lobbyCanvas.getBoundingClientRect();
    lobbyTouchX = (e.clientX - rect.left) / rect.width * LW;
  });
  lobbyCanvas.addEventListener('pointerup', () => { lobbyTouchX = null; });
  lobbyCanvas.addEventListener('pointercancel', () => { lobbyTouchX = null; });
  setInterval(() => {
    if (!screens.lobby.classList.contains('active') || lobbyTouchX === null) return;
    const dx = lobbyTouchX - lobby.playerX;
    if (Math.abs(dx) > 15) { lobby.keys.left = dx < 0; lobby.keys.right = dx > 0; }
    else { lobby.keys.left = false; lobby.keys.right = false; }
  }, 50);

  // ============================================================
  // UI EVENTS
  // ============================================================
  el("playBtn").addEventListener("click", () => { AudioEngine.click(); startRun(true); });
  el("storeBtn").addEventListener("click", () => { AudioEngine.click(); openStore(); });
  el("settingsBtn").addEventListener("click", () => { AudioEngine.click(); showScreen("settings"); });
  el("howBtn").addEventListener("click", () => { AudioEngine.click(); showScreen("how"); });
  el("storeBackBtn").addEventListener("click", () => { AudioEngine.click(); showScreen("lobby"); });
  document.querySelectorAll(".store-tab").forEach(tab => {
    tab.addEventListener("click", () => { AudioEngine.click(); renderStore(tab.dataset.tab); });
  });
  document.querySelectorAll(".backBtn").forEach(btn => {
    btn.addEventListener("click", () => { AudioEngine.click(); showScreen("lobby"); });
  });
  el("homeBtn").addEventListener("click", () => { AudioEngine.click(); gameRunning = false; showScreen("lobby"); });
  el("restartBtn").addEventListener("click", () => { AudioEngine.click(); restartLevel(); });
  el("pauseBtn").addEventListener("click", () => { AudioEngine.click(); setPaused(true); });
  el("resumeBtn").addEventListener("click", () => { AudioEngine.click(); setPaused(false); });
  el("pauseHomeBtn").addEventListener("click", () => { AudioEngine.click(); setPaused(false); gameRunning = false; showScreen("lobby"); });
  el("completeHomeBtn").addEventListener("click", () => { AudioEngine.click(); completeOverlay.classList.add("hidden"); showScreen("lobby"); });
  nextBtn.addEventListener("click", () => { AudioEngine.click(); completeOverlay.classList.add("hidden"); loadLevel(currentLevel + 1, true); });

  el("graphicsQuality").addEventListener("change", (e) => {
    settings.graphicsQuality = e.target.value;
    recomputeFx();
    applySettings();
    saveSettings();
    if (screens.lobby.classList.contains('active')) {
      resizeLobby();
      if (lobby && lobby.init) lobby.init();
    }
  });
  el("gridToggle").addEventListener("click", () => { settings.showGrid = !settings.showGrid; el("gridToggle").classList.toggle("on", settings.showGrid); recomputeFx(); applySettings(); saveSettings(); });
  el("shadowToggle").addEventListener("click", () => { settings.showShadows = !settings.showShadows; el("shadowToggle").classList.toggle("on", settings.showShadows); recomputeFx(); applySettings(); saveSettings(); });
  el("masterVolume").addEventListener("input", (e) => { settings.masterVolume = Number(e.target.value); saveSettings(); AudioEngine.updateVolumes(); });
  el("sfxVolume").addEventListener("input", (e) => { settings.sfxVolume = Number(e.target.value); saveSettings(); AudioEngine.updateVolumes(); });
  el("musicVolume").addEventListener("input", (e) => { settings.musicVolume = Number(e.target.value); saveSettings(); AudioEngine.updateVolumes(); });
  el("moveBtnSize").addEventListener("input", (e) => { settings.moveBtnSize = Number(e.target.value); applySettings(); saveSettings(); });
  el("jumpBtnSize").addEventListener("input", (e) => { settings.jumpBtnSize = Number(e.target.value); applySettings(); saveSettings(); });
  el("controlsPosition").addEventListener("change", (e) => { settings.controlsPosition = e.target.value; applySettings(); saveSettings(); });
  el("screenMode").addEventListener("change", (e) => { settings.screenMode = e.target.value; applySettings(); saveSettings(); });
  el("resetSettingsBtn").addEventListener("click", () => {
    resetSettings();
    if (screens.lobby.classList.contains('active')) { resizeLobby(); if (lobby && lobby.init) lobby.init(); }
  });

  bindHoldButton(el("leftBtn"), "left");
  bindHoldButton(el("rightBtn"), "right");
  bindHoldButton(el("jumpBtn"), "jump");

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && screens.game.classList.contains("active") && !completed && gameRunning) setPaused(true);
  });

  // ============================================================
  // INIT
  // ============================================================
  AudioEngine.init();
  resizeLobby();
  lobby.init();
  loadSettings();
  updateCurrencyDisplay();
  updateSkillHUD();

  showScreen('intro');
  setTimeout(() => intro.start(), 400);

  document.addEventListener('pointerdown', () => AudioEngine.resume(), { once: true });
  document.addEventListener('keydown', () => AudioEngine.resume(), { once: true });

  console.log('%c✅ Escape The Room loaded! Quality: ' + settings.graphicsQuality + (IS_MOBILE ? ' (mobile)' : ' (desktop)'),
    'color:#26d9ff;font-weight:bold;font-size:13px;');
})(); 