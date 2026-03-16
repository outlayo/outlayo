export interface ConnectorPromptSpec {
  id: string;
  label: string;
  enabledKey: string;
  requiredKeys: string[];
}

export const CONNECTORS: ConnectorPromptSpec[] = [
  { id: "openai", label: "OpenAI", enabledKey: "OPENAI_ENABLED", requiredKeys: ["OPENAI_API_KEY"] },
  { id: "anthropic", label: "Anthropic", enabledKey: "ANTHROPIC_ENABLED", requiredKeys: ["ANTHROPIC_API_KEY"] },
  {
    id: "gcp-billing",
    label: "GCP Billing Export",
    enabledKey: "GCP_ENABLED",
    requiredKeys: ["GCP_PROJECT_ID", "GCP_BILLING_DATASET", "GCP_BILLING_TABLE"]
  },
  {
    id: "mapbox",
    label: "Mapbox",
    enabledKey: "MAPBOX_ENABLED",
    requiredKeys: ["MAPBOX_TOKEN", "MAPBOX_USERNAME", "MAPBOX_PRICING_JSON"]
  },
  {
    id: "aws-cost-explorer",
    label: "AWS Cost Explorer",
    enabledKey: "AWS_COST_EXPLORER_ENABLED",
    requiredKeys: ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_REGION"]
  },
  {
    id: "azure-consumption",
    label: "Azure Consumption",
    enabledKey: "AZURE_CONSUMPTION_ENABLED",
    requiredKeys: ["AZURE_SUBSCRIPTION_ID", "AZURE_BEARER_TOKEN"]
  },
  {
    id: "supabase",
    label: "Supabase",
    enabledKey: "SUPABASE_ENABLED",
    requiredKeys: ["SUPABASE_PROJECT_REF", "SUPABASE_ACCESS_TOKEN"]
  },
  { id: "vercel", label: "Vercel", enabledKey: "VERCEL_ENABLED", requiredKeys: ["VERCEL_TOKEN", "VERCEL_TEAM_ID"] },
  { id: "render", label: "Render", enabledKey: "RENDER_ENABLED", requiredKeys: ["RENDER_API_KEY", "RENDER_OWNER_ID"] },
  {
    id: "railway",
    label: "Railway",
    enabledKey: "RAILWAY_ENABLED",
    requiredKeys: ["RAILWAY_API_TOKEN", "RAILWAY_PROJECT_ID"]
  },
  {
    id: "cloudflare",
    label: "Cloudflare",
    enabledKey: "CLOUDFLARE_ENABLED",
    requiredKeys: ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ACCOUNT_ID"]
  }
];
