// AI Service - Handles all AI interactions with streaming support
class AIService {
  constructor() {
    this.config = null;
    this.loadConfig();
  }

  async loadConfig() {
    try {
      const response = await fetch("/secret");
      const text = await response.text();
      const lines = text.split("\n");

      this.config = {};
      lines.forEach((line) => {
        const colonIndex = line.indexOf(":");
        if (colonIndex > -1) {
          const key = line.substring(0, colonIndex).trim();
          const value = line.substring(colonIndex + 1).trim();
          if (key && value) {
            this.config[key] = value;
          }
        }
      });

      // Add CORS proxy for development (comment out for production with proper backend)
      this.corsProxy = "http://localhost:8080/";
      // Alternative: Use empty string if API supports CORS or you have a backend
      // this.corsProxy = '';

      console.log("Config loaded:", {
        api_url: this.config.api_url,
        model: this.config.model,
        has_api_key: !!this.config.api_key,
      });
    } catch (error) {
      console.error("Failed to load config:", error);
      throw new Error("Configuration not loaded");
    }
  }

  async waitForConfig() {
    while (!this.config) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  // Generate question based on PDF content with streaming
  async generateQuestion(
    pdfContent,
    onChunk,
    previousQuestion = null,
    makeHarder = false
  ) {
    await this.waitForConfig();

    let systemPrompt = "";
    let userPrompt = "";

    if (makeHarder && previousQuestion) {
      // Generate a harder version of the previous question
      systemPrompt = `You are an expert computer science educator creating progressively challenging Python programming questions.

TASK: Generate a HARDER version of the previous question while STRICTLY staying within the study material concepts.

CRITICAL REQUIREMENTS:
1. The new question MUST be based ONLY on concepts explicitly found in the study material
2. DO NOT introduce ANY new topics, syntax, or concepts not covered in the study material
3. DO NOT ask for: try-except, error handling, debugging, or ANY feature not explicitly taught in the material
4. Build upon the SAME topic/concept from previous question but add complexity ONLY using what's taught
5. Still keep it solvable and educational (not impossible)
6. Increase difficulty ONLY by:
   - Adding more conditions or logic FROM CONCEPTS IN THE MATERIAL
   - Requiring multiple steps or functions USING ONLY MATERIAL CONCEPTS
   - Combining concepts ALREADY EXPLICITLY COVERED in the study material
   - Requiring more complex logic with ONLY the syntax/features taught in material
7. Should require 20-40 lines of code (more complex than previous)
8. Question MUST relate to topics explicitly and clearly covered in the study material

FORBIDDEN ADDITIONS (unless explicitly in material):
- try-except or error handling
- Advanced features (decorators, generators, etc.)
- External libraries not mentioned
- Debugging techniques
- Any syntax or concepts not taught in the material

PROGRESSION EXAMPLES (ONLY if concepts exist in material):
- Easy: "Check if number is even" → Medium: "Find all even numbers in a list and return their sum"
- Medium: "Calculate factorial" → Hard: "Calculate factorial with recursion" (ONLY if recursion is taught)

WARNING: Do NOT ask students to implement ANY feature, syntax, or concept not explicitly taught in their study material.

OUTPUT FORMAT (JSON ONLY):
{
    "question": "More challenging question building on previous concept BUT using ONLY concepts from study material",
    "topic": "Same topic from study material as before",
    "difficulty": "medium|hard",
    "hints": ["hint1", "hint2"]
}

IMPORTANT: Return ONLY valid JSON. No other text. Keep it harder but use ONLY what's in the study material.`;

      userPrompt = `Study Material Content:\n\n${pdfContent}\n\nPrevious Question:\n${previousQuestion}\n\nGenerate a HARDER Python programming question building upon this concept BUT staying strictly within the topics covered in the study material above.`;
    } else {
      // Generate a new question
      systemPrompt = `You are an expert computer science educator creating Python programming questions for student practice.

TASK: Generate ONE SIMPLE Python programming question based EXACTLY on the concepts in the provided study material.

CRITICAL REQUIREMENTS:
1. Keep it SIMPLE - match the difficulty level of examples in the PDF
2. The question must be directly related to concepts explicitly taught in the study material
3. DO NOT create complex applications or multi-feature programs
4. DO NOT ask for features/syntax not shown in the study material (like try-except, advanced features, etc.)
5. Focus on ONE concept or topic at a time
6. Question should be similar to textbook exercises, not real-world applications
7. Students should be able to solve it in 10-20 lines of code
8. Use simple, clear language - avoid complex scenarios
9. Use ONLY Python features and syntax that appear in the study material

FORBIDDEN (unless explicitly in material):
- Error handling (try-except)
- Debugging techniques
- Advanced features not covered
- External libraries not mentioned
- Any syntax/concept not taught

EXAMPLES OF GOOD QUESTIONS:
- "Write a function that takes two numbers and returns their sum"
- "Create a loop that prints numbers from 1 to 10"
- "Write code to check if a number is even or odd"

EXAMPLES OF BAD QUESTIONS (TOO COMPLEX):
- "Build a complete calculator application with GUI"
- "Create a student management system with database"
- "Develop a web scraper with error handling"

FORMATTING:
- Use markdown formatting for better readability:
  - Use **bold** for important terms
  - Use bullet points (- ) for lists
  - Use line breaks for clarity
  - Use \`code\` for inline code snippets

OUTPUT FORMAT (JSON ONLY):
{
    "question": "Clear, simple question text with markdown formatting, matching PDF difficulty level and using ONLY concepts from material",
    "topic": "Main topic from study material",
    "difficulty": "easy|medium|hard",
    "hints": ["hint1", "hint2"]
}

IMPORTANT: Return ONLY valid JSON. No other text or formatting. Keep questions SIMPLE, FOCUSED, and STRICTLY within material scope.`;

      userPrompt = `Study Material Content:\n\n${pdfContent}\n\nGenerate a Python programming question based on this content.`;
    }

    return await this.streamCompletion(systemPrompt, userPrompt, onChunk);
  }

  // Review student code with streaming
  async reviewCode(question, studentCode, pdfContent, onChunk) {
    await this.waitForConfig();

    const systemPrompt = `You are an expert Python programming instructor reviewing student code submissions.

TASK: Review the student's Python code answer and provide detailed feedback in English.

EVALUATION CRITERIA:
1. Correctness: Does it solve the problem?
2. Syntax: Are there any syntax errors?
3. Logic: Is the logic sound?
4. Code Quality: Is it clean and readable?
5. Best Practices: Does it follow Python conventions?

QUALITY RATING RULES:
- "good": No errors, correct solution, clean code
- "not bad": Has syntax errors but logic is mostly correct, fixable issues
- "bad": Major logic errors, multiple syntax errors, or fundamentally wrong approach

OUTPUT FORMAT (JSON ONLY):
{
    "score": <number 0-100>,
    "quality": "good|not bad|bad",
    "feedback": {
        "summary": "Overall assessment in 2-3 sentences",
        "strengths": ["strength1", "strength2"],
        "weaknesses": ["weakness1", "weakness2"]
    },
    "errors": [
        {
            "line": <line number or 0 if general>,
            "type": "syntax|logic|style|runtime",
            "description": "What is wrong",
            "suggestion": "How to fix it"
        }
    ],
    "notes": "Additional notes and learning points"
}

IMPORTANT RULES:
1. Return ONLY valid JSON. No markdown, no code blocks, no extra text.
2. For "not bad" and "bad" quality, MUST include specific error lines
3. Be constructive and educational in feedback
4. Reference the study material when relevant
5. Score must reflect the quality rating:
   - good: 80-100
   - not bad: 50-79
   - bad: 0-49
6. All feedback must be in English
7. Use a friendly and educational tone`;

    const userPrompt = `QUESTION:
${question}

STUDENT'S CODE:
${studentCode}

REFERENCE MATERIAL:
${pdfContent.substring(0, 2000)}

Provide a comprehensive review in JSON format.`;

    return await this.streamCompletion(systemPrompt, userPrompt, onChunk);
  }

  // Core streaming function
  async streamCompletion(systemPrompt, userPrompt, onChunk) {
    await this.waitForConfig();

    try {
      // Build API URL with CORS proxy if needed
      const apiUrl = this.corsProxy
        ? `${this.corsProxy}${this.config.api_url}/chat/completions`
        : `${this.config.api_url}/chat/completions`;

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.api_key}`,
          ...(this.corsProxy && { "X-Requested-With": "XMLHttpRequest" }),
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          stream: false,
          temperature: 0.7,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      const fullText = data.choices[0]?.message?.content || "";

      // Call onChunk with full text if provided
      if (onChunk) {
        onChunk(fullText, fullText);
      }

      // Parse JSON response
      try {
        const jsonMatch = fullText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("No valid JSON found in response");
        }
      } catch (error) {
        console.error("Failed to parse JSON:", fullText);
        throw new Error("Invalid JSON response from AI");
      }
    } catch (error) {
      console.error("AI Service Error:", error);
      throw error;
    }
  }

  // Non-streaming fallback (if needed)
  async generateQuestionSync(pdfContent) {
    let result = null;
    await this.generateQuestion(pdfContent, (chunk, full) => {
      // Just collect the result
    }).then((data) => {
      result = data;
    });
    return result;
  }
}

// Export singleton instance
const aiService = new AIService();
