import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, '../public');
const raizWeb = resolve(__dirname, '..');

/**
 * El unico dominio que debe aparecer en Google.
 * Debe coincidir con DOMINIO_PUBLICO de src/seo/site.ts.
 */
const DOMINIO_PUBLICO = 'https://clausumlegal.com';

/**
 * Lee VITE_SITE_URL de los .env, igual que hace Vite.
 *
 * Esto NO es un adorno. Antes el script leia process.env.VITE_SITE_URL a
 * secas, y como es un script de Node suelto —no pasa por Vite— esa
 * variable siempre llegaba vacia: caia al valor por defecto del codigo.
 * Resultado: el sitio desplegado servia un robots.txt y un sitemap.xml que
 * anunciaban un dominio distinto del suyo, y nadie se enteraba porque el
 * script imprimia alegremente la URL equivocada al terminar.
 *
 * El orden es el de Vite: lo mas especifico gana.
 */
function urlDelSitio() {
  if (process.env.VITE_SITE_URL) return process.env.VITE_SITE_URL;

  const modo = process.env.NODE_ENV === 'development' ? 'development' : 'production';
  for (const archivo of [`.env.${modo}.local`, '.env.local', `.env.${modo}`, '.env']) {
    const ruta = resolve(raizWeb, archivo);
    if (!existsSync(ruta)) continue;
    for (const linea of readFileSync(ruta, 'utf8').split('\n')) {
      const m = linea.match(/^\s*VITE_SITE_URL\s*=\s*(.+?)\s*$/);
      if (m) return m[1].replace(/^["']|["']$/g, '');
    }
  }
  return DOMINIO_PUBLICO;
}

const siteUrl = urlDelSitio().replace(/\/$/, '');
const esSitioPublico = siteUrl === DOMINIO_PUBLICO;

const paths = [
  '/',
  '/analizar-contratos',
  '/comparar-contratos',
  '/detectar-riesgos',
  '/pricing',
];

const lastmod = new Date().toISOString().slice(0, 10);

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths
  .map(
    (path) => `  <url>
    <loc>${siteUrl}${path === '/' ? '' : path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${path === '/' ? 'weekly' : 'monthly'}</changefreq>
    <priority>${path === '/' ? '1.0' : '0.8'}</priority>
  </url>`
  )
  .join('\n')}
</urlset>
`;

// Fuera del dominio publico se cierra entero. Un despliegue de pruebas
// indexado compite contra el sitio real por las mismas palabras.
const robots = esSitioPublico
  ? `User-agent: *
Allow: /
Disallow: /panel/
Disallow: /panel

Sitemap: ${siteUrl}/sitemap.xml
`
  : `# Despliegue que no es el sitio publico (${siteUrl}).
# Cerrado a buscadores para no competir contra ${DOMINIO_PUBLICO}.
User-agent: *
Disallow: /
`;

writeFileSync(resolve(publicDir, 'sitemap.xml'), sitemap, 'utf8');
writeFileSync(resolve(publicDir, 'robots.txt'), robots, 'utf8');

console.log(
  esSitioPublico
    ? `SEO: sitio publico ${siteUrl} — robots.txt abierto y sitemap.xml generado`
    : `SEO: ${siteUrl} NO es el sitio publico (${DOMINIO_PUBLICO}) — robots.txt cerrado a buscadores`
);
