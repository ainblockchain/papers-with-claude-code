'use client';

import { useEffect } from 'react';
import { useVillageStore } from '@/stores/useVillageStore';
import { useAinStore } from '@/stores/useAinStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { friendPresenceAdapter } from '@/lib/adapters/friends';
import { ainAdapter } from '@/lib/adapters/ain-blockchain';
import { trackEvent } from '@/lib/ain/event-tracker';
import type { Paper } from '@/types/paper';
import type { CourseLocation } from '@/lib/ain/location-types';
import { assignCoursesToGrid, generateCourseLocations } from '@/lib/tmj/village-generator';

const HEARTBEAT_MS = 300_000; // 5 minutes
const COURSE_COLORS = ['#8B4513', '#4A5568', '#2D3748', '#553C9A', '#2B6CB0', '#276749', '#9B2C2C'];

/** Generate course entrance positions using the plot grid system */
function generateCourseLocationsFromPapers(papers: Paper[]): CourseLocation[] {
  const coursesInput = papers.map((paper, i) => ({
    paperId: paper.id,
    label: paper.title.split(':')[0].split('(')[0].trim(),
    color: COURSE_COLORS[i % COURSE_COLORS.length],
  }));
  const { assignments } = assignCoursesToGrid(coursesInput);
  return generateCourseLocations(coursesInput, assignments);
}

/**
 * Orchestration hook for syncing player location, course positions,
 * and friend presence with the AIN blockchain.
 *
 * @param courses - Course list from API (React Query). When provided,
 *   these are used to generate default village map buildings instead of mock data.
 */
export function useLocationSync(courses?: Paper[]) {
  const { setCourseLocations, setFriends, setPlayerPosition, setPlayerDirection, setPositionRestored, positionRestored } =
    useVillageStore();
  const { ainAddress, fetchCourseLocations, fetchAllLocations, setCourseLocation } =
    useAinStore();
  const { user } = useAuthStore();

  // ── 1. Restore position & load course locations on mount ──
  useEffect(() => {
    // Wait until courses are loaded from API
    if (!courses || courses.length === 0) return;

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
        // Generate defaults from API courses
        const defaults = generateCourseLocationsFromPapers(courses!);
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
  }, [ainAddress, courses]); // eslint-disable-line react-hooks/exhaustive-deps

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
