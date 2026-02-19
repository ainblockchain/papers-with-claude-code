'use client';

import { useEffect } from 'react';
import { useVillageStore } from '@/stores/useVillageStore';
import { useAinStore } from '@/stores/useAinStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { friendPresenceAdapter } from '@/lib/adapters/friends';
import { ainAdapter } from '@/lib/adapters/ain-blockchain';
import { trackEvent } from '@/lib/ain/event-tracker';
import { MOCK_PAPERS } from '@/constants/mock-papers';
import type { CourseLocation } from '@/lib/ain/location-types';

const HEARTBEAT_MS = 300_000; // 5 minutes
const COURSE_COLORS = ['#8B4513', '#4A5568', '#2D3748', '#553C9A', '#2B6CB0', '#276749'];

/** Generate default course entrance positions (3-column grid) matching the old hardcoded layout */
function generateDefaultCourseLocations(): CourseLocation[] {
  return MOCK_PAPERS.slice(0, 6).map((paper, i) => ({
    paperId: paper.id,
    label: paper.title.split(':')[0].trim(),
    x: 8 + (i % 3) * 16,
    y: 6 + Math.floor(i / 3) * 14,
    width: 4,
    height: 3,
    color: COURSE_COLORS[i],
    registeredAt: Date.now(),
  }));
}

/**
 * Orchestration hook for syncing player location, course positions,
 * and friend presence with the AIN blockchain.
 *
 * Location writes are event-driven (not continuous debounce).
 * Call once inside VillageCanvas (or the village page layout).
 */
export function useLocationSync() {
  const { setCourseLocations, setFriends, setPlayerPosition, setPlayerDirection, setPositionRestored, positionRestored } =
    useVillageStore();
  const { ainAddress, fetchCourseLocations, fetchAllLocations, setCourseLocation } =
    useAinStore();
  const { user } = useAuthStore();

  // ── 1. Restore position & load course locations on mount ──
  useEffect(() => {
    let cancelled = false;

    async function init() {
      // Fetch course locations from AIN
      await fetchCourseLocations();
      const { courseLocations: stored } = useAinStore.getState();

      let courseLocationsList: CourseLocation[];

      if (stored && Object.keys(stored).length > 0) {
        courseLocationsList = Object.values(stored);
        setCourseLocations(courseLocationsList);
      } else {
        // Seed defaults (first-time migration)
        const defaults = generateDefaultCourseLocations();
        courseLocationsList = defaults;
        setCourseLocations(defaults);
        // Write defaults to AIN in background
        for (const course of defaults) {
          if (cancelled) break;
          setCourseLocation(course);
        }
      }

      // Restore own position from AIN if user has an AIN address
      if (ainAddress && !positionRestored) {
        try {
          const myLocation = await ainAdapter.getLocation(ainAddress);
          if (myLocation && !cancelled) {
            if (myLocation.scene === 'course' && myLocation.paperId) {
              // Returning from a course — spawn at course building entrance
              const course = courseLocationsList.find(
                (cl) => cl.paperId === myLocation.paperId,
              );
              if (course) {
                const entranceX = course.x + Math.floor(course.width / 2);
                const entranceY = course.y + course.height;
                setPlayerPosition({ x: entranceX, y: entranceY });
                setPlayerDirection('down');
              }
            } else if (myLocation.scene === 'village') {
              setPlayerPosition({ x: myLocation.x, y: myLocation.y });
              setPlayerDirection(myLocation.direction || 'down');
            }
            setPositionRestored(true);
          }
        } catch {
          // best effort — use default position
        }
      }

      // Emit village_enter event with restored position
      if (!cancelled) {
        const { playerPosition: pos, playerDirection: dir } =
          useVillageStore.getState();
        trackEvent({
          type: 'village_enter',
          scene: 'village',
          x: pos.x,
          y: pos.y,
          direction: dir,
          timestamp: Date.now(),
        });
      }
    }

    init();
    return () => { cancelled = true; };
  }, [ainAddress]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 2. Heartbeat (5-minute liveness) ──
  useEffect(() => {
    if (!ainAddress) return;

    const heartbeat = () => {
      const { playerPosition: pos, playerDirection: dir } =
        useVillageStore.getState();
      trackEvent({
        type: 'heartbeat',
        scene: 'village',
        x: pos.x,
        y: pos.y,
        direction: dir,
        timestamp: Date.now(),
      });
    };

    const interval = setInterval(heartbeat, HEARTBEAT_MS);
    return () => clearInterval(interval);
  }, [ainAddress]);

  // ── 3. Friend presence polling ──
  useEffect(() => {
    const unsubscribe = friendPresenceAdapter.subscribeToFriendPositions((friends) => {
      setFriends(friends);
    });
    return unsubscribe;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 4. Periodic friend location fetch from AIN ──
  useEffect(() => {
    if (!ainAddress) return;

    const poll = async () => {
      await fetchAllLocations();
    };

    poll(); // initial fetch
    const interval = setInterval(poll, 10000);
    return () => clearInterval(interval);
  }, [ainAddress, fetchAllLocations]);
}
