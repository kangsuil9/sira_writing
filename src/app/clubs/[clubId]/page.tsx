import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isWritingOpen } from "@/lib/clubs";
export default async function ClubPage({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser(); if (!user) redirect("/login");
  const [{ data: profile }, { data: club }, { data: posts }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).single(),
    supabase.from("clubs").select("id,category,topic_sentence,description,status,cycles(sequence,starts_at,ends_at)").eq("id", clubId).single(),
    supabase.from("posts").select("id,title,published_at,updated_at,author_id,profiles:profiles!posts_author_id_fkey(nickname)").eq("club_id", clubId).order("published_at", { ascending: false }),
  ]);
  if (!club || (club.status === "DRAFT" && profile?.role !== "ADMIN")) notFound();
  const cycle = Array.isArray(club.cycles) ? club.cycles[0] : club.cycles;
  const active = isWritingOpen(club.status, cycle?.starts_at, cycle?.ends_at);
  return <main><header className="shell header"><Link className="brand" href="/">시라</Link><Link href="/">클럽 목록</Link></header><section className="shell club-hero"><div className="club-meta">{cycle?.sequence}기 · {club.category} · {active ? "활동 중" : "종료"}</div><h1>{club.topic_sentence}</h1><p>{club.description}</p><div className="period">{formatDate(cycle?.starts_at)} – {formatDate(cycle?.ends_at)}</div>{active ? <Link className="primary-link" href={`/clubs/${club.id}/write`}>이 주제로 글쓰기</Link> : <p className="closed-note">활동이 종료되어 지난 글만 읽을 수 있어요.</p>}</section><section className="shell post-list"><div className="section-title"><h2>클럽의 글</h2><span>{posts?.length ?? 0}편</span></div>{(posts ?? []).length === 0 ? <div className="empty"><strong>아직 첫 글을 기다리고 있어요.</strong><p>이 주제에서 떠오른 생각을 가장 먼저 남겨보세요.</p></div> : <div className="post-cards">{(posts ?? []).map(post => { const author = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles; return <Link className="post-card" href={`/posts/${post.id}`} key={post.id}><h3>{post.title}</h3><div>{author?.nickname ?? "알 수 없는 회원"} · {formatDate(post.published_at)}</div></Link>; })}</div>}</section></main>;
}
function formatDate(value?: string) { return value ? new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "short", day: "numeric", timeZone: "Asia/Seoul" }).format(new Date(value)) : ""; }
