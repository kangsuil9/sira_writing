import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ContinuationForm,
  ContinuationItem,
} from "@/app/components/continuation-form";
import {
  deletePost,
  toggleRead,
} from "@/app/writing-actions";
import { createClient } from "@/lib/supabase/server";
import { isWritingOpen } from "@/lib/clubs";

export default async function PostPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: post }, { data: readRows }, { data: continuations }] =
    await Promise.all([
      supabase
        .from("posts")
        .select(
          "id,title,body,discussion_question,author_id,published_at,updated_at,profiles:profiles!posts_author_id_fkey(nickname),clubs(id,topic_sentence,status,cycles(sequence,starts_at,ends_at))",
        )
        .eq("id", postId)
        .single(),
      supabase.from("post_reads").select("user_id").eq("post_id", postId),
      supabase
        .from("post_continuations")
        .select(
          "id,body,author_id,created_at,updated_at,profiles:profiles!post_continuations_author_id_fkey(nickname)",
        )
        .eq("post_id", postId)
        .order("created_at", { ascending: true }),
    ]);

  if (!post) notFound();

  const author = Array.isArray(post.profiles)
    ? post.profiles[0]
    : post.profiles;
  const club = Array.isArray(post.clubs) ? post.clubs[0] : post.clubs;
  const cycle = Array.isArray(club?.cycles)
    ? club.cycles[0]
    : club?.cycles;
  const open = isWritingOpen(
    club?.status ?? "",
    cycle?.starts_at,
    cycle?.ends_at,
  );
  const editable = post.author_id === user.id && open;
  const readByMe = (readRows ?? []).some((row) => row.user_id === user.id);

  return (
    <main>
      <header className="shell header">
        <Link className="brand" href="/">
          시라
        </Link>
        <Link href={`/clubs/${club?.id}`}>클럽으로</Link>
      </header>

      <article className="shell article">
        <div className="article-topic">
          {cycle?.sequence}기 · {club?.topic_sentence}
        </div>
        <h1>{post.title}</h1>
        <div className="article-byline">
          {author?.nickname ?? "알 수 없는 회원"} ·{" "}
          {formatDate(post.published_at)}
        </div>

        {editable && (
          <div className="article-actions">
            <Link href={`/posts/${post.id}/edit`}>수정</Link>
            <form action={deletePost}>
              <input type="hidden" name="postId" value={post.id} />
              <button>삭제</button>
            </form>
          </div>
        )}

        <div className="article-body">{post.body}</div>

        {post.discussion_question && (
          <section className="discussion-question">
            <span>함께 나누고 싶은 질문</span>
            <p>{post.discussion_question}</p>
          </section>
        )}

        <section className="reading-action">
          <form action={toggleRead}>
            <input type="hidden" name="postId" value={post.id} />
            <button className={readByMe ? "read-button marked" : "read-button"}>
              {readByMe ? "읽었어요 ✓" : "읽었어요"}{" "}
              <span>{readRows?.length ?? 0}</span>
            </button>
          </form>
        </section>

        <section className="continuations">
          <div className="section-title">
            <h2>이어진 글</h2>
            <span>{continuations?.length ?? 0}개</span>
          </div>

          <div className="continuation-list">
            {(continuations ?? []).map((item) => {
              const itemAuthor = Array.isArray(item.profiles)
                ? item.profiles[0]
                : item.profiles;
              return (
                <ContinuationItem
                  key={item.id}
                  postId={post.id}
                  continuationId={item.id}
                  body={item.body}
                  author={itemAuthor?.nickname ?? "알 수 없는 회원"}
                  date={formatDate(item.created_at)}
                  editable={item.author_id === user.id && open}
                />
              );
            })}
          </div>

          {open ? (
            <div className="continuation-compose">
              <h2>이어쓰기</h2>
              <ContinuationForm postId={post.id} />
            </div>
          ) : (
            <p className="closed-note">
              클럽 활동이 종료되어 이어쓰기도 함께 마감됐어요.
            </p>
          )}
        </section>
      </article>
    </main>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}
