import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { ProposalReviewForm } from "../admin-forms";

export default async function AdminClubProposalsPage() {
  const supabase = await createClient();
  const user = await getCurrentUser(supabase);
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "ADMIN") redirect("/");

  const { data: proposals } = await supabase
    .from("clubs")
    .select("id,topic_sentence,description,starts_at,ends_at,created_at,profiles:profiles!clubs_proposed_by_fkey(nickname)")
    .eq("origin_type", "PROPOSAL")
    .eq("status", "DRAFT")
    .order("created_at", { ascending: false });

  return (
    <main>
      <header className="shell header">
        <Link className="brand" href="/">시라</Link>
        <div className="header-actions"><Link href="/admin/clubs">클럽 관리</Link><Link href="/">홈으로</Link></div>
      </header>
      <section className="shell admin-head">
        <span className="eyebrow">ADMIN</span>
        <h1>선정 대기 글쓰기 클럽</h1>
        <p>회원이 제안한 주제를 최신순으로 확인하고 글쓰기 클럽으로 선정합니다.</p>
      </section>
      <section className="shell club-admin-list proposal-admin-all">
        {(proposals ?? []).length === 0 ? <p className="empty">선정 대기 중인 클럽이 없어요.</p> : (
          <div className="club-cards">
            {(proposals ?? []).map((proposal) => {
              const proposer = Array.isArray(proposal.profiles) ? proposal.profiles[0] : proposal.profiles;
              return (
                <article className="club-card proposal-card" key={proposal.id}>
                  <div><span>{proposer?.nickname ?? "회원"}님의 제안</span><span className="status">선정 대기 중</span></div>
                  <h3>{proposal.topic_sentence}</h3>
                  <p>{proposal.description}</p>
                  <p className="admin-period">{formatDate(proposal.starts_at)} – {formatDate(proposal.ends_at)}</p>
                  <ProposalReviewForm clubId={proposal.id} />
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
