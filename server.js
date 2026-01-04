const express = require("express");
const cors = require("cors");
const http = require("http");
const https = require("https");
const url = require("url");
const path = require("path");

// Create Express app for static files
const app = express();
app.use(cors());
app.use(express.json());

// Serve static files
app.use(express.static("."));

// Main route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Start static server
const STATIC_PORT = process.env.PORT || 3000;
app.listen(STATIC_PORT, "0.0.0.0", () => {
  console.log(`📚 Exam Maker running on http://0.0.0.0:${STATIC_PORT}`);
});

// ===== CORS Proxy Server =====
const PROXY_PORT = process.env.PROXY_PORT || 8080;

const proxyServer = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With"
  );

  // Handle preflight
  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  // Get target URL
  const targetUrl = req.url.substring(1);

  if (!targetUrl || !targetUrl.startsWith("http")) {
    res.writeHead(400);
    res.end("Bad Request: Target URL must start with http:// or https://");
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
      res.writeHead(500);
      res.end("Proxy Error: " + error.message);
    });

    if (body) proxyReq.write(body);
    proxyReq.end();
  });
});

proxyServer.listen(PROXY_PORT, "0.0.0.0", () => {
  console.log(`🚀 CORS Proxy running on http://0.0.0.0:${PROXY_PORT}`);
});
