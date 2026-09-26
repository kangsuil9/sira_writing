import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, getCurrentUser } from "@/lib/supabase/server";

export default async function PostsPage() {
  const supabase = await createClient();
  const user = await getCurrentUser(supabase);
  if (!user) redirect("/login");

  const [{ data: profile }, { data: posts }] = await Promise.all([
    supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", user.id)
      .single(),
    supabase
      .from("posts")
      .select(
        "id,title,body,published_at,profiles:profiles!posts_author_id_fkey(nickname,avatar_url),post_continuations(count)",
      )
      .order("published_at", { ascending: false }),
  ]);

  if (!profile?.onboarding_completed) redirect("/onboarding");

  return (
    <main className="collection-page">
      <header className="shell collection-header">
        <Link href="/">홈</Link>
        <h1>최신 글</h1>
        <p>시라에서 막 도착한 이야기부터 천천히 읽어보세요.</p>
      </header>

      <section className="shell collection-post-list">
        {(posts ?? []).length === 0 ? (
          <div className="home-panel-empty">
            <strong>아직 발행된 글이 없어요.</strong>
          </div>
        ) : (
          (posts ?? []).map((post) => {
            const author = Array.isArray(post.profiles)
              ? post.profiles[0]
              : post.profiles;
            const continuationCount = Array.isArray(post.post_continuations)
              ? (post.post_continuations[0]?.count ?? 0)
              : 0;

            return (
              <Link className="post-card" href={`/posts/${post.id}`} key={post.id}>
                <div className="post-card-author">
                  <ProfileImage
                    nickname={author?.nickname ?? "회원"}
                    avatarUrl={author?.avatar_url}
                  />
                  <div>
                    <strong>{author?.nickname ?? "회원"}</strong>
                    <time dateTime={post.published_at}>
                      {formatDate(post.published_at)}
                    </time>
                  </div>
                </div>
                <h3>{post.title}</h3>
                <p className="post-preview">{post.body}</p>
                <div className="post-card-foot">
                  <span>이어쓰기 {continuationCount}개</span>
                </div>
              </Link>
            );
          })
        )}
      </section>
    </main>
  );
}

function ProfileImage({
  nickname,
  avatarUrl,
}: {
  nickname: string;
  avatarUrl?: string | null;
}) {
  if (avatarUrl) {
    // Profile images can be served from Kakao or Supabase Storage host names.
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="profile-image" src={avatarUrl} alt="" />;
  }
  return (
    <span className="profile-image profile-fallback" aria-hidden="true">
      {nickname.slice(0, 1)}
    </span>
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
