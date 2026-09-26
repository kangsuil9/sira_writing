import Link from "next/link";
import { redirect } from "next/navigation";
import { isWritingOpen } from "@/lib/clubs";
import { createClient, getCurrentUser } from "@/lib/supabase/server";

export default async function ClubsPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  const { scope } = await searchParams;
  const showingPast = scope === "past";
  const supabase = await createClient();
  const user = await getCurrentUser(supabase);
  if (!user) redirect("/login");

  const [{ data: profile }, { data: clubs }] = await Promise.all([
    supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", user.id)
      .single(),
    supabase
      .from("clubs")
      .select(
        "id,category,topic_sentence,description,status,starts_at,ends_at,posts(count)",
      )
      .in("status", ["ACTIVE", "COMPLETED"])
      .order("created_at", { ascending: false }),
  ]);

  if (!profile?.onboarding_completed) redirect("/onboarding");

  const now = new Date();
  const prepared = (clubs ?? []).map((club) => ({
    ...club,
    postCount: Array.isArray(club.posts) ? (club.posts[0]?.count ?? 0) : 0,
  }));
  const visibleClubs = prepared.filter((club) =>
    showingPast
      ? club.status === "COMPLETED" ||
        Boolean(club.ends_at && new Date(club.ends_at) < now)
      : isWritingOpen(club.status, club.starts_at, club.ends_at, now),
  );

  return (
    <main className="collection-page">
      <header className="shell collection-header">
        <Link href="/">홈</Link>
        <h1>{showingPast ? "지난 글쓰기 클럽" : "활동중인 글쓰기 클럽"}</h1>
        <p>
          {showingPast
            ? "종료된 클럽과 그 안에 남은 글을 다시 만나보세요."
            : "지금 함께 쓰고 읽을 수 있는 주제를 만나보세요."}
        </p>
      </header>

      <section className="shell collection-club-list">
        {visibleClubs.length === 0 ? (
          <div className="home-panel-empty">
            <strong>
              {showingPast
                ? "아직 지난 클럽이 없어요."
                : "현재 활동 중인 클럽이 없어요."}
            </strong>
          </div>
        ) : (
          visibleClubs.map((club) => (
            <Link
              className="active-club-card"
              href={`/clubs/${club.id}`}
              key={club.id}
            >
              <div
                className="active-club-image club-image-placeholder"
                aria-hidden="true"
              >
                {!showingPast && <span>진행중</span>}
              </div>
              <div className="active-club-content">
                <span className="club-card-category">{club.category}</span>
                <h3>{club.topic_sentence}</h3>
                <p>{club.description}</p>
                <div className="active-club-foot">
                  <span>{formatPeriod(club.starts_at, club.ends_at)}</span>
                  <strong>글 {club.postCount}편</strong>
                </div>
              </div>
            </Link>
          ))
        )}
      </section>
    </main>
  );
}

function formatPeriod(startsAt: string, endsAt: string) {
  const formatter = new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Seoul",
  });
  return `${formatter.format(new Date(startsAt))} – ${formatter.format(new Date(endsAt))}`;
}
