'use client'

import Link from 'next/link'

export default function CoursesPage() {
  const courses = [
    {
      id: 1,
      title: 'Python Basics',
      description: 'A Python course starting from the fundamentals of programming',
      progress: 30,
      color: 'from-lms-blue-400 to-lms-blue-600',
      buttonColor: 'bg-lms-blue-500 hover:bg-lms-blue-600',
    },
    {
      id: 2,
      title: 'Introduction to Data Analysis',
      description: 'Learn the basic skills for handling data',
      progress: 65,
      color: 'from-purple-400 to-purple-600',
      buttonColor: 'bg-purple-500 hover:bg-purple-600',
    },
    {
      id: 3,
      title: 'Web Development Basics',
      description: 'Web development using HTML, CSS, and JavaScript',
      progress: 10,
      color: 'from-green-400 to-green-600',
      buttonColor: 'bg-green-500 hover:bg-green-600',
    },
    {
      id: 4,
      title: 'Machine Learning Basics',
      description: 'Fundamental concepts of AI and machine learning',
      progress: 0,
      color: 'from-orange-400 to-orange-600',
      buttonColor: 'bg-orange-500 hover:bg-orange-600',
    },
    {
      id: 5,
      title: 'Database Design',
      description: 'Fundamentals of SQL and database design',
      progress: 45,
      color: 'from-blue-400 to-blue-600',
      buttonColor: 'bg-blue-500 hover:bg-blue-600',
    },
    {
      id: 6,
      title: 'Git & GitHub',
      description: 'Understanding and utilizing version control systems',
      progress: 80,
      color: 'from-gray-400 to-gray-600',
      buttonColor: 'bg-gray-500 hover:bg-gray-600',
    },
  ]

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
            <Link href="/courses" className="text-lms-blue-600 font-medium">
              Courses
            </Link>
            <Link href="/editor" className="text-gray-700 hover:text-lms-blue-600">
              Editor
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="mb-2 text-3xl font-bold">All Courses</h1>
            <p className="text-gray-600">Explore various courses and start learning</p>
          </div>

          {/* Filter/Sort Options */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex gap-2">
              <button className="rounded-md bg-lms-blue-500 px-4 py-2 text-sm text-white">
                All
              </button>
              <button className="rounded-md bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                In Progress
              </button>
              <button className="rounded-md bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                Completed
              </button>
            </div>
            <select className="rounded-md border bg-white px-4 py-2 text-sm">
              <option>Most Recent</option>
              <option>Most Popular</option>
              <option>By Progress</option>
            </select>
          </div>

          {/* Course Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <div
                key={course.id}
                className="rounded-lg bg-white p-6 shadow-md transition-shadow hover:shadow-lg"
              >
                <div
                  className={`mb-4 h-40 rounded-md bg-gradient-to-r ${course.color}`}
                />
                <h3 className="mb-2 text-lg font-semibold">{course.title}</h3>
                <p className="mb-4 text-sm text-gray-600">{course.description}</p>
                <div className="mb-3">
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-gray-600">Progress</span>
                    <span className="font-medium">{course.progress}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full bg-lms-blue-500 transition-all"
                      style={{ width: `${course.progress}%` }}
                    />
                  </div>
                </div>
                <Link
                  href={`/courses/${course.id}`}
                  className={`inline-block w-full rounded-md ${course.buttonColor} py-2 text-center text-white transition-colors`}
                >
                  {course.progress > 0 ? 'Continue Learning' : 'Get Started'}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
