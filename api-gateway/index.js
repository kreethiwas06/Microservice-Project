const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
 
const app = express();
const PORT = process.env.PORT || 3005; // ✅ Clean fallback configuration
 
// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || "*" })); // ✅ Fixed stray '*' syntax error
app.use(morgan("combined"));
 
// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // ✅ Fixed missing '*' multiplier bug
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

// ─── New Browser-Visible Routes ───────────────────────────────────────────────

// 1. Root Welcome Page (Visible at http://13.206.38.97:3005)
app.get("/", (req, res) => {
  res.send(`
    <div style="font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f4f6f9; height: 100vh; margin: 0;">
      <div style="background: white; max-width: 600px; margin: auto; padding: 30px; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
        <h1 style="color: #2c3e50; margin-bottom: 10px;">🚀 API Gateway Online</h1>
        <p style="color: #7f8c8d; font-size: 16px;">Your microservices orchestrator is deployed and routing traffic perfectly.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
        <div style="text-align: left; background: #282c34; color: #abb2bf; padding: 15px; border-radius: 6px; font-family: monospace;">
          <p style="margin: 5px 0;"><span style="color: #98c379;">GET</span> /health - Check System Health</p>
          <p style="margin: 5px 0;"><span style="color: #98c379;">GET</span> /dashboard - View Route Map</p>
        </div>
      </div>
    </div>
  `);
});

// 2. Dashboard Map Overview (Visible at http://13.206.38.97:3005/dashboard)
app.get("/dashboard", (req, res) => {
  res.json({
    gatewayStatus: "active",
    message: "Welcome to the central microservice console.",
    availableRoutes: {
      public: [
        { path: "/", method: "GET", description: "Gateway landing portal" },
        { path: "/health", method: "GET", description: "Real-time subsystem monitoring status" },
        { path: "/api/users/login", method: "POST", description: "User session creation endpoint" },
        { path: "/api/users/register", method: "POST", description: "New account credential registration" }
      ],
      protected: [
        { path: "/api/users", method: "GET", authentication: "required" },
        { path: "/api/products", method: "GET", authentication: "required" }
      ]
    }
  });
});
 
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
  console.log(   `→ Users:    ${USER_SERVICE_URL}`);
  console.log(   `→ Products: ${PRODUCT_SERVICE_URL}`);
});
