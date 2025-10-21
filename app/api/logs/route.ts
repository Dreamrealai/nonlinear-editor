import { NextRequest, NextResponse } from 'next/server';

type LogEntry = {
  level: string;
  timestamp: string;
  message: string;
  data?: Record<string, unknown>;
  userAgent?: string;
  url?: string;
};

export async function POST(request: NextRequest) {
  try {
    const { logs } = await request.json() as { logs: LogEntry[] };

    if (!Array.isArray(logs)) {
      return NextResponse.json(
        { error: 'Invalid logs format' },
        { status: 400 }
      );
    }

    // Send to Axiom using fetch API
    const axiomToken = process.env.AXIOM_TOKEN;
    const axiomDataset = process.env.AXIOM_DATASET;

    if (!axiomToken || !axiomDataset) {
      // In development or if Axiom not configured, just log to console
      if (process.env.NODE_ENV === 'development') {
        logs.forEach((log) => {
          const level = log.level;
          if (level === 'error') {
            console.error(`[${log.timestamp}] ${log.message}`, log.data || '');
          } else if (level === 'warn') {
            console.warn(`[${log.timestamp}] ${log.message}`, log.data || '');
          } else if (level === 'debug') {
            console.debug(`[${log.timestamp}] ${log.message}`, log.data || '');
          } else {
            console.log(`[${log.timestamp}] ${log.message}`, log.data || '');
          }
        });
      }
      return NextResponse.json({ success: true, count: logs.length });
    }

    // Send logs to Axiom
    const response = await fetch(
      `https://api.axiom.co/v1/datasets/${axiomDataset}/ingest`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${axiomToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(logs.map(log => ({
          ...log,
          _time: log.timestamp,
          source: 'browser',
        }))),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Axiom ingest failed:', errorText);
      return NextResponse.json({ success: false, error: 'Failed to send logs to Axiom' }, { status: 200 });
    }

    return NextResponse.json({ success: true, count: logs.length });
  } catch (error) {
    console.error('Log endpoint error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
