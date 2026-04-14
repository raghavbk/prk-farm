import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env.local manually
const envPath = resolve(process.cwd(), ".env.local");
const envContent = readFileSync(envPath, "utf-8");
const env: Record<string, string> = {};
for (const line of envContent.split("\n")) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function seedAdmin() {
  const email = "admin@farmledger.com";
  const password = "admin123";
  const name = "Farm Admin";

  console.log(`Creating admin: ${email}`);
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name, display_name: name, email },
  });

  if (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }

  console.log("User created:", data.user.id);

  // Ensure profile exists
  await supabase.from("profiles").upsert({ id: data.user.id, display_name: name, email });
  console.log("Profile created");

  console.log("\n  Email:    " + email);
  console.log("  Password: " + password);
  console.log("\nReady to log in.");
}

seedAdmin();
