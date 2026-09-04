import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deletePost } from "@/app/writing-actions";
export default async function PostPage({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser(); if (!user) redirect("/login");
  const { data: post } = await supabase.from("posts").select("id,title,body,author_id,published_at,updated_at,profiles(nickname),clubs(id,topic_sentence,status,cycles(sequence))").eq("id", postId).single();
  if (!post) notFound();
  const author = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;
  const club = Array.isArray(post.clubs) ? post.clubs[0] : post.clubs;
  const cycle = Array.isArray(club?.cycles) ? club.cycles[0] : club?.cycles;
  const mine = post.author_id === user.id, editable = mine && club?.status === "ACTIVE";
  return <main><header className="shell header"><Link className="brand" href="/">시라</Link><Link href={`/clubs/${club?.id}`}>클럽으로</Link></header><article className="shell article"><div className="article-topic">{cycle?.sequence}기 · {club?.topic_sentence}</div><h1>{post.title}</h1><div className="article-byline">{author?.nickname ?? "알 수 없는 회원"} · {formatDate(post.published_at)}</div>{editable && <div className="article-actions"><Link href={`/posts/${post.id}/edit`}>수정</Link><form action={deletePost}><input type="hidden" name="postId" value={post.id} /><button>삭제</button></form></div>}<div className="article-body">{post.body}</div></article></main>;
}
function formatDate(value: string) { return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Seoul" }).format(new Date(value)); }
