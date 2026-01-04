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

      // Detect CORS proxy URL based on environment
      const isProduction =
        !window.location.hostname.includes("localhost") &&
        !window.location.hostname.includes("127.0.0.1");

      if (isProduction) {
        // In production, use path-based proxy on same domain
        // This avoids CORS and port exposure issues
        this.corsProxy = "/api/proxy/";
        console.log("🌐 Using production path-based proxy:", this.corsProxy);
      } else {
        // In development, use localhost CORS proxy
        this.corsProxy = "http://localhost:8080/";
        console.log("💻 Using development CORS proxy:", this.corsProxy);
      }

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

  // Generate question based on PDF content
  async generateQuestion(
    pdfContent,
    onChunk,
    previousQuestion = null,
    makeHarder = false
  ) {
    await this.waitForConfig();

    try {
      const response = await fetch("/api/generate-question", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pdfContent,
          previousQuestion,
          makeHarder,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Extract content from AI response
      if (data.choices && data.choices[0]) {
        const content = data.choices[0].message.content;

        // Parse JSON from content (may be wrapped in markdown code blocks)
        const cleanContent = content
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "")
          .trim();

        let parsedData;
        try {
          parsedData = JSON.parse(cleanContent);
        } catch (e) {
          // Try to extract JSON with regex
          const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsedData = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error("Could not parse JSON from response");
          }
        }

        // Call onChunk with the complete response
        if (onChunk) {
          onChunk(content);
        }

        return parsedData;
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      console.error("Generate question error:", error);
      throw error;
    }
  }

  // Review student code
  async reviewCode(question, studentCode, pdfContent, onChunk) {
    await this.waitForConfig();

    try {
      const response = await fetch("/api/review-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question,
          studentCode,
          pdfContent,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Extract content from AI response
      if (data.choices && data.choices[0]) {
        const content = data.choices[0].message.content;

        // Parse JSON from content (may be wrapped in markdown code blocks)
        const cleanContent = content
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "")
          .trim();

        let parsedData;
        try {
          parsedData = JSON.parse(cleanContent);
        } catch (e) {
          // Try to extract JSON with regex
          const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsedData = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error("Could not parse JSON from response");
          }
        }

        // Call onChunk with the complete response
        if (onChunk) {
          onChunk(content);
        }

        return parsedData;
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      console.error("Review code error:", error);
      throw error;
    }
  }
}

// Export singleton instance
const aiService = new AIService();
