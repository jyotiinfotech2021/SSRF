"use client";
import type { FormHTMLAttributes } from "react";

/** A GET form that applies itself as soon as a filter changes (select, checkbox), so filters need no Apply button. */
export default function AutoForm(props: FormHTMLAttributes<HTMLFormElement>) {
  return <form {...props} method="get" onChange={(e) => { const t = e.target as HTMLElement; if (t.tagName === "SELECT" || (t as HTMLInputElement).type === "checkbox") e.currentTarget.requestSubmit(); }} />;
}
