'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Plus, BookOpen, Type, FileText, Upload } from 'lucide-react';
import Link from 'next/link';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function AddWordPage() {
  const [word, setWord] = useState('');
  const [definition, setDefinition] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);

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
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm border-b border-white/20">
          <div className="max-w-2xl mx-auto px-4 py-4">
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

        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-green-600 p-3 rounded-full shadow-lg">
                <Plus className="h-8 w-8 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Add New GRE Word</h1>
            <p className="text-gray-600">Expand your vocabulary with a new word and definition</p>
          </div>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl text-gray-900">New Vocabulary Entry</CardTitle>
              <CardDescription>Add a GRE word with its definition to your personal collection</CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md mb-6 text-center">
                  <p className="font-semibold">Word added successfully!</p>
                  <p className="text-sm">Redirecting to your vocabulary list...</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="word" className="text-sm font-medium text-gray-700 flex items-center">
                    <Type className="h-4 w-4 mr-2" />
                    Word
                  </Label>
                  <Input
                    id="word"
                    type="text"
                    placeholder="Enter the GRE word (e.g., Abate)"
                    value={word}
                    onChange={(e) => setWord(e.target.value)}
                    className="text-lg py-6 bg-white/50 border-white/20 focus:bg-white/80"
                    required
                  />
                  <p className="text-xs text-gray-500">The vocabulary word you want to learn</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="definition" className="text-sm font-medium text-gray-700 flex items-center">
                    <FileText className="h-4 w-4 mr-2" />
                    Definition
                  </Label>
                  <Textarea
                    id="definition"
                    placeholder="Enter the definition (e.g., To reduce in intensity or amount)"
                    value={definition}
                    onChange={(e) => setDefinition(e.target.value)}
                    className="min-h-[120px] text-lg bg-white/50 border-white/20 focus:bg-white/80 resize-none"
                    required
                  />
                  <p className="text-xs text-gray-500">A clear and concise definition of the word</p>
                </div>

                <div className="flex space-x-4">
                  <Button
                    type="submit"
                    disabled={loading || !word.trim() || !definition.trim()}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-6 text-lg"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Adding Word...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Add to Vocabulary
                      </>
                    )}
                  </Button>
                  
                  <Link href="/" className="flex-1">
                    <Button variant="outline" className="w-full py-6 text-lg border-gray-300 hover:bg-gray-50">
                      Cancel
                    </Button>
                  </Link>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-3">Need to add multiple words?</p>
                    <Link href="/upload">
                      <Button variant="outline" className="border-blue-200 text-blue-600 hover:bg-blue-50">
                        <Upload className="h-4 w-4 mr-2" />
                        Try Bulk Import
                      </Button>
                    </Link>
                  </div>
                </div>
              </form>

              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                  <BookOpen className="h-4 w-4" />
                  <span>Building your GRE vocabulary one word at a time</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}