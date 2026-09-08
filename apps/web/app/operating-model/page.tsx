import type { Metadata } from "next";
import { OperatingModelPage } from "@/components/operating-model-page";

export const metadata: Metadata = {
  title: "Platform Operating Model — Atlas",
  description:
    "Modelo operacional, papéis e matriz de responsabilidades para a Databricks Data Intelligence Platform.",
};

export default function Page() {
  return <OperatingModelPage />;
}
