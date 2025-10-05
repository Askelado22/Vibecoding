#!/usr/bin/env python3
"""CLI tool to convert XML items into an XLSX file with breadcrumbs."""

from __future__ import annotations

import argparse
import logging
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Sequence, Tuple
import xml.etree.ElementTree as ET


@dataclass
class Item:
    """Represents a node parsed from the XML source."""

    item_id: int
    parent_id: Optional[int]
    digi_id: Optional[int]
    name: str
    child_digi_ids: Tuple[int, ...]
    position: int


def strip_tag(tag: str) -> str:
    """Return the tag name without namespace."""

    if "}" in tag:
        return tag.rsplit("}", 1)[1]
    return tag


def parse_int(text: Optional[str]) -> Optional[int]:
    """Parse an integer value from text, handling blanks and nulls."""

    if text is None:
        return None
    text = text.strip()
    if not text or text.lower() in {"null", "none"}:
        return None
    try:
        return int(text)
    except ValueError:
        logging.warning("Cannot parse integer from value %r", text)
    return None


def parse_child_ids(text: Optional[str]) -> Tuple[int, ...]:
    """Parse ``child_ids`` values into a tuple of integers."""

    if not text:
        return ()

    text = text.strip()
    if not text or text.lower() in {"null", "none", "[null]"}:
        return ()

    if text.startswith("[") and text.endswith("]"):
        text = text[1:-1]

    if not text:
        return ()

    values: List[int] = []
    for part in text.split(","):
        value = parse_int(part.strip())
        if value is not None:
            values.append(value)
    return tuple(values)


def find_child_text(elem: ET.Element, tag: str) -> Optional[str]:
    """Return the text of the first direct child matching ``tag`` ignoring namespaces."""

    for child in elem:
        if strip_tag(child.tag) == tag:
            return child.text
    return None


def parse_items(
    xml_path: Path,
) -> Tuple[Dict[int, Item], Dict[int, List[Item]], List[int]]:
    """Stream-parse items from an XML file.

    Returns mappings ``id -> Item`` and ``digi_id -> Item`` along with the
    ordered list of ``id`` values preserving the XML sequence.
    """

    items_by_id: Dict[int, Item] = {}
    items_by_digi: Dict[int, List[Item]] = {}
    order: List[int] = []

    root: Optional[ET.Element] = None

    try:
        context = ET.iterparse(str(xml_path), events=("start", "end"))
        for event, elem in context:
            if root is None and event == "start":
                root = elem
                continue

            if event != "end" or strip_tag(elem.tag) != "item":
                continue

            item_id = parse_int(find_child_text(elem, "id"))
            if item_id is None:
                logging.debug("Skipping <item> without valid <id>")
                elem.clear()
                continue

            parent_id = parse_int(find_child_text(elem, "parent_id"))
            if parent_id == 0:
                parent_id = None
            name = (find_child_text(elem, "name") or "").strip()
            if not name:
                name = (find_child_text(elem, "title") or "").strip()
            digi_id = parse_int(find_child_text(elem, "digi_catalog"))

            if item_id in items_by_id:
                logging.warning(
                    "Duplicate <item> id %d encountered; overriding previous entry",
                    item_id,
                )
            else:
                order.append(item_id)

            child_digi_ids = parse_child_ids(find_child_text(elem, "child_ids"))

            item = Item(
                item_id=item_id,
                parent_id=parent_id,
                digi_id=digi_id,
                name=name,
                child_digi_ids=child_digi_ids,
                position=len(order) - 1,
            )

            items_by_id[item_id] = item

            if digi_id is not None:
                bucket = items_by_digi.setdefault(digi_id, [])
                bucket.append(item)

            elem.clear()
            if root is not None:
                root.clear()
    except ET.ParseError as exc:  # pragma: no cover - propagates to CLI
        raise RuntimeError(f"Failed to parse XML file {xml_path!s}: {exc}") from exc
    finally:
        try:
            del context
        except UnboundLocalError:
            pass

    return items_by_id, items_by_digi, order


def select_parent_candidate(child: Item, candidates: Sequence[Item]) -> Optional[Item]:
    """Choose the most plausible parent from ``candidates`` for ``child``."""

    pool_candidates = [c for c in candidates if c.item_id != child.item_id]

    if not pool_candidates:
        return None

    filtered: List[Item] = []
    if child.digi_id is not None:
        filtered = [c for c in pool_candidates if child.digi_id in c.child_digi_ids]

    if len(filtered) == 1:
        candidate = filtered[0]
    else:
        pool = filtered or pool_candidates
        candidate = min(pool, key=lambda item: item.position)

    return candidate


class BreadcrumbCycleError(RuntimeError):
    """Raised when a cycle is detected while resolving breadcrumbs."""


