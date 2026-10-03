import { useEffect, useRef, useState, useCallback } from 'react';

// ========== CONSTANTS ==========
const GRAVITY = 0.7;
const JUMP_FORCE = -13;
const GROUND_Y_OFFSET = 100;
const PLAYER_SIZE = 38;

// ========== TYPES ==========
interface Obstacle {
  x: number;
  width: number;
  height: number;
  type: 'spike' | 'block' | 'tall_block' | 'double_spike' | 'triple_spike' | 'block_spike' | 'portal_gravity' | 'portal_speed' | 'coin' | 'pad';
}

interface ActiveObstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

interface LevelData {
  id: number;
  name: string;
  color: string;
  speed: number;
  obstacles: Obstacle[];
}

type Screen = 'menu' | 'levels' | 'game' | 'dead' | 'win';

// ========== LEVEL GENERATION ==========
function generateLevel(levelNum: number): LevelData {
  const colors = [
    '#00ff88', '#ff4488', '#44aaff', '#ffaa00', '#aa44ff',
    '#ff6644', '#44ffaa', '#ff44ff', '#44ffff', '#ffff44',
    '#ff8844', '#88ff44', '#4488ff', '#ff4444', '#44ff44',
    '#ff44aa', '#44aaff', '#ffaa44', '#aa44ff', '#ffffff'
  ];

  const obstacles: Obstacle[] = [];
  const difficulty = levelNum;
  const totalLength = 4000 + levelNum * 300;
  let x = 500;

  while (x < totalLength) {
    const minGap = Math.max(200 - difficulty * 5, 120);
    const gap = minGap + Math.random() * 120;
    x += gap;

    const r = Math.random();

    if (difficulty <= 3) {
      // Easy levels - just single spikes and blocks
      if (r < 0.5) {
        obstacles.push({ x, width: 36, height: 36, type: 'spike' });
      } else {
        obstacles.push({ x, width: 45, height: 45, type: 'block' });
      }
    } else if (difficulty <= 7) {
      // Medium
      if (r < 0.3) {
        obstacles.push({ x, width: 36, height: 36, type: 'spike' });
      } else if (r < 0.5) {
        obstacles.push({ x, width: 36, height: 36, type: 'double_spike' });
      } else if (r < 0.7) {
        obstacles.push({ x, width: 45, height: 45, type: 'block' });
      } else if (r < 0.85) {
        obstacles.push({ x, width: 40, height: 70, type: 'tall_block' });
      } else {
        obstacles.push({ x, width: 36, height: 36, type: 'coin' });
      }
    } else if (difficulty <= 14) {
      // Hard
      if (r < 0.2) {
        obstacles.push({ x, width: 36, height: 36, type: 'spike' });
      } else if (r < 0.35) {
        obstacles.push({ x, width: 36, height: 36, type: 'double_spike' });
      } else if (r < 0.5) {
        obstacles.push({ x, width: 36, height: 36, type: 'triple_spike' });
      } else if (r < 0.65) {
        obstacles.push({ x, width: 45, height: 45, type: 'block' });
      } else if (r < 0.75) {
        obstacles.push({ x, width: 45, height: 45, type: 'block_spike' });
      } else if (r < 0.85) {
        obstacles.push({ x, width: 40, height: 70, type: 'tall_block' });
      } else if (r < 0.92) {
        obstacles.push({ x, width: 36, height: 36, type: 'coin' });
      } else {
        obstacles.push({ x, width: 30, height: 15, type: 'pad' });
      }
    } else {
      // Very hard
      if (r < 0.2) {
        obstacles.push({ x, width: 36, height: 36, type: 'double_spike' });
      } else if (r < 0.4) {
        obstacles.push({ x, width: 36, height: 36, type: 'triple_spike' });
      } else if (r < 0.55) {
        obstacles.push({ x, width: 45, height: 45, type: 'block_spike' });
      } else if (r < 0.7) {
        obstacles.push({ x, width: 40, height: 70, type: 'tall_block' });
      } else if (r < 0.8) {
        obstacles.push({ x, width: 36, height: 36, type: 'triple_spike' });
        x += 60;
        obstacles.push({ x, width: 45, height: 45, type: 'block' });
      } else if (r < 0.9) {
        obstacles.push({ x, width: 36, height: 36, type: 'coin' });
      } else {
        obstacles.push({ x, width: 30, height: 15, type: 'pad' });
      }
    }

    // Portals in later levels
    if (difficulty >= 5 && Math.random() < 0.05) {
      obstacles.push({ x: x + 300, width: 40, height: 80, type: 'portal_speed' });
    }
  }

  return {
    id: levelNum,
    name: `Level ${levelNum}`,
    color: colors[(levelNum - 1) % 20],
    speed: 5 + levelNum * 0.25,
    obstacles,
  };
}

