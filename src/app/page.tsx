import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "./actions";
import { createClient } from "@/lib/supabase/server";
export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const [{ data: profile }, { data: clubs }] = await Promise.all([
    supabase.from("profiles").select("nickname,onboarding_completed,role").eq("id", user.id).single(),
    supabase.from("clubs").select("id,category,topic_sentence,description,status,cycles(sequence,starts_at,ends_at),posts(count)").in("status", ["ACTIVE", "COMPLETED"]).order("created_at", { ascending: false }),
  ]);
  if (!profile?.onboarding_completed) redirect("/onboarding");
  return <main><header className="shell header"><div className="brand">시라</div><div className="header-actions">{profile.role === "ADMIN" && <Link href="/admin/clubs">클럽 관리</Link>}<form action={signOut}><button className="logout">로그아웃</button></form></div></header><section className="shell hero"><span className="eyebrow">SIRA WRITING</span><h1>글쓰기로 돌보는<br />우리의 균형</h1><p>{profile.nickname}님, 오늘은 어떤 이야기를 쓰고 싶나요?</p></section><section className="shell home-clubs"><div className="section-title"><h2>글쓰기 클럽</h2><span>{clubs?.length ?? 0}개</span></div>{(clubs ?? []).length === 0 ? <div className="empty"><strong>클럽을 준비하고 있어요.</strong><p>관리자가 첫 번째 글쓰기 주제를 열면 이곳에서 만날 수 있어요.</p></div> : <div className="home-club-grid">{(clubs ?? []).map(club => { const cycle = Array.isArray(club.cycles) ? club.cycles[0] : club.cycles; const count = Array.isArray(club.posts) ? club.posts[0]?.count ?? 0 : 0; return <Link className="home-club-card" href={`/clubs/${club.id}`} key={club.id}><div className="club-meta">{cycle?.sequence}기 · {club.category}</div><h3>{club.topic_sentence}</h3><p>{club.description}</p><div className="card-foot"><span>{club.status === "ACTIVE" ? "글쓰기 진행 중" : "지난 클럽"}</span><span>글 {count}편</span></div></Link>; })}</div>}</section></main>;
}
