"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

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
