const express = require('express');
const router = express.Router();
const productService = require('../services/ProductService');

// Get all products
router.get('/', (req, res) => {
  try {
    const { category } = req.query;
    let products;

    if (category) {
      products = productService.getProductsByCategory(category);
    } else {
      products = productService.getAllProducts();
    }

    res.json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get product by ID
router.get('/:id', (req, res) => {
  try {
    const product = productService.getProductById(req.params.id);
    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

// Create new product
router.post('/', (req, res) => {
  try {
    const { name, description, price, stock, category } = req.body;

    if (!name || !price || stock === undefined || !category) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    const product = productService.createProduct(
      name,
      description,
      price,
      stock,
      category
    );

    res.status(201).json({
      success: true,
      data: product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update product
router.put('/:id', (req, res) => {
  try {
    const product = productService.updateProduct(req.params.id, req.body);
    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

// Delete product
router.delete('/:id', (req, res) => {
  try {
    productService.deleteProduct(req.params.id);
    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
