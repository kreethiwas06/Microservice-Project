const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";

app.use(express.json());

// ─── In-memory store (swap with DynamoDB / RDS in production) ────────────────
const users = new Map();

// Seed a demo user
const seedUser = async () => {
  const id = uuidv4();
  const passwordHash = await bcrypt.hash("password123", 10);
  users.set("demo@example.com", {
    id,
    email: "demo@example.com",
    name: "Demo User",
    passwordHash,
    createdAt: new Date().toISOString(),
  });
  console.log("✅ Demo user seeded: demo@example.com / password123");
};
seedUser();

// ─── Health ────────────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "user-service", userCount: users.size });
});

// ─── Auth ─────────────────────────────────────────────────────────────────────
app.post("/auth/register", async (req, res) => {
  try {
    const { email, name, password } = req.body;
    if (!email || !name || !password)
      return res.status(400).json({ error: "All fields are required" });

    if (users.has(email))
      return res.status(409).json({ error: "Email already registered" });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = {
      id: uuidv4(),
      email,
      name,
      passwordHash,
      createdAt: new Date().toISOString(),
    };
    users.set(email, user);

    const token = jwt.sign({ id: user.id, email }, JWT_SECRET, {
      expiresIn: "7d",
    });
    res.status(201).json({ token, user: sanitize(user) });
  } catch (err) {
    res.status(500).json({ error: "Registration failed" });
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = users.get(email);
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign({ id: user.id, email }, JWT_SECRET, {
      expiresIn: "7d",
    });
    res.json({ token, user: sanitize(user) });
  } catch (err) {
    res.status(500).json({ error: "Login failed" });
  }
});

// ─── Users CRUD ───────────────────────────────────────────────────────────────
app.get("/users", (req, res) => {
  const allUsers = Array.from(users.values()).map(sanitize);
  res.json({ users: allUsers, total: allUsers.length });
});

app.get("/users/:id", (req, res) => {
  const user = Array.from(users.values()).find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(sanitize(user));
});

app.put("/users/:id", async (req, res) => {
  const user = Array.from(users.values()).find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });

  const { name, password } = req.body;
  if (name) user.name = name;
  if (password) user.passwordHash = await bcrypt.hash(password, 10);
  user.updatedAt = new Date().toISOString();
  users.set(user.email, user);

  res.json(sanitize(user));
});

app.delete("/users/:id", (req, res) => {
  const entry = Array.from(users.entries()).find(
    ([, u]) => u.id === req.params.id
  );
  if (!entry) return res.status(404).json({ error: "User not found" });
  users.delete(entry[0]);
  res.json({ message: "User deleted" });
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
const sanitize = ({ passwordHash, ...rest }) => rest;

app.listen(PORT, () => {
  console.log(`👤 User Service running on port ${PORT}`);
});
