import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PostForm } from "@/app/components/post-form";
export default async function EditPostPage({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser(); if (!user) redirect("/login");
  const { data: post } = await supabase.from("posts").select("id,title,body,author_id,club_id,clubs(status,topic_sentence)").eq("id", postId).single();
  if (!post) notFound();
  const club = Array.isArray(post.clubs) ? post.clubs[0] : post.clubs;
  if (post.author_id !== user.id || club?.status !== "ACTIVE") redirect(`/posts/${postId}`);
  return <main><header className="shell header"><Link className="brand" href="/">시라</Link><Link href={`/posts/${postId}`}>나가기</Link></header><section className="shell editor-head"><span className="eyebrow">EDIT</span><h1>{club.topic_sentence}</h1></section><section className="shell editor-wrap"><PostForm clubId={post.club_id} post={{ id: post.id, title: post.title, body: post.body }} /></section></main>;
}
