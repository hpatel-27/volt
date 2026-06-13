import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "../../lib/cn";
import { OptionalTag } from "./OptionalTag";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  invalid?: boolean;
  optional?: boolean;
}

const fieldBase =
  "w-full bg-ink-850 border border-white/5 rounded-xl px-4 h-11 text-bone-50 placeholder:text-bone-600 " +
  "focus:outline-none focus:border-volt-500/60 focus:bg-ink-800 transition-colors";

export function Input({
  label,
  hint,
  invalid,
  optional,
  className,
  ...rest
}: InputProps) {
  return (
    <label className="flex flex-col gap-1.5 w-full">
      {label && (
        <span className="text-caption">
          {label}
          {optional && <OptionalTag />}
        </span>
      )}
      <input
        {...rest}
        className={cn(fieldBase, invalid && "border-blaze-500/60", className)}
      />
      {hint && (
        <span className={cn("text-xs", invalid ? "text-blaze-400" : "text-bone-500")}>
          {hint}
        </span>
      )}
    </label>
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export function Textarea({ label, className, ...rest }: TextareaProps) {
  return (
    <label className="flex flex-col gap-1.5 w-full">
      {label && <span className="text-caption">{label}</span>}
      <textarea
        {...rest}
        className={cn(fieldBase, "h-auto py-3 resize-y min-h-24", className)}
      />
    </label>
  );
}
