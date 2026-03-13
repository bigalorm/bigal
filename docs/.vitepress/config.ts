import { defineConfig } from 'vitepress';
import llmstxt from 'vitepress-plugin-llms';

const SITE_URL = 'https://bigalorm.github.io/bigal';
const SITE_DESCRIPTION = 'A PostgreSQL-optimized, type-safe TypeScript ORM for Node.js';

export default defineConfig({
  title: 'BigAl',
  description: SITE_DESCRIPTION,
  base: '/bigal/',
  appearance: 'force-dark',
  sitemap: {
    hostname: SITE_URL,
  },
  head: [
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    [
      'link',
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Source+Code+Pro:wght@400;500&family=Source+Sans+3:wght@400;500;600&display=swap',
      },
    ],
    ['link', { rel: 'llms-txt', href: '/bigal/llms.txt' }],
    ['meta', { property: 'og:site_name', content: 'BigAl' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { name: 'twitter:card', content: 'summary' }],
  ],
  transformPageData(pageData) {
    const isHome = pageData.frontmatter.layout === 'home';
    const title = isHome ? 'BigAl — PostgreSQL-optimized TypeScript ORM' : `${pageData.title} | BigAl`;
    const description = pageData.frontmatter.description || SITE_DESCRIPTION;
    const canonicalUrl = `${SITE_URL}/${pageData.relativePath}`.replace(/index\.md$/, '').replace(/\.md$/, '');

    pageData.frontmatter.head ??= [];
    pageData.frontmatter.head.push(
      ['meta', { property: 'og:title', content: title }],
      ['meta', { property: 'og:description', content: description }],
      ['meta', { property: 'og:url', content: canonicalUrl }],
      ['meta', { name: 'twitter:title', content: title }],
      ['meta', { name: 'twitter:description', content: description }],
    );
  },
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/getting-started' },
      { text: 'Reference', link: '/reference/api' },
      {
        text: 'Links',
        items: [
          { text: 'npm', link: 'https://www.npmjs.com/package/bigal' },
          { text: 'Changelog', link: 'https://github.com/bigalorm/bigal/releases' },
        ],
      },
    ],
    sidebar: [
      {
        text: 'Introduction',
        items: [{ text: 'Getting Started', link: '/getting-started' }],
      },
      {
        text: 'Guide',
        items: [
          { text: 'Models', link: '/guide/models' },
          { text: 'Querying', link: '/guide/querying' },
          { text: 'CRUD Operations', link: '/guide/crud-operations' },
          { text: 'Relationships', link: '/guide/relationships' },
          { text: 'Subqueries & Joins', link: '/guide/subqueries-and-joins' },
          { text: 'Views', link: '/guide/views' },
        ],
      },
      {
        text: 'Reference',
        items: [
          { text: 'API', link: '/reference/api' },
          { text: 'Configuration', link: '/reference/configuration' },
        ],
      },
      {
        text: 'Advanced',
        items: [
          { text: 'BigAl vs Raw SQL', link: '/advanced/bigal-vs-raw-sql' },
          { text: 'Known Issues', link: '/advanced/known-issues' },
        ],
      },
    ],
    socialLinks: [{ icon: 'github', link: 'https://github.com/bigalorm/bigal' }],
    search: {
      provider: 'local',
    },
    editLink: {
      pattern: 'https://github.com/bigalorm/bigal/edit/main/docs/:path',
    },
  },
  vite: {
    plugins: [llmstxt()],
  },
});
