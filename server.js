const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Sample products data
const products = [
  {
    id: 1,
    name: "Wireless Headphones",
    price: 99.99,
    description: "High-quality wireless headphones with noise cancellation",
    image: "https://picsum.photos/300/300"
  },
  {
    id: 2,
    name: "Smartphone",
    price: 699.99,
    description: "Latest smartphone with advanced camera features",
    image: "https://picsum.photos/300/300"
  },
  {
    id: 3,
    name: "Laptop",
    price: 1299.99,
    description: "Powerful laptop for work and gaming",
    image: "https://picsum.photos/300/300"
  },
  {
    id: 4,
    name: "Smart Watch",
    price: 299.99,
    description: "Fitness tracking and smart notifications",
    image: "https://picsum.photos/300/300"
  },
  {
    id: 5,
    name: "Tablet",
    price: 449.99,
    description: "10-inch tablet perfect for entertainment and productivity",
    image: "https://picsum.photos/300/300"
  },
  {
    id: 6,
    name: "Gaming Console",
    price: 499.99,
    description: "Next-generation gaming console with 4K support",
    image: "https://picsum.photos/300/300"
  }
];

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Shopping Backend API' });
});

// Get all products
app.get('/api/products', (req, res) => {
  res.json(products);
});

// Get product by ID
app.get('/api/products/:id', (req, res) => {
  const productId = parseInt(req.params.id);
  const product = products.find(p => p.id === productId);
  
  if (product) {
    res.json(product);
  } else {
    res.status(404).json({ message: 'Product not found' });
  }
});

// Search products
app.get('/api/products/search/:query', (req, res) => {
  const query = req.params.query.toLowerCase();
  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(query) ||
    product.description.toLowerCase().includes(query)
  );
  res.json(filteredProducts);
});

// Cart endpoints (in-memory storage for demo)
let carts = {};

// Get cart for user
app.get('/api/cart/:userId', (req, res) => {
  const userId = req.params.userId;
  const cart = carts[userId] || [];
  res.json(cart);
});

// Add item to cart
app.post('/api/cart/:userId', (req, res) => {
  const userId = req.params.userId;
  const { productId, quantity = 1 } = req.body;
  
  if (!carts[userId]) {
    carts[userId] = [];
  }
  
  const existingItem = carts[userId].find(item => item.productId === productId);
  
  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    carts[userId].push({ productId, quantity });
  }
  
  res.json(carts[userId]);
});

// Remove item from cart
app.delete('/api/cart/:userId/:productId', (req, res) => {
  const userId = req.params.userId;
  const productId = parseInt(req.params.productId);
  
  if (carts[userId]) {
    carts[userId] = carts[userId].filter(item => item.productId !== productId);
  }
  
  res.json(carts[userId] || []);
});

// Update cart item quantity
app.put('/api/cart/:userId/:productId', (req, res) => {
  const userId = req.params.userId;
  const productId = parseInt(req.params.productId);
  const { quantity } = req.body;
  
  if (carts[userId]) {
    const item = carts[userId].find(item => item.productId === productId);
    if (item) {
      item.quantity = quantity;
    }
  }
  
  res.json(carts[userId] || []);
});

app.listen(PORT, () => {
  console.log(`Shopping backend server running on port ${PORT}`);
});