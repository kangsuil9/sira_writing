import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "./actions";
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
      .select("nickname,onboarding_completed,role")
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
      <header className="shell header">
        <div className="brand">시라</div>
        <div className="header-actions">
          <Link href="/my">마이페이지</Link>
          {profile.role === "ADMIN" && (
            <Link href="/admin/clubs">클럽 관리</Link>
          )}
          <form action={signOut}>
            <button className="logout">로그아웃</button>
          </form>
        </div>
      </header>

      <section className="shell hero">
        <span className="eyebrow">SIRA WRITING</span>
        <h1>
          글쓰기로 돌보는
          <br />
          우리의 균형
        </h1>
        <p>{profile.nickname}님, 오늘은 어떤 이야기를 쓰고 싶나요?</p>
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
              <div className="club-meta">
                {club.cycle?.sequence}기 · {club.category}
              </div>
              <h3>{club.topic_sentence}</h3>
              <p>{club.description}</p>
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
