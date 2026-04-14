/**
 * Bootstrap the first admin user.
 *
 * This is the only seed needed — all other users are invited
 * from the Admin page inside the app.
 *
 * Usage: npx tsx scripts/seed.ts
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env.local");
const envContent = readFileSync(envPath, "utf-8");
const env: Record<string, string> = {};
for (const line of envContent.split("\n")) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
}

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function seed() {
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
    if (error.message.includes("already been registered")) {
      console.log("Already exists — skipping.\n");
    } else {
      console.error("Error:", error.message);
      process.exit(1);
    }
  } else {
    await supabase.from("profiles").upsert({ id: data.user.id, display_name: name, email });
    console.log("Created:", data.user.id, "\n");
  }

  console.log("  Email:    admin@farmledger.com");
  console.log("  Password: admin123");
  console.log("\nLog in, create a tenant, then invite others from /admin.");
}

seed();
