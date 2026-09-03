const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.SQLITE_PATH || path.join(__dirname, '../../data/wishlist.db');
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
const db = new DatabaseSync(DB_PATH);

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id TEXT UNIQUE NOT NULL,
      product_name TEXT NOT NULL,
      brand TEXT NOT NULL,
      category TEXT NOT NULL,
      price REAL NOT NULL,
      original_price REAL,
      discount_percent INTEGER DEFAULT 0,
      image_url TEXT NOT NULL,
      color TEXT NOT NULL,
      material TEXT,
      available_sizes TEXT NOT NULL,
      occasion TEXT,
      style_tags TEXT,
      rating REAL DEFAULT 4.0,
      review_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS wishlist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id TEXT NOT NULL,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(product_id)
    );

    CREATE TABLE IF NOT EXISTS cart (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id TEXT NOT NULL,
      size TEXT,
      quantity INTEGER DEFAULT 1,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      source TEXT DEFAULT 'direct',
      FOREIGN KEY (product_id) REFERENCES products(product_id)
    );

    CREATE TABLE IF NOT EXISTS style_saves (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id TEXT NOT NULL,
      analysis_result TEXT NOT NULL,
      saved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(product_id)
    );

    CREATE TABLE IF NOT EXISTS analytics_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_name TEXT NOT NULL,
      product_id TEXT,
      product_category TEXT,
      ai_score INTEGER,
      analysis_latency_ms INTEGER,
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  seedProducts();
}

