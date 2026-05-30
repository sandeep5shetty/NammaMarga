"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/utils";
import { Loader2, MapPin, Navigation } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export type PlaceSelection = {
  name: string;
  placeName: string;
  latitude: number;
  longitude: number;
};

type PlaceSearchProps = {
  id: string;
  label: string;
  placeholder: string;
  value: PlaceSelection | null;
  onChange: (place: PlaceSelection | null) => void;
  icon?: "source" | "destination";
  className?: string;
};

export function PlaceSearch({
  id,
  label,
  placeholder,
  value,
  onChange,
  icon = "source",
  className,
}: PlaceSearchProps) {
  const [query, setQuery] = useState(value?.placeName ?? "");
  const [results, setResults] = useState<PlaceSelection[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value?.placeName) setQuery(value.placeName);
  }, [value?.placeName]);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
      const json = await res.json();
      setResults(
        (json.data ?? []).map(
          (r: { name: string; placeName: string; latitude: number; longitude: number }) => ({
            name: r.name,
            placeName: r.placeName,
            latitude: r.latitude,
            longitude: r.longitude,
          }),
        ),
      );
      setOpen(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInput = (text: string) => {
    setQuery(text);
    onChange(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(text), 320);
  };

  const selectPlace = (place: PlaceSelection) => {
    setQuery(place.placeName);
    onChange(place);
    setOpen(false);
    setResults([]);
  };

  const Icon = icon === "source" ? Navigation : MapPin;

  return (
    <div ref={containerRef} className={cn("relative space-y-1.5", className)}>
      <Label htmlFor={id} className="text-xs flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className="h-10 pr-9"
          autoComplete="off"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>
      {value && (
        <p className="text-[10px] text-muted-foreground truncate">
          {value.latitude.toFixed(4)}, {value.longitude.toFixed(4)}
        </p>
      )}
      {open && results.length > 0 && (
        <ul className="absolute z-50 top-full mt-1 w-full rounded-lg border border-border bg-popover shadow-lg max-h-52 overflow-auto">
          {results.map((r) => (
            <li key={`${r.placeName}-${r.latitude}`}>
              <button
                type="button"
                className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted transition-colors border-b border-border/50 last:border-0"
                onClick={() => selectPlace(r)}
              >
                <span className="font-medium block truncate">{r.name}</span>
                <span className="text-xs text-muted-foreground line-clamp-1">{r.placeName}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
