/**
 * @param {object} p
 * @returns {object}
 */
function article(p) {
  return {
    id: p.id,
    country: 'CO',
    codeName: p.codeName,
    normType: p.normType,
    article: String(p.article),
    title: p.title,
    content: p.content.trim(),
    summary: p.summary ?? p.content.trim().slice(0, 280),
    category: p.category,
    topics: p.topics ?? [],
    keywords: p.keywords ?? [],
    contractTypeIds: p.contractTypeIds,
    riskLevel: p.riskLevel ?? 'medium',
    officialSource: p.officialSource,
    status: 'vigente',
  };
}

module.exports = { article };
