# Ideas to Improve Price Estimate Accuracy

This document collects ideas for improving the accuracy of CostCam's price
estimates, grouped by implementation difficulty. References point at the
relevant code in `app.py`, particularly the prompt and model call around
lines 204–267.

## Easy

1. **Upgrade / switch the model.** We're on `gpt-4o` (`app.py:247`). Try
   `gpt-5` or `claude-opus-4-7` (or run both and compare). Newer multimodal
   models are noticeably better at fine-grained product ID.
2. **Lower temperature further.** It's at `0.2` (`app.py:264`). For numeric
   estimation, `0` is usually more reliable.
3. **Ask the model to think first.** Add a `"reasoning"` field to the JSON
   schema *before* `price_range`, where the model lists 2–3 specific comp
   prices it's anchoring on. Forces the model to ground the number rather
   than vibe-guess.
4. **Tighten the prompt around uncertainty.** Currently `low`/`high`/`typical`
   are unconstrained. Require: "If confidence is low, widen the range; the
   spread should reflect uncertainty." Also instruct it to return separate
   ranges for *new* vs *used-at-stated-condition*.
5. **Pass the real city, not just country.** We already have city in
   `resolve_location_from_ip` (`app.py:140`) but only sometimes include it.
   Always include it when present — local market matters a lot (NYC vs.
   rural Kansas).
6. **Use `"detail": "high"` consistently** — already done (`app.py:257`),
   good. But also remove the JPEG assumption in the data URL (`app.py:256`)
   — if the upload is PNG we're mislabeling it, which can hurt vision
   quality on some providers.
7. **Ask for a year/era estimate** when relevant (especially for
   electronics, fashion, collectibles). Knowing "iPhone 12" vs "iPhone 15"
   massively changes price.

## Medium

8. **Multi-shot self-consistency.** Call the model 3 times in parallel,
   then take the median of `typical` and the union range of `low`/`high`.
   Cuts variance significantly for a 3x cost hit.
9. **Two-stage pipeline.** Stage 1: identify the item (brand, model,
   condition, key attributes) — cheap call. Stage 2: price it given those
   attributes — separate call with a pricing-focused prompt. Separating
   perception from pricing usually improves both.
10. **Web-grounded pricing.** After stage 1 identifies the item, run a real
    search (eBay sold listings API, Google Shopping via SerpAPI, or a
    web-search-tool-call on the model). Pass top results into stage 2.
    This is the single biggest accuracy win available — model priors are
    stale and hallucinated; sold comps are real.
11. **Condition rubric in the prompt.** Right now the model self-defines
    "good"/"fair". Give it explicit visual criteria per category (e.g.,
    "fair = visible scuffs on >25% of surface, missing accessories, etc.").
12. **Category-specific prompts.** Run a quick classifier first, then route
    to a category-specific prompt template (electronics, antiques, clothing,
    furniture). Each category has different price drivers.
13. **Currency/locale enrichment.** Expand `CURRENCY_BY_COUNTRY`
    (`app.py:31`) to all ISO countries and pull from a library instead of
    hardcoding. Also include local marketplace names (Mercari in JP, OLX
    in IN) instead of generic "online retailers".
14. **Confidence-gated UX.** When the model returns `confidence: low`,
    surface that in the UI and prompt the user for a second photo / extra
    detail. Garbage-in-garbage-out is a big share of bad estimates.

## Hard

15. **Build a real comps pipeline.** Index eBay sold listings, Facebook
    Marketplace, Mercari, Poshmark for the categories we care about. At
    inference time, embed the image (CLIP or similar), do a vector search
    for the closest 20 comps, pass their actual sold prices to the model.
    This is essentially what professional appraisal tools do.
16. **Fine-tune on our own data.** Log every analysis + (eventually)
    user-provided feedback ("too high", "too low", actual price they sold
    for). Once we have a few thousand labeled examples, fine-tune a
    smaller model on price prediction.
17. **OCR + barcode/serial detection as a preprocessing step.** Before
    sending to the LLM, run OCR (Tesseract or a vision model) and a
    barcode detector. If we find a UPC/ISBN/serial, look it up directly
    in a product DB — exact match beats any LLM guess.
18. **Multi-image / video support.** Let users submit multiple angles or a
    short clip. Front+back+label photos of a handbag yield far better
    identification than a single shot. Requires UI rework + multi-image
    prompting.
19. **Bayesian range calibration.** Collect actual sold-price feedback,
    then learn per-category miscalibration factors (the model is +30% on
    furniture, -10% on electronics, etc.) and apply post-hoc corrections.
    Track and report calibration metrics over time.
20. **Reverse-image-search integration.** Google Lens / Bing Visual Search
    APIs to find the exact product page when it exists. If the item is
    currently listed on Amazon, we don't need to estimate — we have the
    price.

## Suggested Starting Point

Best ROI for first pass: **#3 (reasoning field) + #9 (two-stage) +
#10 (web-grounded)**. Those three together would probably move accuracy
more than everything else combined.
