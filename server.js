const express = require('express');
const Database = require('better-sqlite3');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `flower_${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database setup
const db = new Database(path.join(__dirname, 'flower_shop.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    original_price REAL,
    image TEXT DEFAULT '/uploads/default.jpg',
    category TEXT NOT NULL,
    description TEXT,
    selling_point TEXT,
    flower_composition TEXT,
    flower_language TEXT,
    care_instructions TEXT,
    size_options TEXT DEFAULT '["标准款"]',
    stock INTEGER DEFAULT 100,
    sales INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    items TEXT NOT NULL,
    total_price REAL NOT NULL,
    recipient_name TEXT,
    recipient_phone TEXT,
    recipient_address TEXT,
    delivery_date TEXT,
    greeting_card TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    product_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, product_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  );
`);

// Seed data
const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
if (productCount === 0) {
  const insertProduct = db.prepare(`
    INSERT INTO products (name, price, original_price, image, category, description, selling_point, flower_composition, flower_language, care_instructions, size_options, stock, sales)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const products = [
    {
      name: '暖阳向日葵花束',
      price: 128,
      original_price: 168,
      image: '/uploads/sunflower.jpg',
      category: '生日',
      description: '精选10支A级向日葵，搭配尤加利叶，阳光般温暖的祝福。',
      selling_point: '送给TA最灿烂的笑容',
      flower_composition: '向日葵 x10、尤加利叶 x5、满天星 x3',
      flower_language: '向日葵代表沉默的爱与忠诚，寓意阳光、希望与活力。',
      care_instructions: '收到后斜剪根部2cm，放入清水花瓶中，每两天换水一次，避免阳光直射。花期约7-10天。',
      size_options: '["小束(6支)","标准款(10支)","豪华款(16支)"]',
      stock: 50,
      sales: 128
    },
    {
      name: '浪漫红玫瑰礼盒',
      price: 199,
      original_price: 268,
      image: '/uploads/rose_box.jpg',
      category: '纪念日',
      description: '33朵厄瓜多尔红玫瑰，高级黑色礼盒包装，永恒的浪漫之选。',
      selling_point: '三生三世，只为你绽放',
      flower_composition: '红玫瑰 x33、尤加利叶 x6、情人草 x适量',
      flower_language: '红玫瑰是爱情最经典的象征，33朵寓意三生三世的爱恋。',
      care_instructions: '礼盒内置保鲜泥，无需加水。保持室温20-25度，避免空调直吹。花期约5-7天。',
      size_options: '["11朵","19朵","33朵","52朵"]',
      stock: 30,
      sales: 256
    },
    {
      name: '清新混搭小花束',
      price: 68,
      original_price: 98,
      image: '/uploads/mixed_small.jpg',
      category: '日常',
      description: '雏菊、洋桔梗、小菊混搭，清新自然，适合日常点缀生活。',
      selling_point: '买花不为谁，只为取悦自己',
      flower_composition: '雏菊 x3、洋桔梗 x3、小菊 x5、尤加利叶 x3',
      flower_language: '雏菊代表纯真与快乐，洋桔梗象征真诚不变的爱。',
      care_instructions: '斜剪根部后放入花瓶，加入保鲜剂效果更佳。每两天换水修剪一次。花期约7-10天。',
      size_options: '["迷你款","标准款"]',
      stock: 80,
      sales: 412
    },
    {
      name: '开业大麦花篮',
      price: 268,
      original_price: 358,
      image: '/uploads/wheat_basket.jpg',
      category: '开业',
      description: '大麦谐音"大卖"，搭配红掌、百合，寓意生意兴隆、财源广进。',
      selling_point: '开业大吉，大卖大赚',
      flower_composition: '大麦 x20支、红掌 x5、百合 x3、剑兰 x5',
      flower_language: '大麦寓意丰收与财富，红掌象征鸿运当头，百合代表百年好合。',
      care_instructions: '花篮为插花作品，请勿移动。可适当在花泥中补水，保持花泥湿润即可。观赏期约5-7天。',
      size_options: '["单层花篮","双层豪华花篮"]',
      stock: 20,
      sales: 89
    },
    {
      name: '温柔粉百合花束',
      price: 158,
      original_price: 199,
      image: '/uploads/lily_pink.jpg',
      category: '生日',
      description: '精选6支粉色百合，搭配白色满天星，温柔优雅的生日祝福。',
      selling_point: '愿你的每一天都如百合般美好',
      flower_composition: '粉百合 x6、满天星 x5、银叶菊 x3',
      flower_language: '百合象征纯洁与高雅，粉色百合代表清纯与甜蜜。',
      care_instructions: '斜剪根部45度，去除水位线以下的叶子。每两天换水，花瓶中可加少许保鲜剂。花期约10-14天。',
      size_options: '["3朵","6朵","9朵"]',
      stock: 45,
      sales: 178
    },
    {
      name: '永生花玻璃罩',
      price: 328,
      original_price: 458,
      image: '/uploads/preserved_rose.jpg',
      category: '纪念日',
      description: '厄瓜多尔永生玫瑰，玻璃罩封装，无需打理，可保存3-5年。',
      selling_point: '爱如永生花，永不凋零',
      flower_composition: '永生玫瑰 x1、永生绣球 x适量、满天星 x适量',
      flower_language: '永生花代表永不凋谢的爱情，是承诺与永恒的象征。',
      care_instructions: '避免阳光直射和潮湿环境，不可浇水。如落灰可用软毛刷轻轻清理。正常保存可维持3-5年。',
      size_options: '["小号","中号","大号"]',
      stock: 25,
      sales: 95
    },
    {
      name: '向日葵开业花篮',
      price: 198,
      original_price: 258,
      image: '/uploads/sun_basket.jpg',
      category: '开业',
      description: '向日葵搭配红玫瑰与百合，大气喜庆，开业祝贺首选。',
      selling_point: '前程似锦，一路繁花',
      flower_composition: '向日葵 x8、红玫瑰 x10、百合 x2、剑兰 x3',
      flower_language: '向日葵寓意蒸蒸日上，红玫瑰代表热情与成功。',
      care_instructions: '花篮为插花作品，保持花泥湿润即可。避免强风直吹，可适当喷水保湿。观赏期约5-7天。',
      size_options: '["标准花篮","豪华花篮"]',
      stock: 15,
      sales: 67
    },
    {
      name: '满天星干花花束',
      price: 88,
      original_price: 128,
      image: '/uploads/baby_breath.jpg',
      category: '日常',
      description: '满天星干花花束，浪漫梦幻，可长期保存，宿舍装饰神器。',
      selling_point: '满眼星辰，皆是你',
      flower_composition: '满天星干花 x大束、尤加利干叶 x适量',
      flower_language: '满天星代表甘愿做配角的爱，也象征纯洁与关怀。',
      care_instructions: '干花请勿沾水，避免潮湿环境。如落灰可用吹风机冷风档轻吹。可保存1-2年。',
      size_options: '["小束","标准束","大束"]',
      stock: 60,
      sales: 334
    }
  ];

  const insertMany = db.transaction((items) => {
    for (const p of items) {
      insertProduct.run(p.name, p.price, p.original_price, p.image, p.category, p.description, p.selling_point, p.flower_composition, p.flower_language, p.care_instructions, p.size_options, p.stock, p.sales);
    }
  });
  insertMany(products);

  // Seed a default user
  db.prepare('INSERT INTO users (name, phone, address) VALUES (?, ?, ?)').run('测试用户', '13800138000', '北京市朝阳区建国路88号');

  // Seed some orders
  const insertOrder = db.prepare(`
    INSERT INTO orders (user_id, items, total_price, recipient_name, recipient_phone, recipient_address, delivery_date, greeting_card, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = new Date();
  const orderData = [
    {
      user_id: 1,
      items: JSON.stringify([{ product_id: 1, name: '暖阳向日葵花束', size: '标准款(10支)', quantity: 1, price: 128 }]),
      total_price: 128,
      recipient_name: '小明',
      recipient_phone: '13900139000',
      recipient_address: '上海市浦东新区陆家嘴',
      delivery_date: new Date(now.getTime() - 3 * 86400000).toISOString().split('T')[0],
      greeting_card: '生日快乐！愿你每天都像向日葵一样阳光！',
      status: 'completed',
      created_at: new Date(now.getTime() - 5 * 86400000).toISOString()
    },
    {
      user_id: 1,
      items: JSON.stringify([{ product_id: 2, name: '浪漫红玫瑰礼盒', size: '33朵', quantity: 1, price: 199 }]),
      total_price: 199,
      recipient_name: '小红',
      recipient_phone: '13700137000',
      recipient_address: '广州市天河区珠江新城',
      delivery_date: new Date(now.getTime() + 2 * 86400000).toISOString().split('T')[0],
      greeting_card: '三周年快乐，感谢有你！',
      status: 'shipped',
      created_at: new Date(now.getTime() - 1 * 86400000).toISOString()
    },
    {
      user_id: 1,
      items: JSON.stringify([{ product_id: 3, name: '清新混搭小花束', size: '标准款', quantity: 2, price: 136 }]),
      total_price: 136,
      recipient_name: '自己',
      recipient_phone: '13800138000',
      recipient_address: '北京市朝阳区建国路88号',
      delivery_date: new Date(now.getTime() + 1 * 86400000).toISOString().split('T')[0],
      greeting_card: '',
      status: 'pending',
      created_at: now.toISOString()
    }
  ];

  for (const o of orderData) {
    insertOrder.run(o.user_id, o.items, o.total_price, o.recipient_name, o.recipient_phone, o.recipient_address, o.delivery_date, o.greeting_card, o.status, o.created_at);
  }

  console.log('Seed data inserted successfully.');
}

// ==================== API Routes ====================

// Get all products (with optional category filter)
app.get('/api/products', (req, res) => {
  const { category, search } = req.query;
  let sql = 'SELECT * FROM products WHERE 1=1';
  const params = [];
  if (category && category !== '全部') {
    sql += ' AND category = ?';
    params.push(category);
  }
  if (search) {
    sql += ' AND (name LIKE ? OR description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  sql += ' ORDER BY sales DESC';
  const products = db.prepare(sql).all(...params);
  res.json(products);
});

// Get single product
app.get('/api/products/:id', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: '商品不存在' });
  res.json(product);
});

