/* UI helpers and DOM manipulation functions */
const qs = s => document.querySelector(s);
function blobToB64(blob) { return new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result.split(',')[1]); fr.readAsDataURL(blob); }); }
function escape(t) { return t.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }

function addMsg(html, cls) { 
  const d = document.createElement('div'); 
  d.className = `msg ${cls}`; 
  d.innerHTML = html; 
  qs('#msgs').appendChild(d); 
  qs('#msgs').scrollTop = qs('#msgs').scrollHeight; 
  return d; 
}

/* column resizing */
function initializeColumnResizing() {
  const app = document.querySelector('.app');
  const chat = document.querySelector('.chat');
  let isResizing = false;
  let startX;
  let startWidth;

  chat.addEventListener('mousedown', (e) => {
    if (e.offsetX > chat.offsetWidth - 12) {
      isResizing = true;
      startX = e.pageX;
      startWidth = chat.offsetWidth;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }
  });

  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    let width = startWidth + (e.pageX - startX);
    width = Math.max(250, Math.min(500, width));
    chat.style.width = width + 'px';
    app.style.gridTemplateColumns = `${width}px 1fr`;
  });

  document.addEventListener('mouseup', () => {
    if (!isResizing) return;
    isResizing = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  });
}

/* Initialize scenes grid with placeholder cards */
function initializeScenesGrid() {
  const scenesGrid = qs('#scenesGrid');
  scenesGrid.innerHTML = '';
  
  // Show first 6 scene placeholders by default
  for(let i = 1; i <= 6; i++) {
    const card = document.createElement('div');
    card.className = 'scene-wrapper';
    card.id = `scene-${i}`;
    card.style.opacity = '0.5';
    
    card.innerHTML = `
      <div class="scene-header" style="margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 14px; font-weight: 600; color: var(--primary-text);">Scene ${i}</span>
        <button class="scene-regen-btn" data-scene="${i}" style="background: transparent; border: 1px solid var(--border-color); border-radius: 50%; width: 24px; height: 24px; padding: 0; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s ease;"><i class="fas fa-sync-alt" style="font-size: 10px; color: var(--secondary-text);"></i></button>
      </div>
      <div class="images">
        <div class="ph" id="ph-${i}-1">
          <div class="spin"></div>
          <img id="img-${i}-1" class="img">
          <button id="dl-${i}-1" class="dl" style="display:none;"><i class="fas fa-download"></i></button>
        </div>
        <div class="ph" id="ph-${i}-2">
          <div class="spin"></div>
          <img id="img-${i}-2" class="img">
          <button id="dl-${i}-2" class="dl" style="display:none;"><i class="fas fa-download"></i></button>
        </div>
      </div>
    `;
    
    scenesGrid.appendChild(card);
  }
}

function renderChips(){
  const wrap = qs('#chips');
  wrap.innerHTML = '';
  pending.forEach((f, i) => {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.innerHTML = `${escape(f.name)}<i class="fas fa-times" data-i="${i}"></i>`;
    chip.querySelector('i').onclick = e => {
      pending.splice(e.target.dataset.i, 1);
      renderChips();
    };
    wrap.appendChild(chip);
  });
}

const spin = (s, i, on) => { 
  const spinner = qs(`#ph-${s}-${i} .spin`); 
  if(spinner) spinner.style.visibility = on ? 'visible' : 'hidden';
};

const err = (s, i, m) => {
  spin(s, i, false);
  const ph = qs(`#ph-${s}-${i}`);
  ph.innerHTML = '';
  ph.classList.add('error-placeholder');
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = 'position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; padding: 10px; width: 90%;';
  errorDiv.textContent = m;
  ph.appendChild(errorDiv);
  console.error(`Error in scene ${s}, slot ${i}: ${m}`);
};

function show(s, i, u, p) {
  const img = qs(`#img-${s}-${i}`);
  const dl = qs(`#dl-${s}-${i}`);
  const ph = qs(`#ph-${s}-${i}`);

  // Clear any error state
  ph.classList.remove('error-placeholder');
  // Clear any text content without destroying elements
  const textNodes = Array.from(ph.childNodes).filter(node => node.nodeType === Node.TEXT_NODE || (node.nodeType === Node.ELEMENT_NODE && !node.classList.contains('spin') && !node.classList.contains('img') && !node.classList.contains('dl')));
  textNodes.forEach(node => node.remove());

  img.onload = () => {
    img.style.display = 'block';
    dl.style.display = 'block';
    ph.style.background = 'transparent';
  };
  dl.onclick = () => downloadOne(u, `scene${s}_${i}`, p);
  img.src = u;
  spin(s, i, false);

  // Store the generated image data
  if (!generatedImages[s]) {
    generatedImages[s] = { prompt: p, images: [] };
  }
  generatedImages[s].prompt = p; // Update prompt in case it changed
  // Remove any existing image for this slot
  generatedImages[s].images = generatedImages[s].images.filter(img => img.slot !== i);
  // Add the new image
  generatedImages[s].images.push({ url: u, slot: i });
}

function updateFileIndicator() {
  const indicator = qs('#uploadedFileIndicator');
  const files = [];
  if (adDescriptionFile) files.push(`Brief: ${adDescriptionFile.name}`);
  if (styleFile) files.push(`Style: ${styleFile.name}`);
  
  if (files.length > 0) {
    indicator.textContent = 'Uploaded files: ' + files.join(', ');
    indicator.style.display = 'block';
  } else {
    indicator.style.display = 'none';
  }
}