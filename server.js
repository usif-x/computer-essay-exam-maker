const express = require("express");
const cors = require("cors");
const https = require("https");
const path = require("path");
const fs = require("fs");

// Create Express app
const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Load configuration
function getConfig() {
  if (process.env.API_KEY && process.env.API_URL && process.env.MODEL) {
    return {
      api_key: process.env.API_KEY,
      api_url: process.env.API_URL,
      model: process.env.MODEL,
    };
  }

  const secretPath = path.join(__dirname, "secret");
  if (fs.existsSync(secretPath)) {
    const content = fs.readFileSync(secretPath, "utf8");
    const config = {};
    content.split("\n").forEach((line) => {
      const colonIndex = line.indexOf(":");
      if (colonIndex > -1) {
        const key = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim();
        if (key && value) config[key] = value;
      }
    });
    return config;
  }

  throw new Error("Configuration not found");
}

// Helper function to call AI API
function callAI(messages, onChunk, onComplete, onError) {
  const config = getConfig();

  const requestBody = JSON.stringify({
    model: config.model,
    messages: messages,
    stream: false,
  });

  const apiUrl = new URL(config.api_url + "/chat/completions");

  const options = {
    hostname: apiUrl.hostname,
    port: apiUrl.port || 443,
    path: apiUrl.pathname,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.api_key}`,
      "Content-Length": Buffer.byteLength(requestBody),
    },
  };

  console.log(`🤖 Calling AI: ${config.model}`);

  const req = https.request(options, (res) => {
    let data = "";

    res.on("data", (chunk) => {
      data += chunk.toString();
    });

    res.on("end", () => {
      try {
        const response = JSON.parse(data);
        console.log(`✅ AI Response received`);
        onComplete(response);
      } catch (error) {
        console.error("❌ Parse error:", error.message);
        onError(error);
      }
    });
  });

  req.on("error", (error) => {
    console.error("❌ Request error:", error.message);
    onError(error);
  });

  req.write(requestBody);
  req.end();
}

// API: Generate question
app.post("/api/generate-question", (req, res) => {
  const { pdfContent, previousQuestion, makeHarder } = req.body;

  let systemPrompt = "";
  let userPrompt = "";

  if (makeHarder && previousQuestion) {
    systemPrompt = `You are an expert computer science educator creating progressively challenging Python programming questions.

TASK: Generate a HARDER version of the previous question while STRICTLY staying within the study material concepts.

CRITICAL REQUIREMENTS:
1. The new question MUST be based ONLY on concepts explicitly found in the study material
2. DO NOT introduce ANY new topics, syntax, or concepts not covered in the study material
3. DO NOT ask for: try-except, error handling, debugging, or ANY feature not explicitly taught in the material
4. Build upon the SAME topic/concept from previous question but add complexity ONLY using what's taught
5. Still keep it solvable and educational (not impossible)

OUTPUT FORMAT (JSON ONLY):
{
    "question": "More challenging question",
    "topic": "Same topic as before",
    "difficulty": "medium|hard",
    "hints": ["hint1", "hint2"]
}`;

    userPrompt = `Study Material:\n\n${pdfContent}\n\nPrevious Question:\n${previousQuestion}\n\nGenerate a HARDER question using ONLY concepts from the study material.`;
  } else {
    systemPrompt = `You are an expert computer science educator creating Python programming questions.

Generate ONE Python programming question based on the study material provided.

OUTPUT FORMAT (JSON ONLY):
{
    "question": "Clear question description",
    "topic": "Topic from study material",
    "difficulty": "easy|medium",
    "hints": ["hint1", "hint2"]
}`;

    userPrompt = `Study Material:\n\n${pdfContent}\n\nGenerate ONE simple Python programming question based on this material.`;
  }

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  callAI(
    messages,
    null,
    (response) => {
      res.json(response);
    },
    (error) => {
      res.status(500).json({ error: error.message });
    }
  );
});

// API: Review code
app.post("/api/review-code", (req, res) => {
  const { question, studentCode, pdfContent } = req.body;

  const systemPrompt = `You are an expert Python educator reviewing student code.

CRITICAL RULES:
1. ONLY review based on concepts EXPLICITLY taught in the study material
2. DO NOT suggest any syntax, features, or practices NOT shown in the study material
3. FOCUS ONLY on errors that prevent code from working correctly
4. IGNORE minor text formatting issues (punctuation, capitalization in output strings)
5. DO NOT mark as error: missing punctuation, wrong capitalization in strings, English grammar
6. If the student's code works and solves the problem, rate it as "good"

WHAT TO CHECK:
✓ Syntax errors (code won't run - missing colons, wrong indentation, typos in keywords)
✓ Logic errors (wrong algorithm, incorrect conditions, wrong operations)
✓ Runtime errors (division by zero, index out of range, wrong data types)
✓ Does it solve the actual problem asked in the question?

WHAT TO IGNORE:
✗ Punctuation in output strings (., !, ?, etc.)
✗ Capitalization of English words in strings
✗ Spacing in output text
✗ Variable naming style (if it works)
✗ "Best practices" not taught in material
✗ Modern syntax (f-strings, etc.) if material doesn't teach it

EVALUATION CRITERIA:
1. Does the code RUN without syntax errors?
2. Does it produce the CORRECT RESULT?
3. Is the LOGIC correct for solving the problem?
4. Does it use concepts from the study material?

QUALITY RATING:
- "good": Code runs, solves problem correctly, no syntax/logic errors
- "not bad": Minor syntax error OR mostly correct logic with small mistake
- "bad": Major syntax errors, completely wrong logic, or doesn't run

OUTPUT FORMAT (JSON ONLY):
{
    "score": <number 0-100>,
    "quality": "good|not bad|bad",
    "feedback": {
        "summary": "Focus on whether code works and solves the problem",
        "strengths": ["what works correctly"],
        "weaknesses": ["ONLY actual syntax/logic/runtime errors"]
    },
    "errors": [
        {
            "line": <line number>,
            "type": "syntax|logic|runtime",
            "description": "Why code doesn't work or gives wrong result",
            "suggestion": "How to fix the actual error"
        }
    ],
    "notes": "Focus on code functionality, not text formatting"
}

IMPORTANT: If code runs and solves the problem, give high score (90-100). Don't deduct points for punctuation or capitalization in strings.`;

  const userPrompt = `QUESTION:\n${question}\n\nSTUDENT'S CODE:\n${studentCode}\n\nREFERENCE:\n${pdfContent.substring(
    0,
    2000
  )}\n\nReview in JSON format.`;

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  callAI(
    messages,
    null,
    (response) => {
      res.json(response);
    },
    (error) => {
      res.status(500).json({ error: error.message });
    }
  );
});

// Serve static files
app.use(express.static("."));

// Config endpoint (for backwards compatibility)
app.get("/secret", (req, res) => {
  try {
    const config = getConfig();
    const configText = `api_key:${config.api_key}\napi_url:${config.api_url}\nmodel:${config.model}`;
    res.setHeader("Content-Type", "text/plain");
    res.send(configText);
  } catch (error) {
    res.status(500).send("Configuration not found");
  }
});

// Main route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`📚 Exam Maker running on http://0.0.0.0:${PORT}`);
  console.log(`🤖 AI API endpoints: /api/generate-question, /api/review-code`);
  try {
    const config = getConfig();
    console.log(`✅ Config loaded: ${config.model}`);
  } catch (error) {
    console.error(`❌ Config not found`);
  }
});
