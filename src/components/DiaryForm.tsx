import { useState } from "react";
export function DiaryForm({
  date,
  initialText,
  onSave,
}: {
  date: string;
  initialText: string;
  onSave: (text: string) => Promise<boolean>;
}) {
  const [text, setText] = useState(initialText),
    [saving, setSaving] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (saving) return;
        setSaving(true);
        try {
          await onSave(text);
        } finally {
          setSaving(false);
        }
      }}
    >
      <label>
        日记内容
        <textarea
          name="diary"
          aria-label="日记内容"
          required
          maxLength={20000}
          rows={10}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="今天发生了什么，有哪些想记下来的事？"
        />
      </label>
      <p className="muted">{date} · 只保存在你的本地手账</p>
      <button className="primary wide" disabled={saving || !text.trim()}>
        {saving ? "正在保存…" : "保存日记"}
      </button>
    </form>
  );
}
