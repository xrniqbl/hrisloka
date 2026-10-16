"use client";;
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function parseDate(value) {
  if (!value) return undefined;
  const [year, month, day] = String(value).split("-").map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

function formatValue(date) {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatLabel(value, locale = "id-ID") {
  const date = parseDate(value);
  if (!date) return "";
  return date.toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pilih tanggal",
  locale = "id-ID",
  className,
  buttonClassName,
  disabled,
}) {
  const selected = parseDate(value);

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-start font-normal h-[38px] rounded-[10px] border border-[#E8E8EE] bg-white shadow-none hover:bg-[#FAFAFB] hover:border-[#D4D4DC]",
              !value && "text-muted-foreground",
              buttonClassName
            )}
            disabled={disabled}
          >
            <CalendarIcon />
            {value ? formatLabel(value, locale) : placeholder}
          </Button>
        }
      />
      <PopoverContent align="start" className={cn("w-auto p-0", className)}>
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => onChange?.(formatValue(date))}
          captionLayout="dropdown"
        />
      </PopoverContent>
    </Popover>
  );
}
