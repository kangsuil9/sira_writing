import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NoteItem } from "./note-item";

type WritingNote = {
  id: string;
  title: string;
  content: string;
  updated_at: string;
};

export default async function WritingNotesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: notes }] = await Promise.all([
    supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", user.id)
      .single(),
    supabase
      .from("writing_notes")
      .select("id,title,content,updated_at")
      .eq("author_id", user.id)
      .order("updated_at", { ascending: false }),
  ]);
  if (!profile?.onboarding_completed) redirect("/onboarding");

  return (
    <main>
      <section className="shell notes-head">
        <Link href="/my">← 나의 글</Link>
        <h1>나의 글 소재</h1>
        <p>아직 글이 되지 않은 생각을 모아두는 곳이에요.</p>
      </section>
      <section className="shell notes-list">
        {(notes ?? []).length === 0 ? (
          <div className="empty notes-empty">
            <strong>아직 저장한 글 소재가 없어요.</strong>
            <p>오른쪽 아래의 메모 버튼으로 떠오른 생각을 붙잡아보세요.</p>
          </div>
        ) : (
          (notes as WritingNote[]).map((note) => (
            <NoteItem
              key={note.id}
              id={note.id}
              title={note.title}
              content={note.content}
              updatedAt={note.updated_at}
            />
          ))
        )}
      </section>
    </main>
  );
}
