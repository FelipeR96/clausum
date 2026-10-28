import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import type { Plugin, ResolvedConfig } from 'vite';
import {
  archivoDeRuta,
  construirHtmlDeRuta,
  construirRobotsTxt,
  construirSitemapXml,
  paginasPublicas,
} from './src/seo/build-artifacts';
import { DOMINIO_PUBLICO } from './src/seo/constants';

/**
 * Escribe robots.txt, sitemap.xml y un HTML por ruta publica.
 *
 * Reemplaza al antiguo scripts/generate-seo-files.mjs, que corria antes del
 * build y tenia su propia copia de las rutas. Esa copia se desincronizo:
 * declaraba cinco mientras SITEMAP_PATHS declaraba nueve, y las cuatro
 * paginas legales quedaban fuera del sitemap sin que nadie se enterara.
 *
 * Va como plugin y no como script suelto por una razon practica: aqui
 * dentro se pueden importar los modulos TypeScript del propio sitio, asi
 * que las rutas y sus metadatos salen de una sola fuente. Un script de Node
 * no puede leer .ts sin un transpilador declarado como dependencia, que el
 * frontend no tiene.
 *
 * Corre en `closeBundle`, o sea DESPUES de que Vite escriba dist/: la
 * plantilla que se copia por ruta es el index.html ya compilado, con los
 * enlaces a los bundles con hash. Generarlo antes dejaria paginas sin su
 * JavaScript y por tanto en blanco.
 */
export function seoArtifacts(opciones: { siteUrl: string }): Plugin {
  const siteUrl = opciones.siteUrl.replace(/\/$/, '');
  let config: ResolvedConfig;

  return {
    name: 'clausum-seo-artifacts',
    apply: 'build',

    configResolved(resuelta) {
      // La carpeta de salida se le pregunta a Vite en vez de deducirla:
      // asi esto sigue funcionando si algun dia deja de llamarse "dist".
      config = resuelta;
    },

    closeBundle: {
      sequential: true,
      handler() {
        const dist = resolve(config.root, config.build.outDir);
        const indexHtml = join(dist, 'index.html');
        const plantilla = readFileSync(indexHtml, 'utf8');

        const lastmod = new Date().toISOString().slice(0, 10);
        writeFileSync(join(dist, 'robots.txt'), construirRobotsTxt(siteUrl), 'utf8');
        writeFileSync(
          join(dist, 'sitemap.xml'),
          construirSitemapXml(siteUrl, lastmod),
          'utf8'
        );

        const paginas = paginasPublicas();
        for (const pagina of paginas) {
          const destino = join(dist, archivoDeRuta(pagina.path));
          mkdirSync(dirname(destino), { recursive: true });
          writeFileSync(
            destino,
            construirHtmlDeRuta(plantilla, pagina, siteUrl),
            'utf8'
          );
        }

        const esPublico = siteUrl === DOMINIO_PUBLICO;
        console.log(
          esPublico
            ? `SEO: ${siteUrl} — robots.txt abierto, sitemap con ${paginas.length} rutas, ${paginas.length} HTML con cabecera propia`
            : `SEO: ${siteUrl} NO es el sitio publico — robots.txt cerrado y las ${paginas.length} rutas marcadas noindex`
        );
      },
    },
  };
}
