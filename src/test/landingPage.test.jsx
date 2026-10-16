import { afterEach, beforeEach, describe, expect, it } from 'vitest';

beforeEach(() => {
  globalThis.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LandingPage from '../pages/LandingPage';

afterEach(cleanup);

function renderLanding() {
  return render(<MemoryRouter><LandingPage /></MemoryRouter>);
}

describe('KiniKerja landing page', () => {
  it('uses KiniKerja throughout the visible landing and document title', () => {
    const { container } = renderLanding();
    expect(screen.getAllByText(/kinikerja/i).length).toBeGreaterThan(2);
    expect(container.textContent).not.toMatch(/kerja kita|workify/i);
    expect(document.title).toMatch(/kinikerja/i);
  });

  it('navigates to real landing sections and signup from the primary CTA', () => {
    renderLanding();
    expect(screen.getAllByRole('link', { name: /^features$/i })[0].getAttribute('href')).toBe('#features');
    expect(screen.getAllByRole('link', { name: /get started/i })[0].getAttribute('href')).toBe('/login');
  });

  it('exposes the FAQ state to assistive technology', () => {
    renderLanding();
    const question = screen.getByRole('button', { name: /what is included in the hr management system/i });
    const item = question.closest('.kk2-faq-item');
    expect(item.classList.contains('open')).toBe(false);
    fireEvent.click(question);
    expect(item.classList.contains('open')).toBe(true);
  });

  it('layers an independent landscape behind the dashboard', () => {
    const { container } = renderLanding();
    expect(container.querySelector('.kk2-hero-deco')).not.toBeNull();
    expect(container.querySelector('.kk2-hero-deco').getAttribute('aria-hidden')).toBe('true');
  });

  it('shows a phone preview carrying KiniKerja branding', () => {
    const { container } = renderLanding();
    expect(container.querySelector('.kk2-brand')?.textContent).toMatch(/kinikerja/i);
    expect(container.querySelector('.kk2-testi-client')?.textContent).toMatch(/Samantha Grey/);
  });

  it('keeps the complete preview dashboard visible above its fade layer', () => {
    const { container } = renderLanding();
    expect(container.querySelector('.kk2-features-grid')).not.toBeNull();
    expect(container.querySelector('.kk2-plans')).not.toBeNull();
  });

  it('does not advertise an unavailable video or fabricated customer endorsement', () => {
    const { container } = renderLanding();
    expect(screen.queryByRole('button', { name: /play video/i })).toBeNull();
    expect(container.textContent).not.toMatch(/marcus chen|sofia patel|daniel kim|atlas retail/i);
  });
});