// Admin: create product
app.post('/api/products', upload.single('image'), (req, res) => {
  try {
    const { name, price, original_price, category, description, selling_point, flower_composition, flower_language, care_instructions, size_options, stock } = req.body;
    const image = req.file ? `/uploads/${req.file.filename}` : '/uploads/default.jpg';
    const result = db.prepare(`
      INSERT INTO products (name, price, original_price, image, category, description, selling_point, flower_composition, flower_language, care_instructions, size_options, stock)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(name, parseFloat(price), parseFloat(original_price) || null, image, category, description, selling_point, flower_composition, flower_language, care_instructions, size_options || '["标准款"]', parseInt(stock) || 100);
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: update product
app.put('/api/products/:id', upload.single('image'), (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: '商品不存在' });

    const { name, price, original_price, category, description, selling_point, flower_composition, flower_language, care_instructions, size_options, stock } = req.body;
    const image = req.file ? `/uploads/${req.file.filename}` : existing.image;

    db.prepare(`
      UPDATE products SET name=?, price=?, original_price=?, image=?, category=?, description=?, selling_point=?, flower_composition=?, flower_language=?, care_instructions=?, size_options=?, stock=?
      WHERE id=?
    `).run(name || existing.name, parseFloat(price) || existing.price, parseFloat(original_price) || existing.original_price, image, category || existing.category, description || existing.description, selling_point || existing.selling_point, flower_composition || existing.flower_composition, flower_language || existing.flower_language, care_instructions || existing.care_instructions, size_options || existing.size_options, parseInt(stock) ?? existing.stock, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: delete product
app.delete('/api/products/:id', (req, res) => {
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Get orders (optionally by user_id)
app.get('/api/orders', (req, res) => {
  const { user_id, status } = req.query;
  let sql = 'SELECT * FROM orders WHERE 1=1';
  const params = [];
  if (user_id) {
    sql += ' AND user_id = ?';
    params.push(parseInt(user_id));
  }
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  sql += ' ORDER BY created_at DESC';
  const orders = db.prepare(sql).all(...params);
  res.json(orders);
});

// Get single order
app.get('/api/orders/:id', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: '订单不存在' });
  res.json(order);
});

// Create order
app.post('/api/orders', (req, res) => {
  try {
    const { user_id, items, total_price, recipient_name, recipient_phone, recipient_address, delivery_date, greeting_card } = req.body;
    const result = db.prepare(`
      INSERT INTO orders (user_id, items, total_price, recipient_name, recipient_phone, recipient_address, delivery_date, greeting_card, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `).run(user_id || 1, JSON.stringify(items), total_price, recipient_name, recipient_phone, recipient_address, delivery_date, greeting_card || '');

    // Update sales count
    for (const item of items) {
      db.prepare('UPDATE products SET sales = sales + ?, stock = stock - ? WHERE id = ?').run(item.quantity, item.quantity, item.product_id);
    }

    res.json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: update order status
app.put('/api/orders/:id/status', (req, res) => {
  const { status } = req.body;
  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ success: true });
});

// Admin: get daily order stats
app.get('/api/stats/daily', (req, res) => {
  const stats = db.prepare(`
    SELECT DATE(created_at) as date, COUNT(*) as order_count, SUM(total_price) as total_revenue
    FROM orders
    GROUP BY DATE(created_at)
    ORDER BY date DESC
    LIMIT 30
  `).all();
  res.json(stats);
});

// Favorites
app.get('/api/favorites', (req, res) => {
  const { user_id } = req.query;
  const favs = db.prepare(`
    SELECT f.*, p.name, p.price, p.image, p.selling_point, p.category
    FROM favorites f JOIN products p ON f.product_id = p.id
    WHERE f.user_id = ?
    ORDER BY f.created_at DESC
  `).all(user_id || 1);
  res.json(favs);
});

app.post('/api/favorites', (req, res) => {
  const { user_id, product_id } = req.body;
  try {
    db.prepare('INSERT OR IGNORE INTO favorites (user_id, product_id) VALUES (?, ?)').run(user_id || 1, product_id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/favorites', (req, res) => {
  const { user_id, product_id } = req.query;
  db.prepare('DELETE FROM favorites WHERE user_id = ? AND product_id = ?').run(user_id || 1, product_id);
  res.json({ success: true });
});

app.get('/api/favorites/check', (req, res) => {
  const { user_id, product_id } = req.query;
  const fav = db.prepare('SELECT * FROM favorites WHERE user_id = ? AND product_id = ?').get(user_id || 1, product_id);
  res.json({ isFavorite: !!fav });
});

// Upload endpoint
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '请选择文件' });
  res.json({ url: `/uploads/${req.file.filename}` });
});

// Serve index.html for all other routes (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`花店服务已启动: http://localhost:${PORT}`);
});
