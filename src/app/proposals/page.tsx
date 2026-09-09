import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function ProposalsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <main>
      <section className="shell proposal-hero">
        <span className="eyebrow">NEXT WRITING</span>
        <h1>
          다음 글쓰기를
          <br />
          함께 제안하는 곳
        </h1>
        <p>
          혼자 생각해온 질문이 있나요?
          <br />
          함께 고민하고 써보고 싶은 주제를 제안해보세요.
        </p>
        <button type="button" disabled>
          주제 제안하기 · 준비 중
        </button>
      </section>

      <section className="shell proposal-sections">
        <article>
          <span>참여 모집</span>
          <h2>다음 기수의 주제를 고르는 공간</h2>
          <p>후보 주제가 공개되면 참여를 신청하거나 취소할 수 있어요.</p>
          <strong>아직 참여 모집 중인 주제가 없어요.</strong>
        </article>
        <article>
          <span>내 제안</span>
          <h2>내가 던진 질문의 다음 과정</h2>
          <p>
            제안한 주제가 모집 중인지, 클럽으로 확정됐는지 이곳에서
            확인할 수 있어요.
          </p>
          <strong>주제 제안 기능을 준비하고 있어요.</strong>
        </article>
      </section>
    </main>
  );
}
