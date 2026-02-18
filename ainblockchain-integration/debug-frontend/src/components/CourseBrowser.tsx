'use client';

import { useState } from 'react';
import CourseAccessPanel from './CourseAccessPanel';

interface CourseEntry {
  contentId: string;
  title: string;
  price: string;
  payTo: string;
  description: string;
  contentHash: string;
  createdAt: number;
}

export default function CourseBrowser() {
  const [courses, setCourses] = useState<CourseEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<CourseEntry | null>(null);

  async function fetchCourses() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/knowledge/list');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setCourses(data.data || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Browse Courses</h2>
          <p className="text-gray-400 text-sm">
            View available gated courses and purchase access.
          </p>
        </div>
        <button
          onClick={fetchCourses}
          disabled={loading}
          className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-800 disabled:text-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          {loading && (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-800 rounded-lg p-3 mb-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {courses.length === 0 && !loading && (
        <p className="text-gray-500 text-sm">
          No courses published yet. Click Refresh to check, or publish one above.
        </p>
      )}

      {courses.length > 0 && (
        <div className="space-y-3">
          {courses.map((course) => (
            <div
              key={course.contentId}
              className={`border rounded-lg p-4 transition-colors cursor-pointer ${
                selectedCourse?.contentId === course.contentId
                  ? 'border-purple-500 bg-purple-900/10'
                  : 'border-gray-700 bg-gray-800 hover:border-gray-600'
              }`}
              onClick={() => setSelectedCourse(
                selectedCourse?.contentId === course.contentId ? null : course
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-medium text-sm truncate">{course.title}</h3>
                  {course.description && (
                    <p className="text-gray-400 text-xs mt-1 line-clamp-2">{course.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-gray-500 font-mono truncate">
                      Publisher: {course.payTo}
                    </span>
                  </div>
                </div>
                <div className="ml-4 flex-shrink-0">
                  <span className="inline-flex items-center bg-purple-900/40 border border-purple-700 text-purple-300 text-xs font-medium px-2.5 py-1 rounded-full">
                    {course.price} AIN
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedCourse && (
        <div className="mt-4 border-t border-gray-700 pt-4">
          <CourseAccessPanel course={selectedCourse} />
        </div>
      )}
    </div>
  );
}
