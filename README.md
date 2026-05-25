# SPLATT.

Complete Next.js 14 e-commerce site for a Moroccan DIY paint-pour figurine brand.

## Stack

- Next.js 14 App Router + TypeScript
- Tailwind CSS + shadcn/ui-style Radix components
- Framer Motion
- Prisma + SQLite
- NextAuth credentials admin login

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` from `.env.example` and set:

```bash
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="replace-with-a-long-random-secret"
NEXTAUTH_URL="http://localhost:3000"
WHATSAPP_NUMBER="212600000000"
ADMIN_EMAIL="admin@splatt.ma"
ADMIN_PASSWORD="changeme123"
FIREBASE_PROJECT_ID=""
FIREBASE_CLIENT_EMAIL=""
FIREBASE_PRIVATE_KEY=""
FIREBASE_STORAGE_BUCKET=""
```

3. Run the database migration:

```bash
npx prisma migrate dev
```

4. Seed the admin and sample products:

```bash
npx prisma db seed
```

5. Start the app:

```bash
npm run dev
```

Public site: `http://localhost:3000`

Admin login: `http://localhost:3000/admin/login`

Seed admin password: `changeme123`

## Notes

- Product uploads use Firebase Storage when `FIREBASE_STORAGE_BUCKET` is set, with `public/products/` as a local fallback.
- Public orders are saved to SQLite before the customer is sent to WhatsApp.
- Admin routes are protected by NextAuth middleware.
- If Prisma on your local machine fails to create the SQLite file automatically, run `touch prisma/dev.db` once, then rerun `npx prisma migrate dev`.
- Netlify deployment instructions are in `NETLIFY_DEPLOY.md`.
