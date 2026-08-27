(() => {
  const ICONS = {
    full: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="2"/><path d="M8 5V3M16 5V3M4 9h16M8 13h3M8 16h6"/></svg>`,
    area: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"/><rect x="8" y="8" width="8" height="8" rx="1"/></svg>`,
    panel: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/></svg>`,
    close: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>`,
    trash: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>`,
    grip: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="7" r="1.2"/><circle cx="16" cy="7" r="1.2"/><circle cx="8" cy="12" r="1.2"/><circle cx="16" cy="12" r="1.2"/><circle cx="8" cy="17" r="1.2"/><circle cx="16" cy="17" r="1.2"/></svg>`,
    check: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4 4L19 7"/></svg>`,
    chevron: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 10l4 4 4-4"/></svg>`,
    file: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h4M9 13h6M9 17h6"/></svg>`
  };

  let root, toolbar, tray, list, selectBox, hint, toast;
  let screenshots = [];
  let selectionMode = false;
  let startX = 0, startY = 0;
  let draggedIndex = null;
  let toastTimer = null;
  let trayVisible = true;
  let pdfFormat = 'system';

  function ensureUi() {
    if (root) return;
    root = document.createElement('div');
    root.id = 'studyshot-root';
    root.innerHTML = `
      <div id="studyshot-toolbar" class="ss-hidden">
        <div class="ss-brand">
          <div class="ss-logo">S</div>
          <div><div class="ss-brand-name">StudyShot</div><div class="ss-brand-sub">Study capture</div></div>
        </div>
        <div class="ss-toolbar-actions">
          <button class="ss-tool" data-action="full" aria-label="Capture visible tab" title="Capture visible tab">${ICONS.full}<span>Visible</span></button>
          <button class="ss-tool" data-action="area" aria-label="Select an area" title="Select an area">${ICONS.area}<span>Area</span></button>
          <div class="ss-divider"></div>
          <button class="ss-icon-btn" data-action="toggleTray" aria-label="Hide capture panel" title="Hide/show capture panel">${ICONS.panel}</button>
          <button class="ss-icon-btn ss-quit" data-action="close" aria-label="Finish and save" title="Finish and save">${ICONS.close}</button>
        </div>
      </div>

      <aside id="studyshot-tray" class="ss-hidden" aria-label="Captured screenshots">
        <header class="ss-tray-head">
          <div>
            <div class="ss-tray-title">Capture tray</div>
            <div class="ss-tray-count"><span id="ss-count">0</span> captures · arranged for PDF</div>
          </div>
          <button class="ss-icon-btn" data-action="close" aria-label="Finish and save" title="Finish and save">${ICONS.check}</button>
        </header>
        <div id="studyshot-list"></div>
        <div id="studyshot-empty" class="ss-empty">
          <div class="ss-empty-icon">${ICONS.file}</div>
          <strong>Your notes will appear here</strong>
          <span>Capture a lecture slide or select an important part of the page.</span>
        </div>
        <footer class="ss-tray-foot">
          <div class="ss-format-row"><div><div class="ss-format-label">PDF page</div><div class="ss-format-sub">Choose how each capture is placed</div></div><div class="ss-segment" role="group" aria-label="PDF page format"><button type="button" class="ss-seg active" data-format="system">System</button><button type="button" class="ss-seg" data-format="a4">A4</button></div></div>
          <div class="ss-name-row"><label for="ss-session-name">PDF name</label><input id="ss-session-name" maxlength="80" placeholder="Lecture notes" autocomplete="off"></div>
          <div class="ss-foot-hint">Drag to reorder · Delete to remove</div>
          <button class="ss-save" data-action="close"><span>Finish & Save PDF</span><b>${ICONS.chevron}</b></button>
        </footer>
      </aside>

      <div id="studyshot-select"></div>
      <div id="studyshot-hint">Drag to select an area <span>•</span> Esc to cancel</div>
      <div id="studyshot-toast" role="status"></div>`;
    document.documentElement.appendChild(root);

    toolbar = root.querySelector('#studyshot-toolbar');
    tray = root.querySelector('#studyshot-tray');
    list = root.querySelector('#studyshot-list');
    selectBox = root.querySelector('#studyshot-select');
    hint = root.querySelector('#studyshot-hint');
    toast = root.querySelector('#studyshot-toast');

    root.addEventListener('click', async (e) => {
      const button = e.target.closest('[data-action]');
      if (!button) return;
      const action = button.dataset.action;
      if (action === 'full') await captureFull();
      if (action === 'area') startAreaCapture();
      if (action === 'toggleTray') toggleTray();
      if (action === 'close') await finishSession();
    });

    list.addEventListener('click', (e) => {
      const del = e.target.closest('[data-delete]');
      if (!del) return;
      deleteScreenshot(Number(del.dataset.delete));
    });

    root.addEventListener('click', (e) => {
      const formatBtn = e.target.closest('[data-format]');
      if (!formatBtn) return;
      pdfFormat = formatBtn.dataset.format === 'a4' ? 'a4' : 'system';
      root.querySelectorAll('[data-format]').forEach(btn => btn.classList.toggle('active', btn === formatBtn));
      notify(pdfFormat === 'a4' ? 'A4 portrait selected' : 'System page size selected', 1200);
    });

    list.addEventListener('dragstart', (e) => {
      const card = e.target.closest('[data-index]');
      if (!card) return;
      draggedIndex = Number(card.dataset.index);
      card.classList.add('ss-dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(draggedIndex));
    });
    list.addEventListener('dragover', (e) => {
      const card = e.target.closest('[data-index]');
      if (!card || draggedIndex === null) return;
      e.preventDefault();
      card.classList.add('ss-drag-over');
    });
    list.addEventListener('dragleave', (e) => {
      const card = e.target.closest('[data-index]');
      if (card) card.classList.remove('ss-drag-over');
    });
    list.addEventListener('drop', (e) => {
      const card = e.target.closest('[data-index]');
      if (!card || draggedIndex === null) return;
      e.preventDefault();
      const targetIndex = Number(card.dataset.index);
      reorderScreenshots(draggedIndex, targetIndex);
    });
    list.addEventListener('dragend', () => {
      draggedIndex = null;
      list.querySelectorAll('.ss-dragging,.ss-drag-over').forEach(el => el.classList.remove('ss-dragging', 'ss-drag-over'));
    });
  }

  function showSessionUi() {
    ensureUi();
    toolbar.classList.remove('ss-hidden');
    if (trayVisible) tray.classList.remove('ss-hidden'); else tray.classList.add('ss-hidden');
    updateTrayButton();
    renderList();
  }

  function toggleTray() {
    ensureUi();
    trayVisible = !trayVisible;
    tray.classList.toggle('ss-hidden', !trayVisible);
    updateTrayButton();
  }

  function updateTrayButton() {
    const btn = root?.querySelector('[data-action="toggleTray"]');
    if (!btn) return;
    btn.setAttribute('aria-label', trayVisible ? 'Hide capture panel' : 'Show capture panel');
    btn.title = trayVisible ? 'Hide capture panel' : 'Show capture panel';
  }

  function hideSessionUi() {
    if (!root) return;
    toolbar.classList.add('ss-hidden');
    tray.classList.add('ss-hidden');
    if (selectionMode) cancelSelection();
  }

  function temporarilyHideUi() {
    toolbar?.classList.add('ss-capture-hidden');
    tray?.classList.add('ss-capture-hidden');
    hint?.classList.add('ss-capture-hidden');
    selectBox?.classList.add('ss-capture-hidden');
  }
  function restoreUi() {
    toolbar?.classList.remove('ss-capture-hidden');
    tray?.classList.remove('ss-capture-hidden');
    hint?.classList.remove('ss-capture-hidden');
    selectBox?.classList.remove('ss-capture-hidden');
  }

  function notify(text, duration = 1800) {
    ensureUi();
    clearTimeout(toastTimer);
    toast.textContent = text;
    toast.classList.add('ss-show');
    toastTimer = setTimeout(() => toast.classList.remove('ss-show'), duration);
  }

  async function captureFull() {
    ensureUi();
    temporarilyHideUi();
    await sleep(45);
    let res;
    try {
      res = await chrome.runtime.sendMessage({ type: 'CAPTURE_VISIBLE' });
    } finally {
      restoreUi();
    }
    if (!res?.ok) return notify(res?.error || 'Capture failed');
    addScreenshot(res.dataUrl, 'Visible tab');
    notify(`Captured · ${screenshots.length} ${screenshots.length === 1 ? 'page' : 'pages'}`);
  }

  function startAreaCapture() {
    ensureUi();
    if (selectionMode) return;
    selectionMode = true;
    temporarilyHideUi();
    hint.classList.remove('ss-capture-hidden');
    hint.classList.add('ss-show');
    document.body.style.userSelect = 'none';
    document.documentElement.style.cursor = 'crosshair';
    window.addEventListener('mousedown', onMouseDown, true);
    window.addEventListener('mousemove', onMouseMove, true);
    window.addEventListener('mouseup', onMouseUp, true);
    window.addEventListener('keydown', onKeyDown, true);
  }

  function onMouseDown(e) {
    if (e.button !== 0) return;
    startX = e.clientX;
    startY = e.clientY;
    selectBox.style.left = `${startX}px`;
    selectBox.style.top = `${startY}px`;
    selectBox.style.width = '0px';
    selectBox.style.height = '0px';
    selectBox.classList.add('ss-active');
    e.preventDefault();
  }

  function onMouseMove(e) {
    if (!selectBox.classList.contains('ss-active')) return;
    const x = Math.min(startX, e.clientX);
    const y = Math.min(startY, e.clientY);
    const w = Math.abs(e.clientX - startX);
    const h = Math.abs(e.clientY - startY);
    selectBox.style.left = `${x}px`;
    selectBox.style.top = `${y}px`;
    selectBox.style.width = `${w}px`;
    selectBox.style.height = `${h}px`;
  }

  async function onMouseUp(e) {
    if (!selectBox.classList.contains('ss-active')) return;
    const x = Math.min(startX, e.clientX);
    const y = Math.min(startY, e.clientY);
    const width = Math.abs(e.clientX - startX);
    const height = Math.abs(e.clientY - startY);
    cancelSelection();
    if (width < 6 || height < 6) {
      showSessionUi();
      notify('Selection too small');
      return;
    }

    temporarilyHideUi();
    await sleep(35);
    let res;
    try {
      res = await chrome.runtime.sendMessage({ type: 'CAPTURE_VISIBLE' });
    } finally {
      restoreUi();
    }
    if (!res?.ok) {
      showSessionUi();
      return notify(res?.error || 'Capture failed');
    }
    try {
      const cropped = await cropDataUrl(res.dataUrl, x, y, width, height);
      addScreenshot(cropped, 'Selected area');
      notify(`Captured area · ${screenshots.length} total`);
    } catch (err) {
      notify(err.message || 'Could not crop selection');
    }
    showSessionUi();
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      cancelSelection();
      showSessionUi();
      notify('Selection cancelled', 1200);
    }
  }

  function cancelSelection() {
    selectionMode = false;
    selectBox?.classList.remove('ss-active');
    hint?.classList.remove('ss-show');
    document.body.style.userSelect = '';
    document.documentElement.style.cursor = '';
    window.removeEventListener('mousedown', onMouseDown, true);
    window.removeEventListener('mousemove', onMouseMove, true);
    window.removeEventListener('mouseup', onMouseUp, true);
    window.removeEventListener('keydown', onKeyDown, true);
  }

  function cropDataUrl(dataUrl, x, y, w, h) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const sx = Math.round(x * devicePixelRatio);
        const sy = Math.round(y * devicePixelRatio);
        const sw = Math.max(1, Math.round(w * devicePixelRatio));
        const sh = Math.max(1, Math.round(h * devicePixelRatio));
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(sw, img.width - sx);
        canvas.height = Math.min(sh, img.height - sy);
        if (canvas.width <= 0 || canvas.height <= 0) return reject(new Error('Selection is outside the captured image.'));
        const ctx = canvas.getContext('2d', { alpha: false });
        ctx.drawImage(img, sx, sy, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.92));
      };
      img.onerror = () => reject(new Error('Could not crop screenshot.'));
      img.src = dataUrl;
    });
  }

  function addScreenshot(dataUrl, label) {
    if (screenshots.length >= 40) {
      notify('Maximum 40 screenshots per PDF', 2200);
      return;
    }
    screenshots.push({ dataUrl, label, id: crypto.randomUUID() });
    showSessionUi();
  }

  function deleteScreenshot(index) {
    if (index < 0 || index >= screenshots.length) return;
    screenshots.splice(index, 1);
    renderList();
    notify(screenshots.length ? `Removed screenshot ${index + 1}` : 'Capture tray cleared', 1400);
  }

  function reorderScreenshots(from, to) {
    if (from === to || from == null || to == null) return;
    const [item] = screenshots.splice(from, 1);
    screenshots.splice(to, 0, item);
    renderList();
  }

  function renderList() {
    ensureUi();
    root.querySelector('#ss-count').textContent = String(screenshots.length);
    root.querySelector('#studyshot-empty').style.display = screenshots.length ? 'none' : 'flex';
    list.innerHTML = screenshots.map((shot, index) => `
      <article class="ss-card" data-index="${index}" draggable="true">
        <div class="ss-card-grip" title="Drag to reorder">${ICONS.grip}</div>
        <div class="ss-card-num">${String(index + 1).padStart(2, '0')}</div>
        <div class="ss-thumb-wrap"><img src="${shot.dataUrl}" class="ss-thumb" draggable="false" alt="Screenshot ${index + 1}"></div>
        <div class="ss-card-meta"><strong>${escapeHtml(shot.label)}</strong><span>Page ${index + 1}</span></div>
        <button class="ss-delete" data-delete="${index}" aria-label="Delete screenshot ${index + 1}" title="Delete">${ICONS.trash}</button>
      </article>`).join('');
  }

  function escapeHtml(text) {
    return String(text).replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  }

  async function finishSession() {
    ensureUi();
    if (!screenshots.length) {
      hideSessionUi();
      return;
    }
    const images = screenshots.map(s => s.dataUrl);
    const sessionName = root.querySelector('#ss-session-name')?.value?.trim() || '';
    hideSessionUi();
    notify('Preparing your study PDF…', 4000);
    const res = await chrome.runtime.sendMessage({ type: 'SAVE_PDF', images, sessionName, pdfFormat });
    if (res?.ok) {
      screenshots = [];
      const nameInput = root.querySelector('#ss-session-name');
      if (nameInput) nameInput.value = '';
      renderList();
      notify(`Saved · ${res.filename}`, 2800);
    } else {
      showSessionUi();
      notify(res?.error || 'Could not save PDF', 2800);
    }
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'PING') return;
    if (msg.type === 'SHOW_TOOLBAR') { ensureUi(); showSessionUi(); return; }
    if (msg.type !== 'TOGGLE_TOOLBAR') return;
    ensureUi();
    const isOpen = !toolbar.classList.contains('ss-hidden');
    if (isOpen) {
      if (screenshots.length) finishSession();
      else hideSessionUi();
    } else {
      showSessionUi();
    }
  });
})();
