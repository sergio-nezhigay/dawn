(function () {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  const PANEL_GAP = 16;
  const HI_RES_WIDTH = 1946;

  let lens = null;
  let panel = null;
  let panelImg = null;
  let activeImage = null;

  function toHiResSrc(src) {
    return src.replace(/([?&]width=)\d+/, '$1' + HI_RES_WIDTH);
  }

  function ensureLens(parent) {
    if (!lens) {
      lens = document.createElement('div');
      lens.className = 'image-magnify-lens';
      lens.setAttribute('aria-hidden', 'true');
    }
    if (lens.parentElement !== parent) parent.appendChild(lens);
  }

  function ensurePanel() {
    if (panel) return;
    panel = document.createElement('div');
    panel.className = 'image-magnify-zoom-panel';
    panel.setAttribute('aria-hidden', 'true');
    panelImg = document.createElement('img');
    panelImg.setAttribute('alt', '');
    panelImg.addEventListener('load', () => {
      if (activeImage && panel.style.display !== 'none') setLensSize(activeImage);
    });
    panel.appendChild(panelImg);
    document.body.appendChild(panel);
  }

  function positionPanel(image) {
    const mediaWrapper = image.closest('.product__media-wrapper');
    const infoWrapper = mediaWrapper && mediaWrapper.nextElementSibling;
    const imgRect = image.getBoundingClientRect();
    const wrapperRect = (mediaWrapper || image).getBoundingClientRect();
    const panelW = infoWrapper
      ? Math.max(150, infoWrapper.getBoundingClientRect().width - PANEL_GAP)
      : Math.max(150, window.innerWidth - wrapperRect.right - PANEL_GAP * 2);

    panel.style.left = (wrapperRect.right + window.scrollX + PANEL_GAP) + 'px';
    panel.style.top = (imgRect.top + window.scrollY) + 'px';
    panel.style.width = panelW + 'px';
    panel.style.height = imgRect.height + 'px';
  }

  function setLensSize(image) {
    const rect = image.getBoundingClientRect();
    const hiW = panelImg.naturalWidth || HI_RES_WIDTH;
    const hiH = panelImg.naturalHeight || Math.round(hiW * rect.height / rect.width);
    lens.style.width = Math.round(panel.offsetWidth * rect.width / hiW) + 'px';
    lens.style.height = Math.round(panel.offsetHeight * rect.height / hiH) + 'px';
  }

  function showZoom(image) {
    activeImage = image;
    ensureLens(image.parentElement);
    ensurePanel();

    const src = toHiResSrc(image.currentSrc || image.src);
    if (panelImg.dataset.activeSrc !== src) {
      panelImg.dataset.activeSrc = src;
      panelImg.src = src;
    }

    // Show panel first so offsetWidth is readable for setLensSize
    positionPanel(image);
    panel.style.display = 'block';
    lens.style.display = 'block';
    setLensSize(image);
  }

  function hideZoom() {
    if (lens) lens.style.display = 'none';
    if (panel) panel.style.display = 'none';
    activeImage = null;
  }

  // Delegated mouseover: works for images added dynamically (quick-add, etc.)
  document.addEventListener('mouseover', (e) => {
    const img = e.target.closest && e.target.closest('.image-magnify-hover');
    if (img) showZoom(img);
  });

  // Delegated mousemove: reposition panel on every move (handles scroll drift)
  document.addEventListener('mousemove', (e) => {
    if (!activeImage || !panel || panel.style.display === 'none') return;

    positionPanel(activeImage);

    const rect = activeImage.getBoundingClientRect();
    const lensW = lens.offsetWidth;
    const lensH = lens.offsetHeight;
    const lensX = Math.max(0, Math.min(e.clientX - rect.left - lensW / 2, rect.width - lensW));
    const lensY = Math.max(0, Math.min(e.clientY - rect.top - lensH / 2, rect.height - lensH));

    lens.style.left = lensX + 'px';
    lens.style.top = lensY + 'px';

    const hiW = panelImg.naturalWidth || HI_RES_WIDTH;
    const hiH = panelImg.naturalHeight || Math.round(hiW * rect.height / rect.width);
    const cx = lensX + lensW / 2;
    const cy = lensY + lensH / 2;
    const pW = panel.offsetWidth;
    const pH = panel.offsetHeight;

    panelImg.style.left = Math.min(0, Math.max(pW - hiW, -(cx * hiW / rect.width - pW / 2))) + 'px';
    panelImg.style.top = Math.min(0, Math.max(pH - hiH, -(cy * hiH / rect.height - pH / 2))) + 'px';
  });

  // Delegated mouseout: hide only when leaving the image (not entering a child)
  document.addEventListener('mouseout', (e) => {
    if (!activeImage) return;
    const img = e.target.closest && e.target.closest('.image-magnify-hover');
    if (img && !img.contains(e.relatedTarget)) hideZoom();
  });
})();
