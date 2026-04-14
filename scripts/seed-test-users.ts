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

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const users = [
  { email: "alice@test.com", password: "password123", name: "Alice Sharma" },
  { email: "bob@test.com", password: "password123", name: "Bob Patel" },
];

async function seed() {
  for (const u of users) {
    console.log(`Creating: ${u.name} (${u.email})`);

    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { full_name: u.name, display_name: u.name, email: u.email },
    });

    if (error) {
      if (error.message.includes("already been registered")) {
        console.log("  Already exists — skipping");
      } else {
        console.error("  Error:", error.message);
      }
      continue;
    }

    await supabase.from("profiles").upsert({ id: data.user.id, display_name: u.name, email: u.email });
    console.log("  Created:", data.user.id);
  }

  console.log("\nTest users ready:");
  console.log("  alice@test.com / password123");
  console.log("  bob@test.com   / password123");
}

seed();
