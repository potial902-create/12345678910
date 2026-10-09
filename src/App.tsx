import { useEffect, useRef, useState } from 'react';

type Screen = 'menu' | 'levels' | 'game' | 'dead' | 'win' | 'editor';
type GameMode = 'cube' | 'ship' | 'wave' | 'ball';

interface Obstacle {
  x: number; y: number; w: number; h: number;
  type: 'spike' | 'block' | 'portal_ship' | 'portal_cube' | 'portal_wave' | 'portal_ball' | 'coin' | 'jump_pad';
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [progress, setProgress] = useState(0);
  const [coins, setCoins] = useState(0);
  const [customLevel, setCustomLevel] = useState<Obstacle[]>([]);

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#000' }}>
      {screen === 'menu' && <MenuScreen onPlay={() => { setSelectedLevel(1); setScreen('game'); }} onLevels={() => setScreen('levels')} onEditor={() => setScreen('editor')} />}
      {screen === 'levels' && <LevelsScreen onSelect={(lvl) => { setSelectedLevel(lvl); setScreen('game'); }} onBack={() => setScreen('menu')} />}
      {screen === 'game' && <GameScreen level={selectedLevel} customObstacles={customLevel} onDeath={(p, c) => { setProgress(p); setCoins(c); setScreen('dead'); }} onWin={(c) => { setCoins(c); setScreen('win'); }} />}
      {screen === 'dead' && <DeathScreen progress={progress} coins={coins} onRetry={() => setScreen('game')} onMenu={() => setScreen('menu')} />}
      {screen === 'win' && <WinScreen coins={coins} onNext={() => { setSelectedLevel(prev => prev + 1); setScreen('game'); }} onRetry={() => setScreen('game')} onMenu={() => setScreen('menu')} />}
      {screen === 'editor' && <EditorScreen onSave={(obs) => { setCustomLevel(obs); setSelectedLevel(99); setScreen('game'); }} onBack={() => setScreen('menu')} />}
    </div>
  );
}

function MenuScreen({ onPlay, onLevels, onEditor }: { onPlay: () => void; onLevels: () => void; onEditor: () => void }) {
  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(180deg, #0a0020 0%, #100838 50%, #0d0628 100%)',
      position: 'relative', overflow: 'hidden'
    }}>
      {/* Animated background elements */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.1 }}>
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            width: `${20 + Math.random() * 40}px`,
            height: `${20 + Math.random() * 40}px`,
            border: '2px solid #4488ff',
            transform: `rotate(${Math.random() * 360}deg)`,
            animation: `float${i % 3} ${3 + Math.random() * 2}s ease-in-out infinite`
          }} />
        ))}
      </div>

      <h1 style={{
        fontSize: 'clamp(3rem, 8vw, 6rem)', fontWeight: 'bold', color: '#4488ff',
        textShadow: '0 0 30px #4488ff, 0 0 60px #4488ff', marginBottom: '0.5rem',
        position: 'relative', zIndex: 1
      }}>
        GEOMETRY
      </h1>
      <h1 style={{
        fontSize: 'clamp(3rem, 8vw, 6rem)', fontWeight: 'bold', color: '#ff44aa',
        textShadow: '0 0 30px #ff44aa, 0 0 60px #ff44aa', marginBottom: '3rem',
        position: 'relative', zIndex: 1
      }}>
        DASH
      </h1>
      
      {/* Cube character */}
      <div style={{
        width: '120px', height: '120px',
        background: 'linear-gradient(135deg, #00ff88, #00cc66)',
        border: '4px solid white', borderRadius: '16px',
        marginBottom: '3rem', position: 'relative',
        boxShadow: '0 0 40px #00ff88',
        animation: 'cubeFloat 2s ease-in-out infinite',
        zIndex: 1
      }}>
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '50px', height: '50px',
          background: 'white', borderRadius: '50%'
        }}>
          <div style={{
            position: 'absolute', top: '10px', right: '10px',
            width: '20px', height: '20px',
            background: 'black', borderRadius: '50%'
          }} />
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '300px', position: 'relative', zIndex: 1 }}>
        <MenuButton onClick={onPlay} color="#00ff88" icon="▶" text="ИГРАТЬ" />
        <MenuButton onClick={onLevels} color="#4488ff" icon="📋" text="УРОВНИ" />
        <MenuButton onClick={onEditor} color="#ffaa00" icon="🔧" text="РЕДАКТОР" />
      </div>

      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', marginTop: '2rem', position: 'relative', zIndex: 1 }}>
        Space / ↑ / Клик — прыжок
      </p>

      <style>{`
        @keyframes cubeFloat {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-15px) rotate(-3deg); }
          75% { transform: translateY(-8px) rotate(3deg); }
        }
        @keyframes float0 { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-20px) rotate(180deg); } }
        @keyframes float1 { 0%, 100% { transform: translateY(0) rotate(45deg); } 50% { transform: translateY(-30px) rotate(225deg); } }
        @keyframes float2 { 0%, 100% { transform: translateY(0) rotate(90deg); } 50% { transform: translateY(-25px) rotate(270deg); } }
      `}</style>
    </div>
  );
}

