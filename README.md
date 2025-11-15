# API Rate Limiter

A full-stack API rate-limiting application built with Next.js 16, TypeScript, Redis, PostgreSQL, and TailwindCSS. This application provides multi-tenant rate limiting with support for different rate limit types (General, IP-based, API-based, and User-based).

## Features

✅ **Multi-Tenant Support** - Register and manage multiple tenants with unique API keys
✅ **Flexible Rate Limiting** - Support for 4 types of rate limits:
  - **General**: Apply to all requests from a tenant
  - **IP-based**: Rate limit per IP address
  - **API-based**: Rate limit per specific API endpoint
  - **User-based**: Rate limit per user ID

✅ **Redis Caching** - Efficient rate limiting with Redis using sliding window algorithm
✅ **Database Caching** - In-memory cache for rate limit configurations to reduce database calls
✅ **API Proxy Endpoint** - Root API endpoint that accepts tenant ID/API key and target URL
✅ **Real-time Analytics** - View request statistics, rate limit metrics, and trends
✅ **API Testing Tool** - Built-in UI to test rate-limited API requests
✅ **Docker Compose** - Fully containerized backend with Redis and PostgreSQL
✅ **Beautiful UI** - Modern, responsive interface built with TailwindCSS

## Tech Stack

- **Frontend**: Next.js 16, React 19, TailwindCSS
- **Backend**: Next.js API Routes, TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis with ioredis
- **Charts**: Recharts
- **Containerization**: Docker Compose

## Prerequisites

- Node.js 20+ and npm
- Docker and Docker Compose

## Quick Start

### 1. Clone and Install

```bash
cd /home/work/Documents/api-limit
npm install
```

### 2. Start Docker Services

```bash
npm run docker:up
```

This will start:
- PostgreSQL on port 5432
- Redis on port 6379

### 3. Setup Database

```bash
npm run prisma:push
npm run prisma:generate
```

### 4. Start Development Server

```bash
npm run dev
```

The application will be available at http://localhost:3000

## Usage Guide

### 1. Create a Tenant

1. Click "New Tenant" button
2. Enter tenant name and optional description
3. Copy the generated API key

### 2. Configure Rate Limits

1. Select a tenant from the list
2. Click "Rate Limits" tab
3. Add rate limit configurations:
   - **Type**: Choose GENERAL, IP, API, or USER
   - **Max Requests**: Number of allowed requests
   - **Time Window**: Duration (seconds, minutes, hours, or days)
   - **API Path**: Required for API type (e.g., `/api/users`)

### 3. Test API Requests

1. Go to "API Tester" tab
2. Configure your test request:
   - Target API URL (e.g., `https://jsonplaceholder.typicode.com/posts/1`)
   - HTTP Method (GET, POST, etc.)
   - Optional User ID for user-based rate limiting
3. Click "Send Test Request"
4. View rate limit status and response

### 4. View Analytics

1. Go to "Analytics" tab
2. Select time range (24 hours, 7 days, 30 days, 90 days)
3. View:
   - Total requests and success rate
   - Rate-limited requests percentage
   - Requests over time chart
   - Top API endpoints
   - Top IP addresses

## API Documentation

### Proxy Endpoint

**POST** `/api/proxy`

Main endpoint for rate-limited API requests.

**Request Body:**
```json
{
  "apiKey": "your-api-key",  // or use "tenantId"
  "apiUrl": "https://api.example.com/endpoint",
  "method": "GET",
  "userId": "user-123",  // optional
  "headers": {},  // optional
  "body": {}  // optional, for POST/PUT/PATCH
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {},
  "statusCode": 200,
  "rateLimit": {
    "limit": 100,
    "remaining": 99,
    "reset": 1699999999999
  }
}
```

**Rate Limited Response (429):**
```json
{
  "error": "Rate limit exceeded",
  "limit": 100,
  "remaining": 0,
  "reset": 1699999999999,
  "retryAfter": 60
}
```

### Tenant Management

**GET** `/api/tenants` - List all tenants
**POST** `/api/tenants` - Create a new tenant
**GET** `/api/tenants/[id]` - Get tenant details
**PATCH** `/api/tenants/[id]` - Update tenant
**DELETE** `/api/tenants/[id]` - Delete tenant

