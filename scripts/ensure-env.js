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

  let envContent = fs.readFileSync(envPath, 'utf8');
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
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  const prismaSchemaPath = path.join(projectRoot, 'prisma', 'schema.prisma');
  let usesSqlite = false;

  if (fs.existsSync(prismaSchemaPath)) {
    try {
      const schemaContent = fs.readFileSync(prismaSchemaPath, 'utf8');
      const datasourceMatch = schemaContent.match(/datasource\s+\w+\s*{[^}]*?provider\s*=\s*"([^"]+)"/s);

      if (datasourceMatch && datasourceMatch[1] === 'sqlite') {
        usesSqlite = true;
      }
    } catch (schemaError) {
      console.warn('[ensure-env] Не удалось прочитать prisma/schema.prisma для определения провайдера БД:', schemaError);
    }
  }

  if (usesSqlite) {
    const envLines = envContent.split(/\r?\n/);
    const dbUrlIndex = envLines.findIndex((line) => /^DATABASE_URL\s*=/.test(line));

    if (dbUrlIndex !== -1) {
      const valueMatch = envLines[dbUrlIndex].match(/^DATABASE_URL\s*=\s*(.+)$/);

      if (valueMatch) {
        let rawValue = valueMatch[1].trim();
        let quote = '';

        if (rawValue.length >= 2 && ((rawValue.startsWith('"') && rawValue.endsWith('"')) || (rawValue.startsWith("'") && rawValue.endsWith("'")))) {
          quote = rawValue[0];
          rawValue = rawValue.slice(1, -1);
        }

        const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(rawValue);

        if (rawValue && !hasScheme) {
          const normalizedPath = rawValue.startsWith('./') || rawValue.startsWith('../') || rawValue.startsWith('/')
            ? rawValue
            : `./${rawValue}`;
          const updatedValue = `file:${normalizedPath}`;
          envLines[dbUrlIndex] = `DATABASE_URL=${quote ? `${quote}${updatedValue}${quote}` : updatedValue}`;
          envContent = envLines.join('\n');
          fs.writeFileSync(envPath, `${envContent}\n`);
          console.log('[ensure-env] DATABASE_URL приведён к формату file: для SQLite.');
        }
      }
    }
  }

  if (/^GAS_BASE_URL=.*YOUR_SCRIPT_ID/m.test(envContent)) {
    console.warn(
      '[ensure-env] GAS_BASE_URL всё ещё указывает на https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec. Замените YOUR_SCRIPT_ID на идентификатор вашего опубликованного веб-приложения Google Apps Script.'
    );
  }
} catch (error) {
  console.error('[ensure-env] Не удалось подготовить .env файл:', error);
  process.exitCode = 1;
}
