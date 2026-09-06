"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
export type WritingState = { error?: string; saved?: boolean };
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
  const discussionQuestion = String(formData.get("discussionQuestion") ?? "").trim();
  if (title.length < 1 || title.length > 200) return { error: "제목은 1~200자로 입력해 주세요." };
  if (body.length < 1 || body.length > 50000) return { error: "본문은 1~50,000자로 입력해 주세요." };
  if (discussionQuestion.length > 300) return { error: "함께 나누고 싶은 질문은 300자 이하로 입력해 주세요." };
  const { data: club } = await supabase.from("clubs").select("status,cycles(starts_at,ends_at)").eq("id", clubId).single();
  const cycle = Array.isArray(club?.cycles) ? club.cycles[0] : club?.cycles;
  if (!club || club.status !== "ACTIVE" || !cycle || new Date() < new Date(cycle.starts_at) || new Date() > new Date(cycle.ends_at)) return { error: "현재 글을 작성할 수 없는 클럽이에요." };
  const { data, error } = await supabase.from("posts").insert({ club_id: clubId, author_id: user.id, title, body, discussion_question: discussionQuestion || null }).select("id").single();
  if (error || !data) return { error: "글을 저장하지 못했어요. 잠시 후 다시 시도해 주세요." };
  revalidatePath(`/clubs/${clubId}`);
  redirect(`/posts/${data.id}`);
}
export async function updatePost(_: WritingState, formData: FormData): Promise<WritingState> {
  const { supabase, user } = await currentUser();
  const postId = String(formData.get("postId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const discussionQuestion = String(formData.get("discussionQuestion") ?? "").trim();
  if (title.length < 1 || title.length > 200) return { error: "제목은 1~200자로 입력해 주세요." };
  if (body.length < 1 || body.length > 50000) return { error: "본문은 1~50,000자로 입력해 주세요." };
  if (discussionQuestion.length > 300) return { error: "함께 나누고 싶은 질문은 300자 이하로 입력해 주세요." };
  const { data: post } = await supabase.from("posts").select("author_id,club_id,clubs(status,cycles(starts_at,ends_at))").eq("id", postId).single();
  const club = Array.isArray(post?.clubs) ? post.clubs[0] : post?.clubs;
  const cycle = Array.isArray(club?.cycles) ? club.cycles[0] : club?.cycles;
  if (!post || post.author_id !== user.id) return { error: "작성자만 수정할 수 있어요." };
  if (club?.status !== "ACTIVE" || !cycle || new Date() < new Date(cycle.starts_at) || new Date() > new Date(cycle.ends_at)) return { error: "종료된 클럽의 글은 수정할 수 없어요." };
  const { error } = await supabase.from("posts").update({ title, body, discussion_question: discussionQuestion || null, updated_at: new Date().toISOString() }).eq("id", postId).eq("author_id", user.id);
  if (error) return { error: "글을 수정하지 못했어요." };
  revalidatePath(`/posts/${postId}`); revalidatePath(`/clubs/${post.club_id}`);
  redirect(`/posts/${postId}`);
}
export async function deletePost(formData: FormData) {
  const { supabase, user } = await currentUser();
  const postId = String(formData.get("postId") ?? "");
  const { data: post } = await supabase.from("posts").select("author_id,club_id,clubs(status,cycles(starts_at,ends_at))").eq("id", postId).single();
  const club = Array.isArray(post?.clubs) ? post.clubs[0] : post?.clubs;
  const cycle = Array.isArray(club?.cycles) ? club.cycles[0] : club?.cycles;
  if (!post || post.author_id !== user.id || club?.status !== "ACTIVE" || !cycle || new Date() < new Date(cycle.starts_at) || new Date() > new Date(cycle.ends_at)) redirect(`/posts/${postId}`);
  const { error } = await supabase.from("posts").delete().eq("id", postId).eq("author_id", user.id);
  if (error) redirect(`/posts/${postId}`);
  revalidatePath(`/clubs/${post.club_id}`);
  redirect(`/clubs/${post.club_id}`);
}
async function continuationOpen(supabase: Awaited<ReturnType<typeof createClient>>, postId: string) {
  const { data: post } = await supabase.from("posts").select("clubs(status,cycles(starts_at,ends_at))").eq("id", postId).single();
  const club = Array.isArray(post?.clubs) ? post.clubs[0] : post?.clubs;
  const cycle = Array.isArray(club?.cycles) ? club.cycles[0] : club?.cycles;
  return Boolean(club?.status === "ACTIVE" && cycle && new Date() >= new Date(cycle.starts_at) && new Date() <= new Date(cycle.ends_at));
}
export async function toggleRead(formData: FormData) {
  const { supabase, user } = await currentUser();
  const postId = String(formData.get("postId") ?? "");
  const { data } = await supabase.from("post_reads").select("post_id").eq("post_id", postId).eq("user_id", user.id).maybeSingle();
  if (data) await supabase.from("post_reads").delete().eq("post_id", postId).eq("user_id", user.id);
  else await supabase.from("post_reads").insert({ post_id: postId, user_id: user.id });
  revalidatePath(`/posts/${postId}`);
}
export async function createContinuation(_: WritingState, formData: FormData): Promise<WritingState> {
  const { supabase, user } = await currentUser();
  const postId = String(formData.get("postId") ?? ""), body = String(formData.get("body") ?? "").trim();
  if (body.length < 1 || body.length > 5000) return { error: "이어쓰기는 1~5,000자로 입력해 주세요." };
  if (!await continuationOpen(supabase, postId)) return { error: "클럽 활동 기간이 종료되어 이어쓸 수 없어요." };
  const { error } = await supabase.from("post_continuations").insert({ post_id: postId, author_id: user.id, body });
  if (error) return { error: "이어쓰기를 저장하지 못했어요." };
  revalidatePath(`/posts/${postId}`);
  return { saved: true };
}
export async function updateContinuation(_: WritingState, formData: FormData): Promise<WritingState> {
  const { supabase, user } = await currentUser();
  const continuationId = String(formData.get("continuationId") ?? ""), postId = String(formData.get("postId") ?? ""), body = String(formData.get("body") ?? "").trim();
  if (body.length < 1 || body.length > 5000) return { error: "이어쓰기는 1~5,000자로 입력해 주세요." };
  if (!await continuationOpen(supabase, postId)) return { error: "클럽 활동 기간이 종료되어 수정할 수 없어요." };
  const { error } = await supabase.from("post_continuations").update({ body, updated_at: new Date().toISOString() }).eq("id", continuationId).eq("author_id", user.id);
  if (error) return { error: "이어쓰기를 수정하지 못했어요." };
  revalidatePath(`/posts/${postId}`);
  return { saved: true };
}
export async function deleteContinuation(formData: FormData) {
  const { supabase, user } = await currentUser();
  const continuationId = String(formData.get("continuationId") ?? ""), postId = String(formData.get("postId") ?? "");
  if (!await continuationOpen(supabase, postId)) return;
  await supabase.from("post_continuations").delete().eq("id", continuationId).eq("author_id", user.id);
  revalidatePath(`/posts/${postId}`);
}
