# Computer Essay Exam Maker

AI-Powered Python Code Practice & Review System

## 🚀 Quick Start

### Prerequisites

- Node.js installed
- API credentials (xiaomimimo API key)

### Installation

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Configure API credentials**:

   Create a `secret` file in the project root:

   ```
   api_key:your-api-key-here
   api_url:https://api.xiaomimimo.com/v1
   model:mimo-v2-flash
   ```

   Or set environment variables:

   ```bash
   export API_KEY=your-api-key-here
   export API_URL=https://api.xiaomimimo.com/v1
   export MODEL=mimo-v2-flash
   ```

3. **Start the server**:

   ```bash
   npm start
   ```

4. **Open in browser**: `http://localhost:3000`

## 📋 Features

- ✅ Pre-loaded study materials (3 PDF chapters + combined option)
- ✅ AI-generated Python coding questions based on material
- ✅ Progressive difficulty with "Make Harder" feature
- ✅ CodeMirror editor with Python syntax highlighting
- ✅ Markdown support in questions
- ✅ Comprehensive code review with:
  - Score (0-100)
  - Quality rating (Good/Not Bad/Bad)
  - Error detection (syntax, logic, runtime only)
  - Fix suggestions using material concepts
  - Educational feedback
- ✅ Material-aware AI (only suggests concepts from PDFs)

## 🏗️ Architecture

### Backend (Express.js)

- **Server**: `server.js` on port 3000
- **API Endpoints**:
  - `POST /api/generate-question` - Generate Python questions
  - `POST /api/review-code` - Review student code
  - `GET /secret` - Get configuration
- **AI Integration**: Direct HTTPS calls to xiaomimimo API
- **No CORS issues**: All API calls happen server-side

### Frontend

- **Materials**: Pre-extracted from PDFs into `materials.json`
- **Editor**: CodeMirror with Python mode
- **Styling**: Tailwind CSS
- **Markdown**: Question rendering with markdown support

## 🔧 Configuration

### Using Secret File (Development)

Create a `secret` file:

```
api_key:sk-xxxxx
api_url:https://api.xiaomimimo.com/v1
model:mimo-v2-flash
```

### Using Environment Variables (Production)

```bash
API_KEY=sk-xxxxx
API_URL=https://api.xiaomimimo.com/v1
MODEL=mimo-v2-flash
```

Environment variables take priority over the secret file.

## 📦 Deployment

### Docker / Coolify

1. **Build**: Uses Nixpacks (auto-detected)
2. **Port**: 3000
3. **Environment Variables**: Set API_KEY, API_URL, MODEL in dashboard
4. **Deploy**: Push to Git, auto-deploys

See `DEPLOY.md` for detailed instructions.

## 🛠️ File Structure

```
├── index.html              # Main UI
├── server.js               # Express backend + AI integration
├── package.json            # Dependencies
├── secret                  # API credentials (local only)
├── materials.json          # Pre-extracted PDF content
├── Dockerfile              # Docker configuration
├── DEPLOY.md              # Deployment guide
└── assets/
    ├── js/
    │   ├── ai-service.js   # Frontend API calls
    │   ├── pdf-handler.js  # Material loading
    │   └── app.js          # Main application logic
    └── css/
```

## 🎯 Quality Ratings

- **Good** (90-100): Code runs correctly, solves the problem
- **Not Bad** (50-89): Minor syntax errors or small logic issues
- **Bad** (0-49): Major errors or doesn't solve the problem

## 🧠 AI Review Focus

The AI ONLY checks for:

- ✅ **Syntax errors** (code won't run)
- ✅ **Logic errors** (wrong algorithm)
- ✅ **Runtime errors** (crashes, exceptions)

The AI IGNORES:

- ❌ Punctuation in output strings
- ❌ Capitalization of English words
- ❌ Spacing/formatting in strings
- ❌ "Best practices" not in study material
- ❌ Modern syntax not taught in PDFs

**Important**: AI suggestions use ONLY concepts from the loaded study material.

## 📚 Materials System

### Pre-loaded Materials

1. Part 1: Introduction to Computers and Programming
2. Part 2: Introduction to Computers and Programming
3. Introduction to Programming
4. All Materials Combined

### Adding New Materials

Run the Python script to extract PDF content:

```bash
python extract_pdfs.py
```

This updates `materials.json` with new content.

## 💻 Development

### Local Development

```bash
npm install
npm start
# Server runs on http://localhost:3000
```

### API Testing

Test question generation:

```bash
curl -X POST http://localhost:3000/api/generate-question \
  -H "Content-Type: application/json" \
  -d '{"pdfContent":"Study material text here","makeHarder":false}'
```

Test code review:

```bash
curl -X POST http://localhost:3000/api/review-code \
  -H "Content-Type: application/json" \
  -d '{"question":"Question text","studentCode":"print(\"hello\")","pdfContent":"Material"}'
```

## 🔄 Progressive Difficulty

- Start with simple questions from material
- Click "Make Harder" to increase complexity
- AI builds on same concepts, doesn't introduce new topics
- Stays within material boundaries

## 📝 Notes

- Uses xiaomimimo `mimo-v2-flash` model
- Non-streaming mode for stability
- Questions formatted with markdown
- CodeMirror with no line numbers (as requested)
- Responsive design for mobile/desktop
