# MicroStack — Node.js Microservices on AWS

A production-ready microservices starter with **API Gateway**, **User Service**, **Product Service**, and a **React** frontend — deployable to AWS ECS Fargate via CDK.

---

## Architecture

```
Browser (React)
      │
      ▼
┌─────────────────────────────────┐
│        API Gateway :3000        │  ← Public ALB
│  Rate limiting · CORS · Auth    │
└────────────┬────────────┬───────┘
             │            │
    /users   ▼   /products▼
┌────────────────┐  ┌─────────────────┐
│  User Service  │  │ Product Service │
│     :3001      │  │     :3002       │
└────────────────┘  └─────────────────┘
```

**All traffic flows through the API Gateway** — downstream services are private and never exposed directly.

---

## Services

| Service | Port | Responsibility |
|---------|------|---------------|
| `api-gateway` | 3000 | Routing, auth, rate limiting |
| `user-service` | 3001 | Register, login, user CRUD |
| `product-service` | 3002 | Product catalog CRUD |
| `frontend` | 5173 / 80 | React SPA |

---

## Quick Start (local)

### Option A — Docker Compose (recommended)

```bash
docker compose up --build
```

- Frontend: http://localhost
- API Gateway: http://localhost:3000

### Option B — Run each service manually

```bash
# Terminal 1
cd user-service && npm install && npm run dev

# Terminal 2
cd product-service && npm install && npm run dev

# Terminal 3
cd api-gateway && npm install && npm run dev

# Terminal 4
cd frontend && npm install && npm run dev
```

Demo login: `demo@example.com` / `password123`

---

## API Reference

All routes go through the gateway at `http://localhost:3000`.

### Public (no token needed)
```
POST /api/users/register   { name, email, password }
POST /api/users/login      { email, password }
```

### Protected (Bearer token required)
```
GET    /api/users             List users
GET    /api/users/:id         Get user
PUT    /api/users/:id         Update user
DELETE /api/users/:id         Delete user

GET    /api/products          List products  ?search= &category= &minPrice= &maxPrice=
GET    /api/products/:id      Get product
POST   /api/products          { name, category, price, stock, description }
PUT    /api/products/:id      Update product
DELETE /api/products/:id      Delete product
GET    /api/products/meta/categories  All categories
```

---

## Deploy to AWS

### Prerequisites

- AWS CLI configured (`aws configure`)
- Docker Desktop running
- Node.js 20+

### Steps

```bash
# 1. Install CDK globally
npm install -g aws-cdk

# 2. Bootstrap your AWS account (once per account/region)
cdk bootstrap aws://YOUR_ACCOUNT_ID/us-east-1

# 3. Deploy everything
chmod +x deploy.sh
./deploy.sh
```

The script will:
1. Build Docker images for all 4 services
2. Push them to ECR
3. Deploy ECS Fargate services + ALBs via CDK
4. Output the public URLs

### AWS Resources Created

| Resource | Purpose |
|----------|---------|
| VPC (2 AZs) | Network isolation |
| ECS Fargate Cluster | Runs containers serverlessly |
| 4× ECR Repositories | Store Docker images |
| 2× Public ALBs | API Gateway + Frontend |
| 1× Internal ALB | Service-to-service routing |
| CloudWatch Logs | Container logging |

### Cost estimate (us-east-1)
~$60–80/month for minimal setup (2 tasks per service, 0.25 vCPU / 512 MB each).

---

## Production Checklist

- [ ] Replace in-memory stores with **DynamoDB** or **RDS**
- [ ] Set strong `JWT_SECRET` via **AWS Secrets Manager**
- [ ] Add **HTTPS** via ACM certificate on the ALBs
- [ ] Enable **Auto Scaling** on ECS services
- [ ] Add a **CI/CD pipeline** (GitHub Actions → ECR → ECS)
- [ ] Set up **CloudWatch Alarms** for error rates and latency
