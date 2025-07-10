'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Upload, CheckCircle, AlertCircle, Download, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { collection, writeBatch, doc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface WordData {
  word: string;
  definition: string;
}

interface ProcessedData {
  valid: WordData[];
  duplicates: string[];
  invalid: any[];
}

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<WordData[]>([]);
  const [processedData, setProcessedData] = useState<ProcessedData | null>(null);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [existingWords, setExistingWords] = useState<string[]>([]);
  const { user } = useAuth();
  const router = useRouter();

  // Load existing words to check for duplicates
  useEffect(() => {
    if (!user) return;

    const loadExistingWords = async () => {
      try {
        const q = query(
          collection(db, 'gre_words'),
          where('userId', '==', user.uid)
        );
        const querySnapshot = await getDocs(q);
        const words = querySnapshot.docs.map(doc => doc.data().word.toLowerCase().trim());
        setExistingWords(words);
      } catch (error) {
        console.error('Error loading existing words:', error);
      }
    };

    loadExistingWords();
  }, [user]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelection(selectedFile);
    }
  };

  const processJsonData = (jsonData: any[]): ProcessedData => {
    const valid: WordData[] = [];
    const duplicates: string[] = [];
    const invalid: any[] = [];

    jsonData.forEach(item => {
      if (item && typeof item === 'object' && 
          typeof item.word === 'string' && 
          typeof item.definition === 'string' &&
          item.word.trim() && item.definition.trim()) {
        
        const normalizedWord = item.word.trim().toLowerCase();
        
        // Check if it's a duplicate
        if (existingWords.includes(normalizedWord) || 
            valid.some(w => w.word.toLowerCase() === normalizedWord)) {
          duplicates.push(item.word.trim());
        } else {
          valid.push({
            word: item.word.trim(),
            definition: item.definition.trim()
          });
        }
      } else {
        invalid.push(item);
      }
    });

    return { valid, duplicates, invalid };
  };

  const handleFileSelection = (selectedFile: File) => {
    setFile(selectedFile);
    setError('');
    setPreview([]);
    setProcessedData(null);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const jsonData = JSON.parse(event.target?.result as string);
        
        if (!Array.isArray(jsonData)) {
          setError('JSON must be an array of word objects.');
          return;
        }

        const processed = processJsonData(jsonData);
        setProcessedData(processed);
        setPreview(processed.valid.slice(0, 5));
        
        if (processed.duplicates.length > 0 || processed.invalid.length > 0) {
          let errorMsg = '';
          if (processed.duplicates.length > 0) {
            errorMsg += `${processed.duplicates.length} duplicate words will be skipped. `;
          }
          if (processed.invalid.length > 0) {
            errorMsg += `${processed.invalid.length} invalid entries found.`;
          }
          setError(errorMsg);
        }
      } catch (err) {
        setError('Invalid JSON file. Please check the format.');
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleUpload = async () => {
    if (!file || !user || !processedData) return;
    
    setUploading(true);
    setError('');
    
    try {
      const { valid } = processedData;
      
      if (valid.length === 0) {
        throw new Error('No valid words to upload.');
      }
      
      const batch = writeBatch(db);
      const wordsRef = collection(db, 'gre_words');
      
      valid.forEach((wordData) => {
        const docRef = doc(wordsRef);
        batch.set(docRef, {
          word: wordData.word,
          definition: wordData.definition,
          userId: user.uid,
          createdAt: serverTimestamp()
        });
      });
      
      await batch.commit();
      
      setUploadedCount(valid.length);
      setSuccess(true);
      
      setTimeout(() => {
        router.push('/');
      }, 3000);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload words');
    } finally {
      setUploading(false);
    }
  };

  const downloadSample = () => {
    const sampleData = [
      { word: "Abate", definition: "To reduce in intensity or amount; to lessen" },
      { word: "Aberrant", definition: "Departing from an accepted standard; deviant" },
      { word: "Abscond", definition: "To leave hurriedly and secretly, typically to avoid detection" },
      { word: "Abstemious", definition: "Restrained in eating or drinking; temperate" },
      { word: "Admonish", definition: "To warn or reprimand someone firmly" }
    ];
    
    const dataStr = JSON.stringify(sampleData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sample-vocabulary.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        {/* Header */}
        <header className="glass border-b border-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-gray-800">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mx-auto mb-6 flex items-center justify-center">
              <Upload className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold mb-4 gradient-text">
              Bulk Import
            </h1>
            <p className="text-gray-400 max-w-3xl mx-auto">
              Import multiple vocabulary words from a JSON file
            </p>
          </div>

          {/* Success Message */}
          {success && (
            <div className="mb-8 p-6 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 animate-fade-in">
              <div className="flex items-center space-x-4">
                <CheckCircle className="h-8 w-8" />
                <div>
                  <p className="text-xl font-semibold">Upload Successful!</p>
                  <p className="text-green-300">
                    Successfully imported {uploadedCount} words. Redirecting...
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Upload Section */}
            <div className="glass rounded-2xl p-8">
              <h2 className="text-2xl font-semibold mb-6">Upload JSON File</h2>
              
              {/* File Drop Zone */}
              <div 
                className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 mb-8 ${
                  dragActive 
                    ? 'border-blue-500 bg-blue-500/10' 
                    : 'border-gray-700 hover:border-gray-600 hover:bg-gray-900/50'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  id="file-upload"
                />
                
                <div className="relative">
                  <div className="w-16 h-16 bg-gray-800 rounded-xl mx-auto mb-6 flex items-center justify-center">
                    <Upload className="h-8 w-8 text-gray-400" />
                  </div>
                  
                  <p className="text-xl font-semibold text-white mb-3">
                    {file ? file.name : 'Drop JSON file here'}
                  </p>
                  <p className="text-gray-400">
                    {file ? 'File ready for upload' : 'or click to browse files'}
                  </p>
                </div>
              </div>

              {/* Processing Results */}
              {processedData && (
                <div className="space-y-4 mb-8">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-lg">
                      <p className="text-2xl font-bold text-green-400">{processedData.valid.length}</p>
                      <p className="text-xs text-green-300 uppercase tracking-wider">Valid</p>
                    </div>
                    <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-lg">
                      <p className="text-2xl font-bold text-yellow-400">{processedData.duplicates.length}</p>
                      <p className="text-xs text-yellow-300 uppercase tracking-wider">Duplicates</p>
                    </div>
                    <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg">
                      <p className="text-2xl font-bold text-red-400">{processedData.invalid.length}</p>
                      <p className="text-xs text-red-300 uppercase tracking-wider">Invalid</p>
                    </div>
                  </div>
                  
                  {processedData.duplicates.length > 0 && (
                    <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-400">
                      <div className="flex items-start space-x-3">
                        <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-sm">Duplicates Found</p>
                          <p className="text-yellow-300 text-sm">
                            {processedData.duplicates.slice(0, 3).join(', ')}
                            {processedData.duplicates.length > 3 && ` and ${processedData.duplicates.length - 3} more`}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <p className="text-sm">{error}</p>
                  </div>
                </div>
              )}

              {/* Upload Button */}
              <Button
                onClick={handleUpload}
                disabled={!file || uploading || !processedData || processedData.valid.length === 0}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed mb-4"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import {processedData?.valid.length || 0} Words
                  </>
                )}
              </Button>

              {/* Sample Download */}
              <Button
                variant="outline"
                onClick={downloadSample}
                className="w-full border-gray-700 text-gray-300 hover:bg-gray-800"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Sample
              </Button>
            </div>

            {/* Instructions & Preview */}
            <div className="space-y-8">
              {/* Instructions */}
              <div className="glass rounded-2xl p-8">
                <h3 className="text-xl font-semibold mb-6">JSON Format</h3>
                <div className="space-y-6">
                  <div className="bg-gray-900/50 p-4 border border-gray-700 rounded-lg font-mono text-sm">
                    <pre className="text-gray-300 overflow-x-auto">
{`[
  {
    "word": "Abate",
    "definition": "To reduce in intensity"
  },
  {
    "word": "Aberrant", 
    "definition": "Departing from standard"
  }
]`}
                    </pre>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-3 text-gray-300">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>Must be a valid JSON array</span>
                    </div>
                    <div className="flex items-center space-x-3 text-gray-300">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>Each object needs "word" and "definition" fields</span>
                    </div>
                    <div className="flex items-center space-x-3 text-gray-300">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>Duplicates are automatically filtered</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Preview */}
              {preview.length > 0 && (
                <div className="glass rounded-2xl p-8">
                  <h3 className="text-xl font-semibold mb-6">Preview</h3>
                  <div className="space-y-4">
                    {preview.map((word, index) => (
                      <div key={index} className="bg-gray-900/50 border border-gray-700 p-4 rounded-lg">
                        <h4 className="font-semibold text-white mb-2">
                          {word.word}
                        </h4>
                        <p className="text-gray-300 text-sm">
                          {word.definition}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}