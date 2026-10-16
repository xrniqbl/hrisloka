# ---------------------------------------------------------------
# KiniKerja � Google Search Console Setup
# ---------------------------------------------------------------

## Step 1: Verify Domain Ownership
1. Go to https://search.google.com/search-console
2. Add property: https://kinikerja.com
3. Choose verification method:
   - **HTML file**: Upload to public/ (already has sitemap)
   - **DNS TXT record**: Add to domain registrar
   - **Google Analytics**: If already installed

## Step 2: Submit Sitemaps
1. In Search Console ? Sitemaps
2. Submit: https://kinikerja.com/sitemap.xml
3. Also submit:
   - https://kinikerja.com/sitemap-pages.xml
   - https://kinikerja.com/sitemap-images.xml

## Step 3: Monitor Indexing
- Check "Coverage" report weekly
- Fix any crawl errors (404, 500, etc.)
- Request indexing for new pages

## Step 4: Track Performance
- Monitor "Performance" report
- Track keywords: "HRIS Indonesia", "software HR", "absensi GPS"
- Target: Top 3 positions for brand keywords

## Step 5: Rich Results
- Structured data already injected via src/lib/seo.js
- Test: https://search.google.com/test/rich-results
- Expected rich results: FAQ, HowTo, Organization, Breadcrumb
