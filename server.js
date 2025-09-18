const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url, `http://${req.headers.host}`);

    if (requestUrl.pathname === '/api/game' && req.method === 'GET') {
      await handleGameLookup(requestUrl, res);
      return;
    }

    await serveStaticFile(requestUrl.pathname, res);
  } catch (error) {
    console.error('Server error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Server is running at http://${HOST}:${PORT}`);
});

async function handleGameLookup(url, res) {
  const name = url.searchParams.get('name');

  if (!name || !name.trim()) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Пожалуйста, укажите название игры.' }));
    return;
  }

  try {
    const searchUrl = new URL('https://store.steampowered.com/api/storesearch/');
    searchUrl.searchParams.set('term', name);
    searchUrl.searchParams.set('cc', 'ru');

    const searchResponse = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; VibecodingBot/1.0; +https://example.com)'
      }
    });

    if (!searchResponse.ok) {
      throw new Error(`Steam search request failed with status ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();
    const items = Array.isArray(searchData?.items) ? searchData.items : [];

    const app = items.find((entry) => entry.type === 'app') || items[0];

    if (!app) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Игры с таким названием не найдено в Steam.' }));
      return;
    }

    const appId = app.id;

    const detailsUrl = new URL('https://store.steampowered.com/api/appdetails');
    detailsUrl.searchParams.set('appids', appId);
    detailsUrl.searchParams.set('cc', 'ru');
    detailsUrl.searchParams.set('l', 'russian');

    const detailsResponse = await fetch(detailsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; VibecodingBot/1.0; +https://example.com)'
      }
    });

    if (!detailsResponse.ok) {
      throw new Error(`Steam details request failed with status ${detailsResponse.status}`);
    }

    const detailsData = await detailsResponse.json();
    const appData = detailsData?.[appId];

    if (!appData?.success || !appData?.data) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Не удалось получить информацию об игре.' }));
      return;
    }

    const gameData = appData.data;

    const responsePayload = {
      name: gameData.name,
      description: gameData.short_description,
      headerImage: gameData.header_image,
      screenshots: Array.isArray(gameData.screenshots)
        ? gameData.screenshots.map((shot) => ({
            thumbnail: shot.path_thumbnail,
            full: shot.path_full,
          }))
        : [],
      steamAppId: gameData.steam_appid,
      storePage: `https://store.steampowered.com/app/${gameData.steam_appid}`,
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(responsePayload));
  } catch (error) {
    console.error('Steam API error:', error);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        error:
          'Не удалось получить данные из Steam. Попробуйте ещё раз чуть позже.',
      })
    );
  }
}

async function serveStaticFile(requestPath, res) {
  const safePath = requestPath === '/' ? '/index.html' : requestPath;
  const decodedPath = decodeURIComponent(safePath);
  const filePath = path.normalize(path.join(PUBLIC_DIR, decodedPath));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Доступ запрещён');
    return;
  }

  try {
    const fileStat = await fs.promises.stat(filePath);

    if (fileStat.isDirectory()) {
      await streamFile(path.join(filePath, 'index.html'), res);
    } else {
      await streamFile(filePath, res);
    }
  } catch (error) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Файл не найден');
  }
}

async function streamFile(filePath, res) {
  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  res.writeHead(200, { 'Content-Type': contentType });
  const stream = fs.createReadStream(filePath);
  await new Promise((resolve, reject) => {
    stream.on('error', reject);
    stream.on('end', resolve);
    stream.pipe(res);
  });
}