function MenuButton({ onClick, color, icon, text }: { onClick: () => void; color: string; icon: string; text: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '1.2rem 2rem', fontSize: '1.5rem', fontWeight: 'bold',
        color: 'white',
        background: `linear-gradient(135deg, ${color}, ${color}cc)`,
        border: `3px solid ${color}`,
        borderRadius: '16px',
        cursor: 'pointer',
        boxShadow: `0 0 20px ${color}80, 0 4px 15px rgba(0,0,0,0.4)`,
        transition: 'all 0.2s',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.05)';
        e.currentTarget.style.boxShadow = `0 0 30px ${color}, 0 6px 20px rgba(0,0,0,0.5)`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = `0 0 20px ${color}80, 0 4px 15px rgba(0,0,0,0.4)`;
      }}
    >
      <span style={{ fontSize: '1.8rem' }}>{icon}</span>
      {text}
    </button>
  );
}

function LevelsScreen({ onSelect, onBack }: { onSelect: (lvl: number) => void; onBack: () => void }) {
  const levels = [
    { id: 1, name: 'Stereo Madness', color: '#00ff88' },
    { id: 2, name: 'Back On Track', color: '#4488ff' },
    { id: 3, name: 'Polargeist', color: '#ff44aa' },
    { id: 4, name: 'Dry Out', color: '#ffaa00' },
    { id: 5, name: 'Base After Base', color: '#aa44ff' },
  ];

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(180deg, #0a0020 0%, #100838 100%)',
      padding: '2rem'
    }}>
      <h2 style={{ fontSize: '3rem', color: 'white', marginBottom: '2rem', textShadow: '0 0 20px #4488ff' }}>
        УРОВНИ
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', maxWidth: '800px', width: '100%' }}>
        {levels.map(lvl => (
          <button
            key={lvl.id}
            onClick={() => onSelect(lvl.id)}
            style={{
              padding: '1.5rem', fontSize: '1.2rem', fontWeight: 'bold',
              color: 'white',
              background: `linear-gradient(135deg, ${lvl.color}40, ${lvl.color}20)`,
              border: `3px solid ${lvl.color}`,
              borderRadius: '12px',
              cursor: 'pointer',
              boxShadow: `0 0 15px ${lvl.color}60`,
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow = `0 0 25px ${lvl.color}`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = `0 0 15px ${lvl.color}60`;
            }}
          >
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{lvl.id}</div>
            <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>{lvl.name}</div>
          </button>
        ))}
      </div>
      <button
        onClick={onBack}
        style={{
          marginTop: '2rem', padding: '1rem 2rem', fontSize: '1.2rem',
          color: 'white', background: '#444',
          border: '2px solid rgba(255,255,255,0.3)', borderRadius: '12px',
          cursor: 'pointer'
        }}
      >
        ← Назад
      </button>
    </div>
  );
}

