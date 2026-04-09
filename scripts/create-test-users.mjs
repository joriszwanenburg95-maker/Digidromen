/**
 * Script om test users aan te maken in Supabase Auth.
 * Vereist: SUPABASE_SERVICE_ROLE_KEY als environment variable.
 *
 * Gebruik:
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/create-test-users.mjs
 */

const SUPABASE_URL = "https://oyxcwfozoxlgdclchden.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error("Stel SUPABASE_SERVICE_ROLE_KEY in als environment variable.");
  process.exit(1);
}

const TEST_USERS = [
  {
    email: "testuserserviceorganisatie@digidromen.test",
    password: "test123",
    expectedUuid: "00000000-0000-0000-0000-000000000001",
    label: "Service Partner (Aces Direct)",
  },
  {
    email: "testuserhulporganisatie@digidromen.test",
    password: "test123",
    expectedUuid: "00000000-0000-0000-0000-000000000002",
    label: "Hulporganisatie (Gemeente Test)",
  },
];

async function createUser({ email, password, expectedUuid, label }) {
  // Check if user already exists
  const listRes = await fetch(
    `${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=50`,
    {
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        apikey: SERVICE_ROLE_KEY,
      },
    }
  );
  const listData = await listRes.json();
  const existing = listData.users?.find((u) => u.email === email);

  if (existing) {
    console.log(`[${label}] User bestaat al: ${existing.id}`);
    // Update user_profiles auth_user_id if needed
    await updateProfile(email, existing.id);
    return existing.id;
  }

  // Create user with specific UUID
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      apikey: SERVICE_ROLE_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`[${label}] Fout bij aanmaken: ${err}`);
    return null;
  }

  const data = await res.json();
  console.log(`[${label}] Aangemaakt: ${data.id}`);

  // Update user_profiles with actual auth_user_id
  await updateProfile(email, data.id);
  return data.id;
}

async function updateProfile(email, authUserId) {
  // Use PostgREST to update user_profiles
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/user_profiles?email=eq.${encodeURIComponent(email)}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        apikey: SERVICE_ROLE_KEY,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ auth_user_id: authUserId }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    console.error(`  Profile update mislukt voor ${email}: ${err}`);
  } else {
    console.log(`  Profile auth_user_id bijgewerkt voor ${email}`);
  }
}

async function main() {
  console.log("Test users aanmaken...\n");

  for (const user of TEST_USERS) {
    await createUser(user);
    console.log("");
  }

  console.log("Klaar! Je kunt nu inloggen met:");
  console.log("  Service Partner: testuserserviceorganisatie@digidromen.test / test123");
  console.log("  Hulporganisatie: testuserhulporganisatie@digidromen.test / test123");
}

main().catch(console.error);
