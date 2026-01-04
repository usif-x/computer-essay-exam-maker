# Computer Essay Exam Maker

AI-Powered Python Code Practice & Review System

## 🚀 Quick Start

### Running the Application

1. **Start the CORS Proxy** (required for API calls):

   ```bash
   node cors-proxy.js
   ```

   This will start a proxy server on `http://localhost:8080`

2. **Start the Web Server**:
   Open `index.html` with a local server (like Five Server in VS Code, or Python's HTTP server)

3. **Upload a PDF** and start practicing!

## 📋 Features

- ✅ PDF upload and text extraction (RAG system)
- ✅ AI-generated Python coding questions
- ✅ Real-time streaming responses
- ✅ Comprehensive code review with:
  - Score (0-100)
  - Quality rating (Good/Not Bad/Bad)
  - Line-by-line error detection
  - Fix suggestions
  - Educational feedback

## 🔧 Configuration

API credentials are stored in the `secret` file:

```
api_key: your-api-key
api_url: https://api.xiaomimimo.com/v1
model: mimo-v2-flash
```

## 🛠️ Technical Details

### CORS Proxy

The CORS proxy (`cors-proxy.js`) is needed because browsers block direct API calls from frontend apps to external APIs. The proxy:

- Runs on `localhost:8080`
- Forwards requests to the AI API
- Adds CORS headers to responses

### File Structure

```
├── index.html              # Main UI
├── secret                  # API credentials
├── cors-proxy.js          # CORS proxy server
└── assets/
    └── js/
        ├── ai-service.js   # AI integration
        ├── pdf-handler.js  # PDF processing
        └── app.js          # Main logic
```

## 🎯 Quality Ratings

- **Good** (80-100): No errors, excellent code
- **Not Bad** (50-79): Has syntax errors but fixable
- **Bad** (0-49): Major logic or syntax issues

## 💡 Alternative: No Proxy Setup

If you don't want to run the proxy, you can:

1. **Use a browser extension** like "CORS Unblock" or "Allow CORS"
2. **Set `corsProxy = ''`** in `ai-service.js` line 25
3. **Deploy with a backend** that handles API calls server-side

## 📝 Notes

- Maximum PDF size: 50 pages
- Supports streaming for better UX
- All responses in JSON format for easy parsing
