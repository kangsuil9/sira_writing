import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { HomeContentForm } from "./home-content-form";

const defaults = {
  hero_title: "누구나 읽는다.\n하지만 아무나 안쓴다.",
  hero_description:
    "내 속에 나를 꺼내 나를 완성해보세요. 나다움과 나만의 특별함을 보여주세요.",
  hero_image_url: "/images/home-writing-hero-v1.png",
};

export default async function AdminHomePage() {
  const supabase = await createClient();
  const user = await getCurrentUser(supabase);
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "ADMIN") redirect("/");

  const { data: homeContent } = await supabase
    .from("home_content")
    .select("hero_title,hero_description,hero_image_url")
    .eq("id", 1)
    .maybeSingle();

  return (
    <main>
      <header className="shell header">
        <Link className="brand" href="/">시라</Link>
        <div className="header-actions">
          <Link href="/admin/clubs">클럽 관리</Link>
          <Link href="/">홈으로</Link>
        </div>
      </header>
      <section className="shell admin-head">
        <span className="eyebrow">ADMIN</span>
        <h1>홈 화면 관리</h1>
        <p>홈의 대표 문구와 사진을 코드 수정 없이 변경할 수 있어요.</p>
      </section>
      <section className="shell admin-grid single admin-home-grid">
        <HomeContentForm content={homeContent ?? defaults} />
      </section>
    </main>
  );
}
