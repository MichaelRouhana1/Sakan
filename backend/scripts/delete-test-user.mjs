import "dotenv/config";
import postgres from "postgres";

const email = (process.argv[2] || "tonyrouhana02@gmail.com").toLowerCase();
const sql = postgres(process.env.DATABASE_URL, { max: 1 });

const users = await sql`
  SELECT id, email FROM users WHERE email = ${email}
`;
console.log("users found:", users);

if (users.length) {
  await sql`DELETE FROM users WHERE email = ${email}`;
  console.log("deleted user", email);
}

const challenges = await sql`
  DELETE FROM email_registration_challenges
  WHERE email = ${email}
  RETURNING id
`;
console.log("deleted challenges:", challenges.length);

await sql.end();
console.log("done");
