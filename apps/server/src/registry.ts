import type { Connector } from "@outlayo/core";
import { OpenAIConnector } from "@outlayo/connector-openai";
import { AnthropicConnector } from "@outlayo/connector-anthropic";
import { AwsCostExplorerConnector } from "@outlayo/connector-aws-cost-explorer";
import { AzureConsumptionConnector } from "@outlayo/connector-azure-consumption";
import { GcpBillingConnector } from "@outlayo/connector-gcp-billing";
import { GcpApiUsageConnector } from "@outlayo/connector-gcp-api-usage";
import { MapboxConnector } from "@outlayo/connector-mapbox";
import { SupabaseConnector } from "@outlayo/connector-supabase";
import { VercelConnector } from "@outlayo/connector-vercel";
import { RenderConnector } from "@outlayo/connector-render";
import { RailwayConnector } from "@outlayo/connector-railway";
import { CloudflareConnector } from "@outlayo/connector-cloudflare";
import type { AppConfig } from "@outlayo/core";

export function buildConnectorRegistry(config: AppConfig): Connector[] {
  const connectors: Connector[] = [];
  if (config.openaiEnabled && config.openaiApiKey) {
    connectors.push(
      new OpenAIConnector({
        apiKey: config.openaiApiKey,
        project: config.openaiProject
      })
    );
  }

  if (config.anthropicEnabled && config.anthropicApiKey) {
    connectors.push(
      new AnthropicConnector({
        apiKey: config.anthropicApiKey,
        baseUrl: config.anthropicBaseUrl ?? undefined
      })
    );
  }

  if (config.gcpEnabled && config.gcpProjectId && config.gcpBillingDataset && config.gcpBillingTable) {
    connectors.push(
      new GcpBillingConnector({
        projectId: config.gcpProjectId,
        dataset: config.gcpBillingDataset,
        table: config.gcpBillingTable,
        serviceAccountJson: config.gcpServiceAccountJson,
        serviceAccountFile: config.gcpServiceAccountFile
      })
    );
  }

  if (
    config.gcpApiUsageEnabled &&
    config.gcpProjectId &&
    config.gcpBillingDataset &&
    config.gcpBillingTable
  ) {
    connectors.push(
      new GcpApiUsageConnector({
        projectId: config.gcpProjectId,
        dataset: config.gcpBillingDataset,
        table: config.gcpBillingTable,
        serviceAccountJson: config.gcpServiceAccountJson,
        serviceAccountFile: config.gcpServiceAccountFile
      })
    );
  }

  if (config.mapboxEnabled && config.mapboxToken && config.mapboxUsername) {
    connectors.push(
      new MapboxConnector({
        token: config.mapboxToken,
        username: config.mapboxUsername,
        pricing: config.mapboxPricingJson ? (JSON.parse(config.mapboxPricingJson) as Record<string, number | { upTo?: number; perUnitUsd: number }[]>) : {},
        baseUrl: config.mapboxBaseUrl ?? undefined
      })
    );
  }

  if (config.awsCostExplorerEnabled && config.awsAccessKeyId && config.awsSecretAccessKey) {
    connectors.push(
      new AwsCostExplorerConnector({
        accessKeyId: config.awsAccessKeyId,
        secretAccessKey: config.awsSecretAccessKey,
        sessionToken: config.awsSessionToken,
        region: config.awsRegion,
        endpoint: config.awsCostExplorerEndpoint ?? undefined
      })
    );
  }

  if (config.azureConsumptionEnabled && config.azureSubscriptionId && config.azureBearerToken) {
    connectors.push(
      new AzureConsumptionConnector({
        subscriptionId: config.azureSubscriptionId,
        bearerToken: config.azureBearerToken,
        baseUrl: config.azureConsumptionBaseUrl ?? undefined
      })
    );
  }

  if (config.supabaseEnabled && config.supabaseProjectRef && config.supabaseAccessToken) {
    connectors.push(
      new SupabaseConnector({
        projectRef: config.supabaseProjectRef,
        accessToken: config.supabaseAccessToken,
        baseUrl: config.supabaseBaseUrl ?? undefined
      })
    );
  }

  if (config.vercelEnabled && config.vercelToken && config.vercelTeamId) {
    connectors.push(
      new VercelConnector({
        token: config.vercelToken,
        teamId: config.vercelTeamId,
        baseUrl: config.vercelBaseUrl ?? undefined
      })
    );
  }

  if (config.renderEnabled && config.renderApiKey && config.renderOwnerId) {
    connectors.push(
      new RenderConnector({
        apiKey: config.renderApiKey,
        ownerId: config.renderOwnerId,
        baseUrl: config.renderBaseUrl ?? undefined
      })
    );
  }

  if (config.railwayEnabled && config.railwayApiToken && config.railwayProjectId) {
    connectors.push(
      new RailwayConnector({
        apiToken: config.railwayApiToken,
        projectId: config.railwayProjectId,
        baseUrl: config.railwayBaseUrl ?? undefined
      })
    );
  }

  if (config.cloudflareEnabled && config.cloudflareApiToken && config.cloudflareAccountId) {
    connectors.push(
      new CloudflareConnector({
        apiToken: config.cloudflareApiToken,
        accountId: config.cloudflareAccountId,
        baseUrl: config.cloudflareBaseUrl ?? undefined
      })
    );
  }

  return connectors;
}
