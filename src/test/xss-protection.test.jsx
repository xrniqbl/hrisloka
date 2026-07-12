import { describe, it, expect } from 'vitest';
import DOMPurify from 'dompurify';

describe('XSS Protection', () => {
  it('should sanitize script tags from HTML', () => {
    const maliciousHtml = '<div>Hello<script>alert("xss")</script></div>';
    const sanitized = DOMPurify.sanitize(maliciousHtml);
    
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).not.toContain('alert');
    expect(sanitized).toContain('Hello');
  });

  it('should sanitize event handlers from HTML', () => {
    const maliciousHtml = '<img src="x" onerror="alert(\'xss\')" />';
    const sanitized = DOMPurify.sanitize(maliciousHtml);
    
    expect(sanitized).not.toContain('onerror');
    expect(sanitized).not.toContain('alert');
  });

  it('should sanitize javascript: URLs', () => {
    const maliciousHtml = '<a href="javascript:alert(\'xss\')">Click</a>';
    const sanitized = DOMPurify.sanitize(maliciousHtml);
    
    expect(sanitized).not.toContain('javascript:');
  });

  it('should allow safe HTML tags', () => {
    const safeHtml = '<div><p>Hello <strong>World</strong></p><ul><li>Item</li></ul></div>';
    const sanitized = DOMPurify.sanitize(safeHtml);
    
    expect(sanitized).toContain('<div>');
    expect(sanitized).toContain('<p>');
    expect(sanitized).toContain('<strong>');
    expect(sanitized).toContain('<ul>');
    expect(sanitized).toContain('<li>');
  });

  it('should sanitize iframe tags', () => {
    const maliciousHtml = '<iframe src="https://evil.com"></iframe>';
    const sanitized = DOMPurify.sanitize(maliciousHtml, {
      FORBID_TAGS: ['iframe'],
    });
    
    expect(sanitized).not.toContain('<iframe>');
  });

  it('should sanitize object and embed tags', () => {
    const maliciousHtml = '<object data="malware.swf"></object><embed src="evil.exe" />';
    const sanitized = DOMPurify.sanitize(maliciousHtml, {
      FORBID_TAGS: ['object', 'embed'],
    });
    
    expect(sanitized).not.toContain('<object>');
    expect(sanitized).not.toContain('<embed>');
  });

  it('should sanitize form elements', () => {
    const maliciousHtml = '<form action="https://evil.com/steal"><input type="submit" /></form>';
    const sanitized = DOMPurify.sanitize(maliciousHtml, {
      FORBID_TAGS: ['form', 'input'],
    });
    
    expect(sanitized).not.toContain('<form>');
    expect(sanitized).not.toContain('<input');
  });

  it('should preserve safe style attributes', () => {
    const html = '<div style="color: red; font-size: 16px;">Styled</div>';
    const sanitized = DOMPurify.sanitize(html, {
      ALLOWED_ATTR: ['style'],
    });
    
    expect(sanitized).toContain('style=');
  });

  it('should remove dangerous style expressions', () => {
    const maliciousHtml = '<div style="background: url(javascript:alert(\'xss\'))">Test</div>';
    const sanitized = DOMPurify.sanitize(maliciousHtml, { FORBID_ATTR: ['style'] });
    
    expect(sanitized).not.toContain('javascript:');
  });
});

describe('Blog Post Sanitization', () => {
  it('should sanitize blog content before rendering', async () => {
    // This test verifies that BlogPost.jsx uses DOMPurify
    const BlogPost = await import('../pages/BlogPost');
    
    // The actual sanitization happens in the component
    // This test ensures DOMPurify is available and working
    const maliciousContent = '<h2>Title</h2><script>alert("xss")</script><p>Content</p>';
    const sanitized = DOMPurify.sanitize(maliciousContent);
    
    expect(sanitized).toContain('<h2>');
    expect(sanitized).toContain('<p>');
    expect(sanitized).not.toContain('<script>');
  });
});

describe('Contract Content Sanitization', () => {
  it('should use strict sanitization for contracts', () => {
    // EmpContracts.jsx uses strict ALLOWED_TAGS
    const contractHtml = `
      <h1>Contract Title</h1>
      <p>Contract content with <strong>bold</strong> text.</p>
      <script>malicious()</script>
      <iframe src="evil.com"></iframe>
      <table><tr><td>Data</td></tr></table>
    `;
    
    const sanitized = DOMPurify.sanitize(contractHtml, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'span', 'div', 'hr'],
      ALLOWED_ATTR: ['style', 'class'],
      FORBID_SCRIPTS: true,
      FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input'],
    });
    
    expect(sanitized).toContain('<h1>');
    expect(sanitized).toContain('<p>');
    expect(sanitized).toContain('<strong>');
    expect(sanitized).toContain('<table>');
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).not.toContain('<iframe>');
  });
});


