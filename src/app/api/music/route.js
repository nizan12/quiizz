import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const musicDir = path.join(process.cwd(), 'public', 'music');
    
    if (!fs.existsSync(musicDir)) {
      fs.mkdirSync(musicDir, { recursive: true });
      return NextResponse.json({ files: [] });
    }

    const files = fs.readdirSync(musicDir);
    const audioFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.mp3', '.wav', '.ogg', '.m4a'].includes(ext);
    });

    return NextResponse.json({ files: audioFiles });
  } catch (error) {
    console.error('Error reading music folder:', error);
    return NextResponse.json({ error: 'Failed to read music folder' }, { status: 500 });
  }
}
