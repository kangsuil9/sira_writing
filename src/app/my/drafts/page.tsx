import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isWritingOpen } from "@/lib/clubs";

export default async function DraftsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: drafts } = await supabase
    .from("post_drafts")
    .select(
      "id,title,body,updated_at,club_id,clubs(topic_sentence,status,cycles(starts_at,ends_at))",
    )
    .eq("author_id", user.id)
    .order("updated_at", { ascending: false });

  return (
    <main>
      <header className="shell header">
        <Link className="brand" href="/">
          시라
        </Link>
        <Link href="/my">마이페이지</Link>
      </header>

      <section className="shell drafts-head">
        <h1>임시저장 글</h1>
        <p>마지막으로 저장된 지점부터 이어서 쓸 수 있어요.</p>
      </section>

      <section className="shell drafts-list">
        {(drafts ?? []).length === 0 ? (
          <div className="empty">
            <strong>임시저장된 글이 없어요.</strong>
            <p>글을 쓰기 시작하면 10초마다 이곳에 자동으로 저장돼요.</p>
          </div>
        ) : (
          (drafts ?? []).map((draft) => {
            const club = Array.isArray(draft.clubs)
              ? draft.clubs[0]
              : draft.clubs;
            const cycle = Array.isArray(club?.cycles)
              ? club.cycles[0]
              : club?.cycles;
            const active = isWritingOpen(
              club?.status ?? "",
              cycle?.starts_at,
              cycle?.ends_at,
            );
            const content = (
              <>
                <div className="draft-card-meta">
                  <span>{club?.topic_sentence}</span>
                  <time dateTime={draft.updated_at}>
                    {formatDateTime(draft.updated_at)} 저장
                  </time>
                </div>
                <h2>{draft.title || "제목 없는 글"}</h2>
                <p>{draft.body || "작성 중인 본문이 아직 없어요."}</p>
                <strong>{active ? "이어서 쓰기" : "활동이 종료된 클럽"}</strong>
              </>
            );

            return active ? (
              <Link
                className="draft-card"
                href={`/clubs/${draft.club_id}/write?draft=${draft.id}`}
                key={draft.id}
              >
                {content}
              </Link>
            ) : (
              <div className="draft-card closed" key={draft.id}>
                {content}
              </div>
            );
          })
        )}
      </section>
    </main>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}
