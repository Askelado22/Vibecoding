import { useEffect, useMemo, useRef, useState } from 'react';
import { ClipboardDocumentCheckIcon, ClockIcon } from '@heroicons/react/24/outline';
import {
  SEGMENT_DEFINITIONS,
  ensureSegmentsArray,
  parseBreadcrumbs,
  stringifyBreadcrumbs,
  type PathSegment
} from '../../lib/pathBuilder';

const KEY_HINT = 'Двойной пробел → вставить разделитель «>»';

const MAX_HISTORY = 5;

function clampIndex(index: number): number {
  return Math.max(0, Math.min(index, SEGMENT_DEFINITIONS.length - 1));
}

type PositionedSegment = {
  index: number;
  rawStart: number;
  rawEnd: number;
  trimmedValue: string;
};

function getPositionedSegments(value: string): PositionedSegment[] {
  const segments: PositionedSegment[] = [];
  const parts = value.split('>');
  let offset = 0;

  parts.forEach((part, index) => {
    const rawStart = offset;
    const rawEnd = rawStart + part.length;
    const trimmedValue = part.trim();

    segments.push({
      index,
      rawStart,
      rawEnd,
      trimmedValue
    });

    offset = rawEnd + 1;
  });

  if (segments.length === 0) {
    segments.push({ index: 0, rawStart: 0, rawEnd: 0, trimmedValue: '' });
  }

  return segments;
}

function determineActiveIndex(value: string, caret: number | null): number {
  const positioned = getPositionedSegments(value);
  if (caret == null) {
    return clampIndex(positioned[positioned.length - 1]?.index ?? 0);
  }

  for (const segment of positioned) {
    if (caret <= segment.rawEnd) {
      return clampIndex(segment.index);
    }
  }

  return clampIndex(positioned[positioned.length - 1]?.index ?? 0);
}

type PathBuilderProps = {
  value: string;
  onChange: (value: string, segments: PathSegment[]) => void;
  onInsertSuggestion?: () => void;
  disabled?: boolean;
  history: string[];
};

