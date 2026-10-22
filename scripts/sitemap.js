'use strict';

// Dependency-free sitemap.xml generator. URL paths come from Hexo routes, so
// every <loc> matches a file in public/.
hexo.extend.generator.register('sitemap', function (locals) {
  const base = this.config.url.replace(/\/+$/, '');
  const urls = new Map();
  const add = (routePath, updated) => {
    let p = routePath.replace(/index\.html$/, '').replace(/^\/+/, '');
    const loc = `${base}/${p}`;
    if (!urls.has(loc)) urls.set(loc, updated);
  };

  add('');
  locals.posts.forEach((post) => add(post.path, post.updated));
  locals.pages.forEach((page) => {
    if (page.path.startsWith('404')) return;
    if (!/(\.html|\/)$/.test(page.path)) return; // skip raw assets copied from source/
    add(page.path, page.updated);
  });

  const body = [...urls.entries()]
    .map(([loc, updated]) => {
      const lastmod = updated && updated.isValid() ? `<lastmod>${updated.toISOString()}</lastmod>` : '';
      const escaped = encodeURI(loc)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      return `  <url><loc>${escaped}</loc>${lastmod}</url>`;
    })
    .join('\n');

  return {
    path: 'sitemap.xml',
    data:
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      body +
      '\n</urlset>\n',
  };
});
