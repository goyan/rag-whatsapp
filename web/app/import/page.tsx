'use client';

import { Sidebar } from '@/components/Sidebar';
import { FileUpload } from '@/components/FileUpload';

export default function ImportPage() {
  return (
    <div className="flex h-screen">
      <Sidebar />

      <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Import Conversations
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8">
            Upload your WhatsApp chat export to start querying your conversations.
          </p>

          <FileUpload />

          <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
            <h3 className="font-medium text-blue-700 dark:text-blue-400 mb-2">
              How to export from WhatsApp
            </h3>
            <ol className="text-sm text-blue-600 dark:text-blue-300 space-y-1 list-decimal list-inside">
              <li>Open the chat you want to export</li>
              <li>Tap the menu (three dots) {'>'} More {'>'} Export Chat</li>
              <li>Choose "Without Media" for faster processing</li>
              <li>Save the .txt file and upload it here</li>
            </ol>
          </div>
        </div>
      </main>
    </div>
  );
}
