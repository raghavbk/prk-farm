import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing env vars. Run:");
  console.error("  source .env.local && npm run seed:admin");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function seedAdmin() {
  const email = "admin@farmledger.com";
  const password = "admin123";
  const name = "Farm Admin";

  // Delete existing user if any (clean slate)
  const { data: existing } = await supabase.auth.admin.listUsers();
  const oldUser = existing?.users?.find((u) => u.email === email);
  if (oldUser) {
    console.log("Removing existing user...");
    await supabase.auth.admin.deleteUser(oldUser.id);
    await supabase.from("profiles").delete().eq("id", oldUser.id);
  }

  // Create user — email verified, password set
  console.log(`Creating admin: ${email}`);
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // marks email as verified
    user_metadata: {
      full_name: name,
      display_name: name,
      email,
    },
  });

  if (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }

  console.log("User created:", data.user.id);

  // Ensure profile exists
  await supabase.from("profiles").upsert({
    id: data.user.id,
    display_name: name,
    email,
  });

  console.log("Profile created");
  console.log("\n  Email:    " + email);
  console.log("  Password: " + password);
  console.log("\nReady to log in.");
}

seedAdmin();
