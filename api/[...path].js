const { createHmac, randomUUID, timingSafeEqual } = require("node:crypto");
const { neon } = require("@neondatabase/serverless");
const defaults = require("../portfolio-data.js");

const ADMIN_EMAIL = "pabhinav9001@gmail.com";
const SESSION_COOKIE = "portfolio_admin_session";
const SESSION_SECONDS = 60 * 60 * 12;
const MAX_CONTENT_BYTES = 1024 * 1024;
const MAX_MESSAGE_LENGTH = 10000;
let databaseClient;
let schemaPromise;

function getDatabase() {
  const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!connectionString) throw new Error("Set POSTGRES_URL or DATABASE_URL for the connected Postgres database.");
  if (!databaseClient) databaseClient = neon(connectionString);
  return databaseClient;
}

function send(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

function setCookie(res, value, maxAge) {
  const secure = process.env.VERCEL === "1" || process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=${value}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${maxAge}${secure}`);
}

function getCookie(req, name) {
  const cookies = (req.headers.cookie || "").split(";").map(cookie => cookie.trim());
  const entry = cookies.find(cookie => cookie.startsWith(`${name}=`));
  if (!entry) return "";
  try {
    return decodeURIComponent(entry.slice(name.length + 1));
  } catch {
    return "";
  }
}

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("SESSION_SECRET must contain at least 32 characters.");
  return value;
}

function sign(payload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret()).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

function verifySession(req) {
  const token = getCookie(req, SESSION_COOKIE);
  const [encoded, providedSignature, extra] = token.split(".");
  if (!encoded || !providedSignature || extra) return null;
  const expectedSignature = createHmac("sha256", secret()).update(encoded).digest();
  let actualSignature;
  try {
    actualSignature = Buffer.from(providedSignature, "base64url");
  } catch {
    return null;
  }
  if (actualSignature.length !== expectedSignature.length || !timingSafeEqual(actualSignature, expectedSignature)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    return payload.email === ADMIN_EMAIL && Number.isInteger(payload.exp) && payload.exp > Date.now() ? payload : null;
  } catch {
    return null;
  }
}

function sameOrigin(req) {
  const origin = req.headers.origin;
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function bodyOf(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body);
  return {};
}

function contentMatchesShape(candidate, shape) {
  if (Array.isArray(shape)) {
    return Array.isArray(candidate) && (candidate.length === 0 || shape.length === 0 ||
      candidate.every(item => contentMatchesShape(item, shape[0])));
  }
  if (shape && typeof shape === "object") {
    return candidate !== null && typeof candidate === "object" && !Array.isArray(candidate) &&
      Object.keys(shape).every(key => contentMatchesShape(candidate[key], shape[key]));
  }
  return typeof candidate === typeof shape;
}

function ensureSchema(sql) {
  if (!schemaPromise) {
    schemaPromise = sql.transaction([
      sql`SELECT pg_advisory_xact_lock(1870030194, 1)`,
      sql`CREATE TABLE IF NOT EXISTS portfolio_content (
        id SMALLINT PRIMARY KEY CHECK (id = 1),
        content JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      sql`CREATE TABLE IF NOT EXISTS contact_messages (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        is_read BOOLEAN NOT NULL DEFAULT FALSE
      )`,
      sql`CREATE INDEX IF NOT EXISTS contact_messages_created_at_idx ON contact_messages (created_at DESC)`,
      sql`CREATE TABLE IF NOT EXISTS admin_login_attempts (
        id BIGSERIAL PRIMARY KEY,
        address_hash TEXT NOT NULL,
        attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      sql`CREATE INDEX IF NOT EXISTS admin_login_attempts_window_idx ON admin_login_attempts (address_hash, attempted_at DESC)`
    ]).catch(error => {
      schemaPromise = undefined;
      throw error;
    });
  }
  return schemaPromise;
}

function loginAddressHash(req) {
  const forwarded = req.headers["x-forwarded-for"];
  const address = (typeof forwarded === "string" ? forwarded.split(",")[0] : "") ||
    req.headers["x-real-ip"] || "unknown";
  return createHmac("sha256", secret()).update(String(address)).digest("hex");
}

async function handleLogin(req, res, sql) {
  if (!sameOrigin(req)) return send(res, 403, { error: "Request origin was not accepted." });
  const password = process.env.ADMIN_PASSWORD;
  if (!password || password.length < 16) {
    return send(res, 503, { error: "Admin sign-in requires a private ADMIN_PASSWORD of at least 16 characters in Vercel." });
  }

  const { username, password: submittedPassword } = bodyOf(req);
  if (typeof username !== "string" || typeof submittedPassword !== "string" ||
      username.trim().toLowerCase() !== ADMIN_EMAIL || submittedPassword.length > 1024) {
    return send(res, 401, { error: "The admin ID or password is incorrect." });
  }

  const addressHash = loginAddressHash(req);
  await sql`DELETE FROM admin_login_attempts WHERE attempted_at < NOW() - INTERVAL '1 day'`;
  const recent = await sql`SELECT COUNT(*)::int AS attempts FROM admin_login_attempts
    WHERE address_hash = ${addressHash} AND attempted_at > NOW() - INTERVAL '15 minutes'`;
  if (recent[0].attempts >= 5) return send(res, 429, { error: "Too many sign-in attempts. Try again in 15 minutes." });

  const submittedHash = createHmac("sha256", secret()).update(submittedPassword).digest();
  const expectedHash = createHmac("sha256", secret()).update(password).digest();
  const valid = timingSafeEqual(submittedHash, expectedHash);
  if (!valid) {
    await sql`INSERT INTO admin_login_attempts (address_hash) VALUES (${addressHash})`;
    return send(res, 401, { error: "The admin ID or password is incorrect." });
  }

  await sql`DELETE FROM admin_login_attempts WHERE address_hash = ${addressHash}`;
  setCookie(res, sign({ email: ADMIN_EMAIL, exp: Date.now() + SESSION_SECONDS * 1000 }), SESSION_SECONDS);
  return send(res, 200, { authenticated: true, email: ADMIN_EMAIL });
}

async function handleRequest(req, res) {
  const route = new URL(req.url, `https://${req.headers.host || "localhost"}`).pathname.replace(/^\/api\/?/, "");
  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.status(204).end();
    return;
  }

  if ((route.startsWith("auth/") || route.startsWith("admin/")) &&
      (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32)) {
    return send(res, 503, { error: "Admin sign-in is not configured. Set a private SESSION_SECRET of at least 32 characters in Vercel." });
  }

  if (route === "auth/session" && req.method === "GET") {
    const session = verifySession(req);
    return send(res, 200, session
      ? { authenticated: true, email: session.email }
      : { authenticated: false });
  }

  const sql = getDatabase();
  await ensureSchema(sql);

  if (route === "content" && req.method === "GET") {
    const result = await sql`SELECT content FROM portfolio_content WHERE id = 1`;
    return send(res, 200, { content: result[0]?.content || defaults });
  }

  if (route === "contact" && req.method === "POST") {
    if (!sameOrigin(req)) return send(res, 403, { error: "Request origin was not accepted." });
    const { email, message } = bodyOf(req);
    if (typeof email !== "string" || email.length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
        typeof message !== "string" || !message.trim() || message.length > MAX_MESSAGE_LENGTH) {
      return send(res, 400, { error: "Enter a valid email address and a message of no more than 10,000 characters." });
    }
    await sql`INSERT INTO contact_messages (id, email, message)
      VALUES (${randomUUID()}, ${email.trim()}, ${message.trim()})`;
    return send(res, 201, { saved: true });
  }

  if (route === "auth/login" && req.method === "POST") {
    if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
      return send(res, 503, { error: "Admin sign-in is not configured. Set a private SESSION_SECRET of at least 32 characters in Vercel." });
    }
    return handleLogin(req, res, sql);
  }

  if (route === "auth/logout" && req.method === "POST") {
    if (!sameOrigin(req)) return send(res, 403, { error: "Request origin was not accepted." });
    setCookie(res, "", 0);
    return send(res, 200, { authenticated: false });
  }

  if (route === "admin/content" && req.method === "PUT") {
    if (!sameOrigin(req)) return send(res, 403, { error: "Request origin was not accepted." });
    if (!verifySession(req)) return send(res, 401, { error: "Sign in to update portfolio content." });
    const { content } = bodyOf(req);
    const serialized = JSON.stringify(content);
    if (!content || typeof content !== "object" || !contentMatchesShape(content, defaults) ||
        Buffer.byteLength(serialized) > MAX_CONTENT_BYTES) {
      return send(res, 400, { error: "Portfolio content is invalid or exceeds the 1 MB limit." });
    }
    await sql`INSERT INTO portfolio_content (id, content, updated_at)
      VALUES (1, ${serialized}::jsonb, NOW())
      ON CONFLICT (id) DO UPDATE SET content = EXCLUDED.content, updated_at = NOW()`;
    return send(res, 200, { saved: true });
  }

  if (route === "admin/messages" && req.method === "GET") {
    if (!verifySession(req)) return send(res, 401, { error: "Sign in to view contact messages." });
    const result = await sql`SELECT id, email, message, created_at AS "createdAt", is_read AS "read"
      FROM contact_messages ORDER BY created_at DESC`;
    return send(res, 200, { messages: result });
  }

  const messageMatch = route.match(/^admin\/messages\/([0-9a-f-]{36})$/i);
  if (messageMatch && (req.method === "PATCH" || req.method === "DELETE")) {
    if (!sameOrigin(req)) return send(res, 403, { error: "Request origin was not accepted." });
    if (!verifySession(req)) return send(res, 401, { error: "Sign in to manage contact messages." });
    const id = messageMatch[1];
    if (req.method === "DELETE") {
      const result = await sql`DELETE FROM contact_messages WHERE id = ${id} RETURNING id`;
      if (result.length === 0) return send(res, 404, { error: "Message was not found." });
      return send(res, 200, { deleted: true });
    }
    const { read } = bodyOf(req);
    if (typeof read !== "boolean") return send(res, 400, { error: "A read status is required." });
    const result = await sql`UPDATE contact_messages SET is_read = ${read} WHERE id = ${id} RETURNING id`;
    if (result.length === 0) return send(res, 404, { error: "Message was not found." });
    return send(res, 200, { updated: true });
  }

  res.setHeader("Allow", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  return send(res, 404, { error: "API route not found." });
}

module.exports = async (req, res) => {
  try {
    await handleRequest(req, res);
  } catch (error) {
    console.error("Portfolio API request failed:", error);
    if (!res.headersSent) send(res, 500, { error: "The request could not be completed. Check the Vercel function logs." });
    else res.end();
  }
};
