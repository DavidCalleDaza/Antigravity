import { useEffect, useRef } from 'react';
import './ParticleNetwork.css';

export default function ParticleNetwork({ particleCount = 60, connectionDistance = 110 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const container = canvas.parentElement;
    if (!container) return;

    let particles = [];
    let animationFrameId;

    const resizeCanvas = () => {
      if (canvas.parentElement) {
        canvas.width = canvas.parentElement.offsetWidth;
        canvas.height = canvas.parentElement.offsetHeight;
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const createParticle = (origin) => {
      const angle = origin ? Math.random() * Math.PI * 2 : Math.random() * Math.PI * 2;
      const speed = origin ? Math.random() * 0.5 + 0.2 : Math.random() * 0.8 + 0.2;
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 3 + 0.5,
        baseSize: Math.random() * 3 + 0.5,
        speedX: Math.cos(angle) * speed,
        speedY: Math.sin(angle) * speed,
        opacity: Math.random() * 0.3 + 0.1,
        baseOpacity: Math.random() * 0.3 + 0.1,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: Math.random() * 0.02 + 0.01
      };
    };

    const spawnParticle = (x, y) => {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 1.5 + 0.5;
      return {
        x: x || Math.random() * canvas.width,
        y: y || Math.random() * canvas.height,
        size: Math.random() * 2 + 1,
        baseSize: Math.random() * 2 + 1,
        speedX: Math.cos(angle) * speed,
        speedY: Math.sin(angle) * speed,
        opacity: Math.random() * 0.4 + 0.2,
        baseOpacity: Math.random() * 0.4 + 0.2,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: Math.random() * 0.03 + 0.015,
        life: 1,
        decaying: true
      };
    };

    for (let i = 0; i < particleCount; i++) particles.push(createParticle(false));

    let mouseX = canvas.width / 2;
    let mouseY = canvas.height / 2;
    let mouseInCanvas = false;

    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
      mouseInCanvas = true;
    };
    const handleMouseLeave = () => {
      mouseInCanvas = false;
    };
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);

    const animateParticles = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (mouseInCanvas) {
        for (let i = 0; i < 2; i++) {
          if (Math.random() < 0.3) {
            particles.push(spawnParticle(mouseX, mouseY));
          }
        }
      }

      particles = particles.filter(p => {
        if (p.decaying) {
          p.life -= 0.015;
          return p.life > 0;
        }
        return true;
      });

      particles.forEach(p => {
        p.pulse += p.pulseSpeed;
        p.opacity = p.baseOpacity * (0.7 + Math.sin(p.pulse) * 0.3);
        p.size = p.baseSize * (0.8 + Math.sin(p.pulse) * 0.2);

        if (mouseInCanvas && !p.decaying) {
          const dx = mouseX - p.x;
          const dy = mouseY - p.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 150) {
            p.speedX += (dx / dist) * 0.02;
            p.speedY += (dy / dist) * 0.02;
            const maxSpeed = 2;
            const currentSpeed = Math.hypot(p.speedX, p.speedY);
            if (currentSpeed > maxSpeed) {
              p.speedX = (p.speedX / currentSpeed) * maxSpeed;
              p.speedY = (p.speedY / currentSpeed) * maxSpeed;
            }
          }
        }

        p.x += p.speedX;
        p.y += p.speedY;

        const maxSpeed = 1.5;
        const currentSpeed = Math.hypot(p.speedX, p.speedY);
        if (currentSpeed > maxSpeed) {
          p.speedX = (p.speedX / currentSpeed) * maxSpeed;
          p.speedY = (p.speedY / currentSpeed) * maxSpeed;
        }

        const friction = 0.995;
        p.speedX *= friction;
        p.speedY *= friction;

        if (p.x < 0) { p.x = 0; p.speedX *= -0.5; }
        if (p.x > canvas.width) { p.x = canvas.width; p.speedX *= -0.5; }
        if (p.y < 0) { p.y = 0; p.speedY *= -0.5; }
        if (p.y > canvas.height) { p.y = canvas.height; p.speedY *= -0.5; }

        const isLight = document.documentElement.getAttribute('data-theme') === 'light';
        const accentRGB = isLight ? '62, 180, 137' : '201, 165, 90';
        const innerRGB = isLight ? '200, 255, 230' : '255, 235, 180';

        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
        gradient.addColorStop(0, `rgba(${accentRGB}, ${p.opacity})`);
        gradient.addColorStop(0.5, `rgba(${accentRGB}, ${p.opacity * 0.4})`);
        gradient.addColorStop(1, `rgba(${accentRGB}, 0)`);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${innerRGB}, ${p.opacity})`;
        ctx.fill();
      });

      const isLight = document.documentElement.getAttribute('data-theme') === 'light';
      const lineRGB = isLight ? '62, 180, 137' : '201, 165, 90';

      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist < connectionDistance) {
            const opacity = (1 - dist / connectionDistance) * (isLight ? 0.25 : 0.15);
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(${lineRGB}, ${opacity})`;
            ctx.lineWidth = isLight ? 0.6 : 0.4;
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(animateParticles);
    };

    try {
      animateParticles();
    } catch (e) {
      console.warn('[ParticleNetwork] Animación de partículas no disponible:', e.message);
    }

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, [particleCount, connectionDistance]);

  return <canvas ref={canvasRef} className="particle-network-canvas" />;
}
