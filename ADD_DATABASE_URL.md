# DATABASE_URL Setup - Quick Fix

## Problem
Error: `Environment variable not found: DATABASE_URL`

## Solution

### Step 1: Open `backend/.env` file

### Step 2: Add DATABASE_URL line

`.env` file mein yeh line add karein (Cloudbeds credentials ke baad):

```env
# Database Configuration
DATABASE_URL="mysql://root:password@localhost:3306/bookingpms"
```

**Important**: 
- `root` ko apne MySQL username se replace karein
- `password` ko apne MySQL password se replace karein
- Agar password nahi hai, toh `root@localhost` use karein
- `bookingpms` database name hai - agar different hai toh change karein

### Step 3: Complete .env file example

Aapki `.env` file aise dikhni chahiye:

```env
# Cloudbeds API Configuration
CLOUDBEDS_CLIENT_ID=live1_148933527322816_MyfZ0OGSNU2wDnkCAHsxFRPI
CLOUDBEDS_CLIENT_SECRET=BqFQZH5cTk3ASrvlGX1bC02oetnyfaI9
CLOUDBEDS_API_KEY=cbat_88aTL4zFff00gkZ3L1m0IuJ0oBDfnR43
CLOUDBEDS_HOTEL_SLUG=your_hotel_slug

# Database Configuration
DATABASE_URL="mysql://root:password@localhost:3306/bookingpms"

# Server Configuration
PORT=5000
NODE_ENV=development
FRONTEND_URL=https://pms.kiaantechnology.com

# JWT Configuration
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d
```

### Step 4: Database Create Karein (Agar nahi hai)

MySQL mein database create karein:

```sql
CREATE DATABASE bookingpms;
```

### Step 5: Prisma Migrate Karein

```bash
cd backend
npx prisma migrate dev
# ya
npm run prisma:push
```

### Step 6: Backend Server Restart Karein

```bash
npm start
```

## Common DATABASE_URL Formats

### Local MySQL (with password):
```
DATABASE_URL="mysql://username:password@localhost:3306/bookingpms"
```

### Local MySQL (no password):
```
DATABASE_URL="mysql://root@localhost:3306/bookingpms"
```

### Remote MySQL:
```
DATABASE_URL="mysql://username:password@host:3306/bookingpms"
```

## Troubleshooting

### Error: "Access denied for user"
- MySQL username/password check karein
- MySQL server running hai ya nahi verify karein

### Error: "Unknown database"
- Database create karein: `CREATE DATABASE bookingpms;`

### Error: "Connection refused"
- MySQL server start karein
- Port 3306 accessible hai ya nahi check karein
