---
description: Report on items analyzed in production from DO logs
allowed-tools: Bash(doctl apps logs:*)
---

Pull recent run logs from the DigitalOcean App Platform deployment and produce a
report on what items users have photographed and sent to the OpenAI API.

App: `costcam-app` (id `267a632e-15e0-4559-bede-1a0adcacca45`), component
`how-much-does-it-cost`.

Each successful `/analyze` request emits one structured log line in `app.py`:

```
analysis {"item_name": "...", "brand": "...", "model": "...", "category": "...", "confidence": "...", "currency": "...", "country": "..."}
```

That `analysis ` prefix is the marker — every line you care about starts with it.

## Steps

1. Fetch run logs (no prefix so JSON parses cleanly). If the user passed
   `$ARGUMENTS`, treat it as a tail line count; otherwise default to all
   available lines:

   ```
   doctl apps logs 267a632e-15e0-4559-bede-1a0adcacca45 how-much-does-it-cost \
     --type run --tail ${ARGUMENTS:--1} --no-prefix
   ```

2. Filter to lines containing `analysis {` and parse the JSON object out of
   each. Skip lines that fail to parse — don't crash the report on one bad
   line.

3. Aggregate and report:
   - Total items analyzed and the time range covered (first vs last log
     timestamp from the surrounding gunicorn lines, or "unknown" if not
     available).
   - Top categories (count + share).
   - Top brands (excluding null/empty).
   - Confidence distribution (high / medium / low).
   - Currency / country distribution — quick sense of where users are.
   - Up to 10 example item names verbatim, so the user can eyeball what
     people are actually photographing.

4. Render the report as concise markdown. No preamble, no "I will now…" —
   just the report.

## Caveat to surface if the report is empty

If zero `analysis ` lines are found, say so explicitly and remind the user
that Flask's `app.logger.info` calls are dropped under gunicorn unless
logging is configured (e.g. `logging.basicConfig(level=logging.INFO)` at
app startup). Don't silently produce an empty report.
