"use client";

import { useEffect, useId, useRef, useState } from "react";

import { inputClasses } from "@/components/ui/forms";

type SearchSelectOption = {
  id: string;
  label: string;
  keywords?: string;
};

export function SearchSelect({
  name,
  required,
  options,
  defaultValue = "",
  placeholder,
  emptyMessage = "No matches found.",
}: {
  name: string;
  required?: boolean;
  options: SearchSelectOption[];
  defaultValue?: string;
  placeholder: string;
  emptyMessage?: string;
}) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const defaultOption = options.find((option) => option.id === defaultValue) ?? null;
  const [query, setQuery] = useState(defaultOption?.label ?? "");
  const [selectedId, setSelectedId] = useState(defaultOption?.id ?? "");
  const [isOpen, setIsOpen] = useState(false);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions = normalizedQuery
    ? options.filter((option) => {
        const haystack = `${option.label} ${option.keywords ?? ""}`.toLowerCase();
        return haystack.includes(normalizedQuery);
      })
    : options;

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    const form = rootRef.current?.closest("form");
    if (!form) {
      return;
    }

    function handleReset() {
      const nextDefaultOption = options.find((option) => option.id === defaultValue) ?? null;
      setQuery(nextDefaultOption?.label ?? "");
      setSelectedId(nextDefaultOption?.id ?? "");
      setIsOpen(false);
    }

    form.addEventListener("reset", handleReset);
    return () => form.removeEventListener("reset", handleReset);
  }, [defaultValue, options]);

  function selectOption(option: SearchSelectOption) {
    setQuery(option.label);
    setSelectedId(option.id);
    setIsOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <input type="hidden" name={name} value={selectedId} required={required} />
      <input
        value={query}
        onFocus={() => setIsOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setSelectedId("");
          setIsOpen(true);
        }}
        placeholder={placeholder}
        className={inputClasses()}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-haspopup="listbox"
      />

      {isOpen ? (
        <div
          id={listboxId}
          role="listbox"
          className="absolute z-20 mt-2 max-h-56 w-full overflow-y-auto rounded-2xl border border-emerald-200 bg-white p-1.5 shadow-xl"
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.slice(0, 8).map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => selectOption(option)}
                className={`block w-full rounded-xl px-3 py-2 text-left text-sm text-zinc-800 hover:bg-emerald-50 ${
                  selectedId === option.id ? "bg-emerald-50 font-semibold" : ""
                }`}
              >
                {option.label}
              </button>
            ))
          ) : (
            <p className="px-3 py-2 text-sm text-zinc-500">{emptyMessage}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
