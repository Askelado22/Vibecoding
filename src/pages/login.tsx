import { FormEvent, useState } from 'react';
import { useRouter } from 'next/router';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (res.ok) {
      router.push('/app');
    } else {
      let message = 'Ошибка входа';
      try {
        const data = await res.json();
        if (data?.error) {
          message = data.error;
        }
      } catch (error) {
        console.warn('[login] Не удалось распарсить ответ об ошибке', error);
        if (res.status >= 500) {
          message =
            'Сервер авторизации недоступен. Проверьте настройки .env и примените миграции командой "npm run prisma:migrate".';
        }
      }
      setError(message);
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-lg bg-surface p-8 shadow-lg"
      >
        <h1 className="text-2xl font-semibold text-accentBlue">Вход</h1>
        <p className="mt-2 text-sm text-gray-300">Введите email и пароль</p>
        <div className="mt-6 space-y-4">
          <div>
            <label className="text-sm text-gray-300">Email</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-md border border-surfaceAlt bg-surfaceAlt p-3 text-sm text-white focus:border-accentBlue focus:outline-none"
            />
          </div>
          <div>
            <label className="text-sm text-gray-300">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-md border border-surfaceAlt bg-surfaceAlt p-3 text-sm text-white focus:border-accentBlue focus:outline-none"
            />
          </div>
        </div>
        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-md bg-accentBlue py-3 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-50"
        >
          Войти
        </button>
      </form>
    </div>
  );
}
