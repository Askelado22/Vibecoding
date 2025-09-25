import { prisma } from './prisma';

export async function upsertSuggestions(
  entries: Array<{ path: string; score?: number; titleMatch: string; description?: string }>
) {
  await prisma.$transaction([
    prisma.suggestion.deleteMany({}),
    prisma.suggestion.createMany({
      data: entries.map((entry) => ({
        path: entry.path,
        score: entry.score ?? 0,
        titleMatch: entry.titleMatch,
        description: entry.description
      }))
    })
  ]);
}

export async function allSuggestions() {
  return prisma.suggestion.findMany({ orderBy: { score: 'desc' } });
}
