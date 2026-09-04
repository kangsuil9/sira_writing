import Link from "next/link";
export default function AuthErrorPage() {
  return <main className="login-page"><section className="login-card"><div className="brand">시라</div><h1>로그인을 완료하지 못했어요</h1><p>잠시 후 다시 시도해 주세요.</p><Link className="kakao" style={{display:"block"}} href="/login">로그인으로 돌아가기</Link></section></main>;
}
