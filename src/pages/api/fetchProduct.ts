import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { requireAuth } from '../../lib/auth';

const cache = new Map<string, { expiresAt: number; payload: any }>();
const CACHE_TTL_MS = 15 * 60 * 1000;

function isValidProductUrl(url: string) {
  return /^https:\/\/ggsel\.net\/catalog\/product\//.test(url);
}

async function scrapeProduct(url: string) {
  const response = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const $ = cheerio.load(response.data);
  const title = $('h1').first().text().trim();
  const description = $('.product-description, .product__description, .description').text().trim();
  const price = $('[data-price], .product-price, .price').first().text().trim();
  const images =
    $('.swiper img, .product-gallery img')
      .map((_, el) => $(el).attr('src'))
      .get()
      .filter(Boolean);
  const breadcrumbs =
    $('.breadcrumb a, .breadcrumbs a')
      .map((_, el) => $(el).text().trim())
      .get()
      .filter(Boolean);
  const sellerName = $('.seller-name, .product__seller-name a').first().text().trim();
  const sellerLink = $('.seller-name a, .product__seller-name a').first().attr('href') || null;
  const sellerRating = $('.seller-rating, .rating').first().text().trim();

  return {
    title,
    description,
    price,
    images,
    breadcrumbs,
    seller: {
      name: sellerName,
      link: sellerLink,
      rating: sellerRating
    }
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
