// ==================== State ====================
const USER_ID = 1;
let cart = JSON.parse(localStorage.getItem('flower_cart') || '[]');
let currentCategory = '全部';
let currentProduct = null;
let adminCurrentTab = 'products';
let searchTimeout = null;

// ==================== Navigation ====================
function navigateTo(page, pushState = true) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById('page-' + page);
  if (el) el.classList.add('active');

  // Tab bar visibility
  const tabBar = document.getElementById('tab-bar');
  const showTabPages = ['home', 'cart', 'user'];
  tabBar.style.display = showTabPages.includes(page) ? 'flex' : 'none';

  // Update tab active state
  document.querySelectorAll('.tab-item').forEach(t => {
    t.classList.toggle('active', t.dataset.page === page);
  });

  // Admin add button
  const addBtn = document.getElementById('admin-add-btn');
  if (addBtn) addBtn.style.display = page === 'admin' ? 'flex' : 'none';

  // Load page data
  switch (page) {
    case 'home': loadProducts(); break;
    case 'cart': renderCart(); break;
    case 'checkout': renderCheckout(); break;
    case 'orders': loadOrders(); break;
    case 'addresses': loadAddresses(); break;
    case 'address-select': loadAddressSelect(); break;
    case 'favorites': loadFavorites(); break;
    case 'admin': loadAdmin(); break;
  }

  window.scrollTo(0, 0);
  if (pushState) history.pushState({ page }, '', '#' + page);
}

function goBack() {
  history.back();
}

window.addEventListener('popstate', (e) => {
  const page = (e.state && e.state.page) || 'home';
  navigateTo(page, false);
});

// ==================== Toast ====================
function showToast(msg, duration = 2000) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), duration);
}

// ==================== Products ====================
function loadProducts() {
  loadCategories();
  fetchProducts();
}

function loadCategories() {
  const categories = ['全部', '生日', '纪念日', '日常', '开业'];
  const container = document.getElementById('category-tabs');
  container.innerHTML = categories.map(c =>
    `<div class="cat-tab ${c === currentCategory ? 'active' : ''}" onclick="filterCategory('${c}')">${c}</div>`
  ).join('');
}

function filterCategory(cat) {
  currentCategory = cat;
  loadCategories();
  fetchProducts();
}

function searchProducts(keyword) {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => fetchProducts(keyword), 300);
}

async function fetchProducts(search = '') {
  let url = '/api/products?';
  if (currentCategory !== '全部') url += `category=${encodeURIComponent(currentCategory)}&`;
  if (search) url += `search=${encodeURIComponent(search)}&`;

  const res = await fetch(url);
  const products = await res.json();
  renderProductGrid(products);
}

async function renderProductGrid(products) {
  const container = document.getElementById('product-grid');

  // Check favorites
  const favRes = await fetch(`/api/favorites?user_id=${USER_ID}`);
  const favs = await favRes.json();
  const favIds = new Set(favs.map(f => f.product_id));

  container.innerHTML = products.map(p => `
    <div class="product-card fade-in" onclick="viewDetail(${p.id})">
      <div class="fav-btn ${favIds.has(p.id) ? 'favorited' : ''}" onclick="event.stopPropagation();toggleFav(${p.id},this)">${favIds.has(p.id) ? '❤️' : '🤍'}</div>
      <div class="img-wrap">
        <img src="${p.image}" alt="${p.name}" onerror="this.style.display='none'">
        <div class="tag">${p.category}</div>
      </div>
      <div class="info">
        <div class="name">${p.name}</div>
        <div class="selling-point">${p.selling_point}</div>
        <div class="price-row">
          <div class="price">${p.price}</div>
          ${p.original_price ? `<div class="original-price">¥${p.original_price}</div>` : ''}
          <div class="sales">已售${p.sales}</div>
        </div>
      </div>
    </div>
  `).join('');
}

