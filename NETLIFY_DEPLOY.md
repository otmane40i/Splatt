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
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
```

## Firebase / Firestore + Storage

This app can store products and orders in Cloud Firestore when the Firebase variables above are configured. Product images and 3D model uploads use Firebase Storage when `FIREBASE_STORAGE_BUCKET` is configured.

Create them in Firebase:

1. Open Firebase Console.
2. Create/select a project.
3. Go to **Build -> Firestore Database** and create a database.
4. Go to **Build -> Storage** and create a storage bucket.
5. Go to **Project settings -> Service accounts**.
6. Generate a new private key.
7. Copy values from the downloaded JSON into Netlify environment variables:

```txt
project_id -> FIREBASE_PROJECT_ID
client_email -> FIREBASE_CLIENT_EMAIL
private_key -> FIREBASE_PRIVATE_KEY
```

For `FIREBASE_PRIVATE_KEY`, keep the whole key and replace line breaks with `\n` if Netlify stores it as one line.

Use the Firebase Storage bucket name for `FIREBASE_STORAGE_BUCKET`, usually something like `your-project-id.appspot.com`.

## Important Production Note

The project still keeps Prisma/SQLite for local development fallback. On Netlify, use Firebase env vars for persistent admin product changes and customer orders.

## Local Admin

```txt
URL: /admin/login
Email: admin@splatt.ma
Password: changeme123
```
