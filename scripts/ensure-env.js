const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const envPath = path.join(projectRoot, '.env');
const examplePath = path.join(projectRoot, '.env.example');

try {
  if (!fs.existsSync(examplePath)) {
    console.warn('[ensure-env] .env.example не найден, пропускаю автоматическое создание .env');
    process.exit(0);
  }

  if (!fs.existsSync(envPath)) {
    fs.copyFileSync(examplePath, envPath);
    console.log('[ensure-env] Создан .env на основе .env.example');
  }

  const requiredKeys = [
    'DATA_SOURCE',
    'DATABASE_URL',
    'GAS_BASE_URL',
    'SHEET_SPREADSHEET_ID',
    'SHEET_RANGE',
    'JWT_SECRET',
    'TZ',
    'AUTO_SYNC_ENABLED',
    'SUGGESTIONS_HTTP_ENDPOINT'
  ];

  const envContent = fs.readFileSync(envPath, 'utf8');
  const exampleContent = fs.readFileSync(examplePath, 'utf8');
  const missingKeys = requiredKeys.filter((key) => !new RegExp(`^${key}=`, 'm').test(envContent));

  if (missingKeys.length > 0) {
    const additions = missingKeys
      .map((key) => {
        const match = exampleContent.match(new RegExp(`^${key}=.*$`, 'm'));
        return match ? match[0] : `${key}=`;
      })
      .join('\n');

    fs.appendFileSync(envPath, `\n${additions}\n`);
    console.log(`[ensure-env] Добавлены отсутствующие ключи в .env: ${missingKeys.join(', ')}`);
  }
} catch (error) {
  console.error('[ensure-env] Не удалось подготовить .env файл:', error);
  process.exitCode = 1;
}
