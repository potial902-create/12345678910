import { useEffect, useRef, useState, useCallback } from 'react';

// ==================== TYPES ====================
type Screen = 'menu' | 'levels' | 'game' | 'dead' | 'win';

interface Obstacle {
  x: number;
  y: number;
  w: number;
  h: number;
  type: 'spike' | 'block' | 'tall_block' | 'portal_ship' | 'portal_cube';
}

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number;
  color: string;
  size: number;
}

// ==================== LEVEL 1 DATA ====================
function createLevel1(): Obstacle[] {
  const obs: Obstacle[] = [];
  let x = 600;

  // Simple pattern for level 1
  const patterns = [
    () => { obs.push({ x, y: 0, w: 36, h: 36, type: 'spike' }); },
    () => { obs.push({ x, y: 0, w: 45, h: 45, type: 'block' }); },
    () => {
      obs.push({ x, y: 0, w: 36, h: 36, type: 'spike' });
      obs.push({ x: x + 45, y: 0, w: 36, h: 36, type: 'spike' });
    },
    () => { obs.push({ x, y: 0, w: 40, h: 70, type: 'tall_block' }); },
  ];

  for (let i = 0; i < 30; i++) {
    const gap = 250 + Math.random() * 150;
    x += gap;
    const pattern = patterns[Math.floor(Math.random() * patterns.length)];
    pattern();
  }

  // Add ship portal at 60%
  const portalX = x + 400;
  obs.push({ x: portalX, y: 0, w: 40, h: 80, type: 'portal_ship' });
  
  // Add some obstacles for ship section
  let shipX = portalX + 300;
  for (let i = 0; i < 10; i++) {
    const gap = 200 + Math.random() * 150;
    shipX += gap;
    // Spikes on ground and ceiling
    if (Math.random() > 0.5) {
      obs.push({ x: shipX, y: 0, w: 36, h: 36, type: 'spike' });
    } else {
      obs.push({ x: shipX, y: -150, w: 45, h: 45, type: 'block' });
    }
  }

  // Add cube portal back
  const cubePortalX = shipX + 400;
  obs.push({ x: cubePortalX, y: 0, w: 40, h: 80, type: 'portal_cube' });

  // Final section
  let finalX = cubePortalX + 300;
  for (let i = 0; i < 15; i++) {
    const gap = 250 + Math.random() * 150;
    finalX += gap;
    const pattern = patterns[Math.floor(Math.random() * patterns.length)];
    pattern();
  }

  return obs;
}

