import type { Prisma } from '@prisma/client';
import { prisma } from '../repositories/prisma';
import {
  getOrCreateSyncSettings,
  updateSyncSettings
} from '../repositories/syncSettingsRepository';
import {
  itemToSheetRow,
  pullSheetRows,
  pushSheetRows,
  type SheetRow
} from '../repositories/sheetsRepository';
import { nowInMoscow } from '../time';

function mapSheetRowToUpdate(row: SheetRow): Prisma.ItemUpdateInput {
  return {
    assigneeName: row.assignee_name ?? null,
    moveStatus: row.move_status ?? null,
    moveStatusSetBy: row.move_status_set_by ?? null,
    moveStatusSetAt: row.move_status_set_at ?? null,
    finalBreadcrumbs: row.final_breadcrumbs ?? null,
    breadcrumbsSetBy: row.breadcrumbs_set_by ?? null,
    breadcrumbsSetAt: row.breadcrumbs_set_at ?? null,
    priorityRaw: row.priority_raw ?? '',
    completedBy: row.completed_by ?? null,
    completedAt: row.completed_at ?? null,
    movedFlagRaw: row.moved_flag_raw ?? null,
    comment: row.comment ?? null,
    isCompleted: !!row.completed_at,
    updatedAt: row.updated_at,
    rowIndex: row.row_index
  };
}

function mapSheetRowToCreate(row: SheetRow): Prisma.ItemCreateManyInput {
  return {
    productUrl: row.product_url,
    assigneeName: row.assignee_name ?? null,
    moveStatus: row.move_status ?? null,
    moveStatusSetBy: row.move_status_set_by ?? null,
    moveStatusSetAt: row.move_status_set_at ?? null,
    finalBreadcrumbs: row.final_breadcrumbs ?? null,
    breadcrumbsSetBy: row.breadcrumbs_set_by ?? null,
    breadcrumbsSetAt: row.breadcrumbs_set_at ?? null,
    priorityRaw: row.priority_raw ?? '',
    completedBy: row.completed_by ?? null,
    completedAt: row.completed_at ?? null,
    movedFlagRaw: row.moved_flag_raw ?? null,
    comment: row.comment ?? null,
    isCompleted: !!row.completed_at,
    createdAt: row.updated_at,
    updatedAt: row.updated_at,
    rowIndex: row.row_index
  };
}

export async function runSync() {
  const settings = await getOrCreateSyncSettings();
  const startedAt = nowInMoscow();

  const rows = await pullSheetRows();
  const productUrls = rows.map((row) => row.product_url).filter((url) => !!url);

  if (productUrls.length > 0) {
    const existingItems = await prisma.item.findMany({
      where: { productUrl: { in: productUrls } },
      select: { productUrl: true, updatedAt: true, rowIndex: true }
    });
    const existingMap = new Map(existingItems.map((item) => [item.productUrl, item]));

    const creates: Prisma.ItemCreateManyInput[] = [];
    const updates: Array<{ productUrl: string; data: Prisma.ItemUpdateInput }> = [];
    const rowIndexUpdates: Array<{ productUrl: string; rowIndex: number }> = [];

    for (const row of rows) {
      if (!row.product_url) continue;
      const existing = existingMap.get(row.product_url);
      if (!existing) {
        creates.push(mapSheetRowToCreate(row));
        continue;
      }

      if (row.updated_at > existing.updatedAt) {
        updates.push({
          productUrl: row.product_url,
          data: mapSheetRowToUpdate(row)
        });
      } else if (existing.rowIndex !== row.row_index) {
        rowIndexUpdates.push({ productUrl: row.product_url, rowIndex: row.row_index });
      }
    }

    if (creates.length > 0) {
      await prisma.item.createMany({ data: creates, skipDuplicates: true });
    }

    const batchedOperations = [
      ...updates.map((update) =>
        prisma.item.update({ where: { productUrl: update.productUrl }, data: update.data })
      ),
      ...rowIndexUpdates.map((entry) =>
        prisma.item.update({ where: { productUrl: entry.productUrl }, data: { rowIndex: entry.rowIndex } })
      )
    ];

    if (batchedOperations.length > 0) {
      await prisma.$transaction(batchedOperations);
    }
  }

  const pushFilter = settings.lastPushCursor
    ? { updatedAt: { gt: settings.lastPushCursor } }
    : {};
  const itemsToPush = await prisma.item.findMany({ where: pushFilter });
  if (itemsToPush.length > 0) {
    const rowsToPush = itemsToPush.map((item) => itemToSheetRow(item));
    await pushSheetRows(rowsToPush);
  }

  const lastPushCursor = itemsToPush.length
    ? itemsToPush.reduce((max, item) =>
        item.updatedAt > max ? item.updatedAt : max,
      settings.lastPushCursor ?? new Date(0)
      )
    : settings.lastPushCursor;

  await updateSyncSettings({
    lastSyncAt: startedAt,
    lastPullCursor: startedAt,
    lastPushCursor
  });
}
