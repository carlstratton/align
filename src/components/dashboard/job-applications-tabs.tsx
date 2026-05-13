"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ManualCvUploadTab } from "@/components/dashboard/manual-cv-upload-tab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type TabValue = "applicants" | "manual";

export function JobApplicationsTabs({
  jobId,
  defaultTab,
  applicantsPanel,
}: {
  jobId: string;
  defaultTab: TabValue;
  applicantsPanel: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [tab, setTab] = React.useState<TabValue>(defaultTab);

  React.useEffect(() => {
    setTab(searchParams.get("tab") === "manual" ? "manual" : "applicants");
  }, [searchParams]);

  function onValueChange(next: string) {
    const v: TabValue = next === "manual" ? "manual" : "applicants";
    setTab(v);
    const params = new URLSearchParams(searchParams.toString());
    if (v === "manual") {
      params.set("tab", "manual");
    } else {
      params.delete("tab");
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <Tabs value={tab} onValueChange={onValueChange} className="w-full gap-4">
      <TabsList className="w-full max-w-md sm:w-fit">
        <TabsTrigger value="applicants" className="flex-1 sm:flex-none">
          Applicants
        </TabsTrigger>
        <TabsTrigger value="manual" className="flex-1 sm:flex-none">
          Manual upload
        </TabsTrigger>
      </TabsList>
      <TabsContent value="applicants" className="mt-4 flex flex-col gap-4">
        {applicantsPanel}
      </TabsContent>
      <TabsContent value="manual" className="mt-4">
        <ManualCvUploadTab jobId={jobId} />
      </TabsContent>
    </Tabs>
  );
}
