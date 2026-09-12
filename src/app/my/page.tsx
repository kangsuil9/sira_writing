import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isWritingOpen } from "@/lib/clubs";
import { signOut } from "@/app/actions";

type Club = {
  id: string;
  category: string;
  topic_sentence: string;
  status: string;
  starts_at: string;
  ends_at: string;
};

type Post = {
  id: string;
  title: string;
  body: string;
  published_at: string;
  post_continuations: Array<{ count: number }> | null;
  clubs: Club | Club[] | null;
};

type ClubGroup = {
  club: Club;
  posts: Post[];
  active: boolean;
};

export default async function MyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: posts }, { count: draftCount }, { count: noteCount }] = await Promise.all([
    supabase
      .from("profiles")
      .select("nickname,onboarding_completed,role")
      .eq("id", user.id)
      .single(),
    supabase
      .from("posts")
      .select(
        "id,title,body,published_at,post_continuations(count),clubs(id,category,topic_sentence,status,starts_at,ends_at)",
      )
      .eq("author_id", user.id)
      .order("published_at", { ascending: false }),
    supabase
      .from("post_drafts")
      .select("id", { count: "exact", head: true })
      .eq("author_id", user.id),
    supabase
      .from("writing_notes")
      .select("id", { count: "exact", head: true })
      .eq("author_id", user.id),
  ]);

  if (!profile?.onboarding_completed) redirect("/onboarding");

  const groups = groupPosts((posts ?? []) as Post[]);

  return (
    <main>
      <section className="shell my-hero">
        <h1>{profile.nickname}님의 글</h1>
        <div className="my-summary">
          <strong>내가 쓴 글 {posts?.length ?? 0}편</strong>
          <Link className="draft-list-link" href="/my/drafts">
            임시저장 글 {draftCount ?? 0}개
          </Link>
          <Link className="draft-list-link" href="/my/notes">
            나의 글 소재 {noteCount ?? 0}개
          </Link>
        </div>
        <div className="my-account-actions">
          {profile.role === "ADMIN" && (
            <Link href="/admin/clubs">클럽 관리</Link>
          )}
          <form action={signOut}>
            <button type="submit">로그아웃</button>
          </form>
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
                    {group.club.category} ·{" "}
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
                      <p className="my-post-preview">{post.body}</p>
                    </div>
                    <div className="my-post-meta">
                      <time dateTime={post.published_at}>
                        {formatDate(post.published_at)}
                      </time>
                      <span>이어쓰기 {continuationCount(post)}개</span>
                    </div>
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

function continuationCount(post: Post) {
  return post.post_continuations?.[0]?.count ?? 0;
}

function groupPosts(posts: Post[]) {
  const grouped = new Map<string, ClubGroup>();

  for (const post of posts) {
    const club = Array.isArray(post.clubs) ? post.clubs[0] : post.clubs;
    if (!club) continue;
    const existing = grouped.get(club.id);

    if (existing) {
      existing.posts.push(post);
      continue;
    }

    grouped.set(club.id, {
      club,
      posts: [post],
      active: isWritingOpen(
        club.status,
        club.starts_at,
        club.ends_at,
      ),
    });
  }

  return [...grouped.values()].sort((a, b) => {
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
