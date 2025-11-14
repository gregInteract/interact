import React, { useState } from 'react';
import { FileUpload } from '../components/FileUpload';
import { analyzeTranscript } from '../services/geminiService';

export const TranscriptAnalyzer: React.FC = () => {
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (files: FileList) => {
    const file = files[0];
    if (!file) return;

    try {
      setIsLoading(true);
      setError(null);

      const content = await file.text();

      // Call Gemini AI backend
      const result = await analyzeTranscript(content, 'your_campaign'); 
      setAnalysisResult(result);

    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`Analysis failed: ${message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">Transcript Analyzer</h2>

      <FileUpload onFileUpload={handleFileUpload} disabled={isLoading} />

      {isLoading && <p className="mt-4 text-blue-600">Analyzing transcript...</p>}
      {error && <p className="mt-4 text-red-600">{error}</p>}
      {analysisResult && (
        <pre className="mt-4 bg-slate-100 dark:bg-slate-800 p-4 rounded">
          {JSON.stringify(analysisResult, null, 2)}
        </pre>
      )}
    </div>
  );
};
