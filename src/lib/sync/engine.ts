import { prisma } from '../repositories/prisma';
import {
  getOrCreateSyncSettings,
  updateSyncSettings
} from '../repositories/syncSettingsRepository';
import { itemToSheetRow, pullSheetRows, pushSheetRows } from '../repositories/sheetsRepository';
import { nowInMoscow } from '../time';

export async function runSync() {
  const settings = await getOrCreateSyncSettings();
  const startedAt = nowInMoscow();

  const rows = await pullSheetRows();
  for (const row of rows) {
    if (!row.product_url) continue;
    const existing = await prisma.item.findUnique({ where: { productUrl: row.product_url } });
    if (!existing) {
      await prisma.item.create({
        data: {
          productUrl: row.product_url,
          assigneeName: row.assignee_name ?? undefined,
          moveStatus: row.move_status ?? undefined,
          moveStatusSetBy: row.move_status_set_by ?? undefined,
          moveStatusSetAt: row.move_status_set_at ?? undefined,
          finalBreadcrumbs: row.final_breadcrumbs ?? undefined,
          breadcrumbsSetBy: row.breadcrumbs_set_by ?? undefined,
          breadcrumbsSetAt: row.breadcrumbs_set_at ?? undefined,
          priorityRaw: row.priority_raw ?? '',
          completedBy: row.completed_by ?? undefined,
          completedAt: row.completed_at ?? undefined,
          movedFlagRaw: row.moved_flag_raw ?? undefined,
          comment: row.comment ?? undefined,
          isCompleted: !!row.completed_at,
          updatedAt: row.updated_at
        }
      });
    } else if (row.updated_at > existing.updatedAt) {
      await prisma.item.update({
        where: { productUrl: row.product_url },
        data: {
          assigneeName: row.assignee_name ?? undefined,
          moveStatus: row.move_status ?? undefined,
          moveStatusSetBy: row.move_status_set_by ?? undefined,
          moveStatusSetAt: row.move_status_set_at ?? undefined,
          finalBreadcrumbs: row.final_breadcrumbs ?? undefined,
          breadcrumbsSetBy: row.breadcrumbs_set_by ?? undefined,
          breadcrumbsSetAt: row.breadcrumbs_set_at ?? undefined,
          priorityRaw: row.priority_raw ?? '',
          completedBy: row.completed_by ?? undefined,
          completedAt: row.completed_at ?? undefined,
          movedFlagRaw: row.moved_flag_raw ?? undefined,
          comment: row.comment ?? undefined,
          updatedAt: row.updated_at,
          isCompleted: !!row.completed_at
        }
      });
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
