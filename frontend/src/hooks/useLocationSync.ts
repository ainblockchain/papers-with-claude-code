'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useVillageStore } from '@/stores/useVillageStore';
import { useAinStore } from '@/stores/useAinStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { friendPresenceAdapter } from '@/lib/adapters/friends';
import { ainAdapter } from '@/lib/adapters/ain-blockchain';
import { MOCK_PAPERS } from '@/constants/mock-papers';
import type { UserLocation, CourseLocation } from '@/lib/ain/location-types';

const DEBOUNCE_MS = 5000;
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
 * Call once inside VillageCanvas (or the village page layout).
 */
export function useLocationSync() {
  const { playerPosition, playerDirection, setCourseLocations, setFriends, setPlayerPosition, setPlayerDirection, setPositionRestored, positionRestored } =
    useVillageStore();
  const { ainAddress, fetchCourseLocations, updateLocation, fetchAllLocations, setCourseLocation } =
    useAinStore();
  const { user } = useAuthStore();

  const lastWrittenRef = useRef<string>('');
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── 1. Restore position & load course locations on mount ──
  useEffect(() => {
    let cancelled = false;

    async function init() {
      // Fetch course locations from AIN
      await fetchCourseLocations();
      const { courseLocations: stored } = useAinStore.getState();

      if (stored && Object.keys(stored).length > 0) {
        // Use blockchain course locations
        setCourseLocations(Object.values(stored));
      } else {
        // Seed defaults (first-time migration)
        const defaults = generateDefaultCourseLocations();
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
            if (myLocation.scene === 'village') {
              setPlayerPosition({ x: myLocation.x, y: myLocation.y });
              setPlayerDirection(myLocation.direction || 'down');
            }
            setPositionRestored(true);
          }
        } catch {
          // best effort — use default position
        }
      }
    }

    init();
    return () => { cancelled = true; };
  }, [ainAddress]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 2. Debounced position write to AIN ──
  const writePosition = useCallback(() => {
    const key = `${playerPosition.x},${playerPosition.y},${playerDirection}`;
    if (key === lastWrittenRef.current) return;
    lastWrittenRef.current = key;

    const location: UserLocation = {
      x: playerPosition.x,
      y: playerPosition.y,
      direction: playerDirection,
      scene: 'village',
      updatedAt: Date.now(),
    };

    updateLocation(location);
    friendPresenceAdapter.updateMyPosition({ x: playerPosition.x, y: playerPosition.y, scene: 'village' });
  }, [playerPosition, playerDirection, updateLocation]);

  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(writePosition, DEBOUNCE_MS);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [writePosition]);

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
