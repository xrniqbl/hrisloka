import { useState, useRef, useEffect } from 'react';
import { FiSliders } from 'react-icons/fi';

const widgetLabels = {
  trend: 'Attendance Trend',
  demographics: 'Demographics',
  headcount: 'Headcount',
  division: 'Division Distribution',
};

export default function WidgetSettings({ widgets, toggleWidget }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        title="Widget Settings"
        style={{
          width: 32, height: 32, borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--dash-card-bg)', border: '1px solid var(--dash-card-border)',
          color: 'var(--dash-text-secondary)', cursor: 'pointer', fontSize: 14,
          transition: 'all 0.15s ease', fontFamily: 'var(--dash-font)',
        }}
      >
        <FiSliders />
      </button>
      {open && (
        <div className="dash-widget-dropdown">
          {Object.entries(widgetLabels).map(([key, label]) => (
            <div key={key} className="dash-widget-item" onClick={() => toggleWidget(key)}>
              <div className={`dash-widget-toggle ${widgets[key] ? 'on' : ''}`}>
                {widgets[key] ? '✓' : ''}
              </div>
              {label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
