'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Upload, FileText, CheckCircle, AlertCircle, Download, BookOpen } from 'lucide-react';
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
  const { user } = useAuth();
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError('');
      setPreview([]);
      
      // Read and preview the file
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const jsonData = JSON.parse(event.target?.result as string);
          
          // Validate JSON structure
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
            
            setPreview(validWords.slice(0, 5)); // Show first 5 for preview
            
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
    }
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
          
          // Use batch write for better performance
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
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-purple-50">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm border-b border-white/20">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center space-x-3">
              <Link href="/">
                <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Vocabulary
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-gradient-to-r from-emerald-500 to-blue-600 p-4 rounded-full shadow-lg">
                <Upload className="h-10 w-10 text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-3">Bulk Import Vocabulary</h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Upload a JSON file to quickly add multiple GRE words to your vocabulary collection
            </p>
          </div>

          {success && (
            <Card className="mb-8 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3 text-green-700">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="text-lg font-semibold">Upload Successful!</p>
                    <p className="text-green-600">
                      Successfully imported {uploadedCount} words to your vocabulary. Redirecting...
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Upload Section */}
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl text-gray-900 flex items-center justify-center">
                  <FileText className="h-6 w-6 mr-2 text-blue-600" />
                  Upload JSON File
                </CardTitle>
                <CardDescription className="text-base">
                  Select a JSON file containing your vocabulary words
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  {/* File Input */}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleFileChange}
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-lg font-medium text-gray-700 mb-2">
                        {file ? file.name : 'Choose JSON file'}
                      </p>
                      <p className="text-sm text-gray-500">
                        Click to browse or drag and drop
                      </p>
                    </label>
                  </div>

                  {/* Error Display */}
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start space-x-2">
                      <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                      <p className="text-sm">{error}</p>
                    </div>
                  )}

                  {/* Upload Button */}
                  <Button
                    onClick={handleUpload}
                    disabled={!file || uploading || preview.length === 0}
                    className="w-full bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white py-6 text-lg shadow-lg"
                  >
                    {uploading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Uploading Words...
                      </>
                    ) : (
                      <>
                        <Upload className="h-5 w-5 mr-2" />
                        Import to Firebase
                      </>
                    )}
                  </Button>

                  {/* Sample Download */}
                  <div className="pt-4 border-t border-gray-200">
                    <Button
                      variant="outline"
                      onClick={downloadSample}
                      className="w-full border-blue-200 text-blue-600 hover:bg-blue-50"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Sample JSON
                    </Button>
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      Download a sample file to see the correct format
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Instructions & Preview */}
            <div className="space-y-6">
              {/* Instructions */}
              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-xl text-gray-900 flex items-center">
                    <BookOpen className="h-5 w-5 mr-2 text-purple-600" />
                    JSON Format Requirements
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm font-medium text-gray-700 mb-2">Required Format:</p>
                      <pre className="text-xs text-gray-600 overflow-x-auto">
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
                    
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>Must be a valid JSON array</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>Each object needs "word" and "definition" fields</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>Both fields must be non-empty strings</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span>Invalid entries will be automatically filtered out</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Preview */}
              {preview.length > 0 && (
                <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-xl text-gray-900">Preview</CardTitle>
                    <CardDescription>
                      First {preview.length} words from your file
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      {preview.map((word, index) => (
                        <div key={index} className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-100">
                          <h4 className="font-semibold text-blue-900 capitalize mb-1">
                            {word.word}
                          </h4>
                          <p className="text-gray-700 text-sm leading-relaxed">
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