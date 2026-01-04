// Simple CORS Proxy Server for Development
// Run with: node cors-proxy.js

const http = require("http");
const https = require("https");
const url = require("url");

const PORT = 8080;

const server = http.createServer((req, res) => {
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

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  // Get target URL from request
  const targetUrl = req.url.substring(1); // Remove leading slash

  if (!targetUrl || !targetUrl.startsWith("http")) {
    res.writeHead(400);
    res.end("Bad Request: Target URL must start with http:// or https://");
    return;
  }

  console.log(`Proxying ${req.method} request to: ${targetUrl}`);

  const parsedUrl = url.parse(targetUrl);
  const protocol = parsedUrl.protocol === "https:" ? https : http;

  // Collect request body
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

    if (body) {
      proxyReq.write(body);
    }

    proxyReq.end();
  });
});

server.listen(PORT, () => {
  console.log(`🚀 CORS Proxy running on http://localhost:${PORT}`);
  console.log(
    `Usage: Make requests to http://localhost:${PORT}/https://api.example.com/endpoint`
  );
});
