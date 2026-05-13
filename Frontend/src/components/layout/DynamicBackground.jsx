import React, { useEffect, useState } from 'react';
import './DynamicBackground.css';

export default function DynamicBackground() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    const handleMouseMove = (e) => {
      // Use requestAnimationFrame for smooth performance
      requestAnimationFrame(() => {
        setMousePosition({
          x: e.clientX,
          y: e.clientY
        });
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Generate some random particles for the gold dust effect
  const particles = Array.from({ length: 15 }).map((_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    animationDuration: `${15 + Math.random() * 20}s`,
    animationDelay: `-${Math.random() * 20}s`,
    size: `${2 + Math.random() * 4}px`,
    opacity: 0.1 + Math.random() * 0.4
  }));

  return (
    <div className="dynamic-watercolor-bg">
      {/* Interactive Mouse Glow */}
      {isClient && (
        <div 
          className="mouse-glow"
          style={{
            transform: `translate(${mousePosition.x}px, ${mousePosition.y}px)`
          }}
        />
      )}

      {/* Main Watercolor Blobs */}
      <div className="blob blob-1"></div>
      <div className="blob blob-2"></div>
      <div className="blob blob-3"></div>
      <div className="blob blob-4"></div>
      
      {/* Floating Gold Dust Particles */}
      <div className="particles-container">
        {particles.map(p => (
          <div 
            key={p.id} 
            className="particle"
            style={{
              left: p.left,
              width: p.size,
              height: p.size,
              animationDuration: p.animationDuration,
              animationDelay: p.animationDelay,
              opacity: p.opacity
            }}
          />
        ))}
      </div>

      {/* SVG Texture Noise */}
      <div className="noise-overlay"></div>
    </div>
  );
}
