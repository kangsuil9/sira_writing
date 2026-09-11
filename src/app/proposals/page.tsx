import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { proposalsEnabled } from "@/lib/features";
import { ProposalForm } from "./proposal-form";

export default async function ProposalsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: proposals } = await supabase
    .from("clubs")
    .select("id,topic_sentence,description,status,starts_at,ends_at,created_at")
    .eq("origin_type", "PROPOSAL")
    .eq("proposed_by", user.id)
    .order("created_at", { ascending: false });

  return (
    <main>
      <section className="shell proposal-hero">
        <h1>다음 글쓰기를 함께 제안하는 곳</h1>
        <p>
          혼자 생각해온 질문이 있나요?
          <br />
          함께 고민하고 써보고 싶은 주제를 제안해보세요.
        </p>
        <ProposalForm enabled={proposalsEnabled} />
      </section>

      <section className="shell proposal-sections">
        <article>
          <span>운영 방식</span>
          <h2>승인되면 모두에게 열리는 글쓰기 클럽</h2>
          <p>관리자가 제안을 확인하고 승인하면 정해진 기간 동안 모든 회원이 자유롭게 글을 쓸 수 있어요.</p>
          <strong>참여 인원과 관계없이 클럽은 시작돼요.</strong>
        </article>
        <article>
          <span>내 제안</span>
          <h2>내가 제안한 글쓰기 주제</h2>
          {(proposals ?? []).length === 0 ? (
            <strong>아직 제안한 주제가 없어요.</strong>
          ) : (
            <div className="my-proposal-list">
              {(proposals ?? []).map((proposal) => (
                <div className="my-proposal" key={proposal.id}>
                  <div>
                    <b>{proposal.topic_sentence}</b>
                    <span>{proposalStatus(proposal.status)}</span>
                  </div>
                  <p>{proposal.description}</p>
                  <small>{formatDate(proposal.starts_at)} – {formatDate(proposal.ends_at)}</small>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
    </main>
  );
}

function proposalStatus(status: string) {
  if (status === "ACTIVE") return "승인";
  if (status === "NOT_SELECTED") return "미승인";
  if (status === "COMPLETED") return "종료";
  return "검토 중";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}