// ==================== Product Detail ====================
async function viewDetail(id) {
  const res = await fetch(`/api/products/${id}`);
  const p = await res.json();
  currentProduct = p;

  const sizeOpts = JSON.parse(p.size_options || '["标准款"]');
  let selectedSize = sizeOpts[0];

  const favRes = await fetch(`/api/favorites/check?user_id=${USER_ID}&product_id=${id}`);
  const { isFavorite } = await favRes.json();

  document.getElementById('detail-content').innerHTML = `
    <img class="detail-img" src="${p.image}" alt="${p.name}" onerror="this.style.background='var(--pink-1)'">
    <div class="detail-body">
      <div class="detail-price-row">
        <div class="detail-price">${p.price}</div>
        ${p.original_price ? `<div class="detail-original">¥${p.original_price}</div>` : ''}
        <div class="detail-sales">已售${p.sales}件</div>
      </div>
      <div class="detail-name">${p.name}</div>
      <div class="detail-sp">${p.selling_point}</div>
    </div>

    <div class="detail-section">
      <h3>选择规格</h3>
      <div class="size-selector" id="size-selector">
        ${sizeOpts.map((s, i) => `<div class="size-option ${i === 0 ? 'active' : ''}" onclick="selectSize(this,'${s}')">${s}</div>`).join('')}
      </div>
      <div class="qty-row">
        <label>数量</label>
        <div class="qty-control">
          <button onclick="changeQty(-1)">-</button>
          <input type="number" id="qty-input" value="1" min="1" max="99" readonly>
          <button onclick="changeQty(1)">+</button>
        </div>
      </div>
    </div>

    <div class="detail-section">
      <h3>花材组成</h3>
      <p>${p.flower_composition}</p>
    </div>

    <div class="detail-section">
      <h3>花语寓意</h3>
      <p>${p.flower_language}</p>
    </div>

    <div class="detail-section">
      <h3>养护说明</h3>
      <p>${p.care_instructions}</p>
    </div>
  `;

  document.getElementById('detail-actions').innerHTML = `
    <button class="fav-big ${isFavorite ? 'favorited' : ''}" id="detail-fav-btn" onclick="toggleDetailFav(${p.id})">
      ${isFavorite ? '❤️' : '🤍'}
      <span>收藏</span>
    </button>
    <button class="cart-btn" onclick="addToCart(${p.id})">加入购物车</button>
  `;

  // Store selected size
  window._selectedSize = selectedSize;
  navigateTo('detail');
}

function selectSize(el, size) {
  document.querySelectorAll('#size-selector .size-option').forEach(s => s.classList.remove('active'));
  el.classList.add('active');
  window._selectedSize = size;
}

function changeQty(delta) {
  const input = document.getElementById('qty-input');
  let val = parseInt(input.value) + delta;
  if (val < 1) val = 1;
  if (val > 99) val = 99;
  input.value = val;
}

async function addToCart(productId) {
  const qty = parseInt(document.getElementById('qty-input').value);
  const size = window._selectedSize || '标准款';

  const existingIdx = cart.findIndex(item => item.product_id === productId && item.size === size);
  if (existingIdx >= 0) {
    cart[existingIdx].quantity += qty;
  } else {
    cart.push({
      product_id: productId,
      name: currentProduct.name,
      price: currentProduct.price,
      image: currentProduct.image,
      size: size,
      quantity: qty
    });
  }
  saveCart();
  showToast('已加入购物车 🛒');
}

// ==================== Favorites ====================
async function toggleFav(productId, btn) {
  const isFav = btn.classList.contains('favorited');
  if (isFav) {
    await fetch(`/api/favorites?user_id=${USER_ID}&product_id=${productId}`, { method: 'DELETE' });
    btn.classList.remove('favorited');
    btn.textContent = '🤍';
    showToast('已取消收藏');
  } else {
    await fetch('/api/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: USER_ID, product_id: productId })
    });
    btn.classList.add('favorited');
    btn.textContent = '❤️';
    showToast('已收藏');
  }
}

async function toggleDetailFav(productId) {
  const btn = document.getElementById('detail-fav-btn');
  const res = await fetch(`/api/favorites/check?user_id=${USER_ID}&product_id=${productId}`);
  const { isFavorite } = await res.json();

  if (isFavorite) {
    await fetch(`/api/favorites?user_id=${USER_ID}&product_id=${productId}`, { method: 'DELETE' });
    btn.classList.remove('favorited');
    btn.innerHTML = '🤍<span>收藏</span>';
    showToast('已取消收藏');
  } else {
    await fetch('/api/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: USER_ID, product_id: productId })
    });
    btn.classList.add('favorited');
    btn.innerHTML = '❤️<span>已收藏</span>';
    showToast('已收藏 ❤️');
  }
}

