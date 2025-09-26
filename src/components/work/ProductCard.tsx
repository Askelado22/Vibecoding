import { useMemo, useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

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

type SellerInfo = {
  name: string | null;
  link: string | null;
  rating: string | null;
};

type ProductCardProps = {
  productUrl: string;
  product?: {
    title: string;
    breadcrumbs: string[];
    mainImage: string | null;
    images: string[];
    price: ProductPrice | null;
    seller: SellerInfo;
    params: ProductOptionGroup[];
  } | null;
  isLoading?: boolean;
};

export function ProductCard({ product, productUrl, isLoading }: ProductCardProps) {
  const [lightbox, setLightbox] = useState(false);
  const [activeImage, setActiveImage] = useState<string | null>(null);

  const previewImages = useMemo(() => {
    const rawImages = product?.images ?? [];
    return rawImages.filter((src) => src && src !== product?.mainImage);
  }, [product?.images, product?.mainImage]);

  const mainImage = activeImage ?? product?.mainImage ?? null;

  const handleImageClick = (src: string | null) => {
    if (!src) {
      return;
    }
    setActiveImage(src);
    setLightbox(true);
  };

  const closeLightbox = () => {
    setLightbox(false);
  };

  return (
    <div className="rounded-xl border border-surfaceAlt bg-surface p-6 shadow-lg">
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="lg:w-2/5 xl:w-1/3">
          <div
            className="relative aspect-video w-full overflow-hidden rounded-lg border border-surfaceAlt/80 bg-surfaceAlt"
            onClick={() => handleImageClick(mainImage)}
          >
            {mainImage ? (
              <img src={mainImage} alt={product?.title ?? ''} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm text-gray-500">Нет изображения</div>
            )}
          </div>
          {previewImages.length > 0 ? (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {previewImages.map((image) => (
                <button
                  key={image}
                  type="button"
                  onClick={() => handleImageClick(image)}
                  className="relative h-16 w-24 flex-none overflow-hidden rounded-md border border-surfaceAlt/70"
                >
                  <img src={image} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex-1 space-y-5">
          <div className="space-y-2">
            <a
              href={productUrl}
              target="_blank"
              rel="noreferrer"
              className="block truncate text-2xl font-semibold text-textPrimary hover:text-accentBlue"
              title={product?.title ?? productUrl}
            >
              {product?.title ?? 'Открыть товар'}
            </a>
            <p className="break-words text-xs text-gray-500">{productUrl}</p>
            {product?.breadcrumbs?.length ? (
              <p className="text-xs uppercase tracking-wide text-gray-500">
                {product.breadcrumbs.join(' › ')}
              </p>
            ) : null}
          </div>

          {product?.price ? (
            <div className="rounded-lg border border-accentBlue/40 bg-surfaceAlt/80 p-4">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-xs uppercase text-gray-400">Цена сейчас</span>
                <span className="text-3xl font-semibold text-accentPink">
                  {product.price.finalText ?? product.price.rawText ?? '—'}
                </span>
              </div>
              {product.price.baseText ? (
                <div className="mt-2 flex justify-between text-xs text-gray-400">
                  <span>Базовая цена</span>
                  <span>{product.price.baseText}</span>
                </div>
              ) : null}
              {product.price.formulaText ? (
                <p className="mt-3 text-xs text-gray-500">{product.price.formulaText}</p>
              ) : null}
            </div>
          ) : null}

          {product?.seller?.name ? (
            <div className="flex flex-wrap items-center gap-4 rounded-lg border border-surfaceAlt bg-surfaceAlt/70 p-4 text-sm text-gray-200">
              <span className="text-xs uppercase tracking-wide text-gray-500">Продавец</span>
              {product.seller.link ? (
                <a
                  href={product.seller.link}
                  target="_blank"
                  rel="noreferrer"
                  className="text-accentPink transition hover:text-accentBlue"
                >
                  {product.seller.name}
                </a>
              ) : (
                <span>{product.seller.name}</span>
              )}
              {product.seller.rating ? (
                <span className="rounded-full border border-accentPink/60 px-2 py-0.5 text-xs text-accentPink">
                  ★ {product.seller.rating}
                </span>
              ) : null}
            </div>
          ) : null}

          {product?.params?.length ? (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-accentBlue">Опции товара</p>
              <div className="space-y-3">
                {product.params.map((group) => (
                  <div key={group.title} className="rounded-lg border border-surfaceAlt bg-surfaceAlt/60 p-3">
                    <p className="text-xs uppercase tracking-wide text-gray-500">{group.title}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {group.items.map((item) => (
                        <span
                          key={`${group.title}-${item.name}`}
                          className={`rounded-full border px-3 py-1 text-xs ${
                            item.selected
                              ? 'border-accentBlue bg-accentBlue/20 text-white'
                              : 'border-surface text-gray-300'
                          }`}
                        >
                          {item.name}
                          {item.priceText ? <span className="ml-1 text-gray-400">{item.priceText}</span> : null}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {isLoading ? <p className="text-sm text-gray-500">Загрузка карточки товара…</p> : null}
        </div>
      </div>

      {lightbox && mainImage ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6" role="dialog" aria-modal="true">
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute right-6 top-6 rounded-full border border-white/50 p-2 text-white hover:bg-white/20"
          >
            <XMarkIcon className="h-5 w-5" aria-hidden />
          </button>
          <img src={mainImage} alt="Просмотр изображения" className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain" />
        </div>
      ) : null}
    </div>
  );
}
