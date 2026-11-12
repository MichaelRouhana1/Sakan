// Local staff sign-in. user_role has no admin value; /api/admin allows this
// account through Clerk publicMetadata.studentlyAdmin. Test Clerk instances only.
export const adminEmail = 'admin+clerk_test@studently.dev';
export const localAdminPassword = 'Studently-admin-1';

function passwordFrom(raw) {
  const custom = raw.SEED_ADMIN_PASSWORD?.trim();
  return custom || localAdminPassword;
}

async function clerk(key, method, path, body) {
  const response = await fetch('https://api.clerk.com/v1' + path, {
    method,
    headers: { authorization: 'Bearer ' + key, 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let parsed = null;
  try { parsed = text ? JSON.parse(text) : null; } catch { parsed = null; }
  if (!response.ok) {
    const message = Array.isArray(parsed?.errors)
      ? parsed.errors.map((entry) => entry.long_message || entry.message).join('; ')
      : response.status + ' ' + response.statusText;
    const error = new Error('Clerk admin seed failed: ' + message);
    error.status = response.status;
    throw error;
  }
  return parsed;
}

async function findClerkUser(key) {
  const listed = await clerk(key, 'GET', '/users?email_address=' + encodeURIComponent(adminEmail));
  const users = Array.isArray(listed) ? listed : listed?.data ?? [];
  return users.find((user) => user.email_addresses?.some((entry) => entry.email_address?.toLowerCase() === adminEmail)) ?? null;
}

export async function ensureClerkAdmin(raw = process.env) {
  const key = raw.CLERK_SECRET_KEY ?? '';
  if (!key || key.includes('xxxxxxxx')) return { clerkId: null, status: 'clerk-unconfigured' };
  if (!key.startsWith('sk_test_')) return { clerkId: null, status: 'refusing non-test Clerk instance' };
  let user = await findClerkUser(key);
  let status = 'linked';
  if (!user) {
    user = await clerk(key, 'POST', '/users', {
      email_address: [adminEmail],
      password: passwordFrom(raw),
      first_name: 'Studently',
      last_name: 'Admin',
      public_metadata: { studentlyAdmin: true },
      skip_password_checks: true,
    });
    status = 'created';
  } else if (user.public_metadata?.studentlyAdmin !== true) {
    await clerk(key, 'PATCH', '/users/' + user.id + '/metadata', {
      public_metadata: { studentlyAdmin: true },
    });
    status = 'marked-admin';
  }
  return { clerkId: user.id, status };
}

export async function seedAdminUser(tx, id, clerkId) {
  await tx.unsafe('CREATE TABLE IF NOT EXISTS studently_ops.housing_seed_manifest(entity text NOT NULL,id uuid NOT NULL,PRIMARY KEY(entity,id))');
  const [emailOwner] = await tx`select id from users where email=${adminEmail}`;
  if (emailOwner && emailOwner.id !== id) throw new Error('Admin email already belongs to another user');
  const [exists] = await tx`select id from users where id=${id}`;
  let created = false;
  if (!exists) {
    const row = {
      id,
      role: 'poster',
      first_name: 'Studently',
      last_name: 'Admin',
      email: adminEmail,
      email_verified_at: new Date(),
      post_credits: 1,
      free_credit_claimed: true,
    };
    if (clerkId) row.clerk_id = clerkId;
    await tx`insert into users ${tx(row, Object.keys(row))}`;
    await tx`insert into studently_ops.housing_seed_manifest(entity,id) values('user',${id}) on conflict do nothing`;
    created = true;
  } else {
    const [owned] = await tx`select id from studently_ops.housing_seed_manifest where entity='user' and id=${id}`;
    if (!owned) throw new Error('Fixture ID collision outside seed manifest: user/' + id);
    if (clerkId) await tx`update users set clerk_id=${clerkId}, updated_at=now() where id=${id} and clerk_id is distinct from ${clerkId}`;
  }
  return { created, clerkLinked: Boolean(clerkId) };
}
