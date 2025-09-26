import { Switch } from '@headlessui/react';
import { MOVE_STATUS_OPTIONS, type MoveStatusValue } from '../../lib/constants';

type StatusCardProps = {
  status: MoveStatusValue | '';
  onStatusChange: (value: MoveStatusValue | '') => void;
  updatedAt: string | null;
  updatedBy: string | null;
  completed: boolean;
  onToggleComplete: () => void;
  canComplete: boolean;
};

function formatDate(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'medium' }).format(date);
}

export function StatusCard({
  status,
  onStatusChange,
  updatedAt,
  updatedBy,
  completed,
  onToggleComplete,
  canComplete
}: StatusCardProps) {
  return (
    <div className="rounded-xl border border-surfaceAlt bg-surface p-4 shadow-lg">
      <h3 className="text-lg font-semibold text-accentBlue">Статус переноса</h3>

      <div className="mt-4 space-y-3">
        <label className="block text-xs uppercase tracking-wide text-gray-500">Выберите статус</label>
        <select
          value={status}
          onChange={(event) => onStatusChange(event.target.value as MoveStatusValue | '')}
          className="w-full rounded-md border border-surfaceAlt bg-surfaceAlt px-3 py-2 text-sm text-white outline-none focus:border-accentBlue"
        >
          <option value="">—</option>
          {MOVE_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-5 flex items-center justify-between rounded-lg border border-surfaceAlt bg-surfaceAlt/60 px-3 py-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">Завершён</p>
          <p className="text-sm text-textPrimary">{completed ? 'Да' : 'Нет'}</p>
        </div>
        <Switch
          checked={completed}
          onChange={(value) => {
            if (!canComplete || !value) {
              return;
            }
            onToggleComplete();
          }}
          disabled={!canComplete}
          className={`${
            completed ? 'bg-green-500' : 'bg-surfaceAlt'
          } relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border border-surfaceAlt transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accentBlue disabled:cursor-not-allowed disabled:opacity-50`}
        >
          <span
            aria-hidden="true"
            className={`${completed ? 'translate-x-7' : 'translate-x-1'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white transition`}
          />
        </Switch>
      </div>

      <dl className="mt-4 space-y-2 text-xs text-gray-400">
        <div className="flex justify-between">
          <dt>Последнее изменение</dt>
          <dd className="text-textPrimary">{formatDate(updatedAt)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Кто обновил</dt>
          <dd className="text-textPrimary">{updatedBy ?? '—'}</dd>
        </div>
      </dl>
    </div>
  );
}
