import { useEffect, useRef, useState } from 'react';

// ==================== ANIMATED BACKGROUND ====================
function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    let w = window.innerWidth;
    let h = window.innerHeight;
    canvas.width = w;
    canvas.height = h;

    // Stars
    const stars: { x: number; y: number; s: number; speed: number; bright: number }[] = [];
    for (let i = 0; i < 150; i++) {
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        s: Math.random() * 2.5 + 0.5,
        speed: Math.random() * 1.5 + 0.3,
        bright: Math.random(),
      });
    }

    // Floating shapes
    const shapes: {
      x: number; y: number; size: number; rot: number; rotSpeed: number;
      speed: number; type: number; color: string; alpha: number;
    }[] = [];
    const shapeColors = ['#00ff88', '#4488ff', '#ff44aa', '#ffaa00', '#aa44ff', '#44ffff'];
    for (let i = 0; i < 15; i++) {
      shapes.push({
        x: Math.random() * w,
        y: Math.random() * h,
        size: Math.random() * 40 + 20,
        rot: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 2,
        speed: Math.random() * 1 + 0.3,
        type: Math.floor(Math.random() * 3),
        color: shapeColors[Math.floor(Math.random() * shapeColors.length)],
        alpha: Math.random() * 0.15 + 0.05,
      });
    }

    // Ground blocks (like in GD menu)
    const groundBlocks: { x: number; w: number; h: number; color: string }[] = [];
    for (let x = 0; x < w + 200; x += 60) {
      groundBlocks.push({
        x,
        w: 60,
        h: 60 + Math.random() * 30,
        color: `hsl(${200 + Math.random() * 40}, 80%, ${15 + Math.random() * 10}%)`,
      });
    }

    let time = 0;
    let animId: number;

    const draw = () => {
      time += 0.016;
      w = canvas.width;
      h = canvas.height;

      // Background gradient
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#0a0020');
      bg.addColorStop(0.4, '#100838');
      bg.addColorStop(0.7, '#1a0a4a');
      bg.addColorStop(1, '#0d0628');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Stars
      stars.forEach(star => {
        star.x -= star.speed;
        if (star.x < -5) star.x = w + 5;
        const flicker = 0.5 + 0.5 * Math.sin(time * 3 + star.bright * 10);
        ctx.fillStyle = `rgba(255, 255, 255, ${flicker * 0.8})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.s, 0, Math.PI * 2);
        ctx.fill();
      });

      // Floating shapes
      shapes.forEach(shape => {
        shape.x -= shape.speed;
        shape.rot += shape.rotSpeed;
        if (shape.x < -shape.size * 2) {
          shape.x = w + shape.size * 2;
          shape.y = Math.random() * h * 0.7;
        }

        ctx.save();
        ctx.translate(shape.x, shape.y);
        ctx.rotate((shape.rot * Math.PI) / 180);
        ctx.globalAlpha = shape.alpha;
        ctx.strokeStyle = shape.color;
        ctx.lineWidth = 2;

        if (shape.type === 0) {
          // Triangle
          ctx.beginPath();
          ctx.moveTo(0, -shape.size / 2);
          ctx.lineTo(shape.size / 2, shape.size / 2);
          ctx.lineTo(-shape.size / 2, shape.size / 2);
          ctx.closePath();
          ctx.stroke();
        } else if (shape.type === 1) {
          // Square
          ctx.strokeRect(-shape.size / 2, -shape.size / 2, shape.size, shape.size);
        } else {
          // Diamond
          ctx.beginPath();
          ctx.moveTo(0, -shape.size / 2);
          ctx.lineTo(shape.size / 2, 0);
          ctx.lineTo(0, shape.size / 2);
          ctx.lineTo(-shape.size / 2, 0);
          ctx.closePath();
          ctx.stroke();
        }

        ctx.restore();
      });

      // Ground area
      const groundY = h - 100;

      // Ground glow
      ctx.shadowColor = '#4488ff';
      ctx.shadowBlur = 30;
      ctx.strokeStyle = '#4488ff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.lineTo(w, groundY);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Ground fill
      const gGrad = ctx.createLinearGradient(0, groundY, 0, h);
      gGrad.addColorStop(0, '#1a1050');
      gGrad.addColorStop(1, '#0a0828');
      ctx.fillStyle = gGrad;
      ctx.fillRect(0, groundY, w, h - groundY);

      // Ground grid
      const gridOffset = (time * 60) % 60;
      ctx.strokeStyle = 'rgba(68, 136, 255, 0.15)';
      ctx.lineWidth = 1;
      for (let x = -gridOffset; x < w; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x, groundY);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = groundY + 60; y < h; y += 60) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Ground blocks
      groundBlocks.forEach(block => {
        block.x -= 1;
        if (block.x + block.w < 0) block.x = w + 60;
        ctx.fillStyle = block.color;
        ctx.fillRect(block.x, groundY - block.h, block.w, block.h);
        ctx.strokeStyle = 'rgba(68, 136, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(block.x, groundY - block.h, block.w, block.h);
      });

      animId = requestAnimationFrame(draw);
    };

    draw();

    const onResize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
}

// ==================== CUBE CHARACTER ====================
function CubeCharacter() {
  return (
    <div className="relative w-28 h-28 md:w-36 md:h-36 mx-auto mb-4">
      {/* Glow */}
      <div className="absolute inset-0 bg-green-400 rounded-2xl blur-2xl opacity-40 animate-pulse" />
      
      {/* Cube body */}
      <div
        className="relative w-full h-full rounded-2xl border-4 border-white/80 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #00ff88, #00cc66)',
          boxShadow: '0 0 30px #00ff8860, inset 0 0 20px rgba(255,255,255,0.2)',
          animation: 'cubeFloat 2s ease-in-out infinite',
        }}
      >
        {/* Inner border */}
        <div className="absolute inset-2 rounded-xl border-2 border-white/30" />
        
        {/* Eye */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="w-12 h-12 md:w-14 md:h-14 bg-white rounded-full flex items-center justify-center shadow-lg">
            <div className="w-6 h-6 md:w-7 md:h-7 bg-gray-900 rounded-full relative">
              <div className="absolute top-1 right-1 w-2 h-2 bg-white rounded-full" />
            </div>
          </div>
        </div>

        {/* Shine effect */}
        <div className="absolute top-0 left-0 w-full h-1/3 bg-gradient-to-b from-white/30 to-transparent rounded-t-2xl" />
      </div>
    </div>
  );
}

// ==================== MAIN MENU ====================
export default function App() {
  const [showCredits, setShowCredits] = useState(false);
  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black select-none">
      <AnimatedBackground />

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full px-4">
        
        {/* Logo */}
        <div className="mb-2 text-center">
          <h1
            className="text-5xl sm:text-6xl md:text-8xl font-black tracking-tight leading-none"
            style={{
              background: 'linear-gradient(180deg, #ffffff 0%, #88ccff 50%, #4488ff 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 20px rgba(68, 136, 255, 0.5))',
            }}
          >
            GEOMETRY
          </h1>
          <h1
            className="text-5xl sm:text-6xl md:text-8xl font-black tracking-tight leading-none -mt-1 md:-mt-2"
            style={{
              background: 'linear-gradient(180deg, #ffffff 0%, #ff88cc 50%, #ff44aa 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 20px rgba(255, 68, 170, 0.5))',
            }}
          >
            DASH
          </h1>
        </div>

        {/* Cube */}
        <CubeCharacter />

        {/* Buttons */}
        <div className="flex flex-col gap-3 w-full max-w-xs mt-4">
          {/* PLAY button */}
          <button
            onMouseEnter={() => setHoveredBtn('play')}
            onMouseLeave={() => setHoveredBtn(null)}
            className="group relative w-full py-4 rounded-2xl font-bold text-xl text-white overflow-hidden transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
            style={{
              background: hoveredBtn === 'play'
                ? 'linear-gradient(135deg, #00ff88, #00cc66)'
                : 'linear-gradient(135deg, #00dd77, #00aa55)',
              boxShadow: hoveredBtn === 'play'
                ? '0 0 30px #00ff8860, 0 4px 15px rgba(0,0,0,0.3)'
                : '0 0 15px #00ff8830, 0 4px 10px rgba(0,0,0,0.3)',
              border: '3px solid rgba(255,255,255,0.3)',
            }}
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              <span className="text-2xl">▶</span>
              ИГРАТЬ
            </span>
            {/* Shine */}
            <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/20 to-transparent" />
          </button>

          {/* Level Select */}
          <button
            onMouseEnter={() => setHoveredBtn('levels')}
            onMouseLeave={() => setHoveredBtn(null)}
            className="group relative w-full py-3.5 rounded-2xl font-bold text-lg text-white overflow-hidden transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
            style={{
              background: hoveredBtn === 'levels'
                ? 'linear-gradient(135deg, #4488ff, #2266dd)'
                : 'linear-gradient(135deg, #3377ee, #1155cc)',
              boxShadow: hoveredBtn === 'levels'
                ? '0 0 25px #4488ff60, 0 4px 15px rgba(0,0,0,0.3)'
                : '0 0 10px #4488ff30, 0 4px 10px rgba(0,0,0,0.3)',
              border: '3px solid rgba(255,255,255,0.25)',
            }}
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              <span className="text-xl">📋</span>
              УРОВНИ
            </span>
            <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/15 to-transparent" />
          </button>

          {/* Row of small buttons */}
          <div className="flex gap-3 mt-1">
            {/* Settings */}
            <button
              onMouseEnter={() => setHoveredBtn('settings')}
              onMouseLeave={() => setHoveredBtn(null)}
              className="flex-1 py-3 rounded-xl font-bold text-base text-white transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
              style={{
                background: hoveredBtn === 'settings'
                  ? 'linear-gradient(135deg, #ffaa00, #dd8800)'
                  : 'linear-gradient(135deg, #ee9900, #cc7700)',
                boxShadow: '0 0 10px #ffaa0030, 0 3px 8px rgba(0,0,0,0.3)',
                border: '2px solid rgba(255,255,255,0.2)',
              }}
            >
              <span className="flex items-center justify-center gap-1">
                <span>⚙️</span> Настройки
              </span>
            </button>

            {/* Credits */}
            <button
              onMouseEnter={() => setHoveredBtn('credits')}
              onMouseLeave={() => setHoveredBtn(null)}
              onClick={() => setShowCredits(!showCredits)}
              className="flex-1 py-3 rounded-xl font-bold text-base text-white transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
              style={{
                background: hoveredBtn === 'credits'
                  ? 'linear-gradient(135deg, #aa44ff, #8822dd)'
                  : 'linear-gradient(135deg, #9933ee, #7711cc)',
                boxShadow: '0 0 10px #aa44ff30, 0 3px 8px rgba(0,0,0,0.3)',
                border: '2px solid rgba(255,255,255,0.2)',
              }}
            >
              <span className="flex items-center justify-center gap-1">
                <span>⭐</span> Об игре
              </span>
            </button>
          </div>
        </div>

        {/* Bottom info */}
        <div className="mt-8 text-center">
          <p className="text-white/40 text-sm">
            v1.0 • Geometry Dash Web
          </p>
        </div>
      </div>

      {/* Credits Modal */}
      {showCredits && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div
            className="bg-gray-900/95 p-8 rounded-3xl max-w-sm mx-4 text-center"
            style={{
              border: '3px solid #aa44ff',
              boxShadow: '0 0 40px #aa44ff40',
            }}
          >
            <h2
              className="text-3xl font-black mb-4"
              style={{
                background: 'linear-gradient(180deg, #fff, #aa44ff)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              GEOMETRY DASH
            </h2>
            <div className="space-y-3 text-gray-300 text-sm mb-6">
              <p>🎮 Веб-версия культовой игры</p>
              <p>🏆 20 уникальных уровней</p>
              <p>⭐ Собирай монеты</p>
              <p>🌀 Проходи через порталы</p>
              <p>⚡ Увеличивай скорость</p>
              <div className="pt-3 border-t border-white/10">
                <p className="text-white/60">Управление:</p>
                <p className="text-white/80 mt-1">Space / ↑ / Клик — прыжок</p>
              </div>
            </div>
            <button
              onClick={() => setShowCredits(false)}
              className="px-8 py-3 rounded-xl font-bold text-white transition-all hover:scale-105 active:scale-95 cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, #aa44ff, #8822dd)',
                border: '2px solid rgba(255,255,255,0.3)',
              }}
            >
              Закрыть
            </button>
          </div>
        </div>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes cubeFloat {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-12px) rotate(-3deg); }
          50% { transform: translateY(0) rotate(0deg); }
          75% { transform: translateY(-8px) rotate(3deg); }
        }
      `}</style>
    </div>
  );
}
