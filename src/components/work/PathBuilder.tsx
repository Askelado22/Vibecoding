import { useEffect, useMemo, useState } from 'react';
import { ClipboardDocumentCheckIcon, ClockIcon } from '@heroicons/react/24/outline';
import {
  SEGMENT_DEFINITIONS,
  ensureSegmentsArray,
  normaliseSegmentValue,
  parseBreadcrumbs,
  stringifyBreadcrumbs,
  type PathSegment
} from '../../lib/pathBuilder';

const KEY_HINT = 'Двойной пробел → перейти к следующему сегменту';

type PathBuilderProps = {
  value: string;
  onChange: (value: string, segments: PathSegment[]) => void;
  onInsertSuggestion?: () => void;
  disabled?: boolean;
  history: string[];
};

type InternalSegment = PathSegment & { isEditing?: boolean };

const MAX_HISTORY = 5;

function buildInitialState(value: string): InternalSegment[] {
  const parsed = parseBreadcrumbs(value);
  const ensured = ensureSegmentsArray(parsed);
  return ensured.map((segment) => ({ ...segment }));
}

function getNextIndex(current: number): number {
  return Math.min(current + 1, SEGMENT_DEFINITIONS.length - 1);
}

function getPrevIndex(current: number): number {
  return Math.max(current - 1, 0);
}

