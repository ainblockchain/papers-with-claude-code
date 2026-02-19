import { NextRequest, NextResponse } from 'next/server';
import { getAinClient } from '@/lib/ain/client';

const LOCATIONS_PATH = '/apps/knowledge/locations';

export async function GET(request: NextRequest) {
  try {
    const ain = getAinClient();
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (address) {
      const location = await ain.db.ref(`${LOCATIONS_PATH}/${address}`).getValue();
      return NextResponse.json({ ok: true, data: location });
    }

    const allLocations = await ain.db.ref(LOCATIONS_PATH).getValue();
    return NextResponse.json({ ok: true, data: allLocations || {} });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message ?? 'Failed to get locations' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const ain = getAinClient();
    const { location } = await request.json();

    if (!location || typeof location.x !== 'number' || typeof location.y !== 'number') {
      return NextResponse.json(
        { ok: false, error: 'location with x,y is required' },
        { status: 400 }
      );
    }

    const address = ain.signer.getAddress();
    const result = await ain.db.ref(`${LOCATIONS_PATH}/${address}`).setValue({
      value: {
        ...location,
        updatedAt: Date.now(),
      },
    });

    return NextResponse.json({ ok: true, data: result });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message ?? 'Failed to update location' },
      { status: 500 }
    );
  }
}