// ==================== Cart ====================
function saveCart() {
  localStorage.setItem('flower_cart', JSON.stringify(cart));
}

function renderCart() {
  const container = document.getElementById('cart-content');
  const bottom = document.getElementById('cart-bottom');

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="cart-empty">
        <div class="icon">🛒</div>
        <p>购物车还是空的</p>
        <p style="font-size:12px;margin-top:8px;color:var(--pink-4)">去挑选一束美丽的花吧~</p>
      </div>
    `;
    bottom.style.display = 'none';
    return;
  }

  bottom.style.display = 'flex';
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  container.innerHTML = cart.map((item, idx) => `
    <div class="cart-item fade-in">
      <img src="${item.image}" alt="${item.name}" onerror="this.style.background='var(--pink-1)'">
      <div class="info">
        <div class="name">${item.name}</div>
        <div class="size">${item.size}</div>
        <div style="display:flex;align-items:center;gap:10px">
          <div class="price">${item.price * item.quantity}</div>
          <div class="qty-control" style="margin-left:auto">
            <button onclick="updateCartQty(${idx},-1)">-</button>
            <input type="number" value="${item.quantity}" readonly style="width:36px;height:30px">
            <button onclick="updateCartQty(${idx},1)">+</button>
          </div>
        </div>
      </div>
      <div class="del-btn" onclick="removeCartItem(${idx})">✕</div>
    </div>
  `).join('');

  bottom.innerHTML = `
    <div class="total">合计：<span class="amount">${total}</span></div>
    <button class="checkout-btn" onclick="navigateTo('checkout')">去结算(${cart.reduce((s,i)=>s+i.quantity,0)})</button>
  `;
}

function updateCartQty(idx, delta) {
  cart[idx].quantity += delta;
  if (cart[idx].quantity < 1) cart.splice(idx, 1);
  saveCart();
  renderCart();
}

function removeCartItem(idx) {
  cart.splice(idx, 1);
  saveCart();
  renderCart();
  showToast('已删除');
}

// ==================== Orders ====================
async function loadOrders() {
  const res = await fetch(`/api/orders?user_id=${USER_ID}`);
  const orders = await res.json();
  const container = document.getElementById('orders-content');

  if (orders.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="icon">📦</div><p>暂无订单</p></div>';
    return;
  }

  const statusMap = { pending: '待发货', shipped: '已发货', completed: '已完成', cancelled: '已取消' };

  container.innerHTML = orders.map(o => {
    const items = JSON.parse(o.items);
    return `
      <div class="order-card fade-in">
        <div class="order-head">
          <div class="order-id">订单号 #${o.id}</div>
          <div class="order-status status-${o.status}">${statusMap[o.status]}</div>
        </div>
        <div class="order-items">
          ${items.map(item => `<img class="order-item-img" src="${item.image}" alt="${item.name}" onerror="this.style.background='var(--pink-1)'">`).join('')}
        </div>
        <div class="order-foot">
          <div class="order-date">${new Date(o.created_at).toLocaleDateString('zh-CN')}</div>
          <div class="order-total">合计：<span>¥${o.total_price}</span></div>
        </div>
        ${o.greeting_card ? `<div style="margin-top:8px;padding:8px 10px;background:var(--pink-1);border-radius:6px;font-size:12px;color:var(--pink-7);font-style:italic">💌 ${o.greeting_card}</div>` : ''}
      </div>
    `;
  }).join('');
}

// ==================== Favorites ====================
async function loadFavorites() {
  const res = await fetch(`/api/favorites?user_id=${USER_ID}`);
  const favs = await res.json();
  const container = document.getElementById('favorites-content');

  if (favs.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="icon">❤️</div><p>收藏夹空空如也</p></div>';
    return;
  }

  container.innerHTML = `<div class="fav-list">${favs.map(f => `
    <div class="fav-item fade-in" onclick="viewDetail(${f.product_id})">
      <img src="${f.image}" alt="${f.name}" onerror="this.style.background='var(--pink-1)'">
      <div class="info">
        <div class="name">${f.name}</div>
        <div class="sp">${f.selling_point}</div>
        <div class="price">¥${f.price}</div>
      </div>
      <button class="unfav-btn" onclick="event.stopPropagation();removeFav(${f.product_id})">取消收藏</button>
    </div>
  `).join('')}</div>`;
}

async function removeFav(productId) {
  await fetch(`/api/favorites?user_id=${USER_ID}&product_id=${productId}`, { method: 'DELETE' });
  showToast('已取消收藏');
  loadFavorites();
}

// ==================== Admin ====================
function switchAdminTab(tab) {
  adminCurrentTab = tab;
  document.querySelectorAll('.admin-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tab);
  });
  const addBtn = document.getElementById('admin-add-btn');
  addBtn.style.display = tab === 'products' ? 'flex' : 'none';
  loadAdmin();
}

async function loadAdmin() {
  const container = document.getElementById('admin-content');
  switch (adminCurrentTab) {
    case 'products': await loadAdminProducts(container); break;
    case 'admin-orders': await loadAdminOrders(container); break;
    case 'stats': await loadAdminStats(container); break;
  }
}

async function loadAdminProducts(container) {
  const res = await fetch('/api/products');
  const products = await res.json();
  container.innerHTML = products.map(p => `
    <div class="admin-product-card">
      <img src="${p.image}" alt="${p.name}" onerror="this.style.background='var(--pink-1)'">
      <div class="info">
        <div class="name">${p.name}</div>
        <div class="meta">¥${p.price} · 库存${p.stock} · 已售${p.sales}</div>
        <div class="meta">${p.category}</div>
      </div>
      <div class="actions">
        <button class="btn-edit" onclick="editProduct(${p.id})">编辑</button>
        <button class="btn-delete" onclick="deleteProduct(${p.id})">删除</button>
      </div>
    </div>
  `).join('');
}

async function loadAdminOrders(container) {
  const res = await fetch('/api/orders');
  const orders = await res.json();
  const statusMap = { pending: '待发货', shipped: '已发货', completed: '已完成', cancelled: '已取消' };
  const nextStatus = { pending: 'shipped', shipped: 'completed' };
  const nextLabel = { pending: '发货', shipped: '完成' };

  container.innerHTML = orders.length === 0
    ? '<div class="empty-state"><div class="icon">📦</div><p>暂无订单</p></div>'
    : orders.map(o => {
      const items = JSON.parse(o.items);
      return `
        <div class="admin-order-card fade-in">
          <div class="order-head">
            <div class="order-id">订单 #${o.id}</div>
            <div class="order-status status-${o.status}">${statusMap[o.status]}</div>
          </div>
          <div class="recipient">
            <div>收花人：${o.recipient_name} · ${o.recipient_phone}</div>
            <div>地址：${o.recipient_address}</div>
            <div>配送日期：${o.delivery_date}</div>
          </div>
          <div class="order-items-summary" style="margin-top:8px">
            ${items.map(item => `<div class="item"><span>${item.name}(${item.size}) × ${item.quantity}</span><span>¥${item.price * item.quantity}</span></div>`).join('')}
          </div>
          ${o.greeting_card ? `<div style="margin-top:6px;font-size:12px;color:var(--pink-6);font-style:italic">💌 ${o.greeting_card}</div>` : ''}
          <div class="order-actions">
            ${nextStatus[o.status] ? `<button style="background:linear-gradient(135deg,var(--pink-4),var(--pink-6));color:#fff" onclick="updateOrderStatus(${o.id},'${nextStatus[o.status]}')">${nextLabel[o.status]}</button>` : ''}
            ${o.status === 'pending' ? `<button style="background:#fff1f0;color:var(--red);border:1px solid var(--red)" onclick="updateOrderStatus(${o.id},'cancelled')">取消</button>` : ''}
          </div>
        </div>
      `;
    }).join('');
}

async function updateOrderStatus(id, status) {
  await fetch(`/api/orders/${id}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  const statusMap = { shipped: '已发货', completed: '已完成', cancelled: '已取消' };
  showToast(`订单状态已更新为：${statusMap[status]}`);
  loadAdmin();
}

