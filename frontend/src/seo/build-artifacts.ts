/**
 * Artefactos de SEO que se generan al compilar: robots.txt, sitemap.xml y un
 * HTML por ruta publica.
 *
 * ── Por que existe ──────────────────────────────────────────────────────
 * Todo el SEO de este sitio (titulos, descripciones, Open Graph, canonical,
 * JSON-LD) ya estaba bien escrito en pages.ts y se aplica en SeoHead...
 * dentro de un useEffect. Es decir, solo DESPUES de que React monte en el
 * navegador.
 *
 * El servidor entregaba 1.577 bytes identicos para las nueve rutas, con
 * #root vacio. Google ejecuta JavaScript y acaba viendolo, pero los
 * rastreadores de WhatsApp, LinkedIn, Facebook y X NO lo ejecutan: para
 * ellos ninguna pagina tenia titulo propio ni imagen, y eso no se arregla
 * solo nunca.
 *
 * Esto no es renderizado del lado del servidor: el <body> sigue vacio y
 * React sigue pintando igual. Lo que cambia es que la cabecera ya viene
 * puesta cuando llega el primer byte.
 *
 * ── Por que lee de pages.ts y no de una lista propia ────────────────────
 * Porque la lista propia ya se desincronizo una vez. generate-seo-files.mjs
 * tenia cinco rutas copiadas a mano mientras SITEMAP_PATHS declaraba nueve:
 * las cuatro paginas legales eran indexables y quedaban fuera del sitemap
 * sin que nadie se enterara.
 *
 * ── Que NO hace, y por que ──────────────────────────────────────────────
 * No escribe el JSON-LD en el HTML estatico. Generarlo aqui obligaria a
 * duplicar schema.ts, porque ese modulo depende de SITE_URL, que se lee de
 * `import.meta.env` y no existe en Node. El canje es aceptable: los
 * rastreadores que no ejecutan JavaScript tampoco leen JSON-LD --solo
 * miran Open Graph, que si va aqui-- y Google, que si lo ejecuta, recibe
 * los esquemas completos del componente JsonLd al montar.
 */
import {
  ANALYZE_FAQ,
  COMPARE_FAQ,
  HOME_FAQ,
  RISKS_FAQ,
} from './landing-content';
import { SEO_PAGES, SITEMAP_PATHS } from './pages';
import {
  DOMINIO_PUBLICO,
  OG_IMAGE_PATH,
  SITE_NAME,
  TWITTER_HANDLE,
  type FaqItem,
  type SeoPageConfig,
} from './constants';

// Las rutas relativas de arriba no son estilo: este modulo lo carga tambien
// el plugin de Vite, que corre en Node y no conoce el alias "@/".

/**
 * Las FAQ que cada pagina publica le pasa a PageSeo, indexadas por ruta.
 * Hoy solo se usan para comprobar que no se pierden; si algun dia el HTML
 * estatico llevara JSON-LD, saldrian de aqui.
 */
const FAQ_POR_RUTA: Record<string, FaqItem[]> = {
  [SEO_PAGES.home.path]: HOME_FAQ,
  [SEO_PAGES.analyze.path]: ANALYZE_FAQ,
  [SEO_PAGES.compare.path]: COMPARE_FAQ,
  [SEO_PAGES.risks.path]: RISKS_FAQ,
};

const POR_RUTA = new Map<string, SeoPageConfig>(
  Object.values(SEO_PAGES).map((p) => [p.path, p as SeoPageConfig])
);

/**
 * Las paginas que se publican, en el orden de SITEMAP_PATHS.
 *
 * Falla en vez de saltarse una ruta desconocida: si alguien agrega algo a
 * SITEMAP_PATHS sin configurarlo en SEO_PAGES, es mejor que el build se
 * pare a que el sitio salga con una pagina sin titulo propio.
 */
export function paginasPublicas(): SeoPageConfig[] {
  return SITEMAP_PATHS.map((ruta) => {
    const pagina = POR_RUTA.get(ruta);
    if (!pagina) {
      throw new Error(
        `SITEMAP_PATHS incluye "${ruta}", que no esta configurada en SEO_PAGES.`
      );
    }
    return pagina;
  });
}

export function faqDeRuta(ruta: string): FaqItem[] | undefined {
  return FAQ_POR_RUTA[ruta];
}

const sinBarraFinal = (url: string) => url.replace(/\/$/, '');

const esDominioPublico = (url: string) => sinBarraFinal(url) === DOMINIO_PUBLICO;

/**
 * Fuera del dominio publico se cierra entero: un despliegue de pruebas
 * indexado compite contra el sitio real por las mismas palabras, y a veces
 * gana el equivocado.
 */
