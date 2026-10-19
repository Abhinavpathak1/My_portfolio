# Portfolio admin and deployment

The admin dashboard uses server-side authentication and Vercel Postgres. There is no account-creation flow. The only admin ID is `pabhinav9001@gmail.com`; the password is never stored in the repository or browser storage.

## Vercel setup

1. Push the project to GitHub and import the repository into Vercel. Keep the project root set to the repository root.
2. Create a Postgres database from the Vercel Marketplace and connect it to the project. The Neon serverless driver reads `POSTGRES_URL` or `DATABASE_URL` from the integration.
3. In **Project Settings → Environment Variables**, add:
   - `ADMIN_PASSWORD`: choose a new, unique password of at least 16 characters. The password previously pasted into chat should be treated as exposed and must not be reused. Enter the replacement only in Vercel's private environment-variable settings.
   - `SESSION_SECRET`: a cryptographically random secret of at least 32 characters. Generate it privately (for example, with `node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"`); do not commit it.
4. Enable the variables for the deployment environments you use, then redeploy. The API creates its tables on first use and serializes schema setup across concurrent serverless instances. It reports server errors rather than silently switching to local storage.
5. Open `/admin.html`, sign in with the fixed admin ID and your private `ADMIN_PASSWORD`, then use the dashboard to edit and publish the shared content.

The backend signs a 12-hour session cookie with `SESSION_SECRET`, marks it HttpOnly and SameSite=Strict, and checks admin authorization on every content-write and inbox-management request. Failed password attempts are rate limited per hashed client address. Keep Vercel and database access restricted to trusted operators.

## Local development

Install dependencies with `npm install`, connect a development Postgres database, and provide `POSTGRES_URL`, `ADMIN_PASSWORD`, and `SESSION_SECRET` as local environment variables. Run the project with `npx vercel dev` so API routes and static pages share the same origin. Do not add local secrets to tracked files.

## Content and contact messages

The built-in content in `portfolio-data.js` is shown until the first admin save. Thereafter, visitors and the admin dashboard use the shared Postgres content. Images still need to exist in the deployed site; the editor accepts image paths but does not upload files.

Contact submissions are validated and stored in the shared database and appear in the authenticated dashboard inbox. Reply opens the admin's email app. On submission the visitor's browser also prepares a `mailto:` draft addressed to the contact email; no email is sent automatically. Messages are limited to 10,000 characters.

## Troubleshooting

- If the function log says `Set POSTGRES_URL or DATABASE_URL`, open **Project Settings → Environment Variables** and confirm one of those exact variables is present for the environment serving the deployment (Production or Preview). If neither is present, connect the Postgres integration to this Vercel project or add the database URL there, then redeploy so the function receives it. Do not put the database URL in the browser or commit it to the repository.
- If logs show a duplicate key for `pg_type_typname_nsp_index` and `portfolio_content`, deploy the version with serialized schema initialization and redeploy; the existing table is retained.
- Other database/API errors mean the database may be unavailable; check the Vercel function logs and database integration status.
- A sign-in configuration error means `ADMIN_PASSWORD` or `SESSION_SECRET` is missing or below its minimum length. Add the private variable and redeploy.
- The public portfolio shows its built-in preview with a visible warning if its shared content API cannot be reached.
- To change the password, update `ADMIN_PASSWORD` in Vercel and redeploy. Changing `SESSION_SECRET` invalidates existing sessions.
