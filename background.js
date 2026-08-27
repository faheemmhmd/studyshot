async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.id) return;
  try {
    await ensureContentScript(tab.id);
    await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_TOOLBAR' });
  } catch (error) {
    console.warn('StudyShot could not open:', error);
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'open-studyshot') return;
  const tab = await getActiveTab();
  if (!tab?.id) return;
  try {
    await ensureContentScript(tab.id);
    await chrome.tabs.sendMessage(tab.id, { type: 'SHOW_TOOLBAR' });
  } catch (error) {
    console.warn('StudyShot shortcut failed:', error);
  }
});

async function ensureContentScript(tabId) {
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'PING' });
    return;
  } catch (_) {
    // Content script isn't present; inject it on demand.
  }

  await chrome.scripting.insertCSS({
    target: { tabId },
    files: ['content.css']
  }).catch(() => {});

  await chrome.scripting.executeScript({
    target: { tabId },
    files: ['content.js']
  });

  // Give the injected script a tiny moment to initialise its listener.
  await new Promise(resolve => setTimeout(resolve, 30));
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    if (msg.type === 'PING') {
      sendResponse({ ok: true });
      return;
    }

    if (msg.type === 'CAPTURE_VISIBLE') {
      const tabId = sender.tab?.id;
      const windowId = sender.tab?.windowId;
      if (tabId == null || windowId == null) throw new Error('No active browser tab.');

      // Hide the StudyShot root at the source of the capture. Opacity alone can
      // race Chrome's compositor, so we remove it from layout/rendering before
      // capture and restore the exact previous inline style afterwards.
      const hidden = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          const root = document.getElementById('studyshot-root');
          if (!root) return null;
          const previous = root.getAttribute('style');
          root.style.setProperty('display', 'none', 'important');
          root.style.setProperty('visibility', 'hidden', 'important');
          return previous;
        }
      });
      const previousStyle = hidden?.[0]?.result ?? null;

      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          func: () => new Promise(resolve => {
            requestAnimationFrame(() => requestAnimationFrame(resolve));
          })
        });

        const dataUrl = await chrome.tabs.captureVisibleTab(windowId, {
          format: 'jpeg',
          quality: 92
        });
        sendResponse({ ok: true, dataUrl });
      } finally {
        await chrome.scripting.executeScript({
          target: { tabId },
          args: [previousStyle],
          func: (style) => {
            const root = document.getElementById('studyshot-root');
            if (!root) return;
            if (style === null) root.removeAttribute('style');
            else root.setAttribute('style', style);
          }
        }).catch(() => {});
      }
      return;
    }

    if (msg.type === 'SAVE_PDF') {
      const images = Array.isArray(msg.images) ? msg.images : [];
      if (!images.length) {
        sendResponse({ ok: true, skipped: true });
        return;
      }
      if (images.length > 40) throw new Error('Too many screenshots for one PDF.');
      const pdf = buildPdf(images, msg.pdfFormat === 'a4' ? 'a4' : 'system');
      const url = 'data:application/pdf;base64,' + uint8ToBase64(pdf);
      const filename = makeFilename(msg.sessionName);
      const downloadId = await chrome.downloads.download({
        url,
        filename,
        saveAs: false,
        conflictAction: 'uniquify'
      });
      sendResponse({ ok: true, downloadId, filename });
      return;
    }

    throw new Error('Unknown StudyShot command.');
  })().catch(err => {
    console.error('StudyShot:', err);
    sendResponse({ ok: false, error: err.message || String(err) });
  });

  return true;
});

