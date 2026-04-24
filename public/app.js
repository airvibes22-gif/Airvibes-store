'use strict';

const PHONE = '573150013127';
const STORAGE_KEYS = {
  cart: 'airvibes_cart_v1',
  favorites: 'airvibes_favorites_v1'
};

const CATEGORY_META = {
  select: { label: 'Select', brand: 'SELECT', tag: 'ORIGINALES', color: '#D4AF37' },
  lab: { label: 'Lab', brand: 'LAB', tag: 'IMPORTADOS', color: '#ff5a1f' },
  essentials: { label: 'Essentials', brand: 'ESSENTIALS', tag: 'CALIDAD NACIONAL', color: '#A8A9AD' }
};

const STATUS_META = {
  available: 'Disponible',
  last_unit: 'Última unidad',
  reserved: 'Reservado',
  sold: 'Vendido'
};

const currency = new Intl.NumberFormat('es-CO');

const state = {
  admin: null,
  products: [],
  currentProduct: null,
  section: 'store',
  category: 'lab',
  categoryFilter: 'all',
  quickFilter: 'all',
  format: 'post',
  cart: loadLocal(STORAGE_KEYS.cart, []),
  favorites: new Set(loadLocal(STORAGE_KEYS.favorites, [])),
  editingProductId: null,
  editingExistingImages: [],
  previewObjectUrl: null
};

const dom = {
  loginOverlay: byId('loginOverlay'),
  loginForm: byId('loginForm'),
  loginEmail: byId('loginEmail'),
  loginPassword: byId('loginPassword'),
  loginError: byId('loginError'),
  continueStoreBtn: byId('continueStoreBtn'),
  tabStudio: byId('tabStudio'),
  tabStore: byId('tabStore'),
  openAdminBtn: byId('openAdminBtn'),
  logoutBtn: byId('logoutBtn'),
  sessionInfo: byId('sessionInfo'),
  studioSection: byId('studioSection'),
  storeSection: byId('storeSection'),
  requestStudioBtn: byId('requestStudioBtn'),
  goStoreBtn: byId('goStoreBtn'),
  saveProductBtn: byId('saveProductBtn'),
  cancelEditBtn: byId('cancelEditBtn'),
  clearStudioBtn: byId('clearStudioBtn'),
  downloadDesignBtn: byId('downloadDesignBtn'),
  copyWhatsBtn: byId('copyWhatsBtn'),
  copyCaptionBtn: byId('copyCaptionBtn'),
  captureTarget: byId('captureTarget'),
  previewImg: byId('previewImg'),
  previewCategoryBrand: byId('previewCategoryBrand'),
  previewTag: byId('previewTag'),
  previewPrice: byId('previewPrice'),
  previewSize: byId('previewSize'),
  previewStatus: byId('previewStatus'),
  previewName: byId('previewName'),
  previewCopyText: byId('previewCopyText'),
  formatPostBtn: byId('formatPostBtn'),
  formatStoryBtn: byId('formatStoryBtn'),
  categorySelectBtn: byId('categorySelectBtn'),
  categoryLabBtn: byId('categoryLabBtn'),
  categoryEssentialsBtn: byId('categoryEssentialsBtn'),
  productName: byId('productName'),
  productPrice: byId('productPrice'),
  productSizes: byId('productSizes'),
  productStatus: byId('productStatus'),
  productCopy: byId('productCopy'),
  imgMain: byId('imgMain'),
  img2: byId('img2'),
  img3: byId('img3'),
  cost: byId('cost'),
  ship: byId('ship'),
  extra: byId('extra'),
  metricSale: byId('metricSale'),
  metricProfit: byId('metricProfit'),
  metricMargin: byId('metricMargin'),
  studioFeedback: byId('studioFeedback'),
  storeHome: byId('storeHome'),
  storeGrid: byId('storeGrid'),
  emptyStore: byId('emptyStore'),
  cartList: byId('cartList'),
  clearCartBtn: byId('clearCartBtn'),
  checkoutCartBtn: byId('checkoutCartBtn'),
  productViewer: byId('productViewer'),
  backToStoreBtn: byId('backToStoreBtn'),
  mainViewerImg: byId('mainViewerImg'),
  thumbs: byId('thumbs'),
  viewerBadges: byId('viewerBadges'),
  viewerName: byId('viewerName'),
  viewerPrice: byId('viewerPrice'),
  viewerCopy: byId('viewerCopy'),
  viewerSize: byId('viewerSize'),
  viewerViews: byId('viewerViews'),
  buyNowBtn: byId('buyNowBtn'),
  addCurrentToCartBtn: byId('addCurrentToCartBtn'),
  copyCurrentLinkBtn: byId('copyCurrentLinkBtn'),
  toggleFavCurrentBtn: byId('toggleFavCurrentBtn'),
  adminViewerActions: byId('adminViewerActions'),
  editCurrentBtn: byId('editCurrentBtn'),
  deleteCurrentBtn: byId('deleteCurrentBtn')
};