const ALL_LEVELS: LevelData[] = Array.from({ length: 20 }, (_, i) => generateLevel(i + 1));

// ========== MAIN APP ==========
function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [screen, setScreen] = useState<Screen>('menu');
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [progress, setProgress] = useState(0);
  const [coinCount, setCoinCount] = useState(0);
  const [bestScores, setBestScores] = useState<Record<number, number>>({});
  const [attemptCount, setAttemptCount] = useState(0);

  // Game refs (not state - for animation loop)
  const screenRef = useRef<Screen>('menu');
  const playerRef = useRef({ x: 120, y: 0, vy: 0, rotation: 0, onGround: true });
  const obstaclesRef = useRef<ActiveObstacle[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const speedRef = useRef(5);
  const distRef = useRef(0);
  const maxDistRef = useRef(5000);
  const groundOffsetRef = useRef(0);
  const levelColorRef = useRef('#00ff88');
  const coinsRef = useRef(0);
  const canvasSizeRef = useRef({ w: 800, h: 600 });
  const jumpKeyRef = useRef(false);

  // Keep screenRef in sync
  useEffect(() => {
    screenRef.current = screen;
  }, [screen]);

  const getGroundY = () => canvasSizeRef.current.h - GROUND_Y_OFFSET;

  const addParticles = (x: number, y: number, count: number, color: string) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x, y,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10 - 2,
        life: 1,
        color,
        size: Math.random() * 5 + 2,
      });
    }
  };

  const startLevel = useCallback((levelNum: number) => {
    const level = ALL_LEVELS[levelNum - 1];
    const groundY = getGroundY();

    // Convert level obstacles to active obstacles with absolute Y
    const active: ActiveObstacle[] = [];
    level.obstacles.forEach(obs => {
      if (obs.type === 'coin') {
        active.push({
          x: obs.x,
          y: groundY - 60 - Math.random() * 40,
          width: 20,
          height: 20,
          type: 'coin',
        });
      } else if (obs.type === 'spike') {
        active.push({ x: obs.x, y: groundY - obs.height, width: obs.width, height: obs.height, type: 'spike' });
      } else if (obs.type === 'double_spike') {
        active.push({ x: obs.x, y: groundY - 36, width: 36, height: 36, type: 'spike' });
        active.push({ x: obs.x + 40, y: groundY - 36, width: 36, height: 36, type: 'spike' });
      } else if (obs.type === 'triple_spike') {
        active.push({ x: obs.x, y: groundY - 36, width: 36, height: 36, type: 'spike' });
        active.push({ x: obs.x + 40, y: groundY - 36, width: 36, height: 36, type: 'spike' });
        active.push({ x: obs.x + 80, y: groundY - 36, width: 36, height: 36, type: 'spike' });
      } else if (obs.type === 'block') {
        active.push({ x: obs.x, y: groundY - obs.height, width: obs.width, height: obs.height, type: 'block' });
      } else if (obs.type === 'tall_block') {
        active.push({ x: obs.x, y: groundY - obs.height, width: obs.width, height: obs.height, type: 'block' });
      } else if (obs.type === 'block_spike') {
        active.push({ x: obs.x, y: groundY - 45, width: 45, height: 45, type: 'block' });
        active.push({ x: obs.x + 5, y: groundY - 80, width: 36, height: 36, type: 'spike' });
      } else if (obs.type === 'portal_speed') {
        active.push({ x: obs.x, y: groundY - 80, width: 40, height: 80, type: 'portal_speed' });
      } else if (obs.type === 'portal_gravity') {
        active.push({ x: obs.x, y: groundY - 80, width: 40, height: 80, type: 'portal_gravity' });
      } else if (obs.type === 'pad') {
        active.push({ x: obs.x, y: groundY - 15, width: 30, height: 15, type: 'pad' });
      }
    });

    obstaclesRef.current = active;
    particlesRef.current = [];
    playerRef.current = { x: 120, y: groundY - PLAYER_SIZE, vy: 0, rotation: 0, onGround: true };
    speedRef.current = level.speed;
    distRef.current = 0;
    coinsRef.current = 0;
    groundOffsetRef.current = 0;
    levelColorRef.current = level.color;

    // Calculate max distance (last obstacle x + buffer)
    const lastObsX = active.length > 0 ? Math.max(...active.map(o => o.x)) : 3000;
    maxDistRef.current = lastObsX + 600;

    setProgress(0);
    setCoinCount(0);
    setSelectedLevel(levelNum);
    setAttemptCount(prev => prev + 1);
    setScreen('game');
  }, []);

  const handleDeath = useCallback(() => {
    const p = playerRef.current;
    addParticles(p.x + PLAYER_SIZE / 2, p.y + PLAYER_SIZE / 2, 30, levelColorRef.current);
    addParticles(p.x + PLAYER_SIZE / 2, p.y + PLAYER_SIZE / 2, 20, '#ff4444');
    
    const pct = Math.min(100, Math.floor((distRef.current / maxDistRef.current) * 100));
    setProgress(pct);
    setCoinCount(coinsRef.current);
    setBestScores(prev => ({
      ...prev,
      [selectedLevel]: Math.max(prev[selectedLevel] || 0, pct),
    }));
    setScreen('dead');
  }, [selectedLevel]);

  const handleWin = useCallback(() => {
    setProgress(100);
    setCoinCount(coinsRef.current);
    setBestScores(prev => ({
      ...prev,
      [selectedLevel]: 100,
    }));
    addParticles(canvasSizeRef.current.w / 2, canvasSizeRef.current.h / 2, 50, '#ffff00');
    setScreen('win');
  }, [selectedLevel]);

  // ========== GAME LOOP ==========
  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvasSizeRef.current.w;
    const H = canvasSizeRef.current.h;
    const groundY = getGroundY();
    const color = levelColorRef.current;
    const player = playerRef.current;
    const isPlaying = screenRef.current === 'game';

    // ---- BACKGROUND ----
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, W, H);

    // Background gradient based on level color
    const bgGrad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W);
    bgGrad.addColorStop(0, color + '15');
    bgGrad.addColorStop(1, '#000000');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Background grid
    ctx.strokeStyle = color + '08';
    ctx.lineWidth = 1;
    const gridSize = 60;
    for (let x = 0; x < W; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // ---- GROUND ----
    const gGrad = ctx.createLinearGradient(0, groundY, 0, H);
    gGrad.addColorStop(0, color + '50');
    gGrad.addColorStop(1, '#000');
    ctx.fillStyle = gGrad;
    ctx.fillRect(0, groundY, W, H - groundY);

    // Ground glow line
    ctx.shadowColor = color;
    ctx.shadowBlur = 20;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(W, groundY);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Ground grid
    if (isPlaying) {
      groundOffsetRef.current = (groundOffsetRef.current + speedRef.current) % 50;
    }
    ctx.strokeStyle = color + '20';
    ctx.lineWidth = 1;
    for (let x = -groundOffsetRef.current; x < W; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, groundY);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = groundY + 50; y < H; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // ---- GAME UPDATE ----
    if (isPlaying) {
      // Jump
      if (jumpKeyRef.current && player.onGround) {
        player.vy = JUMP_FORCE;
        player.onGround = false;
        addParticles(player.x + PLAYER_SIZE / 2, player.y + PLAYER_SIZE, 6, color);
        jumpKeyRef.current = false;
      }

      // Physics
      player.vy += GRAVITY;
      player.y += player.vy;

      // Ground check
      if (player.y >= groundY - PLAYER_SIZE) {
        player.y = groundY - PLAYER_SIZE;
        player.vy = 0;
        player.onGround = true;
      }

      // Rotation
      if (!player.onGround) {
        player.rotation += 5;
      } else {
        player.rotation = Math.round(player.rotation / 90) * 90;
      }

      // Move obstacles
      obstaclesRef.current.forEach(o => { o.x -= speedRef.current; });
      obstaclesRef.current = obstaclesRef.current.filter(o => o.x + o.width > -100);

      // Distance
      distRef.current += speedRef.current;
      const pct = Math.min(100, Math.floor((distRef.current / maxDistRef.current) * 100));
      setProgress(pct);

      // Collision detection
      const px = player.x;
      const py = player.y;
      const ps = PLAYER_SIZE;
      const margin = 5;

      for (let i = obstaclesRef.current.length - 1; i >= 0; i--) {
        const o = obstaclesRef.current[i];

        // Coin
        if (o.type === 'coin') {
          if (px + ps > o.x && px < o.x + o.width && py + ps > o.y && py < o.y + o.height) {
            obstaclesRef.current.splice(i, 1);
            coinsRef.current++;
            setCoinCount(coinsRef.current);
            addParticles(o.x + 10, o.y + 10, 10, '#ffff00');
            continue;
          }
          continue;
        }

        // Portal
        if (o.type === 'portal_speed') {
          if (px + ps > o.x && px < o.x + o.width && py + ps > o.y && py < o.y + o.height) {
            speedRef.current += 1.5;
            addParticles(o.x + 20, o.y + 40, 15, '#ffff00');
            obstaclesRef.current.splice(i, 1);
            continue;
          }
          continue;
        }

        if (o.type === 'portal_gravity') {
          if (px + ps > o.x && px < o.x + o.width && py + ps > o.y && py < o.y + o.height) {
            addParticles(o.x + 20, o.y + 40, 15, '#ff00ff');
            obstaclesRef.current.splice(i, 1);
            continue;
          }
          continue;
        }

        // Jump pad
        if (o.type === 'pad') {
          if (px + ps > o.x && px < o.x + o.width && py + ps > o.y && py < o.y + o.height) {
            player.vy = JUMP_FORCE * 1.5;
            player.onGround = false;
            addParticles(o.x + 15, o.y, 10, '#00ff00');
            continue;
          }
          continue;
        }

        // Spike collision
        if (o.type === 'spike') {
          const spikeMargin = 10;
          if (
            px + ps - margin > o.x + spikeMargin &&
            px + margin < o.x + o.width - spikeMargin &&
            py + ps - margin > o.y + o.height * 0.35 &&
            py + margin < o.y + o.height
          ) {
            handleDeath();
            break;
          }
          continue;
        }

        // Block collision
        if (o.type === 'block') {
          if (
            px + ps - margin > o.x + margin &&
            px + margin < o.x + o.width - margin &&
            py + ps - margin > o.y + margin &&
            py + margin < o.y + o.height - margin
          ) {
            handleDeath();
            break;
          }
        }
      }

      // Win check
      if (distRef.current >= maxDistRef.current) {
        handleWin();
      }

      // Trail particles
      if (Math.random() > 0.5) {
        addParticles(player.x, player.y + PLAYER_SIZE / 2, 1, color);
      }
    }

    // ---- DRAW OBSTACLES ----
    obstaclesRef.current.forEach(o => {
      ctx.save();
      if (o.type === 'spike') {
        const grad = ctx.createLinearGradient(o.x, o.y + o.height, o.x, o.y);
        grad.addColorStop(0, color + '60');
        grad.addColorStop(1, color);
        ctx.fillStyle = grad;
        ctx.shadowColor = color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(o.x + o.width / 2, o.y);
        ctx.lineTo(o.x + o.width, o.y + o.height);
        ctx.lineTo(o.x, o.y + o.height);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else if (o.type === 'block') {
        const grad = ctx.createLinearGradient(o.x, o.y, o.x, o.y + o.height);
        grad.addColorStop(0, color);
        grad.addColorStop(1, color + '50');
        ctx.fillStyle = grad;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.fillRect(o.x, o.y, o.width, o.height);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(o.x, o.y, o.width, o.height);
        // Inner detail
        ctx.strokeStyle = color + '40';
        ctx.lineWidth = 1;
        ctx.strokeRect(o.x + 5, o.y + 5, o.width - 10, o.height - 10);
      } else if (o.type === 'portal_speed') {
        ctx.fillStyle = '#ffff0050';
        ctx.shadowColor = '#ffff00';
        ctx.shadowBlur = 25;
        ctx.fillRect(o.x, o.y, o.width, o.height);
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 3;
        ctx.strokeRect(o.x, o.y, o.width, o.height);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⚡', o.x + o.width / 2, o.y + o.height / 2);
      } else if (o.type === 'portal_gravity') {
        ctx.fillStyle = '#ff00ff50';
        ctx.shadowColor = '#ff00ff';
        ctx.shadowBlur = 25;
        ctx.fillRect(o.x, o.y, o.width, o.height);
        ctx.strokeStyle = '#ff00ff';
        ctx.lineWidth = 3;
        ctx.strokeRect(o.x, o.y, o.width, o.height);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('↕', o.x + o.width / 2, o.y + o.height / 2);
      } else if (o.type === 'coin') {
        ctx.fillStyle = '#ffff00';
        ctx.shadowColor = '#ffff00';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(o.x + 10, o.y + 10, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffaa00';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#ffaa00';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('★', o.x + 10, o.y + 11);
      } else if (o.type === 'pad') {
        ctx.fillStyle = '#00ff00';
        ctx.shadowColor = '#00ff00';
        ctx.shadowBlur = 12;
        ctx.fillRect(o.x, o.y, o.width, o.height);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(o.x, o.y, o.width, o.height);
      }
      ctx.restore();
    });

    // ---- DRAW PLAYER ----
    if (isPlaying || screenRef.current === 'dead') {
      if (isPlaying) {
        ctx.save();
        ctx.translate(player.x + PLAYER_SIZE / 2, player.y + PLAYER_SIZE / 2);
        ctx.rotate((player.rotation * Math.PI) / 180);

        ctx.shadowColor = color;
        ctx.shadowBlur = 20;

        // Body
        const pGrad = ctx.createLinearGradient(-PLAYER_SIZE / 2, -PLAYER_SIZE / 2, PLAYER_SIZE / 2, PLAYER_SIZE / 2);
        pGrad.addColorStop(0, color);
        pGrad.addColorStop(1, color + '80');
        ctx.fillStyle = pGrad;
        ctx.fillRect(-PLAYER_SIZE / 2, -PLAYER_SIZE / 2, PLAYER_SIZE, PLAYER_SIZE);

        // Border
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.strokeRect(-PLAYER_SIZE / 2, -PLAYER_SIZE / 2, PLAYER_SIZE, PLAYER_SIZE);

        // Eye
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(4, -3, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(6, -3, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
    }

    // ---- PARTICLES ----
    particlesRef.current.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.2;
      p.life -= 0.02;
      if (p.life > 0) {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    });
    particlesRef.current = particlesRef.current.filter(p => p.life > 0);

    // ---- HUD (during game) ----
    if (isPlaying) {
      const currentPct = Math.min(100, Math.floor((distRef.current / maxDistRef.current) * 100));
      // Progress bar
      ctx.fillStyle = '#ffffff20';
      ctx.fillRect(20, 20, W - 40, 12);
      ctx.fillStyle = color;
      ctx.fillRect(20, 20, (W - 40) * (currentPct / 100), 12);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.strokeRect(20, 20, W - 40, 12);

      // Progress text
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(`${currentPct}%`, W / 2, 38);

      // Coins
      ctx.fillStyle = '#ffff00';
      ctx.font = 'bold 22px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(`★ ${coinsRef.current}`, 20, 45);
    }

    requestAnimationFrame(gameLoop);
  }, [handleDeath, handleWin]);

  // ========== INIT CANVAS ==========
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      canvasSizeRef.current = { w: canvas.width, h: canvas.height };
    };

    resize();
    window.addEventListener('resize', resize);
    requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener('resize', resize);
    };
  }, [gameLoop]);

  // ========== INPUT ==========
  useEffect(() => {
    // Keyboard - global
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        if (screenRef.current === 'game') {
          jumpKeyRef.current = true;
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);

    // Mouse/Touch - on document, but skip if clicking on a button
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (screenRef.current !== 'game') return;
      const target = e.target as HTMLElement;
      // Don't jump if clicking on a button or interactive element
      if (target.tagName === 'BUTTON' || target.closest('button')) return;
      jumpKeyRef.current = true;
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown as EventListener, { passive: true });

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown as EventListener);
    };
  }, []);

  // ========== RENDER ==========
  return (
    <div className="relative w-full h-screen overflow-hidden bg-black select-none">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* ===== MAIN MENU ===== */}
      {screen === 'menu' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-black/70">
          <div className="text-center">
            {/* Cube icon */}
            <div className="mx-auto mb-6 w-24 h-24 border-4 border-green-400 bg-green-500/30 rounded-lg flex items-center justify-center shadow-lg shadow-green-500/50"
              style={{ animation: 'pulse 2s infinite' }}>
              <div className="w-10 h-10 bg-white rounded-full relative">
                <div className="absolute top-1 right-1 w-5 h-5 bg-black rounded-full"></div>
              </div>
            </div>

            <h1 className="text-5xl md:text-7xl font-black text-green-400 mb-2"
              style={{ textShadow: '0 0 30px #00ff88' }}>
              GEOMETRY
            </h1>
            <h1 className="text-5xl md:text-7xl font-black text-blue-400 mb-10"
              style={{ textShadow: '0 0 30px #4488ff' }}>
              DASH
            </h1>

            <button
              onClick={() => setScreen('levels')}
              className="px-16 py-5 text-3xl font-bold text-white bg-gradient-to-r from-green-500 to-blue-600 rounded-2xl shadow-2xl hover:scale-110 active:scale-95 transition-transform border-3 border-white/40 cursor-pointer"
            >
              ▶ ИГРАТЬ
            </button>

            <div className="mt-8 space-y-2">
              <p className="text-gray-300 text-lg">🎮 Space / ↑ — прыжок</p>
              <p className="text-gray-500 text-sm">20 уровней • Порталы • Монеты</p>
            </div>
          </div>
        </div>
      )}

      {/* ===== LEVEL SELECT ===== */}
      {screen === 'levels' && (
        <div className="absolute inset-0 flex flex-col items-center z-10 bg-black/85 overflow-y-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-white mt-8 mb-6">Уровни</h2>

          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-5 gap-4 px-4 max-w-3xl pb-4">
            {ALL_LEVELS.map((level, idx) => {
              const best = bestScores[level.id] || 0;
              const isComplete = best >= 100;
              return (
                <button
                  key={level.id}
                  onClick={() => startLevel(level.id)}
                  className="relative w-full aspect-square rounded-xl border-3 transition-all hover:scale-110 active:scale-95 cursor-pointer flex flex-col items-center justify-center"
                  style={{
                    borderColor: level.color,
                    background: `linear-gradient(135deg, ${level.color}30, ${level.color}05)`,
                    boxShadow: `0 0 15px ${level.color}40`,
                  }}
                >
                  <span className="text-2xl md:text-3xl font-bold text-white">{level.id}</span>
                  {best > 0 && (
                    <span className="text-xs text-yellow-400 font-bold mt-1">
                      {isComplete ? '✓' : `${best}%`}
                    </span>
                  )}
                  {/* Difficulty stars */}
                  <div className="absolute bottom-1 left-1 right-1 flex justify-center gap-0.5">
                    {Array.from({ length: Math.min(5, Math.ceil(level.id / 4)) }).map((_, i) => (
                      <span key={i} className="text-yellow-500 text-[8px]">★</span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setScreen('menu')}
            className="mt-4 mb-8 px-10 py-3 text-xl font-bold text-white bg-gray-700 rounded-xl hover:bg-gray-600 transition-colors border-2 border-white/20 cursor-pointer"
          >
            ← Назад
          </button>
        </div>
      )}

      {/* ===== DEATH SCREEN ===== */}
      {screen === 'dead' && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/75">
          <div className="bg-gray-900/95 p-8 md:p-10 rounded-2xl border-3 border-red-500 text-center max-w-md mx-4 shadow-2xl shadow-red-500/30">
            <h2 className="text-5xl font-black text-red-500 mb-4"
              style={{ textShadow: '0 0 20px #ff4444' }}>
              💀 КРАШ!
            </h2>
            <p className="text-2xl text-white mb-2">Прогресс: <span className="text-green-400 font-bold">{progress}%</span></p>
            <p className="text-xl text-yellow-400 mb-1">★ Монеты: {coinCount}</p>
            <p className="text-sm text-gray-400 mb-6">Попытка #{attemptCount}</p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => startLevel(selectedLevel)}
                className="px-8 py-4 text-xl font-bold text-white bg-gradient-to-r from-green-500 to-blue-600 rounded-xl hover:scale-105 active:scale-95 transition-transform cursor-pointer"
              >
                🔄 Заново
              </button>
              <button
                onClick={() => setScreen('levels')}
                className="px-8 py-4 text-xl font-bold text-white bg-gray-700 rounded-xl hover:bg-gray-600 transition-colors border-2 border-white/20 cursor-pointer"
              >
                📋 Уровни
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== WIN SCREEN ===== */}
      {screen === 'win' && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/75">
          <div className="bg-gray-900/95 p-8 md:p-10 rounded-2xl border-3 border-yellow-400 text-center max-w-md mx-4 shadow-2xl shadow-yellow-500/30">
            <h2 className="text-5xl font-black text-yellow-400 mb-4"
              style={{ textShadow: '0 0 20px #ffaa00' }}>
              🏆 ПОБЕДА!
            </h2>
            <p className="text-3xl text-white mb-2">100%</p>
            <p className="text-xl text-yellow-400 mb-6">★ Монеты: {coinCount}</p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {selectedLevel < 20 && (
                <button
                  onClick={() => startLevel(selectedLevel + 1)}
                  className="px-8 py-4 text-xl font-bold text-white bg-gradient-to-r from-green-500 to-blue-600 rounded-xl hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                >
                  ▶ Дальше
                </button>
              )}
              <button
                onClick={() => setScreen('levels')}
                className="px-8 py-4 text-xl font-bold text-white bg-gray-700 rounded-xl hover:bg-gray-600 transition-colors border-2 border-white/20 cursor-pointer"
              >
                📋 Уровни
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
