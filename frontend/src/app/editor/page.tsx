'use client'

import { useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'

// Dynamically import Monaco Editor (prevent SSR)
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center">Loading editor...</div>,
})

export default function EditorPage() {
  const [code, setCode] = useState(`# Write your Python code here!

def hello_world():
    print("Hello, World!")

hello_world()
`)
  const [output, setOutput] = useState('')
  const [isRunning, setIsRunning] = useState(false)

  const handleRunCode = () => {
    setIsRunning(true)
    // Actual code execution requires backend API integration
    // Here we only perform a simple simulation for demo purposes
    setTimeout(() => {
      setOutput('Hello, World!\n\nCode execution completed.')
      setIsRunning(false)
    }, 1000)
  }

  return (
    <div className="flex h-screen flex-col">
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
            <Link href="/explore" className="text-gray-700 hover:text-lms-blue-600">
              Explore
            </Link>
            <Link href="/editor" className="text-gray-700 hover:text-lms-blue-600">
              Editor
            </Link>
          </nav>
        </div>
      </header>

      {/* Editor Section */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Code Editor */}
        <div className="flex w-1/2 flex-col border-r">
          <div className="flex items-center justify-between border-b bg-gray-100 px-4 py-3">
            <h2 className="font-semibold">Code Editor</h2>
            <button
              onClick={handleRunCode}
              disabled={isRunning}
              className="rounded-md bg-green-500 px-4 py-2 text-sm text-white transition-colors hover:bg-green-600 disabled:bg-gray-400"
            >
              {isRunning ? 'Running...' : '▶ Run'}
            </button>
          </div>
          <div className="flex-1">
            <MonacoEditor
              height="100%"
              defaultLanguage="python"
              value={code}
              onChange={(value) => setCode(value || '')}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
              }}
            />
          </div>
        </div>

        {/* Right Panel - Output */}
        <div className="flex w-1/2 flex-col">
          <div className="border-b bg-gray-100 px-4 py-3">
            <h2 className="font-semibold">Output</h2>
          </div>
          <div className="flex-1 overflow-auto bg-gray-900 p-4">
            <pre className="font-mono text-sm text-green-400">
              {output || 'Run the code to see the output here.'}
            </pre>
          </div>
        </div>
      </div>

      {/* Instructions Panel (Optional) */}
      <div className="border-t bg-white p-4">
        <div className="container mx-auto">
          <h3 className="mb-2 font-semibold">💡 Learning Guide</h3>
          <p className="text-sm text-gray-600">
            Write Python code in the left editor and click the "Run" button to see the results.
          </p>
        </div>
      </div>
    </div>
  )
}
