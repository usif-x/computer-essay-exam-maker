// PDF Handler - Manages PDF upload and text extraction
class PDFHandler {
  constructor() {
    this.pdfContent = "";
    this.currentFile = null;
    this.materials = null;
    this.loadPreloadedMaterials();
  }

  // Load pre-loaded materials from JSON
  async loadPreloadedMaterials() {
    try {
      const response = await fetch("assets/materials.json");
      if (response.ok) {
        this.materials = await response.json();
        console.log(
          "Pre-loaded materials available:",
          Object.keys(this.materials)
        );
      }
    } catch (error) {
      console.log("No pre-loaded materials found:", error.message);
    }
  }

  // Load material from pre-loaded JSON
  loadMaterialFromJSON(materialId) {
    if (!this.materials || !this.materials[materialId]) {
      throw new Error("Material not found");
    }

    const material = this.materials[materialId];
    this.pdfContent = material.content;
    this.currentFile = { name: material.filename, type: "preloaded" };

    return {
      text: material.content,
      title: material.title,
    };
  }

  // Handle PDF file upload and extraction
  async handleFileUpload(file) {
    if (!file || file.type !== "application/pdf") {
      throw new Error("Please upload a valid PDF file");
    }

    // Check file size (approximate max 50 pages = ~5MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error("PDF file is too large. Maximum 50 pages allowed.");
    }

    this.currentFile = file;

    try {
      // Use PDF.js library via CDN
      await this.loadPDFJS();
      const text = await this.extractTextFromPDF(file);

      if (!text || text.trim().length < 100) {
        throw new Error(
          "PDF appears to be empty or text could not be extracted"
        );
      }

      this.pdfContent = text;
      return text;
    } catch (error) {
      console.error("PDF processing error:", error);
      throw new Error("Failed to process PDF: " + error.message);
    }
  }

  // Load PDF.js library dynamically
  async loadPDFJS() {
    if (window.pdfjsLib) return;

    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src =
        "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js";
      script.onload = () => {
        // Set worker
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
        resolve();
      };
      script.onerror = () => reject(new Error("Failed to load PDF.js library"));
      document.head.appendChild(script);
    });
  }

  // Extract text from PDF file
  async extractTextFromPDF(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer })
      .promise;

    let fullText = "";
    const numPages = Math.min(pdf.numPages, 50); // Limit to 50 pages

    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item) => item.str).join(" ");
      fullText += pageText + "\n\n";
    }

    return fullText.trim();
  }

  // Get chunked content for RAG (if needed)
  getChunkedContent(chunkSize = 2000) {
    if (!this.pdfContent) return [];

    const chunks = [];
    const words = this.pdfContent.split(/\s+/);
    let currentChunk = "";

    for (const word of words) {
      if ((currentChunk + word).length > chunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = word + " ";
      } else {
        currentChunk += word + " ";
      }
    }

    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  // Get content for AI (optimized size)
  getContentForAI(maxLength = 8000) {
    if (!this.pdfContent) return "";

    // Return truncated content if too long
    if (this.pdfContent.length > maxLength) {
      return (
        this.pdfContent.substring(0, maxLength) +
        "\n\n[Content truncated for processing...]"
      );
    }

    return this.pdfContent;
  }

  // Get metadata
  getMetadata() {
    return {
      filename: this.currentFile?.name || "Unknown",
      size: this.currentFile?.size || 0,
      contentLength: this.pdfContent.length,
      hasContent: this.pdfContent.length > 0,
    };
  }

  // Clear current PDF
  clear() {
    this.pdfContent = "";
    this.currentFile = null;
  }
}

// Export singleton instance
const pdfHandler = new PDFHandler();
