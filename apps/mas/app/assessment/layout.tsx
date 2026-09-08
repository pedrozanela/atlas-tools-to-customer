import { Suspense } from "react";
import { AssessmentSidebar } from "@/components/assessment-sidebar";

export default function AssessmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <Suspense fallback={<div className="w-64 shrink-0" />}>
        <AssessmentSidebar />
      </Suspense>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
