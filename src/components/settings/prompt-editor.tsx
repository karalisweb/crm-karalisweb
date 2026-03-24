"use client";

import { useRef, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RotateCcw } from "lucide-react";
import type { PromptPlaceholder } from "@/lib/prompts-v2";

interface PromptEditorProps {
  value: string;
  defaultValue: string;
  placeholders: PromptPlaceholder[];
  onChange: (value: string) => void;
  rows?: number;
}

export function PromptEditor({
  value,
  defaultValue,
  placeholders,
  onChange,
  rows = 20,
}: PromptEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertPlaceholder = useCallback(
    (placeholder: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;

      const newText = text.substring(0, start) + placeholder + text.substring(end);
      onChange(newText);

      // Restore cursor position after placeholder
      requestAnimationFrame(() => {
        textarea.focus();
        const newPos = start + placeholder.length;
        textarea.setSelectionRange(newPos, newPos);
      });
    },
    [onChange]
  );

  return (
    <div className="space-y-3">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="font-mono text-xs leading-relaxed"
      />

      {/* Placeholder pills */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">
          Variabili disponibili (clicca per inserire nel prompt):
        </p>
        <div className="flex flex-wrap gap-1.5">
          {placeholders.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => insertPlaceholder(p.key)}
              title={p.description}
              className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/5 px-2 py-1 text-xs font-mono text-primary hover:bg-primary/15 hover:border-primary/50 transition-colors cursor-pointer"
            >
              <span>{p.key}</span>
            </button>
          ))}
        </div>
        <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-2.5 space-y-0.5">
          {placeholders.map((p) => (
            <div key={p.key} className="flex gap-2">
              <code className="text-primary font-mono shrink-0">{p.key}</code>
              <span className="text-muted-foreground">— {p.description}</span>
            </div>
          ))}
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => onChange(defaultValue)}
      >
        <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
        Ripristina Default
      </Button>
    </div>
  );
}
