import axios from 'axios';
import type { Item } from '@prisma/client';
import {
  MOVE_STATUS_LABEL_TO_VALUE,
  MOVE_STATUS_VALUE_TO_LABEL,
  type MoveStatusValue
} from '../constants';
import { formatMoscow, parseDateOrNull } from '../../lib/time';

export type SheetRow = {
  product_url: string;
  assignee_name: string | null;
  move_status: MoveStatusValue | null;
  move_status_set_by: string | null;
  move_status_set_at: Date | null;
  final_breadcrumbs: string | null;
  breadcrumbs_set_by: string | null;
  breadcrumbs_set_at: Date | null;
  priority_raw: string | null;
  completed_by: string | null;
  completed_at: Date | null;
  moved_flag_raw: string | null;
  comment: string | null;
  updated_at: Date;
};

const HEADERS = [
  'product_url',
  'assignee_name',
  'move_status',
  'move_status_set_by',
  'move_status_set_at',
  'final_breadcrumbs',
  'breadcrumbs_set_by',
  'breadcrumbs_set_at',
  'priority_raw',
  'completed_by',
  'completed_at',
  'moved_flag_raw',
  'comment'
];

const GAS_BASE_URL = process.env.GAS_BASE_URL || '';
const SHEET_RANGE = process.env.SHEET_RANGE || 'Лист1!A:M';

function normalizeMoveStatus(value: string | null): MoveStatusValue | null {
  if (!value) return null;
  if (value in MOVE_STATUS_LABEL_TO_VALUE) {
    return MOVE_STATUS_LABEL_TO_VALUE[value];
  }
  if (value in MOVE_STATUS_VALUE_TO_LABEL) {
    return value as MoveStatusValue;
  }
  return null;
}

function ensureDate(date: string | null): Date | null {
  return parseDateOrNull(date ?? undefined);
}

export async function pullSheetRows(): Promise<SheetRow[]> {
  if (!GAS_BASE_URL) return [];
  const response = await axios.get(`${GAS_BASE_URL}`, {
    params: { action: 'pull', range: SHEET_RANGE }
  });
  if (response.data && response.data.ok === false) {
    throw new Error(response.data.error || 'Google Apps Script pull error');
  }
  const rows: string[][] = response.data.rows ?? [];
  return rows.map((row) => {
    const map = HEADERS.reduce<Record<string, string | null>>((acc, key, idx) => {
      acc[key] = row[idx] ?? null;
      return acc;
    }, {});
    const moveStatus = normalizeMoveStatus(map.move_status);
    const moveStatusDate = ensureDate(map.move_status_set_at);
    const breadcrumbsDate = ensureDate(map.breadcrumbs_set_at);
    const completedDate = ensureDate(map.completed_at);
    const updated_at = [moveStatusDate, breadcrumbsDate, completedDate]
      .filter((d): d is Date => !!d)
      .sort((a, b) => b.getTime() - a.getTime())[0] ?? new Date();
    return {
      product_url: map.product_url || '',
      assignee_name: map.assignee_name,
      move_status: moveStatus,
      move_status_set_by: map.move_status_set_by,
      move_status_set_at: moveStatusDate,
      final_breadcrumbs: map.final_breadcrumbs,
      breadcrumbs_set_by: map.breadcrumbs_set_by,
      breadcrumbs_set_at: breadcrumbsDate,
      priority_raw: map.priority_raw,
      completed_by: map.completed_by,
      completed_at: completedDate,
      moved_flag_raw: map.moved_flag_raw,
      comment: map.comment,
      updated_at
    };
  });
}

export function itemToSheetRow(item: Item): string[] {
  const moveStatus = (item.moveStatus ?? null) as MoveStatusValue | null;
  return [
    item.productUrl,
    item.assigneeName ?? '',
    moveStatus ? MOVE_STATUS_VALUE_TO_LABEL[moveStatus] : '',
    item.moveStatusSetBy ?? '',
    item.moveStatusSetAt ? formatMoscow(item.moveStatusSetAt) : '',
    item.finalBreadcrumbs ?? '',
    item.breadcrumbsSetBy ?? '',
    item.breadcrumbsSetAt ? formatMoscow(item.breadcrumbsSetAt) : '',
    item.priorityRaw ?? '',
    item.completedBy ?? '',
    item.completedAt ? formatMoscow(item.completedAt) : '',
    item.movedFlagRaw ?? '',
    item.comment ?? ''
  ];
}

export async function pushSheetRows(rows: string[][]) {
  if (!GAS_BASE_URL) return;
  const response = await axios.post(`${GAS_BASE_URL}`, {
    action: 'push',
    range: SHEET_RANGE,
    rows
  });
  if (response.data && response.data.ok === false) {
    throw new Error(response.data.error || 'Google Apps Script push error');
  }
}
