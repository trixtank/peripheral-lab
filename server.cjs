const http = require("http");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "dist");
const feedbackPath = path.join(__dirname, "feedback.txt");
const port = Number(process.env.PORT || 4173);
const host = "127.0.0.1";

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mp3": "audio/mpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function send(res, status, body, type = "text/plain; charset=utf-8") {
  res.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store" });
  res.end(body);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${host}:${port}`);

  if (req.method === "POST" && url.pathname === "/feedback") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 20_000) req.destroy();
    });
    req.on("end", () => {
      try {
        const parsed = JSON.parse(body || "{}");
        const message = String(parsed.message || "").trim();
        if (!message) {
          send(res, 400, JSON.stringify({ error: "Feedback is empty" }), "application/json; charset=utf-8");
          return;
        }

        const entry = [
          `Time: ${new Date().toISOString()}`,
          `Page: ${String(parsed.page || "")}`,
          "Feedback:",
          message,
          "---",
          "",
        ].join("\n");
        fs.appendFile(feedbackPath, entry, (error) => {
          if (error) {
            send(res, 500, JSON.stringify({ error: "Could not save feedback" }), "application/json; charset=utf-8");
            return;
          }
          send(res, 200, JSON.stringify({ ok: true }), "application/json; charset=utf-8");
        });
      } catch {
        send(res, 400, JSON.stringify({ error: "Invalid feedback payload" }), "application/json; charset=utf-8");
      }
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/speed-upload") {
    let bytes = 0;
    req.on("data", (chunk) => {
      bytes += chunk.length;
    });
    req.on("end", () => {
      send(res, 200, JSON.stringify({ bytes }), "application/json; charset=utf-8");
    });
    return;
  }

  const cleanPath = decodeURIComponent(url.pathname).replace(/^\/+/, "");
  let filePath = path.join(root, cleanPath);

  if (!filePath.startsWith(root)) {
    send(res, 403, "Forbidden");
    return;
  }

  if (url.pathname === "/" || url.pathname.endsWith("/")) {
    filePath = path.join(root, "index.html");
  }

  fs.readFile(filePath, (error, data) => {
    if (!error) {
      const range = req.headers.range;
      if (range) {
        const stat = fs.statSync(filePath);
        const match = range.match(/bytes=(\d*)-(\d*)/);
        const start = match?.[1] ? Number(match[1]) : 0;
        const end = match?.[2] ? Number(match[2]) : stat.size - 1;
        const safeEnd = Math.min(end, stat.size - 1);

        if (start <= safeEnd) {
          res.writeHead(206, {
            "Accept-Ranges": "bytes",
            "Cache-Control": "no-store",
            "Content-Length": safeEnd - start + 1,
            "Content-Range": `bytes ${start}-${safeEnd}/${stat.size}`,
            "Content-Type": types[path.extname(filePath)] || "application/octet-stream",
          });
          fs.createReadStream(filePath, { start, end: safeEnd }).pipe(res);
          return;
        }
      }
      send(res, 200, data, types[path.extname(filePath)] || "application/octet-stream");
      return;
    }

    fs.readFile(path.join(root, "index.html"), (fallbackError, fallback) => {
      if (fallbackError) {
        send(res, 404, "Not found");
        return;
      }
      send(res, 200, fallback, types[".html"]);
    });
  });
});

server.listen(port, host, () => {
  console.log(`Peripheral Test Lab running at http://${host}:${port}/mic/`);
});
