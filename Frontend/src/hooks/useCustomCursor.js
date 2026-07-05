import { useEffect } from 'react';

export const useCustomCursor = () => {
  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return;

    const cur = document.getElementById('cursor');
    const ring = document.getElementById('cursorRing');
    
    if (!cur || !ring) return;

    let mx = 0, my = 0, rx = 0, ry = 0;
    
    const onMouseMove = (e) => {
      mx = e.clientX;
      my = e.clientY;
      cur.style.left = mx + 'px';
      cur.style.top = my + 'px';
    };

    const loop = () => {
      rx += (mx - rx) * 0.12;
      ry += (my - ry) * 0.12;
      ring.style.left = rx + 'px';
      ring.style.top = ry + 'px';
      requestAnimationFrame(loop);
    };

    const updateHoverStates = () => {
      const interactables = document.querySelectorAll('a, button, .feature-card, .benefit-card, .impact-card, .service-card, .drawer-list-item, .drawer-close, .role-option, input, select, textarea');
      
      interactables.forEach(el => {
        el.addEventListener('mouseenter', () => ring.classList.add('expand'));
        el.addEventListener('mouseleave', () => ring.classList.remove('expand'));
      });
    };

    document.addEventListener('mousemove', onMouseMove);
    const animationId = requestAnimationFrame(loop);
    
    // Initial call and also observe DOM changes to attach listeners to new elements
    updateHoverStates();
    
    const observer = new MutationObserver(() => {
      updateHoverStates();
    });
    
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      cancelAnimationFrame(animationId);
      observer.disconnect();
    };
  }, []);
};
