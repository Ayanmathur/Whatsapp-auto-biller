"use client";

import { useEffect } from "react";

export function PrintPreviewClient() {
  useEffect(() => {
    const imgs = document.querySelectorAll('img');
    const printWhenReady = () => {
      setTimeout(() => window.print(), 100);
    };
    
    if (imgs.length === 0) {
      printWhenReady();
      return;
    }
    
    let loadedCount = 0;
    let fired = false;
    
    const checkReady = () => {
      if (fired) return;
      loadedCount++;
      if (loadedCount >= imgs.length) {
        fired = true;
        printWhenReady();
      }
    };

    imgs.forEach(img => {
      if (img.complete) {
        checkReady();
      } else {
        img.onload = checkReady;
        img.onerror = checkReady;
      }
    });

    // Fallback just in case
    const timer = setTimeout(() => {
      if (!fired) {
        fired = true;
        printWhenReady();
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  return null;
}
