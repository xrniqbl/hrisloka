// AppShell Astryx - Main application shell
import { AppShell as AstryxAppShell } from '@astryxdesign/core/AppShell';

export function AppShellAstryx({ 
  sideNav, 
  topNav, 
  children, 
  className 
}) {
  return (
    <AstryxAppShell
      sideNav={sideNav}
      topNav={topNav}
      className={className}
    >
      {children}
    </AstryxAppShell>
  );
}

// SideNav Astryx - Sidebar navigation
import { SideNav as AstryxSideNav, SideNavItem as AstryxSideNavItem, SideNavSection as AstryxSideNavSection, SideNavHeading as AstryxSideNavHeading } from '@astryxdesign/core/SideNav';

export function SideNavAstryx({ items, className }) {
  return (
    <AstryxSideNav className={className}>
      {items.map((section, idx) => (
        <SideNavSectionAstryx key={idx} items={section.items} heading={section.heading} />
      ))}
    </AstryxSideNav>
  );
}

export function SideNavSectionAstryx({ items, heading }) {
  return (
    <>
      {heading && <AstryxSideNavHeading>{heading}</AstryxSideNavHeading>}
      {items.map((item, idx) => (
        <AstryxSideNavItem
          key={idx}
          href={item.href}
          icon={item.icon}
          label={item.label}
          isActive={item.isActive}
          badge={item.badge}
        />
      ))}
    </>
  );
}

// TopNav Astryx - Top navigation bar
import { TopNav as AstryxTopNav, TopNavItem as AstryxTopNavItem, TopNavHeading as AstryxTopNavHeading, TopNavMenu as AstryxTopNavMenu } from '@astryxdesign/core/TopNav';

export function TopNavAstryx({ items, brand, className }) {
  return (
    <AstryxTopNav brand={brand} className={className}>
      {items.map((item, idx) => (
        <AstryxTopNavItem
          key={idx}
          href={item.href}
          label={item.label}
          icon={item.icon}
          isActive={item.isActive}
          menu={item.menu}
        />
      ))}
    </AstryxTopNav>
  );
}

// Layout Astryx - Layout primitives
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

// Section Astryx - Section grouping
import { Section as AstryxSection } from '@astryxdesign/core/Section';

export function SectionAstryx({ children, title, description, className }) {
  return (
    <AstryxSection title={title} description={description} className={className}>
      {children}
    </AstryxSection>
  );
}

// Stack Astryx - Vertical/horizontal stack
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

export function GridAstryx({ children, columns, gap = 'md', className }) {
  return (
    <AstryxGrid columns={columns} gap={gap} className={className}>
      {children}
    </AstryxGrid>
  );
}

export function GridSpanAstryx({ children, span, className }) {
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
