const express = require("express");
const { v4: uuidv4 } = require("uuid");

const app = express();
const PORT = process.env.PORT || 3002;

app.use(express.json());

// ─── In-memory store (swap with DynamoDB / RDS in production) ────────────────
const products = new Map();

// Seed demo products
const seedProducts = () => {
  const items = [
    { name: "Laptop Pro 15", category: "Electronics", price: 1299.99, stock: 50, description: "High-performance laptop" },
    { name: "Wireless Headphones", category: "Electronics", price: 249.99, stock: 120, description: "Noise-cancelling over-ear" },
    { name: "Standing Desk", category: "Furniture", price: 599.99, stock: 30, description: "Adjustable height desk" },
    { name: "Mechanical Keyboard", category: "Electronics", price: 129.99, stock: 75, description: "TKL layout, Cherry MX switches" },
    { name: "Ergonomic Chair", category: "Furniture", price: 449.99, stock: 20, description: "Lumbar support, adjustable arms" },
  ];
  items.forEach((item) => {
    const id = uuidv4();
    products.set(id, { id, ...item, createdAt: new Date().toISOString() });
  });
  console.log(`✅ Seeded ${items.length} demo products`);
};
seedProducts();

// ─── Health ────────────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "product-service", productCount: products.size });
});

// ─── Products CRUD ────────────────────────────────────────────────────────────
app.get("/products", (req, res) => {
  const { category, minPrice, maxPrice, search } = req.query;
  let result = Array.from(products.values());

  if (category) result = result.filter((p) => p.category.toLowerCase() === category.toLowerCase());
  if (minPrice) result = result.filter((p) => p.price >= parseFloat(minPrice));
  if (maxPrice) result = result.filter((p) => p.price <= parseFloat(maxPrice));
  if (search) result = result.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  res.json({ products: result, total: result.length });
});

app.get("/products/:id", (req, res) => {
  const product = products.get(req.params.id);
  if (!product) return res.status(404).json({ error: "Product not found" });
  res.json(product);
});

app.post("/products", (req, res) => {
  const { name, category, price, stock, description } = req.body;
  if (!name || !category || price === undefined)
    return res.status(400).json({ error: "name, category, and price are required" });

  const product = {
    id: uuidv4(),
    name,
    category,
    price: parseFloat(price),
    stock: stock ?? 0,
    description: description || "",
    createdAt: new Date().toISOString(),
  };
  products.set(product.id, product);
  res.status(201).json(product);
});

app.put("/products/:id", (req, res) => {
  const product = products.get(req.params.id);
  if (!product) return res.status(404).json({ error: "Product not found" });

  const updated = {
    ...product,
    ...req.body,
    id: product.id, // prevent id overwrite
    price: req.body.price !== undefined ? parseFloat(req.body.price) : product.price,
    updatedAt: new Date().toISOString(),
  };
  products.set(product.id, updated);
  res.json(updated);
});

app.delete("/products/:id", (req, res) => {
  if (!products.has(req.params.id))
    return res.status(404).json({ error: "Product not found" });
  products.delete(req.params.id);
  res.json({ message: "Product deleted" });
});

// ─── Categories ───────────────────────────────────────────────────────────────
app.get("/products/meta/categories", (req, res) => {
  const categories = [...new Set(Array.from(products.values()).map((p) => p.category))];
  res.json({ categories });
});

app.listen(PORT, () => {
  console.log(`📦 Product Service running on port ${PORT}`);
});
