"use client";

import { useRef, useState } from "react";

interface MediaInputProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  accept?: "image" | "video" | "both";
  placeholder?: string;
  previewClass?: string;
}

export default function MediaInput({
  label,
  value,
  onChange,
  accept = "image",
  placeholder,
  previewClass,
}: MediaInputProps) {
  const [uploading, setUploading] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  const acceptStr =
    accept === "image" ? "image/*" : accept === "video" ? "video/*" : "image/*,video/*";

  const isVideo = value ? /\.(mp4|webm|mov|ogg|avi)(\?|$)/i.test(value) : false;

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (data.url) onChange(data.url);
    setUploading(false);
    e.target.value = "";
  }

  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
        {label}
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? "https://... o sube un archivo"}
          className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#33172c] focus:ring-2 focus:ring-[#33172c]/10 transition"
        />
        <input type="file" accept={acceptStr} ref={ref} className="hidden" onChange={handleFile} />
        <button
          type="button"
          title={`Subir ${accept === "video" ? "video" : accept === "both" ? "archivo" : "imagen"}`}
          onClick={() => ref.current?.click()}
          disabled={uploading}
          className="px-3 border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 disabled:opacity-50 flex items-center transition-colors"
        >
          {uploading ? (
            <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <span className="material-symbols-outlined text-[16px]">upload</span>
          )}
        </button>
      </div>
      {value && (
        isVideo ? (
          <video
            src={value}
            controls
            className={previewClass ?? "mt-2 h-32 w-full rounded-xl object-cover"}
          />
        ) : (
          <img
            src={value}
            alt="preview"
            className={previewClass ?? "mt-2 h-24 w-full object-cover rounded-xl"}
          />
        )
      )}
    </div>
  );
}
