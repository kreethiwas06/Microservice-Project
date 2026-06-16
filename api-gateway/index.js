const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || "*" }));
app.use(morgan("combined"));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Too many requests, please try again later." },
});
app.use(limiter);

// ─── Service URLs ─────────────────────────────────────────────────────────────
const USER_SERVICE_URL =
  process.env.USER_SERVICE_URL || "http://localhost:3001";
const PRODUCT_SERVICE_URL =
  process.env.PRODUCT_SERVICE_URL || "http://localhost:3002";

// ─── Auth middleware ──────────────────────────────────────────────────────────
const authenticate = (req, res, next) => {
  const token = req.headers["authorization"];
  if (!token) return res.status(401).json({ error: "No token provided" });
  req.headers["x-user-id"] = "demo-user";
  next();
};

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "api-gateway",
    timestamp: new Date().toISOString(),
    upstreams: {
      userService: USER_SERVICE_URL,
      productService: PRODUCT_SERVICE_URL,
    },
  });
});

// ─── Proxy Routes ─────────────────────────────────────────────────────────────

// Public: Login
app.use(
  "/api/users/login",
  createProxyMiddleware({
    target: USER_SERVICE_URL,
    changeOrigin: true,
    proxyTimeout: 10000,
    timeout: 10000,
    pathRewrite: { "^/api/users/login": "/auth/login" },
    on: {
      error: (err, req, res) => {
        res.status(502).json({ error: "User service unavailable" });
      },
    },
  })
);

// Public: Register
app.use(
  "/api/users/register",
  createProxyMiddleware({
    target: USER_SERVICE_URL,
    changeOrigin: true,
    proxyTimeout: 10000,
    timeout: 10000,
    pathRewrite: { "^/api/users/register": "/auth/register" },
    on: {
      error: (err, req, res) => {
        res.status(502).json({ error: "User service unavailable" });
      },
    },
  })
);

// Protected: Users
app.use(
  "/api/users",
  authenticate,
  createProxyMiddleware({
    target: USER_SERVICE_URL,
    changeOrigin: true,
    proxyTimeout: 10000,
    timeout: 10000,
    pathRewrite: { "^/api/users": "/users" },
    on: {
      error: (err, req, res) => {
        res.status(502).json({ error: "User service unavailable" });
      },
    },
  })
);

// Protected: Products
app.use(
  "/api/products",
  authenticate,
  createProxyMiddleware({
    target: PRODUCT_SERVICE_URL,
    changeOrigin: true,
    proxyTimeout: 10000,
    timeout: 10000,
    pathRewrite: { "^/api/products": "/products" },
    on: {
      error: (err, req, res) => {
        res.status(502).json({ error: "Product service unavailable" });
      },
    },
  })
);

// ─── 404 Fallback ────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
  console.log(`   → Users:    ${USER_SERVICE_URL}`);
  console.log(`   → Products: ${PRODUCT_SERVICE_URL}`);
});