// ==================== ANIMATED BACKGROUND ====================
function MenuBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Stars
    const stars = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      s: Math.random() * 2 + 0.5,
      speed: Math.random() * 1 + 0.3,
      phase: Math.random() * Math.PI * 2,
    }));

    // Floating shapes
    const shapes = Array.from({ length: 12 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height * 0.7,
      size: Math.random() * 35 + 20,
      rot: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 2,
      speed: Math.random() * 0.8 + 0.2,
      type: Math.floor(Math.random() * 3),
      color: ['#00ff88', '#4488ff', '#ff44aa', '#ffaa00'][Math.floor(Math.random() * 4)],
      alpha: Math.random() * 0.12 + 0.04,
    }));

    let time = 0;
    let animId: number;

    const draw = () => {
      time += 0.016;
      const w = canvas.width;
      const h = canvas.height;

      // BG
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#0a0020');
      bg.addColorStop(0.5, '#100838');
      bg.addColorStop(1, '#0d0628');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Stars
      stars.forEach(star => {
        star.x -= star.speed;
        if (star.x < -5) { star.x = w + 5; star.y = Math.random() * h; }
        const flicker = 0.5 + 0.5 * Math.sin(time * 3 + star.phase);
        ctx.fillStyle = `rgba(255,255,255,${flicker * 0.7})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.s, 0, Math.PI * 2);
        ctx.fill();
      });

      // Shapes
      shapes.forEach(s => {
        s.x -= s.speed;
        s.rot += s.rotSpeed;
        if (s.x < -s.size * 2) { s.x = w + s.size * 2; s.y = Math.random() * h * 0.7; }

        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate((s.rot * Math.PI) / 180);
        ctx.globalAlpha = s.alpha;
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 2;

        if (s.type === 0) {
          ctx.beginPath();
          ctx.moveTo(0, -s.size / 2);
          ctx.lineTo(s.size / 2, s.size / 2);
          ctx.lineTo(-s.size / 2, s.size / 2);
          ctx.closePath();
          ctx.stroke();
        } else if (s.type === 1) {
          ctx.strokeRect(-s.size / 2, -s.size / 2, s.size, s.size);
        } else {
          ctx.beginPath();
          ctx.moveTo(0, -s.size / 2);
          ctx.lineTo(s.size / 2, 0);
          ctx.lineTo(0, s.size / 2);
          ctx.lineTo(-s.size / 2, 0);
          ctx.closePath();
          ctx.stroke();
        }
        ctx.restore();
      });

      // Ground
      const groundY = h - 90;
      ctx.shadowColor = '#4488ff';
      ctx.shadowBlur = 20;
      ctx.strokeStyle = '#4488ff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.lineTo(w, groundY);
      ctx.stroke();
      ctx.shadowBlur = 0;

      const gGrad = ctx.createLinearGradient(0, groundY, 0, h);
      gGrad.addColorStop(0, '#1a1050');
      gGrad.addColorStop(1, '#0a0828');
      ctx.fillStyle = gGrad;
      ctx.fillRect(0, groundY, w, h - groundY);

      // Ground grid
      const gridOff = (time * 50) % 50;
      ctx.strokeStyle = 'rgba(68,136,255,0.15)';
      ctx.lineWidth = 1;
      for (let gx = -gridOff; gx < w; gx += 50) {
        ctx.beginPath(); ctx.moveTo(gx, groundY); ctx.lineTo(gx, h); ctx.stroke();
      }
      for (let gy = groundY + 50; gy < h; gy += 50) {
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();
      }

      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
}

// ==================== GAME CANVAS ====================
function GameCanvas({ onDeath, onWin }: { onDeath: (pct: number) => void; onWin: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    px: 120, py: 0, vy: 0, rot: 0, onGround: true,
    speed: 4, dist: 0, maxDist: 8000,
    obstacles: [] as { x: number; y: number; w: number; h: number; type: string }[],
    particles: [] as Particle[],
    groundOff: 0,
    alive: true,
    jumpPressed: false,
    mode: 'cube' as 'cube' | 'ship',
    holdingJump: false,
  });
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Init level
    const groundY = () => canvas.height - 90;
    const levelObs = createLevel1();
    const s = stateRef.current;
    s.obstacles = levelObs.map(o => {
      if (o.type === 'portal_ship' || o.type === 'portal_cube') {
        // Portals are centered vertically
        return { x: o.x, y: groundY() - 120, w: o.w, h: o.h, type: o.type };
      } else if (o.type === 'spike') {
        // Spikes on ground
        return { x: o.x, y: groundY() - o.h, w: o.w, h: o.h, type: o.type };
      } else {
        // Blocks - handle y offset for spikes on blocks
        return { x: o.x, y: groundY() - o.h + o.y, w: o.w, h: o.h, type: o.type };
      }
    });
    s.maxDist = Math.max(...levelObs.map(o => o.x)) + 800;
    s.px = 120;
    s.py = groundY() - 38;
    s.vy = 0;
    s.rot = 0;
    s.onGround = true;
    s.dist = 0;
    s.alive = true;
    s.particles = [];
    s.mode = 'cube';
    s.holdingJump = false;

    // Input
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        s.jumpPressed = true;
        s.holdingJump = true;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        s.holdingJump = false;
      }
    };
    const onClick = () => { 
      s.jumpPressed = true; 
      s.holdingJump = true;
    };
    const onMouseUp = () => { s.holdingJump = false; };
    const onTouch = (e: TouchEvent) => { 
      e.preventDefault(); 
      s.jumpPressed = true; 
      s.holdingJump = true;
    };
    const onTouchEnd = () => { s.holdingJump = false; };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    canvas.addEventListener('mousedown', onClick);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('touchstart', onTouch, { passive: false });
    window.addEventListener('touchend', onTouchEnd);

    // Game loop
    const loop = () => {
      const w = canvas.width;
      const h = canvas.height;
      const gy = groundY();
      const color = '#00ff88';

      // BG
      ctx.fillStyle = '#0a0a20';
      ctx.fillRect(0, 0, w, h);

      // BG gradient
      const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.7);
      bgGrad.addColorStop(0, '#00ff8810');
      bgGrad.addColorStop(1, '#000');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Ground
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
        // Jump / Ship control
        if (s.mode === 'cube') {
          // Cube mode - jump on press
          if (s.jumpPressed && s.onGround) {
            s.vy = -12;
            s.onGround = false;
            for (let i = 0; i < 5; i++) {
              s.particles.push({
                x: s.px + 19, y: s.py + 38,
                vx: (Math.random() - 0.5) * 6, vy: Math.random() * 3,
                life: 1, color, size: Math.random() * 4 + 2,
              });
            }
          }
          s.jumpPressed = false;
        } else {
          // Ship mode - hold to go up
          if (s.holdingJump) {
            s.vy = -4;
          }
          s.jumpPressed = false;
        }

        // Physics
        if (s.mode === 'cube') {
          s.vy += 0.6;
          s.py += s.vy;
          if (s.py >= gy - 38) {
            s.py = gy - 38;
            s.vy = 0;
            s.onGround = true;
          } else {
            s.onGround = false;
          }
          // Rotation
          if (!s.onGround) s.rot += 5;
          else s.rot = Math.round(s.rot / 90) * 90;
        } else {
          // Ship physics
          s.onGround = false;
          s.vy += 0.25;
          s.py += s.vy;
          if (s.py >= gy - 38) {
            // Die if hit ground in ship mode
            s.alive = false;
            for (let i = 0; i < 25; i++) {
              s.particles.push({
                x: s.px + 19, y: s.py + 19,
                vx: (Math.random() - 0.5) * 14, vy: (Math.random() - 0.5) * 14,
                life: 1, color: i % 2 === 0 ? '#00ffff' : '#ff4444',
                size: Math.random() * 6 + 2,
              });
            }
            const pct = Math.min(100, Math.floor((s.dist / s.maxDist) * 100));
            setTimeout(() => onDeath(pct), 600);
          }
          if (s.py < 20) {
            // Die if hit ceiling
            s.alive = false;
            for (let i = 0; i < 25; i++) {
              s.particles.push({
                x: s.px + 19, y: s.py + 19,
                vx: (Math.random() - 0.5) * 14, vy: (Math.random() - 0.5) * 14,
                life: 1, color: i % 2 === 0 ? '#00ffff' : '#ff4444',
                size: Math.random() * 6 + 2,
              });
            }
            const pct = Math.min(100, Math.floor((s.dist / s.maxDist) * 100));
            setTimeout(() => onDeath(pct), 600);
          }
          // Ship tilt based on velocity
          s.rot = s.vy * 3;
        }

        // Move obstacles
        s.obstacles.forEach(o => { o.x -= s.speed; });
        s.obstacles = s.obstacles.filter(o => o.x + o.w > -100);

        // Distance
        s.dist += s.speed;
        s.groundOff = (s.groundOff + s.speed) % 50;

        // Collision
        const px = s.px, py = s.py, ps = 38;
        for (const o of s.obstacles) {
          const m = 4;
          
          // Portal ship
          if (o.type === 'portal_ship') {
            if (px + ps - m > o.x + m && px + m < o.x + o.w - m &&
                py + ps - m > o.y + m && py + m < o.y + o.h - m) {
              s.mode = 'ship';
              s.vy = -2;
              for (let i = 0; i < 15; i++) {
                s.particles.push({
                  x: o.x + o.w / 2, y: o.y + o.h / 2,
                  vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.5) * 10,
                  life: 1, color: '#00ffff', size: Math.random() * 5 + 2,
                });
              }
              o.x = -9999; // Remove portal
              continue;
            }
          }
          
          // Portal cube
          if (o.type === 'portal_cube') {
            if (px + ps - m > o.x + m && px + m < o.x + o.w - m &&
                py + ps - m > o.y + m && py + m < o.y + o.h - m) {
              s.mode = 'cube';
              for (let i = 0; i < 15; i++) {
                s.particles.push({
                  x: o.x + o.w / 2, y: o.y + o.h / 2,
                  vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.5) * 10,
                  life: 1, color: '#ff00ff', size: Math.random() * 5 + 2,
                });
              }
              o.x = -9999;
              continue;
            }
          }
          
          if (o.type === 'spike') {
            if (px + ps - m > o.x + 10 && px + m < o.x + o.w - 10 &&
                py + ps - m > o.y + o.h * 0.4 && py + m < o.y + o.h) {
              s.alive = false;
              for (let i = 0; i < 25; i++) {
                s.particles.push({
                  x: px + 19, y: py + 19,
                  vx: (Math.random() - 0.5) * 14, vy: (Math.random() - 0.5) * 14,
                  life: 1, color: i % 2 === 0 ? color : '#ff4444',
                  size: Math.random() * 6 + 2,
                });
              }
              const pct = Math.min(100, Math.floor((s.dist / s.maxDist) * 100));
              setTimeout(() => onDeath(pct), 600);
              break;
            }
          } else if (o.type === 'block' || o.type === 'tall_block') {
            // Check if landing on top
            const prevBottom = py + ps - s.vy;
            const isOnTop = prevBottom <= o.y + m && py + ps > o.y && s.vy >= 0;
            
            if (isOnTop) {
              // Land on block
              s.py = o.y - ps;
              s.vy = 0;
              s.onGround = true;
            } else if (px + ps - m > o.x + m && px + m < o.x + o.w - m &&
                       py + ps - m > o.y + m && py + m < o.y + o.h - m) {
              // Hit side or bottom - die
              s.alive = false;
              for (let i = 0; i < 25; i++) {
                s.particles.push({
                  x: px + 19, y: py + 19,
                  vx: (Math.random() - 0.5) * 14, vy: (Math.random() - 0.5) * 14,
                  life: 1, color: i % 2 === 0 ? color : '#ff4444',
                  size: Math.random() * 6 + 2,
                });
              }
              const pct = Math.min(100, Math.floor((s.dist / s.maxDist) * 100));
              setTimeout(() => onDeath(pct), 600);
              break;
            }
          }
        }

        // Win
        if (s.dist >= s.maxDist) {
          setTimeout(() => onWin(), 100);
          s.alive = false;
        }

        // Trail
        if (Math.random() > 0.5) {
          s.particles.push({
            x: s.px, y: s.py + 19,
            vx: -2, vy: (Math.random() - 0.5) * 2,
            life: 1, color, size: Math.random() * 3 + 1,
          });
        }
      }

      // Ground grid
      ctx.strokeStyle = color + '20';
      ctx.lineWidth = 1;
      for (let gx = -s.groundOff; gx < w; gx += 50) {
        ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx, h); ctx.stroke();
      }
      for (let gy2 = gy + 50; gy2 < h; gy2 += 50) {
        ctx.beginPath(); ctx.moveTo(0, gy2); ctx.lineTo(w, gy2); ctx.stroke();
      }

      // Draw obstacles
      s.obstacles.forEach(o => {
        ctx.save();
        if (o.type === 'spike') {
          const grad = ctx.createLinearGradient(o.x, o.y + o.h, o.x, o.y);
          grad.addColorStop(0, color + '60');
          grad.addColorStop(1, color);
          ctx.fillStyle = grad;
          ctx.shadowColor = color;
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.moveTo(o.x + o.w / 2, o.y);
          ctx.lineTo(o.x + o.w, o.y + o.h);
          ctx.lineTo(o.x, o.y + o.h);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        } else if (o.type === 'portal_ship') {
          // Ship portal - cyan
          ctx.fillStyle = '#00ffff40';
          ctx.shadowColor = '#00ffff';
          ctx.shadowBlur = 25;
          ctx.fillRect(o.x, o.y, o.w, o.h);
          ctx.strokeStyle = '#00ffff';
          ctx.lineWidth = 3;
          ctx.strokeRect(o.x, o.y, o.w, o.h);
          // Ship icon
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 28px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🚀', o.x + o.w / 2, o.y + o.h / 2);
        } else if (o.type === 'portal_cube') {
          // Cube portal - magenta
          ctx.fillStyle = '#ff00ff40';
          ctx.shadowColor = '#ff00ff';
          ctx.shadowBlur = 25;
          ctx.fillRect(o.x, o.y, o.w, o.h);
          ctx.strokeStyle = '#ff00ff';
          ctx.lineWidth = 3;
          ctx.strokeRect(o.x, o.y, o.w, o.h);
          // Cube icon
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 28px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('⬛', o.x + o.w / 2, o.y + o.h / 2);
        } else {
          // Block
          const grad = ctx.createLinearGradient(o.x, o.y, o.x, o.y + o.h);
          grad.addColorStop(0, color);
          grad.addColorStop(1, color + '50');
          ctx.fillStyle = grad;
          ctx.shadowColor = color;
          ctx.shadowBlur = 8;
          ctx.fillRect(o.x, o.y, o.w, o.h);
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.strokeRect(o.x, o.y, o.w, o.h);
        }
        ctx.restore();
      });

      // Draw player
      if (s.alive) {
        ctx.save();
        ctx.translate(s.px + 19, s.py + 19);
        ctx.rotate((s.rot * Math.PI) / 180);
        ctx.shadowColor = s.mode === 'ship' ? '#00ffff' : color;
        ctx.shadowBlur = 20;

        if (s.mode === 'cube') {
          // Cube
          const pGrad = ctx.createLinearGradient(-19, -19, 19, 19);
          pGrad.addColorStop(0, color);
          pGrad.addColorStop(1, '#00aa55');
          ctx.fillStyle = pGrad;
          ctx.fillRect(-19, -19, 38, 38);
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 3;
          ctx.strokeRect(-19, -19, 38, 38);

          // Eye
          ctx.fillStyle = '#fff';
          ctx.beginPath(); ctx.arc(4, -3, 8, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#000';
          ctx.beginPath(); ctx.arc(6, -3, 4, 0, Math.PI * 2); ctx.fill();
        } else {
          // Ship - triangle shape
          ctx.fillStyle = '#00ffff';
          ctx.beginPath();
          ctx.moveTo(20, 0);
          ctx.lineTo(-15, -15);
          ctx.lineTo(-10, 0);
          ctx.lineTo(-15, 15);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.stroke();
          
          // Cockpit
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(5, 0, 5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // Particles
      s.particles.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.2; p.life -= 0.025;
        if (p.life > 0) {
          ctx.globalAlpha = p.life;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      });
      s.particles = s.particles.filter(p => p.life > 0);

      // HUD
      const pct = Math.min(100, Math.floor((s.dist / s.maxDist) * 100));
      ctx.fillStyle = '#ffffff20';
      ctx.fillRect(20, 20, w - 40, 12);
      ctx.fillStyle = color;
      ctx.fillRect(20, 20, (w - 40) * (pct / 100), 12);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.strokeRect(20, 20, w - 40, 12);

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 22px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(`${pct}%`, w / 2, 38);

      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ffffff80';
      ctx.fillText('Level 1', 20, 42);
      
      // Mode indicator
      if (s.mode === 'ship') {
        ctx.fillStyle = '#00ffff';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'right';
        ctx.fillText('🚀 SHIP', w - 20, 42);
      }

      animRef.current = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('mousedown', onClick);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('touchstart', onTouch);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [onDeath, onWin]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
}

// ==================== MAIN APP ====================
export default function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [deathProgress, setDeathProgress] = useState(0);
  const [bestScore, setBestScore] = useState(0);

  const handlePlay = useCallback(() => {
    setScreen('game');
  }, []);

  const handleDeath = useCallback((pct: number) => {
    setDeathProgress(pct);
    setBestScore(prev => Math.max(prev, pct));
    setScreen('dead');
  }, []);

  const handleWin = useCallback(() => {
    setDeathProgress(100);
    setBestScore(100);
    setScreen('win');
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black select-none">
      
      {/* ===== MENU ===== */}
      {screen === 'menu' && (
        <>
          <MenuBackground />
          <div className="relative z-10 flex flex-col items-center justify-center h-full px-4">
            {/* Logo */}
            <div className="mb-4 text-center">
              <h1 className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tight"
                style={{
                  background: 'linear-gradient(180deg, #fff 0%, #88ccff 50%, #4488ff 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  filter: 'drop-shadow(0 0 20px rgba(68,136,255,0.6))',
                }}>
                GEOMETRY
              </h1>
              <h1 className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tight -mt-2"
                style={{
                  background: 'linear-gradient(180deg, #fff 0%, #ff88cc 50%, #ff44aa 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  filter: 'drop-shadow(0 0 20px rgba(255,68,170,0.6))',
                }}>
                DASH
              </h1>
            </div>

            {/* Cube */}
            <div className="relative w-28 h-28 md:w-32 md:h-32 mb-6">
              <div className="absolute inset-0 bg-green-400 rounded-2xl blur-2xl opacity-40 animate-pulse" />
              <div className="relative w-full h-full rounded-2xl border-4 border-white/80 overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, #00ff88, #00cc66)',
                  boxShadow: '0 0 30px #00ff8860',
                  animation: 'cubeFloat 2s ease-in-out infinite',
                }}>
                <div className="absolute inset-2 rounded-xl border-2 border-white/30" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                    <div className="w-6 h-6 bg-gray-900 rounded-full relative">
                      <div className="absolute top-1 right-1 w-2 h-2 bg-white rounded-full" />
                    </div>
                  </div>
                </div>
                <div className="absolute top-0 left-0 w-full h-1/3 bg-gradient-to-b from-white/30 to-transparent rounded-t-2xl" />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-col gap-3 w-full max-w-xs">
              <button
                onClick={handlePlay}
                className="w-full py-4 rounded-2xl font-bold text-xl text-white cursor-pointer transition-transform hover:scale-105 active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #00dd77, #00aa55)',
                  boxShadow: '0 0 20px #00ff8840, 0 4px 15px rgba(0,0,0,0.4)',
                  border: '3px solid rgba(255,255,255,0.3)',
                }}>
                ▶ ИГРАТЬ
              </button>

              <button
                onClick={() => setScreen('levels')}
                className="w-full py-3.5 rounded-2xl font-bold text-lg text-white cursor-pointer transition-transform hover:scale-105 active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #3377ee, #1155cc)',
                  boxShadow: '0 0 15px #4488ff40, 0 4px 12px rgba(0,0,0,0.4)',
                  border: '3px solid rgba(255,255,255,0.25)',
                }}>
                📋 УРОВНИ
              </button>
            </div>

            <p className="mt-8 text-white/40 text-sm">Space / ↑ / Клик — прыжок</p>
          </div>
        </>
      )}

      {/* ===== LEVELS ===== */}
      {screen === 'levels' && (
        <div className="relative z-10 flex flex-col items-center h-full bg-black/90 overflow-y-auto py-8">
          <h2 className="text-4xl font-bold text-white mb-6">Уровни</h2>
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 px-4 max-w-lg">
            {Array.from({ length: 20 }, (_, i) => (
              <button
                key={i}
                onClick={() => setScreen('game')}
                disabled={i !== 0}
                className={`aspect-square rounded-xl border-3 flex flex-col items-center justify-center transition-all cursor-pointer ${
                  i === 0 ? 'hover:scale-110 active:scale-95' : 'opacity-40 cursor-not-allowed'
                }`}
                style={{
                  borderColor: i === 0 ? '#00ff88' : '#555',
                  background: i === 0 ? 'linear-gradient(135deg, #00ff8830, #00ff8805)' : '#22222230',
                  boxShadow: i === 0 ? '0 0 15px #00ff8840' : 'none',
                }}>
                <span className="text-2xl font-bold text-white">{i + 1}</span>
                {i === 0 && bestScore > 0 && (
                  <span className="text-xs text-yellow-400 font-bold">{bestScore}%</span>
                )}
              </button>
            ))}
          </div>
          <button
            onClick={() => setScreen('menu')}
            className="mt-6 px-10 py-3 text-xl font-bold text-white bg-gray-700 rounded-xl hover:bg-gray-600 cursor-pointer transition-colors border-2 border-white/20">
            ← Назад
          </button>
        </div>
      )}

      {/* ===== GAME ===== */}
      {screen === 'game' && (
        <GameCanvas onDeath={handleDeath} onWin={handleWin} />
      )}

      {/* ===== DEATH ===== */}
      {screen === 'dead' && (
        <div className="relative z-10 flex items-center justify-center h-full bg-black/80">
          <div className="bg-gray-900/95 p-8 rounded-2xl border-3 border-red-500 text-center max-w-sm mx-4"
            style={{ boxShadow: '0 0 40px #ff444440' }}>
            <h2 className="text-5xl font-black text-red-500 mb-4"
              style={{ textShadow: '0 0 20px #ff4444' }}>
              💀 КРАШ!
            </h2>
            <p className="text-2xl text-white mb-2">
              Прогресс: <span className="text-green-400 font-bold">{deathProgress}%</span>
            </p>
            <p className="text-sm text-gray-400 mb-6">Лучший: {bestScore}%</p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setScreen('game')}
                className="w-full py-4 text-xl font-bold text-white rounded-xl cursor-pointer hover:scale-105 active:scale-95 transition-transform"
                style={{
                  background: 'linear-gradient(135deg, #00dd77, #00aa55)',
                  border: '3px solid rgba(255,255,255,0.3)',
                }}>
                🔄 Заново
              </button>
              <button
                onClick={() => setScreen('menu')}
                className="w-full py-3 text-lg font-bold text-white bg-gray-700 rounded-xl hover:bg-gray-600 cursor-pointer transition-colors border-2 border-white/20">
                🏠 Меню
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== WIN ===== */}
      {screen === 'win' && (
        <div className="relative z-10 flex items-center justify-center h-full bg-black/80">
          <div className="bg-gray-900/95 p-8 rounded-2xl border-3 border-yellow-400 text-center max-w-sm mx-4"
            style={{ boxShadow: '0 0 40px #ffaa0040' }}>
            <h2 className="text-5xl font-black text-yellow-400 mb-4"
              style={{ textShadow: '0 0 20px #ffaa00' }}>
              🏆 ПОБЕДА!
            </h2>
            <p className="text-3xl text-white mb-6">100%</p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setScreen('game')}
                className="w-full py-4 text-xl font-bold text-white rounded-xl cursor-pointer hover:scale-105 active:scale-95 transition-transform"
                style={{
                  background: 'linear-gradient(135deg, #00dd77, #00aa55)',
                  border: '3px solid rgba(255,255,255,0.3)',
                }}>
                🔄 Играть снова
              </button>
              <button
                onClick={() => setScreen('menu')}
                className="w-full py-3 text-lg font-bold text-white bg-gray-700 rounded-xl hover:bg-gray-600 cursor-pointer transition-colors border-2 border-white/20">
                🏠 Меню
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes cubeFloat {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-10px) rotate(-2deg); }
          75% { transform: translateY(-6px) rotate(2deg); }
        }
      `}</style>
    </div>
  );
}
