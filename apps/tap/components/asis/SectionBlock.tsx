"use client";

import CreatableSelect from "react-select/creatable";
import { useAppStore } from "@/lib/store";
import { selectStyles } from "@/lib/selectStyles";
import { sanitizeCategory } from "@/lib/utils";

// One canvas cell: dark header bar with the category name, multi-select
// dropdown below, then selected tools rendered as logo + name cards.
// Replaces the old grid-cell ToolCard from the original TAP UI.

interface SectionBlockProps {
  category: string;
  availableTools: string[];
}

const BASE_PATH = "/tap";

export default function SectionBlock({
  category,
  availableTools,
}: SectionBlockProps) {
  const tools = useAppStore((s) => s.tools);
  const setTools = useAppStore((s) => s.setTools);

  const sanitized = sanitizeCategory(category);
  const selected = tools[category] ?? [];
  const options = availableTools.map((t) => ({ value: t, label: t }));

  function iconUrl(tool: string): string {
    const filename = tool.toLowerCase().replace(/ /g, "_");
    const folder = encodeURIComponent(sanitized);
    return `${BASE_PATH}/static/data_tools/${folder}/${filename}.png`;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="bg-foreground text-canvas text-xs font-semibold tracking-wide px-3 py-1.5 rounded-t-sm">
        {category}
      </div>
      <div className="flex flex-col gap-2 p-2 bg-surface/60 rounded-b-sm border border-t-0 border-raised flex-1 min-h-[110px]">
        <CreatableSelect
          isMulti
          closeMenuOnSelect={false}
          options={options}
          value={selected.map((t) => ({ value: t, label: t }))}
          onChange={(opts) =>
            setTools(
              category,
              (opts as { value: string }[]).map((o) => o.value),
            )
          }
          placeholder="Select or type tools…"
          styles={selectStyles}
          formatCreateLabel={(inputValue) => `Add "${inputValue}"`}
          isDisabled={availableTools.length === 0}
        />

        {selected.length > 0 && (
          <div className="grid grid-cols-3 gap-1.5">
            {selected.map((tool) => (
              <div
                key={tool}
                className="flex flex-col items-center gap-1 rounded-md bg-surface p-1.5 shadow-[var(--shadow-card)] ring-1 ring-raised"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={iconUrl(tool)}
                  alt={tool}
                  title={tool}
                  className="h-8 w-8 object-contain"
                  onError={(e) => {
                    e.currentTarget.src = `${BASE_PATH}/static/other_assets/creativity.png`;
                  }}
                />
                <span className="text-[9px] leading-tight text-foreground/60 text-center line-clamp-2">
                  {tool}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
