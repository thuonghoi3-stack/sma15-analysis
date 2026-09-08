import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/scan")({
  server: {
    handlers: {
      GET: async () => {
        const { runScan } = await import("@/lib/market/load-scan");
        try {
          const report = await runScan();
          return Response.json(report, {
            headers: { "cache-control": "s-maxage=15, stale-while-revalidate=30" },
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Không quét được";
          return Response.json({ error: msg }, { status: 500 });
        }
      },
    },
  },
});