function byId(id) {
  return document.getElementById(id);
}

function createEl(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function loadLocal(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveLocal(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function readCookie(name) {
  const parts = document.cookie ? document.cookie.split('; ') : [];
  for (const part of parts) {
    const [cookieName, ...rest] = part.split('=');
    if (cookieName === name) return decodeURIComponent(rest.join('='));
  }
  return '';
}

function money(value) {
  const amount = typeof value === 'number' ? value : numeric(value);
  const sign = amount < 0 ? '-' : '';
  return `${sign}$${currency.format(Math.abs(amount))}`;
}

function numeric(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  return Number(digits || 0);
}

function parseSizes(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function setAccent(category) {
  document.documentElement.style.setProperty('--accent', CATEGORY_META[category].color);
}

function statusLabel(status) {
  return STATUS_META[status] || 'Disponible';
}

function categoryLabel(category) {
  return CATEGORY_META[category]?.label || 'Lab';
}

function categoryBrand(category) {
  return CATEGORY_META[category]?.brand || 'LAB';
}

function categoryTag(category) {
  return CATEGORY_META[category]?.tag || 'IMPORTADOS';
}

function isInStock(product) {
  return product.status !== 'sold';
}

function isNewProduct(product) {
  const age = Date.now() - new Date(product.createdAt).getTime();
  return age <= 7 * 24 * 60 * 60 * 1000;
}

function updateFavoritesStorage() {
  saveLocal(STORAGE_KEYS.favorites, Array.from(state.favorites));
}

function updateCartStorage() {
  saveLocal(STORAGE_KEYS.cart, state.cart);
}

function syncSessionUi() {
  const adminMode = Boolean(state.admin);
  dom.tabStudio.classList.toggle('hidden', !adminMode);
  dom.openAdminBtn.classList.toggle('hidden', adminMode);
  dom.logoutBtn.classList.toggle('hidden', !adminMode);
  dom.sessionInfo.textContent = adminMode ? `Admin: ${state.admin.email}` : 'Modo público';
  dom.adminViewerActions.classList.toggle('hidden', !adminMode);
}

function setSection(section) {
  state.section = section;
  const isStudio = section === 'studio';
  dom.studioSection.classList.toggle('hidden', !isStudio);
  dom.storeSection.classList.toggle('hidden', isStudio);
  dom.tabStudio.classList.toggle('active', isStudio);
  dom.tabStore.classList.toggle('active', !isStudio);
  if (!isStudio) {
    renderStore();
  }
}

function showLogin() {
  dom.loginOverlay.classList.remove('hidden');
  dom.loginError.classList.add('hidden');
  dom.loginPassword.value = '';
  dom.loginEmail.focus();
}

function hideLogin() {
  dom.loginOverlay.classList.add('hidden');
  dom.loginError.classList.add('hidden');
}

async function api(path, options = {}) {
  const method = options.method || 'GET';
  const headers = new Headers(options.headers || {});
  const config = {
    method,
    credentials: 'same-origin',
    headers
  };

  if (options.body !== undefined) {
    if (options.isForm) {
      config.body = options.body;
    } else {
      headers.set('Content-Type', 'application/json');
      config.body = JSON.stringify(options.body);
    }
  }

  if (method !== 'GET' && method !== 'HEAD') {
    const csrf = readCookie('airvibes_csrf');
    if (csrf) headers.set('x-csrf-token', csrf);
  }

  const response = await fetch(path, config);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'Ocurrió un error.');
  }

  return data;
}

function setStudioMessage(message, isError = false) {
  dom.studioFeedback.textContent = message;
  dom.studioFeedback.style.color = isError ? 'var(--red)' : '';
}

function setViewerMessage(message) {
  dom.viewerViews.textContent = message;
}

async function checkAuth() {
  try {
    const data = await api('/api/auth/me');
    state.admin = data.authenticated ? data.user : null;
  } catch {
    state.admin = null;
  }
  syncSessionUi();
}

async function loginAdmin(event) {
  event.preventDefault();
  dom.loginError.classList.add('hidden');

  try {
    const payload = {
      email: dom.loginEmail.value.trim(),
      password: dom.loginPassword.value
    };

    const data = await api('/api/auth/login', {
      method: 'POST',
      body: payload
    });

    state.admin = data.user;
    syncSessionUi();
    hideLogin();
    setSection('studio');
    setStudioMessage('Sesión iniciada. Ya puedes crear y editar productos.');
  } catch (error) {
    dom.loginError.textContent = error.message;
    dom.loginError.classList.remove('hidden');
  }
}

async function logoutAdmin() {
  try {
    await api('/api/auth/logout', { method: 'POST' });
  } catch (error) {
    console.error(error);
  }

  state.admin = null;
  syncSessionUi();
  setSection('store');
  setStudioMessage('Sesión cerrada.');
}

function ensureAdmin() {
  if (!state.admin) {
    showLogin();
    throw new Error('Necesitas iniciar sesión como admin.');
  }
}

function setFormat(format) {
  state.format = format;
  dom.captureTarget.classList.toggle('canvas-post', format === 'post');
  dom.captureTarget.classList.toggle('canvas-story', format === 'story');
  dom.formatPostBtn.classList.toggle('btn-accent', format === 'post');
  dom.formatStoryBtn.classList.toggle('btn-accent', format === 'story');
}

function setStudioCategory(category) {
  state.category = category;
  setAccent(category);
  dom.categorySelectBtn.classList.toggle('active', category === 'select');
  dom.categoryLabBtn.classList.toggle('active', category === 'lab');
  dom.categoryEssentialsBtn.classList.toggle('active', category === 'essentials');
  updatePreview();
}

function updatePreviewImage(url) {
  if (state.previewObjectUrl && state.previewObjectUrl.startsWith('blob:')) {
    URL.revokeObjectURL(state.previewObjectUrl);
  }
  state.previewObjectUrl = url || null;

  if (!url) {
    dom.previewImg.removeAttribute('src');
    dom.previewImg.classList.add('hidden');
    return;
  }

  dom.previewImg.src = url;
  dom.previewImg.classList.remove('hidden');
}

function currentPreviewSource() {
  const file = dom.imgMain.files?.[0];
  if (file) {
    return URL.createObjectURL(file);
  }

  if (state.editingExistingImages.length > 0) {
    return state.editingExistingImages[0];
  }

  return '';
}

function updatePreview() {
  const sizes = parseSizes(dom.productSizes.value);
  const sale = numeric(dom.productPrice.value);
  const cost = numeric(dom.cost.value);
  const ship = numeric(dom.ship.value);
  const extra = numeric(dom.extra.value);
  const profit = sale - cost - ship - extra;
  const margin = sale ? Math.round((profit / sale) * 100) : 0;
  const previewSource = currentPreviewSource();

  dom.previewCategoryBrand.textContent = categoryBrand(state.category);
  dom.previewTag.textContent = categoryTag(state.category);
  dom.previewName.textContent = dom.productName.value.trim() || 'MODELO AIRVIBES';
  dom.previewPrice.textContent = money(sale);
  dom.previewSize.textContent = sizes[0] || 'Talla por confirmar';
  dom.previewStatus.textContent = statusLabel(dom.productStatus.value || 'available');
  dom.previewCopyText.textContent = dom.productCopy.value.trim() || 'Compra por DM o WhatsApp · Envíos nacionales';
  dom.metricSale.textContent = money(sale);
  dom.metricProfit.textContent = money(profit);
  dom.metricProfit.style.color = profit > 0 ? 'var(--green)' : profit < 0 ? 'var(--red)' : '#fff';
  dom.metricMargin.textContent = `${margin}%`;
  dom.metricMargin.style.color = margin > 0 ? 'var(--green)' : margin < 0 ? 'var(--red)' : '#fff';
  updatePreviewImage(previewSource);
}

function clearStudio() {
  dom.productName.value = '';
  dom.productPrice.value = '';
  dom.productSizes.value = '';
  dom.productStatus.value = 'available';
  dom.productCopy.value = '';
  dom.imgMain.value = '';
  dom.img2.value = '';
  dom.img3.value = '';
  dom.cost.value = '';
  dom.ship.value = '';
  dom.extra.value = '';
  state.editingProductId = null;
  state.editingExistingImages = [];
  dom.saveProductBtn.textContent = 'Guardar en Store';
  dom.cancelEditBtn.classList.add('hidden');
  updatePreviewImage('');
  setStudioCategory('lab');
  setFormat('post');
  updatePreview();
  setStudioMessage('Studio limpio.');
}

function buildStudioPayload() {
  const name = dom.productName.value.trim();
  const price = numeric(dom.productPrice.value);

  if (!name) {
    throw new Error('Ingresa el nombre del producto.');
  }

  if (!price) {
    throw new Error('Ingresa un precio válido.');
  }

  return {
    category: state.category,
    name,
    price,
    sizes: parseSizes(dom.productSizes.value),
    status: dom.productStatus.value,
    copy: dom.productCopy.value.trim(),
    isPublished: true
  };
}

function selectedImageFiles() {
  return [dom.imgMain.files?.[0], dom.img2.files?.[0], dom.img3.files?.[0]].filter(Boolean);
}

async function uploadImages(files) {
  const form = new FormData();
  files.forEach((file) => form.append('images', file));
  const data = await api('/api/uploads/images', {
    method: 'POST',
    body: form,
    isForm: true
  });
  return data.files.map((file) => file.url);
}

async function saveProduct() {
  try {
    ensureAdmin();
    const payload = buildStudioPayload();
    const files = selectedImageFiles();
    let images = state.editingExistingImages.slice();

    if (files.length > 0) {
      setStudioMessage('Subiendo imágenes...');
      images = await uploadImages(files);
    }

    if (!images.length) {
      throw new Error('Sube al menos una imagen.');
    }

    payload.images = images;

    let data;
    if (state.editingProductId) {
      setStudioMessage('Guardando cambios...');
      data = await api(`/api/products/${encodeURIComponent(state.editingProductId)}`, {
        method: 'PUT',
        body: payload
      });
    } else {
      setStudioMessage('Publicando producto...');
      data = await api('/api/products', {
        method: 'POST',
        body: payload
      });
    }

    await loadProducts();
    const saved = data.item;
    clearStudio();
    setSection('store');
    setStudioMessage('Producto guardado correctamente.');
    await openProduct(saved.slug, { countView: false, syncUrl: true });
  } catch (error) {
    setStudioMessage(error.message, true);
  }
}

function buildStudioWhatsText() {
  const name = dom.productName.value.trim() || 'MODELO AIRVIBES';
  const price = money(numeric(dom.productPrice.value));
  const sizes = parseSizes(dom.productSizes.value).join(', ') || 'Por confirmar';
  const status = statusLabel(dom.productStatus.value || 'available');

  return [
    'Hola, quiero este producto de AirVibes:',
    '',
    name,
    price,
    `Categoría: ${categoryLabel(state.category)}`,
    `Tallas: ${sizes}`,
    `Estado: ${status}`
  ].join('\n');
}

function buildStudioCaption() {
  const name = dom.productName.value.trim() || 'MODELO AIRVIBES';
  const price = money(numeric(dom.productPrice.value));
  const sizes = parseSizes(dom.productSizes.value).join(', ') || 'Por confirmar';
  const status = statusLabel(dom.productStatus.value || 'available');
  const copy = dom.productCopy.value.trim() || 'Compra por DM o WhatsApp · Envíos nacionales';
  const hashCategory = categoryLabel(state.category).replace(/\s+/g, '');

  return [
    name,
    price,
    categoryTag(state.category),
    `Tallas: ${sizes}`,
    `Estado: ${status}`,
    '',
    copy,
    '',
    `#AirVibes #Sneakers #${hashCategory}`
  ].join('\n');
}

async function copyText(text, successMessage) {
  await navigator.clipboard.writeText(text);
  setStudioMessage(successMessage);
}

async function downloadDesign() {
  if (!window.html2canvas) {
    setStudioMessage('html2canvas no está disponible en este momento.', true);
    return;
  }

  const canvas = await window.html2canvas(dom.captureTarget, {
    backgroundColor: null,
    scale: 2,
    useCORS: true
  });

  const link = document.createElement('a');
  link.download = `airvibes-${state.format}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
  setStudioMessage('Diseño descargado.');
}

function productMatchesQuickFilter(product) {
  if (state.quickFilter === 'all') return true;
  if (state.quickFilter === 'stock') return isInStock(product);
  if (state.quickFilter === 'fav') return state.favorites.has(product.slug);
  if (state.quickFilter === 'new') return isNewProduct(product);
  return true;
}

function filteredProducts() {
  return state.products.filter((product) => {
    const categoryOk = state.categoryFilter === 'all' || product.category === state.categoryFilter;
    return categoryOk && productMatchesQuickFilter(product);
  });
}

function syncFilterButtons() {
  document.querySelectorAll('[data-category-filter]').forEach((button) => {
    button.classList.toggle('active', button.dataset.categoryFilter === state.categoryFilter);
  });

  document.querySelectorAll('[data-quick-filter]').forEach((button) => {
    button.classList.toggle('active', button.dataset.quickFilter === state.quickFilter);
  });
}

async function loadProducts() {
  const data = await api('/api/products');
  state.products = data.items;
  renderStore();
}

function updateProductInState(product) {
  const index = state.products.findIndex((item) => item.id === product.id);
  if (index >= 0) {
    state.products[index] = product;
  } else {
    state.products.unshift(product);
  }
}

function removeProductFromState(id) {
  state.products = state.products.filter((item) => item.id !== id);
}

function renderStore() {
  syncFilterButtons();
  dom.storeGrid.replaceChildren();

  const items = filteredProducts();
  dom.emptyStore.classList.toggle('hidden', items.length > 0);

  items.forEach((product) => {
    const article = createEl('article', 'card');
    const favBtn = createEl('button', 'btn small card-fav', state.favorites.has(product.slug) ? '★' : '☆');
    favBtn.type = 'button';
    favBtn.setAttribute('aria-label', 'Favorito');
    favBtn.addEventListener('click', () => {
      toggleFavorite(product.slug);
    });

    const image = createEl('img', 'card-cover');
    image.src = product.coverImage;
    image.alt = product.name;
    image.loading = 'lazy';

    const body = createEl('div', 'card-body');
    const name = createEl('div', 'card-name', product.name);
    const price = createEl('div', 'card-price', money(product.price));
    const meta = createEl('div', 'card-meta', `${categoryLabel(product.category)} · ${statusLabel(product.status)}`);

    const actions = createEl('div', 'card-actions');
    const viewBtn = createEl('button', 'btn btn-accent', 'Ver');
    viewBtn.type = 'button';
    viewBtn.addEventListener('click', () => {
      openProduct(product.slug, { countView: true, syncUrl: true });
    });

    const addBtn = createEl('button', 'btn', 'Agregar');
    addBtn.type = 'button';
    addBtn.addEventListener('click', () => addToCart(product.slug));

    actions.append(viewBtn, addBtn);
    body.append(name, price, meta, actions);

    if (state.admin) {
      const adminActions = createEl('div', 'card-actions admin');
      const editBtn = createEl('button', 'btn', 'Editar');
      editBtn.type = 'button';
      editBtn.addEventListener('click', () => populateStudio(product));

      const deleteBtn = createEl('button', 'btn danger-btn', 'Eliminar');
      deleteBtn.type = 'button';
      deleteBtn.addEventListener('click', () => deleteProduct(product.id));

      adminActions.append(editBtn, deleteBtn);
      body.append(adminActions);
    }

    article.append(favBtn, image, body);
    dom.storeGrid.append(article);
  });

  renderCart();
}

function renderCart() {
  dom.cartList.replaceChildren();

  if (!state.cart.length) {
    dom.cartList.textContent = 'Carrito vacío';
    return;
  }

  state.cart.forEach((item, index) => {
    const line = createEl('div', '', `${item.name} · ${money(item.price)} · ${item.size}`);
    dom.cartList.append(line);
    if (index < state.cart.length - 1) {
      dom.cartList.append(document.createElement('br'));
    }
  });
}

function toggleFavorite(slug) {
  if (state.favorites.has(slug)) {
    state.favorites.delete(slug);
  } else {
    state.favorites.add(slug);
  }

  updateFavoritesStorage();
  renderStore();
  if (state.currentProduct?.slug === slug) {
    renderViewer(state.currentProduct);
  }
}

function addToCart(slug, selectedSize) {
  const product = state.products.find((item) => item.slug === slug);
  if (!product) return;

  const size = selectedSize || product.sizes[0] || 'Por confirmar';
  state.cart.push({
    slug: product.slug,
    name: product.name,
    price: product.price,
    size
  });
  updateCartStorage();
  renderCart();
}

function addCurrentToCart() {
  if (!state.currentProduct) return;
  addToCart(state.currentProduct.slug, dom.viewerSize.value || state.currentProduct.sizes[0]);
  setViewerMessage('Producto agregado al carrito local.');
}

function clearCart() {
  state.cart = [];
  updateCartStorage();
  renderCart();
}

function openWhatsApp(lines) {
  const text = Array.isArray(lines) ? lines.join('\n') : String(lines || '');
  const url = `https://wa.me/${PHONE}?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank', 'noopener');
}

function checkoutCart() {
  if (!state.cart.length) {
    alert('Carrito vacío');
    return;
  }

  const lines = ['Hola, quiero estos productos de AirVibes:', ''];
  state.cart.forEach((item) => {
    lines.push(`${item.name} · ${money(item.price)} · Talla: ${item.size}`);
  });
  openWhatsApp(lines);
}

function productUrl(slug) {
  return `${window.location.origin}/producto/${encodeURIComponent(slug)}`;
}

function syncUrl(slug) {
  const url = slug ? productUrl(slug) : `${window.location.origin}/`;
  window.history.replaceState({}, '', url);
}

async function openProduct(slug, options = {}) {
  const countView = options.countView !== false;
  const updateUrl = options.syncUrl !== false;

  let product = state.products.find((item) => item.slug === slug);
  if (!product) {
    const data = await api(`/api/products/slug/${encodeURIComponent(slug)}`);
    product = data.item;
    updateProductInState(product);
  }

  state.currentProduct = product;
  renderViewer(product);
  dom.storeHome.classList.add('hidden');
  dom.productViewer.classList.remove('hidden');
  if (updateUrl) syncUrl(product.slug);

  if (countView) {
    try {
      const data = await api(`/api/products/slug/${encodeURIComponent(product.slug)}/view`, {
        method: 'POST'
      });
      product.views = data.views;
      updateProductInState(product);
      if (state.currentProduct?.slug === product.slug) {
        setViewerMessage(`Vistas: ${product.views}`);
      }
    } catch (error) {
      console.error(error);
    }
  }
}

function closeProduct() {
  state.currentProduct = null;
  dom.productViewer.classList.add('hidden');
  dom.storeHome.classList.remove('hidden');
  syncUrl('');
  renderStore();
}

function renderViewer(product) {
  dom.viewerBadges.replaceChildren();
  dom.thumbs.replaceChildren();
  dom.viewerName.textContent = product.name;
  dom.viewerPrice.textContent = money(product.price);
  dom.viewerCopy.textContent = product.copy || 'Escríbenos por WhatsApp para separar este par.';
  dom.mainViewerImg.src = product.coverImage;
  dom.mainViewerImg.alt = product.name;
  dom.toggleFavCurrentBtn.textContent = state.favorites.has(product.slug) ? 'Quitar favorito' : 'Favorito';
  setViewerMessage(`Vistas: ${product.views || 0}`);

  [categoryLabel(product.category), statusLabel(product.status), categoryTag(product.category)].forEach((label) => {
    dom.viewerBadges.append(createEl('span', 'vbadge', label));
  });

  const sizes = product.sizes.length ? product.sizes : ['Por confirmar'];
  dom.viewerSize.replaceChildren();
  sizes.forEach((size) => {
    const option = document.createElement('option');
    option.value = size;
    option.textContent = size;
    dom.viewerSize.append(option);
  });

  product.images.forEach((src, index) => {
    const thumb = document.createElement('img');
    thumb.src = src;
    thumb.alt = `${product.name} ${index + 1}`;
    thumb.loading = 'lazy';
    thumb.addEventListener('click', () => {
      dom.mainViewerImg.src = src;
    });
    dom.thumbs.append(thumb);
  });
}

function buyNow() {
  if (!state.currentProduct) return;

  openWhatsApp([
    'Hola, quiero este producto de AirVibes:',
    '',
    state.currentProduct.name,
    money(state.currentProduct.price),
    `Categoría: ${categoryLabel(state.currentProduct.category)}`,
    `Talla: ${dom.viewerSize.value || 'Por confirmar'}`,
    `Estado: ${statusLabel(state.currentProduct.status)}`,
    `Link: ${productUrl(state.currentProduct.slug)}`
  ]);
}

async function copyCurrentLink() {
  if (!state.currentProduct) return;
  const link = productUrl(state.currentProduct.slug);
  await navigator.clipboard.writeText(link);
  setViewerMessage('Link copiado.');
}

function populateStudio(product) {
  ensureAdmin();
  state.editingProductId = product.id;
  state.editingExistingImages = product.images.slice();
  dom.productName.value = product.name;
  dom.productPrice.value = String(product.price);
  dom.productSizes.value = product.sizes.join(', ');
  dom.productStatus.value = product.status;
  dom.productCopy.value = product.copy || '';
  dom.imgMain.value = '';
  dom.img2.value = '';
  dom.img3.value = '';
  dom.saveProductBtn.textContent = 'Guardar cambios';
  dom.cancelEditBtn.classList.remove('hidden');
  setStudioCategory(product.category);
  setSection('studio');
  updatePreview();
  setStudioMessage(`Editando: ${product.name}`);
}

async function deleteProduct(id) {
  try {
    ensureAdmin();
    const product = state.products.find((item) => item.id === id);
    const ok = window.confirm(`¿Eliminar ${product?.name || 'este producto'}?`);
    if (!ok) return;

    await api(`/api/products/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });

    removeProductFromState(id);
    if (state.currentProduct?.id === id) {
      closeProduct();
    } else {
      renderStore();
    }
    setStudioMessage('Producto eliminado.');
  } catch (error) {
    setStudioMessage(error.message, true);
  }
}

function bindEvents() {
  dom.loginForm.addEventListener('submit', loginAdmin);
  dom.continueStoreBtn.addEventListener('click', () => {
    hideLogin();
    setSection('store');
  });
  dom.openAdminBtn.addEventListener('click', showLogin);
  dom.logoutBtn.addEventListener('click', logoutAdmin);
  dom.tabStore.addEventListener('click', () => setSection('store'));
  dom.tabStudio.addEventListener('click', () => {
    if (state.admin) {
      setSection('studio');
    } else {
      showLogin();
    }
  });
  dom.requestStudioBtn.addEventListener('click', () => {
    if (state.admin) {
      setSection('studio');
    } else {
      showLogin();
    }
  });
  dom.goStoreBtn.addEventListener('click', () => setSection('store'));
  dom.saveProductBtn.addEventListener('click', saveProduct);
  dom.cancelEditBtn.addEventListener('click', clearStudio);
  dom.clearStudioBtn.addEventListener('click', clearStudio);
  dom.downloadDesignBtn.addEventListener('click', downloadDesign);
  dom.copyWhatsBtn.addEventListener('click', async () => {
    try {
      await copyText(buildStudioWhatsText(), 'Texto de WhatsApp copiado.');
    } catch (error) {
      setStudioMessage(error.message, true);
    }
  });
  dom.copyCaptionBtn.addEventListener('click', async () => {
    try {
      await copyText(buildStudioCaption(), 'Caption copiado.');
    } catch (error) {
      setStudioMessage(error.message, true);
    }
  });

  dom.formatPostBtn.addEventListener('click', () => setFormat('post'));
  dom.formatStoryBtn.addEventListener('click', () => setFormat('story'));
  dom.categorySelectBtn.addEventListener('click', () => setStudioCategory('select'));
  dom.categoryLabBtn.addEventListener('click', () => setStudioCategory('lab'));
  dom.categoryEssentialsBtn.addEventListener('click', () => setStudioCategory('essentials'));

  [
    dom.productName,
    dom.productPrice,
    dom.productSizes,
    dom.productStatus,
    dom.productCopy,
    dom.cost,
    dom.ship,
    dom.extra
  ].forEach((element) => {
    element.addEventListener('input', updatePreview);
    element.addEventListener('change', updatePreview);
  });

  [dom.imgMain, dom.img2, dom.img3].forEach((input) => {
    input.addEventListener('change', updatePreview);
  });

  document.querySelectorAll('[data-category-filter]').forEach((button) => {
    button.addEventListener('click', () => {
      state.categoryFilter = button.dataset.categoryFilter;
      renderStore();
    });
  });

  document.querySelectorAll('[data-quick-filter]').forEach((button) => {
    button.addEventListener('click', () => {
      state.quickFilter = button.dataset.quickFilter;
      renderStore();
    });
  });

  dom.clearCartBtn.addEventListener('click', clearCart);
  dom.checkoutCartBtn.addEventListener('click', checkoutCart);
  dom.backToStoreBtn.addEventListener('click', closeProduct);
  dom.buyNowBtn.addEventListener('click', buyNow);
  dom.addCurrentToCartBtn.addEventListener('click', addCurrentToCart);
  dom.copyCurrentLinkBtn.addEventListener('click', copyCurrentLink);
  dom.toggleFavCurrentBtn.addEventListener('click', () => {
    if (state.currentProduct) {
      toggleFavorite(state.currentProduct.slug);
    }
  });
  dom.editCurrentBtn.addEventListener('click', () => {
    if (state.currentProduct) populateStudio(state.currentProduct);
  });
  dom.deleteCurrentBtn.addEventListener('click', () => {
    if (state.currentProduct) deleteProduct(state.currentProduct.id);
  });
}

async function restoreRoute() {
  const params = new URLSearchParams(window.location.search);
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  const slugFromPath = pathParts[0] === 'producto' ? decodeURIComponent(pathParts.slice(1).join('/')) : '';
  const slug = slugFromPath || params.get('p');
  const wantsAdmin = params.get('admin') === '1';

  if (wantsAdmin && !state.admin) {
    showLogin();
  }

  if (slug) {
    try {
      await openProduct(slug, { countView: true, syncUrl: false });
    } catch {
      syncUrl('');
    }
  }
}

async function init() {
  bindEvents();
  setAccent(state.category);
  setFormat('post');
  updatePreview();
  renderCart();
  await checkAuth();
  await loadProducts();
  await restoreRoute();
  if (!state.currentProduct) {
    setSection('store');
  }
}

window.addEventListener('DOMContentLoaded', () => {
  init().catch((error) => {
    console.error(error);
    alert('No se pudo inicializar la aplicación. Revisa la consola del navegador.');
  });
});
