(() => {
  "use strict";

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  const screens = {
    home: document.getElementById("homeScreen"),
    game: document.getElementById("gameScreen"),
    levels: document.getElementById("levelsScreen"),
    how: document.getElementById("howScreen"),
  };

  const levelNumber = document.getElementById("levelNumber");
  const levelGrid = document.getElementById("levelGrid");
  const messageBox = document.getElementById("messageBox");
  const pauseOverlay = document.getElementById("pauseOverlay");
  const completeOverlay = document.getElementById("completeOverlay");
  const completeTitle = document.getElementById("completeTitle");
  const completeText = document.getElementById("completeText");
  const nextBtn = document.getElementById("nextBtn");

  const W = canvas.width;
  const H = canvas.height;

  const input = {
    left: false,
    right: false,
    jump: false,
    jumpPressed: false
  };

  let currentLevel = 1;
  let paused = false;
  let completed = false;
  let lastTime = 0;
  let rafId = null;
  let level = null;
  let messageTimer = 0;

  const save = {
    get unlocked() {
      const n = Number(localStorage.getItem("escapeRoomUnlocked") || 1);
      return Math.min(30, Math.max(1, n));
    },
    set unlocked(n) {
      localStorage.setItem("escapeRoomUnlocked", String(Math.min(30, Math.max(1, n))));
    },
    get lastLevel() {
      const n = Number(localStorage.getItem("escapeRoomLastLevel") || 1);
      return Math.min(this.unlocked, Math.max(1, n));
    },
    set lastLevel(n) {
      localStorage.setItem("escapeRoomLastLevel", String(Math.min(30, Math.max(1, n))));
    }
  };

  const player = {
    x: 70,
    y: 420,
    w: 34,
    h: 44,
    vx: 0,
    vy: 0,
    speed: 270,
    jumpPower: 590,
    grounded: false,
    color: "#f7f9ff"
  };

  const P = (x, y, w, h = 22) => ({ x, y, w, h });
  const S = (x, y, w = 42, h = 20) => ({ x, y, w, h });
  const M = (x, y, w, h, axis, distance, speed) => ({
    x, y, w, h, axis, distance, speed,
    startX: x, startY: y, t: 0, prevX: x, prevY: y
  });

  function makeLevels() {
    const g = P(0, 500, 960, 40);

    return [
      { name:"First Step", start:[55,456], door:[870,448], platforms:[g], hazards:[] },

      { name:"Find the Key", start:[55,456], door:[870,448], key:[470,456], platforms:[g], hazards:[] },

      { name:"Small Jump", start:[55,456], door:[870,448], key:[620,356], platforms:[g,P(250,430,140),P(470,385,160),P(610,400,150)], hazards:[] },

      { name:"Watch the Spikes", start:[55,456], door:[870,448], key:[510,456], platforms:[g,P(300,410,150),P(650,390,135)], hazards:[S(210,480,70),S(570,480,70)] },

      { name:"Climb Up", start:[55,456], door:[850,218], key:[520,286], platforms:[g,P(180,430,130),P(340,360,130),P(500,330,120),P(650,275,120),P(810,270,110)], hazards:[] },

      { name:"Double Trouble", start:[55,456], door:[870,448], key:[460,326], platforms:[g,P(160,415,130),P(340,360,120),P(450,370,130),P(680,410,140)], hazards:[S(300,480,80),S(580,480,95)] },

      { name:"Moving Ride", start:[55,456], door:[870,448], key:[505,286], platforms:[g,P(210,420,120),P(430,340,140),P(700,410,130)], moving:[M(360,430,100,18,"x",120,1.7)], hazards:[S(560,480,80)] },

      { name:"Up and Down", start:[55,456], door:[855,238], key:[540,280], platforms:[g,P(160,420,120),P(390,355,120),P(520,330,120),P(780,290,140)], moving:[M(650,380,110,18,"y",85,1.4)], hazards:[] },

      { name:"Three Traps", start:[55,456], door:[870,448], key:[745,366], platforms:[g,P(160,410,130),P(350,350,120),P(530,400,120),P(700,410,120)], hazards:[S(290,480,55),S(470,480,55),S(650,480,55)] },

      { name:"Level Ten", start:[55,456], door:[845,178], key:[690,226], platforms:[g,P(120,430,120),P(270,360,120),P(420,300,120),P(570,260,120),P(710,270,120),P(820,230,120)], hazards:[S(340,480,65),S(620,480,65)] },

      { name:"Zig Zag", start:[55,456], door:[870,448], key:[500,236], platforms:[g,P(150,420,115),P(280,350,115),P(420,285,115),P(560,350,115),P(700,420,115)], hazards:[S(265,480,55),S(535,480,55)] },

      { name:"Crossing", start:[55,456], door:[870,448], key:[625,316], platforms:[g,P(150,400,120),P(370,340,120),P(590,360,120),P(760,410,120)], moving:[M(275,420,90,18,"x",85,1.8),M(520,390,80,18,"y",70,1.6)], hazards:[S(490,480,80)] },

      { name:"High Key", start:[55,456], door:[870,448], key:[500,176], platforms:[g,P(160,420,110),P(300,350,110),P(440,280,110),P(470,220,110),P(610,310,110),P(750,400,120)], hazards:[S(575,480,70)] },

      { name:"Spike Hall", start:[55,456], door:[870,448], key:[780,296], platforms:[g,P(130,410,110),P(290,410,110),P(450,410,110),P(610,410,110),P(760,340,110)], hazards:[S(240,480,45),S(400,480,45),S(560,480,45),S(720,480,35)] },

      { name:"Moving Tower", start:[55,456], door:[845,158], key:[560,216], platforms:[g,P(130,420,120),P(340,340,120),P(520,260,120),P(760,210,150)], moving:[M(270,385,90,18,"y",65,1.4),M(640,300,90,18,"x",90,1.5)], hazards:[] },

      { name:"Precision", start:[55,456], door:[870,448], key:[560,276], platforms:[g,P(170,425,85),P(300,365,85),P(430,315,85),P(550,320,85),P(680,370,85),P(790,425,85)], hazards:[S(255,480,40),S(385,480,40),S(635,480,40),S(765,480,35)] },

      { name:"Lift Escape", start:[55,456], door:[840,138], key:[705,176], platforms:[g,P(140,420,120),P(330,350,120),P(520,280,120),P(680,220,120),P(800,190,130)], moving:[M(255,420,80,18,"y",105,1.2),M(600,320,80,18,"y",90,1.45)], hazards:[S(450,480,70)] },

      { name:"Rush Room", start:[55,456], door:[870,448], key:[485,236], platforms:[g,P(120,410,100),P(260,350,100),P(430,290,110),P(600,350,100),P(750,410,100)], moving:[M(330,430,75,18,"x",100,2.2),M(640,430,75,18,"x",90,2.35)], hazards:[S(220,480,40),S(710,480,40)] },

      { name:"Thin Steps", start:[55,456], door:[860,208], key:[500,226], platforms:[g,P(130,430,75),P(235,375,75),P(340,320,75),P(445,270,75),P(550,315,75),P(655,365,75),P(760,260,140)], hazards:[S(205,480,30),S(415,480,30),S(625,480,30)] },

      { name:"Level Twenty", start:[55,456], door:[845,118], key:[720,146], platforms:[g,P(120,425,100),P(260,350,100),P(400,280,100),P(540,220,100),P(680,190,100),P(805,170,130)], moving:[M(320,420,70,18,"x",100,2),M(590,300,70,18,"y",90,1.7)], hazards:[S(220,480,40),S(500,480,40),S(780,480,35)] },

      { name:"Broken Path", start:[55,456], door:[870,448], key:[610,276], platforms:[g,P(140,410,85),P(265,355,85),P(390,410,85),P(515,330,85),P(600,320,85),P(740,390,110)], hazards:[S(225,480,35),S(475,480,35),S(690,480,45)] },

      { name:"Elevator Maze", start:[55,456], door:[840,138], key:[510,186], platforms:[g,P(130,430,90),P(310,350,90),P(470,240,100),P(650,330,90),P(800,190,130)], moving:[M(230,390,70,18,"y",90,1.4),M(560,320,70,18,"x",80,1.9),M(710,270,70,18,"y",85,1.6)], hazards:[] },

      { name:"Danger Floor", start:[55,456], door:[860,208], key:[685,256], platforms:[g,P(120,420,100),P(270,360,100),P(420,300,100),P(570,300,100),P(690,300,100),P(805,260,120)], hazards:[S(220,480,45),S(370,480,45),S(520,480,45),S(670,480,25),S(790,480,15)] },

      { name:"Fast Movers", start:[55,456], door:[870,448], key:[500,236], platforms:[g,P(120,410,90),P(330,320,100),P(470,280,100),P(680,370,100),P(800,420,100)], moving:[M(220,390,80,18,"x",110,2.5),M(580,330,80,18,"y",75,2.1)], hazards:[S(210,480,40),S(640,480,40)] },

      { name:"Trial Room", start:[55,456], door:[845,118], key:[640,156], platforms:[g,P(120,430,85),P(250,370,85),P(380,310,85),P(510,250,85),P(625,200,85),P(750,250,85),P(810,170,120)], moving:[M(305,430,70,18,"x",80,2),M(680,330,70,18,"y",90,1.8)], hazards:[S(205,480,35),S(595,480,30),S(795,480,25)] },

      { name:"Hard Climb", start:[55,456], door:[845,98], key:[480,126], platforms:[g,P(120,425,90),P(240,365,90),P(360,305,90),P(460,170,100),P(580,250,90),P(700,190,90),P(805,150,120)], moving:[M(430,250,70,18,"y",95,1.7)], hazards:[S(210,480,30),S(330,480,30),S(670,480,30)] },

      { name:"No Mistakes", start:[55,456], door:[870,448], key:[520,196], platforms:[g,P(120,410,75),P(225,350,75),P(330,290,75),P(435,240,75),P(520,240,75),P(625,300,75),P(730,360,75),P(830,420,75)], hazards:[S(195,480,28),S(300,480,28),S(405,480,28),S(595,480,28),S(700,480,28),S(805,480,20)] },

      { name:"Moving Madness", start:[55,456], door:[850,158], key:[640,196], platforms:[g,P(120,420,85),P(330,335,85),P(520,250,85),P(630,240,85),P(805,210,125)], moving:[M(220,390,70,18,"x",115,2.5),M(420,340,70,18,"y",100,2.0),M(700,300,70,18,"x",85,2.6)], hazards:[S(205,480,35),S(485,480,35),S(770,480,30)] },

      { name:"Almost Free", start:[55,456], door:[845,98], key:[530,106], platforms:[g,P(115,425,80),P(225,365,80),P(335,305,80),P(445,245,80),P(520,150,90),P(630,230,80),P(740,170,80),P(810,150,125)], moving:[M(280,430,65,18,"x",70,2.3),M(590,330,65,18,"y",80,2.2)], hazards:[S(195,480,25),S(415,480,25),S(715,480,25)] },

      { name:"FINAL ESCAPE", start:[55,456], door:[842,78], key:[480,96], platforms:[g,P(110,425,75),P(215,365,75),P(320,305,75),P(425,245,75),P(455,140,110),P(585,220,75),P(690,165,75),P(790,130,135)], moving:[M(270,430,62,18,"x",75,2.7),M(380,320,62,18,"y",85,2.25),M(610,310,62,18,"x",95,2.75),M(745,245,62,18,"y",90,2.4)], hazards:[S(185,480,28),S(290,480,28),S(395,480,28),S(565,480,28),S(665,480,28),S(765,480,25)] }
    ];
  }

  const levels = makeLevels();

  function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove("active"));
    screens[name].classList.add("active");
  }

  function cloneLevel(src) {
    return {
      ...src,
      platforms: (src.platforms || []).map(o => ({...o})),
      hazards: (src.hazards || []).map(o => ({...o})),
      moving: (src.moving || []).map(o => ({...o})),
      key: src.key ? [...src.key] : null,
      door: [...src.door],
      start: [...src.start],
      hasKey: false
    };
  }

  function loadLevel(num) {
    currentLevel = Math.min(30, Math.max(1, num));
    save.lastLevel = currentLevel;
    level = cloneLevel(levels[currentLevel - 1]);

    player.x = level.start[0];
    player.y = level.start[1];
    player.vx = 0;
    player.vy = 0;
    player.grounded = false;

    completed = false;
    paused = false;
    levelNumber.textContent = String(currentLevel).padStart(2, "0");

    pauseOverlay.classList.add("hidden");
    completeOverlay.classList.add("hidden");

    if (level.key) {
      showMessage("Find the key, then reach the exit!");
    } else {
      showMessage("Reach the exit door!");
    }

    showScreen("game");
    ensureLoop();
  }

  function restartLevel() {
    if (!level) return;
    loadLevel(currentLevel);
  }

  function buildLevelGrid() {
    const unlocked = save.unlocked;
    levelGrid.innerHTML = "";
    for (let i = 1; i <= 30; i++) {
      const btn = document.createElement("button");
      const available = i <= unlocked;
      btn.className = `level-btn ${available ? "unlocked" : "locked"}`;
      btn.innerHTML = `${String(i).padStart(2, "0")}${available ? "" : '<span class="lock">🔒</span>'}`;
      btn.disabled = !available;
      btn.addEventListener("click", () => loadLevel(i));
      levelGrid.appendChild(btn);
    }
  }

  function showMessage(text, duration = 1600) {
    messageBox.textContent = text;
    messageBox.classList.remove("hidden");
    clearTimeout(messageTimer);
    messageTimer = setTimeout(() => messageBox.classList.add("hidden"), duration);
  }

  function rectsOverlap(a, b) {
    return a.x < b.x + b.w &&
           a.x + a.w > b.x &&
           a.y < b.y + b.h &&
           a.y + a.h > b.y;
  }

  function resetPlayer(show = true) {
    player.x = level.start[0];
    player.y = level.start[1];
    player.vx = 0;
    player.vy = 0;
    if (show) showMessage("Try again!");
  }

  function updateMovingPlatforms(dt) {
    for (const m of level.moving || []) {
      m.prevX = m.x;
      m.prevY = m.y;
      m.t += dt * m.speed;
      const offset = Math.sin(m.t) * m.distance;

      if (m.axis === "x") {
        m.x = m.startX + offset;
      } else {
        m.y = m.startY + offset;
      }
    }
  }

  function resolvePlatforms(dt) {
    player.grounded = false;
    const platforms = [...level.platforms, ...(level.moving || [])];

    for (const p of platforms) {
      const prevBottom = player.y + player.h - player.vy * dt;
      const currBottom = player.y + player.h;

      const withinX =
        player.x + player.w > p.x + 3 &&
        player.x < p.x + p.w - 3;

      if (
        player.vy >= 0 &&
        withinX &&
        prevBottom <= p.y + 8 &&
        currBottom >= p.y &&
        player.y < p.y
      ) {
        player.y = p.y - player.h;
        player.vy = 0;
        player.grounded = true;

        if (p.startX !== undefined) {
          player.x += p.x - p.prevX;
        }
      }
    }
  }

  function update(dt) {
    if (!level || paused || completed) return;

    updateMovingPlatforms(dt);

    const accel = player.speed;
    player.vx = 0;
    if (input.left) player.vx -= accel;
    if (input.right) player.vx += accel;

    if (input.jumpPressed && player.grounded) {
      player.vy = -player.jumpPower;
      player.grounded = false;
    }
    input.jumpPressed = false;

    player.vy += 1450 * dt;
    player.vy = Math.min(player.vy, 900);

    player.x += player.vx * dt;
    player.x = Math.max(0, Math.min(W - player.w, player.x));

    player.y += player.vy * dt;
    resolvePlatforms(dt);

    if (player.y > H + 100) {
      resetPlayer();
      return;
    }

    for (const hazard of level.hazards) {
      if (rectsOverlap(player, hazard)) {
        resetPlayer();
        return;
      }
    }

    if (level.key && !level.hasKey) {
      const keyRect = { x: level.key[0], y: level.key[1], w: 30, h: 30 };
      if (rectsOverlap(player, keyRect)) {
        level.hasKey = true;
        showMessage("Key collected! 🔑");
      }
    }

    const door = { x: level.door[0], y: level.door[1], w: 46, h: 52 };
    if (rectsOverlap(player, door)) {
      if (level.key && !level.hasKey) {
        showMessage("The door is locked. Find the key!");
        player.x -= Math.sign(player.vx || 1) * 8;
      } else {
        finishLevel();
      }
    }
  }

  function finishLevel() {
    if (completed) return;
    completed = true;

    if (currentLevel < 30 && save.unlocked < currentLevel + 1) {
      save.unlocked = currentLevel + 1;
    }

    if (currentLevel === 30) {
      save.unlocked = 30;
      completeTitle.textContent = "YOU ESCAPED! 🏆";
      completeText.textContent = "You completed all 30 levels!";
      nextBtn.textContent = "PLAY AGAIN";
    } else {
      completeTitle.textContent = `LEVEL ${currentLevel} COMPLETE ✓`;
      completeText.textContent = levels[currentLevel - 1].name;
      nextBtn.textContent = "NEXT LEVEL →";
    }

    completeOverlay.classList.remove("hidden");
  }

  function drawBackground() {
    const grd = ctx.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, "#0d1220");
    grd.addColorStop(1, "#080a11");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = "rgba(255,255,255,.035)";
    ctx.lineWidth = 1;
    const size = 48;
    for (let x = 0; x <= W; x += size) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y <= H; y += size) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(124,92,255,.10)";
    ctx.fillRect(0, H - 120, W, 120);
  }

  function roundRect(x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function drawPlatform(p, moving = false) {
    ctx.save();
    ctx.shadowColor = moving ? "rgba(38,217,255,.35)" : "rgba(124,92,255,.25)";
    ctx.shadowBlur = moving ? 16 : 8;
    ctx.fillStyle = moving ? "#24495c" : "#252b42";
    roundRect(p.x, p.y, p.w, p.h, 7);
    ctx.fill();
    ctx.fillStyle = moving ? "#42ddff" : "#7c5cff";
    ctx.fillRect(p.x + 8, p.y + 4, Math.max(0, p.w - 16), 3);
    ctx.restore();
  }

  function drawHazard(h) {
    ctx.save();
    ctx.fillStyle = "#ff4f6d";
    const spikeW = 14;
    const count = Math.max(1, Math.floor(h.w / spikeW));
    const realW = h.w / count;
    for (let i = 0; i < count; i++) {
      const x = h.x + i * realW;
      ctx.beginPath();
      ctx.moveTo(x, h.y + h.h);
      ctx.lineTo(x + realW / 2, h.y);
      ctx.lineTo(x + realW, h.y + h.h);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function drawDoor() {
    const x = level.door[0];
    const y = level.door[1];
    const unlocked = !level.key || level.hasKey;

    ctx.save();
    ctx.shadowColor = unlocked ? "rgba(72,226,155,.4)" : "rgba(255,79,109,.35)";
    ctx.shadowBlur = 22;
    ctx.fillStyle = unlocked ? "#163f35" : "#43202a";
    roundRect(x, y, 46, 52, 6);
    ctx.fill();

    ctx.strokeStyle = unlocked ? "#48e29b" : "#ff4f6d";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = unlocked ? "#48e29b" : "#ff4f6d";
    ctx.beginPath();
    ctx.arc(x + 35, y + 27, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawKey() {
    if (!level.key || level.hasKey) return;
    const [x, y] = level.key;
    const bob = Math.sin(performance.now() / 250) * 4;

    ctx.save();
    ctx.translate(x + 15, y + 15 + bob);
    ctx.shadowColor = "rgba(255,215,74,.5)";
    ctx.shadowBlur = 18;
    ctx.strokeStyle = "#ffd74a";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(-6, 0, 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(1, 0);
    ctx.lineTo(14, 0);
    ctx.lineTo(14, 7);
    ctx.moveTo(8, 0);
    ctx.lineTo(8, 6);
    ctx.stroke();
    ctx.restore();
  }

  function drawPlayer() {
    ctx.save();

    ctx.shadowColor = "rgba(255,255,255,.20)";
    ctx.shadowBlur = 14;

    ctx.fillStyle = player.color;
    roundRect(player.x, player.y + 10, player.w, player.h - 10, 8);
    ctx.fill();

    ctx.fillStyle = "#ffd3b6";
    ctx.beginPath();
    ctx.arc(player.x + player.w / 2, player.y + 9, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#0d1220";
    const facing = input.left ? -1 : 1;
    const eyeX = player.x + player.w / 2 + facing * 4;
    ctx.beginPath();
    ctx.arc(eyeX, player.y + 7, 1.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawHUD() {
    ctx.save();
    ctx.font = "700 18px Arial";
    ctx.fillStyle = "rgba(255,255,255,.88)";
    ctx.fillText(level.name.toUpperCase(), 24, 34);

    ctx.font = "600 14px Arial";
    ctx.fillStyle = "rgba(255,255,255,.55)";
    const objective = level.key
      ? (level.hasKey ? "KEY ✓  →  FIND EXIT" : "FIND KEY 🔑")
      : "FIND EXIT";
    ctx.fillText(objective, 24, 58);
    ctx.restore();
  }

  function draw() {
    if (!level) return;
    drawBackground();
    level.platforms.forEach(p => drawPlatform(p, false));
    (level.moving || []).forEach(p => drawPlatform(p, true));
    level.hazards.forEach(drawHazard);
    drawDoor();
    drawKey();
    drawPlayer();
    drawHUD();
  }

  function loop(timestamp) {
    const dt = Math.min((timestamp - lastTime) / 1000 || 0, 1 / 30);
    lastTime = timestamp;

    update(dt);
    draw();
    rafId = requestAnimationFrame(loop);
  }

  function ensureLoop() {
    if (rafId === null) {
      lastTime = performance.now();
      rafId = requestAnimationFrame(loop);
    }
  }

  function setPaused(value) {
    if (completed) return;
    paused = value;
    pauseOverlay.classList.toggle("hidden", !paused);
  }

  function doJump() {
    input.jumpPressed = true;
  }

  function bindHoldButton(el, key) {
    const down = (e) => {
      e.preventDefault();
      input[key] = true;
      if (key === "jump") doJump();
      if (el.setPointerCapture && e.pointerId !== undefined) {
        try { el.setPointerCapture(e.pointerId); } catch (_) {}
      }
    };

    const up = (e) => {
      e.preventDefault();
      input[key] = false;
    };

    el.addEventListener("pointerdown", down);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("pointerleave", up);
  }

  window.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();

    if (["arrowleft","arrowright","arrowup"," ","a","d","w"].includes(k)) {
      e.preventDefault();
    }

    if (k === "arrowleft" || k === "a") input.left = true;
    if (k === "arrowright" || k === "d") input.right = true;

    if ((k === "arrowup" || k === "w" || k === " ") && !e.repeat) {
      doJump();
    }

    if (k === "r" && screens.game.classList.contains("active")) restartLevel();

    if (k === "escape" && screens.game.classList.contains("active")) {
      setPaused(!paused);
    }
  });

  window.addEventListener("keyup", (e) => {
    const k = e.key.toLowerCase();
    if (k === "arrowleft" || k === "a") input.left = false;
    if (k === "arrowright" || k === "d") input.right = false;
  });

  document.getElementById("playBtn").addEventListener("click", () => loadLevel(save.lastLevel));

  document.getElementById("levelsBtn").addEventListener("click", () => {
    buildLevelGrid();
    showScreen("levels");
  });

  document.getElementById("howBtn").addEventListener("click", () => showScreen("how"));

  document.querySelectorAll(".backBtn").forEach(btn => {
    btn.addEventListener("click", () => showScreen("home"));
  });

  document.getElementById("homeBtn").addEventListener("click", () => showScreen("home"));
  document.getElementById("restartBtn").addEventListener("click", restartLevel);
  document.getElementById("pauseBtn").addEventListener("click", () => setPaused(true));
  document.getElementById("resumeBtn").addEventListener("click", () => setPaused(false));
  document.getElementById("pauseHomeBtn").addEventListener("click", () => {
    setPaused(false);
    showScreen("home");
  });
  document.getElementById("completeHomeBtn").addEventListener("click", () => {
    completeOverlay.classList.add("hidden");
    showScreen("home");
  });

  nextBtn.addEventListener("click", () => {
    completeOverlay.classList.add("hidden");
    if (currentLevel === 30) {
      loadLevel(1);
    } else {
      loadLevel(currentLevel + 1);
    }
  });

  document.getElementById("shareBtn").addEventListener("click", async () => {
    const shareData = {
      title: "Escape The Room",
      text: "Try my Escape The Room game — 30 levels!",
      url: location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(location.href);
        alert("Game link copied!");
      } else {
        prompt("Copy this game link:", location.href);
      }
    } catch (_) {}
  });

  bindHoldButton(document.getElementById("leftBtn"), "left");
  bindHoldButton(document.getElementById("rightBtn"), "right");
  bindHoldButton(document.getElementById("jumpBtn"), "jump");

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && screens.game.classList.contains("active") && !completed) {
      setPaused(true);
    }
  });

  buildLevelGrid();
  showScreen("home");
  ensureLoop();
})();