def build_breadcrumbs(
    items_by_id: Dict[int, Item],
    items_by_digi: Dict[int, List[Item]],
    order: Sequence[int],
    separator: str,
    empty_name_placeholder: str,
) -> Iterable[Tuple[str, Optional[int], int]]:
    """Construct breadcrumbs for all items in order."""

    cache: Dict[int, Tuple[str, ...]] = {}

    def resolve(item_id: int, stack: Optional[List[int]] = None) -> Tuple[str, ...]:
        if item_id in cache:
            return cache[item_id]

        if stack is None:
            stack = []
        if item_id in stack:
            cycle = " -> ".join(map(str, stack + [item_id]))
            raise BreadcrumbCycleError(cycle)

        stack.append(item_id)
        item = items_by_id[item_id]
        segments: List[str] = []

        parent_id = item.parent_id
        parent_item: Optional[Item] = None
        if parent_id is not None and parent_id != item_id:
            parent_item = items_by_id.get(parent_id)
            if parent_item is None:
                candidates = items_by_digi.get(parent_id, [])
                if candidates:
                    parent_item = select_parent_candidate(item, candidates)

        if parent_item is not None:
            parent_segments = resolve(parent_item.item_id, stack)
            segments.extend(parent_segments)

        if item.name:
            name = item.name
        else:
            try:
                name = empty_name_placeholder.format(id=item.item_id)
            except KeyError as exc:
                raise RuntimeError(
                    "Invalid --empty-name-placeholder: missing key "
                    f"'{exc.args[0]}'"
                ) from exc
        if name:
            segments.append(name)

        result = tuple(segments)
        cache[item_id] = result
        stack.pop()
        return result

    for item_id in order:
        if item_id not in items_by_id:
            continue
        try:
            breadcrumb_segments = resolve(item_id, [])
        except BreadcrumbCycleError as exc:
            logging.error(
                "Skipping item %d because a parent cycle was detected: %s",
                item_id,
                exc,
            )
            continue
        breadcrumb_text = separator.join(breadcrumb_segments)
        item = items_by_id[item_id]
        if item.digi_id is None:
            logging.debug("Skipping item %d because digi_id is missing", item_id)
            continue
        yield breadcrumb_text, item.digi_id, item.item_id


def write_xlsx(
    rows: Iterable[Tuple[str, Optional[int], int]],
    output_path: Path,
) -> int:
    """Write rows into an XLSX file.

    Returns the number of data rows written (excluding the header).
    """

    try:
        from openpyxl import Workbook  # type: ignore
    except ImportError as exc:  # pragma: no cover - dependency missing at runtime
        raise RuntimeError(
            "The 'openpyxl' package is required to export XLSX files. "
            "Install it with 'pip install openpyxl'."
        ) from exc

    workbook = Workbook(write_only=True)
    sheet = workbook.create_sheet()
    sheet.title = "breadcrumbs"
    sheet.append(["breadcrumbs", "digi_id", "id"])

    count = 0
    for breadcrumb, digi_id, item_id in rows:
        sheet.append([breadcrumb, digi_id, item_id])
        count += 1

    try:
        workbook.save(output_path)
    except PermissionError as exc:
        raise RuntimeError(
            "Failed to write XLSX file. Close any application using "
            f"{output_path!s} and try again."
        ) from exc
    finally:
        try:
            workbook.close()
        except Exception:  # pragma: no cover - close may fail silently depending on openpyxl
            pass

    return count


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Convert XML catalog breadcrumbs into an XLSX file.",
    )
    parser.add_argument("xml", type=Path, help="Path to the source XML file")
    parser.add_argument(
        "xlsx",
        type=Path,
        help="Destination path for the generated XLSX file",
    )
    parser.add_argument(
        "--separator",
        default=" > ",
        help="Separator string used between breadcrumb segments (default: ' > ')",
    )
    parser.add_argument(
        "--empty-name-placeholder",
        default="[id {id}]",
        help=(
            "Placeholder used when <name> is empty. Can reference {id} for the item id"
        ),
    )
    parser.add_argument(
        "--log-level",
        default="INFO",
        choices=["CRITICAL", "ERROR", "WARNING", "INFO", "DEBUG"],
        help="Logging level (default: INFO)",
    )
    return parser


def configure_logging(level: str) -> None:
    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        format="%(levelname)s: %(message)s",
    )


def main(argv: Optional[Sequence[str]] = None) -> int:
    parser = build_arg_parser()
    args = parser.parse_args(argv)

    configure_logging(args.log_level)

    logging.info("Parsing XML from %s", args.xml)
    items_by_id, items_by_digi, order = parse_items(args.xml)
    logging.info("Parsed %d items", len(items_by_id))

    logging.info("Building breadcrumbs and writing XLSX to %s", args.xlsx)
    row_count = write_xlsx(
        build_breadcrumbs(
            items_by_id=items_by_id,
            items_by_digi=items_by_digi,
            order=order,
            separator=args.separator,
            empty_name_placeholder=args.empty_name_placeholder,
        ),
        args.xlsx,
    )
    logging.info("Wrote %d rows (excluding header)", row_count)
    logging.info("Done")
    return 0


if __name__ == "__main__":
    sys.exit(main())
