import { Item, MoveStatus, Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { nowInMoscow } from '../../lib/time';

export type ItemFilters = {
  assignee?: string;
  status?: MoveStatus | 'all';
  hasBreadcrumbs?: 'yes' | 'no';
  isCompleted?: 'yes' | 'no';
  query?: string;
};

export async function listItems(
  filters: ItemFilters,
  page: number,
  pageSize: number
) {
  const where: Prisma.ItemWhereInput = {};

  if (filters.assignee) {
    where.assigneeName = filters.assignee;
  }

  if (filters.status && filters.status !== 'all') {
    where.moveStatus = filters.status as MoveStatus;
  }

  if (filters.hasBreadcrumbs) {
    where.finalBreadcrumbs =
      filters.hasBreadcrumbs === 'yes' ? { not: null } : null;
  }

  if (filters.isCompleted) {
    where.isCompleted = filters.isCompleted === 'yes';
  }

  if (filters.query) {
    where.OR = [
      { productUrl: { contains: filters.query, mode: 'insensitive' } },
      { finalBreadcrumbs: { contains: filters.query, mode: 'insensitive' } },
      { comment: { contains: filters.query, mode: 'insensitive' } }
    ];
  }

  const [items, total] = await Promise.all([
    prisma.item.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    prisma.item.count({ where })
  ]);

  return { items, total };
}

export async function getQueueItems(displayName: string) {
  return prisma.item.findMany({
    where: { assigneeName: displayName, isCompleted: false },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }]
  });
}

export async function findItemById(id: number) {
  return prisma.item.findUnique({ where: { id } });
}

export async function updateItem(
  id: number,
  data: Partial<Pick<Item, 'finalBreadcrumbs' | 'moveStatus' | 'comment' | 'assigneeName'>> &
    Partial<Item>
) {
  return prisma.item.update({
    where: { id },
    data: {
      ...data,
      updatedAt: nowInMoscow()
    }
  });
}

export async function completeItem(id: number, userEmail: string) {
  return prisma.item.update({
    where: { id },
    data: {
      priorityRaw: 'Средний',
      completedBy: userEmail,
      completedAt: nowInMoscow(),
      isCompleted: true,
      updatedAt: nowInMoscow()
    }
  });
}

export async function createOrUpdateItems(items: Prisma.ItemCreateInput[]) {
  const operations = items.map((item) =>
    prisma.item.upsert({
      where: { productUrl: item.productUrl },
      update: {
        ...item,
        updatedAt: nowInMoscow()
      },
      create: item
    })
  );
  await prisma.$transaction(operations);
}

export async function assignItem(id: number, assigneeName: string | null) {
  return prisma.item.update({
    where: { id },
    data: {
      assigneeName,
      updatedAt: nowInMoscow()
    }
  });
}
