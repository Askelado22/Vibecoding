import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '../../../../lib/auth';
import { upsertSuggestions } from '../../../../lib/repositories/suggestionRepository';

function parseCsv(content: string) {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const entries = [] as Array<{ path: string; score?: number; titleMatch: string; description?: string }>;
  for (const line of lines) {
    const parts = line.split(',');
    if (parts.length < 2) continue;
    const [titleMatch, path, scoreRaw, description] = parts;
    const score = scoreRaw ? Number(scoreRaw) : undefined;
    entries.push({ titleMatch: titleMatch.trim(), path: path.trim(), score, description });
  }
  return entries;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireAuth(req, res, ['admin']);
  if (!user) return;

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { type, payload } = req.body as { type: 'json' | 'csv'; payload: string };
  if (!type || !payload) {
    res.status(400).json({ error: 'Некорректные данные' });
    return;
  }

  let entries: Array<{ path: string; score?: number; titleMatch: string; description?: string }> = [];
  try {
    if (type === 'json') {
      const parsed = JSON.parse(payload);
      if (!Array.isArray(parsed)) throw new Error('JSON должен быть массивом');
      entries = parsed.map((item: any) => ({
        titleMatch: String(item.titleMatch ?? item.keyword ?? ''),
        path: String(item.path ?? ''),
        score: item.score ? Number(item.score) : undefined,
        description: item.description ? String(item.description) : undefined
      }));
    } else {
      entries = parseCsv(payload);
    }
  } catch (error: any) {
    res.status(400).json({ error: error?.message ?? 'Ошибка парсинга' });
    return;
  }

  entries = entries.filter((entry) => entry.titleMatch && entry.path);
  if (entries.length === 0) {
    res.status(400).json({ error: 'Нет валидных записей' });
    return;
  }

  await upsertSuggestions(entries);
  res.status(200).json({ count: entries.length });
}
