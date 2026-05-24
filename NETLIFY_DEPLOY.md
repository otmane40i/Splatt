# Deploy SPLATT. to Netlify

This is a full Next.js app with admin login, API routes, product management, uploads, and orders. Do not deploy it with Netlify Drop as a static folder, because Drop is for built HTML/CSS/JS output and will not run the backend.

## Recommended Netlify Deploy

1. Push this folder to GitHub.
2. In Netlify, choose **Add new project** then **Import an existing project**.
3. Connect the GitHub repo.
4. Use these build settings:

```txt
Build command: npm run build
Publish directory: .next
Node version: 20
```

The `netlify.toml` file already contains those settings.

## Environment Variables

Add these in Netlify under **Site configuration -> Environment variables**:

```txt
DATABASE_URL=file:./dev.db
NEXTAUTH_SECRET=replace-with-a-long-random-secret
NEXTAUTH_URL=https://your-netlify-site-name.netlify.app
WHATSAPP_NUMBER=212600000000
ADMIN_EMAIL=admin@splatt.ma
ADMIN_PASSWORD=changeme123
```

## Important Production Note

The current project uses Prisma with SQLite. SQLite is fine locally, but Netlify serverless functions do not provide a normal persistent writable filesystem for production database writes. That means admin product edits and customer orders need a production database before launch.

For a real live store on Netlify, switch `DATABASE_URL` to a hosted database and update Prisma accordingly, or use another persistent storage service. Otherwise, the public static pages may deploy, but admin changes/orders will not be reliable in production.

## Local Admin

```txt
URL: /admin/login
Email: admin@splatt.ma
Password: changeme123
```
