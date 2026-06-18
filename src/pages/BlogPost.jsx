import { useEffect } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { updateSEOTags, injectSchema } from '../lib/seo';
import { ARTICLES } from './Blog';

export default function BlogPost() {
  const { slug } = useParams();
  const article = ARTICLES.find(a => a.slug === slug);

  useEffect(() => {
    if (!article) return;
    updateSEOTags({
      title: `${article.title} | HRIS Loka Blog`,
      description: article.excerpt,
      canonical: `https://hrisloka.com/blog/${article.slug}`,
      keywords: article.keywords.join(', '),
    });
    injectSchema(`blogpost-${article.slug}`, {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: article.title,
      description: article.excerpt,
      url: `https://hrisloka.com/blog/${article.slug}`,
      datePublished: article.date,
      dateModified: article.date,
      author: { '@type': 'Organization', name: 'HRIS Loka', url: 'https://hrisloka.com' },
      publisher: {
        '@type': 'Organization',
        name: 'HRIS Loka',
        logo: { '@type': 'ImageObject', url: 'https://hrisloka.com/landing/hrislokabluepanjang.png' },
      },
      keywords: article.keywords.join(', '),
      inLanguage: 'id',
      isPartOf: { '@type': 'Blog', name: 'Blog HRIS Loka', url: 'https://hrisloka.com/blog' },
    });
  }, [article]);

  if (!article) return <Navigate to="/blog" replace />;

  const s = {
    nav: { padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', background: '#fff', position: 'sticky', top: 0, zIndex: 100 },
    logo: { fontSize: 20, fontWeight: 900, color: '#0047AB', textDecoration: 'none' },
    wrap: { maxWidth: 780, margin: '0 auto', padding: '48px 24px 80px' },
    breadcrumb: { fontSize: 13, color: '#94A3B8', marginBottom: 24 },
    category: { fontSize: 12, fontWeight: 800, color: '#0047AB', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
    h1: { fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 900, color: '#0F172A', lineHeight: 1.25, marginBottom: 16 },
    meta: { display: 'flex', gap: 16, fontSize: 13, color: '#64748B', marginBottom: 32, paddingBottom: 24, borderBottom: '1px solid #E2E8F0' },
    content: { fontSize: 16, lineHeight: 1.8, color: '#374151' },
    cta: { marginTop: 56, padding: '40px', background: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)', borderRadius: 20, textAlign: 'center', border: '1.5px solid #BFDBFE' },
  };

  return (
    <>
      <nav style={s.nav}>
        <Link to="/" style={s.logo}>HRIS Loka</Link>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <Link to="/blog" style={{ fontSize: 14, color: '#64748B', textDecoration: 'none', fontWeight: 600 }}>Blog</Link>
          <Link to="/checkout" style={{ padding: '8px 20px', background: '#0047AB', color: '#fff', borderRadius: 10, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>Mulai Sekarang</Link>
        </div>
      </nav>

      <main style={s.wrap}>
        <div style={s.breadcrumb}>
          <Link to="/" style={{ color: '#94A3B8', textDecoration: 'none' }}>Beranda</Link>
          {' '}/{' '}
          <Link to="/blog" style={{ color: '#94A3B8', textDecoration: 'none' }}>Blog</Link>
          {' '}/{' '}
          <span style={{ color: '#0047AB' }}>{article.category}</span>
        </div>

        <article>
          <div style={s.category}>{article.category}</div>
          <h1 style={s.h1}>{article.title}</h1>
          <div style={s.meta}>
            <span>📅 {new Date(article.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            <span>⏱ {article.readTime} membaca</span>
            <span>✍️ Tim HRIS Loka</span>
          </div>

          <p style={{ ...s.content, fontWeight: 600, color: '#475569', fontSize: 18, marginBottom: 32, paddingBottom: 24, borderBottom: '1px solid #E2E8F0' }}>
            {article.excerpt}
          </p>

          <div
            style={s.content}
            dangerouslySetInnerHTML={{ __html: article.content
              .replace(/<h2>/g, '<h2 style="font-size:22px;font-weight:800;color:#0F172A;margin:32px 0 12px">')
              .replace(/<h3>/g, '<h3 style="font-size:18px;font-weight:700;color:#1E293B;margin:24px 0 8px">')
              .replace(/<ul>/g, '<ul style="margin:12px 0 20px;padding-left:20px">')
              .replace(/<li>/g, '<li style="margin-bottom:8px">')
              .replace(/<p>/g, '<p style="margin-bottom:16px">')
            }}
          />
        </article>

        {/* In-article CTA */}
        <div style={s.cta}>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#0047AB', marginBottom: 10 }}>Coba HRIS Loka Sekarang</h2>
          <p style={{ color: '#475569', marginBottom: 20, fontSize: 15 }}>Mulai digitalisasi HR perusahaan Anda dengan paket Starter <strong>hanya Rp 75.000/bulan</strong>.</p>
          <Link to="/checkout" style={{ display: 'inline-block', padding: '12px 32px', background: '#0047AB', color: '#fff', borderRadius: 10, fontWeight: 800, fontSize: 15, textDecoration: 'none' }}>
            Lihat Paket & Harga →
          </Link>
        </div>

        {/* Related articles */}
        <div style={{ marginTop: 56 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 20, color: '#0F172A' }}>Artikel Terkait</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
            {ARTICLES.filter(a => a.slug !== slug).slice(0, 3).map((a, i) => (
              <Link key={i} to={`/blog/${a.slug}`} style={{ textDecoration: 'none', padding: 20, border: '1.5px solid #E2E8F0', borderRadius: 14, display: 'block', background: '#FAFAFA', transition: 'all 0.2s' }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#0047AB', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{a.category}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', lineHeight: 1.4 }}>{a.title}</div>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
