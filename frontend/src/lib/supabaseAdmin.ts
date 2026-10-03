import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://arbhdndsmpzvuliiopru.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

let adminClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!adminClient) {
    if (!supabaseServiceKey) {
      console.warn('SUPABASE_SERVICE_ROLE_KEY is not defined in environment variables');
    }
    adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      realtime: {
        params: {
          eventsPerSecond: 40,
        },
      },
    });
  }
  return adminClient;
}

const activeChannels = new Map<string, RealtimeChannel>();

/**
 * Broadcast an event to a session's realtime channel.
 */
export async function broadcastToSession(sessionId: string, event: string, payload: unknown): Promise<void> {
  const supabase = getSupabaseAdmin();
  const channelName = `session:${sessionId}`;

  let channel = activeChannels.get(channelName);

  if (!channel || channel.state !== 'joined') {
    channel = supabase.channel(channelName, {
      config: {
        broadcast: { ack: false, self: false },
      },
    });

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        resolve(); // Continue even if timeout so API route doesn't hang
      }, 4000);

      channel!.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          clearTimeout(timeout);
          activeChannels.set(channelName, channel!);
          resolve();
        } else if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
          clearTimeout(timeout);
          reject(new Error(`Failed to subscribe to realtime channel: ${status}`));
        }
      });
    });
  }

  try {
    await channel.send({
      type: 'broadcast',
      event,
      payload,
    });
  } catch (err) {
    console.error(`Failed to broadcast ${event} to ${channelName}:`, err);
  }
}

/**
 * Kahoot-style speed bonus scoring formula
 * points = is_correct ? Math.round(points_base * (1 - (response_time_ms / (time_limit_seconds * 1000)) * 0.5)) : 0
 */
export function calculatePoints(
  isCorrect: boolean,
  responseTimeMs: number,
  timeLimitSeconds: number,
  pointsBase: number = 1000
): number {
  if (!isCorrect) return 0;
  const maxMs = Math.max(1000, timeLimitSeconds * 1000);
  const clampedMs = Math.max(0, Math.min(responseTimeMs, maxMs));
  const timeFactor = 1 - (clampedMs / maxMs) * 0.5;
  return Math.max(0, Math.round(pointsBase * timeFactor));
}

/**
 * Generates a random 6-digit numeric PIN
 */
export function generatePin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
