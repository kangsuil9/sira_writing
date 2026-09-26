import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { isWritingOpen } from "@/lib/clubs";

export default async function HomePage() {
  const supabase = await createClient();
  const user = await getCurrentUser(supabase);
  if (!user) redirect("/login");

  const [
    { data: profile },
    { data: clubs },
    { data: latestPosts },
    { data: homeContent },
  ] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("nickname,avatar_url,onboarding_completed")
        .eq("id", user.id)
        .single(),
      supabase
        .from("clubs")
        .select(
          "id,category,topic_sentence,description,cover_image_url,status,starts_at,ends_at,posts(count)",
        )
        .in("status", ["ACTIVE", "COMPLETED"])
        .order("created_at", { ascending: false }),
      supabase
        .from("posts")
        .select(
          "id,title,body,published_at,profiles:profiles!posts_author_id_fkey(nickname,avatar_url),post_continuations(count)",
        )
        .order("published_at", { ascending: false })
        .limit(1),
      supabase
        .from("home_content")
        .select("hero_title,hero_description,hero_image_url")
        .eq("id", 1)
        .maybeSingle(),
    ]);

  if (!profile?.onboarding_completed) redirect("/onboarding");

  const preparedClubs = (clubs ?? []).map((club) => {
    const postCount = Array.isArray(club.posts)
      ? (club.posts[0]?.count ?? 0)
      : 0;
    return { ...club, postCount };
  });
  const now = new Date();
  const activeClubs = preparedClubs.filter((club) =>
    isWritingOpen(club.status, club.starts_at, club.ends_at, now),
  );
  const pastClubs = preparedClubs.filter(
    (club) =>
      club.status === "COMPLETED" ||
      (club.ends_at && new Date(club.ends_at) < now),
  );
  const latestPost = latestPosts?.[0];
  const heroTitle =
    homeContent?.hero_title ?? "누구나 읽는다.\n하지만 아무나 안쓴다.";
  const heroDescription =
    homeContent?.hero_description ??
    "내 속에 나를 꺼내 나를 완성해보세요. 나다움과 나만의 특별함을 보여주세요.";
  const heroImageUrl =
    homeContent?.hero_image_url ?? "/images/home-writing-hero-v1.png";

  return (
    <main className="home-page">
      <header className="shell home-app-header">
        <Link className="home-wordmark" href="/" aria-label="시라 홈">
          시라
        </Link>
        <Link className="home-profile-link" href="/my" aria-label="나의 글">
          <ProfileImage
            avatarUrl={profile.avatar_url}
            nickname={profile.nickname}
          />
        </Link>
      </header>

      <section className="shell home-visual-hero">
        <div className="home-hero-copy">
          <h1>{heroTitle}</h1>
          <p>{heroDescription}</p>
        </div>
        <div
          className="home-hero-visual"
          role="img"
          aria-label="햇빛이 드는 창가 책상에서 글을 쓰는 사람의 뒷모습"
          style={{
            backgroundImage: `url("${heroImageUrl.replace(/["\\\n\r]/g, "")}")`,
          }}
        />
      </section>

      <section className="shell home-panel active-club-panel">
        <SectionHeading
          title="활동중인 글쓰기 클럽"
          count={activeClubs.length}
          actionHref="/clubs?scope=active"
          actionLabel="전체보기"
        />
        {activeClubs.length === 0 ? (
          <HomeEmpty
            title="현재 활동 중인 클럽이 없어요."
            description="새로운 글쓰기 주제가 시작되면 이곳에서 만날 수 있어요."
          />
        ) : (
          <div className="active-club-list">
            {activeClubs.slice(0, 3).map((club) => (
              <ClubCard club={club} active key={club.id} />
            ))}
          </div>
        )}
      </section>

      {latestPost && <LatestPostCard post={latestPost} />}

      <section className="shell home-panel past-club-panel">
        <SectionHeading
          title="지난 글쓰기 클럽"
          count={pastClubs.length}
          actionHref="/clubs?scope=past"
          actionLabel="전체보기"
        />
        {pastClubs.length === 0 ? (
          <HomeEmpty
            title="아직 지난 클럽이 없어요."
            description="종료된 클럽과 글은 이곳에 계속 보관돼요."
          />
        ) : (
          <div className="past-club-scroll">
            {pastClubs.slice(0, 3).map((club) => (
              <Link
                className="past-club-card"
                href={`/clubs/${club.id}`}
                key={club.id}
              >
                <div
                  className="club-cover-image"
                  aria-hidden="true"
                  style={{ backgroundImage: coverImage(club.cover_image_url) }}
                />
                <div>
                  <span>{club.category}</span>
                  <h3>{club.topic_sentence}</h3>
                  <p>글 {club.postCount}편</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

type PreparedClub = {
  id: string;
  category: string;
  topic_sentence: string;
  description: string;
  cover_image_url: string | null;
  starts_at: string;
  ends_at: string;
  postCount: number;
};

type LatestPost = {
  id: string;
  title: string;
  body: string;
  published_at: string;
  profiles:
    | { nickname: string; avatar_url: string | null }
    | Array<{ nickname: string; avatar_url: string | null }>
    | null;
  post_continuations: Array<{ count: number }> | null;
};

function SectionHeading({
  title,
  count,
  actionHref,
  actionLabel,
}: {
  title: string;
  count?: number;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="home-section-heading">
      <h2>{title}</h2>
      <div className="home-section-actions">
        {typeof count === "number" && <span>{count}개</span>}
        {actionHref && actionLabel && (
          <Link href={actionHref}>{actionLabel} <span aria-hidden="true">›</span></Link>
        )}
      </div>
    </div>
  );
}

function ClubCard({ club, active }: { club: PreparedClub; active?: boolean }) {
  return (
    <Link className="active-club-card" href={`/clubs/${club.id}`}>
      <div
        className="active-club-image club-cover-image"
        aria-hidden="true"
        style={{ backgroundImage: coverImage(club.cover_image_url) }}
      >
        {active && <span>진행중</span>}
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
  );
}

function LatestPostCard({ post }: { post: LatestPost }) {
  const author = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;
  const continuationCount = post.post_continuations?.[0]?.count ?? 0;

  return (
    <section className="shell home-panel latest-post-panel">
      <SectionHeading
        title="오늘의 최신 글"
        actionHref="/posts"
        actionLabel="더보기"
      />
      <Link className="latest-post-card" href={`/posts/${post.id}`}>
        <div
          className="latest-post-image club-image-placeholder"
          aria-hidden="true"
        />
        <div className="latest-post-content">
          <h3>{post.title}</h3>
          <p>{post.body}</p>
          <div className="latest-post-foot">
            <span className="latest-author">
              <ProfileImage
                avatarUrl={author?.avatar_url}
                nickname={author?.nickname ?? "회원"}
                small
              />
              {author?.nickname ?? "회원"} · {formatDate(post.published_at)}
            </span>
            <span>이어쓰기 {continuationCount}개</span>
          </div>
        </div>
      </Link>
    </section>
  );
}

function HomeEmpty({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="home-panel-empty">
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}

function ProfileImage({
  avatarUrl,
  nickname,
  small = false,
}: {
  avatarUrl?: string | null;
  nickname: string;
  small?: boolean;
}) {
  const className = small ? "home-avatar home-avatar-small" : "home-avatar";
  if (avatarUrl) {
    // Profile images can be served from Kakao or Supabase Storage host names.
    // eslint-disable-next-line @next/next/no-img-element
    return <img className={className} src={avatarUrl} alt="" />;
  }
  return (
    <span className={`${className} home-avatar-fallback`}>
      {nickname.slice(0, 1)}
    </span>
  );
}

function formatPeriod(startsAt: string, endsAt: string) {
  const formatter = new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    timeZone: "Asia/Seoul",
  });
  return `${formatter.format(new Date(startsAt))} – ${formatter.format(new Date(endsAt))}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}

function coverImage(value?: string | null) {
  const url = (value || "/images/club-cover-default-v1.png").replace(
    /["\\\n\r]/g,
    "",
  );
  return `url("${url}")`;
}
