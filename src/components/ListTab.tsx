import { useEffect, useState } from 'react';
import { MOVE_STATUS_OPTIONS } from '../lib/constants';
import { useToast } from './ToastProvider';

type Item = {
  id: number;
  productUrl: string;
  assigneeName: string | null;
  moveStatus: string | null;
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
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('');
  const [assignee, setAssignee] = useState('');
  const [query, setQuery] = useState('');
  const [hasBreadcrumbs, setHasBreadcrumbs] = useState('');
  const [isCompleted, setIsCompleted] = useState('');

  const fetchItems = () => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    if (status) params.set('status', status);
    if (assignee) params.set('assignee', assignee);
    if (query) params.set('query', query);
    if (hasBreadcrumbs) params.set('hasBreadcrumbs', hasBreadcrumbs);
    if (isCompleted) params.set('isCompleted', isCompleted);
    fetch(`/api/items?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setItems(data.items || []);
        setTotal(data.total || 0);
      });
  };

  useEffect(() => {
    fetchItems();
  }, [page, status, assignee, query, hasBreadcrumbs, isCompleted]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const assignItem = async (item: Item) => {
    const res = await fetch(`/api/items/${item.id}/assign`, { method: 'POST' });
    if (res.ok) {
      showToast('Товар добавлен в очередь');
      fetchItems();
    }
  };

  const unassignItem = async (item: Item) => {
    const res = await fetch(`/api/items/${item.id}/unassign`, { method: 'POST' });
    if (res.ok) {
      showToast('Товар снят');
      fetchItems();
    }
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
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-md border border-surfaceAlt bg-surfaceAlt p-2 text-sm text-white"
          >
            <option value="">Статус</option>
            {MOVE_STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
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
          <button
            onClick={() => {
              setPage(1);
              fetchItems();
            }}
            className="rounded-md bg-accentBlue px-3 py-2 text-sm text-white"
          >
            Применить
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg bg-surface shadow">
        <table className="min-w-full divide-y divide-surfaceAlt text-sm">
          <thead className="bg-surfaceAlt text-gray-300">
            <tr>
              <th className="px-3 py-2 text-left">URL</th>
              <th className="px-3 py-2 text-left">Исполнитель</th>
              <th className="px-3 py-2 text-left">Статус</th>
              <th className="px-3 py-2 text-left">Крошки</th>
              <th className="px-3 py-2 text-left">Комментарий</th>
              <th className="px-3 py-2 text-left">Готов</th>
              <th className="px-3 py-2 text-left">L</th>
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
                  <td className="px-3 py-2">{item.moveStatus || '—'}</td>
                  <td className="px-3 py-2">{item.finalBreadcrumbs || '—'}</td>
                  <td className="px-3 py-2">{item.comment || '—'}</td>
                  <td className="px-3 py-2">{item.completedAt ? 'Да' : 'Нет'}</td>
                  <td className="px-3 py-2">{item.movedFlagRaw || '—'}</td>
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

      <div className="flex items-center justify-between text-sm text-gray-300">
        <span>
          Страница {page} из {totalPages} (всего {total})
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-md bg-surfaceAlt px-3 py-1 hover:bg-accentPink/20 disabled:opacity-50"
          >
            Назад
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-md bg-surfaceAlt px-3 py-1 hover:bg-accentPink/20 disabled:opacity-50"
          >
            Вперёд
          </button>
        </div>
      </div>
    </div>
  );
}
