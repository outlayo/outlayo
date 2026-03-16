import { z } from "zod";
import type { AppConfig } from "@outlayo/core";

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    HOST: z.string().default("127.0.0.1"),
    PORT: z.coerce.number().int().positive().default(8787),
    ADMIN_TOKEN: z.string().optional(),
    ADMIN_HEADER_NAME: z.string().default("x-outlayo-admin-token"),
    POLL_INTERVAL_MINUTES: z.coerce.number().int().min(1).default(10),
    DB_BACKEND: z.enum(["sqlite", "postgres"]).default("sqlite"),
    SQLITE_PATH: z.string().default("./outlayo.db"),
    POSTGRES_URL: z.string().optional(),
    OPENAI_API_KEY: z.string().optional(),
    OPENAI_PROJECT: z.string().optional(),
    OPENAI_ENABLED: z
      .string()
      .optional()
      .transform((v) => (v ?? "true") !== "false"),
    ANTHROPIC_ENABLED: z
      .string()
      .optional()
      .transform((v) => (v ?? "false") === "true"),
    ANTHROPIC_API_KEY: z.string().optional(),
    ANTHROPIC_BASE_URL: z.string().url().optional(),
    GCP_ENABLED: z
      .string()
      .optional()
      .transform((v) => (v ?? "false") === "true"),
    GCP_PROJECT_ID: z.string().optional(),
    GCP_BILLING_DATASET: z.string().optional(),
    GCP_BILLING_TABLE: z.string().optional(),
    GCP_SERVICE_ACCOUNT_JSON: z.string().optional(),
    GCP_SERVICE_ACCOUNT_FILE: z.string().optional(),
    GCP_API_USAGE_ENABLED: z
      .string()
      .optional()
      .transform((v) => (v ?? "false") === "true"),
    GCP_FREE_TIER_LIMITS_JSON: z.string().optional(),
    MAPBOX_ENABLED: z
      .string()
      .optional()
      .transform((v) => (v ?? "false") === "true"),
    MAPBOX_TOKEN: z.string().optional(),
    MAPBOX_USERNAME: z.string().optional(),
    MAPBOX_PRICING_JSON: z.string().optional(),
    MAPBOX_BASE_URL: z.string().url().optional(),
    SUPABASE_ENABLED: z
      .string()
      .optional()
      .transform((v) => (v ?? "false") === "true"),
    SUPABASE_PROJECT_REF: z.string().optional(),
    SUPABASE_ACCESS_TOKEN: z.string().optional(),
    SUPABASE_BASE_URL: z.string().url().optional(),
    VERCEL_ENABLED: z
      .string()
      .optional()
      .transform((v) => (v ?? "false") === "true"),
    VERCEL_TOKEN: z.string().optional(),
    VERCEL_TEAM_ID: z.string().optional(),
    VERCEL_BASE_URL: z.string().url().optional(),
    RENDER_ENABLED: z
      .string()
      .optional()
      .transform((v) => (v ?? "false") === "true"),
    RENDER_API_KEY: z.string().optional(),
    RENDER_OWNER_ID: z.string().optional(),
    RENDER_BASE_URL: z.string().url().optional(),
    RAILWAY_ENABLED: z
      .string()
      .optional()
      .transform((v) => (v ?? "false") === "true"),
    RAILWAY_API_TOKEN: z.string().optional(),
    RAILWAY_PROJECT_ID: z.string().optional(),
    RAILWAY_BASE_URL: z.string().url().optional(),
    CLOUDFLARE_ENABLED: z
      .string()
      .optional()
      .transform((v) => (v ?? "false") === "true"),
    CLOUDFLARE_API_TOKEN: z.string().optional(),
    CLOUDFLARE_ACCOUNT_ID: z.string().optional(),
    CLOUDFLARE_BASE_URL: z.string().url().optional(),
    AWS_COST_EXPLORER_ENABLED: z
      .string()
      .optional()
      .transform((v) => (v ?? "false") === "true"),
    AWS_ACCESS_KEY_ID: z.string().optional(),
    AWS_SECRET_ACCESS_KEY: z.string().optional(),
    AWS_SESSION_TOKEN: z.string().optional(),
    AWS_REGION: z.string().default("us-east-1"),
    AWS_COST_EXPLORER_ENDPOINT: z.string().url().optional(),
    AZURE_CONSUMPTION_ENABLED: z
      .string()
      .optional()
      .transform((v) => (v ?? "false") === "true"),
    AZURE_SUBSCRIPTION_ID: z.string().optional(),
    AZURE_BEARER_TOKEN: z.string().optional(),
    AZURE_CONSUMPTION_BASE_URL: z.string().url().optional(),
    MONTHLY_BUDGET_USD: z.coerce.number().positive().optional(),
    ALERT_WEBHOOK_URL: z.string().url().optional(),
    ALERT_COOLDOWN_HOURS: z.coerce.number().int().min(1).default(24)
  })
  .superRefine((value, ctx) => {
    const localHosts = new Set(["127.0.0.1", "localhost", "::1"]);
    if (!localHosts.has(value.HOST) && !value.ADMIN_TOKEN) {
      ctx.addIssue({
        path: ["ADMIN_TOKEN"],
        code: z.ZodIssueCode.custom,
        message: "ADMIN_TOKEN is required when HOST is non-local"
      });
    }

    if (value.DB_BACKEND === "postgres" && !value.POSTGRES_URL) {
      ctx.addIssue({
        path: ["POSTGRES_URL"],
        code: z.ZodIssueCode.custom,
        message: "POSTGRES_URL is required when DB_BACKEND=postgres"
      });
    }

    if (value.OPENAI_ENABLED && !value.OPENAI_API_KEY) {
      ctx.addIssue({
        path: ["OPENAI_API_KEY"],
        code: z.ZodIssueCode.custom,
        message: "OPENAI_API_KEY is required when OPENAI_ENABLED is true"
      });
    }

    if (value.ANTHROPIC_ENABLED && !value.ANTHROPIC_API_KEY) {
      ctx.addIssue({
        path: ["ANTHROPIC_API_KEY"],
        code: z.ZodIssueCode.custom,
        message: "ANTHROPIC_API_KEY is required when ANTHROPIC_ENABLED is true"
      });
    }

    if (value.GCP_ENABLED) {
      if (!value.GCP_PROJECT_ID) {
        ctx.addIssue({
          path: ["GCP_PROJECT_ID"],
          code: z.ZodIssueCode.custom,
          message: "GCP_PROJECT_ID is required when GCP_ENABLED is true"
        });
      }
      if (!value.GCP_BILLING_DATASET) {
        ctx.addIssue({
          path: ["GCP_BILLING_DATASET"],
          code: z.ZodIssueCode.custom,
          message: "GCP_BILLING_DATASET is required when GCP_ENABLED is true"
        });
      }
      if (!value.GCP_BILLING_TABLE) {
        ctx.addIssue({
          path: ["GCP_BILLING_TABLE"],
          code: z.ZodIssueCode.custom,
          message: "GCP_BILLING_TABLE is required when GCP_ENABLED is true"
        });
      }
      if (!value.GCP_SERVICE_ACCOUNT_JSON && !value.GCP_SERVICE_ACCOUNT_FILE) {
        ctx.addIssue({
          path: ["GCP_SERVICE_ACCOUNT_JSON"],
          code: z.ZodIssueCode.custom,
          message:
            "GCP_SERVICE_ACCOUNT_JSON or GCP_SERVICE_ACCOUNT_FILE is required when GCP_ENABLED is true"
        });
      }
    }

    if ((value.MONTHLY_BUDGET_USD !== undefined && !value.ALERT_WEBHOOK_URL) ||
      (value.ALERT_WEBHOOK_URL && value.MONTHLY_BUDGET_USD === undefined)) {
      ctx.addIssue({
        path: ["MONTHLY_BUDGET_USD"],
        code: z.ZodIssueCode.custom,
        message: "MONTHLY_BUDGET_USD and ALERT_WEBHOOK_URL must both be set to enable alerting"
      });
    }

    if (value.GCP_API_USAGE_ENABLED && !value.GCP_FREE_TIER_LIMITS_JSON) {
      ctx.addIssue({
        path: ["GCP_FREE_TIER_LIMITS_JSON"],
        code: z.ZodIssueCode.custom,
        message: "GCP_FREE_TIER_LIMITS_JSON is required when GCP_API_USAGE_ENABLED is true"
      });
    }

    if (value.GCP_FREE_TIER_LIMITS_JSON) {
      try {
        const parsed = JSON.parse(value.GCP_FREE_TIER_LIMITS_JSON) as unknown;
        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
          throw new Error("invalid shape");
        }
      } catch {
        ctx.addIssue({
          path: ["GCP_FREE_TIER_LIMITS_JSON"],
          code: z.ZodIssueCode.custom,
          message: "GCP_FREE_TIER_LIMITS_JSON must be a valid JSON object"
        });
      }
    }

    if (value.MAPBOX_ENABLED) {
      if (!value.MAPBOX_TOKEN) {
        ctx.addIssue({
          path: ["MAPBOX_TOKEN"],
          code: z.ZodIssueCode.custom,
          message: "MAPBOX_TOKEN is required when MAPBOX_ENABLED is true"
        });
      }
      if (!value.MAPBOX_USERNAME) {
        ctx.addIssue({
          path: ["MAPBOX_USERNAME"],
          code: z.ZodIssueCode.custom,
          message: "MAPBOX_USERNAME is required when MAPBOX_ENABLED is true"
        });
      }
      if (!value.MAPBOX_PRICING_JSON) {
        ctx.addIssue({
          path: ["MAPBOX_PRICING_JSON"],
          code: z.ZodIssueCode.custom,
          message: "MAPBOX_PRICING_JSON is required when MAPBOX_ENABLED is true"
        });
      } else {
        try {
          const parsed = JSON.parse(value.MAPBOX_PRICING_JSON) as unknown;
          if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
            throw new Error("invalid shape");
          }
        } catch {
          ctx.addIssue({
            path: ["MAPBOX_PRICING_JSON"],
            code: z.ZodIssueCode.custom,
            message: "MAPBOX_PRICING_JSON must be a valid JSON object"
          });
        }
      }
    }

    if (value.SUPABASE_ENABLED) {
      if (!value.SUPABASE_PROJECT_REF) {
        ctx.addIssue({
          path: ["SUPABASE_PROJECT_REF"],
          code: z.ZodIssueCode.custom,
          message: "SUPABASE_PROJECT_REF is required when SUPABASE_ENABLED is true"
        });
      }
      if (!value.SUPABASE_ACCESS_TOKEN) {
        ctx.addIssue({
          path: ["SUPABASE_ACCESS_TOKEN"],
          code: z.ZodIssueCode.custom,
          message: "SUPABASE_ACCESS_TOKEN is required when SUPABASE_ENABLED is true"
        });
      }
    }

    if (value.VERCEL_ENABLED) {
      if (!value.VERCEL_TOKEN) {
        ctx.addIssue({
          path: ["VERCEL_TOKEN"],
          code: z.ZodIssueCode.custom,
          message: "VERCEL_TOKEN is required when VERCEL_ENABLED is true"
        });
      }
      if (!value.VERCEL_TEAM_ID) {
        ctx.addIssue({
          path: ["VERCEL_TEAM_ID"],
          code: z.ZodIssueCode.custom,
          message: "VERCEL_TEAM_ID is required when VERCEL_ENABLED is true"
        });
      }
    }

    if (value.RENDER_ENABLED) {
      if (!value.RENDER_API_KEY) {
        ctx.addIssue({
          path: ["RENDER_API_KEY"],
          code: z.ZodIssueCode.custom,
          message: "RENDER_API_KEY is required when RENDER_ENABLED is true"
        });
      }
      if (!value.RENDER_OWNER_ID) {
        ctx.addIssue({
          path: ["RENDER_OWNER_ID"],
          code: z.ZodIssueCode.custom,
          message: "RENDER_OWNER_ID is required when RENDER_ENABLED is true"
        });
      }
    }

    if (value.RAILWAY_ENABLED) {
      if (!value.RAILWAY_API_TOKEN) {
        ctx.addIssue({
          path: ["RAILWAY_API_TOKEN"],
          code: z.ZodIssueCode.custom,
          message: "RAILWAY_API_TOKEN is required when RAILWAY_ENABLED is true"
        });
      }
      if (!value.RAILWAY_PROJECT_ID) {
        ctx.addIssue({
          path: ["RAILWAY_PROJECT_ID"],
          code: z.ZodIssueCode.custom,
          message: "RAILWAY_PROJECT_ID is required when RAILWAY_ENABLED is true"
        });
      }
    }

    if (value.CLOUDFLARE_ENABLED) {
      if (!value.CLOUDFLARE_API_TOKEN) {
        ctx.addIssue({
          path: ["CLOUDFLARE_API_TOKEN"],
          code: z.ZodIssueCode.custom,
          message: "CLOUDFLARE_API_TOKEN is required when CLOUDFLARE_ENABLED is true"
        });
      }
      if (!value.CLOUDFLARE_ACCOUNT_ID) {
        ctx.addIssue({
          path: ["CLOUDFLARE_ACCOUNT_ID"],
          code: z.ZodIssueCode.custom,
          message: "CLOUDFLARE_ACCOUNT_ID is required when CLOUDFLARE_ENABLED is true"
        });
      }
    }

    if (value.AWS_COST_EXPLORER_ENABLED) {
      if (!value.AWS_ACCESS_KEY_ID) {
        ctx.addIssue({
          path: ["AWS_ACCESS_KEY_ID"],
          code: z.ZodIssueCode.custom,
          message: "AWS_ACCESS_KEY_ID is required when AWS_COST_EXPLORER_ENABLED is true"
        });
      }
      if (!value.AWS_SECRET_ACCESS_KEY) {
        ctx.addIssue({
          path: ["AWS_SECRET_ACCESS_KEY"],
          code: z.ZodIssueCode.custom,
          message: "AWS_SECRET_ACCESS_KEY is required when AWS_COST_EXPLORER_ENABLED is true"
        });
      }
    }

    if (value.AZURE_CONSUMPTION_ENABLED) {
      if (!value.AZURE_SUBSCRIPTION_ID) {
        ctx.addIssue({
          path: ["AZURE_SUBSCRIPTION_ID"],
          code: z.ZodIssueCode.custom,
          message: "AZURE_SUBSCRIPTION_ID is required when AZURE_CONSUMPTION_ENABLED is true"
        });
      }
      if (!value.AZURE_BEARER_TOKEN) {
        ctx.addIssue({
          path: ["AZURE_BEARER_TOKEN"],
          code: z.ZodIssueCode.custom,
          message: "AZURE_BEARER_TOKEN is required when AZURE_CONSUMPTION_ENABLED is true"
        });
      }
    }
  });

