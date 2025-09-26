import { useCallback, useEffect, useRef, useState } from 'react';
import {
  MOVE_STATUS_OPTIONS,
  getMoveStatusLabel,
  type MoveStatusValue
} from '../lib/constants';
import { useToast } from './ToastProvider';
import type { ListItem } from './ListTab';

interface MyItemsTabProps {
  user: { displayName: string };
}

type CompletionFilter = 'all' | 'yes' | 'no';

type PersonalItem = ListItem;

export function MyItemsTab({ user }: MyItemsTabProps) {
  const { showToast } = useToast();
  const [items, setItems] = useState<PersonalItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextPage, setNextPage] = useState(1);
  const [status, setStatus] = useState<MoveStatusValue | ''>('');
  const [query, setQuery] = useState('');
  const [completion, setCompletion] = useState<CompletionFilter>('no');
  const [showExtra, setShowExtra] = useState(false);
  const requestIdRef = useRef(0);

  const PAGE_SIZE = 100;

  const prepareItems = useCallback((list: PersonalItem[]) => {
    const copy = [...list];
    copy.sort((a, b) => {
      const aRow = a.rowIndex ?? Number.MAX_SAFE_INTEGER;
      const bRow = b.rowIndex ?? Number.MAX_SAFE_INTEGER;
      if (aRow !== bRow) return aRow - bRow;
      const aCreated = new Date(a.createdAt).getTime();
      const bCreated = new Date(b.createdAt).getTime();
      if (aCreated !== bCreated) return aCreated - bCreated;
      return a.id - b.id;
    });
    return copy;
  }, []);

  const loadItems = useCallback(
    async (pageToLoad: number, append: boolean) => {
      const params = new URLSearchParams();
      params.set('page', String(pageToLoad));
      params.set('pageSize', String(PAGE_SIZE));
      params.set('assignee', user.displayName);
      if (status) params.set('status', status);
      if (query) params.set('query', query);
      if (completion !== 'all') params.set('isCompleted', completion === 'yes' ? 'yes' : 'no');

      if (!append) {
        setItems([]);
        setHasMore(false);
        setNextPage(1);
      }

      const requestId = ++requestIdRef.current;
      setLoading(true);
      try {
        const res = await fetch(`/api/items?${params.toString()}`);
        const data = await res.json();
        if (!res.ok) {
          if (requestId === requestIdRef.current) {
            showToast(data.error || 'Не удалось загрузить мои товары', 'error');
          }
          return;
        }
        const received: PersonalItem[] = data.items || [];
        if (requestId === requestIdRef.current) {
          setItems((prev) =>
            append ? prepareItems([...prev, ...received]) : prepareItems(received)
          );
          setHasMore(Boolean(data.hasMore));
          setNextPage(pageToLoad + 1);
        }
      } catch (error) {
        if (requestId === requestIdRef.current) {
          showToast('Не удалось загрузить мои товары', 'error');
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [completion, prepareItems, query, showToast, status, user.displayName]
  );

  useEffect(() => {
    loadItems(1, false);
  }, [loadItems]);

  const formatDate = useCallback((value: string | null) => (value ? new Date(value).toLocaleString('ru-RU') : '—'), []);

  const unassignItem = async (item: PersonalItem) => {
    const res = await fetch(`/api/items/${item.id}/unassign`, { method: 'POST' });
    if (res.ok) {
      setItems((prev) => prepareItems(prev.filter((current) => current.id !== item.id)));
      showToast('Товар снят из очереди');
      // опционально добавить обновлённую запись обратно в общий список не требуется на этой вкладке
    } else {
      const data = await res.json();
      showToast(data.error || 'Не удалось снять товар', 'error');
    }
  };

  const loadMore = () => {
    if (loading || !hasMore) return;
    loadItems(nextPage, true);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-surface p-4 shadow">
        <div className="flex flex-wrap gap-3">
          <input
            placeholder="Поиск"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full rounded-md border border-surfaceAlt bg-surfaceAlt p-2 text-sm text-white md:w-56"
          />
          <select
            value={status}
            onChange={(event) => setStatus((event.target.value as MoveStatusValue | ''))}
            className="w-full rounded-md border border-surfaceAlt bg-surfaceAlt p-2 text-sm text-white md:w-48"
          >
            <option value="">Статус</option>
            {MOVE_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={completion}
            onChange={(event) => setCompletion(event.target.value as CompletionFilter)}
            className="w-full rounded-md border border-surfaceAlt bg-surfaceAlt p-2 text-sm text-white md:w-48"
          >
            <option value="no">Только незавершённые</option>
            <option value="all">Все</option>
            <option value="yes">Только завершённые</option>
          </select>
          <button
            onClick={() => {
              setQuery('');
              setStatus('');
              setCompletion('no');
            }}
            className="rounded-md bg-surfaceAlt px-3 py-2 text-sm text-gray-300 hover:bg-accentPink/20"
          >
            Сбросить
          </button>
          <button
            onClick={() => setShowExtra((prev) => !prev)}
            className="rounded-md bg-accentBlue px-3 py-2 text-sm text-white hover:bg-blue-600"
          >
            {showExtra ? 'Скрыть доп. инфу' : 'Доп. Инфа'}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg bg-surface shadow">
        <table className="min-w-full divide-y divide-surfaceAlt text-sm">
          <thead className="bg-surfaceAlt text-gray-300">
            <tr>
              <th className="px-3 py-2 text-left">A · URL</th>
              <th className="px-3 py-2 text-left">C · Статус</th>
              <th className="px-3 py-2 text-left">F · Итоговый путь</th>
              <th className="px-3 py-2 text-left">I · Приоритет</th>
              <th className="px-3 py-2 text-left">M · Комментарий</th>
              <th className="px-3 py-2 text-left">Обновлено</th>
              <th className="px-3 py-2 text-left">Действия</th>
              {showExtra && (
                <>
                  <th className="px-3 py-2 text-left">D · Кто поставил статус</th>
                  <th className="px-3 py-2 text-left">E · Когда статус</th>
                  <th className="px-3 py-2 text-left">G · Кто поставил путь</th>
                  <th className="px-3 py-2 text-left">H · Когда путь</th>
                  <th className="px-3 py-2 text-left">J · Завершил</th>
                  <th className="px-3 py-2 text-left">K · Когда завершён</th>
                  <th className="px-3 py-2 text-left">L · Флаг переноса</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-surfaceAlt">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-accentPink/10">
                <td className="px-3 py-2 text-accentBlue">
                  <a href={item.productUrl} target="_blank" rel="noreferrer">
                    {item.productUrl}
                  </a>
                </td>
                <td className="px-3 py-2">{getMoveStatusLabel(item.moveStatus) ?? '—'}</td>
                <td className="px-3 py-2">{item.finalBreadcrumbs || '—'}</td>
                <td className="px-3 py-2">{item.priorityRaw || '—'}</td>
                <td className="px-3 py-2">{item.comment || '—'}</td>
                <td className="px-3 py-2">{formatDate(item.updatedAt)}</td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => unassignItem(item)}
                    className="rounded-md bg-surfaceAlt px-3 py-1 text-xs text-gray-300 hover:bg-red-500/40"
                  >
                    Снять
                  </button>
                </td>
                {showExtra && (
                  <>
                    <td className="px-3 py-2">{item.moveStatusSetBy || '—'}</td>
                    <td className="px-3 py-2">{formatDate(item.moveStatusSetAt)}</td>
                    <td className="px-3 py-2">{item.breadcrumbsSetBy || '—'}</td>
                    <td className="px-3 py-2">{formatDate(item.breadcrumbsSetAt)}</td>
                    <td className="px-3 py-2">{item.completedBy || '—'}</td>
                    <td className="px-3 py-2">{formatDate(item.completedAt)}</td>
                    <td className="px-3 py-2">{item.movedFlagRaw || '—'}</td>
                  </>
                )}
              </tr>
            ))}
            {items.length === 0 && !loading && (
              <tr>
                <td colSpan={showExtra ? 14 : 7} className="px-3 py-6 text-center text-sm text-gray-400">
                  Нет товаров в личной очереди
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-center">
        {loading && items.length === 0 ? (
          <span className="text-sm text-gray-400">Загрузка…</span>
        ) : hasMore ? (
          <button
            onClick={loadMore}
            disabled={loading}
            className="rounded-md bg-accentBlue px-4 py-2 text-sm text-white hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Загрузка…' : 'Загрузить ещё'}
          </button>
        ) : items.length === 0 ? (
          <span className="text-sm text-gray-400">Нет записей</span>
        ) : (
          <span className="text-sm text-gray-400">Все записи загружены</span>
        )}
      </div>
    </div>
  );
}
