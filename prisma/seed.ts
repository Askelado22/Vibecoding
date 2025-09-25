import { PrismaClient, MoveStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const statuses: MoveStatus[] = [
  MoveStatus.YES,
  MoveStatus.NO,
  MoveStatus.HIEROGLYPHS,
  MoveStatus.OUT_OF_STOCK,
  MoveStatus.ALREADY_MOVED,
  MoveStatus.NOT_NEEDED
];

async function main() {
  const password = await bcrypt.hash('password123', 10);
  const workerPassword = await bcrypt.hash('worker123', 10);
  const askelPassword = await bcrypt.hash('white13', 10);

  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      passwordHash: password,
      role: 'admin',
      displayName: 'Админ'
    }
  });

  await prisma.user.upsert({
    where: { email: 'worker@example.com' },
    update: {},
    create: {
      email: 'worker@example.com',
      passwordHash: workerPassword,
      role: 'worker',
      displayName: 'Исполнитель'
    }
  });

  await prisma.user.upsert({
    where: { email: 'askelwhite22@gmail.com' },
    update: {
      displayName: 'askelwhite22'
    },
    create: {
      email: 'askelwhite22@gmail.com',
      passwordHash: askelPassword,
      role: 'admin',
      displayName: 'askelwhite22'
    }
  });

  const suggestions = [
    { titleMatch: 'steam', path: 'Игры > Steam > Ключи', score: 3 },
    { titleMatch: 'origin', path: 'Игры > Origin > Ключи', score: 2 },
    { titleMatch: 'ubisoft', path: 'Игры > Ubisoft > Ключи', score: 2 }
  ];

  await prisma.suggestion.deleteMany();
  await prisma.suggestion.createMany({ data: suggestions });

  await prisma.item.deleteMany();
  const now = new Date();
  for (let i = 1; i <= 8; i++) {
    const moveStatus = statuses[i % statuses.length];
    await prisma.item.create({
      data: {
        productUrl: `https://ggsel.net/catalog/product/demo-${i}`,
        assigneeName: i % 2 === 0 ? 'Исполнитель' : null,
        moveStatus,
        moveStatusSetBy: 'admin@example.com',
        moveStatusSetAt: now,
        finalBreadcrumbs: i % 2 === 0 ? 'Игры > Steam > Ключи' : null,
        breadcrumbsSetBy: i % 2 === 0 ? 'worker@example.com' : null,
        breadcrumbsSetAt: i % 2 === 0 ? now : null,
        priorityRaw: i % 3 === 0 ? 'Средний' : '',
        completedBy: i % 3 === 0 ? 'worker@example.com' : null,
        completedAt: i % 3 === 0 ? now : null,
        isCompleted: i % 3 === 0,
        movedFlagRaw: i % 2 === 0 ? 'Да' : 'Нет',
        comment: i % 2 === 0 ? 'Комментарий' : null
      }
    });
  }

  await prisma.syncSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, autoSyncEnabled: false }
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
