import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const API = "http://localhost:3001";
const email = `regtest_${Date.now()}@example.com`;
const password = "Str0ng!Passw0rd#99";

async function req(pathname, body) {
  const res = await fetch(`${API}${pathname}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

function extractCode(text) {
  const m = text.match(/\b(\d{6})\b/);
  return m?.[1] ?? null;
}

async function latestOutboxCode(toEmail) {
  const dir = path.join(process.cwd(), ".email-outbox");
  const files = (await readdir(dir)).sort();
  for (let i = files.length - 1; i >= 0; i--) {
    const content = await readFile(path.join(dir, files[i]), "utf8");
    if (content.includes(`To: ${toEmail}`)) {
      return extractCode(content);
    }
  }
  return null;
}

async function main() {
  console.log("1) invalid email");
  let r = await req("/api/users/registration/request-code", { email: "bad" });
  console.log(r.status, r.json?.error?.message);

  console.log("2) request code");
  r = await req("/api/users/registration/request-code", { email });
  console.log(r.status, r.json?.data);

  const code = await latestOutboxCode(email.toLowerCase());
  console.log("3) outbox code found?", Boolean(code));

  console.log("4) wrong code");
  r = await req("/api/users/registration/verify-code", {
    email,
    code: "000000",
  });
  console.log(r.status, r.json?.error?.message);

  console.log("5) verify code");
  r = await req("/api/users/registration/verify-code", { email, code });
  console.log(r.status, Boolean(r.json?.data?.completionToken));
  const token = r.json?.data?.completionToken;

  console.log("6) bypass complete without token");
  r = await req("/api/users/registration/complete", {
    completionToken: "not-a-real-token-xxxxxxxxxxx",
    firstName: "Ada",
    lastName: "Lovelace",
    dateOfBirth: "1990-01-01",
    password,
    confirmPassword: password,
  });
  console.log(r.status, r.json?.error?.code);

  console.log("7) weak password");
  r = await req("/api/users/registration/complete", {
    completionToken: token,
    firstName: "Ada",
    lastName: "Lovelace",
    dateOfBirth: "1990-01-01",
    password: "short",
    confirmPassword: "short",
  });
  console.log(r.status, r.json?.error?.message);

  console.log("8) complete");
  r = await req("/api/users/registration/complete", {
    completionToken: token,
    firstName: "Ada",
    lastName: "Lovelace",
    dateOfBirth: "1990-01-01",
    password,
    confirmPassword: password,
  });
  console.log(r.status, r.json?.data?.email, r.json?.data?.passwordHash);

  console.log("9) duplicate email");
  r = await req("/api/users/registration/request-code", { email });
  console.log(r.status, r.json?.error?.code);

  console.log("10) login");
  r = await req("/api/users/login", { email, password });
  console.log(r.status, r.json?.data?.id);

  console.log("DONE");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