export function loadConfig(env = process.env): AppConfig {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid startup configuration: ${issues}`);
  }

  const value = parsed.data;
  return {
    nodeEnv: value.NODE_ENV,
    host: value.HOST,
    port: value.PORT,
    adminToken: value.ADMIN_TOKEN ?? null,
    adminHeaderName: value.ADMIN_HEADER_NAME,
    pollIntervalMinutes: value.POLL_INTERVAL_MINUTES,
    dbBackend: value.DB_BACKEND,
    sqlitePath: value.SQLITE_PATH,
    postgresUrl: value.POSTGRES_URL ?? null,
    openaiApiKey: value.OPENAI_API_KEY ?? null,
    openaiProject: value.OPENAI_PROJECT ?? null,
    openaiEnabled: value.OPENAI_ENABLED,
    anthropicEnabled: value.ANTHROPIC_ENABLED,
    anthropicApiKey: value.ANTHROPIC_API_KEY ?? null,
    anthropicBaseUrl: value.ANTHROPIC_BASE_URL ?? null,
    gcpEnabled: value.GCP_ENABLED,
    gcpProjectId: value.GCP_PROJECT_ID ?? null,
    gcpBillingDataset: value.GCP_BILLING_DATASET ?? null,
    gcpBillingTable: value.GCP_BILLING_TABLE ?? null,
    gcpServiceAccountJson: value.GCP_SERVICE_ACCOUNT_JSON ?? null,
    gcpServiceAccountFile: value.GCP_SERVICE_ACCOUNT_FILE ?? null,
    gcpApiUsageEnabled: value.GCP_API_USAGE_ENABLED,
    gcpFreeTierLimitsJson: value.GCP_FREE_TIER_LIMITS_JSON ?? null,
    mapboxEnabled: value.MAPBOX_ENABLED,
    mapboxToken: value.MAPBOX_TOKEN ?? null,
    mapboxUsername: value.MAPBOX_USERNAME ?? null,
    mapboxPricingJson: value.MAPBOX_PRICING_JSON ?? null,
    mapboxBaseUrl: value.MAPBOX_BASE_URL ?? null,
    supabaseEnabled: value.SUPABASE_ENABLED,
    supabaseProjectRef: value.SUPABASE_PROJECT_REF ?? null,
    supabaseAccessToken: value.SUPABASE_ACCESS_TOKEN ?? null,
    supabaseBaseUrl: value.SUPABASE_BASE_URL ?? null,
    vercelEnabled: value.VERCEL_ENABLED,
    vercelToken: value.VERCEL_TOKEN ?? null,
    vercelTeamId: value.VERCEL_TEAM_ID ?? null,
    vercelBaseUrl: value.VERCEL_BASE_URL ?? null,
    renderEnabled: value.RENDER_ENABLED,
    renderApiKey: value.RENDER_API_KEY ?? null,
    renderOwnerId: value.RENDER_OWNER_ID ?? null,
    renderBaseUrl: value.RENDER_BASE_URL ?? null,
    railwayEnabled: value.RAILWAY_ENABLED,
    railwayApiToken: value.RAILWAY_API_TOKEN ?? null,
    railwayProjectId: value.RAILWAY_PROJECT_ID ?? null,
    railwayBaseUrl: value.RAILWAY_BASE_URL ?? null,
    cloudflareEnabled: value.CLOUDFLARE_ENABLED,
    cloudflareApiToken: value.CLOUDFLARE_API_TOKEN ?? null,
    cloudflareAccountId: value.CLOUDFLARE_ACCOUNT_ID ?? null,
    cloudflareBaseUrl: value.CLOUDFLARE_BASE_URL ?? null,
    awsCostExplorerEnabled: value.AWS_COST_EXPLORER_ENABLED,
    awsAccessKeyId: value.AWS_ACCESS_KEY_ID ?? null,
    awsSecretAccessKey: value.AWS_SECRET_ACCESS_KEY ?? null,
    awsSessionToken: value.AWS_SESSION_TOKEN ?? null,
    awsRegion: value.AWS_REGION,
    awsCostExplorerEndpoint: value.AWS_COST_EXPLORER_ENDPOINT ?? null,
    azureConsumptionEnabled: value.AZURE_CONSUMPTION_ENABLED,
    azureSubscriptionId: value.AZURE_SUBSCRIPTION_ID ?? null,
    azureBearerToken: value.AZURE_BEARER_TOKEN ?? null,
    azureConsumptionBaseUrl: value.AZURE_CONSUMPTION_BASE_URL ?? null,
    monthlyBudgetUsd: value.MONTHLY_BUDGET_USD ?? null,
    alertWebhookUrl: value.ALERT_WEBHOOK_URL ?? null,
    alertCooldownHours: value.ALERT_COOLDOWN_HOURS
  };
}
