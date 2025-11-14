# Deploying Amigo Oculto to Render

## Overview
This project consists of a Node.js backend API and a React frontend. Both can be deployed to Render.

## Backend Deployment (Web Service)

1. **Create a new Web Service** on Render
2. **Connect your GitHub repository**
3. **Configure the service:**
   - **Runtime:** Node
   - **Build Command:** `npm run build`
   - **Start Command:** `npm start`
   - **Root Directory:** `server`

4. **Environment Variables:**
   ```
   NODE_ENV=production
   PORT=10000 (Render will set this automatically)
   ADMIN_EMAIL=your-admin-email@example.com
   ADMIN_PASSWORD=your-secure-admin-password
   ADMIN_JWT_SECRET=your-super-secure-jwt-secret-32-chars-min
   ADMIN_SESSION_MINUTES=120
   SECRET_ROTATION_INTERVAL_MS=3600000
   RATE_LIMIT_WINDOW_MINUTES=15
   RATE_LIMIT_MAX_REQUESTS=100
   AUDIT_LOG_PATH=./data/auth-audit.log
   ENABLE_HTTP_METRICS=true
   SQLITE_IN_MEMORY=false
   LOG_LEVEL=info
   MAILER_MODE=console (or smtp for production emails)
   ```

   If using SMTP for emails, add:
   ```
   SMTP_HOST=your-smtp-host
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-smtp-user
   SMTP_PASS=your-smtp-password
   MAIL_FROM=noreply@amigoocuto.com
   ```

## Frontend Deployment (Static Site)

1. **Create a new Static Site** on Render
2. **Connect your GitHub repository**
3. **Configure the site:**
   - **Build Command:** `npm run build`
   - **Publish Directory:** `web/dist`
   - **Root Directory:** `web`

4. **Environment Variables:**
   ```
   VITE_API_URL=https://amigooculto.onrender.com/api
   ```

## Important Notes

- **Database:** SQLite will work on Render, but data will be lost on redeploys since Render's file system is ephemeral. If you need persistent data, consider upgrading to PostgreSQL.
- **CORS:** The backend is configured to handle CORS, but make sure the frontend URL is allowed in production if needed.
- **Health Check:** The backend has a `/health` endpoint that Render can use for health checks.
- **Logs:** Both services will show logs in the Render dashboard.

## Post-Deployment

1. Update the frontend's `VITE_API_URL` with the actual backend URL from Render
2. Test the application thoroughly
3. Consider setting up monitoring and alerts in Render
