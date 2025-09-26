export type SegmentType = 'root' | 'product' | 'kind' | 'platform' | 'edition' | 'custom';

export type PathSegment = {
  type: SegmentType;
  value: string;
};

export type SegmentDefinition = {
  type: SegmentType;
  label: string;
  placeholder: string;
  helper?: string;
  suggestions?: string[];
};

export const SEGMENT_DEFINITIONS: SegmentDefinition[] = [
  {
    type: 'root',
    label: 'Корень',
    placeholder: 'Например: Игры',
    suggestions: ['Игры', 'Сервисы и соцсети', 'Программное обеспечение']
  },
  {
    type: 'product',
    label: 'Игра / товар',
    placeholder: 'Например: EA SPORTS FC 26 (FIFA 26)'
  },
  {
    type: 'kind',
    label: 'Тип товара',
    placeholder: 'Например: Ключи',
    suggestions: [
      'Аккаунты',
      'Ключи',
      'Покупка на ваш аккаунт',
      'Аренда аккаунтов',
      'Оффлайн аккаунты',
      'Услуги активации',
      'DLC',
      'Скины',
      'Предметы',
      'Валюта',
      'Боевой пропуск',
      'Наборы'
    ]
  },
  {
    type: 'platform',
    label: 'Платформа',
    placeholder: 'Например: Steam',
    suggestions: [
      'Battle.net',
      'EA app',
      'Epic Games Store',
      'GOG',
      'Nintendo Switch',
      'PlayStation',
      'Steam',
      'Ubisoft Connect',
      'Xbox / Microsoft Store'
    ]
  },
  {
    type: 'edition',
    label: 'Издание',
    placeholder: 'Например: Deluxe Edition',
    suggestions: ['Standard Edition', 'Deluxe Edition']
  }
];

const definitionByType = SEGMENT_DEFINITIONS.reduce<Record<SegmentType, SegmentDefinition | undefined>>(
  (acc, definition) => {
    acc[definition.type] = definition;
    return acc;
  },
  { root: undefined, product: undefined, kind: undefined, platform: undefined, edition: undefined, custom: undefined }
);

export function parseBreadcrumbs(value: string): PathSegment[] {
  if (!value) {
    return [];
  }
  const parts = value
    .split('>')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  return parts.map<PathSegment>((part, index) => {
    const definition = SEGMENT_DEFINITIONS[index];
    return {
      type: definition?.type ?? 'custom',
      value: part
    };
  });
}

export function stringifyBreadcrumbs(segments: PathSegment[]): string {
  if (!segments || segments.length === 0) {
    return '';
  }
  return segments
    .map((segment) => segment.value.trim())
    .filter((value) => value.length > 0)
    .join(' > ');
}

export function ensureSegmentsArray(segments: PathSegment[]): PathSegment[] {
  const normalized = [...segments];
  for (let index = 0; index < SEGMENT_DEFINITIONS.length; index += 1) {
    if (!normalized[index]) {
      normalized[index] = { type: SEGMENT_DEFINITIONS[index].type, value: '' };
    }
  }
  return normalized.slice(0, SEGMENT_DEFINITIONS.length);
}

export function getSegmentDefinition(type: SegmentType): SegmentDefinition | undefined {
  return definitionByType[type];
}

export function isSegmentValid(segment: PathSegment): boolean {
  const definition = getSegmentDefinition(segment.type);
  if (!definition || !definition.suggestions || definition.suggestions.length === 0) {
    return segment.value.trim().length > 0;
  }
  if (!segment.value.trim()) {
    return false;
  }
  return definition.suggestions.some(
    (suggestion) => suggestion.toLowerCase() === segment.value.trim().toLowerCase()
  );
}

export function normaliseSegmentValue(type: SegmentType, rawValue: string): string {
  const trimmed = rawValue.replace(/\s+/g, ' ').trim();
  if (!trimmed) {
    return '';
  }
  const definition = getSegmentDefinition(type);
  if (!definition?.suggestions) {
    return trimmed;
  }
  const matched = definition.suggestions.find(
    (suggestion) => suggestion.toLowerCase() === trimmed.toLowerCase()
  );
  return matched ?? trimmed;
}
