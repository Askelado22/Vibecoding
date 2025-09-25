import type { MoveStatus } from '@prisma/client';

export const MOVE_STATUS_VALUE_TO_LABEL = {
  YES: 'Да',
  NO: 'Нет',
  HIEROGLYPHS: 'Иероглифы',
  OUT_OF_STOCK: 'Нет в наличии',
  ALREADY_MOVED: 'Уже перенесен',
  NOT_NEEDED: 'Перенос не нужен'
} as const satisfies Record<MoveStatus, string>;

export const MOVE_STATUS_VALUES = Object.keys(
  MOVE_STATUS_VALUE_TO_LABEL
) as MoveStatus[];

export const MOVE_STATUS_OPTIONS = MOVE_STATUS_VALUES.map((value) => ({
  value,
  label: MOVE_STATUS_VALUE_TO_LABEL[value]
})) as const;

export const MOVE_STATUS_LABEL_TO_VALUE = Object.fromEntries(
  MOVE_STATUS_VALUES.map((value) => [MOVE_STATUS_VALUE_TO_LABEL[value], value])
) as Record<string, MoveStatus>;

export function getMoveStatusLabel(value: MoveStatus | null | undefined) {
  if (!value) return null;
  return MOVE_STATUS_VALUE_TO_LABEL[value];
}
