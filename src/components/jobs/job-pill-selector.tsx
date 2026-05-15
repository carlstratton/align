"use client";

import type { PillSection, PillSectionId, PillSelections } from "@/lib/job-pill-taxonomy";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type JobPillSelectorProps = {
  sections: PillSection[];
  value: PillSelections;
  onChange: (value: PillSelections) => void;
};

export function JobPillSelector({ sections, value, onChange }: JobPillSelectorProps) {
  function togglePill(sectionId: PillSectionId, option: string) {
    const existing = value[sectionId];
    const next = existing.includes(option)
      ? existing.filter((item) => item !== option)
      : [...existing, option];

    onChange({
      ...value,
      [sectionId]: next,
    });
  }

  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <Card key={section.id}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              {section.label}
              {section.required ? <Badge variant="outline">Required</Badge> : null}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {section.options.map((option) => {
                const selected = value[section.id].includes(option);
                return (
                  <Button
                    key={option}
                    type="button"
                    variant={selected ? "default" : "outline"}
                    size="sm"
                    onClick={() => togglePill(section.id, option)}
                  >
                    {option}
                  </Button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Selected: {value[section.id].length}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
