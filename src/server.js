const express = require('express');
const cors = require('cors');

const productsRouter = require('./routes/products');
const cartRouter = require('./routes/cart');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Vitorine E-commerce API',
    version: '1.0.0',
    endpoints: {
      products: '/api/products',
      cart: '/api/cart/:userId'
    }
  });
});

app.use('/api/products', productsRouter);
app.use('/api/cart', cartRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} to see available endpoints`);
});

module.exports = app;
