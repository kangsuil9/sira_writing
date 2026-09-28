import { redirect } from "next/navigation";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { proposalsEnabled } from "@/lib/features";
import { ProposalForm } from "./proposal-form";

export default async function ProposalsPage() {
  const supabase = await createClient();
  const user = await getCurrentUser(supabase);
  if (!user) redirect("/login");

  const { data: proposals } = await supabase
    .from("clubs")
    .select("id,topic_sentence,description,status,starts_at,ends_at,created_at")
    .eq("origin_type", "PROPOSAL")
    .eq("proposed_by", user.id)
    .order("created_at", { ascending: false });
  const pending = (proposals ?? []).filter((proposal) => proposal.status === "DRAFT");
  const selected = (proposals ?? []).filter((proposal) => ["ACTIVE", "COMPLETED", "HIDDEN"].includes(proposal.status));
  const notSelected = (proposals ?? []).filter((proposal) => proposal.status === "NOT_SELECTED");

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
        <ProposalGroup label="내 제안" title="선정 대기 중" proposals={pending} empty="선정 대기 중인 제안이 없어요." />
        <ProposalGroup label="내 제안" title="선정됨" proposals={selected} empty="아직 선정된 제안이 없어요." />
        {notSelected.length > 0 && <ProposalGroup label="지난 결과" title="선정되지 않음" proposals={notSelected} empty="" />}
      </section>
    </main>
  );
}

type Proposal = {
  id: string;
  topic_sentence: string;
  description: string;
  status: string;
  starts_at: string;
  ends_at: string;
};

function ProposalGroup({ label, title, proposals, empty }: { label: string; title: string; proposals: Proposal[]; empty: string }) {
  return (
    <article>
      <span>{label}</span>
      <h2>{title}</h2>
      {proposals.length === 0 ? <strong>{empty}</strong> : (
        <div className="my-proposal-list">
          {proposals.map((proposal) => (
            <div className="my-proposal" key={proposal.id}>
              <div><b>{proposal.topic_sentence}</b><span>{proposal.status === "COMPLETED" ? "종료" : proposal.status === "HIDDEN" ? "비공개" : title}</span></div>
              <p>{proposal.description}</p>
              <small>{formatDate(proposal.starts_at)} – {formatDate(proposal.ends_at)}</small>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}
