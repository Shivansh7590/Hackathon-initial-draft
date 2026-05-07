import fs from "fs/promises";
import path from "path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USERS_FILE = path.join(__dirname, "..", "data", "users.json");

async function readAll() {
  try {
    const raw = await fs.readFile(USERS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAll(users) {
  await fs.mkdir(path.dirname(USERS_FILE), { recursive: true });
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), "utf8");
}

export async function findUserByEmail(email) {
  const key = String(email || "").trim().toLowerCase();
  if (!key) return null;
  const users = await readAll();
  return users.find((u) => u.email === key) || null;
}

export async function createUser({ name, email, passwordHash }) {
  const users = await readAll();
  const key = String(email || "").trim().toLowerCase();
  if (users.some((u) => u.email === key)) {
    return { ok: false, error: "EMAIL_TAKEN" };
  }
  const row = {
    id: randomUUID(),
    name: String(name || "").trim(),
    email: key,
    passwordHash,
    createdAt: new Date().toISOString()
  };
  users.push(row);
  await writeAll(users);
  return { ok: true, user: row };
}

export async function getUserById(id) {
  const users = await readAll();
  return users.find((u) => u.id === id) || null;
}
