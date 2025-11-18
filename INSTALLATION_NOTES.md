# Installation Notes

## Database Setup

The database layer has been configured with the following files:
- `prisma/schema.prisma` - Complete database schema
- `lib/db.ts` - Prisma client wrapper with query helpers
- `lib/schemas.ts` - Zod validation schemas
- `prisma/seed.ts` - Development seed data

## Installation Steps

Due to dependency conflicts, run the following to install dependencies:

```bash
# Clear npm cache
npm cache clean --force

# Install with legacy peer deps
npm install --legacy-peer-deps

# Generate Prisma client
npx prisma generate

# Set up your database
# 1. Update DATABASE_URL in .env file
# 2. Run migration
npx prisma migrate dev --name init

# Seed the database (optional)
npx prisma db seed
```

## Alternative: Use Docker for PostgreSQL

```bash
# Start PostgreSQL with Docker
docker run --name clearway-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=clearway_dev \
  -p 5432:5432 \
  -d postgres:16

# Update .env
DATABASE_URL="postgresql://postgres:password@localhost:5432/clearway_dev?schema=public"
```

## Troubleshooting

If you encounter esbuild version conflicts:
1. Delete node_modules and package-lock.json
2. Clear npm cache: `npm cache clean --force`
3. Reinstall: `npm install --legacy-peer-deps`

If React version conflicts persist, the project may need to downgrade React to version 18.
