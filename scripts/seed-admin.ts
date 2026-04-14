import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  console.error("Run: source .env.local && npx tsx scripts/seed-admin.ts");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function seedAdmin() {
  const email = "admin@farmledger.com";
  const password = "admin123";
  const name = "Farm Admin";

  console.log(`Creating admin user: ${email}`);

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: name,
      display_name: name,
      email,
    },
  });

  if (error) {
    if (error.message.includes("already been registered")) {
      console.log("User already exists — skipping creation");
    } else {
      console.error("Error:", error.message);
      process.exit(1);
    }
  } else {
    console.log("Created user:", data.user.id);
  }

  console.log("\nAdmin user ready:");
  console.log(`  Email:    ${email}`);
  console.log(`  Password: ${password}`);
}

seedAdmin();
