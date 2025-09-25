import { useEffect, useMemo, useState } from 'react';
import { MOVE_STATUS_OPTIONS } from '../lib/constants';
import { useToast } from './ToastProvider';

const statusOptions = MOVE_STATUS_OPTIONS as readonly string[];

type Item = {
  id: number;
  productUrl: string;
  finalBreadcrumbs: string | null;
  moveStatus: string | null;
  comment: string | null;
  updatedAt: string;
  assigneeName: string | null;
  moveStatusSetBy: string | null;
  moveStatusSetAt: string | null;
  breadcrumbsSetBy: string | null;
  breadcrumbsSetAt: string | null;
  completedBy: string | null;
  completedAt: string | null;
  priorityRaw: string | null;
};

type ProductInfo = {
  title: string;
  description: string;
  price: string;
  images: string[];
  breadcrumbs: string[];
  seller: { name: string; link: string | null; rating: string };
} | null;

type Suggestion = { path: string; score: number; source: string };

type WorkTabProps = {
  user: { email: string; displayName: string; role: 'admin' | 'worker' };
};

export function WorkTab({ user }: WorkTabProps) {
  const { showToast } = useToast();
  const [item, setItem] = useState<Item | null>(null);
  const [queueIndex, setQueueIndex] = useState(0);
  const [queueTotal, setQueueTotal] = useState(0);
  const [breadcrumbs, setBreadcrumbs] = useState('');
  const [status, setStatus] = useState('');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<ProductInfo>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isFetchingProduct, setIsFetchingProduct] = useState(false);
  const bestSuggestion = suggestions[0];

  const fetchQueueItem = async (direction: 'current' | 'next' | 'prev') => {
    const endpoint = direction === 'prev' ? '/api/items/prev' : '/api/items/next';
    const params = item?.id ? `?currentId=${item.id}` : '';
    const res = await fetch(`${endpoint}${direction === 'current' ? '' : params}`);
    const data = await res.json();
    if (res.ok) {
      setItem(data.item);
      setQueueIndex(data.index ?? 0);
      setQueueTotal(data.total ?? 0);
      if (data.item) {
        setBreadcrumbs(data.item.finalBreadcrumbs ?? '');
        setStatus(data.item.moveStatus ?? '');
        setComment(data.item.comment ?? '');
      } else {
        setBreadcrumbs('');
        setStatus('');
        setComment('');
      }
    }
  };

  useEffect(() => {
    fetchQueueItem('current').catch(() => {});
  }, []);

  useEffect(() => {
    if (!item) return;
    if (item.productUrl) {
      setIsFetchingProduct(true);
      fetch(`/api/fetchProduct?url=${encodeURIComponent(item.productUrl)}`)
        .then((res) => res.json())
        .then((data) => {
          setProduct(data.product);
          if (data.product?.title) {
            fetch(
              `/api/suggestions?title=${encodeURIComponent(data.product.title)}&description=${encodeURIComponent(
                data.product.description || ''
              )}`
            )
              .then((res) => res.json())
              .then((payload) => setSuggestions(payload.suggestions || []));
          } else {
            setSuggestions([]);
          }
        })
        .catch(() => setProduct(null))
        .finally(() => setIsFetchingProduct(false));
    }
  }, [item?.id]);

  const hasRequiredFields = useMemo(() => status && breadcrumbs, [status, breadcrumbs]);

  const saveChanges = async () => {
    if (!item) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          finalBreadcrumbs: breadcrumbs || null,
          moveStatus: status || null,
          comment,
          updatedAt: item.updatedAt
        })
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Не удалось сохранить', 'error');
        if (res.status === 409 && data.item) {
          setItem(data.item);
          setBreadcrumbs(data.item.finalBreadcrumbs ?? '');
          setStatus(data.item.moveStatus ?? '');
          setComment(data.item.comment ?? '');
        }
        return;
      }
      setItem(data.item);
      setBreadcrumbs(data.item.finalBreadcrumbs ?? '');
      setStatus(data.item.moveStatus ?? '');
      setComment(data.item.comment ?? '');
      showToast('Сохранено');
    } finally {
      setLoading(false);
    }
  };

  const completeItem = async () => {
    if (!item) return;
    if (!hasRequiredFields) {
      showToast('Заполните статус и хлебные крошки', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/items/${item.id}/complete`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Не удалось завершить', 'error');
        return;
      }
      showToast('Товар завершён');
      await fetchQueueItem('next');
    } finally {
      setLoading(false);
    }
  };

  const goNext = () => fetchQueueItem('next');
  const goPrev = () => fetchQueueItem('prev');

  const handleSuggestionClick = (path: string) => {
    setBreadcrumbs(path);
  };

  if (!item) {
    return (
      <div className="rounded-lg bg-surface p-6 shadow">
        <p className="text-gray-300">В очереди пока нет товаров. Возьмите их из общего списка.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <div className="rounded-lg bg-surface p-6 shadow">
          <div className="flex items-start justify-between">
            <div>
              <a href={item.productUrl} target="_blank" rel="noreferrer" className="text-xl font-semibold">
                {product?.title || 'Открыть товар'}
              </a>
              <p className="text-sm text-gray-400">{item.productUrl}</p>
            </div>
            <div className="text-right text-accentPink">
              {product?.price && <p className="text-lg font-semibold">{product.price}</p>}
              {product?.seller?.name && (
                <a
                  href={product.seller.link || '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-gray-300 hover:text-accentPink"
                >
                  {product.seller.name}
                </a>
              )}
            </div>
          </div>
          {isFetchingProduct && <p className="mt-3 text-sm text-gray-400">Загрузка карточки товара…</p>}
          {product?.images?.[0] && (
            <img
              src={product.images[0]}
              alt={product.title}
              className="mt-4 h-48 w-full rounded-md object-cover"
            />
          )}
          {product?.breadcrumbs?.length ? (
            <div className="mt-4 text-sm text-gray-400">{product.breadcrumbs.join(' > ')}</div>
          ) : null}
          {product?.seller?.name ? (
            <div className="mt-4 flex flex-wrap items-center justify-between rounded-md bg-surfaceAlt p-3 text-sm text-gray-300">
              <span>
                Продавец:{' '}
                {product.seller.link ? (
                  <a
                    href={product.seller.link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-accentPink hover:text-accentBlue"
                  >
                    {product.seller.name}
                  </a>
                ) : (
                  product.seller.name
                )}
              </span>
              {product.seller.rating && <span>Рейтинг: {product.seller.rating}</span>}
            </div>
          ) : null}
        </div>

        <div className="rounded-lg bg-surface p-6 shadow space-y-4">
          <div>
            <label className="text-sm text-gray-300">Итоговый путь</label>
            <textarea
              value={breadcrumbs}
              onChange={(event) => setBreadcrumbs(event.target.value)}
              className="mt-2 w-full rounded-md border border-surfaceAlt bg-surfaceAlt p-3 text-sm text-white focus:border-accentBlue focus:outline-none"
              rows={3}
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                onClick={() => setBreadcrumbs('')}
                className="rounded-md bg-surfaceAlt px-3 py-1 text-sm text-gray-300 hover:bg-accentPink/20"
              >
                Очистить
              </button>
              <button
                onClick={() => {
                  if (bestSuggestion) {
                    setBreadcrumbs(bestSuggestion.path);
                    showToast('Подставлен путь из подсказок');
                  } else {
                    showToast('Подсказки пока не доступны', 'error');
                  }
                }}
                className="rounded-md bg-accentBlue px-3 py-1 text-sm text-white hover:bg-blue-600"
              >
                Вставить из подсказок
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-300">Статус переноса</label>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="mt-2 w-full rounded-md border border-surfaceAlt bg-surfaceAlt p-3 text-sm text-white focus:border-accentBlue focus:outline-none"
            >
              <option value="">Выберите статус</option>
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-gray-300">Комментарий</label>
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              className="mt-2 w-full rounded-md border border-surfaceAlt bg-surfaceAlt p-3 text-sm text-white focus:border-accentBlue focus:outline-none"
              rows={3}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={saveChanges}
              disabled={loading}
              className="rounded-md bg-accentBlue px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
            >
              Сохранить
            </button>
            <button
              onClick={completeItem}
              disabled={!hasRequiredFields || loading}
              className="rounded-md bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600 disabled:opacity-50"
            >
              Завершил
            </button>
            <button
              onClick={goPrev}
              className="rounded-md bg-surfaceAlt px-4 py-2 text-sm text-gray-300 hover:bg-accentPink/20"
            >
              Предыдущий
            </button>
            <button
              onClick={goNext}
              className="rounded-md bg-surfaceAlt px-4 py-2 text-sm text-gray-300 hover:bg-accentPink/20"
            >
              Следующий
            </button>
            <span className="ml-auto text-sm text-gray-400">
              {queueTotal > 0 ? `${queueIndex + 1} из ${queueTotal}` : 'Нет очереди'}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-lg bg-surface p-4 shadow">
          <h3 className="text-lg font-semibold text-accentBlue">Предложенные пути</h3>
          {suggestions.length === 0 ? (
            <p className="mt-3 text-sm text-gray-400">Подсказок пока нет</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {suggestions.map((suggestion) => (
                <li key={suggestion.path}>
                  <button
                    onClick={() => handleSuggestionClick(suggestion.path)}
                    className="w-full rounded-md bg-surfaceAlt px-3 py-2 text-left text-sm text-gray-200 hover:bg-accentPink/20"
                  >
                    <span className="block font-medium text-white">{suggestion.path}</span>
                    <span className="text-xs text-gray-400">{suggestion.source} · {suggestion.score.toFixed(1)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg bg-surface p-4 text-sm text-gray-300 shadow">
          <p>Последний статус установил: {item.moveStatusSetBy || '—'}</p>
          <p>Обновлено: {new Date(item.updatedAt).toLocaleString('ru-RU')}</p>
        </div>
      </div>
    </div>
  );
}
