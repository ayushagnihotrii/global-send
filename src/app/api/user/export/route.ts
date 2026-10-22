import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getItems, getUserById } from '@/lib/db';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const user = await getUserById(session.userId);
    const activeItems = await getItems({ userId: session.userId, limit: 5000 });
    const trashItems = await getItems({ userId: session.userId, inTrash: true, limit: 5000 });

    const exportData = {
      exportDate: new Date().toISOString(),
      user: {
        id: user?.id,
        username: user?.username,
        createdAt: user?.createdAt,
      },
      counts: {
        active: activeItems.length,
        trash: trashItems.length,
      },
      items: activeItems,
      trash: trashItems,
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="quickvault-export-${session.username}-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (err: any) {
    console.error('Export error:', err);
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 });
  }
}
