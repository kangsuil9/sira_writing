import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ClubForm, CycleForm } from "./admin-forms";
export default async function AdminClubsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "ADMIN") redirect("/");
  const [{ data: cycles }, { data: clubs }] = await Promise.all([
    supabase.from("cycles").select("id,sequence,starts_at,ends_at").order("sequence", { ascending: false }),
    supabase.from("clubs").select("id,category,topic_sentence,description,status,created_at,cycles(sequence)").order("created_at", { ascending: false }),
  ]);
  const cycleOptions = (cycles ?? []).map(c => ({ id: c.id, sequence: c.sequence }));
  return <main><header className="shell header"><Link className="brand" href="/">시라</Link><Link href="/">홈으로</Link></header><section className="shell admin-head"><span className="eyebrow">ADMIN</span><h1>클럽 관리</h1><p>기수를 만들고, 모든 회원에게 열리는 글쓰기 클럽을 개설합니다.</p></section><section className="shell admin-grid"><CycleForm nextSequence={(cycles?.[0]?.sequence ?? 0) + 1} /><ClubForm cycles={cycleOptions} /></section><section className="shell club-admin-list"><h2>개설된 클럽</h2>{(clubs ?? []).length === 0 ? <p className="empty">아직 개설된 클럽이 없어요.</p> : <div className="club-cards">{(clubs ?? []).map(club => { const cycle = Array.isArray(club.cycles) ? club.cycles[0] : club.cycles; return <article className="club-card" key={club.id}><div><span>{cycle?.sequence ?? "-"}기 · {club.category}</span><span className={club.status === "ACTIVE" ? "status active" : "status"}>{club.status === "ACTIVE" ? "활동 중" : "초안"}</span></div><h3>{club.topic_sentence}</h3><p>{club.description}</p></article>; })}</div>}</section></main>;
}
