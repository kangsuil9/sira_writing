import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ClubForm, ClubStatusForm, ProposalReviewForm } from "./admin-forms";

export default async function AdminClubsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "ADMIN") redirect("/");

  const { data: clubs } = await supabase
    .from("clubs")
    .select("id,category,topic_sentence,description,status,origin_type,starts_at,ends_at,created_at,profiles:profiles!clubs_proposed_by_fkey(nickname)")
    .order("created_at", { ascending: false });
  const proposals = (clubs ?? []).filter((club) => club.origin_type === "PROPOSAL" && club.status === "DRAFT");
  const managedClubs = (clubs ?? []).filter((club) => !(club.origin_type === "PROPOSAL" && club.status === "DRAFT"));

  return (
    <main>
      <header className="shell header"><Link className="brand" href="/">시라</Link><Link href="/">홈으로</Link></header>
      <section className="shell admin-head"><span className="eyebrow">ADMIN</span><h1>클럽 관리</h1><p>기간을 정해 모두에게 열리는 글쓰기 클럽을 개설하고 회원 제안을 검토합니다.</p></section>
      <section className="shell admin-grid single"><ClubForm /></section>

      <section className="shell club-admin-list">
        <h2>검토할 주제 제안</h2>
        {proposals.length === 0 ? <p className="empty">검토할 제안이 없어요.</p> : (
          <div className="club-cards">
            {proposals.map((proposal) => {
              const proposer = Array.isArray(proposal.profiles) ? proposal.profiles[0] : proposal.profiles;
              return (
                <article className="club-card proposal-card" key={proposal.id}>
                  <div><span>{proposer?.nickname ?? "회원"}님의 제안</span><span className="status">검토 중</span></div>
                  <h3>{proposal.topic_sentence}</h3><p>{proposal.description}</p>
                  <p className="admin-period">{formatDate(proposal.starts_at)} – {formatDate(proposal.ends_at)}</p>
                  <ProposalReviewForm clubId={proposal.id} />
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="shell club-admin-list">
        <h2>개설된 클럽</h2>
        {managedClubs.length === 0 ? <p className="empty">아직 개설된 클럽이 없어요.</p> : (
          <div className="club-cards">
            {managedClubs.map((club) => {
              const ended = club.status === "COMPLETED" || new Date(club.ends_at) < new Date();
              const label = ended ? "종료" : club.status === "ACTIVE" ? "공개" : club.status === "NOT_SELECTED" ? "미승인" : "초안";
              return (
                <article className="club-card" key={club.id}>
                  <div><span>{club.category} · {club.origin_type === "PROPOSAL" ? "회원 제안" : "관리자 개설"}</span><span className={!ended && club.status === "ACTIVE" ? "status active" : "status"}>{label}</span></div>
                  <h3>{club.topic_sentence}</h3><p>{club.description}</p>
                  <p className="admin-period">{formatDate(club.starts_at)} – {formatDate(club.ends_at)}</p>
                  {club.status !== "NOT_SELECTED" && <ClubStatusForm clubId={club.id} status={ended ? "COMPLETED" : club.status} locked={ended} />}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Seoul" }).format(new Date(value));
}
