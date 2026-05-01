"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import type { listClientOptions, listProperties } from "@/lib/db/properties";
import { PageHeader } from "@/components/ui/page-header";
import { PropertyForm } from "@/app/(app)/properties/property-form";
import { createPropertySheetAction, type CreatePropertyFormState } from "@/app/(app)/properties/actions";

import { PropertyDashboard } from "./property-dashboard";

type Properties = Awaited<ReturnType<typeof listProperties>>;
type Clients = Awaited<ReturnType<typeof listClientOptions>>;

export function PropertiesPageShell({
  properties,
  clients,
  mapProvider,
  mapboxToken,
  canRoute,
}: {
  properties: Properties;
  clients: Clients;
  mapProvider: "mapbox" | "osm";
  mapboxToken?: string;
  canRoute: boolean;
}) {
  const router = useRouter();
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const closeTimeoutRef = useRef<number | null>(null);
  const openFrameRef = useRef<number | null>(null);
  const [isNewPropertyOpen, setIsNewPropertyOpen] = useState(false);
  const [isSheetMounted, setIsSheetMounted] = useState(false);
  const [isSheetVisible, setIsSheetVisible] = useState(false);
  const [flashMessage, setFlashMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isNewPropertyOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeNewPropertySheet();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isNewPropertyOpen]);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        window.clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }

      if (openFrameRef.current) {
        window.cancelAnimationFrame(openFrameRef.current);
        openFrameRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!flashMessage) {
      return;
    }

    const timeout = window.setTimeout(() => setFlashMessage(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [flashMessage]);

  function openNewPropertySheet() {
    if (closeTimeoutRef.current) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }

    setIsSheetMounted(true);
    setIsNewPropertyOpen(true);
    openFrameRef.current = window.requestAnimationFrame(() => {
      setIsSheetVisible(true);
      openFrameRef.current = null;
    });
  }

  function closeNewPropertySheet() {
    if (openFrameRef.current) {
      window.cancelAnimationFrame(openFrameRef.current);
      openFrameRef.current = null;
    }

    setIsNewPropertyOpen(false);
    setIsSheetVisible(false);

    if (closeTimeoutRef.current) {
      window.clearTimeout(closeTimeoutRef.current);
    }

    closeTimeoutRef.current = window.setTimeout(() => {
      setIsSheetMounted(false);
      closeTimeoutRef.current = null;
    }, 260);
  }

  function handleCreated(state: CreatePropertyFormState) {
    closeNewPropertySheet();
    setFlashMessage(state.success ?? "Property created successfully.");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Properties"
        description="Addresses are primary for daily operations."
        actions={
          <button
            type="button"
            onClick={openNewPropertySheet}
            className="rounded-full bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800"
          >
            New property
          </button>
        }
      />

      {flashMessage ? (
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-zinc-800 shadow-sm">
          {flashMessage}
        </p>
      ) : null}

      <PropertyDashboard properties={properties} mapProvider={mapProvider} mapboxToken={mapboxToken} canRoute={canRoute} />

      {isSheetMounted ? (
        <div className="fixed inset-0 z-[80]">
          <button
            type="button"
            aria-label="Close new property sheet"
            onClick={closeNewPropertySheet}
            className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
              isSheetVisible ? "opacity-100" : "opacity-0"
            }`}
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className={`absolute inset-x-0 bottom-0 mx-auto max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-t-3xl border border-emerald-100/90 bg-white shadow-2xl transition-transform duration-500 ease-out ${
              isSheetVisible ? "translate-y-0" : "translate-y-full"
            }`}
          >
            <div className="flex items-center justify-between border-b border-emerald-100 bg-gradient-to-br from-white via-white to-emerald-50/70 px-5 py-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#287b40]">Properties</p>
                <h2 id={titleId} className="mt-1 text-xl font-semibold tracking-tight text-zinc-950">
                  New Property
                </h2>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                aria-label="Close new property sheet"
                onClick={closeNewPropertySheet}
                className="rounded-full border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 shadow-sm hover:bg-emerald-50"
              >
                X
              </button>
            </div>

            <div className="max-h-[calc(85vh-88px)] overflow-y-auto px-[6px] pb-6 pt-4 sm:px-[10px]">
              <PropertyForm
                action={async () => {}}
                stateAction={createPropertySheetAction}
                clients={clients}
                submitLabel="Create property"
                requiredFieldsNote="Required fields: Client, Address line 1, City, State, and ZIP."
                onSuccess={handleCreated}
                resetOnSuccess
                className="px-[6px] sm:px-[10px]"
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
