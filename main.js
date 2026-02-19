/**
 * Bomberman Retro Revamped - Visual Overhaul Edition
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- Configuration ---
const TILE_SIZE = 40;
const GRID_WIDTH = 15;
const GRID_HEIGHT = 13;
canvas.width = TILE_SIZE * GRID_WIDTH;
canvas.height = TILE_SIZE * GRID_HEIGHT;

const TILE_TYPES = {
    EMPTY: 0,
    WALL_SOLID: 1,
    WALL_BREAKABLE: 2,
    POWERUP_FIRE: 3,
    POWERUP_BOMB: 4,
    POWERUP_SPEED: 5,
    POWERUP_SHIELD: 6
};

const COLORS = {
    PLAYER_BODY: '#ffffff',
    PLAYER_HELMET: '#ffffff',
    PLAYER_VISOR: '#3498db',
    PLAYER_LIMB: '#e74c3c',
    ENEMY: '#ff4757',
    BOMB: '#2f3542',
    EXPLOSION: '#ff4757',
    POWERUP_FIRE: '#ff9f43',
    POWERUP_BOMB: '#54a0ff',
    POWERUP_SPEED: '#feca57',
    POWERUP_SHIELD: '#48dbfb'
};

const THEMES = {
    classic: {
        grass: '#2ed573',
        solid: '#2f3542',
        breakLight: '#95a5a6',
        breakDark: '#7f8c8d'
    },
    retro: {
        grass: '#2f3542',
        solid: '#A5A5A5',
        breakLight: '#d2691e',
        breakDark: '#8b4513'
    },
    neon: {
        grass: '#0a0a12',
        solid: '#16213e',
        breakLight: '#ff9f1c',
        breakDark: '#ff6b35'
    }
};

// --- Assets ---
const playerImg = new Image();
playerImg.src = '/skeleton.png';
const powerupImg = new Image();
powerupImg.src = '/skeleton_powerup.png';

// --- Audio System ---
let audioCtx = null;
let bgMusic = null;
let isAudioOn = true;

function initAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    if (bgMusic) return;
    bgMusic = new Audio('game_loop.mp3');
    bgMusic.loop = true;
    bgMusic.volume = 0.2;
    playBackgroundMusic();
}

function playSFX(type) {
    if (!isAudioOn || !audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    const now = audioCtx.currentTime;

    switch (type) {
        case 'blast':
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.exponentialRampToValueAtTime(40, now + 0.5);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
            osc.start(now);
            osc.stop(now + 0.5);
            break;
        case 'kill':
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.exponentialRampToValueAtTime(110, now + 0.2);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
            osc.start(now);
            osc.stop(now + 0.2);
            break;
        case 'game_over':
            osc.type = 'sine';
            osc.frequency.setValueAtTime(200, now);
            osc.frequency.linearRampToValueAtTime(50, now + 1.5);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 1.5);
            osc.start(now);
            osc.stop(now + 1.5);
            break;
        case 'powerup':
            osc.type = 'sine';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.exponentialRampToValueAtTime(900, now + 0.3);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
            break;
    }
}

function playBackgroundMusic() {
    if (!bgMusic) return;
    if (isAudioOn && currentGameState === GAME_STATES.PLAYING) {
        bgMusic.play().catch(e => console.log("Audio play failed:", e));
    } else {
        bgMusic.pause();
    }
}

// --- Game State ---
const GAME_STATES = { MENU: 'menu', PLAYING: 'playing', GAMEOVER: 'gameover', LEVEL_COMPLETE: 'level_complete', WIN: 'win' };
let currentGameState = GAME_STATES.MENU;
let currentTheme = 'classic';
let currentLevel = 1;

let grid = [];
let player = {
    x: 1, y: 1,
    targetX: 1, targetY: 1,
    isMoving: false,
    speed: 0.15,
    bombRange: 1,
    maxBombs: 1,
    activeBombs: 0,
    lives: 3,
    score: 0,
    shieldTimer: 0,
};

let bombs = [];
let explosions = [];
let particles = [];
let enemies = [];
let gameTime = 180;
let lastTime = 0;
let screenShake = 0;

// --- Initialize Map ---
function initMap() {
    grid = []; enemies = []; bombs = []; explosions = [];
    gameTime = 180;
    player.x = 1; player.y = 1; player.targetX = 1; player.targetY = 1;
    player.isMoving = false; player.lives = 3; player.score = 0;
    player.activeBombs = 0; player.maxBombs = 1; player.bombRange = 1;
}

// --- Menu Handling ---
function setupMenu() {
    const homeScreen = document.getElementById('home-screen');
    const themeButtons = document.querySelectorAll('.theme-btn');

    themeButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            currentTheme = btn.dataset.theme;
            document.documentElement.setAttribute('data-theme', currentTheme);
            homeScreen.classList.add('hidden');
            btn.blur();
            initAudio();
            startGame(true);
        });
    });

    document.getElementById('audio-toggle').addEventListener('click', (e) => {
        isAudioOn = !isAudioOn;
        e.target.innerText = isAudioOn ? '🔊 ON' : '🔇 OFF';
        if (isAudioOn) {
            if (currentGameState === GAME_STATES.PLAYING) bgMusic.play();
        } else {
            if (bgMusic) bgMusic.pause();
        }
    });
}

function startGame(resetAll = false) {
    if (resetAll) {
        currentLevel = 1;
        player.score = 0;
        player.lives = 3;
        player.bombRange = 1;
        player.maxBombs = 1;
        player.speed = 0.15;
    }

    initMap();
    // Generate map with difficulty scaling
    const breakChance = 0.5 + (currentLevel * 0.05);
    for (let y = 0; y < GRID_HEIGHT; y++) {
        grid[y] = [];
        for (let x = 0; x < GRID_WIDTH; x++) {
            if (y === 0 || y === GRID_HEIGHT - 1 || x === 0 || x === GRID_WIDTH - 1) grid[y][x] = TILE_TYPES.WALL_SOLID;
            else if (x % 2 === 0 && y % 2 === 0) grid[y][x] = TILE_TYPES.WALL_SOLID;
            else if ((x < 3 && y < 3)) grid[y][x] = TILE_TYPES.EMPTY;
            else grid[y][x] = Math.random() < Math.min(0.85, breakChance) ? TILE_TYPES.WALL_BREAKABLE : TILE_TYPES.EMPTY;
        }
    }

    const enemyCount = 3 + currentLevel;
    for (let i = 0; i < enemyCount; i++) {
        let rx, ry;
        do {
            rx = Math.floor(Math.random() * (GRID_WIDTH - 4)) + 3;
            ry = Math.floor(Math.random() * (GRID_HEIGHT - 4)) + 3;
        } while (grid[ry][rx] !== TILE_TYPES.EMPTY);
        const enSpeed = Math.min(0.12, 0.04 + (currentLevel * 0.02));
        enemies.push({ x: rx, y: ry, targetX: rx, targetY: ry, isMoving: false, speed: enSpeed, floatOffset: Math.random() * Math.PI * 2 });
    }

    currentGameState = GAME_STATES.PLAYING;
    document.getElementById('overlay').classList.add('hidden');
    document.getElementById('level-msg').classList.add('hidden');
    playBackgroundMusic();
}

function checkLevelComplete() {
    if (enemies.length === 0 && currentGameState === GAME_STATES.PLAYING) {
        if (currentLevel >= 3) {
            currentGameState = GAME_STATES.WIN;
            showOverlay('🏆 VICTORY!', 'Congratulations! You cleared all levels.');
            return;
        }
        currentGameState = GAME_STATES.LEVEL_COMPLETE;
        showOverlay('LEVEL COMPLETE');
        document.getElementById('level-msg').classList.remove('hidden');
        document.getElementById('level-msg').innerText = `LEVEL ${currentLevel} CLEARED!`;
        setTimeout(() => {
            currentLevel++;
            startGame();
        }, 3000);
    }
}

// --- Input Handling ---
const keys = {};
window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (e.code === 'Space') e.preventDefault();
});
window.addEventListener('keyup', e => keys[e.code] = false);

function handleInput() {
    if (currentGameState !== GAME_STATES.PLAYING || player.isMoving) return;
    let dx = 0, dy = 0;
    if (keys['ArrowUp']) dy = -1; else if (keys['ArrowDown']) dy = 1;
    else if (keys['ArrowLeft']) dx = -1; else if (keys['ArrowRight']) dx = 1;

    if (dx !== 0 || dy !== 0) {
        const nextX = player.x + dx; const nextY = player.y + dy;
        if (isWalkable(nextX, nextY)) { player.targetX = nextX; player.targetY = nextY; player.isMoving = true; }
    }
    if (keys['Space']) placeBomb();
}

function isWalkable(x, y) {
    if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) return false;
    const tile = grid[y][x];
    return tile === TILE_TYPES.EMPTY || (tile >= TILE_TYPES.POWERUP_FIRE);
}

function placeBomb() {
    const bx = Math.round(player.x); const by = Math.round(player.y);
    if (player.activeBombs < player.maxBombs && !bombs.some(b => b.x === bx && b.y === by)) {
        bombs.push({ x: bx, y: by, timer: 3000, range: player.bombRange, owner: player });
        player.activeBombs++;
    }
}

function update(dt) {
    if (currentGameState !== GAME_STATES.PLAYING) return;
    gameTime -= dt / 1000;
    if (gameTime <= 0) handlePlayerDeath();
    if (player.shieldTimer > 0) player.shieldTimer -= dt;
    if (screenShake > 0) screenShake -= dt * 0.01;

    if (player.isMoving) {
        const dx = player.targetX - player.x; const dy = player.targetY - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < player.speed) { player.x = player.targetX; player.y = player.targetY; player.isMoving = false; checkPowerups(); }
        else { player.x += (dx / dist) * player.speed; player.y += (dy / dist) * player.speed; }
    }

    for (let i = bombs.length - 1; i >= 0; i--) {
        const b = bombs[i]; b.timer -= dt;
        if (b.timer <= 0) { explode(b); bombs.splice(i, 1); b.owner.activeBombs--; }
    }

    for (let i = explosions.length - 1; i >= 0; i--) {
        const ex = explosions[i]; ex.timer -= dt;
        if (ex.timer <= 0) explosions.splice(i, 1);
        else {
            if (Math.round(player.x) === ex.x && Math.round(player.y) === ex.y && player.shieldTimer <= 0) handlePlayerDeath();
            enemies.forEach((en, eIdx) => {
                if (Math.round(en.x) === ex.x && Math.round(en.y) === ex.y) {
                    enemies.splice(eIdx, 1);
                    spawnParticles(en.x, en.y, COLORS.ENEMY);
                    player.score += 100;
                    playSFX('kill');
                }
            });
        }
    }
    updateEnemies(dt);
    handleInput();
    updateHUD();
    checkLevelComplete();
}

function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        if (p.life <= 0) particles.splice(i, 1);
    }
}

function spawnParticles(x, y, color) {
    for (let i = 0; i < 15; i++) {
        particles.push({
            x: x * TILE_SIZE + TILE_SIZE / 2,
            y: y * TILE_SIZE + TILE_SIZE / 2,
            vx: (Math.random() - 0.5) * 0.2,
            vy: (Math.random() - 0.5) * 0.2,
            life: 500 + Math.random() * 500,
            color: color
        });
    }
}

function updateEnemies(dt) {
    enemies.forEach(en => {
        en.floatOffset += dt * 0.005;
        if (en.isMoving) {
            const dx = en.targetX - en.x; const dy = en.targetY - en.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < en.speed) { en.x = en.targetX; en.y = en.targetY; en.isMoving = false; }
            else { en.x += (dx / dist) * en.speed; en.y += (dy / dist) * en.speed; }
        } else {
            const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
            const safeDirs = dirs.filter(d => {
                const nx = en.x + d[0]; const ny = en.y + d[1];
                if (nx < 0 || nx >= GRID_WIDTH || ny < 0 || ny >= GRID_HEIGHT) return false;
                if (grid[ny][nx] !== TILE_TYPES.EMPTY) return false;
                if (bombs.some(b => b.x === nx && b.y === ny)) return false;
                return true;
            });
            const d = safeDirs.length > 0 ? safeDirs[Math.floor(Math.random() * safeDirs.length)] : dirs[Math.floor(Math.random() * dirs.length)];
            if (d) { en.targetX = en.x + d[0]; en.targetY = en.y + d[1]; en.isMoving = true; }
        }
        if (Math.hypot(en.x - player.x, en.y - player.y) < 0.6 && player.shieldTimer <= 0) handlePlayerDeath();
    });
}

function explode(bomb) {
    screenShake = 10;
    playSFX('blast');
    spawnParticles(bomb.x, bomb.y, '#f1c40f');
    const directions = [[0, 0], [0, 1], [0, -1], [1, 0], [-1, 0]];
    directions.forEach(([dx, dy]) => {
        const isCenter = dx === 0 && dy === 0;
        const limit = isCenter ? 1 : bomb.range;
        for (let d = (isCenter ? 0 : 1); d <= limit; d++) {
            const tx = bomb.x + dx * d; const ty = bomb.y + dy * d;
            if (tx < 0 || tx >= GRID_WIDTH || ty < 0 || ty >= GRID_HEIGHT) break;
            const tile = grid[ty][tx];
            if (tile === TILE_TYPES.WALL_SOLID) break;
            explosions.push({ x: tx, y: ty, timer: 500 });
            if (tile === TILE_TYPES.WALL_BREAKABLE) { grid[ty][tx] = TILE_TYPES.EMPTY; maybeSpawnPowerup(tx, ty); player.score += 10; break; }
            const targetBomb = bombs.find(b => b.x === tx && b.y === ty);
            if (targetBomb && targetBomb !== bomb) targetBomb.timer = 0;
        }
    });
}

function maybeSpawnPowerup(x, y) {
    if (Math.random() < 0.3) {
        const types = [TILE_TYPES.POWERUP_FIRE, TILE_TYPES.POWERUP_BOMB, TILE_TYPES.POWERUP_SPEED, TILE_TYPES.POWERUP_SHIELD];
        grid[y][x] = types[Math.floor(Math.random() * types.length)];
    }
}

function checkPowerups() {
    const x = Math.round(player.x); const y = Math.round(player.y);
    const tile = grid[y][x];
    if (tile >= TILE_TYPES.POWERUP_FIRE) playSFX('powerup');

    if (tile === TILE_TYPES.POWERUP_FIRE) { player.bombRange++; player.score += 50; grid[y][x] = TILE_TYPES.EMPTY; }
    else if (tile === TILE_TYPES.POWERUP_BOMB) { player.maxBombs++; player.score += 50; grid[y][x] = TILE_TYPES.EMPTY; }
    else if (tile === TILE_TYPES.POWERUP_SPEED) { player.speed += 0.02; player.score += 50; grid[y][x] = TILE_TYPES.EMPTY; }
    else if (tile === TILE_TYPES.POWERUP_SHIELD) { player.shieldTimer = 5000; player.score += 50; grid[y][x] = TILE_TYPES.EMPTY; }
}

function handlePlayerDeath() {
    player.lives--;
    screenShake = 20;
    if (player.lives <= 0) {
        currentGameState = GAME_STATES.GAMEOVER;
        showOverlay('GAME OVER');
        playSFX('game_over');
        // Stop music on game over
        if (bgMusic) {
            bgMusic.pause();
            bgMusic.currentTime = 0;
        }
    }
    else {
        player.x = 1; player.y = 1; player.targetX = 1; player.targetY = 1;
        player.isMoving = false; player.shieldTimer = 3000;
    }
}

// --- RENDERING ---
function draw() {
    if (currentGameState === GAME_STATES.MENU) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
    }

    ctx.save();
    if (screenShake > 0) {
        const sx = (Math.random() - 0.5) * screenShake;
        const sy = (Math.random() - 0.5) * screenShake;
        ctx.translate(sx, sy);
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (currentTheme === 'neon') {
        ctx.shadowBlur = 15;
        ctx.shadowColor = 'rgba(0, 243, 255, 0.5)';
    }

    // Background/Grid
    const theme = THEMES[currentTheme] || THEMES.classic;
    for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
            const tile = grid[y][x];
            ctx.fillStyle = theme.grass;
            ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            if (tile === TILE_TYPES.WALL_SOLID) drawSolidWall(x, y, theme.solid);
            else if (tile === TILE_TYPES.WALL_BREAKABLE) drawBreakableWall(x, y, theme.breakLight, theme.breakDark);
            else if (tile >= TILE_TYPES.POWERUP_FIRE) drawPowerup(x, y, tile);
        }
    }

    // Bombs
    bombs.forEach(b => drawBomb(b.x, b.y, b.timer));

    // Explosions
    ctx.fillStyle = COLORS.EXPLOSION;
    explosions.forEach(ex => {
        ctx.globalAlpha = ex.timer / 500;
        ctx.fillRect(ex.x * TILE_SIZE, ex.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(ex.x * TILE_SIZE + TILE_SIZE * 0.2, ex.y * TILE_SIZE + TILE_SIZE * 0.2, TILE_SIZE * 0.6, TILE_SIZE * 0.6);
    });
    ctx.globalAlpha = 1.0;

    // Enemies
    enemies.forEach(en => drawEnemy(en.x, en.y, en.floatOffset));

    // Player
    drawPlayer(player.x, player.y, player.shieldTimer);

    // Particles
    particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / 1000;
        ctx.fillRect(p.x, p.y, 3, 3);
    });
    ctx.globalAlpha = 1.0;

    ctx.restore();
}

function drawSolidWall(x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);

    if (currentTheme === 'neon') {
        ctx.strokeStyle = '#00f3ff';
        ctx.lineWidth = 2;
        ctx.strokeRect(x * TILE_SIZE + 2, y * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4);
        // Inner tech cross
        ctx.beginPath();
        ctx.moveTo(x * TILE_SIZE + 10, y * TILE_SIZE + 10);
        ctx.lineTo(x * TILE_SIZE + 30, y * TILE_SIZE + 30);
        ctx.moveTo(x * TILE_SIZE + 30, y * TILE_SIZE + 10);
        ctx.lineTo(x * TILE_SIZE + 10, y * TILE_SIZE + 30);
        ctx.stroke();
    } else if (currentTheme === 'retro') {
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        // Brick details
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE + 18, TILE_SIZE, 4);
    } else {
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(x * TILE_SIZE + 5, y * TILE_SIZE + 30, TILE_SIZE - 10, 5);
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(x * TILE_SIZE + 5, y * TILE_SIZE + 5, TILE_SIZE - 10, 5);
    }
}

function drawBreakableWall(x, y, light, dark) {
    const px = x * TILE_SIZE;
    const py = y * TILE_SIZE;
    ctx.fillStyle = light;
    ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

    if (currentTheme === 'neon') {
        ctx.strokeStyle = light;
        ctx.lineWidth = 2;
        ctx.strokeRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8);
    } else if (currentTheme === 'retro') {
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = dark;
        ctx.fillRect(px + 2, py + 2, 16, 8);
        ctx.fillRect(px + 20, py + 2, 16, 8);
        ctx.fillRect(px + 12, py + 12, 16, 8);
        ctx.fillRect(px + 2, py + 22, 16, 8);
        ctx.fillRect(px + 20, py + 22, 16, 8);
    } else {
        ctx.fillStyle = dark;
        // Brick pattern
        ctx.fillRect(px + 2, py + 2, 16, 8);
        ctx.fillRect(px + 20, py + 2, 16, 8);
        ctx.fillRect(px + 2, py + 12, 8, 8);
        ctx.fillRect(px + 12, py + 12, 16, 8);
        ctx.fillRect(px + 30, py + 12, 8, 8);
        ctx.fillRect(px + 2, py + 22, 16, 8);
        ctx.fillRect(px + 20, py + 22, 16, 8);
        ctx.fillRect(px + 2, py + 32, 36, 6);
    }
}

function drawBomb(x, y, timer) {
    const px = x * TILE_SIZE + TILE_SIZE / 2;
    const py = y * TILE_SIZE + TILE_SIZE / 2;
    const pulse = Math.sin(timer * 0.01) * 2;

    ctx.fillStyle = COLORS.BOMB;
    ctx.beginPath();
    ctx.arc(px, py, TILE_SIZE / 2.5 + pulse, 0, Math.PI * 2);
    ctx.fill();

    // Fuse
    ctx.strokeStyle = '#95a5a6';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(px, py - 10);
    ctx.lineTo(px + 10, py - 25);
    ctx.stroke();

    // Spark
    ctx.fillStyle = Math.random() > 0.5 ? '#f1c40f' : '#e67e22';
    ctx.beginPath();
    ctx.arc(px + 10, py - 25, 4 + Math.random() * 4, 0, Math.PI * 2);
    ctx.fill();
}

function drawPlayer(x, y, shield) {
    const px = x * TILE_SIZE;
    const py = y * TILE_SIZE;
    const time = Date.now();
    const bob = Math.sin(time * 0.01) * 3;

    ctx.save();
    ctx.translate(px + TILE_SIZE / 2, py + TILE_SIZE / 2);

    // 1. Drop Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(0, 18, 14, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Shield Effect
    if (shield > 0) {
        const shieldPulse = Math.abs(Math.sin(time * 0.01));
        ctx.strokeStyle = COLORS.POWERUP_SHIELD;
        ctx.lineWidth = 2 + shieldPulse * 2;
        ctx.beginPath();
        ctx.arc(0, 0, TILE_SIZE / 1.7, 0, Math.PI * 2);
        ctx.stroke();

        const grad = ctx.createRadialGradient(0, 0, 10, 0, 0, TILE_SIZE / 1.7);
        grad.addColorStop(0, 'transparent');
        grad.addColorStop(1, COLORS.POWERUP_SHIELD);
        ctx.globalAlpha = 0.1 + shieldPulse * 0.1;
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }

    ctx.translate(0, bob); // Add subtle bobbing

    // 3. Draw External Sprite (Transform if powered up)
    const isPoweredUp = player.bombRange > 1 || player.maxBombs > 1 || player.speed > 0.16;
    const activeSprite = isPoweredUp ? powerupImg : playerImg;
    const drawSize = TILE_SIZE * 1.5;
    ctx.drawImage(activeSprite, -drawSize / 2, -drawSize / 2 - 5, drawSize, drawSize);

    ctx.restore();
}

function drawEnemy(x, y, float) {
    const px = x * TILE_SIZE;
    const py = y * TILE_SIZE;
    const time = Date.now();
    const bob = Math.sin(float) * 5;
    const pulse = Math.sin(time * 0.003) * 2;

    ctx.save();
    ctx.translate(px + TILE_SIZE / 2, py + TILE_SIZE / 2);

    // 1. Drop Shadow (Eerie and faint)
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(0, 20, 10 + pulse, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(0, bob);

    // 2. Balloon String (Twisted/Wavy)
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 12);
    for (let i = 0; i < 20; i++) {
        const sy = 12 + i;
        const sx = Math.sin(i * 0.3 + float) * 2;
        ctx.lineTo(sx, sy);
    }
    ctx.stroke();

    // 3. Balloon Body (Creepy dark red with organic gradient)
    const ballGrad = ctx.createRadialGradient(-5, -5, 2, 0, 0, 18);
    ballGrad.addColorStop(0, '#ff4d4d');
    ballGrad.addColorStop(0.7, '#800000');
    ballGrad.addColorStop(1, '#4d0000');

    ctx.fillStyle = ballGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 16 + pulse, 0, Math.PI * 2);
    ctx.fill();

    // 4. THE CREEPY FACE
    // Sclera (Sunken)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.beginPath();
    ctx.ellipse(-6, -2, 4, 3, 0.2, 0, Math.PI * 2); // Left eye socket
    ctx.ellipse(6, -2, 4, 3, -0.2, 0, Math.PI * 2); // Right eye socket
    ctx.fill();

    // Glowing Pupils
    const eyePulse = (Math.sin(time * 0.01) + 1) / 2;
    ctx.fillStyle = '#ffcc00';
    ctx.shadowBlur = 10 * eyePulse;
    ctx.shadowColor = '#ffcc00';
    ctx.beginPath();
    ctx.arc(-5, -2, 1.5, 0, Math.PI * 2);
    ctx.arc(5, -2, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Stitched Mouth
    ctx.strokeStyle = '#1a0000';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-8, 6);
    ctx.quadraticCurveTo(0, 10, 8, 6); // Sinister grin
    ctx.stroke();

    // Stitches
    for (let i = -6; i <= 6; i += 3) {
        ctx.beginPath();
        ctx.moveTo(i, 6);
        ctx.lineTo(i, 9);
        ctx.stroke();
    }

    // Organic Veins (Subtle)
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(-10, -10);
    ctx.lineTo(-14, -14);
    ctx.moveTo(10, -10);
    ctx.lineTo(14, -14);
    ctx.stroke();
    ctx.globalAlpha = 1.0;

    ctx.restore();
}

function drawPowerup(x, y, type) {
    const px = x * TILE_SIZE + TILE_SIZE / 2;
    const py = y * TILE_SIZE + TILE_SIZE / 2;
    let color = COLORS.POWERUP_FIRE;
    if (type === TILE_TYPES.POWERUP_BOMB) color = COLORS.POWERUP_BOMB;
    else if (type === TILE_TYPES.POWERUP_SPEED) color = COLORS.POWERUP_SPEED;
    else if (type === TILE_TYPES.POWERUP_SHIELD) color = COLORS.POWERUP_SHIELD;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(px, py, TILE_SIZE / 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Icon Detail
    ctx.fillStyle = 'white';
    if (type === TILE_TYPES.POWERUP_FIRE) ctx.fillRect(px - 2, py - 8, 4, 16);
    if (type === TILE_TYPES.POWERUP_BOMB) ctx.beginPath(), ctx.arc(px, py, 4, 0, Math.PI * 2), ctx.fill();
    if (type === TILE_TYPES.POWERUP_SPEED) ctx.fillRect(px - 8, py + 2, 16, 4);
    if (type === TILE_TYPES.POWERUP_SHIELD) ctx.fillRect(px - 6, py - 6, 12, 12);
}

function updateHUD() {
    document.getElementById('score').innerText = player.score.toString().padStart(4, '0');
    document.getElementById('lives').innerText = player.lives;
    document.getElementById('timer').innerText = Math.max(0, Math.ceil(gameTime));
    document.getElementById('level-val').innerText = currentLevel;
    document.getElementById('enemy-val').innerText = enemies.length;
    document.getElementById('p-range').innerText = `RANGE: ${player.bombRange}`;
    document.getElementById('p-bombs').innerText = `BOMBS: ${player.maxBombs}`;
    document.getElementById('p-speed').innerText = `SPEED: ${Math.round(player.speed * 10)}`;
}

function showOverlay(title, subtitle = '') {
    document.getElementById('overlay-title').innerText = title;
    const msgEl = document.getElementById('level-msg');
    if (subtitle) { msgEl.innerText = subtitle; msgEl.classList.remove('hidden'); }
    document.getElementById('overlay').classList.remove('hidden');
}
function loop(time) { const dt = time - lastTime; lastTime = time; update(dt); draw(); requestAnimationFrame(loop); }
setupMenu(); requestAnimationFrame(loop);
document.getElementById('restart-btn').addEventListener('click', () => { location.reload(); });
