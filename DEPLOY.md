# Deployment Guide for Coolify

This guide will help you deploy the Computer Essay Exam Maker to Coolify.

## Prerequisites

1. Coolify instance running and accessible
2. Git repository with this project (GitHub, GitLab, or Bitea)
3. Pre-extracted materials.json file (run `python3 extract_pdfs.py` before deploying)

## Quick Deployment Steps

### 1. Prepare Materials

Before deploying, make sure you have `assets/materials.json`:

```bash
# Place your PDF files in assets/pdf/
# Then run:
python3 extract_pdfs.py
```

This creates `assets/materials.json` with all the study materials.

### 2. Push to Git Repository

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin YOUR_REPO_URL
git push -u origin main
```

### 3. Deploy in Coolify

1. **Login to Coolify Dashboard**

2. **Create New Resource**

   - Click "New Resource"
   - Select "Application"
   - Choose "Public Repository" or "Private Repository"

3. **Configure Application**

   - **Repository URL**: Your Git repository URL
   - **Branch**: `main` (or your branch name)
   - **Build Pack**: `nixpacks` or `dockerfile`
   - **Port**: `3000`

4. **Environment Variables**

   Add these in Coolify:

   ```
   PORT=3000
   PROXY_PORT=8080
   NODE_ENV=production
   ```

5. **Add API Credentials**

   Create a `secret` file in your repository with:

   ```
   api_key:YOUR_API_KEY
   api_url:https://api.xiaomimimo.com/v1
   model:mimo-v2-flash
   ```

6. **Configure Ports**

   In Coolify settings:

   - **Main Port**: 3000 (Static web server)
   - **Additional Port**: 8080 (CORS proxy)

7. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Access your application at the provided URL

## Alternative: Docker Compose (Local Testing)

Create `docker-compose.yml`:

```yaml
version: "3.8"

services:
  exam-maker:
    build: .
    ports:
      - "3000:3000"
      - "8080:8080"
    environment:
      - PORT=3000
      - PROXY_PORT=8080
      - NODE_ENV=production
    volumes:
      - ./secret:/app/secret:ro
    restart: unless-stopped
```

Run:

```bash
docker-compose up -d
```

## File Structure for Deployment

Ensure these files exist:

```
.
├── Dockerfile
├── package.json
├── server.js
├── index.html
├── secret                    # API credentials
├── assets/
│   ├── materials.json       # Pre-extracted materials
│   └── js/
│       ├── app.js
│       ├── ai-service.js
│       └── pdf-handler.js
```

## Important Notes

### Security

- ⚠️ **Never commit the `secret` file to Git!**
- Add `secret` to `.gitignore`
- Use Coolify's environment variables or secrets management instead

### Materials

- The `assets/materials.json` file must be created before deployment
- If you update PDFs, re-run `extract_pdfs.py` and redeploy

### CORS Proxy

- The CORS proxy runs on port 8080
- Make sure both ports (3000 and 8080) are exposed in Coolify
- Update `assets/js/ai-service.js` if using different proxy URL

## Coolify-Specific Settings

### Build Settings

- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Health Check Path**: `/`

### Domain Configuration

After deployment, you can:

1. Use Coolify's auto-generated domain
2. Add custom domain in Coolify settings
3. Enable SSL/HTTPS (automatic with Coolify)

## Troubleshooting

### Port Issues

If port 8080 isn't accessible:

- Check Coolify port configuration
- Ensure both ports are exposed in Dockerfile
- Verify firewall settings

### Materials Not Loading

- Verify `assets/materials.json` exists
- Check file permissions in container
- Review browser console for errors

### API Connection Issues

- Verify `secret` file is mounted correctly
- Check CORS proxy is running on port 8080
- Test API credentials manually

## Environment Variables Reference

| Variable   | Default    | Description          |
| ---------- | ---------- | -------------------- |
| PORT       | 3000       | Main web server port |
| PROXY_PORT | 8080       | CORS proxy port      |
| NODE_ENV   | production | Node environment     |

## Accessing the Application

After deployment:

- **Web App**: `https://your-domain.com`
- **CORS Proxy**: `https://your-domain.com:8080` (if exposed)

The app will automatically use the proxy for API requests.

## Updates and Redeployment

To update:

1. Make changes to code
2. Commit and push to Git
3. Coolify will auto-deploy (if enabled) or click "Redeploy"

To update materials:

1. Update PDFs in `assets/pdf/`
2. Run `python3 extract_pdfs.py`
3. Commit updated `assets/materials.json`
4. Push and redeploy
