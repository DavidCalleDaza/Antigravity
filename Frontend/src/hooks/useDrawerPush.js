import { useCallback, useEffect, useState } from 'react';
import { useStore, DRAWER_WIDTH } from '../store/useStore';

const DESKTOP_BREAKPOINT = 1024;

export function useDrawerPush() {
  const {
    landingDrawers,
    openFeatureDrawer,
    closeFeatureDrawer,
    openBenefitDrawer,
    closeBenefitDrawer,
    closeAllLandingDrawers,
  } = useStore();

  const [isDesktop, setIsDesktop] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= DESKTOP_BREAKPOINT : true
  );

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= DESKTOP_BREAKPOINT);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isAnyDrawerOpen = landingDrawers.feature.isOpen || landingDrawers.benefit.isOpen;

  const pushOffset = isAnyDrawerOpen && isDesktop ? DRAWER_WIDTH : 0;

  const handleOpenFeatureDrawer = useCallback(() => {
    closeBenefitDrawer();
    openFeatureDrawer();
  }, [closeBenefitDrawer, openFeatureDrawer]);

  const handleOpenBenefitDrawer = useCallback(() => {
    closeFeatureDrawer();
    openBenefitDrawer();
  }, [closeFeatureDrawer, openBenefitDrawer]);

  useEffect(() => {
    if (isAnyDrawerOpen) {
      document.body.style.overflowX = 'hidden';
    } else {
      document.body.style.overflowX = '';
    }

    return () => {
      document.body.style.overflowX = '';
    };
  }, [isAnyDrawerOpen]);

  return {
    featureDrawer: landingDrawers.feature,
    benefitDrawer: landingDrawers.benefit,
    isAnyDrawerOpen,
    isDesktop,
    pushOffset,
    drawerWidth: DRAWER_WIDTH,
    openFeatureDrawer: handleOpenFeatureDrawer,
    closeFeatureDrawer,
    openBenefitDrawer: handleOpenBenefitDrawer,
    closeBenefitDrawer,
    closeAllDrawers: closeAllLandingDrawers,
  };
}