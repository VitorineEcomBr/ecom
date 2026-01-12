# Vitorine E-commerce Platform

A lightweight, RESTful e-commerce backend API with shopping cart functionality and product management.

## Features

- **Product Catalog Management**: Create, read, update, and delete products
- **Shopping Cart**: Add/remove items, update quantities, and checkout
- **Stock Management**: Automatic stock tracking and validation
- **Category Filtering**: Browse products by category
- **In-memory Storage**: Fast, simple data storage (suitable for development/testing)

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start the server
npm start

# Or use development mode with auto-reload
npm run dev
```

The server will start on `http://localhost:3000`

## API Documentation

### Products API

#### Get All Products
```
GET /api/products
```

Query Parameters:
- `category` (optional): Filter by category

Response:
```json
{
  "success": true,
  "count": 4,
  "data": [
    {
      "id": "uuid",
      "name": "Laptop",
      "description": "High-performance laptop",
      "price": 999.99,
      "stock": 10,
      "category": "Electronics",
      "createdAt": "2026-01-12T19:54:00.000Z"
    }
  ]
}
```

#### Get Product by ID
```
GET /api/products/:id
```

#### Create Product
```
POST /api/products
Content-Type: application/json

{
  "name": "Product Name",
  "description": "Product description",
  "price": 99.99,
  "stock": 50,
  "category": "Category Name"
}
```

#### Update Product
```
PUT /api/products/:id
Content-Type: application/json

{
  "price": 89.99,
  "stock": 45
}
```

#### Delete Product
```
DELETE /api/products/:id
```

### Shopping Cart API

#### Get Cart
```
GET /api/cart/:userId
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "cart-uuid",
    "userId": "user123",
    "items": [
      {
        "productId": "product-uuid",
        "name": "Laptop",
        "price": 999.99,
        "quantity": 2
      }
    ],
    "itemCount": 2,
    "total": 1999.98,
    "updatedAt": "2026-01-12T19:54:00.000Z"
  }
}
```

#### Add Item to Cart
```
POST /api/cart/:userId/items
Content-Type: application/json

{
  "productId": "product-uuid",
  "quantity": 2
}
```

#### Update Item Quantity
```
PUT /api/cart/:userId/items/:productId
Content-Type: application/json

{
  "quantity": 3
}
```

#### Remove Item from Cart
```
DELETE /api/cart/:userId/items/:productId
```

#### Clear Cart
```
DELETE /api/cart/:userId
```

#### Checkout
```
POST /api/cart/:userId/checkout
```

Response:
```json
{
  "success": true,
  "message": "Order completed successfully",
  "data": {
    "orderId": "order-uuid",
    "userId": "user123",
    "items": [...],
    "total": 1999.98,
    "createdAt": "2026-01-12T19:54:00.000Z",
    "status": "completed"
  }
}
```

## Example Usage

```bash
# Get all products
curl http://localhost:3000/api/products

# Get products by category
curl http://localhost:3000/api/products?category=Electronics

# Add item to cart
curl -X POST http://localhost:3000/api/cart/user123/items \
  -H "Content-Type: application/json" \
  -d '{"productId": "product-uuid", "quantity": 2}'

# View cart
curl http://localhost:3000/api/cart/user123

# Checkout
curl -X POST http://localhost:3000/api/cart/user123/checkout
```

## Project Structure

```
ecom/
├── src/
│   ├── models/
│   │   ├── Product.js       # Product model with stock management
│   │   └── Cart.js          # Cart and CartItem models
│   ├── services/
│   │   ├── ProductService.js # Product business logic
│   │   └── CartService.js    # Cart business logic
│   ├── routes/
│   │   ├── products.js       # Product API endpoints
│   │   └── cart.js           # Cart API endpoints
│   └── server.js             # Express server setup
├── package.json
└── README.md
```

## Features Implemented

### Product Management
- UUID-based product identification
- Stock tracking and availability checking
- Category-based organization
- CRUD operations with validation

### Shopping Cart
- User-specific carts
- Add/remove items with quantity management
- Automatic subtotal and total calculation
- Stock validation before adding items
- Checkout with automatic stock deduction
- Cart persistence per user session

### API Design
- RESTful endpoints
- Consistent JSON response format
- Error handling and validation
- CORS support for frontend integration

## Future Enhancements

Consider adding:
- User authentication and authorization
- Persistent database (MongoDB, PostgreSQL)
- Order history tracking
- Payment gateway integration
- Product images and reviews
- Search and advanced filtering
- Discount codes and promotions
- Inventory alerts for low stock
- Rate limiting and API security

## License

MIT
