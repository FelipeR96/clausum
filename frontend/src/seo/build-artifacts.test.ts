import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  archivoDeRuta,
  construirHtmlDeRuta,
  construirRobotsTxt,
  construirSitemapXml,
  paginasPublicas,
} from '@/seo/build-artifacts';
import { SEO_PAGES, SITEMAP_PATHS } from '@/seo/pages';
import { DOMINIO_PUBLICO } from '@/seo/constants';

// ─────────────────────────────────────────────────────────────────────────
// Estos artefactos se generan al compilar y nadie los mira antes de que
// lleguen a produccion. Un robots.txt mal hecho saca el sitio de Google sin
// avisar; un titulo repetido en las nueve rutas hace que Google elija una y
// descarte el resto. Estas pruebas fijan lo que no puede salir mal.
// ─────────────────────────────────────────────────────────────────────────

/** La plantilla real de frontend/index.html, recortada a lo que importa. */
const PLANTILLA = `<!doctype html>
<html lang="es-CO">
  <head>
    <meta charset="UTF-8" />
    <title>Clausum — Análisis de contratos con IA</title>
    <meta
      name="description"
      content="Clausum analiza, compara y detecta riesgos en contratos."
    />
    <meta name="robots" content="index, follow" />
    <meta name="theme-color" content="#006A60" />
    <link rel="icon" href="/favicon.ico" sizes="32x32" />
    <link rel="icon" href="/icono.svg" type="image/svg+xml" />
    <link rel="icon" type="image/png" sizes="192x192" href="/icono-192.png" />
    <link rel="apple-touch-icon" href="/icono-180.png" />
    <meta property="og:locale" content="es_CO" />
    <meta property="og:site_name" content="Clausum" />
    <meta name="twitter:card" content="summary_large_image" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/assets/index-abc123.js"></script>
  </body>
</html>
`;

describe('robots.txt', () => {
  it('abre el sitio cuando es el dominio publico', () => {
    const robots = construirRobotsTxt(DOMINIO_PUBLICO);
    expect(robots).toContain('Allow: /');
    expect(robots).toContain(`Sitemap: ${DOMINIO_PUBLICO}/sitemap.xml`);
    expect(robots).not.toMatch(/^Disallow: \/$/m);
  });

  it('bloquea el panel, que no debe indexarse', () => {
    expect(construirRobotsTxt(DOMINIO_PUBLICO)).toContain('Disallow: /panel');
  });

  it('bloquea los informes de compra suelta', () => {
    // La referencia de la URL es la credencial del informe. Esas páginas no
    // están enlazadas desde ningún sitio, pero una referencia se puede
    // filtrar --por el Referer, por una extensión, o porque alguien pegue el
    // enlace en un foro pidiendo ayuda con su contrato-- y entonces no puede
    // acabar indexada.
    expect(construirRobotsTxt(DOMINIO_PUBLICO)).toContain('Disallow: /analisis/');
  });

  it('cierra entero cualquier despliegue que NO sea el dominio publico', () => {
    // El caso peligroso: un sitio de pruebas indexado compite contra el real
    // por las mismas palabras, y a veces gana el equivocado.
    for (const url of [
      'https://clausum-dev.web.app',
      'https://preview.clausumlegal.com',
      'http://localhost:5173',
    ]) {
      const robots = construirRobotsTxt(url);
      expect(robots, url).toMatch(/^Disallow: \/$/m);
      expect(robots, url).not.toContain('Allow: /');
    }
  });

  it('no se deja enganar por una barra final', () => {
    expect(construirRobotsTxt(`${DOMINIO_PUBLICO}/`)).toContain('Allow: /');
  });
});

describe('sitemap.xml', () => {
  it('NO lista los informes de compra suelta', () => {
    // El sitemap se construye desde SITEMAP_PATHS, asi que la unica forma de
    // que una ruta privada entre ahi es que alguien la anada a esa lista. Esta
    // prueba esta para que ese dia falle algo.
    const xml = construirSitemapXml(DOMINIO_PUBLICO, '2026-10-28');
    expect(xml).not.toContain('/analisis/');
  });

  it('sí lista la entrada de la compra sin cuenta', () => {
    // Es la pagina que mas tiene que encontrarse: la unica donde se puede
    // probar el producto sin dar un correo.
    const xml = construirSitemapXml(DOMINIO_PUBLICO, '2026-10-28');
    expect(xml).toContain(`${DOMINIO_PUBLICO}/analizar-documento`);
  });

  it('incluye TODAS las rutas de SITEMAP_PATHS', () => {
    // La regresion que motivo este modulo: habia una lista de cinco rutas
    // copiada a mano mientras SITEMAP_PATHS declaraba nueve, y las cuatro
    // paginas legales quedaban fuera sin que nadie se enterara.
    const xml = construirSitemapXml(DOMINIO_PUBLICO, '2026-10-25');
    for (const ruta of SITEMAP_PATHS) {
      const loc = `${DOMINIO_PUBLICO}${ruta === '/' ? '' : ruta}`;
      expect(xml, ruta).toContain(`<loc>${loc}</loc>`);
    }
    expect(xml.match(/<url>/g) ?? []).toHaveLength(SITEMAP_PATHS.length);
  });

  it('incluye las paginas legales', () => {
    const xml = construirSitemapXml(DOMINIO_PUBLICO, '2026-10-25');
    expect(xml).toContain('/legal/privacidad');
    expect(xml).toContain('/legal/terminos');
    expect(xml).toContain('/legal/aviso-legal');
    expect(xml).toContain('/legal/cookies');
  });

  it('da prioridad 1.0 solo a la portada', () => {
    const xml = construirSitemapXml(DOMINIO_PUBLICO, '2026-10-25');
    expect(xml.match(/<priority>1\.0<\/priority>/g) ?? []).toHaveLength(1);
  });

  it('la portada va sin barra final', () => {
    const xml = construirSitemapXml(DOMINIO_PUBLICO, '2026-10-25');
    expect(xml).toContain(`<loc>${DOMINIO_PUBLICO}</loc>`);
  });
});

