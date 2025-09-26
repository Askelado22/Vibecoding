import { useCallback, useEffect, useRef, useState } from 'react';
import {
  MOVE_STATUS_OPTIONS,
  getMoveStatusLabel,
  type MoveStatusValue
} from '../lib/constants';
import { useToast } from './ToastProvider';

type Item = {
  id: number;
  productUrl: string;
  assigneeName: string | null;
  moveStatus: MoveStatusValue | null;
  moveStatusSetBy: string | null;
  moveStatusSetAt: string | null;
  finalBreadcrumbs: string | null;
  breadcrumbsSetBy: string | null;
  breadcrumbsSetAt: string | null;
  priorityRaw: string | null;
  completedBy: string | null;
  completedAt: string | null;
  movedFlagRaw: string | null;
  comment: string | null;
  updatedAt: string;
};

type ListTabProps = {
  user: { displayName: string };
};

export function ListTab({ user }: ListTabProps) {
  const { showToast } = useToast();
  const [items, setItems] = useState<Item[]>([]);
  const [nextPage, setNextPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const requestIdRef = useRef(0);
  const [status, setStatus] = useState<MoveStatusValue | ''>('');
  const [assignee, setAssignee] = useState('');
  const [query, setQuery] = useState('');
  const [hasBreadcrumbs, setHasBreadcrumbs] = useState('');
  const [isCompleted, setIsCompleted] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const PAGE_SIZE = 100;

  const loadItems = useCallback(
    async (pageToLoad: number, append: boolean) => {
      const params = new URLSearchParams();
      params.set('page', String(pageToLoad));
      params.set('pageSize', String(PAGE_SIZE));
      if (status) params.set('status', status);
      if (assignee) params.set('assignee', assignee);
      if (query) params.set('query', query);
      if (hasBreadcrumbs) params.set('hasBreadcrumbs', hasBreadcrumbs);
      if (isCompleted) params.set('isCompleted', isCompleted);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);

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
            showToast(data.error || 'Не удалось загрузить список', 'error');
          }
          return;
        }
        const received: Item[] = data.items || [];
        if (requestId === requestIdRef.current) {
          setItems((prev) => (append ? [...prev, ...received] : received));
          setHasMore(Boolean(data.hasMore));
          setNextPage(pageToLoad + 1);
        }
      } catch (error) {
        if (requestId === requestIdRef.current) {
          showToast('Не удалось загрузить список', 'error');
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [assignee, dateFrom, dateTo, hasBreadcrumbs, isCompleted, query, showToast, status]
  );

  useEffect(() => {
    loadItems(1, false);
  }, [loadItems]);

  const formatDate = useCallback((value: string | null) => (value ? new Date(value).toLocaleString('ru-RU') : '—'), []);

  const assignItem = async (item: Item) => {
    const res = await fetch(`/api/items/${item.id}/assign`, { method: 'POST' });
    if (res.ok) {
      showToast('Товар добавлен в очередь');
      await loadItems(1, false);
    } else {
      const data = await res.json();
      showToast(data.error || 'Не удалось взять товар', 'error');
    }
  };

  const unassignItem = async (item: Item) => {
    const res = await fetch(`/api/items/${item.id}/unassign`, { method: 'POST' });
    if (res.ok) {
      showToast('Товар снят');
      await loadItems(1, false);
    } else {
      const data = await res.json();
      showToast(data.error || 'Не удалось снять товар', 'error');
    }
  };

  const resetFilters = () => {
    setStatus('');
    setAssignee('');
    setQuery('');
    setHasBreadcrumbs('');
    setIsCompleted('');
    setDateFrom('');
    setDateTo('');
  };

  const loadMore = () => {
    if (loading || !hasMore) return;
    loadItems(nextPage, true);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-surface p-4 shadow">
        <div className="grid gap-3 md:grid-cols-6">
          <input
            placeholder="Поиск"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="rounded-md border border-surfaceAlt bg-surfaceAlt p-2 text-sm text-white"
          />
          <select
            value={status}
            onChange={(event) => setStatus((event.target.value as MoveStatusValue | ''))}
            className="rounded-md border border-surfaceAlt bg-surfaceAlt p-2 text-sm text-white"
          >
            <option value="">Статус</option>
            {MOVE_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <input
            placeholder="Исполнитель"
            value={assignee}
            onChange={(event) => setAssignee(event.target.value)}
            className="rounded-md border border-surfaceAlt bg-surfaceAlt p-2 text-sm text-white"
          />
          <select
            value={hasBreadcrumbs}
            onChange={(event) => setHasBreadcrumbs(event.target.value)}
            className="rounded-md border border-surfaceAlt bg-surfaceAlt p-2 text-sm text-white"
          >
            <option value="">Крошки</option>
            <option value="yes">Есть</option>
            <option value="no">Нет</option>
          </select>
          <select
            value={isCompleted}
            onChange={(event) => setIsCompleted(event.target.value)}
            className="rounded-md border border-surfaceAlt bg-surfaceAlt p-2 text-sm text-white"
          >
            <option value="">Готовность</option>
            <option value="yes">Готов</option>
            <option value="no">Не готов</option>
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
            className="rounded-md border border-surfaceAlt bg-surfaceAlt p-2 text-sm text-white"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
            className="rounded-md border border-surfaceAlt bg-surfaceAlt p-2 text-sm text-white"
          />
          <button
            onClick={resetFilters}
            className="rounded-md bg-surfaceAlt px-3 py-2 text-sm text-gray-300 hover:bg-accentPink/20"
          >
            Сбросить
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg bg-surface shadow">
        <table className="min-w-full divide-y divide-surfaceAlt text-sm">
          <thead className="bg-surfaceAlt text-gray-300">
            <tr>
              <th className="px-3 py-2 text-left">A · URL</th>
              <th className="px-3 py-2 text-left">B · Исполнитель</th>
              <th className="px-3 py-2 text-left">C · Статус</th>
              <th className="px-3 py-2 text-left">D · Кто поставил статус</th>
              <th className="px-3 py-2 text-left">E · Когда статус</th>
              <th className="px-3 py-2 text-left">F · Итоговый путь</th>
              <th className="px-3 py-2 text-left">G · Кто поставил путь</th>
              <th className="px-3 py-2 text-left">H · Когда путь</th>
              <th className="px-3 py-2 text-left">I · Приоритет</th>
              <th className="px-3 py-2 text-left">J · Завершил</th>
              <th className="px-3 py-2 text-left">K · Когда завершён</th>
              <th className="px-3 py-2 text-left">L · Флаг переноса</th>
              <th className="px-3 py-2 text-left">M · Комментарий</th>
              <th className="px-3 py-2 text-left">Обновлено</th>
              <th className="px-3 py-2 text-left">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surfaceAlt">
            {items.map((item) => {
              const isMine = item.assigneeName === user.displayName;
              return (
                <tr key={item.id} className="hover:bg-accentPink/10">
                  <td className="px-3 py-2 text-accentBlue">
                    <a href={item.productUrl} target="_blank" rel="noreferrer">
                      {item.productUrl}
                    </a>
                  </td>
                  <td className="px-3 py-2">{item.assigneeName || '—'}</td>
                  <td className="px-3 py-2">{getMoveStatusLabel(item.moveStatus) ?? '—'}</td>
                  <td className="px-3 py-2">{item.moveStatusSetBy || '—'}</td>
                  <td className="px-3 py-2">{formatDate(item.moveStatusSetAt)}</td>
                  <td className="px-3 py-2">{item.finalBreadcrumbs || '—'}</td>
                  <td className="px-3 py-2">{item.breadcrumbsSetBy || '—'}</td>
                  <td className="px-3 py-2">{formatDate(item.breadcrumbsSetAt)}</td>
                  <td className="px-3 py-2">{item.priorityRaw || '—'}</td>
                  <td className="px-3 py-2">{item.completedBy || '—'}</td>
                  <td className="px-3 py-2">{formatDate(item.completedAt)}</td>
                  <td className="px-3 py-2">{item.movedFlagRaw || '—'}</td>
                  <td className="px-3 py-2">{item.comment || '—'}</td>
                  <td className="px-3 py-2">{formatDate(item.updatedAt)}</td>
                  <td className="px-3 py-2">
                    {isMine ? (
                      <button
                        onClick={() => unassignItem(item)}
                        className="rounded-md bg-surfaceAlt px-3 py-1 text-xs text-gray-300 hover:bg-red-500/40"
                      >
                        Снять
                      </button>
                    ) : (
                      <button
                        onClick={() => assignItem(item)}
                        className="rounded-md bg-accentBlue px-3 py-1 text-xs text-white hover:bg-blue-600"
                      >
                        Взять себе
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
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
