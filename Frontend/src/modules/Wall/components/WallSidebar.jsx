import React from 'react';
import { ArrowRight } from 'lucide-react';

export default function WallSidebar({ sidebarKpis, setActivityDrawer }) {
  return (
    <aside className="wall-sidebar">
      <div className="wall-sidebar-kpis reveal">
        {sidebarKpis.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <div className="wall-kpi-card" key={i}>
              <div className="wall-kpi-top">
                <span className="wall-kpi-label">{kpi.label}</span>
              </div>
              <div className="wall-kpi-value">{kpi.value}</div>
              <div className="wall-kpi-icon-wrapper">
                <Icon size={18} strokeWidth={1.5} />
              </div>
            </div>
          );
        })}
      </div>

      <div
        className="wall-activity-teaser reveal"
        onClick={() => setActivityDrawer('chart')}
        role="button"
        tabIndex={0}
      >
        <span className="wall-section-title">Actividad del Muro</span>
        <ArrowRight size={16} />
      </div>

      <div
        className="wall-activity-teaser reveal"
        onClick={() => setActivityDrawer('recent')}
        role="button"
        tabIndex={0}
      >
        <span className="wall-section-title">Actividad Reciente</span>
        <ArrowRight size={16} />
      </div>
    </aside>
  );
}
