import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PostForm } from "@/app/components/post-form";
export default async function WritePage({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser(); if (!user) redirect("/login");
  const { data: club } = await supabase.from("clubs").select("id,topic_sentence,status").eq("id", clubId).single();
  if (!club) notFound();
  if (club.status !== "ACTIVE") redirect(`/clubs/${clubId}`);
  return <main><header className="shell header"><Link className="brand" href="/">시라</Link><Link href={`/clubs/${clubId}`}>나가기</Link></header><section className="shell editor-head"><span className="eyebrow">WRITE</span><h1>{club.topic_sentence}</h1></section><section className="shell editor-wrap"><PostForm clubId={clubId} /></section></main>;
}
