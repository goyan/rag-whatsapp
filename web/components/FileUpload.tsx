'use client';

import { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  Loader2,
  Sparkles,
  MessageSquare,
  Users,
  Clock,
} from 'lucide-react';
import { ingest, type IngestResult } from '@/lib/api';

interface FileUploadProps {
  onComplete?: (result: IngestResult) => void;
}

export function FileUpload({ onComplete }: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IngestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith('.txt')) {
      setFile(droppedFile);
      setError(null);
    } else {
      setError('Please upload a .txt file');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const res = await ingest(file, { conversationName: name || undefined });
      setResult(res);
      onComplete?.(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setName('');
    setResult(null);
    setError(null);
  };

  if (result) {
    return (
      <div className="paper-card p-8 animate-fadeInScale">
        {/* Success Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--greenhouse-400)] to-[var(--greenhouse-600)] flex items-center justify-center shadow-[var(--shadow-botanical)]">
            <CheckCircle className="w-7 h-7 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-display font-semibold text-[var(--foreground)]">
              Import Complete!
            </h3>
            <p className="text-sm text-[var(--graphite)]">
              Your conversations are ready to query
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-4 rounded-xl bg-[var(--earth-200)] border border-[var(--border)]">
            <div className="flex items-center gap-2 text-[var(--graphite)] mb-1">
              <MessageSquare className="w-4 h-4" />
              <span className="text-xs font-medium">Messages</span>
            </div>
            <p className="text-2xl font-display font-semibold text-[var(--foreground)]">
              {result.result.totalMessages.toLocaleString()}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-[var(--earth-200)] border border-[var(--border)]">
            <div className="flex items-center gap-2 text-[var(--graphite)] mb-1">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs font-medium">Chunks</span>
            </div>
            <p className="text-2xl font-display font-semibold text-[var(--foreground)]">
              {result.result.totalChunks.toLocaleString()}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-[var(--earth-200)] border border-[var(--border)]">
            <div className="flex items-center gap-2 text-[var(--graphite)] mb-1">
              <Users className="w-4 h-4" />
              <span className="text-xs font-medium">Participants</span>
            </div>
            <p className="text-2xl font-display font-semibold text-[var(--foreground)]">
              {result.result.participants.length}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-[var(--earth-200)] border border-[var(--border)]">
            <div className="flex items-center gap-2 text-[var(--graphite)] mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-medium">Duration</span>
            </div>
            <p className="text-2xl font-display font-semibold text-[var(--foreground)]">
              {(result.result.duration / 1000).toFixed(1)}s
            </p>
          </div>
        </div>

        {/* Participants list */}
        {result.result.participants.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider mb-2">
              Participants
            </p>
            <div className="flex flex-wrap gap-2">
              {result.result.participants.map((p) => (
                <span
                  key={p}
                  className="px-3 py-1 rounded-full text-xs font-medium bg-[var(--greenhouse-100)] text-[var(--greenhouse-700)]"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={reset}
          className="w-full py-3 text-sm font-medium text-[var(--greenhouse-600)] hover:text-[var(--greenhouse-700)] hover:bg-[var(--greenhouse-50)] rounded-xl transition-colors"
        >
          Upload another file
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onClick={() => inputRef.current?.click()}
        className={`
          relative rounded-2xl p-10 text-center cursor-pointer transition-all duration-300
          border-2 border-dashed bg-[var(--earth-200)]
          ${isDragging
            ? 'border-[var(--greenhouse-400)] !bg-[var(--greenhouse-100)] scale-[1.02]'
            : file
              ? 'border-[var(--greenhouse-400)] !bg-[var(--greenhouse-100)]'
              : 'border-[var(--border)] hover:border-[var(--greenhouse-300)] hover:bg-[var(--earth-300)]'
          }
        `}
      >
        {/* Decorative corners */}
        <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-[var(--greenhouse-300)] rounded-tl-lg opacity-50" />
        <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-[var(--greenhouse-300)] rounded-tr-lg opacity-50" />
        <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-[var(--greenhouse-300)] rounded-bl-lg opacity-50" />
        <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-[var(--greenhouse-300)] rounded-br-lg opacity-50" />

        <input
          ref={inputRef}
          type="file"
          accept=".txt"
          onChange={handleFileSelect}
          className="hidden"
        />

        {file ? (
          <div className="flex items-center justify-center gap-4 animate-fadeIn">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--greenhouse-400)] to-[var(--greenhouse-600)] flex items-center justify-center shadow-md">
              <FileText className="w-7 h-7 text-white" />
            </div>
            <div className="text-left">
              <p className="font-medium text-[var(--foreground)]">{file.name}</p>
              <p className="text-sm text-[var(--graphite)]">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
        ) : (
          <div className="animate-fadeIn">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--earth-300)] flex items-center justify-center">
              <Upload className="w-8 h-8 text-[var(--graphite)]" />
            </div>
            <p className="text-[var(--foreground)] font-medium mb-1">
              Drop your WhatsApp export here
            </p>
            <p className="text-sm text-[var(--graphite)]">
              or click to browse for a .txt file
            </p>
          </div>
        )}
      </div>

      {/* Conversation name */}
      {file && (
        <div className="animate-fadeIn">
          <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
            Conversation name
            <span className="text-[var(--muted)] font-normal ml-1">(optional)</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Family Group, Work Team..."
            className="input-organic w-full"
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 animate-fadeIn">
          <XCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Upload button */}
      {file && (
        <button
          onClick={handleUpload}
          disabled={loading}
          className="w-full btn-botanical py-4 text-base flex items-center justify-center gap-3 animate-fadeIn disabled:opacity-70"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing conversations...
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              Import Conversations
            </>
          )}
        </button>
      )}
    </div>
  );
}