async function loadAdminStats(container) {
  const res = await fetch('/api/stats/daily');
  const stats = await res.json();

  if (stats.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="icon">📊</div><p>暂无统计数据</p></div>';
    return;
  }

  container.innerHTML = stats.map(s => `
    <div class="stats-card fade-in">
      <div class="date">${s.date}</div>
      <div class="row">
        <span class="label">订单数</span>
        <span class="val">${s.order_count} 单</span>
      </div>
      <div class="row">
        <span class="label">营业额</span>
        <span class="val">¥${(s.total_revenue || 0).toFixed(2)}</span>
      </div>
    </div>
  `).join('');
}

// ==================== Product Modal (Add/Edit) ====================
function showProductModal(product = null) {
  const isEdit = !!product;
  const modal = document.getElementById('modal-content');

  modal.innerHTML = `
    <h3>${isEdit ? '编辑商品' : '添加新商品'}</h3>
    <form id="product-form" enctype="multipart/form-data">
      <div class="form-group">
        <label>商品名称</label>
        <input type="text" name="name" value="${isEdit ? product.name : ''}" required placeholder="请输入花束名称">
      </div>
      <div class="form-group">
        <label>售价（元）</label>
        <input type="number" name="price" value="${isEdit ? product.price : ''}" required placeholder="输入售价">
      </div>
      <div class="form-group">
        <label>原价（元，可选）</label>
        <input type="number" name="original_price" value="${isEdit ? (product.original_price || '') : ''}" placeholder="输入原价">
      </div>
      <div class="form-group">
        <label>分类</label>
        <select name="category">
          ${['生日','纪念日','日常','开业'].map(c => `<option value="${c}" ${isEdit && product.category === c ? 'selected' : ''}>${c}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>一句话卖点</label>
        <input type="text" name="selling_point" value="${isEdit ? (product.selling_point || '') : ''}" placeholder="例如：送给TA最灿烂的笑容">
      </div>
      <div class="form-group">
        <label>商品描述</label>
        <textarea name="description" placeholder="详细描述花束特点">${isEdit ? (product.description || '') : ''}</textarea>
      </div>
      <div class="form-group">
        <label>花材组成</label>
        <textarea name="flower_composition" placeholder="例如：向日葵 x10、尤加利叶 x5">${isEdit ? (product.flower_composition || '') : ''}</textarea>
      </div>
      <div class="form-group">
        <label>花语寓意</label>
        <textarea name="flower_language" placeholder="花语含义">${isEdit ? (product.flower_language || '') : ''}</textarea>
      </div>
      <div class="form-group">
        <label>养护说明</label>
        <textarea name="care_instructions" placeholder="养护方法">${isEdit ? (product.care_instructions || '') : ''}</textarea>
      </div>
      <div class="form-group">
        <label>规格选项（JSON数组）</label>
        <input type="text" name="size_options" value='${isEdit ? product.size_options : '["标准款"]'}' placeholder='["小款","标准款","豪华款"]'>
      </div>
      <div class="form-group">
        <label>库存</label>
        <input type="number" name="stock" value="${isEdit ? product.stock : '100'}" placeholder="库存数量">
      </div>
      <div class="form-group">
        <label>商品图片</label>
        <input type="file" name="image" accept="image/*">
      </div>
      <div class="btn-row">
        <button type="button" class="btn-cancel" onclick="closeModal()">取消</button>
        <button type="submit" class="btn-confirm">${isEdit ? '保存修改' : '确认添加'}</button>
      </div>
    </form>
  `;

  document.getElementById('modal-overlay').style.display = 'flex';

  document.getElementById('product-form').onsubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const url = isEdit ? `/api/products/${product.id}` : '/api/products';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, { method, body: formData });
      const data = await res.json();
      if (data.success) {
        closeModal();
        showToast(isEdit ? '商品已更新' : '商品已添加');
        loadAdmin();
      }
    } catch (err) {
      showToast('操作失败');
    }
  };
}

async function editProduct(id) {
  const res = await fetch(`/api/products/${id}`);
  const product = await res.json();
  showProductModal(product);
}

async function deleteProduct(id) {
  showConfirm('确定要删除这个商品吗？', async () => {
    await fetch(`/api/products/${id}`, { method: 'DELETE' });
    showToast('商品已删除');
    loadAdmin();
  });
}

// ==================== Modal Helpers ====================
function closeModal() {
  document.getElementById('modal-overlay').style.display = 'none';
}

function closeModalOutside(e) {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
}

function showConfirm(msg, onConfirm) {
  const overlay = document.createElement('div');
  overlay.className = 'confirm-overlay';
  overlay.innerHTML = `
    <div class="confirm-box">
      <p>${msg}</p>
      <div class="btns">
        <button style="background:#f5f5f5;color:var(--text2)" onclick="this.closest('.confirm-overlay').remove()">取消</button>
        <button style="background:linear-gradient(135deg,var(--pink-4),var(--pink-6));color:#fff" id="confirm-yes">确定</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('#confirm-yes').onclick = () => {
    overlay.remove();
    onConfirm();
  };
}

