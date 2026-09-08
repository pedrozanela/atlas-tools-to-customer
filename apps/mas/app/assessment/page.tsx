import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { AssessmentMenuContent } from "@/components/assessment-menu-content";

export default function AssessmentMenuPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 size={32} className="animate-spin text-[var(--color-muted-foreground)]" />
        </div>
      }
    >
      <AssessmentMenuContent />
    </Suspense>
  );
}
