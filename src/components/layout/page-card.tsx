import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { TypographyH1, TypographyMuted } from "@/components/ui/typography";

type PageCardProps = {
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
};

export function PageCard({ title, description, children, className }: PageCardProps) {
  return (
    <Card className={cn("mx-auto w-full", className)}>
      <CardHeader>
        <TypographyH1>{title}</TypographyH1>
        {description ? <TypographyMuted className="mt-1.5">{description}</TypographyMuted> : null}
      </CardHeader>
      {children ? <CardContent>{children}</CardContent> : null}
    </Card>
  );
}
