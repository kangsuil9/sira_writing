import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isWritingOpen } from "@/lib/clubs";

export default async function ClubPage({
  params,
}: {
  params: Promise<{ clubId: string }>;
}) {
  const { clubId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: club }, { data: posts }] =
    await Promise.all([
      supabase.from("profiles").select("role").eq("id", user.id).single(),
      supabase
        .from("clubs")
        .select(
          "id,category,topic_sentence,description,status,starts_at,ends_at",
        )
        .eq("id", clubId)
        .single(),
      supabase
        .from("posts")
        .select(
          "id,title,body,published_at,profiles:profiles!posts_author_id_fkey(nickname,avatar_url),post_continuations(count)",
        )
        .eq("club_id", clubId)
        .order("published_at", { ascending: false }),
    ]);

  if (!club || (club.status === "DRAFT" && profile?.role !== "ADMIN")) {
    notFound();
  }

  const active = isWritingOpen(
    club.status,
    club.starts_at,
    club.ends_at,
  );

  return (
    <main>
      <header className="shell header">
        <Link className="header-back-link" href="/">클럽 목록</Link>
      </header>

      <section className="shell club-hero">
        <h1>{club.topic_sentence}</h1>
        <div className="club-meta">
          {club.category} · {active ? "활동 중" : "종료"}
        </div>
        <p>{club.description}</p>
        <div className="period">
          {formatDate(club.starts_at)} – {formatDate(club.ends_at)}
        </div>
        {active ? (
          <Link className="primary-link" href={`/clubs/${club.id}/write`}>
            이 주제로 글쓰기
          </Link>
        ) : (
          <p className="closed-note">
            활동이 종료되어 지난 글만 읽을 수 있어요.
          </p>
        )}
      </section>

      <section className="shell post-list">
        <div className="section-title">
          <h2>클럽의 글</h2>
          <span>{posts?.length ?? 0}편</span>
        </div>

        {(posts ?? []).length === 0 ? (
          <div className="empty">
            <strong>아직 첫 글을 기다리고 있어요.</strong>
            <p>이 주제에서 떠오른 생각을 가장 먼저 남겨보세요.</p>
          </div>
        ) : (
          <div className="post-cards">
            {(posts ?? []).map((post) => {
              const author = Array.isArray(post.profiles)
                ? post.profiles[0]
                : post.profiles;
              const continuationCount = Array.isArray(post.post_continuations)
                ? (post.post_continuations[0]?.count ?? 0)
                : 0;

              return (
                <Link
                  className="post-card"
                  href={`/posts/${post.id}`}
                  key={post.id}
                >
                  <div className="post-card-author">
                    <ProfileImage
                      nickname={author?.nickname ?? "알 수 없는 회원"}
                      avatarUrl={author?.avatar_url}
                    />
                    <div>
                      <strong>{author?.nickname ?? "알 수 없는 회원"}</strong>
                      <time dateTime={post.published_at}>
                        {formatDate(post.published_at)}
                      </time>
                    </div>
                  </div>

                  <h3>{post.title}</h3>
                  <p className="post-preview">{post.body}</p>

                  <div className="post-card-foot">
                    <span aria-hidden="true">○</span>
                    <span>이어쓰기 {continuationCount}개</span>
                  </div>
                </Link>
              );
            })}
          </div>
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
    // Kakao profile images can be served from varying host names.
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="profile-image" src={avatarUrl} alt="" />;
  }

  return (
    <span className="profile-image profile-fallback" aria-hidden="true">
      {nickname.slice(0, 1)}
    </span>
  );
}

function formatDate(value?: string) {
  return value
    ? new Intl.DateTimeFormat("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "Asia/Seoul",
      }).format(new Date(value))
    : "";
}
