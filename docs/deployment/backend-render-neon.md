# Host the backend with Render and Neon

This setup deploys the Node API from `backend/` on Render and stores its data in
Neon PostgreSQL. The repository's `render.yaml` creates one free Render web
service. Render supplies its HTTPS URL to `PUBLIC_BASE_URL`, so certificate QR
codes point to the hosted verification page.

## 1. Create the database

1. Create a Neon project and database.
2. Open **Connect** in the Neon project dashboard. Turn **Connection pooling**
   off and copy the **direct** PostgreSQL connection string, including
   `sslmode=require`. The startup command runs schema migrations, for which a
   direct connection is appropriate.
3. Keep that string private. Do not commit it to Git or paste it into chat.

This creates a new empty hosted database. Your local PostgreSQL test records
will not appear there unless you migrate the data separately.

## 2. Deploy the API

1. Commit and push `render.yaml` and this guide to `feature-backend` so Render
   can read the deployment file from GitHub.
2. In Render, choose **New → Blueprint**, connect the GitHub repository, select
   `feature-backend`, and keep the default Blueprint path `render.yaml`.
3. On the review screen, enter these values when Render asks:
   - `DATABASE_URL`: the private Neon direct connection string from step 1.
   - `DEMO_ADMIN_EMAIL`: the email for the hosted prototype's administrator.
   - `DEMO_ADMIN_PASSWORD`: a new password of at least 12 characters. Use a
     different password from the local development database.
4. Review the plan shown as **Free**, then deploy the Blueprint.

The service builds with `npm ci`. On each start, it applies outstanding schema
migrations, loads the idempotent demonstration modules and assessment rules,
creates or updates the configured demo admin, and starts the API. Render creates
`JWT_SECRET` automatically. The API's public URL is injected into
`PUBLIC_BASE_URL`; do not enter a localhost or hotspot address on Render.

## 3. Check the deployment

1. Open `https://YOUR-SERVICE.onrender.com/api/health`. A healthy deployment
   returns HTTP 200, `"status":"ok"`, and a database status of `"ok"`.
2. In Postman, send `POST https://YOUR-SERVICE.onrender.com/api/auth/login` with
   the hosted admin email and password. The response contains `data.accessToken`.
3. Repeat the local worker → passing attempt → certificate test against the
   hosted base URL. Open the returned `verificationUrl` on a phone and check
   that it begins with `https://` and displays the current certificate status.

Set Render's `CORS_ORIGIN` environment variable to the admin dashboard's exact
deployed origin when the dashboard is hosted. The Blueprint initially allows
`http://localhost:5173` for local dashboard development. Keep database and
admin credentials only in the Render and Neon dashboards, not in the repo.

Render's free web service can sleep when idle, so the first request after a
pause may take longer. This free setup is suitable for a prototype; plan for a
non-sleeping service and reviewed training/certificate rules before relying on
it operationally. The prototype certificate is DGMS-aligned, not issued or
approved by DGMS.
