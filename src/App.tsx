import { useEffect, useRef, useState, useCallback } from 'react';

// Game constants
const GRAVITY = 0.6;
const JUMP_FORCE = -12;
const GROUND_HEIGHT = 80;
const PLAYER_SIZE = 36;

interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'spike' | 'block' | 'portal_gravity' | 'portal_ship' | 'portal_speed' | 'coin' | 'pad';
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface Level {
  id: number;
  name: string;
  color: string;
  bgColor: string;
  speed: number;
  difficulty: number;
  obstacles: Obstacle[];
}

type GameState = 'menu' | 'levelSelect' | 'playing' | 'dead' | 'complete';

// Generate 20 levels
const generateLevels = (): Level[] => {
  const levels: Level[] = [];
  const colors = [
    '#00ff88', '#ff4488', '#44aaff', '#ffaa00', '#aa44ff',
    '#ff6644', '#44ffaa', '#ff44ff', '#44ffff', '#ffff44',
    '#ff8844', '#88ff44', '#4488ff', '#ff4444', '#44ff44',
    '#ff44aa', '#44aaff', '#ffaa44', '#aa44ff', '#ffffff'
  ];

  for (let i = 0; i < 20; i++) {
    const obstacles: Obstacle[] = [];
    const difficulty = i + 1;
    const levelLength = 3000 + i * 200;
    let x = 400;

    while (x < levelLength) {
      const gap = Math.max(150 - difficulty * 3, 80) + Math.random() * 100;
      x += gap;

      const rand = Math.random();
      
      if (rand < 0.4) {
        obstacles.push({ x, y: 0, width: 35, height: 35, type: 'spike' });
      } else if (rand < 0.6) {
        obstacles.push({ x, y: 0, width: 35, height: 35, type: 'spike' });
        obstacles.push({ x: x + 40, y: 0, width: 35, height: 35, type: 'spike' });
      } else if (rand < 0.75) {
        obstacles.push({ x, y: 0, width: 45, height: 45, type: 'block' });
      } else if (rand < 0.85 && i >= 5) {
        obstacles.push({ x, y: 0, width: 35, height: 35, type: 'spike' });
        obstacles.push({ x: x + 40, y: 0, width: 35, height: 35, type: 'spike' });
        obstacles.push({ x: x + 80, y: 0, width: 35, height: 35, type: 'spike' });
      } else if (rand < 0.9 && i >= 8) {
        obstacles.push({ x, y: 0, width: 40, height: 70, type: 'block' });
      } else if (rand < 0.95 && i >= 10) {
        obstacles.push({ x, y: 0, width: 45, height: 45, type: 'block' });
        obstacles.push({ x: x + 5, y: -35, width: 35, height: 35, type: 'spike' });
      }

      if (i >= 3 && Math.random() < 0.1) {
        obstacles.push({ x: x + 200, y: 0, width: 40, height: 80, type: 'portal_gravity' });
      }
      if (i >= 7 && Math.random() < 0.08) {
        obstacles.push({ x: x + 250, y: 0, width: 40, height: 80, type: 'portal_ship' });
      }
      if (i >= 5 && Math.random() < 0.12) {
        obstacles.push({ x: x + 180, y: 0, width: 40, height: 80, type: 'portal_speed' });
      }

      if (Math.random() < 0.3) {
        obstacles.push({ x: x + 100, y: -60 - Math.random() * 40, width: 20, height: 20, type: 'coin' });
      }

      if (i >= 4 && Math.random() < 0.15) {
        obstacles.push({ x: x + 150, y: 0, width: 30, height: 15, type: 'pad' });
      }
    }

    levels.push({
      id: i + 1,
      name: `Level ${i + 1}`,
      color: colors[i],
      bgColor: `hsl(${i * 18}, 60%, 8%)`,
      speed: 5 + i * 0.3,
      difficulty: i + 1,
      obstacles,
    });
  }

  return levels;
};

