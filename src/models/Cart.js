const { v4: uuidv4 } = require('uuid');

class CartItem {
  constructor(product, quantity) {
    this.productId = product.id;
    this.name = product.name;
    this.price = product.price;
    this.quantity = quantity;
  }

  getSubtotal() {
    return this.price * this.quantity;
  }
}

class Cart {
  constructor(userId) {
    this.id = uuidv4();
    this.userId = userId;
    this.items = new Map();
    this.createdAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
  }

  addItem(product, quantity = 1) {
    if (quantity <= 0) {
      throw new Error('Quantity must be positive');
    }

    if (!product.isAvailable()) {
      throw new Error('Product is out of stock');
    }

    if (product.stock < quantity) {
      throw new Error(`Only ${product.stock} items available`);
    }

    const existingItem = this.items.get(product.id);
    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      if (product.stock < newQuantity) {
        throw new Error(`Only ${product.stock} items available`);
      }
      existingItem.quantity = newQuantity;
    } else {
      this.items.set(product.id, new CartItem(product, quantity));
    }

    this.updatedAt = new Date().toISOString();
  }

  removeItem(productId) {
    const deleted = this.items.delete(productId);
    if (!deleted) {
      throw new Error('Item not found in cart');
    }
    this.updatedAt = new Date().toISOString();
  }

  updateQuantity(productId, quantity) {
    if (quantity <= 0) {
      throw new Error('Quantity must be positive');
    }

    const item = this.items.get(productId);
    if (!item) {
      throw new Error('Item not found in cart');
    }

    item.quantity = quantity;
    this.updatedAt = new Date().toISOString();
  }

  clear() {
    this.items.clear();
    this.updatedAt = new Date().toISOString();
  }

  getItems() {
    return Array.from(this.items.values());
  }

  getTotal() {
    return Array.from(this.items.values()).reduce(
      (total, item) => total + item.getSubtotal(),
      0
    );
  }

  getItemCount() {
    return Array.from(this.items.values()).reduce(
      (count, item) => count + item.quantity,
      0
    );
  }

  isEmpty() {
    return this.items.size === 0;
  }
}

module.exports = Cart;
