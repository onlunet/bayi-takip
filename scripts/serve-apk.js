const http = require("http");
const fs = require("fs");
const path = require("path");

const root = process.argv[2];
const port = Number(process.argv[3] || 8787);

if (!root) {
  console.error("Usage: node serve-apk.js <directory> [port]");
  process.exit(1);
}

const contentTypes = {
  ".apk": "application/vnd.android.package-archive",
  ".html": "text/html; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

function sendNotFound(res) {
  res.statusCode = 404;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.end("Not found");
}

const server = http.createServer((req, res) => {
  const reqPath = decodeURIComponent((req.url || "/").split("?")[0]);
  const safePath = reqPath === "/" ? "/family-control-debug.apk" : reqPath;
  const fullPath = path.join(root, safePath);

  if (!fullPath.startsWith(path.resolve(root))) {
    return sendNotFound(res);
  }

  fs.stat(fullPath, (err, stats) => {
    if (err || !stats.isFile()) {
      return sendNotFound(res);
    }

    const ext = path.extname(fullPath).toLowerCase();
    res.statusCode = 200;
    res.setHeader("Content-Type", contentTypes[ext] || "application/octet-stream");
    res.setHeader("Content-Length", String(stats.size));
    res.setHeader("Content-Disposition", `attachment; filename="${path.basename(fullPath)}"`);

    const stream = fs.createReadStream(fullPath);
    stream.on("error", () => {
      res.statusCode = 500;
      res.end("Server error");
    });
    stream.pipe(res);
  });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`APK server running on http://0.0.0.0:${port}/family-control-debug.apk`);
});
