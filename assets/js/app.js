// Main Application Logic
class ExamApp {
  constructor() {
    this.currentQuestion = null;
    this.currentQuestionData = null;
    this.isProcessing = false;
    this.codeMirror = null;
    this.init();
  }

  init() {
    this.initCodeMirror();
    this.setupEventListeners();
    this.updateUIState();
  }

  initCodeMirror() {
    const textarea = document.getElementById("codeEditor");
    this.codeMirror = CodeMirror.fromTextArea(textarea, {
      mode: "python",
      theme: "dracula",
      lineNumbers: false,
      lineWrapping: true,
      autoCloseBrackets: true,
      matchBrackets: true,
      styleActiveLine: true,
      indentUnit: 4,
      tabSize: 4,
      indentWithTabs: false,
      direction: "ltr",
      placeholder:
        "# اكتب كود البايثون هنا...\n# Write your Python code here...\n\ndef solution():\n    pass",
    });

    // Update stats on change
    this.codeMirror.on("change", () => {
      this.updateCodeStats();
      this.checkSubmitButton();
    });
  }

  setupEventListeners() {
    // PDF Upload (if exists)
    const pdfUpload = document.getElementById("pdfUpload");
    if (pdfUpload) {
      pdfUpload.addEventListener("change", (e) => this.handlePDFUpload(e));
    }

    // Material Select
    const materialSelect = document.getElementById("materialSelect");
    if (materialSelect) {
      materialSelect.addEventListener("change", (e) =>
        this.handleMaterialSelect(e)
      );
    }

    // Generate Question Button
    const generateBtn = document.getElementById("generateBtn");
    generateBtn.addEventListener("click", () => this.generateNewQuestion());

    // Make Harder Button
    const harderBtn = document.getElementById("harderBtn");
    if (harderBtn) {
      harderBtn.addEventListener("click", () => this.generateNewQuestion(true));
    }

    // Submit Button
    const submitBtn = document.getElementById("submitBtn");
    submitBtn.addEventListener("click", () => this.submitCode());

    // Try Again Button
    const tryAgainBtn = document.getElementById("tryAgainBtn");
    tryAgainBtn.addEventListener("click", () => this.resetForNewQuestion());
  }

  async handleMaterialSelect(event) {
    const materialId = event.target.value;
    if (!materialId) return;

    const statusDiv = document.getElementById("pdfStatus");

    try {
      this.showToast("Loading material...", "info");
      statusDiv.innerHTML =
        '<div class="text-indigo-600 flex items-center"><svg class="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Loading material...</div>';

      const material = pdfHandler.loadMaterialFromJSON(materialId);

      statusDiv.innerHTML = `
        <div class="text-green-600 flex items-center">
          <svg class="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
          </svg>
          <strong>Success!</strong> ${material.title} loaded
        </div>
        <div class="text-gray-600 mt-2">Content: ${material.text.length.toLocaleString()} characters</div>
      `;

      this.showToast("Material loaded successfully!", "success");

      // Clear file upload if any
      const pdfUpload = document.getElementById("pdfUpload");
      if (pdfUpload) pdfUpload.value = "";

      // Auto-generate first question
      await this.generateNewQuestion();
    } catch (error) {
      statusDiv.innerHTML = `
        <div class="text-red-600 flex items-center">
          <svg class="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
          </svg>
          <strong>Error:</strong> ${error.message}
        </div>
      `;
      this.showToast("Failed to load material", "error");
    }
  }

  async handlePDFUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const statusDiv = document.getElementById("pdfStatus");

