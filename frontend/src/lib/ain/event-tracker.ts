/**
 * Event-based location tracker for AIN blockchain.
 * Replaces the old 5-second debounce with event-driven writes.
 *
 * Usage: import { trackEvent } from '@/lib/ain/event-tracker';
 *        trackEvent({ type: 'course_enter', ... });  // fire-and-forget
 */

import { ainAdapter } from '@/lib/adapters/ain-blockchain';
import type { UserLocation } from './location-types';
import type { ExplorationInput } from './types';
import type { LocationEvent, EventType } from './event-types';
import { LEARNING_EVENT_TYPES } from './event-types';

function toUserLocation(event: LocationEvent): UserLocation {
  return {
    x: event.x,
    y: event.y,
    direction: event.direction,
    scene: event.type === 'course_enter' ? 'course' : event.scene,
    paperId: 'paperId' in event ? event.paperId : undefined,
    stageIndex: 'stageIndex' in event ? event.stageIndex : undefined,
    updatedAt: event.timestamp,
  };
}

function eventTitle(type: EventType, event: LocationEvent): string {
  if ('conceptId' in event && event.conceptId) {
    return `Viewed concept: ${event.conceptId}`;
  }
  if ('stageTitle' in event && event.stageTitle) {
    return `${type}: ${event.stageTitle}`;
  }
  if ('paperId' in event) {
    return `${type} in ${event.paperId}`;
  }
  return type;
}

function toExplorationInput(event: LocationEvent & { paperId: string }): ExplorationInput {
  const stageIndex = 'stageIndex' in event ? event.stageIndex : 0;
  return {
    topicPath: `courses/${event.paperId}`,
    title: eventTitle(event.type, event),
    content: JSON.stringify({
      eventType: event.type,
      paperId: event.paperId,
      stageIndex,
      conceptId: 'conceptId' in event ? event.conceptId : undefined,
      timestamp: event.timestamp,
    }),
    summary: `${event.type} in course ${event.paperId}, stage ${stageIndex}`,
    depth: event.type === 'course_complete' ? 3 : event.type === 'stage_complete' ? 2 : 1,
    tags: [event.type, event.paperId],
  };
}

/** Fire-and-forget event tracking. Errors are logged, never thrown. */
export async function trackEvent(event: LocationEvent): Promise<void> {
  // 1. Always update location on AIN chain
  try {
    await ainAdapter.updateLocation(toUserLocation(event));
  } catch (err) {
    console.error(`[event-tracker] location write failed for ${event.type}:`, err);
  }

  // 2. For learning events, also record to the knowledge graph
  if (LEARNING_EVENT_TYPES.includes(event.type) && 'paperId' in event) {
    try {
      await ainAdapter.recordExploration(
        toExplorationInput(event as LocationEvent & { paperId: string }),
      );
    } catch (err) {
      console.error(`[event-tracker] exploration write failed for ${event.type}:`, err);
    }
  }

  // 3. Update friend presence for village events
  if (event.scene === 'village') {
    try {
      const { friendPresenceAdapter } = await import('@/lib/adapters/friends');
      friendPresenceAdapter.updateMyPosition({
        x: event.x,
        y: event.y,
        scene: 'village',
      });
    } catch {
      // best effort
    }
  }
}
