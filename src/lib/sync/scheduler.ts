import cron from 'node-cron';
import { prisma } from '../repositories/prisma';
import { getOrCreateSyncSettings } from '../repositories/syncSettingsRepository';
import { runSync } from './engine';

const CRON_EXPRESSION = '*/30 * * * *';

type SchedulerState = {
  started: boolean;
};

const globalScheduler = globalThis as typeof globalThis & {
  __syncScheduler?: SchedulerState;
};

async function handleTick() {
  const settings = await getOrCreateSyncSettings();
  if (settings.autoSyncEnabled) {
    await runSync();
    console.log('[sync] Auto sync completed at', new Date().toISOString());
  }
}

export function ensureScheduler() {
  if (globalScheduler.__syncScheduler?.started) return;
  cron.schedule(CRON_EXPRESSION, () => {
    handleTick().catch((err) => console.error('[sync] error', err));
  });
  globalScheduler.__syncScheduler = { started: true };
}

export async function setAutoSync(enabled: boolean) {
  const settings = await getOrCreateSyncSettings();
  await prisma.syncSettings.update({
    where: { id: settings.id },
    data: { autoSyncEnabled: enabled }
  });
}

ensureScheduler();