    try {
      this.showToast("Processing PDF...", "info");
      statusDiv.innerHTML =
        '<div class="text-indigo-600 flex items-center"><svg class="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Processing PDF...</div>';

      const content = await pdfHandler.handleFileUpload(file);
      const metadata = pdfHandler.getMetadata();

      statusDiv.innerHTML = `
                <div class="text-green-600 flex items-center">
                    <svg class="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                    </svg>
                    <strong>Success!</strong> ${metadata.filename} loaded (${(
        metadata.size / 1024
      ).toFixed(1)} KB)
                </div>
                <div class="text-gray-600 mt-2">Content extracted: ${metadata.contentLength.toLocaleString()} characters</div>
            `;

      this.showToast("PDF loaded successfully!", "success");

      // Clear material select if any
      const materialSelect = document.getElementById("materialSelect");
      if (materialSelect) materialSelect.value = "";

      // Auto-generate first question
      await this.generateNewQuestion();
    } catch (error) {
      statusDiv.innerHTML = `
                <div class="text-red-600 flex items-center">
                    <svg class="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
                    </svg>
                    <strong>Error:</strong> ${error.message}
                </div>
            `;
      this.showToast(error.message, "error");
    }
  }

  async generateNewQuestion(makeHarder = false) {
    if (this.isProcessing) return;

    const pdfContent = pdfHandler.getContentForAI();
    if (!pdfContent) {
      this.showToast("Please upload a PDF first", "error");
      return;
    }

    // Check if we have a previous question for "harder" mode
    if (makeHarder && !this.currentQuestion) {
      this.showToast("No previous question to make harder", "error");
      return;
    }

    this.isProcessing = true;
    const questionSection = document.getElementById("questionSection");
    const questionDisplay = document.getElementById("questionDisplay");
    const generateBtn = document.getElementById("generateBtn");
    const harderBtn = document.getElementById("harderBtn");

    questionSection.classList.remove("hidden");
    generateBtn.disabled = true;
    if (harderBtn) harderBtn.disabled = true;

    // Show streaming indicator
    const message = makeHarder
      ? "🚀 AI is generating a HARDER question..."
      : "🤖 AI is generating your question...";
    questionDisplay.innerHTML = `<div class="streaming-text text-gray-500 text-sm sm:text-base">${message}</div>`;

    let streamedText = "";
    const previousQuestion = makeHarder ? this.currentQuestion : null;

    try {
      const result = await aiService.generateQuestion(
        pdfContent,
        (chunk, fullText) => {
          streamedText = fullText;
          // Update display with streaming text
          questionDisplay.innerHTML = `<div class="text-gray-700 whitespace-pre-wrap">${this.escapeHtml(
            fullText
          )}</div>`;
        },
        previousQuestion,
        makeHarder
      );

      this.currentQuestionData = result;
      this.currentQuestion = result.question;

      // Display formatted question
      questionDisplay.innerHTML = `
                <div class="space-y-3">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-semibold text-indigo-600 bg-indigo-100 px-3 py-1 rounded-full">${
                          result.topic || "Python Programming"
                        }</span>
                        <span class="text-xs font-semibold ${this.getDifficultyColor(
                          result.difficulty
                        )} px-3 py-1 rounded-full">${
        result.difficulty || "medium"
      }</span>
                    </div>
                    <div class="text-gray-800 text-base leading-relaxed">${this.markdownToHtml(
                      result.question
                    )}</div>
                    ${
                      result.hints && result.hints.length > 0
                        ? `
                        <div class="mt-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                            <div class="text-sm font-semibold text-yellow-800 mb-1">💡 Hints:</div>
                            <ul class="text-sm text-yellow-700 space-y-1">
                                ${result.hints
                                  .map(
                                    (hint) =>
                                      `<li>• ${this.escapeHtml(hint)}</li>`
                                  )
                                  .join("")}
                            </ul>
                        </div>
                    `
                        : ""
                    }
                </div>
            `;

      // Clear previous code and review
      this.codeMirror.setValue("");
      document.getElementById("reviewSection").classList.add("hidden");
      this.updateCodeStats();
      this.checkSubmitButton();

      // Show "Make Harder" button after first question
      if (harderBtn) harderBtn.classList.remove("hidden");

      this.showToast("Question generated!", "success");
    } catch (error) {
      questionDisplay.innerHTML = `
                <div class="text-red-600">
                    <strong>Error generating question:</strong> ${error.message}
                </div>
            `;
      this.showToast("Failed to generate question", "error");
    } finally {
      this.isProcessing = false;
      generateBtn.disabled = false;
      if (harderBtn) harderBtn.disabled = false;
    }
  }

  async submitCode() {
    if (this.isProcessing) return;

    const code = this.codeMirror.getValue().trim();
    if (!code) {
      this.showToast("Please write some code first", "error");
      return;
    }

    if (!this.currentQuestion) {
      this.showToast("No question available", "error");
      return;
    }

    this.isProcessing = true;
    const submitBtn = document.getElementById("submitBtn");
    const reviewSection = document.getElementById("reviewSection");

    submitBtn.disabled = true;
    submitBtn.innerHTML =
      '<svg class="animate-spin h-5 w-5 mx-auto" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>';

    reviewSection.classList.remove("hidden");
    document.getElementById("feedbackDisplay").innerHTML =
      '<div class="text-center text-gray-500 py-8">🤖 AI is reviewing your code...</div>';

    try {
      const pdfContent = pdfHandler.getContentForAI();
      const result = await aiService.reviewCode(
        this.currentQuestion,
        code,
        pdfContent,
        (chunk, fullText) => {
          // Optional: show streaming feedback
        }
      );

      this.displayReviewResults(result, code);
      this.showToast("Review complete!", "success");

      // Scroll to results
      reviewSection.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      document.getElementById("feedbackDisplay").innerHTML = `
                <div class="text-red-600 text-center py-4">
                    <strong>Error:</strong> ${error.message}
                </div>
            `;
      this.showToast("Failed to review code", "error");
    } finally {
      this.isProcessing = false;
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit for Review";
    }
  }

  displayReviewResults(result, code) {
    // Update score cards
    document.getElementById("scoreDisplay").textContent = result.score || 0;
    document.getElementById("qualityDisplay").textContent =
      result.quality || "unknown";
    document.getElementById("errorCountDisplay").textContent =
      result.errors?.length || 0;

    // Build feedback display
    const feedbackHTML = `
            <!-- Summary -->
            <div class="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                <h4 class="font-semibold text-blue-900 mb-2">📋 Summary</h4>
                <p class="text-blue-800">${this.escapeHtml(
                  result.feedback?.summary || "No summary available"
                )}</p>
            </div>

            <!-- Strengths -->
            ${
              result.feedback?.strengths && result.feedback.strengths.length > 0
                ? `
                <div class="bg-green-50 border-l-4 border-green-500 p-4 rounded">
                    <h4 class="font-semibold text-green-900 mb-2">✅ Strengths</h4>
                    <ul class="text-green-800 space-y-1">
                        ${result.feedback.strengths
                          .map((s) => `<li>• ${this.escapeHtml(s)}</li>`)
                          .join("")}
                    </ul>
                </div>
            `
                : ""
            }

            <!-- Weaknesses -->
            ${
              result.feedback?.weaknesses &&
              result.feedback.weaknesses.length > 0
                ? `
                <div class="bg-orange-50 border-l-4 border-orange-500 p-4 rounded">
                    <h4 class="font-semibold text-orange-900 mb-2">⚠️ Areas for Improvement</h4>
                    <ul class="text-orange-800 space-y-1">
                        ${result.feedback.weaknesses
                          .map((w) => `<li>• ${this.escapeHtml(w)}</li>`)
                          .join("")}
                    </ul>
                </div>
            `
                : ""
            }

            <!-- Errors -->
            ${
              result.errors && result.errors.length > 0
                ? `
                <div class="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                    <h4 class="font-semibold text-red-900 mb-3">🐛 Errors Found</h4>
                    <div class="space-y-3">
                        ${result.errors
                          .map(
                            (error, idx) => `
                            <div class="bg-white p-3 rounded border border-red-200">
                                <div class="flex items-start justify-between mb-2">
                                    <span class="text-xs font-bold text-red-700 bg-red-100 px-2 py-1 rounded">${
                                      error.type || "Error"
                                    }</span>
                                    ${
                                      error.line > 0
                                        ? `<span class="text-xs text-gray-600">Line ${error.line}</span>`
                                        : ""
                                    }
                                </div>
                                <p class="text-red-800 font-medium mb-1">${this.escapeHtml(
                                  error.description
                                )}</p>
                                ${
                                  error.suggestion
                                    ? `
                                    <div class="mt-2 text-sm text-gray-700 bg-gray-50 p-2 rounded">
                                        <strong>💡 Suggestion:</strong> ${this.escapeHtml(
                                          error.suggestion
                                        )}
                                    </div>
                                `
                                    : ""
                                }
                            </div>
                        `
                          )
                          .join("")}
                    </div>
                </div>

                <!-- Code with error highlights -->
                <div class="bg-gray-50 border-l-4 border-gray-400 p-4 rounded">
                    <h4 class="font-semibold text-gray-900 mb-2">📝 Your Code (with errors highlighted)</h4>
                    <div class="bg-white rounded border border-gray-300 overflow-hidden">
                        <pre class="p-4 text-sm code-editor overflow-x-auto">${this.highlightErrorLines(
                          code,
                          result.errors
                        )}</pre>
                    </div>
                </div>
            `
                : ""
            }

            <!-- Additional Notes -->
            ${
              result.notes
                ? `
                <div class="bg-purple-50 border-l-4 border-purple-500 p-4 rounded">
                    <h4 class="font-semibold text-purple-900 mb-2">📚 Learning Notes</h4>
                    <p class="text-purple-800">${this.escapeHtml(
                      result.notes
                    )}</p>
                </div>
            `
                : ""
            }
        `;

    document.getElementById("feedbackDisplay").innerHTML = feedbackHTML;
  }

  highlightErrorLines(code, errors) {
    if (!errors || errors.length === 0) {
      return this.escapeHtml(code);
    }

    const lines = code.split("\n");
    const errorLines = new Set(
      errors.filter((e) => e.line > 0).map((e) => e.line)
    );

    return lines
      .map((line, idx) => {
        const lineNum = idx + 1;
        const isError = errorLines.has(lineNum);
        const escapedLine = this.escapeHtml(line);

        if (isError) {
          return `<span class="error-line block px-2 -mx-2">${escapedLine}</span>`;
        }
        return escapedLine;
      })
      .join("\n");
  }

  resetForNewQuestion() {
    document.getElementById("reviewSection").classList.add("hidden");
    this.codeMirror.setValue("");
    this.updateCodeStats();
    this.generateNewQuestion();
  }

  updateCodeStats() {
    const code = this.codeMirror.getValue();
    const lines = code.split("\n").length;
    const chars = code.length;

    document.getElementById("lineCount").textContent = `Lines: ${lines}`;
    document.getElementById("charCount").textContent = `Characters: ${chars}`;
  }

  checkSubmitButton() {
    const code = this.codeMirror.getValue().trim();
    const submitBtn = document.getElementById("submitBtn");
    submitBtn.disabled = !code || this.isProcessing;
  }

  updateUIState() {
    const hasContent = pdfHandler.getMetadata().hasContent;
    document.getElementById("generateBtn").disabled =
      !hasContent || this.isProcessing;
  }

  getDifficultyColor(difficulty) {
    const colors = {
      easy: "bg-green-100 text-green-700",
      medium: "bg-yellow-100 text-yellow-700",
      hard: "bg-red-100 text-red-700",
    };
    return colors[difficulty?.toLowerCase()] || colors["medium"];
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  // Convert markdown-style text to HTML
  markdownToHtml(text) {
    if (!text) return "";

    // Escape HTML first
    let html = this.escapeHtml(text);

    // Convert markdown formatting
    // Bold: **text** or __text__
    html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/__(.+?)__/g, "<strong>$1</strong>");

    // Italic: *text* or _text_
    html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
    html = html.replace(/_(.+?)_/g, "<em>$1</em>");

    // Code: `code`
    html = html.replace(
      /`(.+?)`/g,
      '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">$1</code>'
    );

    // Bullet lists: - item
    html = html.replace(/^- (.+)$/gm, '<li class="ml-4">$1</li>');

    // Line breaks: preserve them
    html = html.replace(/\n/g, "<br>");

    // Wrap consecutive <li> in <ul>
    html = html.replace(/(<li.*?<\/li>(?:<br>)?)+/g, (match) => {
      return (
        '<ul class="list-disc space-y-1 my-2">' +
        match.replace(/<br>/g, "") +
        "</ul>"
      );
    });

    return html;
  }

  showToast(message, type = "info") {
    const container = document.getElementById("toastContainer");
    const colors = {
      success: "bg-green-500",
      error: "bg-red-500",
      info: "bg-blue-500",
      warning: "bg-yellow-500",
    };

    const toast = document.createElement("div");
    toast.className = `${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg transform transition-all duration-300 translate-x-0`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.transform = "translateX(400px)";
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

// Initialize app when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  window.examApp = new ExamApp();
});
