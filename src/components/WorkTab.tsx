import { useEffect, useMemo, useState } from 'react';
import {
  MOVE_STATUS_OPTIONS,
  getMoveStatusLabel,
  type MoveStatusValue
} from '../lib/constants';
import { useToast } from './ToastProvider';

type Item = {
  id: number;
  productUrl: string;
  finalBreadcrumbs: string | null;
  moveStatus: MoveStatusValue | null;
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

type ProductOptionItem = {
  name: string;
  priceText: string | null;
  delta: number | null;
  currency: string | null;
  selected: boolean;
};

type ProductOptionGroup = {
  title: string;
  kind: 'radio' | 'checkbox';
  items: ProductOptionItem[];
};

type ProductModifier = {
  name: string;
  priceText: string | null;
  delta: number | null;
  currency: string | null;
  formattedDelta: string | null;
};

type ProductPrice = {
  rawText: string | null;
  finalText: string | null;
  baseText: string | null;
  formulaText: string | null;
  modifiers: ProductModifier[];
};

type ProductInfo = {
  url: string;
  title: string;
  breadcrumbs: string[];
  mainImage: string | null;
  images: string[];
  price: ProductPrice | null;
  seller: { name: string | null; link: string | null; rating: string | null };
  descriptionHtml: string;
  descriptionText: string;
  extraDescriptionHtml: string;
  params: ProductOptionGroup[];
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
  const [status, setStatus] = useState<MoveStatusValue | ''>('');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<ProductInfo>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isFetchingProduct, setIsFetchingProduct] = useState(false);
  const bestSuggestion = suggestions[0];
  const galleryImages = useMemo(
    () => (product?.images ?? []).filter((src) => src && src !== product?.mainImage),
    [product]
  );

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
        setStatus((data.item.moveStatus ?? '') as MoveStatusValue | '');
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
          setProduct(data.product ?? null);
          const descriptionForSuggestions = data.product?.descriptionText || '';
          if (data.product?.title) {
            fetch(
              `/api/suggestions?title=${encodeURIComponent(data.product.title)}&description=${encodeURIComponent(
                descriptionForSuggestions
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
          setStatus((data.item.moveStatus ?? '') as MoveStatusValue | '');
          setComment(data.item.comment ?? '');
        }
        return;
      }
      setItem(data.item);
      setBreadcrumbs(data.item.finalBreadcrumbs ?? '');
      setStatus((data.item.moveStatus ?? '') as MoveStatusValue | '');
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
          <div className="flex flex-col gap-6 lg:flex-row">
            <div className="lg:w-1/3">
              {product?.mainImage ? (
                <img
                  src={product.mainImage}
                  alt={product.title}
                  className="h-56 w-full rounded-md object-cover"
                />
              ) : (
                <div className="flex h-56 w-full items-center justify-center rounded-md border border-dashed border-gray-600 text-sm text-gray-500">
                  Нет изображения
                </div>
              )}
              {galleryImages.length > 0 && (
                <div className="mt-3 flex gap-2 overflow-x-auto">
                  {galleryImages.map((img) => (
                    <img key={img} src={img} alt="" className="h-16 w-20 flex-none rounded-md object-cover" />
                  ))}
                </div>
              )}
            </div>
            <div className="flex-1 space-y-4">
              <div className="space-y-2">
                <a href={item.productUrl} target="_blank" rel="noreferrer" className="text-2xl font-semibold text-white hover:text-accentBlue">
                  {product?.title || 'Открыть товар'}
                </a>
                <p className="text-sm text-gray-400 break-words">{item.productUrl}</p>
                {product?.breadcrumbs?.length ? (
                  <div className="text-xs uppercase tracking-wide text-gray-500">
                    {product.breadcrumbs.join(' › ')}
                  </div>
                ) : null}
              </div>

              {product?.price ? (
                <div className="rounded-md border border-accentBlue/40 bg-surfaceAlt p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-xs uppercase text-gray-400">Текущая цена</span>
                    <span className="text-2xl font-semibold text-accentPink">
                      {product.price.finalText || product.price.rawText || '—'}
                    </span>
                  </div>
                  {product.price.baseText ? (
                    <div className="mt-2 flex justify-between text-xs text-gray-400">
                      <span>Базовая цена</span>
                      <span>{product.price.baseText}</span>
                    </div>
                  ) : null}
                  {product.price.modifiers.length > 0 ? (
                    <div className="mt-3 space-y-1 text-xs text-gray-300">
                      {product.price.modifiers.map((modifier) => (
                        <div key={`${modifier.name}-${modifier.formattedDelta || modifier.priceText || 'base'}`} className="flex justify-between gap-3">
                          <span className="font-medium text-white">{modifier.name}</span>
                          <span>{modifier.formattedDelta || modifier.priceText || '—'}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {product.price.formulaText ? (
                    <p className="mt-3 text-xs text-gray-500">{product.price.formulaText}</p>
                  ) : null}
                </div>
              ) : null}

              {product?.seller?.name ? (
                <div className="rounded-md border border-accentPink/40 bg-surfaceAlt p-4 text-sm text-gray-200">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Продавец</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-white">
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
                      <span>{product.seller.name}</span>
                    )}
                    {product.seller.rating ? (
                      <span className="text-xs text-gray-400">Рейтинг: {product.seller.rating}</span>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {product?.params?.length ? (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-accentBlue">Опции товара</h3>
                  <div className="space-y-3">
                    {product.params.map((group) => (
                      <div key={group.title} className="rounded-md border border-surfaceAlt bg-surfaceAlt/60 p-3">
                        <p className="text-xs uppercase tracking-wide text-gray-400">{group.title}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {group.items.map((option) => (
                            <span
                              key={`${group.title}-${option.name}`}
                              className={`rounded-full border px-3 py-1 text-xs ${
                                option.selected
                                  ? 'border-accentBlue bg-accentBlue/20 text-white'
                                  : 'border-surface text-gray-300'
                              }`}
                            >
                              {option.name}
                              {option.priceText ? <span className="ml-2 text-gray-400">{option.priceText}</span> : null}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {isFetchingProduct && <p className="text-sm text-gray-400">Загрузка карточки товара…</p>}
            </div>
          </div>
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
              onChange={(event) =>
                setStatus((event.target.value as MoveStatusValue | ''))
              }
              className="mt-2 w-full rounded-md border border-surfaceAlt bg-surfaceAlt p-3 text-sm text-white focus:border-accentBlue focus:outline-none"
            >
              <option value="">Выберите статус</option>
              {MOVE_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
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

        {product && (product.descriptionHtml || product.extraDescriptionHtml) ? (
          <div className="rounded-lg bg-surface p-6 shadow space-y-6">
            {product.descriptionHtml ? (
              <div>
                <h3 className="text-lg font-semibold text-accentBlue">Описание</h3>
                <div
                  className="mt-3 space-y-3 text-sm leading-relaxed text-gray-200"
                  dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
                />
              </div>
            ) : null}
            {product.extraDescriptionHtml ? (
              <div>
                <h3 className="text-lg font-semibold text-accentBlue">Дополнительная информация</h3>
                <div
                  className="mt-3 space-y-3 text-sm leading-relaxed text-gray-200"
                  dangerouslySetInnerHTML={{ __html: product.extraDescriptionHtml }}
                />
              </div>
            ) : null}
          </div>
        ) : null}
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
          <p>Текущий статус: {getMoveStatusLabel(item.moveStatus) ?? '—'}</p>
          <p>Последний статус установил: {item.moveStatusSetBy || '—'}</p>
          <p>Обновлено: {new Date(item.updatedAt).toLocaleString('ru-RU')}</p>
        </div>
      </div>
    </div>
  );
}
