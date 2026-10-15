const STOP_WORDS = new Set([
  'el', 'la', 'los', 'las', 'de', 'del', 'y', 'o', 'en', 'con', 'por', 'para',
  'que', 'se', 'su', 'sus', 'un', 'una', 'al', 'es', 'ser', 'como', 'más',
  'the', 'and', 'or', 'of', 'to', 'in', 'a', 'an',
]);

export function extractKeywordsFromText(text: string, max = 20): string[] {
  const normalized = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOP_WORDS.has(w));

  const freq = new Map<string, number>();
  for (const word of normalized) {
    freq.set(word, (freq.get(word) ?? 0) + 1);
  }

  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([word]) => word);
}

export function extractTopicHints(text: string): string[] {
  const lower = text.toLowerCase();
  const hints: string[] = [];

  const topicPatterns: Array<{ slug: string; patterns: string[] }> = [
    { slug: 'confidencialidad', patterns: ['confidencial', 'secreto', 'divulgación'] },
    { slug: 'terminacion', patterns: ['terminación', 'rescisión', 'vencimiento'] },
    { slug: 'incumplimiento', patterns: ['incumplimiento', 'mora'] },
    { slug: 'responsabilidad', patterns: ['responsabilidad', 'indemnización'] },
    { slug: 'propiedad_intelectual', patterns: ['propiedad intelectual', 'derechos de autor'] },
    { slug: 'renovacion', patterns: ['renovación', 'prórroga'] },
    { slug: 'multas', patterns: ['multa', 'penalidad', 'cláusula penal'] },
    { slug: 'jurisdiccion', patterns: ['jurisdicción', 'foro', 'competencia'] },
    { slug: 'arbitraje', patterns: ['arbitraje', 'árbitro'] },
    { slug: 'proteccion_datos', patterns: ['datos personales', 'habeas data', 'privacidad'] },
    { slug: 'cesion_derechos', patterns: ['cesión', 'subcontratación'] },
    { slug: 'garantias', patterns: ['garantía', 'depósito', 'fianza'] },
  ];

  for (const { slug, patterns } of topicPatterns) {
    if (patterns.some((p) => lower.includes(p))) {
      hints.push(slug);
    }
  }

  return hints;
}
