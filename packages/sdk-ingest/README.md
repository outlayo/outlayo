# @outlayo/sdk-ingest

App-side usage interception and ingest helpers for Outlayo.

## What it provides

- usage tracker with buffered ingest delivery
- fetch instrumentation helpers
- built-in presets for OpenAI, Mapbox, GCP Places, GCP Locations, and Resend

## Basic example

```ts
import { setupPresetFetch } from "@outlayo/sdk-ingest";

const outlayo = setupPresetFetch({
  presets: [{ name: "openai" }]
});

const trackedFetch = outlayo.fetch;
```

See `docs/app-side-auto-intercept.md` in the main repository for the current integration guide.
