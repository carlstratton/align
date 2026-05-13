import * as React from "react";

import { cn } from "@/lib/utils";

function TypographyH1({ className, ...props }: React.ComponentProps<"h1">) {
  return (
    <h1
      className={cn(
        "scroll-m-20 text-2xl font-semibold tracking-tight text-balance text-foreground sm:text-3xl",
        className,
      )}
      {...props}
    />
  );
}

function TypographyH2({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <h2
      className={cn(
        "scroll-m-20 border-b border-border pb-2 text-xl font-semibold tracking-tight text-foreground first:mt-0 sm:text-2xl",
        className,
      )}
      {...props}
    />
  );
}

function TypographyH3({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      className={cn(
        "scroll-m-20 text-base font-semibold tracking-tight text-foreground sm:text-lg",
        className,
      )}
      {...props}
    />
  );
}

function TypographyH4({ className, ...props }: React.ComponentProps<"h4">) {
  return (
    <h4
      className={cn("scroll-m-20 text-sm font-semibold tracking-tight text-foreground", className)}
      {...props}
    />
  );
}

function TypographyP({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p className={cn("leading-7 text-foreground [&:not(:first-child)]:mt-4", className)} {...props} />
  );
}

function TypographyBlockquote({ className, ...props }: React.ComponentProps<"blockquote">) {
  return (
    <blockquote
      className={cn("mt-4 border-l-2 border-border pl-4 italic text-muted-foreground", className)}
      {...props}
    />
  );
}

function TypographyList({ className, ...props }: React.ComponentProps<"ul">) {
  return <ul className={cn("my-4 ml-4 list-disc [&>li]:mt-2", className)} {...props} />;
}

function TypographyOrderedList({ className, ...props }: React.ComponentProps<"ol">) {
  return <ol className={cn("my-4 ml-4 list-decimal [&>li]:mt-2", className)} {...props} />;
}

function TypographyListItem({ className, ...props }: React.ComponentProps<"li">) {
  return <li className={cn("marker:text-muted-foreground", className)} {...props} />;
}

function TypographyInlineCode({ className, ...props }: React.ComponentProps<"code">) {
  return (
    <code
      className={cn(
        "relative rounded-md bg-muted px-[0.35rem] align-middle font-mono text-[0.875em] font-medium text-foreground",
        className,
      )}
      {...props}
    />
  );
}

function TypographyLead({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("text-xl text-muted-foreground", className)} {...props} />;
}

function TypographyLarge({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("text-lg font-semibold text-foreground", className)} {...props} />;
}

function TypographySmall({ className, ...props }: React.ComponentProps<"small">) {
  return <small className={cn("text-sm font-medium leading-none", className)} {...props} />;
}

function TypographyMuted({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

function TypographyTable({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div className="my-6 w-full overflow-x-auto">
      <table className={cn("w-full caption-bottom text-sm", className)} {...props} />
    </div>
  );
}

function TypographyTableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return <thead className={cn("[&_tr]:border-b border-border", className)} {...props} />;
}

function TypographyTableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody className={cn("[&_tr:last-child]:border-0 [&_tr]:border-b border-border", className)} {...props} />
  );
}

function TypographyTableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return <tr className={cn("transition-colors hover:bg-muted/50", className)} {...props} />;
}

function TypographyTableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      className={cn(
        "h-10 px-2 text-left align-middle font-medium text-foreground [&:has([role=checkbox])]:pr-0",
        className,
      )}
      {...props}
    />
  );
}

function TypographyTableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td className={cn("p-2 align-middle text-foreground [&:has([role=checkbox])]:pr-0", className)} {...props} />
  );
}

export {
  TypographyH1,
  TypographyH2,
  TypographyH3,
  TypographyH4,
  TypographyP,
  TypographyBlockquote,
  TypographyList,
  TypographyOrderedList,
  TypographyListItem,
  TypographyInlineCode,
  TypographyLead,
  TypographyLarge,
  TypographySmall,
  TypographyMuted,
  TypographyTable,
  TypographyTableHeader,
  TypographyTableBody,
  TypographyTableRow,
  TypographyTableHead,
  TypographyTableCell,
};
