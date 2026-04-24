"use client";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="rounded-md border border-red-200 bg-red-50 p-6 text-sm text-red-900">
      <p className="font-semibold">Something went wrong while loading this page.</p>
      <p className="mt-1 text-red-800">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded-md bg-red-700 px-3 py-2 text-xs font-medium text-white"
      >
        Try again
      </button>
    </div>
  );
}
