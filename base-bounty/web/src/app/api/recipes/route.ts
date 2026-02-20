import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getAin } from '@/lib/ain-server';

export async function GET() {
  try {
    const ain = getAin();
    const recipes = await ain.cogito.listRecipes();
    return NextResponse.json({ recipes: recipes || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, recipes: [] }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const { markdown } = await request.json();
    if (!markdown) {
      return NextResponse.json({ error: 'markdown field is required' }, { status: 400 });
    }

    const ain = getAin();
    const result = await ain.cogito.registerRecipe(markdown);
    return NextResponse.json({ result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const { name } = await request.json();
    if (!name) {
      return NextResponse.json({ error: 'name field is required' }, { status: 400 });
    }

    const ain = getAin();
    const result = await ain.cogito.removeRecipe(name);
    return NextResponse.json({ result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