// ==================== Addresses ====================
let _addressModalMode = 'manage';
let _editingAddressId = null;
let _selectedAddressId = null;

async function loadAddresses() {
  const container = document.getElementById('addresses-content');
  try {
    const res = await fetch(`/api/addresses?user_id=${USER_ID}`);
    const addresses = await res.json();

    if (addresses.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="icon">📍</div><p>还没有收货地址</p><p style="font-size:12px;margin-top:6px">添加一个方便下次下单吧~</p></div>';
      return;
    }

    container.innerHTML = `<div class="address-list">${addresses.map(addr => `
      <div class="address-card fade-in">
        <div class="address-info">
          <div class="address-top">
            <span class="address-name">${addr.name}</span>
            <span class="address-phone">${addr.phone}</span>
            ${addr.is_default ? '<span class="default-tag">默认</span>' : ''}
          </div>
          <div class="address-detail">${addr.address}</div>
        </div>
        <div class="address-actions">
          ${!addr.is_default ? `<button class="addr-action-btn" onclick="setDefaultAddress(${addr.id})">设为默认</button>` : ''}
          <button class="addr-action-btn" onclick="showAddressModal(${addr.id})">编辑</button>
          <button class="addr-action-btn addr-delete" onclick="deleteAddress(${addr.id})">删除</button>
        </div>
      </div>
    `).join('')}</div>`;
  } catch (err) {
    container.innerHTML = '<div class="empty-state"><div class="icon">⚠️</div><p>加载失败，请重试</p></div>';
  }
}

