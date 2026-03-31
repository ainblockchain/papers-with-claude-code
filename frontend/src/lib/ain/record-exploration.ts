import { getAinClient, getUserAinClient } from '@/lib/ain/client';

/**
 * Check if an exploration event already exists on-chain for this user+course+stage.
 * Used by stage-enter, stage-complete, stage-unlock routes to prevent duplicates.
 */
export async function hasExploration(
  passkeyPublicKey: string | undefined,
  paperId: string,
  eventType: string,
  depth: number,
  stageNum: number,
): Promise<boolean> {
  const ain = passkeyPublicKey ? getUserAinClient(passkeyPublicKey) : getAinClient();
  const address = ain.wallet.defaultAccount?.address;
  if (!address) return false;

  const existing = await ain.db
    .ref(`/apps/knowledge/explorations/${address}/courses|${paperId}`)
    .getValue();
  if (!existing) return false;

  return Object.values(existing).some(
    (e: any) => e.depth === depth && e.summary?.includes(eventType) && new RegExp(`stage ${stageNum}\\b`).test(e.summary ?? '')
  );
}

/**
 * Write an exploration entry directly to the blockchain, skipping the graph node write.
 *
 * The SDK's ain.knowledge.explore() creates a graph node whose key is
 * `{address}_{topicKey}_{entryId}` (~155 chars for long paperIds).
 * AIN blockchain rejects keys over ~150 chars, causing the entire atomic
 * transaction to fail — including the exploration entry itself.
 *
 * This function writes only the exploration entry + index update,
 * which use shorter path components and always succeed.
 */
export async function writeExploration(
  ain: any,
  input: {
    topicPath: string;
    title: string;
    content: string;
    summary: string;
    depth: number;
    tags: string;
  },
): Promise<{ entryId: string; txResult: any }> {
  const address = ain.wallet.defaultAccount?.address;
  if (!address) throw new Error('No wallet address');

  const { PushId } = require('@ainblockchain/ain-js/lib/ain-db/push-id');
  const topicKey = input.topicPath.replace(/\//g, '|');
  const entryId = PushId.generate();
  const now = Date.now();

  const explorationPath = `/apps/knowledge/explorations/${address}/${topicKey}/${entryId}`;
  const indexPath = `/apps/knowledge/index/by_topic/${topicKey}/explorers/${address}`;
  const currentCount = (await ain.db.ref(indexPath).getValue()) || 0;

  const txResult = await ain.sendTransaction({
    operation: {
      type: 'SET',
      op_list: [
        {
          type: 'SET_VALUE',
          ref: explorationPath,
          value: {
            topic_path: input.topicPath,
            title: input.title,
            content: input.content,
            summary: input.summary,
            depth: input.depth,
            tags: input.tags,
            price: null,
            gateway_url: null,
            content_hash: null,
            created_at: now,
            updated_at: now,
          },
        },
        {
          type: 'SET_VALUE',
          ref: indexPath,
          value: currentCount + 1,
        },
      ],
    },
  });

  return { entryId, txResult };
}
