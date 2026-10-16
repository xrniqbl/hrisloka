"use client";;
import { cn } from "@/lib/utils";
import { selectTriggerVariants } from "@/components/ui/select";

export function NativeSelect({ className, size = "default", children, ...props }) {
  return (
    <span className={cn("relative inline-flex w-full", className)}>
      <select
        className={cn(
          selectTriggerVariants({ size }),
          "appearance-none pe-9 [&_option]:bg-background [&_option]:text-foreground"
        )}
        {...props}
      >
        {children}
      </select>
    </span>
  );
}
