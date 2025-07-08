'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Upload, FileText, CheckCircle, AlertCircle, Download, AlertTriangle } from 'lucide-react';
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
      <div className="min-h-screen bg-black text-white">
        {/* Minimal geometric background */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
          <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
          <div className="absolute top-0 left-0 w-px h-full bg-gradient-to-b from-transparent via-white/10 to-transparent"></div>
          <div className="absolute top-0 right-0 w-px h-full bg-gradient-to-b from-transparent via-white/10 to-transparent"></div>
        </div>

        {/* Header */}
        <div className="relative z-10 border-b border-white/10 bg-black/80 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-white/60 hover:text-white hover:bg-white/10">
                <ArrowLeft className="h-4 w-4 mr-2" />
                BACK
              </Button>
            </Link>
          </div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
          <div className="text-center mb-12">
            <div className="w-12 h-12 bg-white rounded-sm mx-auto mb-6 flex items-center justify-center">
              <Upload className="h-6 w-6 text-black" />
            </div>
            <h1 className="text-3xl font-bold uppercase tracking-wider mb-4">
              BULK IMPORT
            </h1>
            <p className="text-white/60 max-w-3xl mx-auto">
              Import multiple vocabulary words from a JSON file
            </p>
          </div>

          {success && (
            <div className="mb-8 p-6 border border-green-500/30 bg-green-500/10 text-green-400">
              <div className="flex items-center space-x-4">
                <CheckCircle className="h-8 w-8" />
                <div>
                  <p className="text-xl font-bold">Upload Successful!</p>
                  <p className="text-green-300">
                    Successfully imported {uploadedCount} words. Redirecting...
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Upload Section */}
            <Card className="border-white/10 bg-white/5">
              <CardHeader className="text-center pb-6">
                <CardTitle className="text-2xl text-white uppercase tracking-wider">
                  UPLOAD JSON FILE
                </CardTitle>
                <CardDescription className="text-white/60">
                  Drag and drop or click to select your vocabulary file
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <div className="space-y-8">
                  {/* File Drop Zone */}
                  <div 
                    className={`relative border-2 border-dashed rounded-sm p-12 text-center transition-all duration-300 ${
                      dragActive 
                        ? 'border-white bg-white/10' 
                        : 'border-white/20 hover:border-white/40 hover:bg-white/5'
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
                      <div className="w-12 h-12 bg-white/10 rounded-sm mx-auto mb-6 flex items-center justify-center">
                        <Upload className="h-6 w-6 text-white/60" />
                      </div>
                      
                      <p className="text-xl font-bold text-white mb-3 uppercase tracking-wider">
                        {file ? file.name : 'DROP JSON FILE'}
                      </p>
                      <p className="text-white/60">
                        {file ? 'File ready for upload' : 'or click to browse files'}
                      </p>
                    </div>
                  </div>

                  {/* Processing Results */}
                  {processedData && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="border border-green-500/30 bg-green-500/10 p-4">
                          <p className="text-2xl font-bold text-green-400">{processedData.valid.length}</p>
                          <p className="text-xs text-green-300 uppercase tracking-wider">VALID</p>
                        </div>
                        <div className="border border-yellow-500/30 bg-yellow-500/10 p-4">
                          <p className="text-2xl font-bold text-yellow-400">{processedData.duplicates.length}</p>
                          <p className="text-xs text-yellow-300 uppercase tracking-wider">DUPLICATES</p>
                        </div>
                        <div className="border border-red-500/30 bg-red-500/10 p-4">
                          <p className="text-2xl font-bold text-red-400">{processedData.invalid.length}</p>
                          <p className="text-xs text-red-300 uppercase tracking-wider">INVALID</p>
                        </div>
                      </div>
                      
                      {processedData.duplicates.length > 0 && (
                        <div className="p-4 border border-yellow-500/30 bg-yellow-500/10 text-yellow-400">
                          <div className="flex items-start space-x-3">
                            <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-bold text-sm uppercase tracking-wider">DUPLICATES FOUND</p>
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
                    <div className="p-4 border border-red-500/30 bg-red-500/10 text-red-400">
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
                    className="w-full bg-white text-black hover:bg-white/90 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
                        UPLOADING...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        IMPORT {processedData?.valid.length || 0} WORDS
                      </>
                    )}
                  </Button>

                  {/* Sample Download */}
                  <div className="pt-6 border-t border-white/10">
                    <Button
                      variant="outline"
                      onClick={downloadSample}
                      className="w-full border-white/20 text-white hover:bg-white/10"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      DOWNLOAD SAMPLE
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Instructions & Preview */}
            <div className="space-y-8">
              {/* Instructions */}
              <Card className="border-white/10 bg-white/5">
                <CardHeader>
                  <CardTitle className="text-xl text-white uppercase tracking-wider">
                    JSON FORMAT
                  </CardTitle>
                  <CardDescription className="text-white/60">
                    Required structure for import
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="space-y-6">
                    <div className="bg-black/50 p-4 border border-white/10 font-mono text-sm">
                      <pre className="text-white/80 overflow-x-auto">
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
                      <div className="flex items-center space-x-3 text-white/80">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                        <span>Must be a valid JSON array</span>
                      </div>
                      <div className="flex items-center space-x-3 text-white/80">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                        <span>Each object needs "word" and "definition" fields</span>
                      </div>
                      <div className="flex items-center space-x-3 text-white/80">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                        <span>Duplicates are automatically filtered</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Preview */}
              {preview.length > 0 && (
                <Card className="border-white/10 bg-white/5">
                  <CardHeader>
                    <CardTitle className="text-xl text-white uppercase tracking-wider">
                      PREVIEW
                    </CardTitle>
                    <CardDescription className="text-white/60">
                      First {preview.length} words from your file
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-8">
                    <div className="space-y-4">
                      {preview.map((word, index) => (
                        <div key={index} className="border border-white/10 p-4 bg-white/5">
                          <h4 className="font-bold text-white uppercase tracking-wider mb-2">
                            {word.word}
                          </h4>
                          <p className="text-white/80 text-sm">
                            {word.definition}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}