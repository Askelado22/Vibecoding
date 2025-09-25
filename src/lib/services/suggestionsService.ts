import { Suggestion } from '@prisma/client';
import { prisma } from '../repositories/prisma';

export type SuggestionResult = {
  path: string;
  score: number;
  source: string;
};

function calculateScore(baseScore: number, title: string, description: string | undefined, suggestion: Suggestion) {
  let score = baseScore + suggestion.score;
  const normalizedTitle = title.toLowerCase();
  const normalizedDescription = (description ?? '').toLowerCase();
  const match = suggestion.titleMatch.toLowerCase();
  if (normalizedTitle.includes(match)) score += 2;
  if (normalizedDescription.includes(match)) score += 1;
  return score;
}

export async function getSuggestions(title: string, description?: string) {
  const suggestions = await prisma.suggestion.findMany();
  return suggestions
    .map((suggestion) => ({
      path: suggestion.path,
      source: suggestion.source,
      score: calculateScore(0, title, description, suggestion)
    }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}
