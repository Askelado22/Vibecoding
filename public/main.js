const form = document.getElementById('search-form');
const input = document.getElementById('game-name');
const statusEl = document.getElementById('status');
const resultsSection = document.getElementById('results');
const bannerImg = document.getElementById('game-banner');
const titleEl = document.getElementById('game-title');
const descriptionEl = document.getElementById('game-description');
const linkEl = document.getElementById('game-link');
const screenshotsGrid = document.getElementById('screenshots-grid');
const screenshotTemplate = document.getElementById('screenshot-template');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const query = input.value.trim();

  if (!query) {
    showStatus('Пожалуйста, введите название игры.', 'error');
    return;
  }

  toggleLoading(true);
  try {
    const response = await fetch(`/api/game?name=${encodeURIComponent(query)}`);

    if (!response.ok) {
      const errorData = await safeJson(response);
      throw new Error(errorData?.error || 'Не удалось получить данные об игре.');
    }

    const game = await response.json();
    renderGame(game);
    showStatus('Готово! Вот что удалось найти.', 'success');
  } catch (error) {
    console.error(error);
    resultsSection.hidden = true;
    showStatus(error.message || 'Произошла ошибка. Попробуйте ещё раз.', 'error');
  } finally {
    toggleLoading(false);
  }
});

function renderGame(game) {
  bannerImg.src = game.headerImage;
  bannerImg.alt = `Баннер игры ${game.name}`;
  titleEl.textContent = game.name;
  descriptionEl.textContent = game.description;
  linkEl.href = game.storePage;
  linkEl.hidden = !game.storePage;

  screenshotsGrid.innerHTML = '';

  if (Array.isArray(game.screenshots) && game.screenshots.length > 0) {
    const fragment = document.createDocumentFragment();

    game.screenshots.forEach((shot, index) => {
      const node = screenshotTemplate.content.cloneNode(true);
      const image = node.querySelector('img');
      const anchor = node.querySelector('a');

      image.src = shot.thumbnail || shot.full;
      image.alt = `Скриншот ${index + 1} из игры ${game.name}`;
      anchor.href = shot.full || shot.thumbnail;

      fragment.appendChild(node);
    });

    screenshotsGrid.appendChild(fragment);
  } else {
    const message = document.createElement('p');
    message.className = 'no-screenshots';
    message.textContent = 'Скриншоты для этой игры не найдены.';
    screenshotsGrid.appendChild(message);
  }

  resultsSection.hidden = false;
}

function showStatus(message, type) {
  statusEl.textContent = message;
  statusEl.dataset.statusType = type;
}

function toggleLoading(isLoading) {
  form.querySelector('button').disabled = isLoading;
  form.querySelector('button').textContent = isLoading ? 'Ищем…' : 'Найти';
  showStatus(isLoading ? 'Запрашиваем данные в Steam…' : '', 'info');
}

async function safeJson(response) {
  try {
    return await response.json();
  } catch (error) {
    return null;
  }
}
