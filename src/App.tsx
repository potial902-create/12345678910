import { useEffect, useRef, useState, useCallback } from 'react';

// Game constants
const GRAVITY = 0.8;
const JUMP_FORCE = -14;
const GAME_SPEED_INITIAL = 6;
const GROUND_HEIGHT = 100;
const PLAYER_SIZE = 40;
const OBSTACLE_GAP_MIN = 250;
const OBSTACLE_GAP_MAX = 400;

// Types
interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'spike' | 'block' | 'double_spike' | 'tall_block';
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

interface BackgroundStar {
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
}

type GameState = 'menu' | 'playing' | 'dead';

// Level patterns
const LEVEL_PATTERNS: Obstacle[][] = [
  // Pattern 1: Single spike
  [{ x: 0, y: 0, width: 40, height: 40, type: 'spike' }],
  // Pattern 2: Double spike
  [{ x: 0, y: 0, width: 40, height: 40, type: 'spike' }, { x: 50, y: 0, width: 40, height: 40, type: 'spike' }],
  // Pattern 3: Block
  [{ x: 0, y: 0, width: 50, height: 50, type: 'block' }],
  // Pattern 4: Tall block
  [{ x: 0, y: 0, width: 40, height: 80, type: 'tall_block' }],
  // Pattern 5: Block with spike on top
  [{ x: 0, y: 0, width: 50, height: 50, type: 'block' }, { x: 5, y: -40, width: 40, height: 40, type: 'spike' }],
  // Pattern 6: Triple spike
  [{ x: 0, y: 0, width: 40, height: 40, type: 'spike' }, { x: 50, y: 0, width: 40, height: 40, type: 'spike' }, { x: 100, y: 0, width: 40, height: 40, type: 'spike' }],
];

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const gameStateRef = useRef<GameState>('menu');
  const [gameState, setGameState] = useState<GameState>('menu');
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [attempt, setAttempt] = useState(1);

  // Game state refs for animation loop
  const playerRef = useRef({ x: 100, y: 0, vy: 0, rotation: 0, grounded: true });
  const obstaclesRef = useRef<Obstacle[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const starsRef = useRef<BackgroundStar[]>([]);
  const gameSpeedRef = useRef(GAME_SPEED_INITIAL);
  const distanceRef = useRef(0);
  const lastObstacleXRef = useRef(0);
  const groundOffsetRef = useRef(0);
  const canvasSizeRef = useRef({ width: 0, height: 0 });
  const jumpPressedRef = useRef(false);
  const pulseRef = useRef(0);
  const colorHueRef = useRef(0);

  const getGroundY = useCallback(() => {
    return canvasSizeRef.current.height - GROUND_HEIGHT;
  }, []);

  const initStars = useCallback(() => {
    const stars: BackgroundStar[] = [];
    for (let i = 0; i < 100; i++) {
      stars.push({
        x: Math.random() * canvasSizeRef.current.width,
        y: Math.random() * (canvasSizeRef.current.height - GROUND_HEIGHT),
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.8 + 0.2,
      });
    }
    starsRef.current = stars;
  }, []);

  const spawnParticles = useCallback((x: number, y: number, count: number, color: string) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10 - 3,
        life: 1,
        maxLife: Math.random() * 30 + 20,
        color,
        size: Math.random() * 5 + 2,
      });
    }
  }, []);

  const spawnObstacle = useCallback(() => {
    const groundY = getGroundY();
    const pattern = LEVEL_PATTERNS[Math.floor(Math.random() * LEVEL_PATTERNS.length)];
    const gap = OBSTACLE_GAP_MIN + Math.random() * (OBSTACLE_GAP_MAX - OBSTACLE_GAP_MIN);
    const startX = canvasSizeRef.current.width + gap;

    pattern.forEach(obs => {
      const obstacle: Obstacle = {
        x: startX + obs.x,
        y: groundY - obs.height + obs.y,
        width: obs.width,
        height: obs.height,
        type: obs.type,
      };
      obstaclesRef.current.push(obstacle);
    });

    const maxObsX = Math.max(...pattern.map(o => o.x + o.width));
    lastObstacleXRef.current = startX + maxObsX;
  }, [getGroundY]);

  const checkCollision = useCallback((player: { x: number; y: number }, obstacle: Obstacle): boolean => {
    const px = player.x;
    const py = player.y;
    const ps = PLAYER_SIZE;
    const margin = 5; // Small margin for forgiving collision

    if (obstacle.type === 'spike') {
      // Triangle collision - simplified to inner rectangle
      const spikeMargin = 10;
      return (
        px + ps - margin > obstacle.x + spikeMargin &&
        px + margin < obstacle.x + obstacle.width - spikeMargin &&
        py + ps - margin > obstacle.y + obstacle.height * 0.4 &&
        py + margin < obstacle.y + obstacle.height
      );
    }

    // Rectangle collision for blocks
    return (
      px + ps - margin > obstacle.x + margin &&
      px + margin < obstacle.x + obstacle.width - margin &&
      py + ps - margin > obstacle.y + margin &&
      py + margin < obstacle.y + obstacle.height - margin
    );
  }, []);

  const resetGame = useCallback(() => {
    playerRef.current = { x: 100, y: getGroundY() - PLAYER_SIZE, vy: 0, rotation: 0, grounded: true };
    obstaclesRef.current = [];
    particlesRef.current = [];
    gameSpeedRef.current = GAME_SPEED_INITIAL;
    distanceRef.current = 0;
    lastObstacleXRef.current = canvasSizeRef.current.width;
    groundOffsetRef.current = 0;
    setScore(0);
  }, [getGroundY]);

  const startGame = useCallback(() => {
    resetGame();
    gameStateRef.current = 'playing';
    setGameState('playing');
    spawnObstacle();
  }, [resetGame, spawnObstacle]);

  const die = useCallback(() => {
    gameStateRef.current = 'dead';
    setGameState('dead');
    const player = playerRef.current;
    spawnParticles(player.x + PLAYER_SIZE / 2, player.y + PLAYER_SIZE / 2, 30, '#ff4444');
    spawnParticles(player.x + PLAYER_SIZE / 2, player.y + PLAYER_SIZE / 2, 20, '#ffaa00');
    setBestScore(prev => Math.max(prev, score));
    setAttempt(prev => prev + 1);
  }, [spawnParticles, score]);

  const handleInput = useCallback(() => {
    if (gameStateRef.current === 'menu') {
      startGame();
    } else if (gameStateRef.current === 'playing') {
      jumpPressedRef.current = true;
    } else if (gameStateRef.current === 'dead') {
      startGame();
    }
  }, [startGame]);

  // Game loop
  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvasSizeRef.current;
    const groundY = getGroundY();
    const player = playerRef.current;

    // Update pulse
    pulseRef.current += 0.05;
    colorHueRef.current += 0.3;

    // Clear canvas
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    const hue = (colorHueRef.current % 360);
    bgGradient.addColorStop(0, `hsl(${hue}, 50%, 5%)`);
    bgGradient.addColorStop(0.5, `hsl(${(hue + 30) % 360}, 40%, 10%)`);
    bgGradient.addColorStop(1, `hsl(${(hue + 60) % 360}, 60%, 15%)`);
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Draw stars
    starsRef.current.forEach(star => {
      if (gameStateRef.current === 'playing') {
        star.x -= star.speed * (gameSpeedRef.current / GAME_SPEED_INITIAL);
        if (star.x < 0) {
          star.x = width;
          star.y = Math.random() * (height - GROUND_HEIGHT);
        }
      }
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity * (0.5 + 0.5 * Math.sin(pulseRef.current + star.x))})`;
      ctx.fill();
    });

    // Draw ground
    const groundGradient = ctx.createLinearGradient(0, groundY, 0, height);
    groundGradient.addColorStop(0, `hsl(${(hue + 180) % 360}, 80%, 30%)`);
    groundGradient.addColorStop(1, `hsl(${(hue + 180) % 360}, 60%, 10%)`);
    ctx.fillStyle = groundGradient;
    ctx.fillRect(0, groundY, width, GROUND_HEIGHT);

    // Ground line glow
    ctx.shadowColor = `hsl(${(hue + 180) % 360}, 100%, 60%)`;
    ctx.shadowBlur = 10;
    ctx.strokeStyle = `hsl(${(hue + 180) % 360}, 100%, 60%)`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(width, groundY);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Ground grid pattern
    if (gameStateRef.current === 'playing') {
      groundOffsetRef.current = (groundOffsetRef.current + gameSpeedRef.current) % 50;
    }
    ctx.strokeStyle = `hsla(${(hue + 180) % 360}, 60%, 30%, 0.3)`;
    ctx.lineWidth = 1;
    for (let x = -groundOffsetRef.current; x < width; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, groundY);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = groundY + 50; y < height; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    if (gameStateRef.current === 'playing') {
      // Handle jump
      if (jumpPressedRef.current && player.grounded) {
        player.vy = JUMP_FORCE;
        player.grounded = false;
        jumpPressedRef.current = false;
        spawnParticles(player.x + PLAYER_SIZE / 2, player.y + PLAYER_SIZE, 5, '#00ffaa');
      }
      jumpPressedRef.current = false;

      // Update player physics
      player.vy += GRAVITY;
      player.y += player.vy;

      // Ground collision
      if (player.y >= groundY - PLAYER_SIZE) {
        player.y = groundY - PLAYER_SIZE;
        player.vy = 0;
        player.grounded = true;
      }

      // Rotation
      if (!player.grounded) {
        player.rotation += 5;
      } else {
        player.rotation = Math.round(player.rotation / 90) * 90;
      }

      // Update game speed
      gameSpeedRef.current = GAME_SPEED_INITIAL + distanceRef.current * 0.0005;

      // Update distance/score
      distanceRef.current += gameSpeedRef.current;
      const newScore = Math.floor(distanceRef.current / 10);
      setScore(newScore);

      // Move obstacles
      obstaclesRef.current.forEach(obs => {
        obs.x -= gameSpeedRef.current;
      });

      // Remove off-screen obstacles
      obstaclesRef.current = obstaclesRef.current.filter(obs => obs.x + obs.width > -50);

      // Spawn new obstacles
      if (obstaclesRef.current.length === 0 || 
          obstaclesRef.current[obstaclesRef.current.length - 1].x < width - 200) {
        spawnObstacle();
      }

      // Check collisions
      for (const obs of obstaclesRef.current) {
        if (checkCollision(player, obs)) {
          die();
          break;
        }
      }

      // Trail particles
      if (Math.random() > 0.5) {
        spawnParticles(player.x, player.y + PLAYER_SIZE / 2, 1, `hsl(${hue}, 100%, 60%)`);
      }
    }

    // Draw obstacles
    obstaclesRef.current.forEach(obs => {
      ctx.save();
      if (obs.type === 'spike') {
        // Draw spike (triangle)
        const gradient = ctx.createLinearGradient(obs.x, obs.y + obs.height, obs.x, obs.y);
        gradient.addColorStop(0, `hsl(${(hue + 120) % 360}, 80%, 40%)`);
        gradient.addColorStop(1, `hsl(${(hue + 120) % 360}, 100%, 60%)`);
        
        ctx.fillStyle = gradient;
        ctx.shadowColor = `hsl(${(hue + 120) % 360}, 100%, 60%)`;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(obs.x + obs.width / 2, obs.y);
        ctx.lineTo(obs.x + obs.width, obs.y + obs.height);
        ctx.lineTo(obs.x, obs.y + obs.height);
        ctx.closePath();
        ctx.fill();
        
        // Spike outline
        ctx.strokeStyle = `hsl(${(hue + 120) % 360}, 100%, 80%)`;
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        // Draw block
        const gradient = ctx.createLinearGradient(obs.x, obs.y, obs.x, obs.y + obs.height);
        gradient.addColorStop(0, `hsl(${(hue + 200) % 360}, 70%, 40%)`);
        gradient.addColorStop(1, `hsl(${(hue + 200) % 360}, 60%, 25%)`);
        
        ctx.fillStyle = gradient;
        ctx.shadowColor = `hsl(${(hue + 200) % 360}, 100%, 50%)`;
        ctx.shadowBlur = 6;
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        
        // Block outline
        ctx.strokeStyle = `hsl(${(hue + 200) % 360}, 100%, 70%)`;
        ctx.lineWidth = 2;
        ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
        
        // Inner detail
        ctx.strokeStyle = `hsla(${(hue + 200) % 360}, 100%, 70%, 0.3)`;
        ctx.lineWidth = 1;
        const padding = 6;
        ctx.strokeRect(obs.x + padding, obs.y + padding, obs.width - padding * 2, obs.height - padding * 2);
      }
      ctx.restore();
    });

    // Draw player
    if (gameStateRef.current !== 'dead') {
      ctx.save();
      ctx.translate(player.x + PLAYER_SIZE / 2, player.y + PLAYER_SIZE / 2);
      ctx.rotate((player.rotation * Math.PI) / 180);

      // Player glow
      ctx.shadowColor = `hsl(${hue}, 100%, 60%)`;
      ctx.shadowBlur = 15;

      // Player body
      const playerGradient = ctx.createLinearGradient(-PLAYER_SIZE / 2, -PLAYER_SIZE / 2, PLAYER_SIZE / 2, PLAYER_SIZE / 2);
      playerGradient.addColorStop(0, `hsl(${hue}, 100%, 60%)`);
      playerGradient.addColorStop(1, `hsl(${(hue + 40) % 360}, 100%, 40%)`);
      ctx.fillStyle = playerGradient;
      ctx.fillRect(-PLAYER_SIZE / 2, -PLAYER_SIZE / 2, PLAYER_SIZE, PLAYER_SIZE);

      // Player border
      ctx.strokeStyle = `hsl(${hue}, 100%, 80%)`;
      ctx.lineWidth = 3;
      ctx.strokeRect(-PLAYER_SIZE / 2, -PLAYER_SIZE / 2, PLAYER_SIZE, PLAYER_SIZE);

      // Player icon (eye)
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(4, -2, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(6, -2, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // Draw particles
    particlesRef.current.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.2;
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

    // Remove dead particles
    particlesRef.current = particlesRef.current.filter(p => p.life > 0);

    // Draw score during gameplay
    if (gameStateRef.current === 'playing') {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'right';
      ctx.fillText(`${Math.floor(distanceRef.current / 10)}%`, width - 20, 40);
      
      // Progress bar
      const progressWidth = 200;
      const progress = Math.min((distanceRef.current / 10) % 100, 100);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(width - 20 - progressWidth, 50, progressWidth, 8);
      ctx.fillStyle = `hsl(${hue}, 100%, 60%)`;
      ctx.fillRect(width - 20 - progressWidth, 50, progressWidth * (progress / 100), 8);
    }

    animationRef.current = requestAnimationFrame(gameLoop);
  }, [getGroundY, spawnObstacle, checkCollision, die, spawnParticles]);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      canvasSizeRef.current = { width: canvas.width, height: canvas.height };
      initStars();
    };

    resize();
    window.addEventListener('resize', resize);

    // Set initial player position
    playerRef.current.y = getGroundY() - PLAYER_SIZE;

    // Start game loop
    animationRef.current = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationRef.current);
    };
  }, [gameLoop, initStars, getGroundY]);

  // Input handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        handleInput();
      }
    };

    const handleMouseDown = () => handleInput();
    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      handleInput();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('touchstart', handleTouchStart, { passive: false });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('touchstart', handleTouchStart);
    };
  }, [handleInput]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0" />
      
      {/* Menu Screen */}
      {gameState === 'menu' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
          <div className="text-center">
            <h1 className="text-6xl md:text-8xl font-bold text-white mb-4 animate-float"
              style={{ textShadow: '0 0 20px #00ffaa, 0 0 40px #00ffaa' }}>
              GEOMETRY
            </h1>
            <h1 className="text-6xl md:text-8xl font-bold text-white mb-8 animate-float"
              style={{ textShadow: '0 0 20px #ff44aa, 0 0 40px #ff44aa', animationDelay: '0.5s' }}>
              DASH
            </h1>
            <div className="mt-8 space-y-4">
              <p className="text-xl text-gray-300 animate-pulse-glow">
                Click or press Space to start
              </p>
              <p className="text-sm text-gray-500">
                Tap / Click / Space / ↑ to jump
              </p>
            </div>
            {bestScore > 0 && (
              <p className="mt-6 text-lg text-yellow-400">
                Best: {bestScore}%
              </p>
            )}
          </div>
        </div>
      )}

      {/* Death Screen */}
      {gameState === 'dead' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-black/50">
          <div className="text-center bg-gray-900/80 p-8 rounded-2xl border border-red-500/50 backdrop-blur-sm">
            <h2 className="text-4xl md:text-5xl font-bold text-red-500 mb-4"
              style={{ textShadow: '0 0 10px #ff4444' }}>
              CRASHED!
            </h2>
            <p className="text-2xl text-white mb-2">Score: {score}%</p>
            <p className="text-lg text-yellow-400 mb-2">Best: {Math.max(bestScore, score)}%</p>
            <p className="text-sm text-gray-400 mb-6">Attempt #{attempt}</p>
            <p className="text-lg text-gray-300 animate-pulse-glow">
              Click or press Space to retry
            </p>
          </div>
        </div>
      )}

      {/* Score display during gameplay */}
      {gameState === 'playing' && (
        <div className="absolute top-4 left-4 z-10">
          <p className="text-white/60 text-sm">Attempt #{attempt}</p>
        </div>
      )}
    </div>
  );
}

export default App;
