"use client";

import { useState, useTransition } from "react";
import type { ImportRowResult } from "./actions";
import { importFromPastedHtml, importFromUrls } from "./actions";

export function ImportForm() {
  const [text, setText] = useState("");
  const [results, setResults] = useState<ImportRowResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [pasteUrl, setPasteUrl] = useState("");
  const [pasteHtml, setPasteHtml] = useState("");
  const [pasteResult, setPasteResult] = useState<ImportRowResult | null>(null);
  const [pendingPaste, startPasteTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResults(null);
    startTransition(async () => {
      try {
        const rows = await importFromUrls(text);
        setResults(rows);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Import failed");
      }
    });
  }

  function onPasteSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasteResult(null);
    setError(null);
    startPasteTransition(async () => {
      try {
        const row = await importFromPastedHtml(pasteUrl, pasteHtml);
        setPasteResult(row);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Import failed");
      }
    });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="space-y-3">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Listing URLs (one per line)
        </label>
        <textarea
          className="min-h-[200px] w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-sm text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="https://dealer.example.com/inventory/unit-12345"
          disabled={pending}
        />
        <button
          type="submit"
          disabled={pending || !text.trim()}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          {pending ? "Importing…" : "Scrape and save"}
        </button>
      </form>

      <div
        className="border-t border-zinc-200 pt-6 dark:border-zinc-800"
        id="paste-html"
      >
        <h2 className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Or paste page HTML (Cloudflare / 403)
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          If you see{" "}
          <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-800">
            HTTP 403
          </code>{" "}
          above, open the listing in your browser, use{" "}
          <strong>View page source</strong> (or save the fully loaded page as{" "}
          <code className="text-xs">.html</code> and open it in an editor), copy
          everything, and paste it below. The server never fetches the URL; it
          only parses the HTML.
        </p>
        <form
          onSubmit={onPasteSubmit}
          className="mt-4 space-y-3"
        >
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Listing URL (same page the HTML came from)
          </label>
          <input
            type="url"
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            value={pasteUrl}
            onChange={(e) => setPasteUrl(e.target.value)}
            placeholder="https://milwaukeeharley.com/inventory/…"
            disabled={pendingPaste}
          />
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Full page HTML
          </label>
          <textarea
            className="min-h-[180px] w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            value={pasteHtml}
            onChange={(e) => setPasteHtml(e.target.value)}
            placeholder="&lt;!DOCTYPE html>…"
            disabled={pendingPaste}
          />
          <button
            type="submit"
            disabled={pendingPaste || !pasteUrl.trim() || !pasteHtml.trim()}
            className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            {pendingPaste ? "Parsing…" : "Parse HTML and save"}
          </button>
        </form>
        {pasteResult ? (
          <p
            className={`mt-3 text-sm ${
              pasteResult.ok
                ? "text-emerald-700 dark:text-emerald-400"
                : "text-red-700 dark:text-red-400"
            }`}
          >
            {pasteResult.ok ? (
              <>
                Saved SKU{" "}
                <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
                  {pasteResult.sku}
                </code>
              </>
            ) : (
              pasteResult.error
            )}
          </p>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      ) : null}

      {results && results.length > 0 ? (
        <div className="overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-900">
              <tr>
                <th className="px-3 py-2 font-medium">URL</th>
                <th className="px-3 py-2 font-medium">Result</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr
                  key={r.url}
                  className="border-t border-zinc-200 dark:border-zinc-800"
                >
                  <td className="max-w-md break-all px-3 py-2 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                    {r.url}
                  </td>
                  <td className="px-3 py-2">
                    {r.ok ? (
                      <span className="text-emerald-700 dark:text-emerald-400">
                        Saved SKU{" "}
                        <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
                          {r.sku}
                        </code>
                      </span>
                    ) : (
                      <span className="text-red-700 dark:text-red-400">
                        {r.error}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {results && results.length === 0 ? (
        <p className="text-sm text-zinc-500">Enter at least one URL.</p>
      ) : null}
    </div>
  );
}
