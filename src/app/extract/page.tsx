'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, CheckCircle, AlertCircle, Brain, Sparkles, Download, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { collection, writeBatch, doc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface ExtractedWord {
  word: string;
  definition: string;
  confidence: number;
  selected: boolean;
}

interface ProcessingResult {
  words: ExtractedWord[];
  totalFound: number;
  duplicates: string[];
}

export default function ExtractPage() {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [existingWords, setExistingWords] = useState<string[]>([]);
  const [showLowConfidence, setShowLowConfidence] = useState(false);
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

  const handleFileSelection = (selectedFile: File) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain'
    ];

    if (!allowedTypes.includes(selectedFile.type)) {
      setError('Please upload a PDF, Word document, or text file.');
      return;
    }

    setFile(selectedFile);
    setError('');
    setResult(null);
  };

  const extractWordsFromText = (text: string): ExtractedWord[] => {
    const words: ExtractedWord[] = [];
    
    // Enhanced patterns for vocabulary extraction
    const patterns = [
      // Pattern: "Word: Definition" or "Word - Definition"
      /([A-Z][a-z]+)[\s]*[:\-][\s]*([^.\n]+)/g,
      // Pattern: "Word (definition)" 
      /([A-Z][a-z]+)\s*\(([^)]+)\)/g,
      // Pattern: Bold/emphasized words followed by definition
      /\*\*([A-Z][a-z]+)\*\*[\s]*[:\-]?[\s]*([^.\n]+)/g,
      // Pattern: Numbered definitions "1. Word: Definition"
      /\d+\.?\s*([A-Z][a-z]+)[\s]*[:\-][\s]*([^.\n]+)/g,
      // Pattern: Vocabulary list format
      /^([A-Z][a-z]+)[\s]*[:\-][\s]*(.+)$/gm,
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const word = match[1].trim();
        const definition = match[2].trim();
        
        // Filter out short or invalid definitions
        if (definition.length > 10 && definition.length < 300 && 
            !definition.match(/^\d+$/) && // Not just numbers
            definition.split(' ').length > 2) { // At least 3 words
          
          const confidence = calculateConfidence(word, definition);
          const normalizedWord = word.toLowerCase();
          
          // Check for duplicates in existing words and current results
          const isDuplicate = existingWords.includes(normalizedWord) ||
                            words.some(w => w.word.toLowerCase() === normalizedWord);
          
          if (!isDuplicate && confidence > 0.3) {
            words.push({
              word,
              definition,
              confidence,
              selected: confidence > 0.6
            });
          }
        }
      }
    });

    // Sort by confidence and remove duplicates
    return words
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 50); // Limit to top 50 matches
  };

  const calculateConfidence = (word: string, definition: string): number => {
    let confidence = 0.5;
    
    // Higher confidence for longer, more descriptive definitions
    if (definition.length > 50) confidence += 0.2;
    if (definition.length > 100) confidence += 0.1;
    
    // Higher confidence for definitions with common vocabulary patterns
    if (definition.match(/\b(means?|refers? to|defined as|is a|are)\b/i)) confidence += 0.2;
    if (definition.match(/\b(adjective|noun|verb|adverb)\b/i)) confidence += 0.1;
    
    // Lower confidence for very short definitions or those with numbers
    if (definition.length < 20) confidence -= 0.3;
    if (definition.match(/\d{4}/)) confidence -= 0.2; // Years, dates
    
    // Higher confidence for academic/GRE-style words
    if (word.length > 6) confidence += 0.1;
    if (word.match(/^[A-Z][a-z]+$/)) confidence += 0.1;
    
    return Math.max(0, Math.min(1, confidence));
  };

  const processDocument = async () => {
    if (!file) return;
    
    setProcessing(true);
    setError('');
    
    try {
      let text = '';
      
      if (file.type === 'application/pdf') {
        // For PDF processing, we'll use a simple text extraction
        // In a real app, you'd use pdf-parse or similar library
        const arrayBuffer = await file.arrayBuffer();
        const decoder = new TextDecoder();
        text = decoder.decode(arrayBuffer);
      } else if (file.type.includes('word')) {
        // For Word documents, we'll use mammoth or similar
        // For now, we'll simulate with a placeholder
        text = await file.text();
      } else {
        // Plain text
        text = await file.text();
      }
      
      const extractedWords = extractWordsFromText(text);
      const duplicates = extractedWords
        .filter(w => existingWords.includes(w.word.toLowerCase()))
        .map(w => w.word);
      
      setResult({
        words: extractedWords,
        totalFound: extractedWords.length,
        duplicates
      });
      
    } catch (err) {
      setError('Failed to process document. Please try again.');
      console.error('Processing error:', err);
    } finally {
      setProcessing(false);
    }
  };

  const toggleWordSelection = (index: number) => {
    if (!result) return;
    
    const updatedWords = [...result.words];
    updatedWords[index].selected = !updatedWords[index].selected;
    setResult({ ...result, words: updatedWords });
  };

  const selectAll = () => {
    if (!result) return;
    
    const updatedWords = result.words.map(w => ({ ...w, selected: true }));
    setResult({ ...result, words: updatedWords });
  };

  const deselectAll = () => {
    if (!result) return;
    
    const updatedWords = result.words.map(w => ({ ...w, selected: false }));
    setResult({ ...result, words: updatedWords });
  };

  const handleUpload = async () => {
    if (!result || !user) return;
    
    const selectedWords = result.words.filter(w => w.selected);
    if (selectedWords.length === 0) {
      setError('Please select at least one word to import.');
      return;
    }
    
    setUploading(true);
    setError('');
    
    try {
      const batch = writeBatch(db);
      const wordsRef = collection(db, 'gre_words');
      
      selectedWords.forEach((wordData) => {
        const docRef = doc(wordsRef);
        batch.set(docRef, {
          word: wordData.word,
          definition: wordData.definition,
          userId: user.uid,
          createdAt: serverTimestamp()
        });
      });
      
      await batch.commit();
      
      setUploadedCount(selectedWords.length);
      setSuccess(true);
      
      setTimeout(() => {
        router.push('/');
      }, 3000);
      
    } catch (err) {
      setError('Failed to import words. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const filteredWords = result?.words.filter(w => 
    showLowConfidence || w.confidence > 0.6
  ) || [];

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
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl mx-auto mb-6 flex items-center justify-center">
              <Brain className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold mb-4 gradient-text">
              Smart Extract
            </h1>
            <p className="text-gray-400 max-w-3xl mx-auto">
              Upload documents and let AI extract vocabulary words and definitions automatically
            </p>
          </div>

          {/* Success Message */}
          {success && (
            <div className="mb-8 p-6 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 animate-fade-in">
              <div className="flex items-center space-x-4">
                <CheckCircle className="h-8 w-8" />
                <div>
                  <p className="text-xl font-semibold">Import Successful!</p>
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
              <h2 className="text-2xl font-semibold mb-6">Upload Document</h2>
              
              {/* File Drop Zone */}
              <div 
                className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 mb-8 ${
                  dragActive 
                    ? 'border-purple-500 bg-purple-500/10' 
                    : 'border-gray-700 hover:border-gray-600 hover:bg-gray-900/50'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  accept=".pdf,.docx,.doc,.txt"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  id="file-upload"
                />
                
                <div className="relative">
                  <div className="w-16 h-16 bg-gray-800 rounded-xl mx-auto mb-6 flex items-center justify-center">
                    <FileText className="h-8 w-8 text-gray-400" />
                  </div>
                  
                  <p className="text-xl font-semibold text-white mb-3">
                    {file ? file.name : 'Drop document here'}
                  </p>
                  <p className="text-gray-400 mb-4">
                    {file ? 'Ready for processing' : 'PDF, Word, or Text files'}
                  </p>
                  <p className="text-xs text-gray-500">
                    Supports .pdf, .docx, .doc, .txt
                  </p>
                </div>
              </div>

              {/* Process Button */}
              <Button
                onClick={processDocument}
                disabled={!file || processing}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed mb-4"
              >
                {processing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Extract Vocabulary
                  </>
                )}
              </Button>

              {/* Error Display */}
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <p className="text-sm">{error}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Results Section */}
            {result && (
              <div className="glass rounded-2xl p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold">Extracted Words</h3>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowLowConfidence(!showLowConfidence)}
                      className="border-gray-700 text-gray-300 hover:bg-gray-800"
                    >
                      {showLowConfidence ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-purple-500/10 border border-purple-500/20 p-4 rounded-lg text-center">
                    <p className="text-2xl font-bold text-purple-400">{result.totalFound}</p>
                    <p className="text-xs text-purple-300 uppercase tracking-wider">Found</p>
                  </div>
                  <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg text-center">
                    <p className="text-2xl font-bold text-blue-400">
                      {result.words.filter(w => w.selected).length}
                    </p>
                    <p className="text-xs text-blue-300 uppercase tracking-wider">Selected</p>
                  </div>
                </div>

                {/* Selection Controls */}
                <div className="flex space-x-2 mb-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectAll}
                    className="border-gray-700 text-gray-300 hover:bg-gray-800"
                  >
                    Select All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={deselectAll}
                    className="border-gray-700 text-gray-300 hover:bg-gray-800"
                  >
                    Deselect All
                  </Button>
                </div>

                {/* Words List */}
                <div className="space-y-3 max-h-96 overflow-y-auto mb-6">
                  {filteredWords.map((word, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        word.selected
                          ? 'bg-purple-500/10 border-purple-500/30'
                          : 'bg-gray-900/50 border-gray-700 hover:border-gray-600'
                      }`}
                      onClick={() => toggleWordSelection(index)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="font-semibold text-white">{word.word}</h4>
                            <div className={`px-2 py-1 rounded text-xs ${
                              word.confidence > 0.8 
                                ? 'bg-green-500/20 text-green-400'
                                : word.confidence > 0.6
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}>
                              {Math.round(word.confidence * 100)}%
                            </div>
                          </div>
                          <p className="text-gray-300 text-sm">{word.definition}</p>
                        </div>
                        <div className={`w-4 h-4 rounded border-2 ml-4 mt-1 ${
                          word.selected
                            ? 'bg-purple-500 border-purple-500'
                            : 'border-gray-600'
                        }`}>
                          {word.selected && (
                            <CheckCircle className="h-3 w-3 text-white" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Import Button */}
                <Button
                  onClick={handleUpload}
                  disabled={uploading || result.words.filter(w => w.selected).length === 0}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Importing...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Import {result.words.filter(w => w.selected).length} Words
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}