"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { AccountNavLinks } from "@/components/layout/account-nav-links";
import { cn } from "@/lib/utils";

type MobileNavProps = {
  signedIn: boolean;
  className?: string;
};

export function MobileNav({ signedIn, className }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousFocus = document.activeElement;
    const firstLink = panelRef.current?.querySelector<HTMLElement>("a, button");
    firstLink?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (previousFocus instanceof HTMLElement) {
        previousFocus.focus();
      }
    };
  }, [open]);

  return (
    <div className={cn("relative shrink-0 self-center lg:hidden", className)}>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Close menu" : "Open menu"}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-900"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="sr-only">Menu</span>
        <span className="flex flex-col gap-1.5">
          <span className="block h-0.5 w-5 bg-current" />
          <span className="block h-0.5 w-5 bg-current" />
        </span>
      </button>

      {open ? (
        <div
          id={panelId}
          ref={panelRef}
          className="absolute right-0 top-12 z-20 min-w-48 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg"
        >
          <AccountNavLinks
            signedIn={signedIn}
            className="flex flex-col gap-3"
            linkClassName="text-base text-slate-900"
          />
          {!signedIn ? (
            <Link
              href="/auth/signup"
              className={cn(
                "mt-4 inline-flex w-full items-center justify-center rounded-full bg-black px-4 py-2 text-sm font-medium text-white",
              )}
              onClick={() => setOpen(false)}
            >
              Start free trial
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
