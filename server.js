const express = require("express");
const cors = require("cors");
const http = require("http");
const https = require("https");
const url = require("url");
const path = require("path");
const fs = require("fs");

// Create Express app for static files
const app = express();
app.use(cors());
app.use(express.json());

// CORS Proxy route - handles API requests through the main server
app.all("/api/proxy/*", (req, res) => {
  const targetUrl = req.url.substring(11); // Remove '/api/proxy/'

  if (!targetUrl || !targetUrl.startsWith("http")) {
    res
      .status(400)
      .send("Bad Request: Target URL must start with http:// or https://");
    return;
  }

  console.log(`🔄 Proxying ${req.method} to: ${targetUrl}`);

  const parsedUrl = url.parse(targetUrl);
  const protocol = parsedUrl.protocol === "https:" ? https : http;

  let body = "";
  req.on("data", (chunk) => {
    body += chunk.toString();
  });

  req.on("end", () => {
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.path,
      method: req.method,
      headers: {
        "Content-Type": req.headers["content-type"] || "application/json",
        Authorization: req.headers["authorization"] || "",
        "Content-Length": Buffer.byteLength(body),
      },
    };

    const proxyReq = protocol.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, {
        ...proxyRes.headers,
        "Access-Control-Allow-Origin": "*",
      });
      proxyRes.pipe(res);
    });

    proxyReq.on("error", (error) => {
      console.error("Proxy error:", error);
      res.status(500).send("Proxy Error: " + error.message);
    });

    if (body) proxyReq.write(body);
    proxyReq.end();
  });
});

// Serve static files
app.use(express.static("."));

// API endpoint to get configuration
// Prioritizes environment variables over secret file
app.get("/secret", (req, res) => {
  // Check for environment variables first
  if (process.env.API_KEY && process.env.API_URL && process.env.MODEL) {
    const config = `api_key:${process.env.API_KEY}\napi_url:${process.env.API_URL}\nmodel:${process.env.MODEL}`;
    res.setHeader("Content-Type", "text/plain");
    res.send(config);
    console.log("✅ Serving config from environment variables");
    return;
  }

  // Fall back to secret file
  const secretPath = path.join(__dirname, "secret");
  if (fs.existsSync(secretPath)) {
    res.sendFile(secretPath);
    console.log("✅ Serving config from secret file");
  } else {
    res
      .status(500)
      .send(
        "Configuration not found. Set API_KEY, API_URL, and MODEL environment variables or create a secret file."
      );
    console.error("❌ No configuration found!");
  }
});

// Main route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Start static server
const STATIC_PORT = process.env.PORT || 3000;
app.listen(STATIC_PORT, "0.0.0.0", () => {
  console.log(`📚 Exam Maker running on http://0.0.0.0:${STATIC_PORT}`);
  console.log(`🔄 CORS Proxy available at /api/proxy/`);
  console.log(
    `📝 Config source: ${
      process.env.API_KEY ? "Environment Variables" : "Secret File"
    }`
  );
});
