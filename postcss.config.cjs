// Local PostCSS config — overrides the parent dir's postcss.config.mjs
// (C:\Users\Iqbal\Documents\postcss.config.mjs) which references the
// uninstalled @tailwindcss/postcss plugin and breaks `vite build`.
//
// This project uses Tailwind v4 via the @tailwindcss/vite plugin, not the
// PostCSS pipeline, so no PostCSS plugins are needed here. An empty plugins
// object prevents Vite from walking up the directory tree to load the parent
// config. See: https://vite.dev/guide/features#postcss
module.exports = { plugins: {} };
