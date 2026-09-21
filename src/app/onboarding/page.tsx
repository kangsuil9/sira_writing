import { redirect } from "next/navigation";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { NicknameForm } from "./nickname-form";
export default async function OnboardingPage() {
  const supabase = await createClient();
  const user = await getCurrentUser(supabase);
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("onboarding_completed").eq("id", user.id).single();
  if (profile?.onboarding_completed) redirect("/");
  return <main className="onboarding"><NicknameForm /></main>;
}
