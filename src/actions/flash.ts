"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

// Server action paired with the session-switch banner. The banner reads
// `flash_prev_user_email` in the protected layout; when the user clicks
// "Got it", we call this to clear the cookie and re-render so the banner
// disappears.
export async function dismissSessionSwitchFlash() {
  const store = await cookies();
  store.set("flash_prev_user_email", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  revalidatePath("/");
}