export function PathBuilder({ value, onChange, onInsertSuggestion, disabled, history }: PathBuilderProps) {
  const [segments, setSegments] = useState<InternalSegment[]>(() => buildInitialState(value));
  const [activeIndex, setActiveIndex] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const activeDefinition = SEGMENT_DEFINITIONS[activeIndex];

  useEffect(() => {
    const parsed = parseBreadcrumbs(value);
    const ensured = ensureSegmentsArray(parsed);
    setSegments(ensured.map((segment) => ({ ...segment })));

    const firstEmpty = ensured.findIndex((segment) => !segment.value);
    const nextIndex = firstEmpty === -1 ? Math.min(parsed.length, SEGMENT_DEFINITIONS.length - 1) : firstEmpty;
    setActiveIndex(nextIndex);
    setInputValue(ensured[nextIndex]?.value ?? '');
  }, [value]);

  const currentSuggestions = useMemo(() => {
    if (!activeDefinition?.suggestions) {
      return [];
    }
    if (!inputValue) {
      return activeDefinition.suggestions;
    }
    const needle = inputValue.toLowerCase();
    return activeDefinition.suggestions.filter((suggestion) => suggestion.toLowerCase().includes(needle));
  }, [activeDefinition?.suggestions, inputValue]);

  const updateSegments = (nextSegments: InternalSegment[], nextIndex: number, nextInput: string) => {
    setSegments(nextSegments);
    setActiveIndex(nextIndex);
    setInputValue(nextInput);
    const payload = stringifyBreadcrumbs(nextSegments);
    onChange(payload, nextSegments);
  };

  const handleSegmentSelect = (index: number) => {
    const nextSegments = ensureSegmentsArray(segments).map((segment) => ({ ...segment }));
    const target = nextSegments[index];
    setActiveIndex(index);
    setInputValue(target?.value ?? '');
  };

  const commitValue = (raw: string) => {
    const nextSegments = ensureSegmentsArray(segments).map((segment) => ({ ...segment }));
    const normalised = normaliseSegmentValue(nextSegments[activeIndex].type, raw);
    nextSegments[activeIndex] = { ...nextSegments[activeIndex], value: normalised };
    const nextIndex = getNextIndex(activeIndex);
    const nextInput = nextSegments[nextIndex]?.value ?? '';
    updateSegments(nextSegments, nextIndex, nextInput);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = event.target.value;
    if (rawValue.endsWith('  ')) {
      commitValue(rawValue.slice(0, -2));
      return;
    }
    setInputValue(rawValue);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commitValue(inputValue);
      return;
    }
    if (event.key === 'Tab' && !event.shiftKey) {
      commitValue(inputValue);
      event.preventDefault();
      return;
    }
    if (event.key === 'Tab' && event.shiftKey) {
      event.preventDefault();
      const prevIndex = getPrevIndex(activeIndex);
      setActiveIndex(prevIndex);
      setInputValue(segments[prevIndex]?.value ?? '');
      return;
    }
    if (event.key === 'Backspace' && inputValue.length === 0) {
      const prevIndex = getPrevIndex(activeIndex);
      if (prevIndex !== activeIndex) {
        event.preventDefault();
        const nextSegments = ensureSegmentsArray(segments).map((segment) => ({ ...segment }));
        nextSegments[prevIndex] = { ...nextSegments[prevIndex], value: '' };
        updateSegments(nextSegments, prevIndex, '');
      }
    }
    if (event.key === 'ArrowRight' && inputValue.length === 0) {
      const nextIndex = getNextIndex(activeIndex);
      if (nextIndex !== activeIndex) {
        event.preventDefault();
        setActiveIndex(nextIndex);
        setInputValue(segments[nextIndex]?.value ?? '');
      }
    }
    if (event.key === 'ArrowLeft' && inputValue.length === 0) {
      const prevIndex = getPrevIndex(activeIndex);
      if (prevIndex !== activeIndex) {
        event.preventDefault();
        setActiveIndex(prevIndex);
        setInputValue(segments[prevIndex]?.value ?? '');
      }
    }
  };

  const clearAll = () => {
    const cleared = ensureSegmentsArray([]).map((segment) => ({ ...segment }));
    updateSegments(cleared, 0, '');
  };

  const copyPath = () => {
    const path = stringifyBreadcrumbs(segments);
    if (!path) {
      return;
    }
    navigator.clipboard
      .writeText(path)
      .catch(() => undefined);
  };

  const renderHistory = () => {
    if (!history.length) {
      return null;
    }
    return (
      <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
        <ClockIcon className="h-4 w-4" aria-hidden />
        <div className="flex flex-wrap gap-2">
          {history.slice(0, MAX_HISTORY).map((entry) => (
            <button
              key={entry}
              type="button"
              onClick={() => onChange(entry, parseBreadcrumbs(entry))}
              className="rounded-full border border-surfaceAlt px-2.5 py-0.5 text-xs text-gray-300 transition hover:border-accentBlue/70 hover:text-white"
            >
              {entry}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-lg border border-surfaceAlt bg-surfaceAlt/60 p-4 shadow">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-textPrimary">Итоговый путь</p>
          <p className="text-xs text-gray-400">{KEY_HINT}</p>
        </div>
        <button
          type="button"
          onClick={copyPath}
          className="flex items-center gap-1 rounded-md border border-surfaceAlt px-2.5 py-1 text-xs text-gray-300 transition hover:border-accentBlue/70 hover:text-white"
        >
          <ClipboardDocumentCheckIcon className="h-4 w-4" aria-hidden />
          Скопировать
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {segments.map((segment, index) => {
          const definition = SEGMENT_DEFINITIONS[index];
          const isActive = index === activeIndex;
          const hasSuggestions = Boolean(definition?.suggestions?.length);
          const isInvalid = hasSuggestions && segment.value && !definition?.suggestions?.some(
            (suggestion) => suggestion.toLowerCase() === segment.value.toLowerCase()
          );
          return (
            <button
              key={definition?.type ?? `custom-${index}`}
              type="button"
              onClick={() => handleSegmentSelect(index)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition ${
                isActive
                  ? 'border-accentBlue bg-accentBlue/15 text-white'
                  : 'border-surfaceAlt bg-surface text-gray-300 hover:border-accentBlue/60'
              } ${isInvalid ? 'border-red-500 text-red-400' : ''}`}
            >
              <span className="text-[10px] uppercase tracking-wide text-gray-400">{definition?.label}</span>
              <span className="text-sm text-textPrimary">
                {segment.value || (definition?.placeholder ?? '—')}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={activeDefinition?.placeholder}
          className="w-full rounded-md border border-surfaceAlt bg-surface px-3 py-2 text-sm text-white outline-none transition focus:border-accentBlue disabled:cursor-not-allowed disabled:opacity-60"
        />
        {activeDefinition?.suggestions && (
          <p className="text-xs text-gray-500">{activeDefinition.suggestions.join(' · ')}</p>
        )}
      </div>

      {currentSuggestions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {currentSuggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => commitValue(suggestion)}
              className="rounded-full border border-surfaceAlt bg-surface px-2.5 py-1 text-xs text-gray-200 transition hover:border-accentBlue/70 hover:text-white"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <button
          type="button"
          onClick={clearAll}
          className="rounded-md border border-surfaceAlt px-3 py-1 text-gray-300 transition hover:border-accentBlue/70 hover:text-white"
        >
          Очистить
        </button>
        {onInsertSuggestion && (
          <button
            type="button"
            onClick={onInsertSuggestion}
            className="rounded-md bg-accentBlue px-3 py-1 text-white transition hover:bg-blue-600"
          >
            Вставить из подсказок
          </button>
        )}
      </div>

      {renderHistory()}
    </div>
  );
}
