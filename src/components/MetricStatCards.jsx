/**
 * MetricStatCards — compact, monochrome KPI strip (Astryx Card + Icon).
 * Clean borders, low height, no rainbow fills.
 */
import { Card } from '@astryxdesign/core/Card';
import { Icon } from '@astryxdesign/core/Icon';
import { Text } from '@astryxdesign/core/Text';
import { HStack } from '@astryxdesign/core/HStack';
import { Grid } from '@astryxdesign/core/Grid';
import './MetricStatCards.css';

/**
 * @param {{
 *  items: Array<{ key: string, label: string, value: number|string, icon?: import('lucide-react').LucideIcon }>,
 *  activeKey?: string|null,
 *  onSelect?: (key: string) => void,
 *  className?: string
 * }} props
 */
export default function MetricStatCards({ items = [], activeKey = null, onSelect, className = '' }) {
  return (
    <Grid
      columns={{ minWidth: 128, max: Math.max(5, items.length || 5), repeat: 'fill' }}
      gap={1.5}
      className={`metric-stat-grid ${className}`.trim()}
    >
      {items.map((item) => {
        const isActive = activeKey != null && activeKey === item.key;
        const clickable = typeof onSelect === 'function';
        return (
          <Card
            key={item.key}
            variant="default"
            padding={0}
            className={[
              'metric-stat-card',
              isActive ? 'metric-stat-card--active' : '',
              clickable ? 'metric-stat-card--clickable' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={clickable ? () => onSelect(item.key) : undefined}
            role={clickable ? 'button' : undefined}
            tabIndex={clickable ? 0 : undefined}
            onKeyDown={
              clickable
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelect(item.key);
                    }
                  }
                : undefined
            }
          >
            <HStack hAlign="between" vAlign="center" gap={2} className="metric-stat-inner">
              <HStack gap={1.5} vAlign="center" className="metric-stat-left">
                {item.icon ? (
                  <span className="metric-stat-icon" aria-hidden>
                    <Icon icon={item.icon} size="sm" color="inherit" />
                  </span>
                ) : null}
                <Text type="supporting" color="secondary" className="metric-stat-label">
                  {item.label}
                </Text>
              </HStack>
              <span className="metric-stat-value">{item.value}</span>
            </HStack>
          </Card>
        );
      })}
    </Grid>
  );
}
