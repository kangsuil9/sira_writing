import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { signOut } from "@/app/actions";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const supabase = await createClient();
  const user = await getCurrentUser(supabase);
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("nickname,avatar_url,onboarding_completed")
    .eq("id", user.id)
    .single();

  if (!profile?.onboarding_completed) redirect("/onboarding");

  return (
    <main>
      <section className="shell profile-settings-head">
        <Link href="/my">← 나의 글</Link>
        <h1>프로필 변경</h1>
        <p>시라에서 사용할 사진과 닉네임을 변경할 수 있어요.</p>
      </section>

      <section className="shell profile-settings-body">
        <ProfileForm
          userId={user.id}
          nickname={profile.nickname}
          avatarUrl={profile.avatar_url}
        />

        <form className="profile-logout" action={signOut}>
          <button type="submit">로그아웃</button>
        </form>
      </section>
    </main>
  );
}