function seedProducts() {
  const count = db.prepare('SELECT COUNT(*) as count FROM products').get();
  if (count.count > 0) return;

  const products = [
    {
      product_id: 'PROD001',
      product_name: 'Floral Wrap Midi Dress',
      brand: 'HERE&NOW',
      category: 'Dress',
      price: 1299,
      original_price: 2599,
      discount_percent: 50,
      image_url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400&h=500&fit=crop',
      color: 'Dusty Rose & Ivory',
      material: 'Viscose Crepe',
      available_sizes: JSON.stringify(['XS', 'S', 'M', 'L', 'XL']),
      occasion: 'Casual, Brunch, Day Out',
      style_tags: JSON.stringify(['floral', 'midi', 'wrap', 'feminine', 'boho', 'summer']),
      rating: 4.3,
      review_count: 1247,
    },
    {
      product_id: 'PROD002',
      product_name: 'Bandhani Print Cotton Kurti',
      brand: 'BIBA',
      category: 'Kurti',
      price: 999,
      original_price: 1799,
      discount_percent: 44,
      image_url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=400&h=500&fit=crop',
      color: 'Indigo Blue & White',
      material: '100% Cotton',
      available_sizes: JSON.stringify(['S', 'M', 'L', 'XL', 'XXL']),
      occasion: 'Casual, Office, Festive',
      style_tags: JSON.stringify(['ethnic', 'bandhani', 'cotton', 'traditional', 'printed', 'indian']),
      rating: 4.5,
      review_count: 3892,
    },
    {
      product_id: 'PROD003',
      product_name: 'Kanjivaram Silk Saree',
      brand: 'Kalki Fashion',
      category: 'Saree',
      price: 8499,
      original_price: 12999,
      discount_percent: 35,
      image_url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&h=500&fit=crop',
      color: 'Deep Magenta & Gold',
      material: 'Pure Silk',
      available_sizes: JSON.stringify(['Free Size']),
      occasion: 'Wedding, Festive, Puja, Ceremony',
      style_tags: JSON.stringify(['silk', 'saree', 'traditional', 'wedding', 'festive', 'kanjivaram', 'ethnic']),
      rating: 4.7,
      review_count: 856,
    },
    {
      product_id: 'PROD004',
      product_name: 'Oversized Linen Co-ord Set',
      brand: 'MANGO',
      category: 'Co-ord Set',
      price: 3499,
      original_price: 5999,
      discount_percent: 42,
      image_url: 'https://images.unsplash.com/photo-1594938298603-c8148c4b4c0a?w=400&h=500&fit=crop',
      color: 'Sand Beige',
      material: 'Linen Blend',
      available_sizes: JSON.stringify(['XS', 'S', 'M', 'L', 'XL']),
      occasion: 'Brunch, Travel, Casual, Weekend',
      style_tags: JSON.stringify(['coord', 'linen', 'oversized', 'minimal', 'neutral', 'summer', 'trendy']),
      rating: 4.4,
      review_count: 2103,
    },
    {
      product_id: 'PROD005',
      product_name: 'High-Rise Straight Fit Jeans',
      brand: 'Levis',
      category: 'Jeans',
      price: 2799,
      original_price: 3999,
      discount_percent: 30,
      image_url: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=400&h=500&fit=crop',
      color: 'Classic Indigo Blue',
      material: '98% Cotton, 2% Elastane',
      available_sizes: JSON.stringify(['24', '26', '28', '30', '32', '34', '36']),
      occasion: 'Casual, College, Work, Weekend',
      style_tags: JSON.stringify(['denim', 'jeans', 'high-rise', 'straight', 'classic', 'versatile']),
      rating: 4.6,
      review_count: 5672,
    },
    {
      product_id: 'PROD006',
      product_name: 'Relaxed Fit Printed Oversized Shirt',
      brand: 'H&M',
      category: 'Top',
      price: 1499,
      original_price: 2499,
      discount_percent: 40,
      image_url: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&h=500&fit=crop',
      color: 'Abstract Teal Print',
      material: 'Viscose',
      available_sizes: JSON.stringify(['XS', 'S', 'M', 'L', 'XL', 'XXL']),
      occasion: 'Casual, Beach, Brunch, Travel',
      style_tags: JSON.stringify(['oversized', 'shirt', 'printed', 'relaxed', 'street-style', 'summer']),
      rating: 4.2,
      review_count: 1834,
    },
    {
      product_id: 'PROD007',
      product_name: 'Structured Power Blazer',
      brand: 'AND',
      category: 'Blazer',
      price: 3999,
      original_price: 6499,
      discount_percent: 38,
      image_url: 'https://images.unsplash.com/photo-1591369822096-ffd140ec948f?w=400&h=500&fit=crop',
      color: 'Charcoal Grey',
      material: 'Polyester Blend',
      available_sizes: JSON.stringify(['XS', 'S', 'M', 'L', 'XL']),
      occasion: 'Office, Formal, Meetings, Evening Out',
      style_tags: JSON.stringify(['blazer', 'formal', 'structured', 'power-dressing', 'office', 'sophisticated']),
      rating: 4.5,
      review_count: 921,
    },
    {
      product_id: 'PROD008',
      product_name: 'Embroidered Anarkali Suit Set',
      brand: 'W for Woman',
      category: 'Ethnic Wear',
      price: 4299,
      original_price: 6999,
      discount_percent: 39,
      image_url: 'https://images.unsplash.com/photo-1585944285597-e67af9f15c9d?w=400&h=500&fit=crop',
      color: 'Peacock Green & Gold',
      material: 'Art Silk with Embroidery',
      available_sizes: JSON.stringify(['XS', 'S', 'M', 'L', 'XL', 'XXL']),
      occasion: 'Festive, Wedding, Party, Eid, Diwali',
      style_tags: JSON.stringify(['anarkali', 'ethnic', 'embroidered', 'festive', 'traditional', 'flared', 'occasion-wear']),
      rating: 4.6,
      review_count: 1456,
    },
  ];

  const insertProduct = db.prepare(`
    INSERT INTO products (
      product_id, product_name, brand, category, price, original_price,
      discount_percent, image_url, color, material, available_sizes,
      occasion, style_tags, rating, review_count
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const item of products) {
    insertProduct.run(
      item.product_id,
      item.product_name,
      item.brand,
      item.category,
      item.price,
      item.original_price,
      item.discount_percent,
      item.image_url,
      item.color,
      item.material,
      item.available_sizes,
      item.occasion,
      item.style_tags,
      item.rating,
      item.review_count
    );
  }

  const insertWishlist = db.prepare('INSERT INTO wishlist (product_id) VALUES (?)');
  for (const p of products) insertWishlist.run(p.product_id);

  console.log('✅ Database seeded with 8 products and wishlist items');
}

module.exports = { db, initializeDatabase };