### Rate Limit Configuration

**POST** `/api/rate-limits` - Create rate limit
**PATCH** `/api/rate-limits/[id]` - Update rate limit
**DELETE** `/api/rate-limits/[id]` - Delete rate limit

### Analytics

**GET** `/api/analytics?tenantId=xxx&days=7` - Get analytics data

## Rate Limiting Algorithm

The application uses a **sliding window** algorithm with Redis sorted sets:

1. Each request is stored with a timestamp
2. Old entries outside the time window are removed
3. Current count is checked against the limit
4. Request is allowed or denied based on the count

**Caching Strategy:**
- Rate limit configurations are cached in memory for 1 minute
- Reduces database queries significantly
- Cache is automatically invalidated when configurations change

## Example Use Cases

### Example 1: General Rate Limiting
```
Type: GENERAL
Max Requests: 100
Window: 1 minute
```
Limits all requests from a tenant to 100 per minute.

### Example 2: IP-based Rate Limiting
```
Type: IP
Max Requests: 10
Window: 1 minute
```
Limits each IP address to 10 requests per minute.

### Example 3: API-specific Rate Limiting
```
Type: API
Max Requests: 50
Window: 1 hour
API Path: /api/users
```
Limits requests to `/api/users` endpoint to 50 per hour.

### Example 4: User-based Rate Limiting
```
Type: USER
Max Requests: 1000
Window: 1 day
```
Limits each user to 1000 requests per day.

## Testing with cURL

```bash
curl -X POST http://localhost:3000/api/proxy \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "your-api-key",
    "apiUrl": "https://jsonplaceholder.typicode.com/posts/1",
    "method": "GET"
  }'
```

## Project Structure

```
api-limit/
├── app/
│   ├── api/
│   │   ├── analytics/      # Analytics endpoints
│   │   ├── proxy/          # Main rate-limiting proxy
│   │   ├── rate-limits/    # Rate limit CRUD
│   │   └── tenants/        # Tenant management
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx            # Main dashboard
├── components/
│   ├── Analytics.tsx       # Analytics dashboard
│   ├── ApiTester.tsx       # API testing tool
│   ├── RateLimitConfig.tsx # Rate limit configuration
│   ├── TenantForm.tsx      # Tenant creation form
│   └── TenantList.tsx      # Tenant list view
├── lib/
│   ├── prisma.ts           # Prisma client
│   ├── rate-limiter.ts     # Rate limiting logic
│   ├── redis.ts            # Redis client
│   └── utils.ts            # Utility functions
├── prisma/
│   └── schema.prisma       # Database schema
├── docker-compose.yml      # Docker services
├── package.json
└── README.md
```

## Database Schema

### Tenant
- Multi-tenant support with unique API keys
- Active/inactive status
- Tracks rate limits and API logs

### RateLimit
- Configurable rate limit types
- Flexible time windows
- Per-tenant configuration

### ApiLog
- Request logging for analytics
- Tracks success/failure and rate limiting
- IP and user tracking

## Scripts

```bash
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server
npm run docker:up        # Start Docker services
npm run docker:down      # Stop Docker services
npm run prisma:generate  # Generate Prisma client
npm run prisma:push      # Push schema to database
npm run prisma:studio    # Open Prisma Studio
npm run setup            # Complete setup (Docker + DB)
```

## Environment Variables

See `.env.example` for required environment variables:

- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `NODE_ENV` - Environment (development/production)
- `NEXT_PUBLIC_API_URL` - Public API URL

## Scalability

The application is designed for medium-traffic scenarios:

- **Redis**: Fast in-memory rate limiting
- **Connection Pooling**: Prisma handles database connections efficiently
- **Caching**: Reduces database load with in-memory config cache
- **Sliding Window**: More accurate than fixed window algorithms
- **Horizontal Scaling**: Can be deployed across multiple instances

## Future Enhancements

- [ ] Rate limit templates
- [ ] Webhook notifications for rate limit events
- [ ] Custom rate limit rules with conditions
- [ ] Rate limit burst allowance
- [ ] Admin dashboard with multi-user support
- [ ] API key rotation
- [ ] Request replay protection

## License

MIT

## Support

For issues and questions, please open an issue on the repository.
