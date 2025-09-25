import { Suggestion } from '@prisma/client';
import { prisma } from '../repositories/prisma';

export type SuggestionResult = {
  path: string;
  score: number;
  source: string;
};

type SuggestionInput = {
  title: string;
  description?: string;
};

type SuggestionProvider = (input: SuggestionInput) => Promise<SuggestionResult[]>;

function calculateScore(baseScore: number, title: string, description: string | undefined, suggestion: Suggestion) {
  let score = baseScore + suggestion.score;
  const normalizedTitle = title.toLowerCase();
  const normalizedDescription = (description ?? '').toLowerCase();
  const match = suggestion.titleMatch.toLowerCase();
  if (normalizedTitle.includes(match)) score += 2;
  if (normalizedDescription.includes(match)) score += 1;
  return score;
}

const localSuggestionProvider: SuggestionProvider = async ({ title, description }) => {
  const suggestions = await prisma.suggestion.findMany();
  return suggestions
    .map((suggestion) => ({
      path: suggestion.path,
      source: suggestion.source,
      score: calculateScore(0, title, description, suggestion)
    }))
    .filter((suggestion) => suggestion.score > 0);
};

function createHttpSuggestionProvider(endpoint: string): SuggestionProvider {
  return async ({ title, description }) => {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description })
    });
    if (!response.ok) {
      return [];
    }
    const payload = await response.json();
    const externalSuggestions: SuggestionResult[] = Array.isArray(payload?.suggestions)
      ? payload.suggestions.map((entry: any) => ({
          path: String(entry.path ?? ''),
          score: Number(entry.score ?? 0),
          source: entry.source ? String(entry.source) : 'external'
        }))
      : [];
    return externalSuggestions.filter((item) => item.path.length > 0);
  };
}

const providerRegistry: SuggestionProvider[] = [localSuggestionProvider];

if (process.env.SUGGESTIONS_HTTP_ENDPOINT) {
  providerRegistry.push(createHttpSuggestionProvider(process.env.SUGGESTIONS_HTTP_ENDPOINT));
}

export async function getSuggestions(title: string, description?: string) {
  if (!title.trim()) {
    return [];
  }

  const input: SuggestionInput = { title, description };
  const results = await Promise.all(
    providerRegistry.map((provider) =>
      provider(input).catch((error) => {
        console.error('[suggestions] provider failed', error);
        return [] as SuggestionResult[];
      })
    )
  );

  const deduplicated = new Map<string, SuggestionResult>();
  for (const suggestion of results.flat()) {
    const existing = deduplicated.get(suggestion.path);
    if (!existing || suggestion.score > existing.score) {
      deduplicated.set(suggestion.path, suggestion);
    }
  }

  return Array.from(deduplicated.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}