function DeathScreen({ progress, coins, onRetry, onMenu }: { progress: number; coins: number; onRetry: () => void; onMenu: () => void }) {
  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.85)'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #1a1a1a, #0a0a0a)',
        padding: '3rem', borderRadius: '20px',
        border: '4px solid #ff4444', textAlign: 'center',
        boxShadow: '0 0 50px #ff444460'
      }}>
        <h2 style={{ fontSize: '4rem', color: '#ff4444', marginBottom: '1.5rem', textShadow: '0 0 30px #ff4444' }}>
          💀 КРАШ!
        </h2>
        <p style={{ fontSize: '2rem', color: 'white', marginBottom: '0.5rem' }}>
          Прогресс: <span style={{ color: '#00ff88', fontWeight: 'bold' }}>{progress}%</span>
        </p>
        <p style={{ fontSize: '1.5rem', color: '#ffff00', marginBottom: '2rem' }}>
          ★ Монеты: {coins}
        </p>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={onRetry} style={{
            padding: '1rem 2rem', fontSize: '1.3rem', fontWeight: 'bold',
            color: 'white', background: 'linear-gradient(135deg, #00dd77, #00aa55)',
            border: '3px solid #00ff88', borderRadius: '12px',
            cursor: 'pointer', boxShadow: '0 0 20px #00ff8860'
          }}>
            🔄 Заново
          </button>
          <button onClick={onMenu} style={{
            padding: '1rem 2rem', fontSize: '1.3rem', fontWeight: 'bold',
            color: 'white', background: '#444',
            border: '2px solid rgba(255,255,255,0.3)', borderRadius: '12px',
            cursor: 'pointer'
          }}>
            🏠 Меню
          </button>
        </div>
      </div>
    </div>
  );
}

function WinScreen({ coins, onNext, onRetry, onMenu }: { coins: number; onNext: () => void; onRetry: () => void; onMenu: () => void }) {
  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.85)'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #1a1a1a, #0a0a0a)',
        padding: '3rem', borderRadius: '20px',
        border: '4px solid #ffaa00', textAlign: 'center',
        boxShadow: '0 0 50px #ffaa0060'
      }}>
        <h2 style={{ fontSize: '4rem', color: '#ffaa00', marginBottom: '1.5rem', textShadow: '0 0 30px #ffaa00' }}>
          🏆 ПОБЕДА!
        </h2>
        <p style={{ fontSize: '3rem', color: 'white', marginBottom: '0.5rem' }}>100%</p>
        <p style={{ fontSize: '2rem', color: '#ffff00', marginBottom: '2rem' }}>
          ★ Монеты: {coins}
        </p>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button onClick={onNext} style={{
            padding: '1rem 2rem', fontSize: '1.3rem', fontWeight: 'bold',
            color: 'white', background: 'linear-gradient(135deg, #00dd77, #00aa55)',
            border: '3px solid #00ff88', borderRadius: '12px',
            cursor: 'pointer', boxShadow: '0 0 20px #00ff8860'
          }}>
            ▶ Дальше
          </button>
          <button onClick={onRetry} style={{
            padding: '1rem 2rem', fontSize: '1.3rem', fontWeight: 'bold',
            color: 'white', background: '#444',
            border: '2px solid rgba(255,255,255,0.3)', borderRadius: '12px',
            cursor: 'pointer'
          }}>
            🔄 Снова
          </button>
          <button onClick={onMenu} style={{
            padding: '1rem 2rem', fontSize: '1.3rem', fontWeight: 'bold',
            color: 'white', background: '#444',
            border: '2px solid rgba(255,255,255,0.3)', borderRadius: '12px',
            cursor: 'pointer'
          }}>
            🏠 Меню
          </button>
        </div>
      </div>
    </div>
  );
}

