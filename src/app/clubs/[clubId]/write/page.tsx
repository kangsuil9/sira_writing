import { randomUUID } from "crypto";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PostForm } from "@/app/components/post-form";
import { isWritingOpen } from "@/lib/clubs";

export default async function WritePage({
  params,
  searchParams,
}: {
  params: Promise<{ clubId: string }>;
  searchParams: Promise<{ draft?: string }>;
}) {
  const { clubId } = await params;
  const { draft: requestedDraftId } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: club }, draftResult] = await Promise.all([
    supabase
      .from("clubs")
      .select("id,topic_sentence,status,starts_at,ends_at")
      .eq("id", clubId)
      .single(),
    requestedDraftId
      ? supabase
          .from("post_drafts")
          .select("id,title,body,body_html,discussion_question")
          .eq("id", requestedDraftId)
          .eq("club_id", clubId)
          .eq("author_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  if (!club) notFound();
  if (requestedDraftId && !draftResult.data) notFound();
  if (!isWritingOpen(club.status, club.starts_at, club.ends_at)) {
    redirect(`/clubs/${clubId}`);
  }

  const draft = draftResult.data;
  const draftId = draft?.id ?? randomUUID();

  return (
    <main>
      <header className="shell header">
        <Link className="brand" href="/">
          시라
        </Link>
        <Link href={`/clubs/${clubId}`}>나가기</Link>
      </header>
      <section className="shell editor-head">
        <h1>{club.topic_sentence}</h1>
      </section>
      <section className="shell editor-wrap">
        <PostForm
          clubId={clubId}
          userId={user.id}
          draftId={draftId}
          draft={
            draft
              ? {
                  id: draft.id,
                  title: draft.title,
                  body: draft.body,
                  bodyHtml: draft.body_html,
                  discussionQuestion: draft.discussion_question,
                }
              : undefined
          }
        />
      </section>
    </main>
  );
}
