const { v4: uuidv4 } = require('uuid');

class Product {
  constructor(name, description, price, stock, category) {
    this.id = uuidv4();
    this.name = name;
    this.description = description;
    this.price = price;
    this.stock = stock;
    this.category = category;
    this.createdAt = new Date().toISOString();
  }

  updateStock(quantity) {
    if (this.stock + quantity < 0) {
      throw new Error('Insufficient stock');
    }
    this.stock += quantity;
  }

  isAvailable() {
    return this.stock > 0;
  }
}

module.exports = Product;
