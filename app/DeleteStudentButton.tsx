"use client";

import { useState } from "react";
// Adjust this import to wherever your app creates its Supabase client:
import { supabase } from "@/lib/supabase";

export default function DeleteStudentButton({
  userId,
  name,
  onDeleted,
}: {
  userId: string;
  name: string;
  onDeleted?: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    const ok = window.confirm(
      `Delete ${name}?\n\nThis permanently removes their login (email and password) and all their details. They will no longer be able to sign in. This cannot be undone.`
    );
    if (!ok) return;

    setBusy(true);
    try {
      const { data } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/delete-student", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.session?.access_token}`,
        },
        body: JSON.stringify({ userId }),
      });
      const out = await res.json();
      if (!res.ok) throw new Error(out.error || "Delete failed");
      onDeleted?.(); // e.g. refresh the student list
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={busy}
      style={{
        background: "#b3261e",
        color: "#fff",
        border: 0,
        borderRadius: 8,
        padding: "8px 14px",
        cursor: busy ? "default" : "pointer",
        opacity: busy ? 0.6 : 1,
      }}
    >
      {busy ? "Deleting…" : "Delete student"}
    </button>
  );
}