async function loadAddressSelect() {
  const container = document.getElementById('address-select-content');
  try {
    const res = await fetch(`/api/addresses?user_id=${USER_ID}`);
    const addresses = await res.json();

    if (addresses.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="icon">📍</div><p>还没有收货地址</p><p style="font-size:12px;margin-top:6px">请先新增一个收货地址</p></div>';
      return;
    }

    container.innerHTML = `<div class="address-list">${addresses.map(addr => `
      <div class="address-card fade-in address-select-card ${_selectedAddressId === addr.id ? 'selected' : ''}" onclick="selectAddress(${addr.id})">
        <div class="address-info">
          <div class="address-top">
            <span class="address-name">${addr.name}</span>
            <span class="address-phone">${addr.phone}</span>
            ${addr.is_default ? '<span class="default-tag">默认</span>' : ''}
          </div>
          <div class="address-detail">${addr.address}</div>
        </div>
        <div class="address-radio">
          <div class="radio-circle ${_selectedAddressId === addr.id ? 'checked' : ''}">${_selectedAddressId === addr.id ? '✓' : ''}</div>
        </div>
      </div>
    `).join('')}</div>
    <button class="address-confirm-btn" onclick="confirmAddressSelection()" ${!_selectedAddressId ? 'disabled' : ''}>确认使用此地址</button>`;
  } catch (err) {
    container.innerHTML = '<div class="empty-state"><div class="icon">⚠️</div><p>加载失败，请重试</p></div>';
  }
}

function selectAddress(id) {
  _selectedAddressId = id;
  loadAddressSelect();
}

async function confirmAddressSelection() {
  if (!_selectedAddressId) return;
  try {
    const res = await fetch(`/api/addresses/${_selectedAddressId}`);
    const addr = await res.json();
    window._selectedAddress = addr;
    navigateTo('checkout');
  } catch (err) {
    showToast('获取地址失败');
  }
}

