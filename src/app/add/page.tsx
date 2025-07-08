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
import { ArrowLeft, Plus, Brain, Type, FileText, Upload, Sparkles } from 'lucide-react';
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -inset-10 opacity-50">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
            <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-1000"></div>
            <div className="absolute bottom-1/4 left-1/2 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-2000"></div>
          </div>
        </div>

        {/* Header */}
        <div className="relative z-10 bg-white/10 backdrop-blur-xl border-b border-white/20">
          <div className="max-w-4xl mx-auto px-6 py-6">
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

        <div className="relative z-10 max-w-4xl mx-auto px-6 py-8">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-full blur opacity-75 animate-pulse"></div>
                <div className="relative bg-gradient-to-r from-emerald-600 to-teal-600 p-6 rounded-full">
                  <Plus className="h-12 w-12 text-white" />
                </div>
              </div>
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-white via-emerald-200 to-teal-200 bg-clip-text text-transparent mb-4">
              Add New GRE Word
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
              Expand your vocabulary arsenal with a powerful new word and definition
            </p>
          </div>

          <Card className="bg-white/10 backdrop-blur-xl border-white/20 shadow-2xl">
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-3xl text-white flex items-center justify-center">
                <Brain className="h-8 w-8 mr-3 text-purple-400" />
                New Vocabulary Entry
              </CardTitle>
              <CardDescription className="text-lg text-gray-300">
                Add a GRE word with its definition to your personal collection
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              {success && (
                <div className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-emerald-300 px-6 py-4 rounded-xl mb-8 text-center backdrop-blur-sm">
                  <div className="flex items-center justify-center space-x-3">
                    <Sparkles className="h-6 w-6" />
                    <div>
                      <p className="font-bold text-lg">Word added successfully!</p>
                      <p className="text-emerald-200">Redirecting to your vocabulary list...</p>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="space-y-3">
                  <Label htmlFor="word" className="text-lg font-medium text-gray-200 flex items-center">
                    <Type className="h-5 w-5 mr-2 text-purple-400" />
                    Word
                  </Label>
                  <Input
                    id="word"
                    type="text"
                    placeholder="Enter the GRE word (e.g., Abate)"
                    value={word}
                    onChange={(e) => setWord(e.target.value)}
                    className="text-xl py-6 bg-white/10 border-white/20 focus:bg-white/20 text-white placeholder-gray-400 backdrop-blur-sm"
                    required
                  />
                  <p className="text-sm text-gray-400">The vocabulary word you want to master</p>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="definition" className="text-lg font-medium text-gray-200 flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-blue-400" />
                    Definition
                  </Label>
                  <Textarea
                    id="definition"
                    placeholder="Enter the definition (e.g., To reduce in intensity or amount)"
                    value={definition}
                    onChange={(e) => setDefinition(e.target.value)}
                    className="min-h-[140px] text-lg bg-white/10 border-white/20 focus:bg-white/20 text-white placeholder-gray-400 backdrop-blur-sm resize-none"
                    required
                  />
                  <p className="text-sm text-gray-400">A clear and comprehensive definition of the word</p>
                </div>

                <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                  <Button
                    type="submit"
                    disabled={loading || !word.trim() || !definition.trim()}
                    className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white py-6 text-xl font-bold shadow-2xl shadow-emerald-500/25 border-0"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                        Adding Word...
                      </>
                    ) : (
                      <>
                        <Plus className="h-6 w-6 mr-3" />
                        Add to Vocabulary
                      </>
                    )}
                  </Button>
                  
                  <Link href="/" className="flex-1">
                    <Button variant="outline" className="w-full py-6 text-xl border-gray-500 text-gray-300 hover:bg-white/10 hover:text-white bg-white/5 backdrop-blur-sm">
                      Cancel
                    </Button>
                  </Link>
                </div>
              </form>

              <div className="mt-12 pt-8 border-t border-white/20">
                <div className="text-center mb-6">
                  <p className="text-gray-300 mb-4">Need to add multiple words?</p>
                  <Link href="/upload">
                    <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg shadow-purple-500/25 border-0">
                      <Upload className="h-5 w-5 mr-2" />
                      Try Bulk Import
                    </Button>
                  </Link>
                </div>
                
                <div className="flex items-center justify-center space-x-3 text-gray-400">
                  <Brain className="h-5 w-5" />
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