export function construirRobotsTxt(siteUrl: string): string {
  const url = sinBarraFinal(siteUrl);

  if (!esDominioPublico(url)) {
    return `# Despliegue que no es el sitio publico (${url}).
# Cerrado a buscadores para no competir contra ${DOMINIO_PUBLICO}.
User-agent: *
Disallow: /
`;
  }

  return `User-agent: *
Allow: /
Disallow: /panel/
Disallow: /panel

Sitemap: ${url}/sitemap.xml
`;
}

export function construirSitemapXml(siteUrl: string, lastmod: string): string {
  const url = sinBarraFinal(siteUrl);

  const entradas = paginasPublicas().map((pagina) => {
    const esPortada = pagina.path === '/';
    return `  <url>
    <loc>${url}${esPortada ? '' : pagina.path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${esPortada ? 'weekly' : 'monthly'}</changefreq>
    <priority>${esPortada ? '1.0' : '0.8'}</priority>
  </url>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entradas.join('\n')}
</urlset>
`;
}

function escaparAtributo(valor: string): string {
  return valor
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const meta = (clave: string, valor: string, attr: 'name' | 'property' = 'name') =>
  `    <meta ${attr}="${clave}" content="${escaparAtributo(valor)}" />`;

/**
 * Etiquetas que la plantilla trae genericas y que cada ruta sobrescribe.
 * Se quitan antes de inyectar para no dejar dos de lo mismo: con dos
 * <title> o dos og:site_name, cual gana depende del rastreador.
 */
const PATRONES_A_QUITAR: RegExp[] = [
  /[ \t]*<title>[\s\S]*?<\/title>\s*\n?/i,
  /[ \t]*<meta\s+name="description"[\s\S]*?\/>\s*\n?/i,
  /[ \t]*<meta\s+name="robots"[^>]*\/>\s*\n?/i,
  /[ \t]*<meta\s+property="og:locale"[^>]*\/>\s*\n?/i,
  /[ \t]*<meta\s+property="og:site_name"[^>]*\/>\s*\n?/i,
  /[ \t]*<meta\s+name="twitter:card"[^>]*\/>\s*\n?/i,
];

/** Mete en el <head> de la plantilla la cabecera que corresponde a una ruta. */
export function construirHtmlDeRuta(
  plantilla: string,
  pagina: SeoPageConfig,
  siteUrl: string
): string {
  const url = sinBarraFinal(siteUrl);
  const canonical = `${url}${pagina.path}`;
  const ogTitle = pagina.ogTitle ?? pagina.title;
  const ogDescription = pagina.ogDescription ?? pagina.description;
  const ogImage = pagina.ogImage ?? `${url}${OG_IMAGE_PATH}`;
  // Fuera del dominio publico nada se indexa, da igual lo que pida la
  // pagina. Es la misma regla que aplica SeoHead en el cliente.
  const robots = esDominioPublico(url)
    ? (pagina.robots ?? 'index, follow')
    : 'noindex, nofollow';

  const cabecera = [
    `    <title>${escaparAtributo(pagina.title)}</title>`,
    meta('description', pagina.description),
    meta('keywords', pagina.keywords),
    meta('robots', robots),
    meta('author', SITE_NAME),
    `    <link rel="canonical" href="${escaparAtributo(canonical)}" />`,
    meta('og:title', ogTitle, 'property'),
    meta('og:description', ogDescription, 'property'),
    meta('og:type', pagina.ogType ?? 'website', 'property'),
    meta('og:url', canonical, 'property'),
    meta('og:image', ogImage, 'property'),
    meta('og:image:alt', `${SITE_NAME} — ${pagina.title}`, 'property'),
    meta('og:site_name', SITE_NAME, 'property'),
    meta('og:locale', 'es_CO', 'property'),
    meta('twitter:card', 'summary_large_image'),
    meta('twitter:site', TWITTER_HANDLE),
    meta('twitter:title', ogTitle),
    meta('twitter:description', ogDescription),
    meta('twitter:image', ogImage),
  ].join('\n');

  let html = plantilla;
  for (const patron of PATRONES_A_QUITAR) {
    // El reemplazo va como funcion: String.replace interpreta $& y $$ dentro
    // del TEXTO de reemplazo, y aqui se mezcla contenido que no es nuestro.
    html = html.replace(patron, () => '');
  }

  if (!html.includes('</head>')) {
    throw new Error('La plantilla HTML no tiene </head>; no se donde inyectar.');
  }

  return html.replace(/<\/head>/i, () => `${cabecera}\n  </head>`);
}

/** Ruta del archivo que sirve cada URL: "/pricing" → "pricing.html". */
export function archivoDeRuta(ruta: string): string {
  if (ruta === '/') return 'index.html';
  return `${ruta.replace(/^\//, '')}.html`;
}
