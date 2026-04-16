import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

// READ-ONLY access to hanyang-univ.chats collection.
// This endpoint NEVER writes, updates, or deletes any data.

let cachedClient: MongoClient | null = null;

async function getClient(): Promise<MongoClient> {
  if (cachedClient) return cachedClient;
  const url = process.env.MONGODB_URL;
  if (!url) throw new Error('MONGODB_URL not configured');
  cachedClient = new MongoClient(url, { maxPoolSize: 5 });
  await cachedClient.connect();
  return cachedClient;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get('limit')) || 50, 100);

  try {
    const client = await getClient();
    const db = client.db('hanyang-univ');
    const chats = await db
      .collection('chats')
      .find(
        {},
        {
          projection: {
            _id: 0,
            session_id: 1,
            intent: 1,
            'user.message': 1,
            'assistant.contents': 1,
            created_at: 1,
          },
        },
      )
      .sort({ created_at: -1 })
      .limit(limit)
      .toArray();

    return NextResponse.json(chats);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch chats' },
      { status: 502 },
    );
  }
}
