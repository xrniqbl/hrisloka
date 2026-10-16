// AppShell Astryx - Main application shell
import { AppShell as AstryxAppShell } from '@astryxdesign/core/AppShell';

export function AppShellAstryx({ children, className }) {
  return (
    <AstryxAppShell className={className}>
      {children}
    </AstryxAppShell>
  );
}

// SideNav Astryx - Sidebar navigation
import { SideNav as AstryxSideNav, SideNavItem as AstryxSideNavItem, SideNavSection as AstryxSideNavSection } from '@astryxdesign/core/SideNav';

export function SideNavAstryx({ items, sections, className }) {
  return (
    <AstryxSideNav className={className}>
      {sections && sections.map((section, idx) => (
        <AstryxSideNavSection key={idx} heading={section.heading}>
          {section.items && section.items.map((item, itemIdx) => (
            <AstryxSideNavItem
              key={itemIdx}
              href={item.href}
              icon={item.icon}
              label={item.label}
              isActive={item.isActive}
              onClick={item.onClick}
            />
          ))}
        </AstryxSideNavSection>
      ))}
      {items && items.map((item, idx) => (
        <AstryxSideNavItem
          key={idx}
          href={item.href}
          icon={item.icon}
          label={item.label}
          isActive={item.isActive}
          onClick={item.onClick}
        />
      ))}
    </AstryxSideNav>
  );
}

// TopNav Astryx - Top navigation bar
import { TopNav as AstryxTopNav, TopNavItem as AstryxTopNavItem } from '@astryxdesign/core/TopNav';

export function TopNavAstryx({ items, className }) {
  return (
    <AstryxTopNav className={className}>
      {items && items.map((item, idx) => (
        <AstryxTopNavItem
          key={idx}
          href={item.href}
          label={item.label}
          isActive={item.isActive}
          onClick={item.onClick}
        />
      ))}
    </AstryxTopNav>
  );
}

// Layout Astryx - Main layout container
import { Layout as AstryxLayout, LayoutHeader as AstryxLayoutHeader, LayoutContent as AstryxLayoutContent, LayoutFooter as AstryxLayoutFooter, LayoutPanel as AstryxLayoutPanel } from '@astryxdesign/core/Layout';

export function LayoutAstryx({ children, className }) {
  return (
    <AstryxLayout className={className}>
      {children}
    </AstryxLayout>
  );
}

export function LayoutHeaderAstryx({ children, className }) {
  return (
    <AstryxLayoutHeader className={className}>
      {children}
    </AstryxLayoutHeader>
  );
}

export function LayoutContentAstryx({ children, className }) {
  return (
    <AstryxLayoutContent className={className}>
      {children}
    </AstryxLayoutContent>
  );
}

export function LayoutFooterAstryx({ children, className }) {
  return (
    <AstryxLayoutFooter className={className}>
      {children}
    </AstryxLayoutFooter>
  );
}

export function LayoutPanelAstryx({ children, className }) {
  return (
    <AstryxLayoutPanel className={className}>
      {children}
    </AstryxLayoutPanel>
  );
}

// Section Astryx - Content section
import { Section as AstryxSection } from '@astryxdesign/core/Section';

export function SectionAstryx({ children, title, className }) {
  return (
    <AstryxSection title={title} className={className}>
      {children}
    </AstryxSection>
  );
}

// Stack Astryx - Vertical/horizontal stack layout
import { Stack as AstryxStack } from '@astryxdesign/core/Stack';

export function StackAstryx({ children, gap = 'md', direction = 'vertical', className }) {
  return (
    <AstryxStack gap={gap} direction={direction} className={className}>
      {children}
    </AstryxStack>
  );
}

// Grid Astryx - Grid layout
import { Grid as AstryxGrid, GridSpan as AstryxGridSpan } from '@astryxdesign/core/Grid';

export function GridAstryx({ children, columns = 1, gap = 'md', className }) {
  return (
    <AstryxGrid columns={columns} gap={gap} className={className}>
      {children}
    </AstryxGrid>
  );
}

export function GridSpanAstryx({ children, span = 1, className }) {
  return (
    <AstryxGridSpan span={span} className={className}>
      {children}
    </AstryxGridSpan>
  );
}

// Center Astryx - Center content
import { Center as AstryxCenter } from '@astryxdesign/core/Center';

export function CenterAstryx({ children, className }) {
  return (
    <AstryxCenter className={className}>
      {children}
    </AstryxCenter>
  );
}

// FormLayout Astryx - Form layout
import { FormLayout as AstryxFormLayout } from '@astryxdesign/core/FormLayout';

export function FormLayoutAstryx({ children, direction = 'vertical', className }) {
  return (
    <AstryxFormLayout direction={direction} className={className}>
      {children}
    </AstryxFormLayout>
  );
}
