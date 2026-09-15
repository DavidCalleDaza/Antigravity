import React from 'react';
import { useStore } from '../../store/useStore';

export default function DonAppLogo({
  width = 64,
  height = 64,
  variant = 'auto',
  className = ''
}) {
  const storeTheme = useStore((state) => state.theme);
  const isDark = variant === 'gold' || (variant === 'auto' && storeTheme === 'dark');

  return (
    <span
      className={`donapp-logo ${className} variant-${variant} ${isDark ? 'is-dark' : 'is-light'}`}
      style={{ width, height, display: 'inline-block', position: 'relative' }}
    >
      <style>{`
        .donapp-logo img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: contain;
          transition: opacity 0.2s ease;
        }

        .donapp-logo .logo-black { display: block; }
        .donapp-logo .logo-gold {
          display: none;
          filter: drop-shadow(0 2px 8px rgba(212, 175, 55, 0.4));
        }

        .donapp-logo.variant-gold .logo-black { display: none !important; }
        .donapp-logo.variant-gold .logo-gold { display: block !important; }

        .donapp-logo.variant-dark .logo-black { display: block !important; }
        .donapp-logo.variant-dark .logo-gold { display: none !important; }

        .donapp-logo.is-dark .logo-black { display: none !important; }
        .donapp-logo.is-dark .logo-gold { display: block !important; }

        .donapp-logo.is-light .logo-black { display: block !important; }
        .donapp-logo.is-light .logo-gold { display: none !important; }

        [data-theme="dark"] .donapp-logo.variant-auto .logo-black { display: none !important; }
        [data-theme="dark"] .donapp-logo.variant-auto .logo-gold { display: block !important; }

        [data-theme="light"] .donapp-logo.variant-auto .logo-black { display: block !important; }
        [data-theme="light"] .donapp-logo.variant-auto .logo-gold { display: none !important; }
      `}</style>
      <img src="/assets/logo-mark-black.png" alt="DonApp" className="logo-black" />
      <img src="/assets/logo-mark-white.png" alt="DonApp" className="logo-gold" />
    </span>
  );
}