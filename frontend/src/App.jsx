import { useState, useEffect, createContext, useContext } from "react";

// ─── Config ───────────────────────────────────────────────────────────────────
const API = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

// ─── Auth Context ─────────────────────────────────────────────────────────────
const AuthCtx = createContext(null);
const useAuth = () => useContext(AuthCtx);

// ─── API helpers ──────────────────────────────────────────────────────────────
const request = async (path, options = {}, token = null) => {
  const res = await fetch(`${API}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
};

// ─── Login Page ───────────────────────────────────────────────────────────────
function LoginPage({ onLogin }) {
  const [form, setForm] = useState({ email: "demo@example.com", password: "password123" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("login");

  const handle = async () => {
    setLoading(true);
    setError("");
    try {
      const endpoint = mode === "login" ? "/users/login" : "/users/register";
      const body = mode === "login" ? form : { ...form, name: form.name || "New User" };
      const data = await request(endpoint, { method: "POST", body: JSON.stringify(body) });
      onLogin(data.token, data.user);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>⬡</div>
        <h1 style={s.title}>MicroStack</h1>
        <p style={s.subtitle}>Node.js Microservices on AWS</p>

        {mode === "register" && (
          <input style={s.input} placeholder="Full name" value={form.name || ""}
            onChange={(e) => setForm({ ...form, name: e.target.value })} />
        )}
        <input style={s.input} placeholder="Email" value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input style={s.input} type="password" placeholder="Password" value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })} />

        {error && <p style={s.error}>{error}</p>}

        <button style={{ ...s.btn, ...s.btnPrimary }} onClick={handle} disabled={loading}>
          {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
        </button>
        <button style={{ ...s.btn, ...s.btnGhost }} onClick={() => setMode(mode === "login" ? "register" : "login")}>
          {mode === "login" ? "Create account" : "Back to sign in"}
        </button>

        <p style={s.hint}>Demo: demo@example.com / password123</p>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard() {
  const { token, user, logout } = useAuth();
  const [tab, setTab] = useState("products");
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: "", category: "", price: "", stock: "", description: "" });
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      if (tab === "products") {
        const q = search ? `?search=${encodeURIComponent(search)}` : "";
        const d = await request(`/products${q}`, {}, token);
        setProducts(d.products);
      } else {
        const d = await request("/users", {}, token);
        setUsers(d.users);
      }
    } catch (e) {
      setStatus(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [tab, search]);

  const addProduct = async () => {
    try {
      await request("/products", { method: "POST", body: JSON.stringify({ ...newProduct, price: parseFloat(newProduct.price), stock: parseInt(newProduct.stock) }) }, token);
      setNewProduct({ name: "", category: "", price: "", stock: "", description: "" });
      setStatus("Product added ✓");
      load();
    } catch (e) { setStatus(e.message); }
  };

  const deleteProduct = async (id) => {
    try {
      await request(`/products/${id}`, { method: "DELETE" }, token);
      setStatus("Deleted ✓");
      load();
    } catch (e) { setStatus(e.message); }
  };

  return (
    <div style={s.shell}>
      <header style={s.header}>
        <span style={s.headerLogo}>⬡ MicroStack</span>
        <nav style={s.nav}>
          <button style={{ ...s.navBtn, ...(tab === "products" ? s.navActive : {}) }} onClick={() => setTab("products")}>Products</button>
          <button style={{ ...s.navBtn, ...(tab === "users" ? s.navActive : {}) }} onClick={() => setTab("users")}>Users</button>
        </nav>
        <div style={s.userPill}>
          <span style={s.avatar}>{user.name?.[0]?.toUpperCase()}</span>
          <span style={{ fontSize: 13 }}>{user.name}</span>
          <button style={s.logoutBtn} onClick={logout}>Sign out</button>
        </div>
      </header>

      <main style={s.main}>
        {status && <div style={s.toast} onClick={() => setStatus("")}>{status}</div>}

        {tab === "products" && (
          <>
            <div style={s.row}>
              <h2 style={s.sectionTitle}>Product Catalog</h2>
              <input style={{ ...s.input, width: 240, margin: 0 }} placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>

            {/* Add product form */}
            <div style={s.formCard}>
              <p style={s.formLabel}>Add product</p>
              <div style={s.formRow}>
                {["name", "category", "price", "stock"].map((f) => (
                  <input key={f} style={{ ...s.input, flex: 1, margin: "0 6px 0 0" }} placeholder={f.charAt(0).toUpperCase() + f.slice(1)}
                    value={newProduct[f]} onChange={(e) => setNewProduct({ ...newProduct, [f]: e.target.value })} />
                ))}
                <input style={{ ...s.input, flex: 2, margin: "0 6px 0 0" }} placeholder="Description"
                  value={newProduct.description} onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })} />
                <button style={{ ...s.btn, ...s.btnPrimary, margin: 0, padding: "10px 20px" }} onClick={addProduct}>Add</button>
              </div>
            </div>

            {loading ? <p style={s.loading}>Loading…</p> : (
              <div style={s.grid}>
                {products.map((p) => (
                  <div key={p.id} style={s.productCard}>
                    <div style={s.productBadge}>{p.category}</div>
                    <h3 style={s.productName}>{p.name}</h3>
                    <p style={s.productDesc}>{p.description}</p>
                    <div style={s.productFooter}>
                      <span style={s.price}>${p.price.toFixed(2)}</span>
                      <span style={s.stock}>Stock: {p.stock}</span>
                      <button style={s.deleteBtn} onClick={() => deleteProduct(p.id)}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === "users" && (
          <>
            <h2 style={s.sectionTitle}>Users</h2>
            {loading ? <p style={s.loading}>Loading…</p> : (
              <table style={s.table}>
                <thead><tr>{["Name", "Email", "Joined"].map((h) => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} style={s.tr}>
                      <td style={s.td}><span style={s.avatar}>{u.name?.[0]?.toUpperCase()}</span> {u.name}</td>
                      <td style={s.td}>{u.email}</td>
                      <td style={s.td}>{new Date(u.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </main>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("user") || "null"));

  const login = (t, u) => {
    setToken(t); setUser(u);
    localStorage.setItem("token", t);
    localStorage.setItem("user", JSON.stringify(u));
  };
  const logout = () => {
    setToken(null); setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  return (
    <AuthCtx.Provider value={{ token, user, logout }}>
      {token && user ? <Dashboard /> : <LoginPage onLogin={login} />}
    </AuthCtx.Provider>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = {
  page: { minHeight: "100vh", background: "#0f0f13", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', system-ui, sans-serif" },
  card: { background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: 16, padding: "48px 40px", width: 400, display: "flex", flexDirection: "column", gap: 12 },
  logo: { fontSize: 40, textAlign: "center", color: "#7c6aff" },
  title: { margin: 0, color: "#fff", fontSize: 28, fontWeight: 700, textAlign: "center" },
  subtitle: { margin: "0 0 8px", color: "#666", fontSize: 14, textAlign: "center" },
  input: { background: "#12121a", border: "1px solid #2a2a3a", borderRadius: 8, padding: "11px 14px", color: "#fff", fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box" },
  btn: { border: "none", borderRadius: 8, padding: "11px 0", fontSize: 14, fontWeight: 600, cursor: "pointer", width: "100%", marginTop: 4 },
  btnPrimary: { background: "#7c6aff", color: "#fff" },
  btnGhost: { background: "transparent", color: "#888", border: "1px solid #2a2a3a" },
  error: { color: "#ff6b6b", fontSize: 13, margin: 0 },
  hint: { color: "#444", fontSize: 12, textAlign: "center", margin: "4px 0 0" },
  shell: { minHeight: "100vh", background: "#0f0f13", fontFamily: "'Inter', system-ui, sans-serif", color: "#fff" },
  header: { background: "#1a1a24", borderBottom: "1px solid #2a2a3a", padding: "0 32px", height: 60, display: "flex", alignItems: "center", gap: 24 },
  headerLogo: { fontSize: 18, fontWeight: 700, color: "#7c6aff", marginRight: "auto" },
  nav: { display: "flex", gap: 4 },
  navBtn: { background: "none", border: "none", color: "#888", padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontSize: 14 },
  navActive: { background: "#2a2a3a", color: "#fff" },
  userPill: { display: "flex", alignItems: "center", gap: 10, marginLeft: "auto" },
  avatar: { width: 28, height: 28, background: "#7c6aff", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 },
  logoutBtn: { background: "none", border: "1px solid #2a2a3a", color: "#888", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12 },
  main: { padding: "32px", maxWidth: 1200, margin: "0 auto" },
  row: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  sectionTitle: { margin: 0, fontSize: 22, fontWeight: 700 },
  formCard: { background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: 12, padding: "20px 24px", marginBottom: 24 },
  formLabel: { margin: "0 0 12px", color: "#888", fontSize: 13 },
  formRow: { display: "flex", alignItems: "center", gap: 0 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 },
  productCard: { background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: 12, padding: "20px", display: "flex", flexDirection: "column", gap: 8 },
  productBadge: { fontSize: 11, fontWeight: 600, color: "#7c6aff", textTransform: "uppercase", letterSpacing: 1 },
  productName: { margin: 0, fontSize: 16, fontWeight: 600 },
  productDesc: { margin: 0, fontSize: 13, color: "#666", flex: 1 },
  productFooter: { display: "flex", alignItems: "center", gap: 8, marginTop: 8 },
  price: { fontWeight: 700, fontSize: 18, color: "#7c6aff" },
  stock: { fontSize: 12, color: "#555", marginLeft: "auto" },
  deleteBtn: { background: "none", border: "1px solid #2a2a3a", color: "#555", width: 28, height: 28, borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  loading: { color: "#555", textAlign: "center", padding: 40 },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", padding: "10px 16px", color: "#555", fontSize: 13, borderBottom: "1px solid #2a2a3a" },
  tr: { borderBottom: "1px solid #1e1e2a" },
  td: { padding: "14px 16px", fontSize: 14, display: "revert" },
  toast: { background: "#1e3a2a", border: "1px solid #2d5a3d", color: "#5adf8a", padding: "10px 16px", borderRadius: 8, marginBottom: 20, cursor: "pointer", fontSize: 14 },
};