function showAddressModal(addressId = null, mode = 'manage') {
  _addressModalMode = mode;
  _editingAddressId = addressId;
  const modal = document.getElementById('modal-content');
  const isEdit = !!addressId;

  let addr = { name: '', phone: '', address: '', is_default: 0 };
  if (isEdit) {
    const cards = document.querySelectorAll('.address-card');
    for (const card of cards) {
      const editBtn = card.querySelector(`[onclick="showAddressModal(${addressId})"]`);
      if (editBtn) {
        addr.name = card.querySelector('.address-name').textContent;
        addr.phone = card.querySelector('.address-phone').textContent;
        addr.address = card.querySelector('.address-detail').textContent;
        addr.is_default = card.querySelector('.default-tag') ? 1 : 0;
        break;
      }
    }
  }

  modal.innerHTML = `
    <h3>${isEdit ? '编辑地址' : '新增地址'}</h3>
    <form id="address-form">
      <div class="form-group">
        <label>收花人姓名</label>
        <input type="text" name="name" value="${addr.name}" required placeholder="请输入姓名">
      </div>
      <div class="form-group">
        <label>联系电话</label>
        <input type="tel" name="phone" value="${addr.phone}" required placeholder="请输入手机号" maxlength="11">
      </div>
      <div class="form-group">
        <label>详细地址</label>
        <textarea name="address" required placeholder="请输入详细配送地址">${addr.address}</textarea>
      </div>
      <div class="form-group" style="display:flex;align-items:center;gap:8px">
        <input type="checkbox" name="is_default" id="is_default" ${addr.is_default ? 'checked' : ''} style="width:auto">
        <label for="is_default" style="margin:0;font-size:13px;color:var(--text2)">设为默认地址</label>
      </div>
      <div class="btn-row">
        <button type="button" class="btn-cancel" onclick="closeModal()">取消</button>
        <button type="submit" class="btn-confirm">${isEdit ? '保存修改' : '确认添加'}</button>
      </div>
    </form>
  `;

  document.getElementById('modal-overlay').style.display = 'flex';

  document.getElementById('address-form').onsubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const name = form.name.value.trim();
    const phone = form.phone.value.trim();
    const address = form.address.value.trim();
    const is_default = form.is_default.checked;

    if (!name) { showToast('请输入姓名'); return; }
    if (!/^1[3-9]\d{9}$/.test(phone)) { showToast('请输入正确的手机号'); return; }
    if (!address) { showToast('请输入详细地址'); return; }

    const url = isEdit ? `/api/addresses/${addressId}` : '/api/addresses';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: USER_ID, name, phone, address, is_default })
      });
      const data = await res.json();
      if (data.success) {
        closeModal();
        showToast(isEdit ? '地址已更新' : '地址已添加');
        if (_addressModalMode === 'select') {
          if (!isEdit) _selectedAddressId = data.id;
          loadAddressSelect();
        } else {
          loadAddresses();
        }
      } else {
        showToast(data.error || '操作失败');
      }
    } catch (err) {
      showToast('操作失败');
    }
  };
}

async function setDefaultAddress(id) {
  try {
    const res = await fetch(`/api/addresses/${id}/default`, { method: 'PUT' });
    const data = await res.json();
    if (data.success) {
      showToast('已设为默认地址');
      loadAddresses();
    }
  } catch (err) {
    showToast('操作失败');
  }
}

