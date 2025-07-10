'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Plus, AlertTriangle, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function AddWordPage() {
  const [word, setWord] = useState('');
  const [definition, setDefinition] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [isDuplicate, setIsDuplicate] = useState(false);
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

  // Check for duplicates when word changes
  useEffect(() => {
    if (word.trim()) {
      const normalizedWord = word.toLowerCase().trim();
      setIsDuplicate(existingWords.includes(normalizedWord));
    } else {
      setIsDuplicate(false);
    }
  }, [word, existingWords]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isDuplicate) return;
    
    setLoading(true);
    setError('');

    try {
      await addDoc(collection(db, 'gre_words'), {
        word: word.trim(),
        definition: definition.trim(),
        userId: user.uid,
        createdAt: serverTimestamp()
      });

      setSuccess(true);
      setWord('');
      setDefinition('');
      
      setTimeout(() => {
        setSuccess(false);
        router.push('/');
      }, 2000);
    } catch (error) {
      console.error('Error adding word:', error);
      setError('Failed to add word. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        {/* Header */}
        <header className="glass border-b border-white/5">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-gray-800">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mx-auto mb-6 flex items-center justify-center">
              <Plus className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold mb-4 gradient-text">
              Add New Word
            </h1>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Expand your GRE vocabulary with a new word and definition
            </p>
          </div>

          {/* Success Message */}
          {success && (
            <div className="mb-8 p-6 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 animate-fade-in">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-6 w-6" />
                <div>
                  <p className="font-semibold">Word added successfully!</p>
                  <p className="text-green-300">Redirecting to vocabulary list...</p>
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <div className="glass rounded-2xl p-8 max-w-2xl mx-auto">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-3">
                <Label htmlFor="word" className="text-sm font-medium text-gray-300">
                  Word
                </Label>
                <Input
                  id="word"
                  type="text"
                  placeholder="Enter the GRE word"
                  value={word}
                  onChange={(e) => setWord(e.target.value)}
                  className={`bg-gray-900/50 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500 focus:bg-gray-900 ${
                    isDuplicate ? 'border-red-500/50 bg-red-500/10' : ''
                  }`}
                  required
                />
                {isDuplicate && (
                  <div className="flex items-center space-x-2 text-red-400 text-sm">
                    <AlertTriangle className="h-4 w-4" />
                    <span>This word already exists in your vocabulary</span>
                  </div>
                )}
                <p className="text-xs text-gray-500">
                  The vocabulary word you want to master
                </p>
              </div>

              <div className="space-y-3">
                <Label htmlFor="definition" className="text-sm font-medium text-gray-300">
                  Definition
                </Label>
                <Textarea
                  id="definition"
                  placeholder="Enter the definition"
                  value={definition}
                  onChange={(e) => setDefinition(e.target.value)}
                  className="min-h-[120px] bg-gray-900/50 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500 focus:bg-gray-900 resize-none"
                  required
                />
                <p className="text-xs text-gray-500">
                  A clear and comprehensive definition
                </p>
              </div>

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                <Button
                  type="submit"
                  disabled={loading || !word.trim() || !definition.trim() || isDuplicate}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Add to Vocabulary
                    </>
                  )}
                </Button>
                
                <Link href="/" className="flex-1">
                  <Button variant="outline" className="w-full border-gray-700 text-gray-300 hover:bg-gray-800">
                    Cancel
                  </Button>
                </Link>
              </div>
            </form>

            <div className="mt-12 pt-8 border-t border-gray-800">
              <div className="text-center">
                <p className="text-gray-500 text-sm">
                  Building your GRE vocabulary • {existingWords.length} words collected
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}