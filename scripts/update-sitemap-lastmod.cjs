#!/usr/bin/env node
/**
 * update-sitemap-lastmod.js
 * Automatically updates <lastmod> in all sitemap XML files to today's date.
 * Run before build: node scripts/update-sitemap-lastmod.js
 */
const fs = require('fs');
const path = require('path');

const today = new Date().toISOString().split('T')[0];
const sitemapDir = path.join(__dirname, '../public');

const files = ['sitemap.xml', 'sitemap-pages.xml', 'sitemap-images.xml'];

files.forEach(file => {
  const filePath = path.join(sitemapDir, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    const updated = content.replace(/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/g, `<lastmod>${today}</lastmod>`);
    fs.writeFileSync(filePath, updated, 'utf8');
    console.log(`? Updated ${file} lastmod to ${today}`);
  }
});
