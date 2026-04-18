"use client";

import Link from "next/link";
import { useState } from "react";
import { Avatar } from "./avatar";
import { formatInr, formatInrSigned } from "@/lib/format";

export type GroupCardMember = { id: string; name: string };

type Props = {
  id: string;
  name: string;
  members: GroupCardMember[];
  expenseCount: number;
  totalInr: number;
  myBalance: number | null;
  tag?: string | null;
  updatedLabel?: string | null;
  idx?: number;
};

export function GroupCard({
  id,
  name,
  members,
  expenseCount,
  totalInr,
  myBalance,
  tag,
  updatedLabel,
  idx = 0,
}: Props) {
  const [hover, setHover] = useState(false);
  const visible = members.slice(0, 5);
  const extra = members.length - visible.length;

  return (
    <Link
      href={`/groups/${id}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="card card-interactive stagger"
      style={{
        ["--i" as string]: idx,
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        position: "relative",
        overflow: "hidden",
        textDecoration: "none",
        color: "var(--ink)",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: 80,
          height: 80,
          background: "radial-gradient(circle at top right, var(--accent-wash), transparent 70%)",
          opacity: hover ? 1 : 0,
          transition: "opacity 0.3s",
          pointerEvents: "none",
        }}
      />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative" }}>
        <span
          className="eyebrow"
          style={{
            padding: "4px 8px",
            borderRadius: 999,
            background: tag === "recurring" ? "var(--surface-2)" : "var(--accent-wash)",
            color: tag === "recurring" ? "var(--ink-3)" : "var(--accent)",
          }}
        >
          {tag ?? "active"}
        </span>
        {updatedLabel && (
          <span style={{ fontSize: 10, color: "var(--ink-3)", fontFamily: "var(--font-mono)" }}>{updatedLabel}</span>
        )}
      </div>
      <div style={{ position: "relative" }}>
        <div
          className="serif"
          style={{ fontSize: 26, color: "var(--ink)", letterSpacing: "-0.02em", marginBottom: 4, lineHeight: 1.1 }}
        >
          {name}
        </div>
        <div style={{ fontSize: 12, color: "var(--ink-3)", fontFamily: "var(--font-mono)" }}>
          {expenseCount} {expenseCount === 1 ? "entry" : "entries"} · {formatInr(totalInr)}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: "auto",
          position: "relative",
        }}
      >
        <div style={{ display: "flex" }}>
          {visible.map((m, i) => (
            <div
              key={m.id}
              style={{
                marginLeft: i === 0 ? 0 : -10,
                transform: hover ? `translateX(${i * 2}px)` : "translateX(0)",
                transition: `transform 0.3s cubic-bezier(0.2,0.8,0.2,1) ${i * 30}ms`,
              }}
            >
              <Avatar name={m.name} id={m.id} size={26} ring />
            </div>
          ))}
          {extra > 0 && (
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: "50%",
                marginLeft: -10,
                background: "var(--surface-2)",
                border: "2px solid var(--card)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                color: "var(--ink-3)",
                fontWeight: 500,
              }}
            >
              +{extra}
            </div>
          )}
        </div>
        {myBalance !== null && (
          <div
            className="mono tnum"
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: myBalance >= 0 ? "var(--pos)" : "var(--neg)",
              transform: hover ? "translateX(-4px)" : "translateX(0)",
              transition: "transform 0.2s",
            }}
          >
            {formatInrSigned(myBalance)}
          </div>
        )}
      </div>
    </Link>
  );
}
