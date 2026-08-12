/**
 * Full registration E2E against live Resend.
 * Recipient must be the Resend account email (tonyrouhana02@gmail.com).
 *
 * Reads the verification code from Resend's Retrieve Email API (not logged).
 */
import "dotenv/config";

const API = "http://localhost:3001";
const email = process.argv[2] || "tonyrouhana02@gmail.com";
const password = "Str0ng!Passw0rd#99x";
const key = process.env.RESEND_API_KEY;

if (!key) {
  console.error("RESEND_API_KEY missing");
  process.exit(1);
}

async function api(pathname, body) {
  const res = await fetch(`${API}${pathname}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

async function getResendEmail(id) {
  const res = await fetch(`https://api.resend.com/emails/${id}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Resend get email failed: ${JSON.stringify(json)}`);
  return json;
}

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log("1) request-code →", email);
  const req = await api("/api/users/registration/request-code", { email });
  console.log("   status", req.status, "delivery", req.json?.data?.deliveryMode);
  if (req.status !== 200 || req.json?.data?.deliveryMode !== "resend") {
    throw new Error(`Expected resend delivery, got ${JSON.stringify(req.json)}`);
  }

  // Find latest sent email to this address via Resend list (last few seconds)
  await sleep(1500);
  const listRes = await fetch("https://api.resend.com/emails", {
    headers: { Authorization: `Bearer ${key}` },
  });
  const listJson = await listRes.json();
  if (!listRes.ok) throw new Error(`Resend list failed: ${JSON.stringify(listJson)}`);

  const items = listJson.data || listJson;
  const latest = (Array.isArray(items) ? items : []).find((e) => {
    const to = Array.isArray(e.to) ? e.to.join(",") : String(e.to || "");
    return (
      to.includes(email) &&
      String(e.subject || "").includes("verification code")
    );
  });

  if (!latest?.id) {
    throw new Error("Could not find verification email in Resend list");
  }

  const full = await getResendEmail(latest.id);
  const bodyText = `${full.text || ""}\n${full.html || ""}`;
  const codeMatch = bodyText.match(/\b(\d{6})\b/);
  if (!codeMatch) throw new Error("Could not extract 6-digit code from Resend email body");
  const code = codeMatch[1];
  console.log("2) code retrieved from Resend API (not printed)");

  console.log("3) verify-code");
  const ver = await api("/api/users/registration/verify-code", { email, code });
  console.log("   status", ver.status, "hasToken", Boolean(ver.json?.data?.completionToken));
  if (ver.status !== 200) throw new Error(JSON.stringify(ver.json));
  const token = ver.json.data.completionToken;

  console.log("4) complete registration");
  const done = await api("/api/users/registration/complete", {
    completionToken: token,
    firstName: "Tony",
    lastName: "Test",
    dateOfBirth: "2000-05-15",
    password,
    confirmPassword: password,
  });
  // 201 new user, or 409 if already registered from prior run
  console.log("   status", done.status, "email", done.json?.data?.email || done.json?.error?.code);
  if (done.status !== 201 && done.status !== 409) {
    throw new Error(JSON.stringify(done.json));
  }

  if (done.status === 201) {
    console.log("5) login");
    const login = await api("/api/users/login", { email, password });
    console.log("   status", login.status, "userId", login.json?.data?.id);
    if (login.status !== 200) throw new Error(JSON.stringify(login.json));
  } else {
    console.log("5) account already existed — verifying login with known password may fail if different");
  }

  console.log("\nALL CHECKS PASSED — Resend delivery + registration flow OK");
}

main().catch((e) => {
  console.error("FAIL", e.message || e);
  process.exit(1);
});
