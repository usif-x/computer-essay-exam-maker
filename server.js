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
3. DO NOT mention f-strings, list comprehensions, or advanced features UNLESS they appear in the material
4. If the student's code works and uses syntax from the material, rate it as "good"
5. Only mark as "style" error if the material explicitly teaches a different style
6. Focus on: syntax errors, logic errors that prevent code from working
7. DO NOT penalize for not using "best practices" if those practices aren't in the material

EVALUATION CRITERIA:
1. Correctness: Does it solve the problem and produce correct output?
2. Syntax: Are there syntax errors that prevent it from running?
3. Logic: Does it follow the logic taught in the study material?
4. Material Compliance: Does it use ONLY what was taught in the study material?

QUALITY RATING:
- "good": Code works correctly, no syntax errors, solves the problem (even if not "modern" style)
- "not bad": Has minor fixable syntax errors OR works but has small logic issues
- "bad": Major syntax errors, wrong logic, or doesn't solve the problem

OUTPUT FORMAT (JSON ONLY):
{
    "score": <number 0-100>,
    "quality": "good|not bad|bad",
    "feedback": {
        "summary": "Overall assessment based ONLY on material concepts",
        "strengths": ["what student did correctly"],
        "weaknesses": ["actual errors or material violations"]
    },
    "errors": [
        {
            "line": <line number>,
            "type": "syntax|logic",
            "description": "What is wrong",
            "suggestion": "How to fix using ONLY concepts from the material"
        }
    ],
    "notes": "Additional notes based on the study material"
}

REMEMBER: If code works and uses material syntax, it's GOOD. Don't suggest features not in the material.`;

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
