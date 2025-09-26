from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

import requests
from bs4 import BeautifulSoup
from django.core.cache import cache


GGSEL_PRODUCT_PATTERN = re.compile(r"^https://ggsel\.net/catalog/product/\d+")
CACHE_TTL = 60 * 15
USER_AGENT = "Mozilla/5.0 (compatible; GGSELBot/1.0)"


@dataclass
class ProductData:
    title: str
    description_text: str
    description_html: str
    price: float | None
    images: list[str]
    seller: dict[str, Any]
    breadcrumbs: list[str]

    def to_dict(self) -> dict[str, Any]:
        return {
            "title": self.title,
            "description": self.description_text,
            "description_html": self.description_html,
            "price": self.price,
            "images": self.images,
            "seller": self.seller,
            "breadcrumbs": self.breadcrumbs,
        }


class GGSELScraper:
    def __init__(self, http_client=requests):
        self.http_client = http_client

    def fetch(self, url: str) -> dict[str, Any]:
        if not GGSEL_PRODUCT_PATTERN.match(url):
            raise ValueError("Invalid GGSEL product URL")
        cache_key = f"ggsel:product:{url}"
        cached = cache.get(cache_key)
        if cached:
            return cached
        response = self.http_client.get(
            url,
            headers={"User-Agent": USER_AGENT},
            timeout=10,
        )
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")
        description_text, description_html = self._extract_description(soup)
        product = ProductData(
            title=self._extract_title(soup),
            description_text=description_text,
            description_html=description_html,
            price=self._extract_price(soup),
            images=self._extract_images(soup),
            seller=self._extract_seller(soup),
            breadcrumbs=self._extract_breadcrumbs(soup),
        )
        payload = product.to_dict()
        cache.set(cache_key, payload, CACHE_TTL)
        return payload

    def _extract_title(self, soup: BeautifulSoup) -> str:
        node = soup.select_one("h1") or soup.select_one(".product-title")
        return node.get_text(strip=True) if node else ""

    def _extract_description(self, soup: BeautifulSoup) -> tuple[str, str]:
        node = soup.select_one(".product-description") or soup.select_one("#description")
        if not node:
            return "", ""
        text = node.get_text("\n", strip=True)
        html = str(node)
        return text, html

    def _extract_price(self, soup: BeautifulSoup) -> float | None:
        node = soup.select_one(".price") or soup.select_one("[data-price]")
        if not node:
            return None
        raw = node.get_text(strip=True)
        match = re.search(r"([\d\s.,]+)", raw)
        if not match:
            return None
        cleaned = match.group(1).replace(" ", "").replace(",", ".")
        try:
            return float(cleaned)
        except ValueError:
            return None

    def _extract_images(self, soup: BeautifulSoup) -> list[str]:
        images = []
        for img in soup.select("img"):
            src = img.get("src")
            if src and src.startswith("http"):
                images.append(src)
        return list(dict.fromkeys(images))

    def _extract_seller(self, soup: BeautifulSoup) -> dict[str, Any]:
        seller_block = soup.select_one(".seller") or soup.select_one(".seller-info")
        if not seller_block:
            return {}
        name = seller_block.get_text(strip=True)
        link = seller_block.get("href") if seller_block.name == "a" else None
        rating_node = seller_block.select_one(".rating") if hasattr(seller_block, "select_one") else None
        rating = rating_node.get_text(strip=True) if rating_node else None
        return {"name": name, "link": link, "rating": rating}

    def _extract_breadcrumbs(self, soup: BeautifulSoup) -> list[str]:
        crumbs = []
        for crumb in soup.select(".breadcrumb li"):
            text = crumb.get_text(strip=True)
            if text:
                crumbs.append(text)
        return crumbs
