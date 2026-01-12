const Product = require('../models/Product');

class ProductService {
  constructor() {
    this.products = new Map();
    this.initializeSampleProducts();
  }

  initializeSampleProducts() {
    const sampleProducts = [
      new Product('Laptop', 'High-performance laptop', 999.99, 10, 'Electronics'),
      new Product('Smartphone', 'Latest smartphone model', 699.99, 25, 'Electronics'),
      new Product('Headphones', 'Wireless noise-canceling headphones', 199.99, 50, 'Audio'),
      new Product('Coffee Maker', 'Automatic coffee maker', 79.99, 15, 'Home'),
    ];

    sampleProducts.forEach(product => {
      this.products.set(product.id, product);
    });
  }

  getAllProducts() {
    return Array.from(this.products.values());
  }

  getProductById(id) {
    const product = this.products.get(id);
    if (!product) {
      throw new Error('Product not found');
    }
    return product;
  }

  getProductsByCategory(category) {
    return Array.from(this.products.values()).filter(
      product => product.category.toLowerCase() === category.toLowerCase()
    );
  }

  createProduct(name, description, price, stock, category) {
    const product = new Product(name, description, price, stock, category);
    this.products.set(product.id, product);
    return product;
  }

  updateProduct(id, updates) {
    const product = this.getProductById(id);
    Object.assign(product, updates);
    return product;
  }

  deleteProduct(id) {
    const deleted = this.products.delete(id);
    if (!deleted) {
      throw new Error('Product not found');
    }
    return true;
  }

  updateStock(id, quantity) {
    const product = this.getProductById(id);
    product.updateStock(quantity);
    return product;
  }
}

module.exports = new ProductService();
