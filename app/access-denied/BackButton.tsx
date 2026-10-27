"use client";

import { ArrowLeft } from "lucide-react";

export default function BackButton() {
  const handleBack = () => {
    window.history.back();
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
    >
      <ArrowLeft className="h-4 w-4" />
      Back
    </button>
  );
}