function EditorScreen({ onSave, onBack }: { onSave: (obs: Obstacle[]) => void; onBack: () => void }) {
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [selectedType, setSelectedType] = useState<Obstacle['type']>('spike');

  const addObstacle = (x: number) => {
    const newObs: Obstacle = {
      x, y: 0, w: 36, h: 36, type: selectedType
    };
    setObstacles([...obstacles, newObs]);
  };

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      background: 'linear-gradient(180deg, #0a0020 0%, #100838 100%)',
      padding: '2rem'
    }}>
      <h2 style={{ fontSize: '2.5rem', color: 'white', marginBottom: '1rem', textShadow: '0 0 20px #ffaa00' }}>
        🔧 РЕДАКТОР УРОВНЕЙ
      </h2>
      
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {(['spike', 'block', 'coin', 'jump_pad', 'portal_ship', 'portal_cube', 'portal_wave', 'portal_ball'] as const).map(type => (
          <button
            key={type}
            onClick={() => setSelectedType(type)}
            style={{
              padding: '0.8rem 1.5rem', fontSize: '1rem', fontWeight: 'bold',
              color: 'white',
              background: selectedType === type ? '#ffaa00' : '#444',
              border: `2px solid ${selectedType === type ? '#ffaa00' : '#666'}`,
              borderRadius: '8px', cursor: 'pointer'
            }}
          >
            {type === 'spike' ? '🔺 Шип' : type === 'block' ? '🟦 Блок' : type === 'coin' ? '⭐ Монета' : type === 'jump_pad' ? '🟢 Пад' : type === 'portal_ship' ? '🚀 Корабль' : type === 'portal_wave' ? '🌊 Волна' : type === 'portal_ball' ? '⚽ Мяч' : '⬛ Куб'}
          </button>
        ))}
      </div>

      <div style={{
        flex: 1, background: '#0a0a20', borderRadius: '12px',
        border: '2px solid #444', position: 'relative', overflow: 'hidden',
        marginBottom: '1rem'
      }}>
        <div style={{
          position: 'absolute', bottom: '80px', left: 0, right: 0,
          height: '3px', background: '#00ff88'
        }} />
        {obstacles.map((obs, i) => (
          <div
            key={i}
            onClick={() => setObstacles(obstacles.filter((_, idx) => idx !== i))}
            style={{
              position: 'absolute',
              left: `${(obs.x / 5000) * 100}%`,
              bottom: obs.type === 'coin' ? '150px' : '80px',
              width: '30px', height: '30px',
              background: obs.type === 'spike' ? '#ff4444' : obs.type === 'coin' ? '#ffff00' : obs.type === 'jump_pad' ? '#00ff00' : '#4488ff',
              border: '2px solid white',
              borderRadius: obs.type === 'coin' ? '50%' : '4px',
              cursor: 'pointer'
            }}
            title="Клик чтобы удалить"
          />
        ))}
        <button
          onClick={() => addObstacle(500 + obstacles.length * 200)}
          style={{
            position: 'absolute', bottom: '10px', right: '10px',
            padding: '0.8rem 1.5rem', fontSize: '1rem', fontWeight: 'bold',
            color: 'white', background: '#00ff88',
            border: '2px solid white', borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          + Добавить
        </button>
      </div>

      <div style={{ display: 'flex', gap: '1rem' }}>
        <button onClick={() => onSave(obstacles)} style={{
          flex: 1, padding: '1rem', fontSize: '1.2rem', fontWeight: 'bold',
          color: 'white', background: 'linear-gradient(135deg, #00dd77, #00aa55)',
          border: '3px solid #00ff88', borderRadius: '12px',
          cursor: 'pointer', boxShadow: '0 0 20px #00ff8860'
        }}>
          💾 Сохранить и играть
        </button>
        <button onClick={onBack} style={{
          padding: '1rem 2rem', fontSize: '1.2rem', fontWeight: 'bold',
          color: 'white', background: '#444',
          border: '2px solid rgba(255,255,255,0.3)', borderRadius: '12px',
          cursor: 'pointer'
        }}>
          ← Назад
        </button>
      </div>
    </div>
  );
}

