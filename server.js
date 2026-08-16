const http = require("http");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname);
const port = Number(process.env.PAPAGO_PORT) || 3000;
const publicFiles = new Set(["/index.html", "/style.css", "/app.js"]);
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8"
};

function headers(contentType) {
  return {
    "Content-Type": contentType,
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Content-Security-Policy": "default-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'self'; frame-ancestors 'none'"
  };
}

function reply(res, status, body, contentType = "text/plain; charset=utf-8") {
  res.writeHead(status, headers(contentType));
  res.end(body);
}

function json(res, status, data) {
  reply(res, status, JSON.stringify(data), "application/json; charset=utf-8");
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.setEncoding("utf8");
    req.on("data", chunk => {
      raw += chunk;
      if (Buffer.byteLength(raw, "utf8") > 32 * 1024) reject(new Error("too-large"));
    });
    req.on("end", () => {
      try { resolve(JSON.parse(raw || "{}")); }
      catch { reject(new Error("invalid-json")); }
    });
    req.on("error", reject);
  });
}

function clean(value, max = 1000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function validatePayload(input) {
  const payload = {
    fact: clean(input.fact, 500),
    interpretation: clean(input.interpretation, 400),
    feelings: clean(input.feelings, 160),
    body: clean(input.body, 160),
    needs: clean(input.needs, 160),
    protection: clean(input.protection, 240),
    goal: clean(input.goal, 40),
    goalDetail: clean(input.goalDetail, 400),
    receiverPreferences: Array.isArray(input.receiverPreferences) ? input.receiverPreferences.slice(0, 2).map(item => clean(item, 80)).filter(Boolean) : []
  };
  const validGoal = ["understand", "request", "boundary"].includes(payload.goal);
  if (!payload.fact || !payload.feelings || !payload.needs || !payload.receiverPreferences.length || !validGoal) return null;
  if (["request", "boundary"].includes(payload.goal) && !payload.goalDetail) return null;
  return payload;
}

function outputText(data) {
  if (typeof data.output_text === "string") return data.output_text.trim();
  for (const item of data.output || []) {
    for (const part of item.content || []) {
      if (part.type === "output_text" && typeof part.text === "string") return part.text.trim();
    }
  }
  return "";
}

async function translate(req, res) {
  if (!process.env.OPENAI_API_KEY) return json(res, 503, { code: "not_configured" });
  let input;
  try { input = await readJson(req); }
  catch (error) { return json(res, error.message === "too-large" ? 413 : 400, { code: error.message }); }
  const payload = validatePayload(input);
  if (!payload) return json(res, 400, { code: "invalid_input" });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9500);
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5.6",
        store: false,
        max_output_tokens: 260,
        instructions: "你是 PAPA GO 的‘第二次翻译’模块。只输出一段自然、温柔但不讨好的中文沟通草稿，约 80—150 字，不要标题、分析、Markdown 或多版本。保留用户确认的事实、感受、需要和沟通目标，并按照对方更容易接住的表达方式调整结构。不要诊断任何人，不推断人格、依恋类型或成长经历；不要替用户道歉，不弱化边界，不要求用户安抚对方。用自然的现代汉语，避免心理学套话和翻译腔。",
        input: `请根据以下由用户亲自确认的内容完成第二次翻译：\n${JSON.stringify(payload, null, 2)}`
      })
    });
    if (!response.ok) return json(res, 502, { code: "provider_error" });
    const data = await response.json();
    const text = outputText(data);
    if (!text) return json(res, 502, { code: "empty_response" });
    return json(res, 200, { text, source: "ai", model: process.env.OPENAI_MODEL || "gpt-5.6" });
  } catch (error) {
    return json(res, 502, { code: error.name === "AbortError" ? "timeout" : "provider_unavailable" });
  } finally {
    clearTimeout(timeout);
  }
}

http.createServer(async (req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname); }
  catch { return reply(res, 400, "Bad request"); }

  if (pathname === "/api/translate") {
    if (req.method !== "POST") return reply(res, 405, "Method not allowed");
    return translate(req, res);
  }
  if (!["GET", "HEAD"].includes(req.method)) return reply(res, 405, "Method not allowed");
  const requested = pathname === "/" ? "/index.html" : pathname;
  if (!publicFiles.has(requested)) return reply(res, 404, "Not found");
  const file = path.resolve(root, `.${requested}`);
  if (!file.startsWith(`${root}${path.sep}`) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return reply(res, 404, "Not found");
  res.writeHead(200, headers(types[path.extname(file)] || "application/octet-stream"));
  if (req.method === "HEAD") return res.end();
  fs.createReadStream(file).pipe(res);
}).listen(port, () => console.log(`PAPA GO guided demo is running at http://localhost:${port}`));
