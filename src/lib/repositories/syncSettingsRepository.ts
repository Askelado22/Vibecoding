import { prisma } from './prisma';

export async function getOrCreateSyncSettings() {
  let settings = await prisma.syncSettings.findUnique({ where: { id: 1 } });
  if (!settings) {
    settings = await prisma.syncSettings.create({
      data: {
        id: 1,
        autoSyncEnabled: process.env.AUTO_SYNC_ENABLED === 'true'
      }
    });
  }
  return settings;
}

export async function updateSyncSettings(data: {
  autoSyncEnabled?: boolean;
  lastSyncAt?: Date | null;
  lastPushCursor?: Date | null;
  lastPullCursor?: Date | null;
}) {
  return prisma.syncSettings.update({
    where: { id: 1 },
    data
  });
}
