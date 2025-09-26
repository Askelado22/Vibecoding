import {
  ArrowRightCircleIcon,
  ArrowLeftCircleIcon,
  ChatBubbleBottomCenterTextIcon,
  LinkIcon,
  DocumentDuplicateIcon
} from '@heroicons/react/24/outline';

function Spinner() {
  return <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-transparent" />;
}

type BottomActionBarProps = {
  productTitle: string | null;
  productUrl: string | null;
  priceText: string | null;
  sellerName: string | null;
  sellerRating: string | null;
  onSave: () => void;
  onComplete: () => void;
  onPrev: () => void;
  onNext: () => void;
  onOpenComment: () => void;
  canComplete: boolean;
  queueIndex: number;
  queueTotal: number;
  isLoading: boolean;
  hasItem: boolean;
};

export function BottomActionBar({
  productTitle,
  productUrl,
  priceText,
  sellerName,
  sellerRating,
  onSave,
  onComplete,
  onPrev,
  onNext,
  onOpenComment,
  canComplete,
  queueIndex,
  queueTotal,
  isLoading,
  hasItem
}: BottomActionBarProps) {
  const progress = queueTotal > 0 ? `${queueIndex + 1} из ${queueTotal}` : '—';

  const copyUrl = () => {
    if (!productUrl) return;
    navigator.clipboard.writeText(productUrl).catch(() => undefined);
  };

  const openProduct = () => {
    if (!productUrl) return;
    window.open(productUrl, '_blank', 'noopener');
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-surfaceAlt/70 bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/70">
      <div className="mx-auto flex max-w-[1760px] items-center justify-between gap-6 px-6 py-4">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-3 text-sm text-gray-300">
            <button
              type="button"
              onClick={openProduct}
              className="truncate text-left text-lg font-semibold text-textPrimary transition hover:text-accentBlue"
              title={productTitle ?? productUrl ?? 'Открыть товар'}
              disabled={!productUrl}
            >
              {productTitle ?? productUrl ?? 'Товар не выбран'}
            </button>
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-400">
            {priceText ? <span className="text-textPrimary">{priceText}</span> : null}
            {sellerName ? (
              <span className="inline-flex items-center gap-1 text-gray-400">
                {sellerName}
                {sellerRating ? <span className="text-xs text-accentPink">★ {sellerRating}</span> : null}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={copyUrl}
            className="rounded-md border border-surfaceAlt px-3 py-2 text-sm text-gray-300 transition hover:border-accentBlue/70 hover:text-white"
            disabled={!productUrl}
          >
            <DocumentDuplicateIcon className="h-5 w-5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={openProduct}
            className="rounded-md border border-surfaceAlt px-3 py-2 text-sm text-gray-300 transition hover:border-accentBlue/70 hover:text-white"
            disabled={!productUrl}
          >
            <LinkIcon className="h-5 w-5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={onOpenComment}
            className="rounded-md border border-surfaceAlt px-3 py-2 text-sm text-gray-300 transition hover:border-accentPink/70 hover:text-white"
            disabled={!hasItem}
          >
            <ChatBubbleBottomCenterTextIcon className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPrev}
            className="flex items-center gap-2 rounded-md border border-surfaceAlt px-4 py-2 text-sm text-gray-200 transition hover:border-accentBlue/70 hover:text-white"
            disabled={!hasItem}
          >
            <ArrowLeftCircleIcon className="h-5 w-5" aria-hidden />
            Предыдущий
          </button>
          <button
            type="button"
            onClick={onNext}
            className="flex items-center gap-2 rounded-md border border-surfaceAlt px-4 py-2 text-sm text-gray-200 transition hover:border-accentBlue/70 hover:text-white"
            disabled={!hasItem}
          >
            Следующий
            <ArrowRightCircleIcon className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">{progress}</span>
          <button
            type="button"
            onClick={onSave}
            className="rounded-md bg-accentBlue px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!hasItem || isLoading}
          >
            {isLoading ? <Spinner /> : 'Сохранить'}
          </button>
          <button
            type="button"
            onClick={onComplete}
            className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!hasItem || !canComplete || isLoading}
          >
            Завершил
          </button>
        </div>
      </div>
    </div>
  );
}
