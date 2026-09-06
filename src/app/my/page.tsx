import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isWritingOpen } from "@/lib/clubs";

type Cycle = {
  sequence: number;
  starts_at: string;
  ends_at: string;
};

type Club = {
  id: string;
  category: string;
  topic_sentence: string;
  status: string;
  cycles: Cycle | Cycle[] | null;
};

type Post = {
  id: string;
  title: string;
  discussion_question: string | null;
  published_at: string;
  clubs: Club | Club[] | null;
};

type ClubGroup = {
  club: Club;
  cycle: Cycle | null;
  posts: Post[];
  active: boolean;
};

export default async function MyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: posts }] = await Promise.all([
    supabase
      .from("profiles")
      .select("nickname,role,onboarding_completed")
      .eq("id", user.id)
      .single(),
    supabase
      .from("posts")
      .select(
        "id,title,discussion_question,published_at,clubs(id,category,topic_sentence,status,cycles(sequence,starts_at,ends_at))",
      )
      .eq("author_id", user.id)
      .order("published_at", { ascending: false }),
  ]);

  if (!profile?.onboarding_completed) redirect("/onboarding");

  const groups = groupPosts((posts ?? []) as Post[]);

  return (
    <main>
      <header className="shell header">
        <Link className="brand" href="/">
          시라
        </Link>
        <Link href="/">클럽 목록</Link>
      </header>

      <section className="shell my-hero">
        <span className="eyebrow">MY WRITING</span>
        <h1>{profile.nickname}님의 글</h1>
        <div className="my-summary">
          <span>{profile.role}</span>
          <strong>내가 쓴 글 {posts?.length ?? 0}편</strong>
        </div>
      </section>

      <section className="shell my-writing">
        {groups.length === 0 ? (
          <div className="empty">
            <strong>아직 작성한 글이 없어요.</strong>
            <p>활동 중인 클럽에서 첫 번째 생각을 기록해보세요.</p>
            <Link className="primary-link" href="/">
              글쓰기 클럽 둘러보기
            </Link>
          </div>
        ) : (
          groups.map((group) => (
            <section className="my-club-group" key={group.club.id}>
              <div className="my-club-head">
                <div>
                  <div className="club-meta">
                    {group.cycle?.sequence}기 · {group.club.category} ·{" "}
                    {group.active ? "활동 중" : "종료"}
                  </div>
                  <Link href={`/clubs/${group.club.id}`}>
                    <h2>{group.club.topic_sentence}</h2>
                  </Link>
                </div>
                <span>{group.posts.length}편</span>
              </div>

              <div className="my-post-list">
                {group.posts.map((post) => (
                  <Link
                    className="my-post-card"
                    href={`/posts/${post.id}`}
                    key={post.id}
                  >
                    <div>
                      <h3>{post.title}</h3>
                      {post.discussion_question && (
                        <p>
                          함께 나누고 싶은 질문 · {post.discussion_question}
                        </p>
                      )}
                    </div>
                    <time dateTime={post.published_at}>
                      {formatDate(post.published_at)}
                    </time>
                  </Link>
                ))}
              </div>
            </section>
          ))
        )}
      </section>
    </main>
  );
}

function groupPosts(posts: Post[]) {
  const grouped = new Map<string, ClubGroup>();

  for (const post of posts) {
    const club = Array.isArray(post.clubs) ? post.clubs[0] : post.clubs;
    if (!club) continue;
    const cycle = Array.isArray(club.cycles) ? club.cycles[0] : club.cycles;
    const existing = grouped.get(club.id);

    if (existing) {
      existing.posts.push(post);
      continue;
    }

    grouped.set(club.id, {
      club,
      cycle: cycle ?? null,
      posts: [post],
      active: isWritingOpen(
        club.status,
        cycle?.starts_at,
        cycle?.ends_at,
      ),
    });
  }

  return [...grouped.values()].sort((a, b) => {
    const sequenceDifference =
      (b.cycle?.sequence ?? 0) - (a.cycle?.sequence ?? 0);
    if (sequenceDifference !== 0) return sequenceDifference;
    return b.posts[0].published_at.localeCompare(a.posts[0].published_at);
  });
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}
