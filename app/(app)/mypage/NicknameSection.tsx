"use client";

import { useState } from "react";
import NicknameEditForm from "./NicknameEditForm";

export default function NicknameSection({
  nickname,
  fallbackName,
}: {
  nickname: string | null | undefined;
  fallbackName: string | null | undefined;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-xs text-brown-light hover:text-brown px-3 py-1.5 rounded-full border border-stone hover:bg-sand transition-colors"
      >
        닉네임 변경
      </button>

      {editing && (
        <NicknameEditForm
          currentNickname={nickname ?? fallbackName ?? ""}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  );
}
