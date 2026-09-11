"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type NoteState = { error?: string; saved?: boolean };

async function currentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

function noteValues(formData: FormData) {
  return {
    title: String(formData.get("title") ?? "").trim(),
    content: String(formData.get("content") ?? "").trim(),
  };
}

function validateNote(title: string, content: string): string | null {
  if (title.length > 120) return "제목은 120자 이하로 입력해 주세요.";
  if (content.length < 1 || content.length > 10000) {
    return "내용은 1~10,000자로 입력해 주세요.";
  }
  return null;
}

export async function createWritingNote(
  _: NoteState,
  formData: FormData,
): Promise<NoteState> {
  const { supabase, user } = await currentUser();
  const { title, content } = noteValues(formData);
  const validationError = validateNote(title, content);
  if (validationError) return { error: validationError };

  const { error } = await supabase.from("writing_notes").insert({
    author_id: user.id,
    title,
    content,
  });
  if (error) return { error: "메모를 저장하지 못했어요. 잠시 후 다시 시도해 주세요." };

  revalidatePath("/my");
  revalidatePath("/my/notes");
  return { saved: true };
}

export async function updateWritingNote(
  _: NoteState,
  formData: FormData,
): Promise<NoteState> {
  const { supabase, user } = await currentUser();
  const noteId = String(formData.get("noteId") ?? "");
  const { title, content } = noteValues(formData);
  const validationError = validateNote(title, content);
  if (validationError) return { error: validationError };

  const { error } = await supabase
    .from("writing_notes")
    .update({ title, content, updated_at: new Date().toISOString() })
    .eq("id", noteId)
    .eq("author_id", user.id);
  if (error) return { error: "메모를 수정하지 못했어요." };

  revalidatePath("/my/notes");
  return { saved: true };
}

export async function deleteWritingNote(formData: FormData) {
  const { supabase, user } = await currentUser();
  const noteId = String(formData.get("noteId") ?? "");
  await supabase
    .from("writing_notes")
    .delete()
    .eq("id", noteId)
    .eq("author_id", user.id);
  revalidatePath("/my");
  revalidatePath("/my/notes");
}
