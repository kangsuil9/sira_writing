import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient, getCurrentUser } from "@/lib/supabase/server";

export default async function WriterPostsPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const supabase = await createClient();
  const user = await getCurrentUser(supabase);
  if (!user) redirect("/login");

  const [{ data: writer }, { data: posts }] = await Promise.all([
    supabase.from("profiles").select("nickname,avatar_url").eq("id", userId).maybeSingle(),
    supabase
      .from("posts")
      .select("id,title,body,published_at,post_continuations(count)")
      .eq("author_id", userId)
      .order("published_at", { ascending: false }),
  ]);

  if (!writer) notFound();
  const nickname = writer.nickname ?? "회원";

  return (
    <main className="collection-page">
      <header className="shell collection-header writer-header">
        <Link href="/posts">최신 글</Link>
        <div className="writer-profile">
          <ProfileImage nickname={nickname} avatarUrl={writer.avatar_url} />
          <div><h1>{nickname}님의 글</h1><p>이 사람이 시라에 남긴 이야기를 모아보세요.</p></div>
        </div>
      </header>

      <section className="shell collection-post-list writer-post-list">
        {(posts ?? []).length === 0 ? (
          <div className="home-panel-empty"><strong>아직 발행한 글이 없어요.</strong></div>
        ) : (
          (posts ?? []).map((post) => {
            const continuationCount = Array.isArray(post.post_continuations)
              ? (post.post_continuations[0]?.count ?? 0)
              : 0;
            return (
              <Link className="post-card" href={`/posts/${post.id}`} key={post.id}>
                <div className="post-card-author">
                  <ProfileImage nickname={nickname} avatarUrl={writer.avatar_url} />
                  <div><strong>{nickname}</strong><time dateTime={post.published_at}>{formatDate(post.published_at)}</time></div>
                </div>
                <h3>{post.title}</h3>
                <p className="post-preview">{post.body}</p>
                <div className="post-card-foot"><span>이어쓰기 {continuationCount}개</span></div>
              </Link>
            );
          })
        )}
      </section>
    </main>
  );
}

function ProfileImage({ nickname, avatarUrl }: { nickname: string; avatarUrl?: string | null }) {
  if (avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="profile-image" src={avatarUrl} alt="" />;
  }
  return <span className="profile-image profile-fallback" aria-hidden="true">{nickname.slice(0, 1)}</span>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}
