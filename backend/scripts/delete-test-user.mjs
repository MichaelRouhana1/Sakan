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

await sql.end();
console.log("done");
