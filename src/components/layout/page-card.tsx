import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
        <CardTitle className="text-lg">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      {children ? <CardContent>{children}</CardContent> : null}
    </Card>
  );
}
