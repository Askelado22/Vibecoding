import { useEffect, useMemo, useState } from 'react';
import { BottomActionBar } from './work/BottomActionBar';
import { CommentSheet } from './work/CommentSheet';
import { DetailsAccordion } from './work/DetailsAccordion';
import { PathBuilder } from './work/PathBuilder';
import { ProductCard } from './work/ProductCard';
import { StatusCard } from './work/StatusCard';
import { SuggestionsPanel } from './work/SuggestionsPanel';
import { useToast } from './ToastProvider';
import { type MoveStatusValue } from '../lib/constants';
import { parseBreadcrumbs, type PathSegment } from '../lib/pathBuilder';

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
  selected: boolean;
};

type ProductOptionGroup = {
  title: string;
  kind: 'radio' | 'checkbox';
  items: ProductOptionItem[];
};

type ProductPrice = {
  rawText: string | null;
  finalText: string | null;
  baseText: string | null;
  formulaText: string | null;
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

const MAX_HISTORY = 5;

export function WorkTab({ user }: WorkTabProps) {
  const { showToast } = useToast();
  const [item, setItem] = useState<Item | null>(null);
  const [queueIndex, setQueueIndex] = useState(0);
  const [queueTotal, setQueueTotal] = useState(0);
  const [breadcrumbs, setBreadcrumbs] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [status, setStatus] = useState<MoveStatusValue | ''>('');
  const [comment, setComment] = useState('');
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<ProductInfo>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isFetchingProduct, setIsFetchingProduct] = useState(false);

  const bestSuggestion = suggestions[0];

  const appendToHistory = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setHistory((prev) => {
      const next = [trimmed, ...prev.filter((entry) => entry !== trimmed)];
      return next.slice(0, MAX_HISTORY);
    });
  };

  const fetchQueueItem = async (direction: 'current' | 'next' | 'prev') => {
    const endpoint = direction === 'prev' ? '/api/items/prev' : '/api/items/next';
    const params = item?.id ? `?currentId=${item.id}` : '';
    const url = direction === 'current' ? '/api/items/next' : `${endpoint}${params}`;
    const res = await fetch(url);
    const data = await res.json();
    if (res.ok) {
      setItem(data.item ?? null);
      setQueueIndex(data.index ?? 0);
      setQueueTotal(data.total ?? 0);
      if (data.item) {
        const finalPath = data.item.finalBreadcrumbs ?? '';
        setBreadcrumbs(finalPath);
        setStatus((data.item.moveStatus ?? '') as MoveStatusValue | '');
        setComment(data.item.comment ?? '');
        if (finalPath) {
          appendToHistory(finalPath);
        }
      } else {
        setBreadcrumbs('');
        setStatus('');
        setComment('');
      }
      setIsCommentOpen(false);
    }
  };

  useEffect(() => {
    fetchQueueItem('current').catch(() => {});
  }, []);

  useEffect(() => {
    if (!item?.productUrl) {
      setProduct(null);
      setSuggestions([]);
      return;
    }
    setIsFetchingProduct(true);
    fetch(`/api/fetchProduct?url=${encodeURIComponent(item.productUrl)}`)
      .then((res) => res.json())
      .then((data) => {
        setProduct(data.product ?? null);
        const descriptionForSuggestions = data.product?.descriptionText || '';
        if (data.product?.title) {
          fetch(
            `/api/suggestions?title=${encodeURIComponent(data.product.title)}&description=${encodeURIComponent(descriptionForSuggestions)}`
          )
            .then((res) => res.json())
            .then((payload) => setSuggestions(payload.suggestions || []));
        } else {
          setSuggestions([]);
        }
      })
      .catch(() => {
        setProduct(null);
        setSuggestions([]);
      })
      .finally(() => setIsFetchingProduct(false));
  }, [item?.productUrl]);

  const hasRequiredFields = useMemo(() => Boolean(status && breadcrumbs), [status, breadcrumbs]);
  const isCompleted = Boolean(item?.completedAt);
  const canComplete = hasRequiredFields && !isCompleted;

  const handleBreadcrumbsChange = (value: string, _segments: PathSegment[]) => {
    setBreadcrumbs(value);
    if (value.trim()) {
      appendToHistory(value);
    }
  };

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
      if (data.item.finalBreadcrumbs) {
        appendToHistory(data.item.finalBreadcrumbs);
      }
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

  const handleSuggestionInsert = (path: string) => {
    handleBreadcrumbsChange(path, parseBreadcrumbs(path));
    showToast('Путь подставлен');
  };

  const handleSuggestionCopy = (path: string) => {
    navigator.clipboard
      .writeText(path)
      .then(() => showToast('Путь скопирован'))
      .catch(() => showToast('Не удалось скопировать', 'error'));
  };

  return (
    <div className="relative pb-32">
      <div className="mx-auto max-w-[1760px] px-6 py-6">
        {!item ? (
          <div className="rounded-xl border border-surfaceAlt bg-surface p-8 text-center text-gray-400">
            В очереди пока нет товаров. Возьмите их из общего списка.
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="space-y-6 lg:col-span-9">
              <ProductCard product={product} productUrl={item.productUrl} isLoading={isFetchingProduct} />
              <DetailsAccordion descriptionHtml={product?.descriptionHtml ?? ''} extraHtml={product?.extraDescriptionHtml ?? ''} />
            </div>
            <div className="space-y-6 lg:col-span-3">
              <PathBuilder
                value={breadcrumbs}
                onChange={handleBreadcrumbsChange}
                onInsertSuggestion={bestSuggestion ? () => handleSuggestionInsert(bestSuggestion.path) : undefined}
                disabled={loading}
                history={history}
              />
              <SuggestionsPanel
                suggestions={suggestions}
                onInsert={handleSuggestionInsert}
                onCopy={handleSuggestionCopy}
              />
              <StatusCard
                status={status}
                onStatusChange={setStatus}
                updatedAt={item.updatedAt}
                updatedBy={item.moveStatusSetBy}
                completed={isCompleted}
                onToggleComplete={completeItem}
                canComplete={canComplete}
              />
            </div>
          </div>
        )}
      </div>

      <CommentSheet
        isOpen={isCommentOpen && Boolean(item)}
        comment={comment}
        onChange={setComment}
        onSave={saveChanges}
        onClose={() => setIsCommentOpen(false)}
        isSaving={loading}
      />

      <BottomActionBar
        productTitle={product?.title ?? null}
        productUrl={item?.productUrl ?? null}
        priceText={product?.price?.finalText ?? product?.price?.rawText ?? null}
        sellerName={product?.seller?.name ?? null}
        sellerRating={product?.seller?.rating ?? null}
        onSave={saveChanges}
        onComplete={completeItem}
        onPrev={goPrev}
        onNext={goNext}
        onOpenComment={() => setIsCommentOpen((prev) => !prev)}
        canComplete={canComplete}
        queueIndex={queueIndex}
        queueTotal={queueTotal}
        isLoading={loading}
        hasItem={Boolean(item)}
      />
    </div>
  );
}
