"use client";

import { createPortal } from "react-dom";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

// Portal-rendered action menu.
//
// The previous in-place `<div position:absolute>` inside each row got
// trapped by the row's .stagger animation — an animation/transform creates
// a stacking context, so the popover was stuck below sibling rows
// regardless of its z-index. Portaling to document.body escapes all of
// that and gives us a truly opaque, top-layer surface.
//
// Position is recomputed on open + on window scroll/resize so the menu
// tracks its trigger as the user scrolls the admin page.
export function ActionMenu({
  open,
  onClose,
  anchorRef,
  children,
  minWidth = 220,
}: {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  children: ReactNode;
  minWidth?: number;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  // Compute position from the anchor's bounding rect. right-align the menu
  // to the anchor so a trigger near the viewport edge doesn't push the
  // popover off-screen.
  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return;
    const place = () => {
      const rect = anchorRef.current!.getBoundingClientRect();
      const top = rect.bottom + 6 + window.scrollY;
      const right = window.scrollX + rect.right;
      const left = right - minWidth;
      setPos({ top, left: Math.max(8, left) });
    };
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, anchorRef, minWidth]);

  // Outside-click + Escape. pointerdown fires before click, so tapping a
  // sibling trigger closes this menu before the other one opens.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      const inMenu = menuRef.current?.contains(t);
      const inAnchor = anchorRef.current?.contains(t);
      if (!inMenu && !inAnchor) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, anchorRef]);

  if (!open || !pos || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      style={{
        position: "absolute",
        top: pos.top,
        left: pos.left,
        minWidth,
        background: "var(--card)",
        border: "1px solid var(--rule)",
        borderRadius: 12,
        boxShadow: "var(--shadow-md)",
        padding: 6,
        zIndex: 1000,
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