const LEVELS = generateLevels();

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const [gameState, setGameState] = useState<GameState>('menu');
  const [currentLevel, setCurrentLevel] = useState(0);
  const [score, setScore] = useState(0);
  const [bestScores, setBestScores] = useState<number[]>(new Array(20).fill(0));
  const [coins, setCoins] = useState(0);
  const [attempts, setAttempts] = useState(0);

  const playerRef = useRef({ x: 100, y: 0, vy: 0, rotation: 0, grounded: true, gravity: 1 });
  const obstaclesRef = useRef<Obstacle[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const gameSpeedRef = useRef(5);
  const distanceRef = useRef(0);
  const canvasSizeRef = useRef({ width: 0, height: 0 });
  const jumpRef = useRef(false);
  const levelRef = useRef(0);
  const groundOffsetRef = useRef(0);
  const hueRef = useRef(0);
  const gameStateRef = useRef<GameState>('menu');

  const getGroundY = useCallback(() => {
    return canvasSizeRef.current.height - GROUND_HEIGHT;
  }, []);

  const spawnParticles = useCallback((x: number, y: number, count: number, color: string) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 12,
        vy: (Math.random() - 0.5) * 12,
        life: 1,
        maxLife: Math.random() * 40 + 20,
        color,
        size: Math.random() * 6 + 2,
      });
    }
  }, []);

  const startLevel = useCallback((levelIndex: number) => {
    levelRef.current = levelIndex;
    setCurrentLevel(levelIndex);
    const level = LEVELS[levelIndex];
    
    playerRef.current = { 
      x: 100, 
      y: getGroundY() - PLAYER_SIZE, 
      vy: 0, 
      rotation: 0, 
      grounded: true,
      gravity: 1
    };
    
    const groundY = getGroundY();
    obstaclesRef.current = level.obstacles.map(obs => ({
      ...obs,
      y: obs.type === 'coin' ? groundY + obs.y : groundY - obs.height + obs.y,
    }));
    
    particlesRef.current = [];
    gameSpeedRef.current = level.speed;
    distanceRef.current = 0;
    groundOffsetRef.current = 0;
    setScore(0);
    setCoins(0);
    setAttempts(prev => prev + 1);
    
    gameStateRef.current = 'playing';
    setGameState('playing');
  }, [getGroundY]);

  const die = useCallback(() => {
    gameStateRef.current = 'dead';
    setGameState('dead');
    const player = playerRef.current;
    spawnParticles(player.x + PLAYER_SIZE / 2, player.y + PLAYER_SIZE / 2, 40, LEVELS[levelRef.current].color);
    
    const maxDist = LEVELS[levelRef.current].obstacles.length > 0 ? 
      Math.max(...LEVELS[levelRef.current].obstacles.map(o => o.x)) : 1000;
    const progress = Math.floor((distanceRef.current / maxDist) * 100);
    setBestScores(prev => {
      const newScores = [...prev];
      newScores[levelRef.current] = Math.max(newScores[levelRef.current], progress);
      return newScores;
    });
  }, [spawnParticles]);

  const completeLevel = useCallback(() => {
    gameStateRef.current = 'complete';
    setGameState('complete');
    setBestScores(prev => {
      const newScores = [...prev];
      newScores[levelRef.current] = 100;
      return newScores;
    });
    spawnParticles(canvasSizeRef.current.width / 2, canvasSizeRef.current.height / 2, 60, '#ffff00');
  }, [spawnParticles]);

  const goToMenu = useCallback(() => {
    gameStateRef.current = 'menu';
    setGameState('menu');
  }, []);

  const goToLevelSelect = useCallback(() => {
    gameStateRef.current = 'levelSelect';
    setGameState('levelSelect');
  }, []);

  const handleJump = useCallback(() => {
    if (gameStateRef.current === 'playing') {
      jumpRef.current = true;
    }
  }, []);

  // Game loop
  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvasSizeRef.current;
    const groundY = getGroundY();
    const player = playerRef.current;
    const level = LEVELS[levelRef.current];

    hueRef.current += 0.5;

    // Background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, level.bgColor);
    bgGrad.addColorStop(1, '#000');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Background effects
    for (let i = 0; i < 5; i++) {
      const x = ((hueRef.current * (i + 1) * 0.5) % width);
      ctx.fillStyle = `${level.color}10`;
      ctx.beginPath();
      ctx.arc(x, height * 0.3 + Math.sin(hueRef.current * 0.01 + i) * 50, 100 + i * 20, 0, Math.PI * 2);
      ctx.fill();
    }

    // Ground
    const groundGrad = ctx.createLinearGradient(0, groundY, 0, height);
    groundGrad.addColorStop(0, level.color + '40');
    groundGrad.addColorStop(1, '#000');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, groundY, width, GROUND_HEIGHT);

    // Ground line
    ctx.shadowColor = level.color;
    ctx.shadowBlur = 15;
    ctx.strokeStyle = level.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(width, groundY);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Ground grid
    if (gameStateRef.current === 'playing') {
      groundOffsetRef.current = (groundOffsetRef.current + gameSpeedRef.current) % 40;
    }
    ctx.strokeStyle = level.color + '30';
    ctx.lineWidth = 1;
    for (let x = -groundOffsetRef.current; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, groundY);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    if (gameStateRef.current === 'playing') {
      // Jump logic
      if (jumpRef.current && player.grounded) {
        player.vy = JUMP_FORCE * player.gravity;
        player.grounded = false;
        spawnParticles(player.x + PLAYER_SIZE / 2, player.y + PLAYER_SIZE, 8, level.color);
      }
      jumpRef.current = false;

      // Physics
      player.vy += GRAVITY * player.gravity;
      player.y += player.vy;

      // Ground collision
      if (player.gravity > 0 && player.y >= groundY - PLAYER_SIZE) {
        player.y = groundY - PLAYER_SIZE;
        player.vy = 0;
        player.grounded = true;
      } else if (player.gravity < 0 && player.y <= 50) {
        player.y = 50;
        player.vy = 0;
        player.grounded = true;
      } else if (player.y > height || player.y < -100) {
        die();
      }

      // Rotation
      if (!player.grounded) {
        player.rotation += 6 * player.gravity;
      } else {
        player.rotation = Math.round(player.rotation / 90) * 90;
      }

      // Move obstacles
      obstaclesRef.current.forEach(obs => {
        obs.x -= gameSpeedRef.current;
      });

      // Update distance
      distanceRef.current += gameSpeedRef.current;
      const maxDist = LEVELS[levelRef.current].obstacles.length > 0 ? 
        Math.max(...LEVELS[levelRef.current].obstacles.map(o => o.x + 500)) : 3000;
      const progress = Math.min(100, Math.floor((distanceRef.current / maxDist) * 100));
      setScore(progress);

      // Check collisions
      for (let i = obstaclesRef.current.length - 1; i >= 0; i--) {
        const obs = obstaclesRef.current[i];
        
        if (obs.x + obs.width < -50) {
          obstaclesRef.current.splice(i, 1);
          continue;
        }

        const px = player.x;
        const py = player.y;
        const ps = PLAYER_SIZE;

        if (obs.type === 'coin') {
          if (px + ps > obs.x && px < obs.x + obs.width && py + ps > obs.y && py < obs.y + obs.height) {
            obstaclesRef.current.splice(i, 1);
            setCoins(prev => prev + 1);
            spawnParticles(obs.x + 10, obs.y + 10, 10, '#ffff00');
          }
          continue;
        }

        if (obs.type === 'portal_gravity' || obs.type === 'portal_ship' || obs.type === 'portal_speed') {
          if (px + ps > obs.x && px < obs.x + obs.width && py + ps > obs.y && py < obs.y + obs.height) {
            if (obs.type === 'portal_gravity') {
              player.gravity *= -1;
              spawnParticles(obs.x + 20, obs.y + 40, 15, '#ff00ff');
            } else if (obs.type === 'portal_ship') {
              player.vy = -5;
              spawnParticles(obs.x + 20, obs.y + 40, 15, '#00ffff');
            } else if (obs.type === 'portal_speed') {
              gameSpeedRef.current += 2;
              spawnParticles(obs.x + 20, obs.y + 40, 15, '#ffff00');
            }
            obstaclesRef.current.splice(i, 1);
          }
          continue;
        }

        if (obs.type === 'pad') {
          if (px + ps > obs.x && px < obs.x + obs.width && py + ps > obs.y && py < obs.y + obs.height) {
            player.vy = JUMP_FORCE * 1.5;
            player.grounded = false;
            spawnParticles(obs.x + 15, obs.y, 10, '#00ff00');
          }
          continue;
        }

        // Obstacle collision
        const margin = 6;
        if (obs.type === 'spike') {
          if (px + ps - margin > obs.x + 8 && px + margin < obs.x + obs.width - 8 &&
              py + ps - margin > obs.y + obs.height * 0.3 && py + margin < obs.y + obs.height) {
            die();
            break;
          }
        } else {
          if (px + ps - margin > obs.x + margin && px + margin < obs.x + obs.width - margin &&
              py + ps - margin > obs.y + margin && py + margin < obs.y + obs.height - margin) {
            die();
            break;
          }
        }
      }

      if (distanceRef.current > maxDist) {
        completeLevel();
      }

      if (Math.random() > 0.6) {
        spawnParticles(player.x, player.y + PLAYER_SIZE / 2, 1, level.color);
      }
    }

    // Draw obstacles
    obstaclesRef.current.forEach(obs => {
      ctx.save();
      
      if (obs.type === 'spike') {
        const grad = ctx.createLinearGradient(obs.x, obs.y + obs.height, obs.x, obs.y);
        grad.addColorStop(0, level.color + '80');
        grad.addColorStop(1, level.color);
        ctx.fillStyle = grad;
        ctx.shadowColor = level.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(obs.x + obs.width / 2, obs.y);
        ctx.lineTo(obs.x + obs.width, obs.y + obs.height);
        ctx.lineTo(obs.x, obs.y + obs.height);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = level.color;
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (obs.type === 'block') {
        const grad = ctx.createLinearGradient(obs.x, obs.y, obs.x, obs.y + obs.height);
        grad.addColorStop(0, level.color);
        grad.addColorStop(1, level.color + '60');
        ctx.fillStyle = grad;
        ctx.shadowColor = level.color;
        ctx.shadowBlur = 8;
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        ctx.strokeStyle = level.color;
        ctx.lineWidth = 2;
        ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
      } else if (obs.type === 'portal_gravity') {
        ctx.fillStyle = '#ff00ff80';
        ctx.shadowColor = '#ff00ff';
        ctx.shadowBlur = 20;
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        ctx.strokeStyle = '#ff00ff';
        ctx.lineWidth = 3;
        ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
        ctx.fillStyle = '#fff';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('G', obs.x + 20, obs.y + 50);
      } else if (obs.type === 'portal_ship') {
        ctx.fillStyle = '#00ffff80';
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 20;
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 3;
        ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
        ctx.fillStyle = '#fff';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('S', obs.x + 20, obs.y + 50);
      } else if (obs.type === 'portal_speed') {
        ctx.fillStyle = '#ffff0080';
        ctx.shadowColor = '#ffff00';
        ctx.shadowBlur = 20;
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 3;
        ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
        ctx.fillStyle = '#fff';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('>', obs.x + 20, obs.y + 50);
      } else if (obs.type === 'coin') {
        ctx.fillStyle = '#ffff00';
        ctx.shadowColor = '#ffff00';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(obs.x + 10, obs.y + 10, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffaa00';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (obs.type === 'pad') {
        ctx.fillStyle = '#00ff00';
        ctx.shadowColor = '#00ff00';
        ctx.shadowBlur = 10;
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
      }
      
      ctx.restore();
    });

    // Draw player
    if (gameStateRef.current === 'playing') {
      ctx.save();
      ctx.translate(player.x + PLAYER_SIZE / 2, player.y + PLAYER_SIZE / 2);
      ctx.rotate((player.rotation * Math.PI) / 180);

      ctx.shadowColor = level.color;
      ctx.shadowBlur = 20;

      const playerGrad = ctx.createLinearGradient(-PLAYER_SIZE / 2, -PLAYER_SIZE / 2, PLAYER_SIZE / 2, PLAYER_SIZE / 2);
      playerGrad.addColorStop(0, level.color);
      playerGrad.addColorStop(1, level.color + '80');
      ctx.fillStyle = playerGrad;
      ctx.fillRect(-PLAYER_SIZE / 2, -PLAYER_SIZE / 2, PLAYER_SIZE, PLAYER_SIZE);

      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.strokeRect(-PLAYER_SIZE / 2, -PLAYER_SIZE / 2, PLAYER_SIZE, PLAYER_SIZE);

      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(3, -2, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(5, -2, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // Draw particles
    particlesRef.current.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.3;
      p.life -= 1 / p.maxLife;

      if (p.life > 0) {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }
    });
    particlesRef.current = particlesRef.current.filter(p => p.life > 0);

    // HUD
    if (gameStateRef.current === 'playing') {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 28px Arial';
      ctx.textAlign = 'right';
      ctx.fillText(`${score}%`, width - 30, 40);

      ctx.fillStyle = '#ffffff30';
      ctx.fillRect(width - 230, 50, 200, 10);
      ctx.fillStyle = level.color;
      ctx.fillRect(width - 230, 50, 200 * (score / 100), 10);

      ctx.fillStyle = '#ffff00';
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(`★ ${coins}`, 20, 40);
    }

    animationRef.current = requestAnimationFrame(gameLoop);
  }, [getGroundY, die, completeLevel, spawnParticles, score]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      canvasSizeRef.current = { width: canvas.width, height: canvas.height };
    };

    resize();
    window.addEventListener('resize', resize);
    playerRef.current.y = getGroundY() - PLAYER_SIZE;
    animationRef.current = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationRef.current);
    };
  }, [gameLoop, getGroundY]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        handleJump();
      }
    };
    const handleClick = () => handleJump();
    const handleTouch = (e: TouchEvent) => {
      e.preventDefault();
      handleJump();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handleClick);
    window.addEventListener('touchstart', handleTouch, { passive: false });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleClick);
      window.removeEventListener('touchstart', handleTouch);
    };
  }, [handleJump]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-black">
      <canvas ref={canvasRef} className="absolute inset-0" />
      
      {/* Main Menu */}
      {gameState === 'menu' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
          <div className="bg-black/80 p-12 rounded-3xl border-4 border-green-400 shadow-2xl">
            <h1 className="text-6xl md:text-8xl font-black text-green-400 mb-4 text-center">
              GEOMETRY
            </h1>
            <h1 className="text-6xl md:text-8xl font-black text-blue-400 mb-12 text-center">
              DASH
            </h1>
            <button
              onClick={(e) => { e.stopPropagation(); goToLevelSelect(); }}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              className="w-full px-16 py-6 text-3xl font-bold text-white bg-gradient-to-r from-green-500 to-blue-600 rounded-2xl shadow-lg hover:from-green-600 hover:to-blue-700 transition-all transform hover:scale-105 border-4 border-white/30 cursor-pointer"
            >
              ▶ ИГРАТЬ
            </button>
            <p className="mt-8 text-gray-300 text-center text-lg">
              Space / ↑ / Клик = Прыжок
            </p>
          </div>
        </div>
      )}

      {/* Level Select */}
      {gameState === 'levelSelect' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-black/90 overflow-y-auto py-8">
          <h2 className="text-5xl font-bold text-white mb-8">Выбери уровень</h2>
          <div className="grid grid-cols-4 md:grid-cols-5 gap-4 max-w-4xl px-4">
            {LEVELS.map((level, idx) => (
              <button
                key={level.id}
                onClick={(e) => { e.stopPropagation(); startLevel(idx); }}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                className="relative w-24 h-24 rounded-xl border-4 transition-all hover:scale-110 active:scale-95 cursor-pointer"
                style={{ 
                  borderColor: level.color,
                  background: `linear-gradient(135deg, ${level.color}40, ${level.color}10)`,
                  boxShadow: `0 0 20px ${level.color}60`
                }}
              >
                <span className="text-3xl font-bold text-white">{level.id}</span>
                {bestScores[idx] > 0 && (
                  <span className="absolute bottom-1 right-1 text-sm text-yellow-400 font-bold">
                    {bestScores[idx]}%
                  </span>
                )}
              </button>
            ))}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); goToMenu(); }}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            className="mt-8 px-12 py-4 text-2xl font-bold text-white bg-gray-700 rounded-xl hover:bg-gray-600 transition-colors border-2 border-white/30 cursor-pointer"
          >
            ← Назад
          </button>
        </div>
      )}

      {/* Death Screen */}
      {gameState === 'dead' && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/80">
          <div className="bg-gray-900 p-10 rounded-2xl border-4 border-red-500 text-center">
            <h2 className="text-6xl font-bold text-red-500 mb-6">КРАШ!</h2>
            <p className="text-3xl text-white mb-4">Прогресс: {score}%</p>
            <p className="text-2xl text-yellow-400 mb-6">Монеты: ★ {coins}</p>
            <div className="flex gap-4">
              <button
                onClick={(e) => { e.stopPropagation(); startLevel(levelRef.current); }}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                className="px-10 py-4 text-2xl font-bold text-white bg-gradient-to-r from-green-500 to-blue-600 rounded-xl hover:scale-105 transition-transform border-2 border-white/30 cursor-pointer"
              >
                🔄 Заново
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); goToLevelSelect(); }}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                className="px-10 py-4 text-2xl font-bold text-white bg-gray-700 rounded-xl hover:bg-gray-600 transition-colors border-2 border-white/30 cursor-pointer"
              >
                📋 Уровни
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Level Complete */}
      {gameState === 'complete' && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/80">
          <div className="bg-gray-900 p-10 rounded-2xl border-4 border-yellow-500 text-center">
            <h2 className="text-6xl font-bold text-yellow-400 mb-6">УРОВЕНЬ ПРОЙДЕН!</h2>
            <p className="text-4xl text-white mb-4">100%</p>
            <p className="text-3xl text-yellow-400 mb-8">Монеты: ★ {coins}</p>
            <div className="flex gap-4">
              {currentLevel < 19 && (
                <button
                  onClick={(e) => { e.stopPropagation(); startLevel(currentLevel + 1); }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  className="px-10 py-4 text-2xl font-bold text-white bg-gradient-to-r from-green-500 to-blue-600 rounded-xl hover:scale-105 transition-transform border-2 border-white/30 cursor-pointer"
                >
                  ▶ Дальше
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); goToLevelSelect(); }}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                className="px-10 py-4 text-2xl font-bold text-white bg-gray-700 rounded-xl hover:bg-gray-600 transition-colors border-2 border-white/30 cursor-pointer"
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
