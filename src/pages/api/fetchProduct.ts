import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { requireAuth } from '../../lib/auth';

const cache = new Map<string, { expiresAt: number; payload: any }>();
const CACHE_TTL_MS = 15 * 60 * 1000;

function isValidProductUrl(url: string) {
  return /^https:\/\/ggsel\.net\/catalog\/product\//.test(url);
}

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

type ProductPrice = {
  rawText: string | null;
  finalText: string | null;
  baseText: string | null;
  currency: string | null;
  amount: number | null;
  baseAmount: number | null;
  modifiers: {
    name: string;
    delta: number | null;
    currency: string | null;
    priceText: string | null;
    formattedDelta: string | null;
  }[];
  formulaText: string | null;
};

type ProductPayload = {
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
};

function detectCurrency(text: string) {
  const normalized = text.toUpperCase();
  if (normalized.includes('₽') || normalized.includes('RUB')) return 'RUB';
  if (normalized.includes('$') || normalized.includes('USD')) return 'USD';
  if (normalized.includes('€') || normalized.includes('EUR')) return 'EUR';
  if (normalized.includes('₺') || normalized.includes('TRY')) return 'TRY';
  if (normalized.includes('₸') || normalized.includes('KZT')) return 'KZT';
  return 'RUB';
}

function parseAmount(text: string | null | undefined) {
  if (!text) return { amount: null, currency: null };
  const currency = detectCurrency(text);
  const match = text.replace(/\s+/g, '').replace(',', '.').match(/-?\d+(?:\.\d+)?/);
  if (!match) {
    return { amount: null, currency };
  }
  const amount = Number.parseFloat(match[0]);
  return { amount: Number.isNaN(amount) ? null : amount, currency };
}

function parseDelta(text: string | null | undefined) {
  if (!text) return { delta: null, currency: null };
  const currency = detectCurrency(text);
  const match = text.replace(',', '.').match(/([+-])\s*([\d\s.]+)/);
  if (!match) return { delta: null, currency };
  const value = Number.parseFloat(match[2].replace(/\s+/g, ''));
  if (Number.isNaN(value)) return { delta: null, currency };
  const sign = match[1] === '-' ? -1 : 1;
  return { delta: value * sign, currency };
}

function formatMoney(amount: number, currency: string | null) {
  if (!Number.isFinite(amount)) return null;
  const iso = currency || 'RUB';
  const locale = iso === 'RUB' ? 'ru-RU' : 'en-US';
  const formatted = amount.toLocaleString(locale, {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2
  });
  return `${formatted} ${iso}`;
}

function sanitizeSectionHtml(section: cheerio.Cheerio) {
  const clone = section.clone();
  clone.find('script, style, iframe, noscript').remove();
  return clone.html()?.trim() ?? '';
}

function htmlToPlainText(html: string) {
  if (!html) return '';
  const $ = cheerio.load(`<div>${html}</div>`);
  return $('div')
    .text()
    .replace(/\s+/g, ' ')
    .trim();
}

