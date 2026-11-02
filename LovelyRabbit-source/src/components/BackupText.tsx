import { useState } from "react";
import type { State } from "../model";
import { parseBackup } from "../model";
export function BackupText({
  value,
  onNotify,
}: {
  value: string;
  onNotify: (s: string) => void;
}) {
  return (
    <>
      <p className="muted">
        如果浏览器没有保存下载文件，可复制完整内容，存入自己的安全笔记或文本文件。备份包含你的个人记录和图片。
      </p>
      <label>
        完整 JSON 备份
        <textarea
          aria-label="完整 JSON 备份"
          readOnly
          value={value}
          rows={8}
          onFocus={(e) => e.currentTarget.select()}
        />
      </label>
      <button
        className="primary wide"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            onNotify("完整备份已复制，请保存到安全位置");
          } catch {
            onNotify("请长按文本框，全选并复制完整内容");
          }
        }}
      >
        复制完整备份
      </button>
    </>
  );
}
export function PasteBackup({
  onImport,
  onNotify,
}: {
  onImport: (s: State) => void;
  onNotify: (s: string) => void;
}) {
  const [text, setText] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        try {
          onImport(parseBackup(text));
        } catch {
          onNotify("备份格式、版本或积分记录不正确，原有数据未更改");
        }
      }}
    >
      <label>
        粘贴完整 JSON
        <textarea
          aria-label="粘贴完整 JSON"
          value={text}
          onChange={(e) => setText(e.target.value)}
          required
          rows={8}
          maxLength={15000000}
        />
      </label>
      <p className="muted">验证通过后会再次确认，尚未写入任何数据。</p>
      <button className="primary wide">检查并恢复备份</button>
    </form>
  );
}
