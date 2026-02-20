'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'

export default function CoursePage() {
  const params = useParams()
  const courseId = params.id

  const courseData: Record<string, any> = {
    '1': {
      title: 'Python Basics',
      description: 'A Python course starting from the fundamentals of programming',
      color: 'from-lms-blue-400 to-lms-blue-600',
      modules: [
        {
          id: 1,
          title: 'Week 1: Getting Started with Python',
          lessons: [
            { id: 1, title: 'Introduction to Python', completed: true },
            { id: 2, title: 'Variables and Data Types', completed: true },
            { id: 3, title: 'Basic Operations', completed: false },
          ],
        },
        {
          id: 2,
          title: 'Week 2: Control Statements',
          lessons: [
            { id: 4, title: 'Conditionals (if, else)', completed: false },
            { id: 5, title: 'Loops (for, while)', completed: false },
          ],
        },
      ],
    },
    '2': {
      title: 'Introduction to Data Analysis',
      description: 'Learn the basic skills for handling data',
      color: 'from-purple-400 to-purple-600',
      modules: [
        {
          id: 1,
          title: 'Week 1: Overview of Data Analysis',
          lessons: [
            { id: 1, title: 'What is Data Analysis?', completed: true },
            { id: 2, title: 'Pandas Basics', completed: false },
          ],
        },
      ],
    },
    '3': {
      title: 'Web Development Basics',
      description: 'Web development using HTML, CSS, and JavaScript',
      color: 'from-green-400 to-green-600',
      modules: [
        {
          id: 1,
          title: 'Week 1: HTML Basics',
          lessons: [
            { id: 1, title: 'HTML Tags', completed: true },
            { id: 2, title: 'HTML Document Structure', completed: false },
          ],
        },
      ],
    },
  }

  const course = courseData[courseId as string] || courseData['1']

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b bg-white shadow-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="text-2xl font-bold text-lms-blue-600">
            Hackathon LMS
          </Link>
          <nav className="flex gap-6">
            <Link href="/" className="text-gray-700 hover:text-lms-blue-600">
              Dashboard
            </Link>
            <Link href="/courses" className="text-gray-700 hover:text-lms-blue-600">
              Courses
            </Link>
            <Link href="/editor" className="text-gray-700 hover:text-lms-blue-600">
              Editor
            </Link>
          </nav>
        </div>
      </header>

      {/* Course Header */}
      <div className={`bg-gradient-to-r ${course.color} py-12 text-white`}>
        <div className="container mx-auto px-4">
          <Link href="/" className="mb-4 inline-block text-white/80 hover:text-white">
            ← Go Back
          </Link>
          <h1 className="mb-2 text-4xl font-bold">{course.title}</h1>
          <p className="text-lg text-white/90">{course.description}</p>
        </div>
      </div>

      {/* Course Content */}
      <main className="flex-1 bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-4xl">
            {course.modules.map((module: any) => (
              <div key={module.id} className="mb-6 rounded-lg bg-white p-6 shadow">
                <h2 className="mb-4 text-xl font-semibold">{module.title}</h2>
                <div className="space-y-3">
                  {module.lessons.map((lesson: any) => (
                    <div
                      key={lesson.id}
                      className="flex items-center justify-between rounded-md border p-4 transition-colors hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-6 w-6 items-center justify-center rounded-full ${
                            lesson.completed
                              ? 'bg-green-500 text-white'
                              : 'border-2 border-gray-300'
                          }`}
                        >
                          {lesson.completed && '✓'}
                        </div>
                        <span
                          className={
                            lesson.completed ? 'text-gray-600' : 'font-medium'
                          }
                        >
                          {lesson.title}
                        </span>
                      </div>
                      <Link
                        href="/editor"
                        className="rounded-md bg-lms-blue-500 px-4 py-2 text-sm text-white transition-colors hover:bg-lms-blue-600"
                      >
                        Start Learning
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