function makeAbsolute(base: string, link: string | null | undefined) {
  if (!link) return null;
  if (/^https?:\/\//i.test(link)) return link;
  try {
    const url = new URL(link, base);
    return url.toString();
  } catch (error) {
    return link;
  }
}

function extractOptionGroups($: cheerio.CheerioAPI): ProductOptionGroup[] {
  const groups: ProductOptionGroup[] = [];

  $('.CustomRadioGroup_formGroupItems__4IEc3, .CustomRadioGroup_formGroupItems__')
    .toArray()
    .forEach((element) => {
      const container = $(element);
      const title =
        container
          .parent()
          .find('.CustomFieldLabel_title__FL3hn, [data-test="optionGroupTitle"]')
          .first()
          .text()
          .trim() || 'Варианты';
      const items = container
        .find('[data-test="options"], label')
        .toArray()
        .map((node) => {
          const label = $(node);
          const name =
            label.find('[data-test="optionName"]').first().text().trim() ||
            label.text().trim();
          const priceText = label.find('[data-test="optionPrice"]').first().text().trim() || null;
          const { delta, currency } = parseDelta(priceText);
          const selected =
            label.find('input[checked]').length > 0 ||
            label.find('.Mui-checked, [aria-checked="true"]').length > 0;
          return { name, priceText, delta, currency, selected };
        })
        .filter((item) => item.name);
      if (items.length > 0) {
        groups.push({ title, kind: 'radio', items });
      }
    });

  $('.ProductForm_formGroupCheckboxItemsProduct__kTOle, .ProductForm_formGroupCheckboxItemsProduct__')
    .toArray()
    .forEach((element) => {
      const container = $(element);
      const title =
        container
          .find('.CustomFieldLabel_title__FL3hn, [data-test="optionGroupTitle"]')
          .first()
          .text()
          .trim() || 'Дополнительно';
      const items = container
        .find('.CustomCheckboxGroup_formGroupCheckbox__h1IFx label, [data-test="options"], label')
        .toArray()
        .map((node) => {
          const label = $(node);
          const name =
            label.find('[data-test="optionName"]').first().text().trim() ||
            label.text().trim();
          const priceText = label.find('[data-test="optionPrice"]').first().text().trim() || null;
          const { delta, currency } = parseDelta(priceText);
          const selected =
            label.find('input[checked]').length > 0 ||
            label.find('.Mui-checked, [aria-checked="true"]').length > 0;
          return { name, priceText, delta, currency, selected };
        })
        .filter((item) => item.name);
      if (items.length > 0) {
        groups.push({ title, kind: 'checkbox', items });
      }
    });

  return groups;
}

async function scrapeProduct(url: string): Promise<ProductPayload> {
  const response = await axios.get(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36'
    }
  });
  const $ = cheerio.load(response.data);

  const title = $('h1[data-test="productTitle"], h1').first().text().trim();
  const breadcrumbs = $('nav.MuiBreadcrumbs-root ol li, nav[aria-label="breadcrumb"] li')
    .toArray()
    .map((node) => $(node).text().trim())
    .filter(Boolean);

  const imagesSet = new Set<string>();
  $('meta[property="og:image"]').each((_, node) => {
    const content = $(node).attr('content');
    if (content) imagesSet.add(makeAbsolute(url, content) ?? content);
  });
  $('.ProductHeader_offerImgHeader__rZJ7H img, [data-test="productImage"], img[data-testid="productImage"], .swiper img')
    .toArray()
    .forEach((node) => {
      const src = $(node).attr('src') || $(node).attr('data-src');
      if (src) {
        imagesSet.add(makeAbsolute(url, src) ?? src);
      }
    });
  const images = Array.from(imagesSet);
  const mainImage = images.length > 0 ? images[0] : null;

  let priceText =
    $('[data-test="productPrice"], .ProductPrice_price__PpQeZ, [data-testid="productPrice"], .price')
      .first()
      .text()
      .trim() || null;
  if (!priceText) {
    const jsonLd = $('script[type="application/ld+json"]').toArray();
    for (const node of jsonLd) {
      try {
        const parsed = JSON.parse($(node).text());
        if (parsed?.['@type'] === 'Product' && parsed.offers?.price) {
          priceText = `${parsed.offers.price} ${parsed.offers.priceCurrency || ''}`.trim();
          break;
        }
      } catch (error) {
        // ignore json errors
      }
    }
  }

  const { amount: currentAmount, currency } = parseAmount(priceText);
  const params = extractOptionGroups($);
  const selectedModifiers = params.flatMap((group) => group.items.filter((item) => item.selected));
  const modifiersDelta = selectedModifiers.reduce((sum, item) => sum + (item.delta ?? 0), 0);
  const baseAmount = currentAmount == null || Number.isNaN(modifiersDelta) ? null : currentAmount - modifiersDelta;
  const price: ProductPrice | null = priceText
    ? {
        rawText: priceText,
        finalText: currentAmount != null ? formatMoney(currentAmount, currency) : priceText,
        baseText: baseAmount != null ? formatMoney(baseAmount, currency) : null,
        currency,
        amount: currentAmount,
        baseAmount,
        modifiers: selectedModifiers.map((item) => {
          const modifierCurrency = item.currency || currency;
          const formattedDeltaValue =
            item.delta != null && modifierCurrency
              ? formatMoney(Math.abs(item.delta), modifierCurrency)
              : null;
          const deltaLabel =
            item.delta != null
              ? `${item.delta >= 0 ? '+' : '-'}${formattedDeltaValue ?? Math.abs(item.delta).toString()}`
              : null;
          return {
            name: item.name,
            delta: item.delta,
            currency: modifierCurrency,
            priceText: item.priceText,
            formattedDelta: deltaLabel
          };
        }),
        formulaText:
          selectedModifiers.length > 0
            ? `База: ${
                baseAmount != null ? formatMoney(baseAmount, currency) ?? baseAmount.toString() : '—'
              } · ${selectedModifiers
                .map((item) => {
                  if (item.delta == null) return item.name;
                  const formatted = formatMoney(Math.abs(item.delta), item.currency || currency);
                  const deltaText = formatted ?? Math.abs(item.delta).toString();
                  return `${item.name} ${item.delta >= 0 ? '+' : '-'}${deltaText}`;
                })
                .join(' · ')}`
            : baseAmount != null
            ? `База: ${formatMoney(baseAmount, currency) ?? baseAmount.toString()}`
            : null
      }
    : null;

  const sellerNode = $('.ProductSidebar_item___7XVu, [data-test="seller"], [data-testid="sellerCard"]').first();
  const sellerName = sellerNode.find('[data-test="sellerName"], [data-testid="sellerName"], a').first().text().trim() || null;
  const sellerLink = makeAbsolute(url, sellerNode.find('[data-test="sellerName"], a').first().attr('href'));
  const sellerRating =
    sellerNode.find('[data-test="sellerRating"], .ProductSidebar_sellerRatingBottom__oKTNb').first().text().trim() || null;

  const descriptionSections = $('.InfoBlock_aboutGameDesc___L_qR, [data-test="productDescription"]');
  const descriptionHtml = descriptionSections.length > 0 ? sanitizeSectionHtml(descriptionSections.eq(0)) : '';
  const extraDescriptionHtml = descriptionSections.length > 1 ? sanitizeSectionHtml(descriptionSections.eq(1)) : '';
  const descriptionText = htmlToPlainText(descriptionHtml);

  return {
    url,
    title,
    breadcrumbs,
    mainImage,
    images,
    price,
    seller: {
      name: sellerName,
      link: sellerLink,
      rating: sellerRating
    },
    descriptionHtml,
    descriptionText,
    extraDescriptionHtml,
    params
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireAuth(req, res);
  if (!user) return;

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const url = req.query.url as string;
  if (!url || !isValidProductUrl(url)) {
    res.status(400).json({ error: 'Некорректный URL товара GGSEL' });
    return;
  }

  const cached = cache.get(url);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    res.status(200).json({ product: cached.payload, cached: true });
    return;
  }

  try {
    const data = await scrapeProduct(url);
    cache.set(url, { payload: data, expiresAt: now + CACHE_TTL_MS });
    res.status(200).json({ product: data, cached: false });
  } catch (error: any) {
    res.status(200).json({
      product: null,
      error: 'Не удалось получить данные товара',
      details: error?.message
    });
  }
}
