import { ReactNode } from 'react';

const tabs = [
  { id: 'work', label: 'Рабочая' },
  { id: 'personal', label: 'Мои товары' },
  { id: 'list', label: 'Общий список' },
  { id: 'admin', label: 'Админ-панель' }
] as const;

type LayoutProps = {
  activeTab: string;
  onTabChange: (tab: string) => void;
  user: { email: string; displayName: string; role: 'admin' | 'worker' };
  children: ReactNode;
};

export function Layout({ activeTab, onTabChange, user, children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background text-textPrimary">
      <header className="border-b border-surfaceAlt bg-surface px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-accentBlue">GGSEL Разбор товаров</h1>
            <p className="text-sm text-gray-300">{user.displayName} · {user.role}</p>
          </div>
          <form method="post" action="/api/auth/logout">
            <button
              type="submit"
              className="rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white shadow hover:bg-red-600"
            >
              Выйти
            </button>
          </form>
        </div>
        <nav className="mt-4 flex gap-2">
          {tabs
            .filter((tab) => tab.id !== 'admin' || user.role === 'admin')
            .map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-accentBlue text-white'
                    : 'bg-surfaceAlt text-gray-300 hover:bg-accentPink/20'
                }`}
              >
                {tab.label}
              </button>
            ))}
        </nav>
      </header>
      <main className="px-6 py-6">{children}</main>
    </div>
  );
}
