import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

// Kameleoon & Data
import { products } from './data/products.js';
import { kameleoonClient, trackConversion, KAMELEOON_GOAL_ID } from './lib/kameleoon.js';

const app = express();
const PORT = process.env.PORT || 5001;

// --- Middleware Setup ---

const isDevelopment = process.env.NODE_ENV === 'development';
const corsOptions = {
  origin: isDevelopment ? ['http://localhost:3000'] : ['https://shop.gueripep.com'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

/**
 * Kameleoon Middleware
 * Ensures every request has a visitor code (sets a cookie if missing).
 */
app.use(async (req, res, next) => {
  try {
    kameleoonClient.getVisitorCode({ request: req, response: res });
    next();
  } catch (error) {
    console.error("Kameleoon visitor code error:", error);
    next(error);
  }
});

// --- Product Routes ---

app.get('/', (req, res) => {
  res.json({ message: 'Shopping Backend API' });
});

// Get all products
app.get('/products', (req, res) => {
  res.json(products);
});

// Get product details
app.get('/products/:id', (req, res) => {
  const product = products.find(p => p.id === parseInt(req.params.id));
  product ? res.json(product) : res.status(404).json({ message: 'Product not found' });
});

// Get all unique categories
app.get('/categories', (req, res) => {
  const categories = [...new Set(products.map(p => p.category))].sort();
  res.json(categories);
});

// Filter products by category
app.get('/products/category/:category', (req, res) => {
  const category = req.params.category.toLowerCase();
  const filtered = products.filter(p => p.category.toLowerCase() === category);
  res.json(filtered);
});

// Search products by name, description or category
app.get('/products/search/:query', (req, res) => {
  const query = req.params.query.toLowerCase();
  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(query) ||
    p.description.toLowerCase().includes(query) ||
    p.category.toLowerCase().includes(query)
  );
  res.json(filtered);
});

// --- Cart Management (In-memory storage for demo) ---

let carts = {};

// Get user's cart
app.get('/cart/:userId', (req, res) => {
  res.json(carts[req.params.userId] || []);
});

// Add item to cart
app.post('/cart/:userId', (req, res) => {
  const { userId } = req.params;
  const { productId, quantity = 1 } = req.body;

  if (!carts[userId]) carts[userId] = [];

  const existingItem = carts[userId].find(item => item.productId === productId);
  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    carts[userId].push({ productId, quantity });
  }

  res.json(carts[userId]);
});

// Remove item from cart
app.delete('/cart/:userId/:productId', (req, res) => {
  const { userId, productId } = req.params;
  if (carts[userId]) {
    carts[userId] = carts[userId].filter(item => item.productId !== parseInt(productId));
  }
  res.json(carts[userId] || []);
});

// Update cart item quantity
app.put('/cart/:userId/:productId', (req, res) => {
  const { userId, productId } = req.params;
  const { quantity } = req.body;

  if (carts[userId]) {
    const item = carts[userId].find(item => item.productId === parseInt(productId));
    if (item) item.quantity = quantity;
  }
  res.json(carts[userId] || []);
});

// --- Checkout & Kameleoon Tracking ---
app.post('/checkout/:userId', (req, res) => {
  const { userId } = req.params;
  const cartItems = carts[userId] || [];

  if (cartItems.length === 0) {
    return res.status(400).json({ message: 'Cart is empty' });
  }

  // Calculate order total
  const total = cartItems.reduce((sum, item) => {
    const product = products.find(p => p.id === item.productId);
    return sum + (product ? product.price * item.quantity : 0);
  }, 0).toFixed(2);

  // Kameleoon Conversion Tracking
  const visitorCode = req.cookies.kameleoonVisitorCode;
  if (visitorCode) {
    trackConversion(visitorCode, KAMELEOON_GOAL_ID, total);
  }

  // Clear cart and respond
  carts[userId] = [];
  res.json({
    success: true,
    message: 'Checkout successful',
    order: {
      orderId: Date.now().toString(),
      total,
      timestamp: new Date().toISOString()
    }
  });
});

// --- Server Startup ---

async function startServer() {
  try {
    console.log('Initializing Kameleoon client...');
    await kameleoonClient.initialize();

    app.listen(PORT, () => {
      console.log(`🚀 Shopping backend running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to initialize Kameleoon:', error);
    process.exit(1);
  }
}

startServer();