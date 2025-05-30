import { NextResponse } from 'next/server';
import { traced} from 'braintrust';
import { logger as logger_component } from "@/components/logger";

const logger = logger_component;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { feedback, spanId } = body;

    // Log the feedback using Braintrust

      // Here you can add any additional logging or storage logic
      console.log('Feedback received:', { feedback, spanId });
      logger.logFeedback({
        id: spanId,
        scores: {
            feedback: feedback
        },
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error logging feedback:', error);
    return NextResponse.json(
      { error: 'Failed to log feedback' },
      { status: 500 }
    );
  }
} 