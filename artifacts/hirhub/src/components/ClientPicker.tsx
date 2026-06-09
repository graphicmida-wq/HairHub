import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, UserPlus } from "lucide-react";
import type { Client } from "@workspace/api-client-react";

import { Button } from "./ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "./ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Spinner } from "./ui/spinner";
import { cn } from "../lib/utils";
import { useDebouncedValue } from "../hooks/use-debounced-value";

function clientLabel(c: Client): string {
  return `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim();
}

function apiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_URL as string | undefined;
  const fallback = import.meta.env.DEV ? "http://localhost:3001" : "";
  return (raw ?? fallback).replace(/\/+$/, "");
}

async function fetchClientSearch(q: string, signal?: AbortSignal): Promise<Client[]> {
  const base = apiBaseUrl();
  const url = new URL(`${base}/api/clients/search`, window.location.origin);
  url.searchParams.set("q", q);
  url.searchParams.set("limit", "20");
  const res = await fetch(base ? url.toString() : `${url.pathname}${url.search}`, { signal });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return (await res.json()) as Client[];
}

export function ClientPicker({
  value,
  onChange,
  onCreateNew,
  disabled,
}: {
  value: Client | null;
  onChange: (client: Client) => void;
  onCreateNew: () => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const debouncedQuery = useDebouncedValue(query, 200);

  const minChars = 2;
  const { data: results = [], isFetching } = useQuery({
    queryKey: ["client-search", debouncedQuery],
    enabled: open && debouncedQuery.trim().length >= minChars,
    queryFn: ({ signal }) => fetchClientSearch(debouncedQuery.trim(), signal),
    staleTime: 10_000,
  });

  const placeholder = "Cerca cliente…";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between rounded-xl border-stone-200 bg-stone-50 px-4 py-2.5 text-left font-normal hover:bg-stone-50",
            !value && "text-stone-500",
          )}
        >
          <span className="truncate">{value ? clientLabel(value) : placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false} className="h-auto">
          <CommandInput
            placeholder="Cerca per nome o telefono…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandGroup>
              <CommandItem
                onSelect={() => {
                  setOpen(false);
                  onCreateNew();
                }}
              >
                <UserPlus className="h-4 w-4" />
                <span>+ Nuovo cliente</span>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Risultati">
              {debouncedQuery.trim().length < minChars ? (
                <div className="px-2 py-2 text-sm text-muted-foreground">
                  Scrivi almeno {minChars} caratteri
                </div>
              ) : null}
              {isFetching ? (
                <div className="flex items-center gap-2 px-2 py-2 text-sm text-muted-foreground">
                  <Spinner className="h-4 w-4" />
                  <span>Ricerca…</span>
                </div>
              ) : null}
              {!isFetching && debouncedQuery.trim().length >= minChars && results.length === 0 ? (
                <CommandEmpty>Nessun cliente trovato</CommandEmpty>
              ) : null}
              {results.map((c) => {
                const label = clientLabel(c);
                const isSelected = value?.id === c.id;
                return (
                  <CommandItem
                    key={c.id}
                    value={label}
                    onSelect={() => {
                      onChange(c);
                      setOpen(false);
                    }}
                  >
                    <Check className={cn("h-4 w-4", isSelected ? "opacity-100" : "opacity-0")} />
                    <span className="truncate">{label || "(Senza nome)"}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
