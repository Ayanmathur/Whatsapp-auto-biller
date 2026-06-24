"use client";

import { useEffect } from "react";

export function PrintPreviewClient() {
  useEffect(() => {
    // Wait a short moment to ensure fonts/images are loaded
    const timer = setTimeout(() => {
      window.print();
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return null;
}
