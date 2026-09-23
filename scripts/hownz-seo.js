'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SITE_NAME = 'How.nz';
const DEFAULT_IMAGE = 'assets/images/ai-development-card.png';

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&[a-z#0-9]+;/gi, ' ');
const text = (html) => decode(String(html || '').replace(/<(script|style|figure|pre)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function clip(s, max) {
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  return cut.slice(0, Math.max(cut.lastIndexOf(' '), max - 20)).replace(/[\s,;:.\-]+$/, '') + '…';
}

hexo.extend.filter.register('after_post_render', function (data) {
  if (data.layout !== 'post' && data.source && !data.source.startsWith('_posts/')) return data;
  const fix = (c) => {
  c = c.replace(/^\s*<h1[^>]*>([\s\S]*?)<\/h1>\s*/, (m, inner) => (norm(text(inner)) === norm(data.title) ? '' : m));
  c = c.replace(/<h1(\s|>)/g, '<h2$1').replace(/<\/h1>/g, '</h2>');
  c = c.replace(/<figure class="highlight/g, '<figure tabindex="0" class="highlight');
  c = c.replace(/<pre>(?!<code)/g, '<pre tabindex="0">').replace(/<pre><code/g, '<pre tabindex="0"><code');
  c = c.replace(/<img(?![^>]*\balt=)([^>]*)>/g, (m, a) => `<img alt="${esc(data.title || '')}"${a}>`);
  return c.replace(/<img(?![^>]*\bloading=)/g, '<img loading="lazy"');
  };
  if (data.content) data.content = fix(data.content);
  if (data.excerpt) data.excerpt = fix(data.excerpt);
  return data;
}, 20);

function summary(post, max) {
  const d = post.description || post.desc;
  let s = d ? String(d) : text(post.excerpt || post.content);
  s = clip(s, max);
  if (s.length < 70) s = (s ? s.replace(/[.\s]*$/, '. ') : '') + 'AI and software engineering notes by Lee Penkman on How.nz.';
  return s;
}
hexo.extend.helper.register('hownz_summary', function (post, max) { return summary(post, max || 280); });

hexo.extend.helper.register('hownz_meta', function () {
  const { page, config, theme } = this;
  const base = config.url.replace(/\/+$/, '');
  const abs = (u) => (/^https?:\/\//.test(u) ? u : base + '/' + String(u).replace(/^\/+/, ''));
  const pagePath = (page.path || '').replace(/index\.html$/, '');
  const canonical = abs(pagePath);
  const pageNum = page.current && page.current > 1 ? ` - Page ${page.current}` : '';
  const isPost = this.is_post();
  let title, desc, type = 'website', image = abs(DEFAULT_IMAGE);

  if (this.is_home()) {
    title = `${SITE_NAME} - AI Development Blog by Lee Penkman${pageNum}`;
    desc = config.description;
  } else if (isPost || this.is_page()) {
    title = `${page.title || "Untitled"} - ${SITE_NAME}`;
    desc = summary(page, 158);
    if (isPost) type = 'article';
    const img = page.thumbnailImage || page.coverImage || ((page.content || '').match(/<img[^>]+src="([^"]+)"/) || [])[1];
    if (img && !/^data:/.test(img)) image = /^https?:|^\//.test(img) ? abs(img) : abs(pagePath + img);
  } else {
    let label = 'Archives';
    if (this.is_tag()) label = page.tag ? `Posts tagged ${page.tag}` : 'Tags';
    else if (this.is_category()) label = page.category ? `${page.category} posts` : 'Categories';
    else if (this.is_month()) label = `Archives ${page.year}/${page.month}`;
    else if (this.is_year()) label = `Archives ${page.year}`;
    title = `${label}${pageNum} | ${SITE_NAME} AI Development Blog`;
    desc = `${label} on ${SITE_NAME}: practical AI, ML inference, GPU and software engineering posts by Lee Penkman.`;
  }

  const author = { '@type': 'Person', name: config.author, url: 'https://app.nz', sameAs: ['https://github.com/lee101', 'https://nz.linkedin.com/in/leepenkman', 'https://x.com/LeeLeePenkman'] };
  const publisher = { '@type': 'Organization', name: SITE_NAME, url: base, logo: { '@type': 'ImageObject', url: abs(DEFAULT_IMAGE) } };
  let ld;
  if (isPost) {
    ld = {
      '@context': 'https://schema.org', '@type': 'BlogPosting', headline: String(page.title).slice(0, 110), description: desc,
      image: [image], datePublished: page.date.toISOString(), dateModified: (page.updated || page.date).toISOString(),
      author, publisher, mainEntityOfPage: { '@type': 'WebPage', '@id': canonical }, url: canonical,
    };
    if (page.tags && page.tags.length) ld.keywords = page.tags.map((t) => t.name).join(', ');
  } else {
    ld = { '@context': 'https://schema.org', '@type': 'WebSite', name: `${SITE_NAME} AI Development Blog`, url: base + '/', description: config.description, author, publisher };
  }

  const tw = theme.author && theme.author.twitter;
  const tags = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(desc)}">`,
    `<link rel="canonical" href="${esc(canonical)}">`,
    `<meta property="og:type" content="${type}">`,
    `<meta property="og:site_name" content="${SITE_NAME}">`,
    `<meta property="og:title" content="${esc(page.title && !this.is_home() ? page.title : title)}">`,
    `<meta property="og:description" content="${esc(desc)}">`,
    `<meta property="og:url" content="${esc(canonical)}">`,
    `<meta property="og:image" content="${esc(image)}">`,
    `<meta property="og:locale" content="en_US">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(page.title && !this.is_home() ? page.title : title)}">`,
    `<meta name="twitter:description" content="${esc(desc)}">`,
    `<meta name="twitter:image" content="${esc(image)}">`,
  ];
  if (image.endsWith(DEFAULT_IMAGE)) tags.push('<meta property="og:image:width" content="1200">', '<meta property="og:image:height" content="630">');
  if (tw) tags.push(`<meta name="twitter:creator" content="@${esc(tw)}">`);
  if (isPost) {
    tags.push(`<meta property="article:published_time" content="${page.date.toISOString()}">`);
    (page.tags ? page.tags.toArray() : []).forEach((t) => tags.push(`<meta property="article:tag" content="${esc(t.name)}">`));
  }
  tags.push(`<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`);
  return tags.join('\n    ');
});

const THEME_CSS = 'style-hpdbsh1pzwzzvxwrpc53c3jjgs60okmwcnshclnphy7txuo7lzjsrnlemvgn.min.css';
const COLOR_FIX = { '#9eabb3': '#5f6b73', '#349ef3': '#0a66b7', '#969896': '#6b6d6b', '#0086b3': '#00698c', '#df5000': '#b03f00', '#63a35c': '#3a7a33', '#aaa': '#6e6e6e', '#88909a': '#5f6b73' };
let cssCache;
function a11yCss() {
  if (cssCache) return cssCache;
  let css = fs.readFileSync(path.join(hexo.theme_dir, 'source/assets/css', THEME_CSS), 'utf8');
  for (const [from, to] of Object.entries(COLOR_FIX)) css = css.replace(new RegExp(from + '(?![0-9a-fA-F])', 'gi'), to);
  css += '.post-content a,.postShorten-excerpt p a,.postShorten-content p a,#footer a{text-decoration:underline;text-underline-offset:2px}'
    + '.hownz-intro{margin:0 0 30px;padding-bottom:20px;border-bottom:1px solid #eef2f8}.hownz-intro h1{margin:0 0 8px;font-size:2.6rem}.hownz-intro p{margin:0;color:#4a555c}.hownz-intro a{text-decoration:underline}'
    + '.hownz-share{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:30px 0 10px}.hownz-share strong{margin-right:4px;color:#4a555c}'
    + '.hownz-share a,.hownz-share button{display:inline-flex;align-items:center;box-sizing:border-box;min-height:36px;padding:6px 14px;border:1px solid #c6cbd1;border-radius:18px;background:#fff;color:#24292e;font:600 1.4rem/1.2 "Open Sans",sans-serif;text-decoration:none;margin:0;cursor:pointer}'
    + '.hownz-share a:hover,.hownz-share button:hover{border-color:#0a66b7;color:#0a66b7}'
    + '.hownz-bio{display:flex;gap:18px;margin:20px 0 10px;padding:20px;border:1px solid #eef2f8;border-radius:8px;background:#fafbfc}.hownz-bio img{border-radius:50%;flex:none;align-self:flex-start;width:80px;height:80px;margin:0}.hownz-bio li{margin:0;line-height:1.6}'
    + '.hownz-bio h2{margin:0 0 6px;font-size:1.9rem}.hownz-bio p{margin:0 0 8px;font-size:1.5rem;line-height:1.6}.hownz-bio ul{display:flex;flex-wrap:wrap;gap:6px 14px;margin:0;padding:0;list-style:none;font-size:1.4rem}.hownz-bio a{text-decoration:underline}'
    + '@media (max-width:480px){.hownz-bio{flex-direction:column}}'
    + '#footer .portfolio-links{margin-top:1.5rem;padding-top:1.25rem;border-top:1px solid rgba(0,0,0,.08)}#footer .portfolio-links>div{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.45rem 1.25rem;margin-top:.75rem}#footer .portfolio-links a{font-size:1.3rem;overflow-wrap:anywhere}'
    + '@media (max-width:767px){#footer .portfolio-links>div{grid-template-columns:repeat(2,minmax(0,1fr))}}'
    + 'figure.highlight:focus,pre:focus{outline:2px solid #0a66b7;outline-offset:2px}';
  const hash = crypto.createHash('sha1').update(css).digest('hex').slice(0, 12);
  cssCache = { css, file: `assets/css/hownz-${hash}.min.css` };
  return cssCache;
}
hexo.extend.generator.register('hownz_css', () => ({ path: a11yCss().file, data: a11yCss().css }));
hexo.extend.helper.register('hownz_css_path', function () { return this.url_for(a11yCss().file); });
