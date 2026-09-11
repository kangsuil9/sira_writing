import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isWritingOpen } from "@/lib/clubs";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
        "id,category,topic_sentence,description,status,cycles(sequence,starts_at,ends_at),posts(count)",
      )
      .in("status", ["ACTIVE", "COMPLETED"])
      .order("created_at", { ascending: false }),
  ]);

  if (!profile?.onboarding_completed) redirect("/onboarding");

  const preparedClubs = (clubs ?? []).map((club) => {
    const cycle = Array.isArray(club.cycles)
      ? club.cycles[0]
      : club.cycles;
    const postCount = Array.isArray(club.posts)
      ? (club.posts[0]?.count ?? 0)
      : 0;
    return { ...club, cycle, postCount };
  });
  const now = new Date();
  const activeClubs = preparedClubs.filter((club) =>
    isWritingOpen(
      club.status,
      club.cycle?.starts_at,
      club.cycle?.ends_at,
      now,
    ),
  );
  const pastClubs = preparedClubs.filter(
    (club) =>
      club.status === "COMPLETED" ||
      (club.cycle?.ends_at && new Date(club.cycle.ends_at) < now),
  );

  return (
    <main>
      <section className="shell hero">
        <h1>누구나 읽는다. 하지만 아무나 못쓴다.</h1>
      </section>

      <ClubSection
        title="활동중인 글쓰기 클럽"
        clubs={activeClubs}
        active
        emptyTitle="현재 활동 중인 클럽이 없어요."
        emptyDescription="새로운 글쓰기 주제가 시작되면 이곳에서 만날 수 있어요."
      />

      <ClubSection
        title="지난 글쓰기 클럽"
        clubs={pastClubs}
        emptyTitle="아직 지난 클럽이 없어요."
        emptyDescription="종료된 클럽과 글은 이곳에 계속 보관돼요."
      />
    </main>
  );
}

type PreparedClub = {
  id: string;
  category: string;
  topic_sentence: string;
  description: string;
  cycle:
    | { sequence: number; starts_at: string; ends_at: string }
    | null;
  postCount: number;
};

function ClubSection({
  title,
  clubs,
  active = false,
  emptyTitle,
  emptyDescription,
}: {
  title: string;
  clubs: PreparedClub[];
  active?: boolean;
  emptyTitle: string;
  emptyDescription: string;
}) {
  return (
    <section className="shell home-clubs">
      <div className="section-title">
        <h2>{title}</h2>
        <span>{clubs.length}개</span>
      </div>

      {clubs.length === 0 ? (
        <div className="empty club-empty">
          <strong>{emptyTitle}</strong>
          <p>{emptyDescription}</p>
        </div>
      ) : (
        <div className="home-club-grid">
          {clubs.map((club) => (
            <Link
              className="home-club-card"
              href={`/clubs/${club.id}`}
              key={club.id}
            >
              <div className="home-club-main">
                <div className="club-meta">
                  {club.cycle?.sequence}기 · {club.category}
                </div>
                <h3>{club.topic_sentence}</h3>
                <p>{club.description}</p>
              </div>
              <div className="card-foot">
                <span>{active ? "글쓰기 진행 중" : "지난 클럽"}</span>
                <span>글 {club.postCount}편</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
