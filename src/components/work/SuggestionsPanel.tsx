import { ArrowTopRightOnSquareIcon, ClipboardIcon, PlusCircleIcon } from '@heroicons/react/24/outline';

type Suggestion = {
  path: string;
  score: number;
  source: string;
};

type SuggestionsPanelProps = {
  suggestions: Suggestion[];
  onInsert: (path: string) => void;
  onCopy: (path: string) => void;
};

export function SuggestionsPanel({ suggestions, onInsert, onCopy }: SuggestionsPanelProps) {
  const openNode = (path: string) => {
    if (!path) return;
    const lastSegment = path.split('>').pop()?.trim() ?? '';
    if (!lastSegment) return;
    const targetUrl = `https://ggsel.net/catalog?search=${encodeURIComponent(lastSegment)}`;
    window.open(targetUrl, '_blank', 'noopener');
  };

  return (
    <div className="rounded-xl border border-surfaceAlt bg-surface p-4 shadow-lg">
      <h3 className="text-lg font-semibold text-accentBlue">Предложенные пути</h3>
      {suggestions.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500">Подсказок пока нет — попробуйте обновить позже.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {suggestions.map((suggestion) => (
            <li key={`${suggestion.path}-${suggestion.score}`} className="rounded-lg border border-surfaceAlt bg-surfaceAlt/60 p-3">
              <div className="flex flex-col gap-3">
                <div>
                  <p className="text-sm font-semibold text-textPrimary">{suggestion.path}</p>
                  <p className="text-xs text-gray-500">
                    {suggestion.source} · {suggestion.score.toFixed(2)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => onInsert(suggestion.path)}
                    className="inline-flex items-center gap-1 rounded-md bg-accentBlue px-3 py-1 text-white transition hover:bg-blue-600"
                  >
                    <PlusCircleIcon className="h-4 w-4" aria-hidden />
                    Вставить
                  </button>
                  <button
                    type="button"
                    onClick={() => onCopy(suggestion.path)}
                    className="inline-flex items-center gap-1 rounded-md border border-surfaceAlt px-3 py-1 text-gray-300 transition hover:border-accentBlue/70 hover:text-white"
                  >
                    <ClipboardIcon className="h-4 w-4" aria-hidden />
                    Скопировать
                  </button>
                  <button
                    type="button"
                    onClick={() => openNode(suggestion.path)}
                    className="inline-flex items-center gap-1 rounded-md border border-surfaceAlt px-3 py-1 text-gray-300 transition hover:border-accentPink/70 hover:text-white"
                  >
                    <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden />
                    Открыть узел
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
