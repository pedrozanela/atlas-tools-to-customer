"use client";

import Select from "react-select";
import { Cloud } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { selectStyles } from "@/lib/selectStyles";

interface CloudProviderFieldProps {
  cloudProviders: string[];
}

export default function CloudProviderField({
  cloudProviders,
}: CloudProviderFieldProps) {
  const cloud_provider = useAppStore((s) => s.cloud_provider);
  const setCloudProvider = useAppStore((s) => s.setCloudProvider);

  const options = cloudProviders.map((p) => ({ value: p, label: p }));

  return (
    <div className="rounded-md border border-raised bg-surface px-4 py-3 shadow-[var(--shadow-card)]">
      <div className="text-xs text-foreground/60 mb-2 inline-flex items-center gap-1.5">
        <Cloud className="h-3.5 w-3.5" /> Cloud Provider
      </div>
      <Select
        isMulti
        closeMenuOnSelect={false}
        options={options}
        value={cloud_provider.map((p) => ({ value: p, label: p }))}
        onChange={(opts) =>
          setCloudProvider((opts as { value: string }[]).map((o) => o.value))
        }
        placeholder="Select cloud providers…"
        styles={selectStyles}
      />
    </div>
  );
}
