import React from 'react';

export default function DonAppLogo({
  width = 64,
  height = 64,
  variant = 'auto',
  className = ''
}) {
  return (
    <span
      className={`donapp-logo ${className} variant-${variant}`}
      style={{ width, height, display: 'inline-block', position: 'relative' }}
    >
      <style>{`
        .donapp-logo img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .donapp-logo .logo-black { display: block; }
        .donapp-logo .logo-gold {
          display: none;
          filter: drop-shadow(0 10px 8px rgba(0,0,0,0.3));
        }

        .donapp-logo.variant-gold .logo-black { display: none; }
        .donapp-logo.variant-gold .logo-gold { display: block; }

        .donapp-logo.variant-dark .logo-black { display: block; }
        .donapp-logo.variant-dark .logo-gold { display: none; }

        [data-theme="dark"] .donapp-logo.variant-auto .logo-black { display: none; }
        [data-theme="dark"] .donapp-logo.variant-auto .logo-gold { display: block; }
      `}</style>
      <img src="/assets/logo_astronauta_transparent.png" alt="DonApp" className="logo-black" />
      <img src="/assets/logo_astronauta_transparent_gold.png" alt="DonApp" className="logo-gold" />
    </span>
  );
}