export function PathBuilder({ value, onChange, onInsertSuggestion, disabled, history }: PathBuilderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(value ?? '');
  const [caret, setCaret] = useState<number | null>(null);
  const [highlightedSuggestion, setHighlightedSuggestion] = useState(0);

  useEffect(() => {
    if (value !== draft) {
      setDraft(value ?? '');
    }
  }, [value, draft]);

  const parsedSegments = useMemo(() => parseBreadcrumbs(draft), [draft]);
  const positionedSegments = useMemo(() => getPositionedSegments(draft), [draft]);
  const activeIndex = useMemo(() => determineActiveIndex(draft, caret), [draft, caret]);
  const activeDefinition = SEGMENT_DEFINITIONS[activeIndex];
  const activeValue = useMemo(() => {
    const positioned = positionedSegments.find((segment) => segment.index === activeIndex);
    if (positioned) {
      return positioned.trimmedValue;
    }
    return parsedSegments[activeIndex]?.value ?? '';
  }, [activeIndex, parsedSegments, positionedSegments]);

  const invalidSegments = useMemo(() => {
    return parsedSegments.filter((segment, index) => {
      const definition = SEGMENT_DEFINITIONS[index];
      if (!definition?.suggestions || definition.suggestions.length === 0) {
        return false;
      }
      if (!segment.value.trim()) {
        return false;
      }
      return !definition.suggestions.some(
        (suggestion) => suggestion.toLowerCase() === segment.value.trim().toLowerCase()
      );
    });
  }, [parsedSegments]);

  const filteredSuggestions = useMemo(() => {
    if (!activeDefinition?.suggestions || activeDefinition.suggestions.length === 0) {
      return [];
    }
    const needle = activeValue.trim().toLowerCase();
    if (!needle) {
      return activeDefinition.suggestions;
    }
    return activeDefinition.suggestions.filter((suggestion) =>
      suggestion.toLowerCase().includes(needle)
    );
  }, [activeDefinition?.suggestions, activeValue]);

  useEffect(() => {
    setHighlightedSuggestion(0);
  }, [activeIndex, filteredSuggestions.length]);

  const emitChange = (nextValue: string) => {
    setDraft(nextValue);
    const segments = parseBreadcrumbs(nextValue);
    onChange(nextValue, segments);
  };

  const normaliseAndEmit = (nextValue: string) => {
    const normalised = stringifyBreadcrumbs(parseBreadcrumbs(nextValue));
    emitChange(normalised);
  };

  const applySuggestion = (suggestion: string) => {
    const segments = ensureSegmentsArray(parsedSegments);
    const updated: PathSegment[] = segments.map((segment, index) =>
      index === activeIndex ? { ...segment, value: suggestion } : segment
    );

    let nextValue = stringifyBreadcrumbs(updated);
    let caretPosition = nextValue.length;

    if (activeIndex < SEGMENT_DEFINITIONS.length - 1) {
      const nextSegment = updated[activeIndex + 1];
      if (!nextSegment.value.trim()) {
        nextValue = nextValue ? `${nextValue} > ` : '';
        caretPosition = nextValue.length;
      }
    }

    setHighlightedSuggestion(0);
    emitChange(nextValue);
    setCaret(caretPosition);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(caretPosition, caretPosition);
    });
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const target = event.target;
    let raw = target.value;
    const selectionStart = target.selectionStart ?? raw.length;
    let nextCaret = selectionStart;

    if (selectionStart >= 2) {
      const prefix = raw.slice(0, selectionStart);
      if (prefix.endsWith('  ')) {
        const suffix = raw.slice(selectionStart);
        const beforeDoubleSpace = prefix.slice(0, -2);
        const trimmedBefore = beforeDoubleSpace.replace(/\s+$/, '');
        const lastNonSpace = trimmedBefore.slice(-1);

        if (!trimmedBefore) {
          raw = `${beforeDoubleSpace} ${suffix}`;
          nextCaret = Math.max(0, selectionStart - 1);
        } else if (lastNonSpace !== '>') {
          raw = `${trimmedBefore} > ${suffix}`;
          nextCaret = trimmedBefore.length + 3;
        } else {
          raw = `${trimmedBefore} ${suffix}`;
          nextCaret = trimmedBefore.length + 1;
        }
      }
    }

    emitChange(raw);
    setCaret(nextCaret);
    requestAnimationFrame(() => {
      inputRef.current?.setSelectionRange(nextCaret, nextCaret);
    });
  };

  const handleBlur = () => {
    normaliseAndEmit(draft);
  };

  const handleSelect = (event: React.SyntheticEvent<HTMLInputElement>) => {
    const element = event.currentTarget;
    setCaret(element.selectionStart ?? null);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (filteredSuggestions.length > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setHighlightedSuggestion((prev) =>
          prev + 1 >= filteredSuggestions.length ? 0 : prev + 1
        );
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setHighlightedSuggestion((prev) =>
          prev - 1 < 0 ? filteredSuggestions.length - 1 : prev - 1
        );
        return;
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        const suggestion = filteredSuggestions[highlightedSuggestion];
        if (suggestion) {
          event.preventDefault();
          applySuggestion(suggestion);
          return;
        }
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        setHighlightedSuggestion(0);
        return;
      }
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      normaliseAndEmit(draft);
    }
  };

  const clearAll = () => {
    emitChange('');
    setCaret(0);
    setHighlightedSuggestion(0);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(0, 0);
    });
  };

  const copyPath = () => {
    if (!draft.trim()) return;
    navigator.clipboard.writeText(stringifyBreadcrumbs(parseBreadcrumbs(draft))).catch(() => undefined);
  };

  const renderHistory = () => {
    if (!history.length) {
      return null;
    }
    return (
      <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
        <ClockIcon className="h-4 w-4" aria-hidden />
        <div className="flex flex-wrap gap-2">
          {history.slice(0, MAX_HISTORY).map((entry) => (
            <button
              key={entry}
              type="button"
              onClick={() => emitChange(entry)}
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

      <div className="mt-4 space-y-3">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-accentBlue/80">
            {activeDefinition?.label ?? 'Сегмент'}
          </p>
        </div>
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onSelect={handleSelect}
            onClick={handleSelect}
            onFocus={handleSelect}
            onBlur={handleBlur}
            disabled={disabled}
            placeholder="Игры > Minecraft > Ключи > Steam"
            className="w-full rounded-md border border-surfaceAlt bg-surface px-3 py-2 text-sm text-white outline-none transition focus:border-accentBlue disabled:cursor-not-allowed disabled:opacity-60"
          />
          {filteredSuggestions.length > 0 ? (
            <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-md border border-surfaceAlt bg-surface shadow-xl">
              {filteredSuggestions.map((suggestion, index) => (
                <button
                  key={suggestion}
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    applySuggestion(suggestion);
                  }}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition hover:bg-accentBlue/20 ${
                    index === highlightedSuggestion ? 'bg-accentBlue/20 text-white' : 'text-gray-200'
                  }`}
                >
                  <span>{suggestion}</span>
                  <span className="text-[11px] uppercase text-gray-500">{activeDefinition?.label}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="space-y-1 text-xs text-gray-400">
          {SEGMENT_DEFINITIONS.map((definition, index) => {
            const segmentValue = parsedSegments[index]?.value ?? '';
            return (
              <div key={definition.type} className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wide text-gray-500">{definition.label}</span>
                <span className={`text-sm ${segmentValue ? 'text-white' : 'text-gray-500'}`}>
                  {segmentValue || definition.placeholder}
                </span>
              </div>
            );
          })}
        </div>

        {invalidSegments.length > 0 ? (
          <p className="text-xs text-red-400">
            Проверьте сегменты: {invalidSegments.map((segment) => segment.value).join(', ')}
          </p>
        ) : null}
      </div>

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
