'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Upload, FileText, CheckCircle, AlertCircle, Download, Brain, Sparkles, Zap } from 'lucide-react';
import Link from 'next/link';
import { collection, addDoc, serverTimestamp, writeBatch, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface WordData {
  word: string;
  definition: string;
}

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<WordData[]>([]);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

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

  const handleFileSelection = (selectedFile: File) => {
    setFile(selectedFile);
    setError('');
    setPreview([]);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const jsonData = JSON.parse(event.target?.result as string);
        
        if (Array.isArray(jsonData)) {
          const validWords = jsonData.filter(item => 
            item && typeof item === 'object' && 
            typeof item.word === 'string' && 
            typeof item.definition === 'string' &&
            item.word.trim() && item.definition.trim()
          );
          
          if (validWords.length === 0) {
            setError('No valid word entries found. Each entry must have "word" and "definition" fields.');
            return;
          }
          
          setPreview(validWords.slice(0, 5));
          
          if (validWords.length !== jsonData.length) {
            setError(`Found ${validWords.length} valid entries out of ${jsonData.length} total entries.`);
          }
        } else {
          setError('JSON must be an array of word objects.');
        }
      } catch (err) {
        setError('Invalid JSON file. Please check the format.');
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleUpload = async () => {
    if (!file || !user) return;
    
    setUploading(true);
    setError('');
    
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const jsonData = JSON.parse(event.target?.result as string);
          
          if (!Array.isArray(jsonData)) {
            throw new Error('JSON must be an array of word objects.');
          }
          
          const validWords = jsonData.filter(item => 
            item && typeof item === 'object' && 
            typeof item.word === 'string' && 
            typeof item.definition === 'string' &&
            item.word.trim() && item.definition.trim()
          );
          
          if (validWords.length === 0) {
            throw new Error('No valid word entries found.');
          }
          
          const batch = writeBatch(db);
          const wordsRef = collection(db, 'gre_words');
          
          validWords.forEach((wordData) => {
            const docRef = doc(wordsRef);
            batch.set(docRef, {
              word: wordData.word.trim(),
              definition: wordData.definition.trim(),
              userId: user.uid,
              createdAt: serverTimestamp()
            });
          });
          
          await batch.commit();
          
          setUploadedCount(validWords.length);
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
      reader.readAsText(file);
    } catch (err) {
      setError('Failed to process file');
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -inset-10 opacity-50">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
            <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-1000"></div>
            <div className="absolute bottom-1/4 left-1/2 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-2000"></div>
          </div>
        </div>

        {/* Header */}
        <div className="relative z-10 bg-white/10 backdrop-blur-xl border-b border-white/20">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white hover:bg-white/10">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Vocabulary
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full blur opacity-75 animate-pulse"></div>
                <div className="relative bg-gradient-to-r from-purple-600 to-pink-600 p-6 rounded-full">
                  <Upload className="h-12 w-12 text-white" />
                </div>
              </div>
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent mb-4">
              Bulk Import Vocabulary
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Supercharge your GRE preparation by importing hundreds of vocabulary words instantly
            </p>
          </div>

          {success && (
            <Card className="mb-8 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border-emerald-500/30 backdrop-blur-xl">
              <CardContent className="p-8">
                <div className="flex items-center space-x-4 text-emerald-300">
                  <div className="relative">
                    <div className="absolute inset-0 bg-emerald-500 rounded-full blur opacity-50"></div>
                    <div className="relative bg-emerald-500 p-2 rounded-full">
                      <CheckCircle className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">Upload Successful!</p>
                    <p className="text-emerald-200 text-lg">
                      Successfully imported {uploadedCount} words to your vocabulary. Redirecting...
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Upload Section */}
            <Card className="bg-white/10 backdrop-blur-xl border-white/20">
              <CardHeader className="text-center pb-6">
                <CardTitle className="text-3xl text-white flex items-center justify-center mb-2">
                  <FileText className="h-8 w-8 mr-3 text-purple-400" />
                  Upload JSON File
                </CardTitle>
                <CardDescription className="text-lg text-gray-300">
                  Drag and drop or click to select your vocabulary file
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <div className="space-y-8">
                  {/* File Drop Zone */}
                  <div 
                    className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
                      dragActive 
                        ? 'border-purple-400 bg-purple-500/20 scale-105' 
                        : 'border-gray-500 hover:border-purple-400 hover:bg-white/5'
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
                      <div className="flex items-center justify-center mb-6">
                        <div className="relative">
                          <div className="absolute inset-0 bg-purple-500 rounded-full blur opacity-50"></div>
                          <div className="relative bg-gradient-to-r from-purple-500 to-pink-500 p-4 rounded-full">
                            <Upload className="h-12 w-12 text-white" />
                          </div>
                        </div>
                      </div>
                      
                      <p className="text-2xl font-bold text-white mb-3">
                        {file ? file.name : 'Drop your JSON file here'}
                      </p>
                      <p className="text-gray-300 text-lg">
                        {file ? 'File ready for upload' : 'or click to browse files'}
                      </p>
                      
                      {dragActive && (
                        <div className="absolute inset-0 bg-purple-500/20 rounded-2xl flex items-center justify-center">
                          <p className="text-white text-xl font-bold">Drop it like it's hot! 🔥</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Error Display */}
                  {error && (
                    <div className="bg-red-500/20 border border-red-500/30 text-red-300 px-6 py-4 rounded-xl flex items-start space-x-3 backdrop-blur-sm">
                      <AlertCircle className="h-6 w-6 mt-0.5 flex-shrink-0" />
                      <p className="text-sm leading-relaxed">{error}</p>
                    </div>
                  )}

                  {/* Upload Button */}
                  <Button
                    onClick={handleUpload}
                    disabled={!file || uploading || preview.length === 0}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-6 text-xl font-bold shadow-2xl shadow-purple-500/25 border-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading ? (
                      <>
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                        Uploading Magic...
                      </>
                    ) : (
                      <>
                        <Zap className="h-6 w-6 mr-3" />
                        Import to Firebase
                      </>
                    )}
                  </Button>

                  {/* Sample Download */}
                  <div className="pt-6 border-t border-white/20">
                    <Button
                      variant="outline"
                      onClick={downloadSample}
                      className="w-full border-purple-400/50 text-purple-300 hover:bg-purple-500/20 hover:text-purple-200 bg-white/5 backdrop-blur-sm py-4"
                    >
                      <Download className="h-5 w-5 mr-2" />
                      Download Sample JSON
                    </Button>
                    <p className="text-xs text-gray-400 mt-3 text-center">
                      Get a perfectly formatted sample file to see the magic ✨
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Instructions & Preview */}
            <div className="space-y-8">
              {/* Instructions */}
              <Card className="bg-white/10 backdrop-blur-xl border-white/20">
                <CardHeader>
                  <CardTitle className="text-2xl text-white flex items-center">
                    <Brain className="h-6 w-6 mr-3 text-blue-400" />
                    JSON Format Guide
                  </CardTitle>
                  <CardDescription className="text-gray-300 text-base">
                    Follow this format for seamless imports
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="space-y-6">
                    <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-700">
                      <p className="text-sm font-medium text-purple-300 mb-3">Required Format:</p>
                      <pre className="text-sm text-gray-300 overflow-x-auto leading-relaxed">
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
                    
                    <div className="grid grid-cols-1 gap-3">
                      <div className="flex items-center space-x-3 text-gray-300">
                        <div className="w-3 h-3 bg-emerald-500 rounded-full flex-shrink-0"></div>
                        <span>Must be a valid JSON array</span>
                      </div>
                      <div className="flex items-center space-x-3 text-gray-300">
                        <div className="w-3 h-3 bg-emerald-500 rounded-full flex-shrink-0"></div>
                        <span>Each object needs "word" and "definition" fields</span>
                      </div>
                      <div className="flex items-center space-x-3 text-gray-300">
                        <div className="w-3 h-3 bg-emerald-500 rounded-full flex-shrink-0"></div>
                        <span>Both fields must be non-empty strings</span>
                      </div>
                      <div className="flex items-center space-x-3 text-gray-300">
                        <div className="w-3 h-3 bg-blue-500 rounded-full flex-shrink-0"></div>
                        <span>Invalid entries are automatically filtered out</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Preview */}
              {preview.length > 0 && (
                <Card className="bg-white/10 backdrop-blur-xl border-white/20">
                  <CardHeader>
                    <CardTitle className="text-2xl text-white flex items-center">
                      <Sparkles className="h-6 w-6 mr-3 text-yellow-400" />
                      Preview
                    </CardTitle>
                    <CardDescription className="text-gray-300 text-base">
                      First {preview.length} words from your file
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-8">
                    <div className="space-y-4">
                      {preview.map((word, index) => (
                        <div key={index} className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 p-6 rounded-xl border border-purple-500/30 backdrop-blur-sm">
                          <h4 className="font-bold text-white capitalize mb-2 text-lg">
                            {word.word}
                          </h4>
                          <p className="text-gray-300 leading-relaxed">
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