import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { Environment, KameleoonClient } from '@kameleoon/nodejs-sdk';
import { KameleoonVisitorCodeManager } from '@kameleoon/nodejs-visitor-code-manager';
import { KameleoonEventSource } from '@kameleoon/nodejs-event-source';
import { KameleoonRequester } from '@kameleoon/nodejs-requester';


const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
const corsOptions = {
  origin: [
    'http://localhost:3000',     // React development server
    'https://gueripep.com',      // Production domain
    'https://www.gueripep.com',   // Production domain with www
    'https://api.gueripep.com'   // API domain
  ],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

//Kameleoon
// -- Mandatory credentials
const credentials = {
  clientId: process.env.KAMELEOON_CLIENT_ID,
  clientSecret: process.env.KAMELEOON_CLIENT_SECRET,
};
const configuration = {
  updateInterval: 1,
  environment: Environment.Production,
};

const client = new KameleoonClient({
  siteCode: 'dnkd8eslzh',
  credentials,
  configuration,
  externals: {
    visitorCodeManager: new KameleoonVisitorCodeManager(),
    eventSource: new KameleoonEventSource(),
    requester: new KameleoonRequester(),
  },
});
// -- Waiting for the client initialization using `async/await`
async function init() {
  await client.initialize();
}
init();

client
  .initialize()
  .then(() => { })
  .catch((error) => { });

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
app.get('/products', (req, res) => {
  res.json(products);
});

// Get product by ID
app.get('/products/:id', (req, res) => {
  const productId = parseInt(req.params.id);
  const product = products.find(p => p.id === productId);

  if (product) {
    res.json(product);
  } else {
    res.status(404).json({ message: 'Product not found' });
  }
});

// Search products
app.get('/products/search/:query', (req, res) => {
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
app.get('/cart/:userId', (req, res) => {
  const userId = req.params.userId;
  const cart = carts[userId] || [];
  res.json(cart);
});

// Add item to cart
app.post('/cart/:userId', (req, res) => {
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
app.delete('/cart/:userId/:productId', (req, res) => {
  const userId = req.params.userId;
  const productId = parseInt(req.params.productId);

  if (carts[userId]) {
    carts[userId] = carts[userId].filter(item => item.productId !== productId);
  }

  res.json(carts[userId] || []);
});

// Update cart item quantity
app.put('/cart/:userId/:productId', (req, res) => {
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

// Checkout endpoint - clears cart and returns order confirmation
app.post('/checkout/:userId', (req, res) => {
  const userId = req.params.userId;
  const { visitorCode: providedVisitorCode } = req.body;
  const cartItems = carts[userId] || [];

  if (cartItems.length === 0) {
    return res.status(400).json({ message: 'Cart is empty' });
  }

  // Calculate total for the order
  const total = cartItems.reduce((sum, item) => {
    const product = products.find(p => p.id === item.productId);
    return sum + (product ? product.price * item.quantity : 0);
  }, 0).toFixed(2);

  // Create order confirmation
  const order = {
    orderId: Date.now().toString(),
    userId: userId,
    items: cartItems.map(item => {
      const product = products.find(p => p.id === item.productId);
      return {
        productId: item.productId,
        productName: product ? product.name : 'Unknown Product',
        quantity: item.quantity,
        price: product ? product.price : 0
      };
    }),
    total,
    timestamp: new Date().toISOString()
  };
  
  // Only track conversion if visitor code is provided from frontend
  if (providedVisitorCode) {
    console.log('Visitor Code at checkout:', providedVisitorCode);
    console.log('Tracking conversion with frontend visitor code');
    // -- Track conversion
    client.trackConversion({
      visitorCode: providedVisitorCode,
      revenue: total,
      goalId: 392016,
    });
  } else {
    console.log('No visitor code provided from frontend - skipping Kameleoon tracking');
  }

  // Clear the cart after checkout
  carts[userId] = [];
  console.log(`Order placed:`, order);



  res.json({
    success: true,
    message: 'Checkout successful',
    order: order
  });
});

app.listen(PORT, () => {
  console.log(`Shopping backend server running on port ${PORT}`);
});