export const MOVE_STATUS_VALUES = [
  'YES',
  'NO',
  'HIEROGLYPHS',
  'OUT_OF_STOCK',
  'ALREADY_MOVED',
  'NOT_NEEDED'
] as const;

export type MoveStatusValue = (typeof MOVE_STATUS_VALUES)[number];

export const MOVE_STATUS_VALUE_TO_LABEL: Record<MoveStatusValue, string> = {
  YES: 'Да',
  NO: 'Нет',
  HIEROGLYPHS: 'Иероглифы',
  OUT_OF_STOCK: 'Нет в наличии',
  ALREADY_MOVED: 'Уже перенесен',
  NOT_NEEDED: 'Перенос не нужен'
};

export const MOVE_STATUS_OPTIONS = MOVE_STATUS_VALUES.map((value) => ({
  value,
  label: MOVE_STATUS_VALUE_TO_LABEL[value]
})) as ReadonlyArray<{ value: MoveStatusValue; label: string }>;

export const MOVE_STATUS_LABEL_TO_VALUE = Object.fromEntries(
  MOVE_STATUS_VALUES.map((value) => [MOVE_STATUS_VALUE_TO_LABEL[value], value])
) as Record<string, MoveStatusValue>;

export function getMoveStatusLabel(value: MoveStatusValue | null | undefined) {
  if (!value) return null;
  return MOVE_STATUS_VALUE_TO_LABEL[value];
}

export const USER_ROLES = ['admin', 'worker'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && USER_ROLES.includes(value as UserRole);
}