describe('HTML por ruta', () => {
  it('cada ruta publica recibe su propio titulo y descripcion', () => {
    const titulos = new Set<string>();
    const descripciones = new Set<string>();

    for (const pagina of paginasPublicas()) {
      const html = construirHtmlDeRuta(PLANTILLA, pagina, DOMINIO_PUBLICO);
      const titulo = /<title>([\s\S]*?)<\/title>/.exec(html)?.[1];
      const desc = /<meta name="description" content="([\s\S]*?)" \/>/.exec(html)?.[1];

      expect(titulo, pagina.path).toBeTruthy();
      expect(desc, pagina.path).toBeTruthy();
      titulos.add(titulo!);
      descripciones.add(desc!);
    }

    // Lo que se venia a arreglar: las nueve rutas servian exactamente lo
    // mismo, asi que Google veia nueve paginas duplicadas.
    expect(titulos.size).toBe(SITEMAP_PATHS.length);
    expect(descripciones.size).toBe(SITEMAP_PATHS.length);
  });

  it('deja un solo <title>, no dos', () => {
    const html = construirHtmlDeRuta(PLANTILLA, SEO_PAGES.analyze, DOMINIO_PUBLICO);
    expect(html.match(/<title>/g) ?? []).toHaveLength(1);
    expect(html).toContain(
      '<title>Analizar Contratos con IA en Colombia | Clausum</title>'
    );
  });

  it('no duplica las etiquetas que la plantilla ya traia', () => {
    const html = construirHtmlDeRuta(PLANTILLA, SEO_PAGES.home, DOMINIO_PUBLICO);
    for (const clave of ['og:locale', 'og:site_name', 'twitter:card']) {
      expect(html.split(clave).length - 1, clave).toBe(1);
    }
    expect(html.match(/name="description"/g) ?? []).toHaveLength(1);
    expect(html.match(/name="robots"/g) ?? []).toHaveLength(1);
  });

  it('pone canonical y og:url propios de la ruta', () => {
    const html = construirHtmlDeRuta(PLANTILLA, SEO_PAGES.pricing, DOMINIO_PUBLICO);
    expect(html).toContain(
      `<link rel="canonical" href="${DOMINIO_PUBLICO}/pricing" />`
    );
    expect(html).toContain(
      `<meta property="og:url" content="${DOMINIO_PUBLICO}/pricing" />`
    );
  });

  it('pone imagen de Open Graph, que es lo que falta al compartir el enlace', () => {
    const html = construirHtmlDeRuta(PLANTILLA, SEO_PAGES.compare, DOMINIO_PUBLICO);
    expect(html).toContain(
      `<meta property="og:image" content="${DOMINIO_PUBLICO}/og/clausum-og.png" />`
    );
    expect(html).toContain('property="og:title"');
    expect(html).toContain('name="twitter:image"');
  });

  it('usa ogTitle cuando la pagina lo define, y el title cuando no', () => {
    const conOg = construirHtmlDeRuta(PLANTILLA, SEO_PAGES.analyze, DOMINIO_PUBLICO);
    expect(SEO_PAGES.analyze.ogTitle).toBeTruthy();
    expect(conOg).toContain(
      `<meta property="og:title" content="${SEO_PAGES.analyze.ogTitle}" />`
    );

    const sinOg = construirHtmlDeRuta(PLANTILLA, SEO_PAGES.pricing, DOMINIO_PUBLICO);
    expect((SEO_PAGES.pricing as { ogTitle?: string }).ogTitle).toBeUndefined();
    expect(sinOg).toContain(
      `<meta property="og:title" content="${SEO_PAGES.pricing.title}" />`
    );
  });

  it('marca noindex fuera del dominio publico, aunque la pagina pida indexarse', () => {
    const html = construirHtmlDeRuta(
      PLANTILLA,
      SEO_PAGES.pricing,
      'https://clausum-dev.web.app'
    );
    expect(SEO_PAGES.pricing.robots).toBe('index, follow');
    expect(html).toContain('<meta name="robots" content="noindex, nofollow" />');
    expect(html).not.toContain('content="index, follow"');
  });

  it('escapa las comillas para no romper un atributo', () => {
    const html = construirHtmlDeRuta(
      PLANTILLA,
      { ...SEO_PAGES.home, description: 'Dice "hola" & <algo>' },
      DOMINIO_PUBLICO
    );
    expect(html).toContain('content="Dice &quot;hola&quot; &amp; &lt;algo&gt;"');
  });

  it('conserva el resto de la plantilla intacto', () => {
    const html = construirHtmlDeRuta(PLANTILLA, SEO_PAGES.risks, DOMINIO_PUBLICO);
    expect(html).toContain('<div id="root"></div>');
    expect(html).toContain('<meta charset="UTF-8" />');
    expect(html).toContain('name="theme-color"');
    expect(html).toContain('<html lang="es-CO">');
    // Sin el script del bundle, la pagina se queda en blanco.
    expect(html).toContain('/assets/index-abc123.js');
  });

  it('falla si la plantilla no tiene donde inyectar', () => {
    expect(() =>
      construirHtmlDeRuta('<html><body>nada</body></html>', SEO_PAGES.home, DOMINIO_PUBLICO)
    ).toThrow(/head/i);
  });
});

