import type { LanguageModelV4 } from "@ai-sdk/provider";

/**
 * Tries `primary`; if the call fails before any output (bad key, quota, outage),
 * replays the same call on `backup`. Provider-specific tools and options the backup
 * doesn't understand are skipped by its provider with a warning, not an error.
 */
export function withFallback(primary: LanguageModelV4, backup: LanguageModelV4 | null): LanguageModelV4 {
  if (!backup) return primary;
  const warn = (e: unknown) =>
    console.warn(`[fallback] ${primary.provider}/${primary.modelId} failed, using ${backup.provider}/${backup.modelId}:`, (e as Error)?.message);

  return {
    specificationVersion: "v4",
    provider: primary.provider,
    modelId: primary.modelId,
    supportedUrls: primary.supportedUrls,
    async doGenerate(options) {
      try {
        return await primary.doGenerate(options);
      } catch (e) {
        if (options.abortSignal?.aborted) throw e;
        warn(e);
        return backup.doGenerate(options);
      }
    },
    async doStream(options) {
      try {
        return await primary.doStream(options);
      } catch (e) {
        if (options.abortSignal?.aborted) throw e;
        warn(e);
        return backup.doStream(options);
      }
    },
  };
}
