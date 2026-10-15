/**
 * Genera backend/functions/data/co-mvp-corpus.json desde los módulos en co-corpus/.
 *
 * Uso: node scripts/build-co-corpus.cjs
 */
const fs = require('fs');
const path = require('path');

const articles = require('../data/co-corpus/index.js');
const catalog = require('../../../shared/data/legal-catalog.json');
const outPath = path.resolve(__dirname, '../data/co-mvp-corpus.json');

const ids = new Set();
for (const a of articles) {
  if (ids.has(a.id)) {
    console.error(`❌ ID duplicado: ${a.id}`);
    process.exit(1);
  }
  ids.add(a.id);
}

const missingTop = [];
for (const ct of catalog.contractTypes) {
  for (const id of ct.topArticleIds ?? []) {
    if (!ids.has(id)) {
      missingTop.push({ contractType: ct.id, articleId: id });
    }
  }
}

fs.writeFileSync(outPath, JSON.stringify(articles, null, 2), 'utf8');

const byType = {};
for (const a of articles) {
  for (const t of a.contractTypeIds) {
    byType[t] = (byType[t] ?? 0) + 1;
  }
}

console.log(`✅ Corpus CO generado: ${articles.length} artículos → ${outPath}`);
console.log('   Por tipo de contrato:', byType);

if (missingTop.length) {
  console.warn('⚠️  topArticleIds del catálogo sin artículo en corpus:');
  for (const row of missingTop) {
    console.warn(`   - ${row.contractType}: ${row.articleId}`);
  }
}
