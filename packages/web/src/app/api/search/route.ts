import { NextResponse } from 'next/server';
import { getAllNarrativesFlat } from '@/lib/reports';

export const revalidate = 3600;

export async function GET() {
  const items = await getAllNarrativesFlat();
  return NextResponse.json(items);
}
