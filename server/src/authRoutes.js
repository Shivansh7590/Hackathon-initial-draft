import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createUser, findUserByEmail, getUserById } from "./userStore.js";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || "dev-insecure-change-in-production";
const SALT_ROUNDS = 10;
const MIN_PASSWORD = 8;

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

function publicUser(row) {
  return { id: row.id, name: row.name, email: row.email };
}

function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
}

function authMiddleware(req, res, next) {
  const h = req.headers.authorization;
  const token = h?.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) {
    res.status(401).json({ message: "Not signed in." });
    return;
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.auth = { userId: payload.sub, email: payload.email };
    next();
  } catch {
    res.status(401).json({ message: "Session expired. Please sign in again." });
  }
}

router.post("/register", async (req, res) => {
  const name = String(req.body?.name || "").trim();
  const email = String(req.body?.email || "").trim();
  const password = String(req.body?.password || "");
  const confirmPassword = String(req.body?.confirmPassword || "");

  if (!name) {
    return res.status(400).json({ message: "Name is required." });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ message: "Please enter a valid email address." });
  }
  if (password.length < MIN_PASSWORD) {
    return res.status(400).json({ message: `Password must be at least ${MIN_PASSWORD} characters.` });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ message: "Password and confirm password do not match." });
  }

  const existing = await findUserByEmail(email);
  if (existing) {
    return res.status(409).json({ message: "An account with this email already exists." });
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const created = await createUser({ name, email, passwordHash });
  if (!created.ok) {
    return res.status(409).json({ message: "An account with this email already exists." });
  }

  const user = publicUser(created.user);
  const token = signToken(created.user);
  return res.status(201).json({ token, user });
});

router.post("/login", async (req, res) => {
  const email = String(req.body?.email || "").trim();
  const password = String(req.body?.password || "");

  if (!isValidEmail(email)) {
    return res.status(400).json({ message: "Please enter a valid email address." });
  }
  if (!password) {
    return res.status(400).json({ message: "Password is required." });
  }

  const row = await findUserByEmail(email);
  if (!row) {
    return res.status(401).json({ message: "Invalid email or password." });
  }
  const match = await bcrypt.compare(password, row.passwordHash);
  if (!match) {
    return res.status(401).json({ message: "Invalid email or password." });
  }

  const user = publicUser(row);
  const token = signToken(row);
  return res.json({ token, user });
});

router.get("/me", authMiddleware, async (req, res) => {
  const row = await getUserById(req.auth.userId);
  if (!row) {
    return res.status(401).json({ message: "Account not found." });
  }
  return res.json({ user: publicUser(row) });
});

export default router;
export { authMiddleware };