describe('archivoDeRuta', () => {
  it('la portada es index.html', () => {
    expect(archivoDeRuta('/')).toBe('index.html');
  });

  it('una ruta simple es su nombre con .html', () => {
    expect(archivoDeRuta('/pricing')).toBe('pricing.html');
  });

  it('una ruta anidada conserva la carpeta', () => {
    expect(archivoDeRuta('/legal/privacidad')).toBe('legal/privacidad.html');
  });

  it('ninguna ruta publica produce un archivo repetido', () => {
    const archivos = paginasPublicas().map((p) => archivoDeRuta(p.path));
    expect(new Set(archivos).size).toBe(archivos.length);
  });
});

describe('paginasPublicas', () => {
  it('devuelve una pagina por cada ruta del sitemap', () => {
    expect(paginasPublicas()).toHaveLength(SITEMAP_PATHS.length);
  });

  it('todas las rutas publicas estan configuradas en SEO_PAGES', () => {
    expect(() => paginasPublicas()).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// El icono del sitio.
//
// Sin el, Google dibuja un globo gris junto al resultado y la pestana del
// navegador queda igual que la de cualquier pagina en blanco. Es la unica
// marca que se ve en una lista de resultados, y se pierde de dos maneras
// silenciosas: que alguien quite las etiquetas de la plantilla, o que los
// archivos de public/ se renombren y las etiquetas queden apuntando a un
// 404. Ninguna de las dos rompe el build.
//
// El fixture de arriba es una copia a mano, asi que estas pruebas leen el
// index.html DE VERDAD: es la unica forma de que el test sepa lo que se
// despliega.
// ─────────────────────────────────────────────────────────────────────────
describe('icono del sitio', () => {
  const dirFrontend = fileURLToPath(new URL('../../', import.meta.url));
  const plantillaReal = readFileSync(dirFrontend + 'index.html', 'utf-8');

  /** href de cada <link rel="icon"> y <link rel="apple-touch-icon">. */
  const iconosDeclarados = [
    ...plantillaReal.matchAll(
      /<link[^>]+rel="(?:icon|apple-touch-icon)"[^>]*>/g
    ),
  ].map((etiqueta) => {
    const href = /href="([^"]+)"/.exec(etiqueta[0]);
    return href ? href[1] : '';
  });

  it('la plantilla real declara al menos un icono', () => {
    expect(iconosDeclarados.length).toBeGreaterThan(0);
  });

  it('declara el .ico, que es el que lee Google', () => {
    expect(iconosDeclarados).toContain('/favicon.ico');
  });

  it('cada icono declarado existe en public/', () => {
    for (const href of iconosDeclarados) {
      const archivo = dirFrontend + 'public' + href;
      expect(existsSync(archivo), href + ' no existe en public/').toBe(true);
    }
  });

  it('sobrevive al reescrito de la cabecera en TODAS las rutas', () => {
    // construirHtmlDeRuta borra y reinyecta parte del <head>. Si algun dia
    // se le anade un patron que arrastre los <link>, el sitio se queda sin
    // icono en las nueve paginas menos en la portada, y no lo nota nadie.
    for (const pagina of paginasPublicas()) {
      const html = construirHtmlDeRuta(plantillaReal, pagina, DOMINIO_PUBLICO);
      expect(html, pagina.path).toContain('/favicon.ico');
      expect(html, pagina.path).toContain('rel="apple-touch-icon"');
    }
  });

  it('no deja dos veces el mismo icono', () => {
    const html = construirHtmlDeRuta(PLANTILLA, SEO_PAGES.home, DOMINIO_PUBLICO);
    expect(html.split('/favicon.ico').length - 1).toBe(1);
  });
});
