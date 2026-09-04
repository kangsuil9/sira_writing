"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
export type WritingState = { error?: string };
async function currentUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}
export async function createPost(_: WritingState, formData: FormData): Promise<WritingState> {
  const { supabase, user } = await currentUser();
  const clubId = String(formData.get("clubId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (title.length < 1 || title.length > 200) return { error: "제목은 1~200자로 입력해 주세요." };
  if (body.length < 1 || body.length > 50000) return { error: "본문은 1~50,000자로 입력해 주세요." };
  const { data: club } = await supabase.from("clubs").select("status").eq("id", clubId).single();
  if (club?.status !== "ACTIVE") return { error: "현재 글을 작성할 수 없는 클럽이에요." };
  const { data, error } = await supabase.from("posts").insert({ club_id: clubId, author_id: user.id, title, body }).select("id").single();
  if (error || !data) return { error: "글을 저장하지 못했어요. 잠시 후 다시 시도해 주세요." };
  revalidatePath(`/clubs/${clubId}`);
  redirect(`/posts/${data.id}`);
}
export async function updatePost(_: WritingState, formData: FormData): Promise<WritingState> {
  const { supabase, user } = await currentUser();
  const postId = String(formData.get("postId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (title.length < 1 || title.length > 200) return { error: "제목은 1~200자로 입력해 주세요." };
  if (body.length < 1 || body.length > 50000) return { error: "본문은 1~50,000자로 입력해 주세요." };
  const { data: post } = await supabase.from("posts").select("author_id,club_id,clubs(status)").eq("id", postId).single();
  const club = Array.isArray(post?.clubs) ? post.clubs[0] : post?.clubs;
  if (!post || post.author_id !== user.id) return { error: "작성자만 수정할 수 있어요." };
  if (club?.status !== "ACTIVE") return { error: "종료된 클럽의 글은 수정할 수 없어요." };
  const { error } = await supabase.from("posts").update({ title, body, updated_at: new Date().toISOString() }).eq("id", postId).eq("author_id", user.id);
  if (error) return { error: "글을 수정하지 못했어요." };
  revalidatePath(`/posts/${postId}`); revalidatePath(`/clubs/${post.club_id}`);
  redirect(`/posts/${postId}`);
}
export async function deletePost(formData: FormData) {
  const { supabase, user } = await currentUser();
  const postId = String(formData.get("postId") ?? "");
  const { data: post } = await supabase.from("posts").select("author_id,club_id,clubs(status)").eq("id", postId).single();
  const club = Array.isArray(post?.clubs) ? post.clubs[0] : post?.clubs;
  if (!post || post.author_id !== user.id || club?.status !== "ACTIVE") redirect(`/posts/${postId}`);
  const { error } = await supabase.from("posts").delete().eq("id", postId).eq("author_id", user.id);
  if (error) redirect(`/posts/${postId}`);
  revalidatePath(`/clubs/${post.club_id}`);
  redirect(`/clubs/${post.club_id}`);
}
