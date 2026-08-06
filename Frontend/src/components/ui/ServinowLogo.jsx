import React from 'react';

export default function ServinowLogo({ 
  width = 64, 
  height = 64, 
  variant = 'auto',
  className = '' 
}) {
  return (
    <span
      className={`servinow-logo ${className} variant-${variant}`}
      style={{ width, height, display: 'inline-block' }}
    >
      <style>{`
        .servinow-logo {
          -webkit-mask-image: url(/assets/logo-mark.png);
          mask-image: url(/assets/logo-mark.png);
          -webkit-mask-size: contain;
          mask-size: contain;
          -webkit-mask-repeat: no-repeat;
          mask-repeat: no-repeat;
          -webkit-mask-position: center;
          mask-position: center;
          background: linear-gradient(135deg, var(--primary-light) 0%, var(--gold) 50%, var(--primary-dark) 100%);
          filter: drop-shadow(0 10px 8px rgba(0,0,0,0.3));
        }

        .servinow-logo.variant-gold {
          background: linear-gradient(135deg, var(--primary-light) 0%, var(--gold) 50%, var(--primary-dark) 100%);
          filter: drop-shadow(0 10px 8px rgba(0,0,0,0.3));
        }

        [data-theme="light"] .servinow-logo.variant-auto,
        .servinow-logo.variant-dark {
          background: #000000;
          filter: none;
        }

        [data-theme="dark"] .servinow-logo.variant-auto {
          background: linear-gradient(135deg, var(--primary-light) 0%, var(--gold) 50%, var(--primary-dark) 100%);
          filter: drop-shadow(0 10px 8px rgba(0,0,0,0.3));
        }
      `}</style>
    </span>
  );
}