function makeFilename(sessionName) {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const safe = String(sessionName || '').trim()
    .replace(/[\\/:*?"<>|]+/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 80);
  return `${date}_${safe || 'notes'}.pdf`;
}

function buildPdf(images, pageFormat = 'system') {
  const objects = [];
  const pagesKids = [];
  const catalogId = 1;
  const pagesId = 2;
  let nextId = 3;

  const jpegInfo = images.map(dataUrl => {
    const comma = dataUrl.indexOf(',');
    if (comma === -1) throw new Error('Invalid screenshot data.');
    const bytes = base64ToUint8(dataUrl.slice(comma + 1));
    const { width, height } = getJpegSize(bytes);
    return { bytes, width, height };
  });

  for (const info of jpegInfo) {
    const pageId = nextId++;
    const imageId = nextId++;
    const contentId = nextId++;
    pagesKids.push(pageId);

    const ratio = info.width / info.height;
    let pageW, pageH, drawW, drawH, x, y;
    if (pageFormat === 'system') {
      // Preserve the screenshot's native aspect ratio and eliminate framing whitespace.
      // Scale the longer edge into a practical PDF size while keeping the exact ratio.
      const longEdge = 792;
      if (info.width >= info.height) {
        pageW = longEdge;
        pageH = pageW / ratio;
      } else {
        pageH = longEdge;
        pageW = pageH * ratio;
      }
      drawW = pageW;
      drawH = pageH;
      x = 0;
      y = 0;
    } else {
      // A4 portrait with a small, consistent margin for printable notes.
      pageW = 595.28;
      pageH = 841.89;
      const margin = 24;
      const usableW = pageW - margin * 2;
      const usableH = pageH - margin * 2;
      drawW = usableW;
      drawH = drawW / ratio;
      if (drawH > usableH) {
        drawH = usableH;
        drawW = drawH * ratio;
      }
      x = (pageW - drawW) / 2;
      y = (pageH - drawH) / 2;
    }

    objects[pageId] = `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /XObject << /Im${imageId} ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`;
    objects[imageId] = {
      stream: info.bytes,
      dict: `<< /Type /XObject /Subtype /Image /Width ${info.width} /Height ${info.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${info.bytes.length} >>`
    };
    const content = `q\n${drawW.toFixed(2)} 0 0 ${drawH.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm\n/Im${imageId} Do\nQ\n`;
    const contentBytes = new TextEncoder().encode(content);
    objects[contentId] = {
      stream: contentBytes,
      dict: `<< /Length ${contentBytes.length} >>`
    };
  }

  objects[catalogId] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId] = `<< /Type /Pages /Kids [${pagesKids.map(id => `${id} 0 R`).join(' ')}] /Count ${pagesKids.length} >>`;

  const chunks = [];
  const offsets = new Array(nextId).fill(0);
  let position = 0;
  const pushText = text => {
    const bytes = new TextEncoder().encode(text);
    chunks.push(bytes);
    position += bytes.length;
  };
  const pushBytes = bytes => {
    chunks.push(bytes);
    position += bytes.length;
  };

  pushText('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  for (let id = 1; id < nextId; id++) {
    offsets[id] = position;
    pushText(`${id} 0 obj\n`);
    const obj = objects[id];
    if (typeof obj === 'string') {
      pushText(obj + '\nendobj\n');
    } else {
      pushText(obj.dict + '\nstream\n');
      pushBytes(obj.stream);
      pushText('\nendstream\nendobj\n');
    }
  }

  const xrefOffset = position;
  pushText(`xref\n0 ${nextId}\n`);
  pushText('0000000000 65535 f \n');
  for (let id = 1; id < nextId; id++) {
    pushText(`${String(offsets[id]).padStart(10, '0')} 00000 n \n`);
  }
  pushText(`trailer\n<< /Size ${nextId} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(total);
  let p = 0;
  for (const chunk of chunks) {
    out.set(chunk, p);
    p += chunk.length;
  }
  return out;
}

function getJpegSize(bytes) {
  for (let i = 2; i < bytes.length - 9;) {
    if (bytes[i] !== 0xFF) { i++; continue; }
    const marker = bytes[i + 1];
    if (marker === 0xD8 || marker === 0xD9) { i += 2; continue; }
    if (i + 3 >= bytes.length) break;
    const len = (bytes[i + 2] << 8) | bytes[i + 3];
    if (marker >= 0xC0 && marker <= 0xC3) {
      return {
        height: (bytes[i + 5] << 8) | bytes[i + 6],
        width: (bytes[i + 7] << 8) | bytes[i + 8]
      };
    }
    if (len < 2) break;
    i += 2 + len;
  }
  throw new Error('Could not read JPEG dimensions.');
}

function base64ToUint8(b64) {
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

function uint8ToBase64(bytes) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