function deleteAddress(id) {
  showConfirm('确定要删除这个地址吗？', async () => {
    try {
      const res = await fetch(`/api/addresses/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('地址已删除');
        loadAddresses();
      }
    } catch (err) {
      showToast('删除失败');
    }
  });
}

// ==================== Checkout (modified) ====================
function renderCheckout() {
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const today = new Date().toISOString().split('T')[0];

  let selectedAddrHtml = '';
  let selectedName = '';
  let selectedPhone = '';
  let selectedAddress = '';

  if (window._selectedAddress) {
    const a = window._selectedAddress;
    selectedName = a.name;
    selectedPhone = a.phone;
    selectedAddress = a.address;
    selectedAddrHtml = `
      <div class="selected-address-box" onclick="navigateTo('address-select')">
        <div class="sa-icon">📍</div>
        <div class="sa-info">
          <div class="sa-top">
            <span class="sa-name">${a.name}</span>
            <span class="sa-phone">${a.phone}</span>
            ${a.is_default ? '<span class="default-tag">默认</span>' : ''}
          </div>
          <div class="sa-detail">${a.address}</div>
        </div>
        <div class="sa-arrow">›</div>
      </div>
    `;
  } else {
    selectedAddrHtml = `
      <div class="select-address-entry" onclick="navigateTo('address-select')">
        <div class="entry-left">
          <span class="entry-icon">📍</span>
          <span class="entry-text">选择收货地址</span>
        </div>
        <div class="entry-arrow">›</div>
      </div>
    `;
  }

  document.getElementById('checkout-content').innerHTML = `
    <div class="checkout-section">
      <h3>📍 收货信息</h3>
      ${selectedAddrHtml}
      <div class="form-group" style="margin-top:14px">
        <label>收花人姓名</label>
        <input type="text" id="recipient-name" placeholder="请输入收花人姓名" value="${selectedName}">
      </div>
      <div class="form-group">
        <label>联系电话</label>
        <input type="tel" id="recipient-phone" placeholder="请输入收花人手机号" value="${selectedPhone}">
      </div>
      <div class="form-group">
        <label>配送地址</label>
        <input type="text" id="recipient-address" placeholder="请输入详细配送地址" value="${selectedAddress}">
      </div>
      <div class="form-group">
        <label>期望配送日期</label>
        <input type="date" id="delivery-date" min="${today}">
      </div>
    </div>

    <div class="checkout-section">
      <h3>🛒 订单商品</h3>
      <div class="order-items-summary">
        ${cart.map(item => `
          <div class="item">
            <span>${item.name} × ${item.quantity}</span>
            <span>¥${item.price * item.quantity}</span>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="checkout-section">
      <h3>💌 贺卡寄语</h3>
      <div class="greeting-card-box">
        <textarea id="greeting-card" placeholder="写一句祝福的话吧，我们会附在花束中..."></textarea>
      </div>
    </div>

    <div class="pay-total">
      <p>需支付</p>
      <div class="amount">${total}</div>
    </div>

    <button class="pay-btn" onclick="submitOrder()">确认支付 ¥${total}</button>
  `;

  if (!window._selectedAddress) {
    (async () => {
      try {
        const res = await fetch(`/api/addresses?user_id=${USER_ID}`);
        const addrs = await res.json();
        const def = addrs.find(a => a.is_default) || addrs[0];
        if (def) {
          window._selectedAddress = def;
          _selectedAddressId = def.id;
          renderCheckout();
        }
      } catch (e) {}
    })();
  }
}

async function submitOrder() {
  const name = document.getElementById('recipient-name').value.trim();
  const phone = document.getElementById('recipient-phone').value.trim();
  const address = document.getElementById('recipient-address').value.trim();
  const date = document.getElementById('delivery-date').value;
  const card = document.getElementById('greeting-card').value.trim();

  if (!name) { showToast('请输入收花人姓名'); return; }
  if (!phone) { showToast('请输入联系电话'); return; }
  if (!address) { showToast('请输入配送地址'); return; }
  if (!date) { showToast('请选择配送日期'); return; }

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: USER_ID,
        items: cart,
        total_price: total,
        recipient_name: name,
        recipient_phone: phone,
        recipient_address: address,
        delivery_date: date,
        greeting_card: card
      })
    });
    const data = await res.json();
    if (data.success) {
      cart = [];
      saveCart();
      window._selectedAddress = null;
      _selectedAddressId = null;
      document.getElementById('order-success-content').innerHTML = `
        <div class="icon">🎉</div>
        <h2>支付成功！</h2>
        <p>订单号：#${data.id}<br>您的花束将在${date}准时送达</p>
        <div class="btns">
          <button style="background:linear-gradient(135deg,var(--pink-4),var(--pink-6));color:#fff" onclick="navigateTo('orders')">查看订单</button>
          <button style="background:#fff;color:var(--pink-6);border:1.5px solid var(--pink-3)" onclick="navigateTo('home')">继续逛逛</button>
        </div>
      `;
      navigateTo('order-success');
    }
  } catch (err) {
    showToast('下单失败，请重试');
  }
}

// ==================== Init ====================
document.addEventListener('DOMContentLoaded', () => {
  const hash = location.hash.slice(1) || 'home';
  navigateTo(hash, false);
});
