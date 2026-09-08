import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/scan")({
  server: {
    handlers: {
      GET: async () => {
        const t0 = Date.now();
        const { getScan } = await import("@/lib/market/load-scan");
        try {
          const report = await getScan();
          const ms = Date.now() - t0;
          return Response.json(report, {
            headers: {
              "cache-control": "private, max-age=8, stale-while-revalidate=20",
              "x-scan-ms": String(ms),
              "x-scan-at": String(report.at),
            },
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Không quét được";
          return Response.json({ error: msg }, { status: 500 });
        }
      },
    },
  },
});