function GameScreen({ level, customObstacles, onDeath, onWin }: { level: number; customObstacles: Obstacle[]; onDeath: (pct: number, coins: number) => void; onWin: (coins: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    px: 120, py: 0, vy: 0, rot: 0, onGround: true,
    speed: 7, dist: 0, maxDist: 6000,
    obstacles: [] as { x: number; y: number; w: number; h: number; type: string }[],
    alive: true, jumpPressed: false, holdingJump: false,
    mode: 'cube' as GameMode,
    coins: 0,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    const groundY = () => canvas.height - 100;
    const s = stateRef.current;
    const color = ['#00ff88', '#4488ff', '#ff44aa', '#ffaa00', '#aa44ff'][level - 1] || '#00ff88';

    // Generate obstacles
    if (level === 99 && customObstacles.length > 0) {
      s.obstacles = customObstacles.map(o => ({
        x: o.x, y: o.type === 'coin' ? groundY() - 80 : groundY() - o.h,
        w: o.w, h: o.h, type: o.type
      }));
    } else {
      s.obstacles = [];
      let x = 500;
      for (let i = 0; i < 40; i++) {
        x += 200 + Math.random() * 100;
        const r = Math.random();
        if (r < 0.4) {
          s.obstacles.push({ x, y: groundY() - 36, w: 36, h: 36, type: 'spike' });
        } else if (r < 0.7) {
          s.obstacles.push({ x, y: groundY() - 45, w: 45, h: 45, type: 'block' });
        } else if (r < 0.85) {
          s.obstacles.push({ x, y: groundY() - 80, w: 20, h: 20, type: 'coin' });
        } else {
          s.obstacles.push({ x, y: groundY() - 15, w: 30, h: 15, type: 'jump_pad' });
        }
      }
      
      // Add portals based on level
      if (level >= 2) {
        const portalX = x + 300;
        s.obstacles.push({ x: portalX, y: groundY() - 120, w: 40, h: 80, type: 'portal_ship' });
        x = portalX + 500;
        for (let i = 0; i < 10; i++) {
          x += 180;
          s.obstacles.push({ x, y: groundY() - 36, w: 36, h: 36, type: 'spike' });
        }
        s.obstacles.push({ x: x + 300, y: groundY() - 120, w: 40, h: 80, type: 'portal_cube' });
        x += 600;
      }
      
      if (level >= 3) {
        const wavePortalX = x + 300;
        s.obstacles.push({ x: wavePortalX, y: groundY() - 120, w: 40, h: 80, type: 'portal_wave' });
        x = wavePortalX + 500;
        for (let i = 0; i < 12; i++) {
          x += 150;
          s.obstacles.push({ x, y: groundY() - 36, w: 36, h: 36, type: 'spike' });
        }
        s.obstacles.push({ x: x + 300, y: groundY() - 120, w: 40, h: 80, type: 'portal_cube' });
        x += 600;
      }
      
      if (level >= 4) {
        const ballPortalX = x + 300;
        s.obstacles.push({ x: ballPortalX, y: groundY() - 120, w: 40, h: 80, type: 'portal_ball' });
        x = ballPortalX + 500;
        for (let i = 0; i < 15; i++) {
          x += 140;
          s.obstacles.push({ x, y: groundY() - 36, w: 36, h: 36, type: 'spike' });
        }
        s.obstacles.push({ x: x + 300, y: groundY() - 120, w: 40, h: 80, type: 'portal_cube' });
        x += 600;
      }
    }
    
    s.maxDist = Math.max(...s.obstacles.map(o => o.x)) + 500;
    s.px = 120; s.py = groundY() - 38; s.vy = 0; s.rot = 0;
    s.onGround = true; s.dist = 0; s.alive = true;
    s.mode = 'cube'; s.coins = 0;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        s.jumpPressed = true;
        s.holdingJump = true;
      }
    };
    const onKeyUp = () => { s.holdingJump = false; };
    const onClick = () => { s.jumpPressed = true; s.holdingJump = true; };
    const onMouseUp = () => { s.holdingJump = false; };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    canvas.addEventListener('mousedown', onClick);
    window.addEventListener('mouseup', onMouseUp);

    const loop = () => {
      const w = canvas.width;
      const h = canvas.height;
      const gy = groundY();

      ctx.fillStyle = '#0a0a20';
      ctx.fillRect(0, 0, w, h);

      const gGrad = ctx.createLinearGradient(0, gy, 0, h);
      gGrad.addColorStop(0, color + '40');
      gGrad.addColorStop(1, '#000');
      ctx.fillStyle = gGrad;
      ctx.fillRect(0, gy, w, h - gy);

      ctx.shadowColor = color;
      ctx.shadowBlur = 15;
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();
      ctx.shadowBlur = 0;

      if (s.alive) {
        // Mode-specific controls
        if (s.mode === 'cube') {
          if (s.jumpPressed && s.onGround) {
            s.vy = -15;
            s.onGround = false;
          }
          s.jumpPressed = false;
        } else if (s.mode === 'ship') {
          if (s.holdingJump) {
            s.vy = Math.max(s.vy - 1, -6);
          }
          s.jumpPressed = false;
        } else if (s.mode === 'wave') {
          if (s.holdingJump) {
            s.vy = -5;
          } else {
            s.vy = 5;
          }
          s.jumpPressed = false;
        } else if (s.mode === 'ball') {
          if (s.jumpPressed && s.onGround) {
            s.vy = -13;
            s.onGround = false;
          }
          s.jumpPressed = false;
        }

        // Physics
        if (s.mode === 'cube' || s.mode === 'ball') {
          s.vy += 0.8;
          s.py += s.vy;
          if (s.py >= gy - 38) { s.py = gy - 38; s.vy = 0; s.onGround = true; }
          if (!s.onGround) s.rot += 6;
          else s.rot = Math.round(s.rot / 90) * 90;
        } else if (s.mode === 'ship') {
          s.vy += 0.4;
          s.py += s.vy;
          if (s.py >= gy - 38 || s.py < 50) {
            s.alive = false;
            const pct = Math.min(100, Math.floor((s.dist / s.maxDist) * 100));
            setTimeout(() => onDeath(pct, s.coins), 500);
          }
          s.rot = s.vy * 4;
        } else if (s.mode === 'wave') {
          s.py += s.vy;
          if (s.py >= gy - 38 || s.py < 50) {
            s.alive = false;
            const pct = Math.min(100, Math.floor((s.dist / s.maxDist) * 100));
            setTimeout(() => onDeath(pct, s.coins), 500);
          }
          s.rot = s.vy * 5;
        }

        s.obstacles.forEach(o => { o.x -= s.speed; });
        s.obstacles = s.obstacles.filter(o => o.x + o.w > -100);
        s.dist += s.speed;

        // Collision
        const px = s.px, py = s.py, ps = 38;
        for (const o of s.obstacles) {
          const m = 5;

          if (o.type === 'coin') {
            if (px + ps - m > o.x && px + m < o.x + o.w && py + ps - m > o.y && py + m < o.y + o.h) {
              s.coins++;
              o.x = -9999;
            }
            continue;
          }

          if (o.type === 'jump_pad') {
            if (px + ps - m > o.x && px + m < o.x + o.w && py + ps - m > o.y && py + m < o.y + o.h) {
              s.vy = -18;
              s.onGround = false;
            }
            continue;
          }

          if (o.type.startsWith('portal_')) {
            if (px + ps - m > o.x + m && px + m < o.x + o.w - m && py + ps - m > o.y + m && py + m < o.y + o.h - m) {
              if (o.type === 'portal_ship') s.mode = 'ship';
              else if (o.type === 'portal_cube') s.mode = 'cube';
              else if (o.type === 'portal_wave') s.mode = 'wave';
              else if (o.type === 'portal_ball') s.mode = 'ball';
              o.x = -9999;
            }
            continue;
          }

          if (o.type === 'spike') {
            if (px + ps - m > o.x + 8 && px + m < o.x + o.w - 8 && py + ps - m > o.y + o.h * 0.4 && py + m < o.y + o.h) {
              s.alive = false;
              const pct = Math.min(100, Math.floor((s.dist / s.maxDist) * 100));
              setTimeout(() => onDeath(pct, s.coins), 500);
              break;
            }
          } else if (o.type === 'block') {
            if (px + ps - m > o.x + m && px + m < o.x + o.w - m && py + ps - m > o.y + m && py + m < o.y + o.h - m) {
              const wasAbove = py + ps - s.vy <= o.y + 5;
              if (wasAbove && s.vy >= 0) {
                s.py = o.y - ps; s.vy = 0; s.onGround = true;
              } else {
                s.alive = false;
                const pct = Math.min(100, Math.floor((s.dist / s.maxDist) * 100));
                setTimeout(() => onDeath(pct, s.coins), 500);
                break;
              }
            }
          }
        }

        if (s.dist >= s.maxDist) {
          setTimeout(() => onWin(s.coins), 100);
          s.alive = false;
        }
      }

      // Draw obstacles
      s.obstacles.forEach(o => {
        if (o.type === 'spike') {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.moveTo(o.x + o.w / 2, o.y);
          ctx.lineTo(o.x + o.w, o.y + o.h);
          ctx.lineTo(o.x, o.y + o.h);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = 'white';
          ctx.lineWidth = 2;
          ctx.stroke();
        } else if (o.type === 'coin') {
          ctx.fillStyle = '#ffff00';
          ctx.shadowColor = '#ffff00';
          ctx.shadowBlur = 15;
          ctx.beginPath();
          ctx.arc(o.x + 10, o.y + 10, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        } else if (o.type === 'jump_pad') {
          ctx.fillStyle = '#00ff00';
          ctx.fillRect(o.x, o.y, o.w, o.h);
          ctx.strokeStyle = 'white';
          ctx.lineWidth = 2;
          ctx.strokeRect(o.x, o.y, o.w, o.h);
        } else if (o.type.startsWith('portal_')) {
          const pColor = o.type === 'portal_ship' ? '#00ffff' : o.type === 'portal_wave' ? '#ffaa00' : o.type === 'portal_ball' ? '#ff00ff' : '#ff00ff';
          ctx.fillStyle = pColor + '60';
          ctx.shadowColor = pColor;
          ctx.shadowBlur = 25;
          ctx.fillRect(o.x, o.y, o.w, o.h);
          ctx.strokeStyle = pColor;
          ctx.lineWidth = 3;
          ctx.strokeRect(o.x, o.y, o.w, o.h);
          ctx.shadowBlur = 0;
          ctx.fillStyle = 'white';
          ctx.font = 'bold 24px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const icon = o.type === 'portal_ship' ? '🚀' : o.type === 'portal_wave' ? '🌊' : o.type === 'portal_ball' ? '⚽' : '⬛';
          ctx.fillText(icon, o.x + o.w / 2, o.y + o.h / 2);
        } else {
          ctx.fillStyle = color;
          ctx.fillRect(o.x, o.y, o.w, o.h);
          ctx.strokeStyle = 'white';
          ctx.lineWidth = 2;
          ctx.strokeRect(o.x, o.y, o.w, o.h);
        }
      });

      // Draw player
      if (s.alive) {
        ctx.save();
        ctx.translate(s.px + 19, s.py + 19);
        ctx.rotate((s.rot * Math.PI) / 180);

        if (s.mode === 'cube') {
          ctx.shadowColor = color;
          ctx.shadowBlur = 20;
          ctx.fillStyle = color;
          ctx.fillRect(-19, -19, 38, 38);
          ctx.strokeStyle = 'white';
          ctx.lineWidth = 3;
          ctx.strokeRect(-19, -19, 38, 38);
          ctx.fillStyle = 'white';
          ctx.beginPath(); ctx.arc(4, -3, 8, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = 'black';
          ctx.beginPath(); ctx.arc(6, -3, 4, 0, Math.PI * 2); ctx.fill();
        } else if (s.mode === 'ship') {
          ctx.shadowColor = '#00ffff';
          ctx.shadowBlur = 20;
          ctx.fillStyle = '#00ffff';
          ctx.beginPath();
          ctx.moveTo(20, 0);
          ctx.lineTo(-15, -15);
          ctx.lineTo(-10, 0);
          ctx.lineTo(-15, 15);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = 'white';
          ctx.lineWidth = 2;
          ctx.stroke();
        } else if (s.mode === 'wave') {
          ctx.shadowColor = '#ffaa00';
          ctx.shadowBlur = 20;
          ctx.fillStyle = '#ffaa00';
          ctx.beginPath();
          ctx.moveTo(15, 0);
          ctx.lineTo(-10, -12);
          ctx.lineTo(-10, 12);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = 'white';
          ctx.lineWidth = 2;
          ctx.stroke();
        } else if (s.mode === 'ball') {
          ctx.shadowColor = '#ff00ff';
          ctx.shadowBlur = 20;
          ctx.fillStyle = '#ff00ff';
          ctx.beginPath();
          ctx.arc(0, 0, 18, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'white';
          ctx.lineWidth = 3;
          ctx.stroke();
          ctx.fillStyle = 'white';
          ctx.beginPath(); ctx.arc(5, -3, 6, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      }

      // HUD
      const pct = Math.min(100, Math.floor((s.dist / s.maxDist) * 100));
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(20, 20, w - 40, 12);
      ctx.fillStyle = color;
      ctx.fillRect(20, 20, (w - 40) * (pct / 100), 12);
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 1;
      ctx.strokeRect(20, 20, w - 40, 12);

      ctx.fillStyle = 'white';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${pct}%`, w / 2, 55);

      ctx.fillStyle = '#ffff00';
      ctx.font = 'bold 22px Arial';
      ctx.textAlign = 'right';
      ctx.fillText(`★ ${s.coins}`, w - 20, 55);

      if (s.mode !== 'cube') {
        const modeColor = s.mode === 'ship' ? '#00ffff' : s.mode === 'wave' ? '#ffaa00' : '#ff00ff';
        const modeText = s.mode === 'ship' ? '🚀 SHIP' : s.mode === 'wave' ? '🌊 WAVE' : '⚽ BALL';
        ctx.fillStyle = modeColor;
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(modeText, w - 20, 80);
      }

      requestAnimationFrame(loop);
    };
    loop();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('mousedown', onClick);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [level, customObstacles, onDeath, onWin]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />;
}
