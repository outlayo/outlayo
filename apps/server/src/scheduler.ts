import type { Connector, Store } from "@outlayo/core";

export interface SchedulerControl {
  stop: () => void;
  tickNow: () => Promise<void>;
}

export function startScheduler(params: {
  intervalMinutes: number;
  connectors: Connector[];
  store: Store;
  afterTick?: (at: Date) => Promise<void>;
  now?: () => Date;
  logger?: Pick<Console, "info" | "error">;
  maxRetries?: number;
  retryBaseMs?: number;
  sleep?: (ms: number) => Promise<void>;
}): SchedulerControl {
  const now = params.now ?? (() => new Date());
  const logger = params.logger ?? console;
  const maxRetries = Math.max(0, params.maxRetries ?? 2);
  const retryBaseMs = Math.max(0, params.retryBaseMs ?? 200);
  const sleep = params.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));

  const tick = async (): Promise<void> => {
    const until = now();
    const since = new Date(until.getTime() - 2 * 60 * 60 * 1000);

    for (const connector of params.connectors) {
      const name = connector.name();
      try {
        const events = await connector.poll(since, until, { now });

        if (!Array.isArray(events)) {
          throw new Error("connector returned invalid events payload");
        }

        await params.store.upsertCostEvents(events);
        await params.store.recordConnectorRun({
          connector: name,
          ran_at: now().toISOString(),
          success: true,
          error: null
        });
        logger.info(`[scheduler] ${name}: ingested ${events.length} events`);
      } catch (error) {
        let message = error instanceof Error ? error.message : String(error);
        let retryAttempt = 0;
        while (retryAttempt < maxRetries) {
          retryAttempt += 1;
          const waitMs = retryBaseMs * Math.pow(2, retryAttempt - 1);
          logger.error(`[scheduler] ${name} failed: ${message}; retry ${retryAttempt}/${maxRetries} in ${waitMs}ms`);
          await sleep(waitMs);
          try {
            const retried = await connector.poll(since, until, { now });
            await params.store.upsertCostEvents(retried);
            await params.store.recordConnectorRun({
              connector: name,
              ran_at: now().toISOString(),
              success: true,
              error: null
            });
            logger.info(`[scheduler] ${name}: ingested ${retried.length} events after retry`);
            message = "";
            break;
          } catch (retryError) {
            message = retryError instanceof Error ? retryError.message : String(retryError);
          }
        }

        if (message === "") {
          continue;
        }

        try {
          await params.store.recordConnectorRun({
            connector: name,
            ran_at: now().toISOString(),
            success: false,
            error: message
          });
        } catch (runRecordError) {
          const runMessage =
            runRecordError instanceof Error ? runRecordError.message : String(runRecordError);
          logger.error(`[scheduler] ${name} failed to record run metadata: ${runMessage}`);
        }
        logger.error(`[scheduler] ${name} failed: ${message}`);
      }
    }

    if (params.afterTick) {
      try {
        await params.afterTick(now());
        await params.store.recordConnectorRun({
          connector: "budget-alert",
          ran_at: now().toISOString(),
          success: true,
          error: null
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        try {
          await params.store.recordConnectorRun({
            connector: "budget-alert",
            ran_at: now().toISOString(),
            success: false,
            error: message
          });
        } catch (runRecordError) {
          const runMessage = runRecordError instanceof Error ? runRecordError.message : String(runRecordError);
          logger.error(`[scheduler] budget-alert failed to record run metadata: ${runMessage}`);
        }
        logger.error(`[scheduler] post-tick hook failed: ${message}`);
      }
    }
  };

  const timer = setInterval(() => {
    void tick();
  }, params.intervalMinutes * 60 * 1000);

  void tick();

  return {
    stop: () => clearInterval(timer),
    tickNow: tick
  };
}
