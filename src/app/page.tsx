import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "./actions";
import { createClient } from "@/lib/supabase/server";
export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("nickname,onboarding_completed,role").eq("id", user.id).single();
  if (!profile?.onboarding_completed) redirect("/onboarding");
  return <main><header className="shell header"><div className="brand">시라</div><div className="header-actions">{profile.role === "ADMIN" && <Link href="/admin/clubs">클럽 관리</Link>}<form action={signOut}><button className="logout">로그아웃</button></form></div></header><section className="shell hero"><span className="eyebrow">SIRA WRITING</span><h1>글쓰기로 돌보는<br />우리의 균형</h1><p>{profile.nickname}님, 반가워요.<br />곧 첫 번째 글쓰기 클럽이 이곳에서 시작됩니다.</p></section><section className="shell empty"><strong>클럽을 준비하고 있어요</strong><p>관리자가 개설한 클럽은 모든 회원이 읽고 자유롭게 글을 쓸 수 있습니다.</p></section></main>;
}
