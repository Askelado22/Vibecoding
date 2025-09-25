import { useEffect, useState } from 'react';
import { useToast } from './ToastProvider';

type Metrics = {
  completedByUser: Record<string, number>;
  averageCompletionMs: number;
  statusChanges: Record<string, number>;
  breadcrumbsChanges: Record<string, number>;
  dailyActivity: Record<string, number>;
};

type SyncSettings = {
  autoSyncEnabled: boolean;
  lastSyncAt: string | null;
};

type User = {
  id: string;
  email: string;
  role: 'admin' | 'worker';
  displayName: string;
  createdAt: string;
};

export function AdminTab() {
  const { showToast } = useToast();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [syncSettings, setSyncSettings] = useState<SyncSettings | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', password: '', role: 'worker', displayName: '' });

  const loadMetrics = () => {
    fetch('/api/admin/metrics')
      .then((res) => res.json())
      .then((data) => setMetrics(data));
  };

  const loadSyncSettings = () => {
    fetch('/api/admin/sync/status')
      .then((res) => res.json())
      .then((data) => setSyncSettings(data.settings));
  };

  const loadUsers = () => {
    fetch('/api/admin/users')
      .then((res) => res.json())
      .then((data) => setUsers(data.users || []));
  };

  useEffect(() => {
    loadMetrics();
    loadSyncSettings();
    loadUsers();
  }, []);

  const runSync = async () => {
    setLoading(true);
    await fetch('/api/admin/sync/run', { method: 'POST' });
    loadSyncSettings();
    loadMetrics();
    setLoading(false);
    showToast('Синхронизация запущена');
  };

  const toggleAutoSync = async (enabled: boolean) => {
    await fetch('/api/admin/sync/auto', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled })
    });
    loadSyncSettings();
    showToast(`Авто-синк ${enabled ? 'включён' : 'выключен'}`);
  };

  const uploadSuggestions = async (file: File) => {
    const ext = file.name.endsWith('.json') ? 'json' : 'csv';
    const content = await file.text();
    const res = await fetch('/api/admin/suggestions/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: ext, payload: content })
    });
    if (res.ok) {
      const data = await res.json();
      showToast(`Загружено подсказок: ${data.count}`);
    } else {
      const data = await res.json();
      showToast(data.error || 'Ошибка загрузки', 'error');
    }
  };

  const createUser = async () => {
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser)
    });
    if (res.ok) {
      setNewUser({ email: '', password: '', role: 'worker', displayName: '' });
      showToast('Пользователь создан');
      loadUsers();
    } else {
      const data = await res.json();
      showToast(data.error || 'Ошибка создания пользователя', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-surface p-6 shadow">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-accentBlue">Синхронизация</h2>
            <p className="text-sm text-gray-400">
              Последний запуск: {syncSettings?.lastSyncAt ? new Date(syncSettings.lastSyncAt).toLocaleString('ru-RU') : '—'}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={runSync}
              disabled={loading}
              className="rounded-md bg-accentBlue px-4 py-2 text-sm text-white hover:bg-blue-600"
            >
              Синхронизировать сейчас
            </button>
            <button
              onClick={() => toggleAutoSync(!(syncSettings?.autoSyncEnabled ?? false))}
              className={`rounded-md px-4 py-2 text-sm text-white ${
                syncSettings?.autoSyncEnabled ? 'bg-green-600' : 'bg-surfaceAlt'
              }`}
            >
              Авто-синк: {syncSettings?.autoSyncEnabled ? 'Вкл' : 'Выкл'}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-surface p-6 shadow">
        <h2 className="text-xl font-semibold text-accentBlue">Метрики</h2>
        {!metrics ? (
          <p className="mt-4 text-sm text-gray-400">Загрузка...</p>
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <div className="rounded-md bg-surfaceAlt p-4">
              <h3 className="text-sm font-semibold text-gray-300">Завершено по пользователям</h3>
              <ul className="mt-2 space-y-1 text-sm">
                {Object.entries(metrics.completedByUser).map(([email, count]) => (
                  <li key={email}>
                    {email}: <span className="text-accentBlue">{count}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-md bg-surfaceAlt p-4">
              <h3 className="text-sm font-semibold text-gray-300">Среднее время до завершения</h3>
              <p className="mt-2 text-2xl font-semibold text-accentPink">
                {(metrics.averageCompletionMs / (1000 * 60 * 60)).toFixed(2)} ч
              </p>
            </div>
            <div className="rounded-md bg-surfaceAlt p-4">
              <h3 className="text-sm font-semibold text-gray-300">Активность по дням</h3>
              <ul className="mt-2 space-y-1 text-sm">
                {Object.entries(metrics.dailyActivity).map(([date, count]) => (
                  <li key={date}>
                    {date}: <span className="text-accentBlue">{count}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-md bg-surfaceAlt p-4">
              <h3 className="text-sm font-semibold text-gray-300">Изменения статуса</h3>
              <ul className="mt-2 space-y-1 text-sm">
                {Object.entries(metrics.statusChanges).length === 0 ? (
                  <li className="text-gray-400">Нет данных</li>
                ) : (
                  Object.entries(metrics.statusChanges).map(([email, count]) => (
                    <li key={email}>
                      {email}: <span className="text-accentBlue">{count}</span>
                    </li>
                  ))
                )}
              </ul>
            </div>
            <div className="rounded-md bg-surfaceAlt p-4">
              <h3 className="text-sm font-semibold text-gray-300">Изменения хлебных крошек</h3>
              <ul className="mt-2 space-y-1 text-sm">
                {Object.entries(metrics.breadcrumbsChanges).length === 0 ? (
                  <li className="text-gray-400">Нет данных</li>
                ) : (
                  Object.entries(metrics.breadcrumbsChanges).map(([email, count]) => (
                    <li key={email}>
                      {email}: <span className="text-accentBlue">{count}</span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-lg bg-surface p-6 shadow">
        <h2 className="text-xl font-semibold text-accentBlue">Загрузка подсказок</h2>
        <input
          type="file"
          accept=".json,.csv"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) uploadSuggestions(file);
          }}
          className="mt-3 block text-sm text-gray-300"
        />
        <p className="mt-2 text-xs text-gray-500">
          Формат CSV: keyword,path,score,description. JSON: массив объектов {"titleMatch","path","score"}.
        </p>
      </div>

      <div className="rounded-lg bg-surface p-6 shadow">
        <h2 className="text-xl font-semibold text-accentBlue">Управление пользователями</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <input
            placeholder="Email"
            value={newUser.email}
            onChange={(event) => setNewUser((prev) => ({ ...prev, email: event.target.value }))}
            className="rounded-md border border-surfaceAlt bg-surfaceAlt p-2 text-sm text-white"
          />
          <input
            placeholder="Пароль"
            type="password"
            value={newUser.password}
            onChange={(event) => setNewUser((prev) => ({ ...prev, password: event.target.value }))}
            className="rounded-md border border-surfaceAlt bg-surfaceAlt p-2 text-sm text-white"
          />
          <input
            placeholder="Display name"
            value={newUser.displayName}
            onChange={(event) => setNewUser((prev) => ({ ...prev, displayName: event.target.value }))}
            className="rounded-md border border-surfaceAlt bg-surfaceAlt p-2 text-sm text-white"
          />
          <select
            value={newUser.role}
            onChange={(event) => setNewUser((prev) => ({ ...prev, role: event.target.value }))}
            className="rounded-md border border-surfaceAlt bg-surfaceAlt p-2 text-sm text-white"
          >
            <option value="worker">worker</option>
            <option value="admin">admin</option>
          </select>
        </div>
        <button
          onClick={createUser}
          className="mt-3 rounded-md bg-accentBlue px-4 py-2 text-sm text-white hover:bg-blue-600"
        >
          Создать пользователя
        </button>
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full divide-y divide-surfaceAlt text-sm">
            <thead className="bg-surfaceAlt text-gray-300">
              <tr>
                <th className="px-3 py-2 text-left">Email</th>
                <th className="px-3 py-2 text-left">Имя</th>
                <th className="px-3 py-2 text-left">Роль</th>
                <th className="px-3 py-2 text-left">Создан</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surfaceAlt">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-3 py-2">{user.email}</td>
                  <td className="px-3 py-2">{user.displayName}</td>
                  <td className="px-3 py-2">{user.role}</td>
                  <td className="px-3 py-2">{new Date(user.createdAt).toLocaleDateString('ru-RU')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
