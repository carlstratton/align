import Image from "next/image";
import Link from "next/link";
import { AuthNav } from "@/components/layout/auth-nav";

export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-12 w-full max-w-6xl items-center justify-between px-6">
          <Link
            href="/"
            className="inline-flex shrink-0 items-center self-center leading-none"
            aria-label="Align.ai home"
          >
            <Image
              src="/marketing/logo.svg"
              alt="Align.ai"
              width={60}
              height={24}
              priority
              className="block h-6 w-auto"
            />
          </Link>
          <nav className="flex items-center gap-5 text-sm text-muted-foreground">
            <AuthNav />
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 bg-white px-6 py-8">{children}</main>
    </>
  );
}
