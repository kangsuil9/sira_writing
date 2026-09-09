import type { Metadata } from "next";
import "pretendard/dist/web/variable/pretendardvariable.css";
import "./globals.css";
import "./admin.css";
import "./writing.css";
import { BottomNavigation } from "./components/bottom-navigation";
export const metadata: Metadata = { title: "시라 | 글쓰기로 돌보는 삶", description: "내면, 외면, 마음의 건강을 글쓰기로 나누는 시라 커뮤니티" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="ko"><body>{children}<BottomNavigation /></body></html>; }
