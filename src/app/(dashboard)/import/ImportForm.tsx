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
    <div className="space-y-5">
      <form onSubmit={onSubmit} className="space-y-2.5">
        <label className="block text-sm font-medium text-gray-800">
          Listing URLs (one per line)
        </label>
        <textarea
          className="min-h-[200px] w-full rounded-2xl border border-gray-300 bg-white px-3 py-2 font-mono text-sm leading-relaxed text-gray-900 shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-400"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="https://dealer.example.com/inventory/unit-12345"
          disabled={pending}
        />
        <button
          type="submit"
          disabled={pending || !text.trim()}
          className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Importing…" : "Scrape and save"}
        </button>
      </form>

      <div className="border-t border-gray-200 pt-5" id="paste-html">
        <h2 className="text-sm font-medium leading-tight text-gray-800">
          Or paste page HTML (Cloudflare / 403)
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-gray-600">
          If you see{" "}
          <code className="rounded bg-gray-100 px-1.5 text-xs">HTTP 403</code>{" "}
          above, open the listing in your browser, use{" "}
          <strong>View page source</strong> (or save the fully loaded page as{" "}
          <code className="text-xs">.html</code> and open it in an editor), copy
          everything, and paste it below. The server never fetches the URL; it
          only parses the HTML.
        </p>
        <form
          onSubmit={onPasteSubmit}
          className="mt-3 space-y-2.5"
        >
          <label className="block text-sm font-medium text-gray-800">
            Listing URL (same page the HTML came from)
          </label>
          <input
            type="url"
            className="w-full rounded-2xl border border-gray-300 bg-white px-3 py-2 font-mono text-sm text-gray-900 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-400"
            value={pasteUrl}
            onChange={(e) => setPasteUrl(e.target.value)}
            placeholder="https://milwaukeeharley.com/inventory/…"
            disabled={pendingPaste}
          />
          <label className="block text-sm font-medium text-gray-800">
            Full page HTML
          </label>
          <textarea
            className="min-h-[180px] w-full rounded-2xl border border-gray-300 bg-white px-3 py-2 font-mono text-xs text-gray-900 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-400"
            value={pasteHtml}
            onChange={(e) => setPasteHtml(e.target.value)}
            placeholder="&lt;!DOCTYPE html>…"
            disabled={pendingPaste}
          />
          <button
            type="submit"
            disabled={pendingPaste || !pasteUrl.trim() || !pasteHtml.trim()}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pendingPaste ? "Parsing…" : "Parse HTML and save"}
          </button>
        </form>
        {pasteResult ? (
          <p
            className={`mt-3 text-sm ${
              pasteResult.ok ? "text-green-700" : "text-red-700"
            }`}
          >
            {pasteResult.ok ? (
              <>
                Saved SKU{" "}
                <code className="rounded bg-gray-100 px-1.5 text-xs">
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
        <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {results && results.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-gray-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-gray-500">
                  URL
                </th>
                <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-gray-500">
                  Result
                </th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr
                  key={r.url}
                  className="border-t border-gray-200"
                >
                  <td className="max-w-md break-all px-4 py-2.5 font-mono text-xs text-gray-600">
                    {r.url}
                  </td>
                  <td className="px-4 py-2.5">
                    {r.ok ? (
                      <span className="text-green-700">
                        Saved SKU{" "}
                        <code className="rounded bg-gray-100 px-1.5 text-xs">
                          {r.sku}
                        </code>
                      </span>
                    ) : (
                      <span className="text-red-700">{r.error}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {results && results.length === 0 ? (
        <p className="text-sm text-gray-500">Enter at least one URL.</p>
      ) : null}
    </div>
  );
}
