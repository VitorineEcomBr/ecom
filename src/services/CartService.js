const Cart = require('../models/Cart');
const productService = require('./ProductService');

class CartService {
  constructor() {
    this.carts = new Map();
  }

  getOrCreateCart(userId) {
    let cart = this.carts.get(userId);
    if (!cart) {
      cart = new Cart(userId);
      this.carts.set(userId, cart);
    }
    return cart;
  }

  getCart(userId) {
    const cart = this.carts.get(userId);
    if (!cart) {
      throw new Error('Cart not found');
    }
    return cart;
  }

  addItemToCart(userId, productId, quantity = 1) {
    const cart = this.getOrCreateCart(userId);
    const product = productService.getProductById(productId);
    cart.addItem(product, quantity);
    return cart;
  }

  removeItemFromCart(userId, productId) {
    const cart = this.getCart(userId);
    cart.removeItem(productId);
    return cart;
  }

  updateCartItemQuantity(userId, productId, quantity) {
    const cart = this.getCart(userId);
    const product = productService.getProductById(productId);

    if (product.stock < quantity) {
      throw new Error(`Only ${product.stock} items available`);
    }

    cart.updateQuantity(productId, quantity);
    return cart;
  }

  clearCart(userId) {
    const cart = this.getCart(userId);
    cart.clear();
    return cart;
  }

  deleteCart(userId) {
    const deleted = this.carts.delete(userId);
    if (!deleted) {
      throw new Error('Cart not found');
    }
    return true;
  }

  checkout(userId) {
    const cart = this.getCart(userId);

    if (cart.isEmpty()) {
      throw new Error('Cart is empty');
    }

    // Validate stock availability for all items
    const items = cart.getItems();
    for (const item of items) {
      const product = productService.getProductById(item.productId);
      if (product.stock < item.quantity) {
        throw new Error(`Insufficient stock for ${item.name}`);
      }
    }

    // Deduct stock for all items
    for (const item of items) {
      productService.updateStock(item.productId, -item.quantity);
    }

    const order = {
      orderId: require('uuid').v4(),
      userId,
      items: items.map(item => ({ ...item })),
      total: cart.getTotal(),
      createdAt: new Date().toISOString(),
      status: 'completed'
    };

    cart.clear();
    return order;
  }
}

module.exports = new CartService();
