import React from 'react';

export default function ServinowLogo({ 
  width = 64, // Increased default size slightly (was 48)
  height = 64, 
  variant = 'auto', // 'auto', 'gold', 'dark'
  className = '' 
}) {
  return (
    <svg 
      width={width} 
      height={height} 
      viewBox="0 0 400 400" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={`servinow-logo ${className} variant-${variant}`}
    >
      <defs>
        {/* Dynamic Gradient using CSS Variables */}
        <linearGradient id="servinowGoldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" className="stop-1" />
          <stop offset="50%" className="stop-2" />
          <stop offset="100%" className="stop-3" />
        </linearGradient>
        
        <filter id="servinowShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="10" />
          <feOffset dx="0" dy="10" result="offsetblur" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.3" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g className="logo-group">
        {/* Sphere */}
        <circle 
          cx="200" 
          cy="150" 
          r="110" 
          className="logo-element"
        />
        
        {/* Crescent */}
        <path 
          d="M100 240 C 100 320, 300 320, 300 240 C 300 290, 100 290, 100 240 Z" 
          className="logo-element"
        />
        
        {/* Horizontal Line */}
        <rect 
          x="50" 
          y="270" 
          width="300" 
          height="10" 
          rx="5"
          className="logo-element"
        />
      </g>

      <style>{`
        .servinow-logo .logo-element {
          fill: var(--gold);
          filter: url(#servinowShadow);
        }

        .servinow-logo .stop-1 { stop-color: var(--primary-light); }
        .servinow-logo .stop-2 { stop-color: var(--gold); }
        .servinow-logo .stop-3 { stop-color: var(--primary-dark); }

        /* When explicitly gold */
        .servinow-logo.variant-gold .logo-element {
          fill: url(#servinowGoldGradient);
        }

        /* When explicitly dark or theme is light */
        [data-theme="light"] .servinow-logo.variant-auto .logo-element,
        .servinow-logo.variant-dark .logo-element {
          fill: #000000;
          filter: none;
        }

        /* Standard Auto behavior (Gold on dark theme) */
        [data-theme="dark"] .servinow-logo.variant-auto .logo-element {
          fill: url(#servinowGoldGradient);
          filter: url(#servinowShadow);
        }
        
        /* If no theme is defined yet, default to gold */
        .servinow-logo.variant-auto .logo-element {
          fill: url(#servinowGoldGradient);
        }
      `}</style>
    </svg>
  );
}
