import { useMemo, useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline';

const KEYWORDS = ['регион', 'подписка', 'аккаунт', 'ключ', 'dlc', 'валюта'];

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripHtml(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function highlightHtml(html: string, search: string): string {
  if (!html) {
    return '';
  }
  let result = html;

  [...KEYWORDS, search]
    .filter((keyword): keyword is string => Boolean(keyword))
    .forEach((keyword) => {
      const pattern = new RegExp(`(${escapeRegExp(keyword)})`, 'gi');
      result = result.replace(pattern, '<mark class="bg-accentBlue/30 text-white">$1</mark>');
    });

  return result;
}

type DetailsAccordionProps = {
  descriptionHtml: string;
  extraHtml: string;
};

export function DetailsAccordion({ descriptionHtml, extraHtml }: DetailsAccordionProps) {
  const [search, setSearch] = useState('');
  const [openDescription, setOpenDescription] = useState(true);
  const [openExtra, setOpenExtra] = useState(false);

  const highlightedDescription = useMemo(
    () => highlightHtml(descriptionHtml, search.trim()),
    [descriptionHtml, search]
  );
  const highlightedExtra = useMemo(() => highlightHtml(extraHtml, search.trim()), [extraHtml, search]);

  const copyDescription = () => {
    const text = stripHtml(descriptionHtml);
    if (!text) return;
    navigator.clipboard.writeText(text).catch(() => undefined);
  };

  const copyExtra = () => {
    const text = stripHtml(extraHtml);
    if (!text) return;
    navigator.clipboard.writeText(text).catch(() => undefined);
  };

  const toggleAll = (expanded: boolean) => {
    setOpenDescription(expanded);
    setOpenExtra(expanded);
  };

  return (
    <div className="rounded-xl border border-surfaceAlt bg-surface p-6 shadow-lg">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Поиск по описанию"
            className="w-64 rounded-md border border-surfaceAlt bg-surfaceAlt px-3 py-2 text-sm text-white outline-none focus:border-accentBlue"
          />
          <p className="text-xs text-gray-500">Ключевые слова подсвечиваются автоматически</p>
        </div>
        <div className="flex gap-2 text-sm">
          <button
            type="button"
            onClick={() => toggleAll(true)}
            className="rounded-md border border-surfaceAlt px-3 py-1 text-gray-300 transition hover:border-accentBlue/70 hover:text-white"
          >
            Развернуть всё
          </button>
          <button
            type="button"
            onClick={() => toggleAll(false)}
            className="rounded-md border border-surfaceAlt px-3 py-1 text-gray-300 transition hover:border-accentBlue/70 hover:text-white"
          >
            Свернуть всё
          </button>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <section className="rounded-lg border border-surfaceAlt bg-surfaceAlt/60 p-4">
          <header className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setOpenDescription((prev) => !prev)}
              className="flex items-center gap-2 text-left text-lg font-semibold text-accentBlue"
            >
              {openDescription ? <ChevronUpIcon className="h-5 w-5" aria-hidden /> : <ChevronDownIcon className="h-5 w-5" aria-hidden />}
              Описание
            </button>
            {descriptionHtml ? (
              <button
                type="button"
                onClick={copyDescription}
                className="flex items-center gap-2 rounded-md border border-surfaceAlt px-2.5 py-1 text-xs text-gray-300 transition hover:border-accentBlue/70 hover:text-white"
              >
                <DocumentDuplicateIcon className="h-4 w-4" aria-hidden />
                Скопировать фрагмент
              </button>
            ) : null}
          </header>
          {openDescription ? (
            <div
              className="mt-4 max-h-[420px] overflow-auto pr-2 text-sm leading-tight text-gray-200"
              dangerouslySetInnerHTML={{ __html: highlightedDescription }}
            />
          ) : null}
        </section>

        <section className="rounded-lg border border-surfaceAlt bg-surfaceAlt/60 p-4">
          <header className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setOpenExtra((prev) => !prev)}
              className="flex items-center gap-2 text-left text-lg font-semibold text-accentBlue"
            >
              {openExtra ? <ChevronUpIcon className="h-5 w-5" aria-hidden /> : <ChevronDownIcon className="h-5 w-5" aria-hidden />}
              Дополнительная информация
            </button>
            {extraHtml ? (
              <button
                type="button"
                onClick={copyExtra}
                className="flex items-center gap-2 rounded-md border border-surfaceAlt px-2.5 py-1 text-xs text-gray-300 transition hover:border-accentBlue/70 hover:text-white"
              >
                <DocumentDuplicateIcon className="h-4 w-4" aria-hidden />
                Скопировать фрагмент
              </button>
            ) : null}
          </header>
          {openExtra ? (
            <div
              className="mt-4 max-h-[360px] overflow-auto pr-2 text-sm leading-tight text-gray-200"
              dangerouslySetInnerHTML={{ __html: highlightedExtra }}
            />
          ) : null}
        </section>
      </div>
    </div>
  );
}
