import { useEffect, useRef, useState } from 'react';

type Screen = 'menu' | 'game' | 'dead' | 'win';

export default function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [progress, setProgress] = useState(0);

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#000' }}>
      {screen === 'menu' && (
        <div style={{
          width: '100%', height: '100%',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(180deg, #0a0020 0%, #100838 50%, #0d0628 100%)'
        }}>
          <h1 style={{
            fontSize: '4rem', fontWeight: 'bold', color: '#4488ff',
            textShadow: '0 0 20px #4488ff', marginBottom: '0.5rem'
          }}>
            GEOMETRY
          </h1>
          <h1 style={{
            fontSize: '4rem', fontWeight: 'bold', color: '#ff44aa',
            textShadow: '0 0 20px #ff44aa', marginBottom: '2rem'
          }}>
            DASH
          </h1>
          
          <div style={{
            width: '100px', height: '100px',
            background: 'linear-gradient(135deg, #00ff88, #00cc66)',
            border: '4px solid white', borderRadius: '12px',
            marginBottom: '2rem', position: 'relative',
            boxShadow: '0 0 30px #00ff88'
          }}>
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '40px', height: '40px',
              background: 'white', borderRadius: '50%'
            }}>
              <div style={{
                position: 'absolute', top: '8px', right: '8px',
                width: '16px', height: '16px',
                background: 'black', borderRadius: '50%'
              }} />
            </div>
          </div>

          <button
            onClick={() => setScreen('game')}
            style={{
              padding: '1rem 3rem', fontSize: '1.5rem', fontWeight: 'bold',
              color: 'white', background: 'linear-gradient(135deg, #00dd77, #00aa55)',
              border: '3px solid rgba(255,255,255,0.3)', borderRadius: '16px',
              cursor: 'pointer', boxShadow: '0 0 20px #00ff88',
              marginBottom: '1rem'
            }}
          >
            ▶ ИГРАТЬ
          </button>

          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
            Space / ↑ / Клик — прыжок
          </p>
        </div>
      )}

      {screen === 'game' && (
        <GameScreen onDeath={(p) => { setProgress(p); setScreen('dead'); }} onWin={() => setScreen('win')} />
      )}

      {screen === 'dead' && (
        <div style={{
          width: '100%', height: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.8)'
        }}>
          <div style={{
            background: '#1a1a1a', padding: '2rem', borderRadius: '16px',
            border: '3px solid #ff4444', textAlign: 'center'
          }}>
            <h2 style={{ fontSize: '3rem', color: '#ff4444', marginBottom: '1rem' }}>💀 КРАШ!</h2>
            <p style={{ fontSize: '1.5rem', color: 'white', marginBottom: '1.5rem' }}>
              Прогресс: <span style={{ color: '#00ff88' }}>{progress}%</span>
            </p>
            <button
              onClick={() => setScreen('game')}
              style={{
                padding: '1rem 2rem', fontSize: '1.2rem', fontWeight: 'bold',
                color: 'white', background: 'linear-gradient(135deg, #00dd77, #00aa55)',
                border: '2px solid rgba(255,255,255,0.3)', borderRadius: '12px',
                cursor: 'pointer', marginRight: '1rem'
              }}
            >
              🔄 Заново
            </button>
            <button
              onClick={() => setScreen('menu')}
              style={{
                padding: '1rem 2rem', fontSize: '1.2rem', fontWeight: 'bold',
                color: 'white', background: '#444',
                border: '2px solid rgba(255,255,255,0.2)', borderRadius: '12px',
                cursor: 'pointer'
              }}
            >
              🏠 Меню
            </button>
          </div>
        </div>
      )}

      {screen === 'win' && (
        <div style={{
          width: '100%', height: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.8)'
        }}>
          <div style={{
            background: '#1a1a1a', padding: '2rem', borderRadius: '16px',
            border: '3px solid #ffaa00', textAlign: 'center'
          }}>
            <h2 style={{ fontSize: '3rem', color: '#ffaa00', marginBottom: '1rem' }}>🏆 ПОБЕДА!</h2>
            <p style={{ fontSize: '2rem', color: 'white', marginBottom: '1.5rem' }}>100%</p>
            <button
              onClick={() => setScreen('game')}
              style={{
                padding: '1rem 2rem', fontSize: '1.2rem', fontWeight: 'bold',
                color: 'white', background: 'linear-gradient(135deg, #00dd77, #00aa55)',
                border: '2px solid rgba(255,255,255,0.3)', borderRadius: '12px',
                cursor: 'pointer', marginRight: '1rem'
              }}
            >
              🔄 Играть снова
            </button>
            <button
              onClick={() => setScreen('menu')}
              style={{
                padding: '1rem 2rem', fontSize: '1.2rem', fontWeight: 'bold',
                color: 'white', background: '#444',
                border: '2px solid rgba(255,255,255,0.2)', borderRadius: '12px',
                cursor: 'pointer'
              }}
            >
              🏠 Меню
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function GameScreen({ onDeath, onWin }: { onDeath: (pct: number) => void; onWin: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    px: 120, py: 0, vy: 0, rot: 0, onGround: true,
    speed: 4, dist: 0, maxDist: 6000,
    obstacles: [] as { x: number; y: number; w: number; h: number; type: string }[],
    alive: true, jumpPressed: false,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const groundY = () => canvas.height - 100;
    const s = stateRef.current;

    // Generate obstacles
    s.obstacles = [];
    let x = 500;
    for (let i = 0; i < 30; i++) {
      x += 250 + Math.random() * 150;
      const type = Math.random() > 0.5 ? 'spike' : 'block';
      const h = type === 'spike' ? 36 : 45;
      const w = type === 'spike' ? 36 : 45;
      s.obstacles.push({ x, y: groundY() - h, w, h, type });
    }
    s.maxDist = x + 500;
    s.px = 120;
    s.py = groundY() - 38;
    s.vy = 0;
    s.rot = 0;
    s.onGround = true;
    s.dist = 0;
    s.alive = true;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        s.jumpPressed = true;
      }
    };
    const onClick = () => { s.jumpPressed = true; };

    window.addEventListener('keydown', onKeyDown);
    canvas.addEventListener('mousedown', onClick);

    const loop = () => {
      const w = canvas.width;
      const h = canvas.height;
      const gy = groundY();

      // Background
      ctx.fillStyle = '#0a0a20';
      ctx.fillRect(0, 0, w, h);

      // Ground
      ctx.fillStyle = '#00ff8840';
      ctx.fillRect(0, gy, w, h - gy);
      ctx.strokeStyle = '#00ff88';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(w, gy);
      ctx.stroke();

      if (s.alive) {
        // Jump
        if (s.jumpPressed && s.onGround) {
          s.vy = -13;
          s.onGround = false;
        }
        s.jumpPressed = false;

        // Physics
        s.vy += 0.7;
        s.py += s.vy;
        if (s.py >= gy - 38) {
          s.py = gy - 38;
          s.vy = 0;
          s.onGround = true;
        }

        // Rotation
        if (!s.onGround) s.rot += 5;
        else s.rot = Math.round(s.rot / 90) * 90;

        // Move obstacles
        s.obstacles.forEach(o => { o.x -= s.speed; });
        s.obstacles = s.obstacles.filter(o => o.x + o.w > -100);

        // Distance
        s.dist += s.speed;

        // Collision
        for (const o of s.obstacles) {
          const px = s.px, py = s.py, ps = 38;
          const m = 5;

          if (o.type === 'spike') {
            if (px + ps - m > o.x + 8 && px + m < o.x + o.w - 8 &&
                py + ps - m > o.y + o.h * 0.4 && py + m < o.y + o.h) {
              s.alive = false;
              const pct = Math.min(100, Math.floor((s.dist / s.maxDist) * 100));
              setTimeout(() => onDeath(pct), 500);
              break;
            }
          } else {
            if (px + ps - m > o.x + m && px + m < o.x + o.w - m &&
                py + ps - m > o.y + m && py + m < o.y + o.h - m) {
              s.alive = false;
              const pct = Math.min(100, Math.floor((s.dist / s.maxDist) * 100));
              setTimeout(() => onDeath(pct), 500);
              break;
            }
          }
        }

        // Win
        if (s.dist >= s.maxDist) {
          setTimeout(() => onWin(), 100);
          s.alive = false;
        }
      }

      // Draw obstacles
      s.obstacles.forEach(o => {
        if (o.type === 'spike') {
          ctx.fillStyle = '#00ff88';
          ctx.beginPath();
          ctx.moveTo(o.x + o.w / 2, o.y);
          ctx.lineTo(o.x + o.w, o.y + o.h);
          ctx.lineTo(o.x, o.y + o.h);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = 'white';
          ctx.lineWidth = 2;
          ctx.stroke();
        } else {
          ctx.fillStyle = '#00ff88';
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
        ctx.fillStyle = '#00ff88';
        ctx.fillRect(-19, -19, 38, 38);
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ctx.strokeRect(-19, -19, 38, 38);
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(4, -3, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(6, -3, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Progress bar
      const pct = Math.min(100, Math.floor((s.dist / s.maxDist) * 100));
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(20, 20, w - 40, 10);
      ctx.fillStyle = '#00ff88';
      ctx.fillRect(20, 20, (w - 40) * (pct / 100), 10);
      ctx.fillStyle = 'white';
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${pct}%`, w / 2, 50);

      requestAnimationFrame(loop);
    };
    loop();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', onKeyDown);
      canvas.removeEventListener('mousedown', onClick);
    };
  }, [onDeath, onWin]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />;
}
