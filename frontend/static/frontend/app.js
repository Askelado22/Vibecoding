(function () {
  const app = document.querySelector('[data-app]');
  if (!app) return;

  const toastStack = document.querySelector('[data-toast-stack]');
  const toastTemplate = document.getElementById('toast-template');

  function showToast(message, type = 'info') {
    if (!toastTemplate || !toastStack) return alert(message);
    const toast = toastTemplate.content.firstElementChild.cloneNode(true);
    toast.textContent = message;
    toast.classList.add(`toast--${type === 'error' ? 'error' : type === 'success' ? 'success' : 'info'}`);
    toastStack.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('toast--hide');
      toast.addEventListener('transitionend', () => toast.remove(), { once: true });
      toast.style.opacity = '0';
    }, 2800);
  }

  const tabTriggers = Array.from(app.querySelectorAll('[data-tab-trigger]'));
  const panels = {
    work: app.querySelector('#tab-work'),
    list: app.querySelector('#tab-list'),
    admin: app.querySelector('#tab-admin'),
  };

  tabTriggers.forEach((trigger) => {
    trigger.addEventListener('click', (event) => {
      event.preventDefault();
      const target = trigger.dataset.tabTrigger;
      if (!target) return;
      tabTriggers.forEach((link) => link.classList.toggle('app-nav__tab--active', link === trigger));
      Object.entries(panels).forEach(([key, panel]) => {
        if (panel) panel.classList.toggle('tabs-panel--active', key === target);
      });
    });
  });

  const accordion = app.querySelector('[data-accordion]');
  if (accordion) {
    accordion.addEventListener('click', (event) => {
      const header = event.target.closest('[data-accordion-toggle]');
      if (!header) return;
      const item = header.closest('[data-accordion-item]');
      const body = item?.querySelector('.accordion__body');
      const badge = header.querySelector('.badge');
      if (!body) return;
      const isOpen = body.classList.toggle('accordion__body--open');
      if (badge) badge.textContent = isOpen ? 'Открыто' : 'Свернуто';
    });
  }

  const collapseAllBtn = app.querySelector('[data-action="collapse-all"]');
  const expandAllBtn = app.querySelector('[data-action="expand-all"]');
  const accordionBodies = accordion ? Array.from(accordion.querySelectorAll('.accordion__body')) : [];
  collapseAllBtn?.addEventListener('click', () => {
    accordionBodies.forEach((body) => body.classList.remove('accordion__body--open'));
    accordion?.querySelectorAll('.accordion__header .badge').forEach((badge) => (badge.textContent = 'Свернуто'));
    showToast('Блоки свернуты', 'info');
  });
  expandAllBtn?.addEventListener('click', () => {
    accordionBodies.forEach((body) => body.classList.add('accordion__body--open'));
    accordion?.querySelectorAll('.accordion__header .badge').forEach((badge) => (badge.textContent = 'Открыто'));
    showToast('Блоки раскрыты', 'info');
  });

  const descriptionPane = app.querySelector('[data-description]');
  const searchField = app.querySelector('[data-description-search]');
  if (descriptionPane && searchField) {
    const original = descriptionPane.innerHTML;
    const highlight = (value) => {
      if (!value || value.length < 2) {
        descriptionPane.innerHTML = original;
        return;
      }
      const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escaped})`, 'gi');
      descriptionPane.innerHTML = original.replace(regex, '<mark>$1</mark>');
    };
    searchField.addEventListener('input', (event) => highlight(event.target.value.trim()));
  }

  const pathBuilderRoot = app.querySelector('[data-path-builder]');
  const pathContainer = pathBuilderRoot?.querySelector('[data-path-input]');
  const pathField = pathBuilderRoot?.querySelector('[data-path-field]');
  const pathHint = pathBuilderRoot?.querySelector('[data-path-hint]');
  const datalist = document.createElement('datalist');
  datalist.id = 'path-options';
  document.body.appendChild(datalist);
  if (pathField) pathField.setAttribute('list', datalist.id);

  const pathState = {
    segments: [],
    lastValid: false,
  };

  const roots = ['Игры', 'Сервисы и соцсети', 'Программное обеспечение'];
  const types = ['Аккаунты', 'Ключи', 'Покупка на ваш аккаунт', 'Аренда аккаунтов', 'Оффлайн аккаунты', 'Услуги активации', 'DLC', 'Скины', 'Предметы', 'Валюта', 'Боевой пропуск', 'Наборы'];
  const platforms = ['Battle.net', 'EA app', 'Epic Games Store', 'GOG', 'Nintendo Switch', 'PlayStation', 'Steam', 'Ubisoft Connect', 'Xbox / Microsoft Store'];
  const editions = ['Standard Edition', 'Deluxe Edition'];

  function captureInitialSegments() {
    if (!pathContainer) return;
    const chips = Array.from(pathContainer.querySelectorAll('[data-chip]'));
    pathState.segments = chips.map((chip) => chip.getAttribute('value') || chip.textContent.replace('×', '').trim());
    renderSegments();
  }

  function updateDatalist() {
    if (!pathField) return;
    const index = pathState.segments.length;
    let options = [];
    if (index === 0) options = roots;
    else if (index === 2) options = types;
    else if (index === 3) options = platforms;
    else if (index === 4) options = editions;
    else options = [];
    datalist.innerHTML = options.map((option) => `<option value="${option}"></option>`).join('');
  }

  function isSegmentValid(segment, index) {
    if (!segment) return false;
    if (index === 0) return roots.includes(segment);
    if (index === 2) return types.includes(segment);
    if (index === 3) return platforms.includes(segment);
    if (index === 4) return editions.includes(segment);
    if (index > 4) return false;
    return true;
  }

  function renderSegments() {
    if (!pathContainer || !pathField) return;
    Array.from(pathContainer.querySelectorAll('.path-builder__chip')).forEach((chip) => chip.remove());
    pathState.segments.forEach((segment, index) => {
      const chip = document.createElement('span');
      chip.className = 'path-builder__chip';
      chip.draggable = true;
      chip.dataset.index = index.toString();
      if (!isSegmentValid(segment, index)) chip.classList.add('path-builder__chip--invalid');
      chip.innerHTML = `<span>${segment}</span><button type="button" data-chip-remove aria-label="Удалить сегмент ${segment}">×</button>`;
      chip.addEventListener('dragstart', onChipDragStart);
      chip.addEventListener('dragover', onChipDragOver);
      chip.addEventListener('drop', onChipDrop);
      chip.addEventListener('dragend', () => chip.classList.remove('dragging'));
      chip.addEventListener('dragstart', () => chip.classList.add('dragging'));
      pathContainer.insertBefore(chip, pathField);
    });
    updateDatalist();
    updatePathValidation();
  }

  let dragIndex = null;
  function onChipDragStart(event) {
    dragIndex = Number(event.currentTarget.dataset.index);
    event.dataTransfer.effectAllowed = 'move';
  }

  function onChipDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }

  function onChipDrop(event) {
    event.preventDefault();
    const targetIndex = Number(event.currentTarget.dataset.index);
    if (Number.isNaN(dragIndex) || Number.isNaN(targetIndex) || dragIndex === targetIndex) return;
    const [moved] = pathState.segments.splice(dragIndex, 1);
    pathState.segments.splice(targetIndex, 0, moved);
    dragIndex = null;
    renderSegments();
  }

  function addSegment(raw) {
    const value = (raw || '').trim();
    if (!value) return;
    pathState.segments.push(value);
    if (pathField) pathField.value = '';
    renderSegments();
  }

  function removeSegment(index) {
    pathState.segments.splice(index, 1);
    renderSegments();
  }

  function normalizeSegments() {
    pathState.segments = pathState.segments.map((segment) => segment.replace(/\s+/g, ' ').replace(/\s*>\s*/g, ' > ').trim());
    showToast('Сегменты нормализованы', 'info');
    renderSegments();
  }

  function clearSegments() {
    pathState.segments = [];
    renderSegments();
    showToast('Путь очищен', 'info');
  }

  function updatePathValidation() {
    const errors = [];
    if (pathState.segments.length < 2) errors.push('Минимум два сегмента.');
    pathState.segments.forEach((segment, index) => {
      if (!isSegmentValid(segment, index)) {
        if (index === 0) errors.push('Первый сегмент: Игры / Сервисы и соцсети / Программное обеспечение.');
        if (index === 2) errors.push('Тип товара вне справочника.');
        if (index === 3) errors.push('Платформа вне справочника.');
        if (index === 4) errors.push('Издание вне справочника.');
      }
    });
    const uniqueErrors = [...new Set(errors)];
    if (pathHint) pathHint.textContent = uniqueErrors.length ? uniqueErrors.join(' ') : `Сегментов: ${pathState.segments.length}.`;
    pathState.lastValid = uniqueErrors.length === 0;
    updateCompleteState();
  }

  if (pathBuilderRoot && pathField && pathContainer) {
    pathContainer.addEventListener('dragover', (event) => {
      if (dragIndex === null) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
    });
    pathContainer.addEventListener('drop', (event) => {
      if (dragIndex === null) return;
      event.preventDefault();
      const [moved] = pathState.segments.splice(dragIndex, 1);
      pathState.segments.push(moved);
      dragIndex = null;
      renderSegments();
    });
    captureInitialSegments();
    pathBuilderRoot.addEventListener('click', (event) => {
      const removeButton = event.target.closest('[data-chip-remove]');
      if (!removeButton) return;
      const chip = removeButton.closest('.path-builder__chip');
      const index = chip ? Number(chip.dataset.index) : -1;
      if (index >= 0) removeSegment(index);
    });

    pathField.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        addSegment(pathField.value);
      }
    });

    pathField.addEventListener('input', (event) => {
      const { value } = event.target;
      if (value.includes('  ')) {
        event.target.value = value.replace(/\s{2,}/g, ' > ');
      }
    });

    pathField.addEventListener('focus', updateDatalist);
  }

  const actions = {
    'clear-path': clearSegments,
    'suggest-root': () => {
      if (!pathState.segments.length) {
        pathState.segments.push(roots[0]);
      } else if (!roots.includes(pathState.segments[0])) {
        pathState.segments[0] = roots[0];
      } else {
        const nextRoot = roots[(roots.indexOf(pathState.segments[0]) + 1) % roots.length];
        pathState.segments[0] = nextRoot;
      }
      renderSegments();
      showToast(`Корень: ${pathState.segments[0]}`, 'info');
    },
    'copy-path': () => {
      const text = pathState.segments.join(' > ');
      navigator.clipboard?.writeText(text);
      showToast('Путь скопирован', 'success');
    },
    'normalize-path': normalizeSegments,
    save: () => showToast('Изменения сохранены', 'success'),
    prev: () => showToast('Предыдущий товар загружен', 'info'),
    next: () => showToast('Следующий товар загружен', 'info'),
    'open-gallery': () => showToast('Галерея открыта', 'info'),
    'upload-suggestions': () => showToast('Откройте модуль загрузки подсказок', 'info'),
    'run-sync': () => {
      showToast('Синхронизация запущена', 'success');
      document.getElementById('last-pull').textContent = new Date().toLocaleString('ru-RU');
      document.getElementById('last-push').textContent = new Date().toLocaleString('ru-RU');
      document.getElementById('sync-status').textContent = 'OK';
      const banner = document.getElementById('conflict-banner');
      if (banner) banner.hidden = Math.random() > 0.5;
    },
  };

  app.addEventListener('click', (event) => {
    const actionButton = event.target.closest('[data-action]');
    if (!actionButton) return;
    const actionName = actionButton.dataset.action;
    if (actions[actionName]) {
      event.preventDefault();
      actions[actionName](actionButton);
    }
  });

  const statusGroup = app.querySelector('[data-status-group]');
  const statusHelper = app.querySelector('[data-status-helper]');
  const statusUpdated = app.querySelector('[data-status-updated]');
  const completeButton = app.querySelector('[data-action="complete"]');
  const completeHint = app.querySelector('[data-complete-hint]');
  let selectedStatus = '';

  function updateCompleteState(options = {}) {
    if (!completeButton || !completeHint || !statusHelper) return;
    const ready = Boolean(selectedStatus) && pathState.lastValid;
    completeButton.disabled = !ready;
    completeHint.textContent = ready ? 'Можно завершить карточку.' : 'Выберите статус и путь.';
    statusHelper.textContent = ready ? 'Данные заполнены, можно завершить карточку.' : 'Заполните крошки, чтобы завершить карточку.';
    if (ready && options.updateTimestamp !== false && statusUpdated) {
      statusUpdated.textContent = new Date().toLocaleString('ru-RU');
    }
    if (!ready && statusUpdated && !options.preserveTimestamp) {
      statusUpdated.textContent = '—';
    }
  }

  if (statusGroup) {
    statusGroup.querySelectorAll('.segmented__option').forEach((btn) => btn.setAttribute('aria-checked', 'false'));
    statusGroup.addEventListener('click', (event) => {
      const option = event.target.closest('[data-status]');
      if (!option) return;
      selectedStatus = option.dataset.status;
      statusGroup.querySelectorAll('.segmented__option').forEach((btn) => {
        const isActive = btn === option;
        btn.classList.toggle('segmented__option--active', isActive);
        btn.setAttribute('aria-checked', String(isActive));
      });
      showToast(`Статус: ${selectedStatus}`, 'info');
      updateCompleteState();
    });
  }

  completeButton?.addEventListener('click', () => {
    if (completeButton.disabled) return;
    showToast('Карточка завершена', 'success');
  });

  const commentDrawer = app.querySelector('[data-comment-drawer]');
  const commentInput = app.querySelector('[data-comment-input]');
  const commentPreview = app.querySelector('[data-comment-preview]');
  const commentCounter = app.querySelector('[data-comment-counter]');
  const COMMENT_STATE_KEY = 'ggsel-comment-open';

  function setCommentOpen(isOpen) {
    if (!commentDrawer) return;
    commentDrawer.classList.toggle('comment-block--open', isOpen);
    localStorage.setItem(COMMENT_STATE_KEY, isOpen ? '1' : '0');
    app.querySelectorAll('[data-action="toggle-comment"]').forEach((btn) => {
      const expanded = btn.dataset.labelExpanded || 'Свернуть';
      const collapsed = btn.dataset.labelCollapsed || 'Комментарий';
      btn.textContent = isOpen ? expanded : collapsed;
      btn.setAttribute('aria-expanded', String(isOpen));
    });
    if (isOpen) {
      commentInput?.focus();
    }
  }

  function updateCommentPreview() {
    if (!commentInput || !commentPreview || !commentCounter) return;
    const value = commentInput.value.trim();
    commentPreview.textContent = value ? value.split('\n')[0].slice(0, 80) : 'Добавьте заметку для команды';
    commentCounter.textContent = `${value.length} / ${commentInput.maxLength || 300}`;
  }

  const commentInitialOpen = localStorage.getItem(COMMENT_STATE_KEY) === '1';
  setCommentOpen(commentInitialOpen);
  updateCommentPreview();

  app.addEventListener('click', (event) => {
    const templateBtn = event.target.closest('[data-action="insert-template"]');
    if (templateBtn && commentInput) {
      const { value } = templateBtn;
      const current = commentInput.value;
      commentInput.value = current ? `${current}\n${value}` : value;
      updateCommentPreview();
      commentInput.focus();
    }
  });

  app.addEventListener('click', (event) => {
    const toggleBtn = event.target.closest('[data-action="toggle-comment"]');
    if (toggleBtn) {
      event.preventDefault();
      const isOpen = commentDrawer?.classList.contains('comment-block--open');
      setCommentOpen(!isOpen);
    }
  });

  app.addEventListener('click', (event) => {
    if (event.target.closest('[data-action="save-comment"]')) {
      event.preventDefault();
      showToast('Комментарий сохранён', 'success');
      setCommentOpen(false);
    }
  });

  commentInput?.addEventListener('input', updateCommentPreview);

  const progressBar = app.querySelector('[data-progress]');
  const progressLabel = app.querySelector('[data-progress-label]');
  const total = 25;
  let current = 1;
  function updateProgress() {
    if (progressBar) progressBar.style.width = `${(current / total) * 100}%`;
    if (progressLabel) progressLabel.textContent = `${current} из ${total}`;
  }
  updateProgress();

  actions.next = () => {
    current = current >= total ? total : current + 1;
    updateProgress();
    showToast('Следующий товар загружен', 'info');
  };
  actions.prev = () => {
    current = current <= 1 ? 1 : current - 1;
    updateProgress();
    showToast('Предыдущий товар загружен', 'info');
  };

  const suggestionsRoot = app.querySelector('[data-suggestions]');
  const suggestionsEmpty = app.querySelector('[data-empty-suggestions]');
  const suggestionData = [
    { path: 'Игры > Atomic Heart > Ключи > Steam', score: 0.94, source: 'Local' },
    { path: 'Игры > Atomic Heart > Покупка на ваш аккаунт > Steam', score: 0.85, source: 'External' },
    { path: 'Игры > Atomic Heart > Ключи > Xbox / Microsoft Store', score: 0.81, source: 'Local' },
    { path: 'Игры > Atomic Heart > DLC', score: 0.63, source: 'External' },
    { path: 'Игры > Atomic Heart > Наборы', score: 0.58, source: 'Local' },
  ];

  function renderSuggestions() {
    if (!suggestionsRoot) return;
    suggestionsRoot.innerHTML = '';
    if (!suggestionData.length) {
      suggestionsEmpty?.removeAttribute('hidden');
      return;
    }
    suggestionsEmpty?.setAttribute('hidden', '');
    suggestionData.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'suggestion-item';
      row.innerHTML = `
        <span class="suggestion-item__rank">#${index + 1}</span>
        <div>
          <div class="suggestion-item__path" title="${item.path}">${item.path}</div>
          <div class="suggestion-item__meta">
            <span class="badge">${item.source}</span>
            <span class="badge badge--primary">score ${item.score}</span>
          </div>
        </div>
        <div class="suggestion-item__actions">
          <button class="btn btn--sm" data-suggestion="apply" aria-label="Применить путь ${item.path}">⤵</button>
          <button class="btn btn--sm" data-suggestion="copy" aria-label="Скопировать путь ${item.path}">⧉</button>
        </div>`;
      row.dataset.index = index.toString();
      suggestionsRoot.appendChild(row);
    });
  }

  suggestionsRoot?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-suggestion]');
    if (!button) return;
    const index = Number(button.closest('.suggestion-item')?.dataset.index);
    const suggestion = suggestionData[index];
    if (!suggestion) return;
    if (button.dataset.suggestion === 'apply') {
      pathState.segments = suggestion.path.split('>').map((seg) => seg.trim());
      renderSegments();
      showToast('Путь применён', 'success');
    } else if (button.dataset.suggestion === 'copy') {
      navigator.clipboard?.writeText(suggestion.path);
      showToast('Путь скопирован', 'success');
    }
  });

  renderSuggestions();

  const listBody = document.getElementById('list-body');
  if (listBody) {
    const rows = Array.from({ length: 15 }).map((_, index) => ({
      url: `https://ggsel.net/catalog/product/12${300 + index}`,
      assignee: index % 2 ? 'worker@example.com' : '—',
      status: index % 3 === 0 ? 'Да' : 'Нет',
      statusBy: 'worker@example.com',
      statusAt: `2024-10-0${(index % 9) + 1} 12:40`,
      breadcrumbs: 'Игры > Atomic Heart > Ключи > Steam',
      breadcrumbsBy: 'worker@example.com',
      breadcrumbsAt: `2024-10-0${(index % 9) + 1} 13:10`,
      priority: 'Средний',
      completedBy: index % 2 ? 'worker@example.com' : '—',
      completedAt: index % 2 ? `2024-10-0${(index % 9) + 1} 13:40` : '—',
      flag: 'moved',
      comment: index % 2 ? 'Ждать подтверждения' : '—',
    }));
    rows.forEach((row) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><a href="${row.url}" target="_blank" rel="noopener">${row.url}</a></td>
        <td>${row.assignee}</td>
        <td>${row.status}</td>
        <td>${row.statusBy}</td>
        <td>${row.statusAt}</td>
        <td title="${row.breadcrumbs}">${row.breadcrumbs}</td>
        <td>${row.breadcrumbsBy}</td>
        <td>${row.breadcrumbsAt}</td>
        <td>${row.priority}</td>
        <td>${row.completedBy}</td>
        <td>${row.completedAt}</td>
        <td class="badge">${row.flag}</td>
        <td>${row.comment}</td>
        <td class="table__actions">
          <button class="btn btn--sm">Взять</button>
          <button class="btn btn--sm">Открыть</button>
        </td>`;
      listBody.appendChild(tr);
    });
  }

  const metricGrid = document.getElementById('metric-grid');
  if (metricGrid) {
    const metrics = [
      { label: 'Завершено сегодня', value: '18', hint: '+4 vs вчера' },
      { label: 'Всего завершено', value: '432', hint: '+12 за неделю' },
      { label: 'Активные аналитики', value: '8', hint: 'В сети сейчас' },
      { label: 'Среднее время', value: '14 мин', hint: 'на карточку' },
    ];
    metrics.forEach((metric) => {
      const chip = document.createElement('div');
      chip.className = 'chip chip--primary';
      chip.innerHTML = `<strong>${metric.value}</strong> ${metric.label}<span class="card__subtitle">${metric.hint}</span>`;
      metricGrid.appendChild(chip);
    });
  }

  const suggestionTable = document.getElementById('suggestion-table');
  if (suggestionTable) {
    suggestionData.forEach((item) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${item.path}</td>
        <td>${item.score}</td>
        <td>${item.source}</td>
        <td>${new Date().toLocaleDateString('ru-RU')}</td>`;
      suggestionTable.appendChild(tr);
    });
  }

  const usersTable = document.getElementById('users-table');
  if (usersTable) {
    const users = [
      { email: 'admin@example.com', role: 'admin', name: 'Admin', status: 'Активен', created: '12.09.2024' },
      { email: 'worker@example.com', role: 'worker', name: 'Worker', status: 'Активен', created: '01.08.2024' },
      { email: 'askelwhite22@gmail.com', role: 'admin', name: 'Askel', status: 'Активен', created: '14.07.2024' },
    ];
    users.forEach((user) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${user.email}</td>
        <td>${user.role}</td>
        <td>${user.name}</td>
        <td>${user.status}</td>
        <td>${user.created}</td>
        <td class="table__actions">
          <button class="btn btn--sm">Изменить</button>
          <button class="btn btn--sm">Удалить</button>
        </td>`;
      usersTable.appendChild(tr);
    });
  }

  const autoSyncToggle = document.getElementById('auto-sync-toggle');
  autoSyncToggle?.addEventListener('change', (event) => {
    showToast(event.target.checked ? 'Автосинк включён' : 'Автосинк выключен', 'info');
  });

  const quickNote = app.querySelector('[data-quick-note]');
  quickNote?.addEventListener('focus', () => quickNote.select());
})();
