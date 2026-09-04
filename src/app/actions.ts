"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
export async function signOut() { const supabase = await createClient(); await supabase.auth.signOut(); redirect("/login"); }
export async function saveNickname(_: { error?: string }, formData: FormData) {
  const nickname = String(formData.get("nickname") ?? "").trim();
  if (!/^[가-힣a-zA-Z0-9_]{2,20}$/.test(nickname)) return { error: "2~20자의 한글, 영문, 숫자, 밑줄만 사용할 수 있어요." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { error } = await supabase.from("profiles").update({ nickname, onboarding_completed: true }).eq("id", user.id);
  if (error?.code === "23505") return { error: "이미 사용 중인 닉네임이에요." };
  if (error) return { error: "저장하지 못했어요. 잠시 후 다시 시도해 주세요." };
  revalidatePath("/"); redirect("/");
}
