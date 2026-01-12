const express = require('express');
const router = express.Router();
const cartService = require('../services/CartService');

// Get cart for user
router.get('/:userId', (req, res) => {
  try {
    const cart = cartService.getOrCreateCart(req.params.userId);
    res.json({
      success: true,
      data: {
        id: cart.id,
        userId: cart.userId,
        items: cart.getItems(),
        itemCount: cart.getItemCount(),
        total: cart.getTotal(),
        updatedAt: cart.updatedAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Add item to cart
router.post('/:userId/items', (req, res) => {
  try {
    const { productId, quantity } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        error: 'Product ID is required'
      });
    }

    const cart = cartService.addItemToCart(
      req.params.userId,
      productId,
      quantity || 1
    );

    res.json({
      success: true,
      message: 'Item added to cart',
      data: {
        items: cart.getItems(),
        itemCount: cart.getItemCount(),
        total: cart.getTotal()
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Update cart item quantity
router.put('/:userId/items/:productId', (req, res) => {
  try {
    const { quantity } = req.body;

    if (!quantity || quantity <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid quantity is required'
      });
    }

    const cart = cartService.updateCartItemQuantity(
      req.params.userId,
      req.params.productId,
      quantity
    );

    res.json({
      success: true,
      message: 'Cart updated',
      data: {
        items: cart.getItems(),
        itemCount: cart.getItemCount(),
        total: cart.getTotal()
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Remove item from cart
router.delete('/:userId/items/:productId', (req, res) => {
  try {
    const cart = cartService.removeItemFromCart(
      req.params.userId,
      req.params.productId
    );

    res.json({
      success: true,
      message: 'Item removed from cart',
      data: {
        items: cart.getItems(),
        itemCount: cart.getItemCount(),
        total: cart.getTotal()
      }
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

// Clear cart
router.delete('/:userId', (req, res) => {
  try {
    const cart = cartService.clearCart(req.params.userId);
    res.json({
      success: true,
      message: 'Cart cleared',
      data: {
        items: cart.getItems(),
        itemCount: cart.getItemCount(),
        total: cart.getTotal()
      }
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

// Checkout
router.post('/:userId/checkout', (req, res) => {
  try {
    const order = cartService.checkout(req.params.userId);
    res.json({
      success: true,
      message: 'Order completed successfully',
      data: order
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
