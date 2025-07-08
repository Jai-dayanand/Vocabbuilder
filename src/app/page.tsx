'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Search, Plus, LogOut, Trash2, User, Upload, Sparkles, Target, TrendingUp, Brain } from 'lucide-react';
import Link from 'next/link';
import { 
  collection, 
  query, 
  onSnapshot, 
  deleteDoc, 
  doc,
  where
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Word {
  id: string;
  word: string;
  definition: string;
  createdAt: any;
  userId: string;
}

export default function HomePage() {
  const [words, setWords] = useState<Word[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, signOut } = useAuth();

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const q = query(
        collection(db, 'gre_words'),
        where('userId', '==', user.uid)
      );

      const unsubscribe = onSnapshot(q, 
        (querySnapshot) => {
          const wordsData: Word[] = [];
          querySnapshot.forEach((doc) => {
            wordsData.push({ id: doc.id, ...doc.data() } as Word);
          });
          wordsData.sort((a, b) => {
            if (a.createdAt && b.createdAt) {
              return b.createdAt.toMillis() - a.createdAt.toMillis();
            }
            return 0;
          });
          setWords(wordsData);
          setLoading(false);
        },
        (error) => {
          console.error('Error fetching words:', error);
          setError('Failed to load vocabulary. Please try refreshing the page.');
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (error) {
      console.error('Error setting up listener:', error);
      setError('Failed to connect to database. Please check your internet connection.');
      setLoading(false);
    }
  }, [user]);

  const filteredWords = words.filter(word =>
    word.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
    word.definition.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'gre_words', id));
    } catch (error) {
      console.error('Error deleting word:', error);
      setError('Failed to delete word. Please try again.');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getProgressPercentage = () => {
    const target = 1000; // GRE target
    return Math.min((words.length / target) * 100, 100);
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
        <div className="relative z-10 bg-white/10 backdrop-blur-xl border-b border-white/20 sticky top-0">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl blur opacity-75"></div>
                  <div className="relative bg-gradient-to-r from-purple-600 to-blue-600 p-3 rounded-2xl">
                    <Brain className="h-8 w-8 text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                    GRE Mastery
                  </h1>
                  <p className="text-gray-300 text-sm">
                    Welcome back, <span className="text-purple-300 font-medium">{user?.email?.split('@')[0]}</span>
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Link href="/add">
                  <Button className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25 border-0">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Word
                  </Button>
                </Link>
                <Link href="/upload">
                  <Button className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white shadow-lg shadow-purple-500/25 border-0">
                    <Upload className="h-4 w-4 mr-2" />
                    Bulk Import
                  </Button>
                </Link>
                <Button 
                  variant="outline" 
                  onClick={handleSignOut}
                  className="border-red-400/50 text-red-300 hover:bg-red-500/20 hover:text-red-200 bg-white/5 backdrop-blur-sm"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
          {/* Error Message */}
          {error && (
            <Card className="mb-8 bg-red-500/10 border-red-500/20 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center space-x-2 text-red-300">
                  <div className="w-4 h-4 rounded-full bg-red-500"></div>
                  <p>{error}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stats Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="bg-white/10 backdrop-blur-xl border-white/20 overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-300 text-sm font-medium">Total Words</p>
                    <p className="text-3xl font-bold text-white">{words.length}</p>
                    <p className="text-xs text-gray-400 mt-1">vocabulary entries</p>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-0 bg-blue-500 rounded-full blur opacity-50"></div>
                    <div className="relative bg-gradient-to-r from-blue-500 to-cyan-500 p-3 rounded-full">
                      <BookOpen className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white/10 backdrop-blur-xl border-white/20 overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-300 text-sm font-medium">Search Results</p>
                    <p className="text-3xl font-bold text-white">{filteredWords.length}</p>
                    <p className="text-xs text-gray-400 mt-1">matching words</p>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-0 bg-emerald-500 rounded-full blur opacity-50"></div>
                    <div className="relative bg-gradient-to-r from-emerald-500 to-teal-500 p-3 rounded-full">
                      <Search className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white/10 backdrop-blur-xl border-white/20 overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-300 text-sm font-medium">GRE Progress</p>
                    <p className="text-3xl font-bold text-white">{getProgressPercentage().toFixed(0)}%</p>
                    <p className="text-xs text-gray-400 mt-1">of 1000 target</p>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-0 bg-purple-500 rounded-full blur opacity-50"></div>
                    <div className="relative bg-gradient-to-r from-purple-500 to-pink-500 p-3 rounded-full">
                      <Target className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${getProgressPercentage()}%` }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/10 backdrop-blur-xl border-white/20 overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-300 text-sm font-medium">Learning Streak</p>
                    <p className="text-3xl font-bold text-white">7</p>
                    <p className="text-xs text-gray-400 mt-1">days active</p>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-0 bg-orange-500 rounded-full blur opacity-50"></div>
                    <div className="relative bg-gradient-to-r from-orange-500 to-red-500 p-3 rounded-full">
                      <TrendingUp className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <Card className="mb-8 bg-white/10 backdrop-blur-xl border-white/20">
            <CardContent className="p-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  placeholder="Search your vocabulary collection..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 text-lg py-6 bg-white/10 border-white/20 focus:bg-white/20 text-white placeholder-gray-400 backdrop-blur-sm"
                />
                {searchTerm && (
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                    <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                      {filteredWords.length} results
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Words List */}
          {loading ? (
            <div className="text-center py-20">
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-purple-500 rounded-full blur opacity-50 animate-pulse"></div>
                <div className="relative bg-gradient-to-r from-purple-500 to-pink-500 p-4 rounded-full">
                  <Brain className="h-12 w-12 text-white animate-pulse" />
                </div>
              </div>
              <p className="text-gray-300 mt-6 text-lg">Loading your vocabulary...</p>
            </div>
          ) : filteredWords.length === 0 ? (
            <Card className="bg-white/10 backdrop-blur-xl border-white/20">
              <CardContent className="p-16 text-center">
                <div className="relative inline-block mb-6">
                  <div className="absolute inset-0 bg-blue-500 rounded-full blur opacity-50"></div>
                  <div className="relative bg-gradient-to-r from-blue-500 to-purple-500 p-6 rounded-full">
                    <BookOpen className="h-16 w-16 text-white" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">
                  {searchTerm ? 'No words found' : 'Start Your GRE Journey'}
                </h3>
                <p className="text-gray-300 mb-8 text-lg max-w-md mx-auto">
                  {searchTerm 
                    ? `No words match "${searchTerm}". Try a different search term.`
                    : 'Begin building your vocabulary with your first GRE word and unlock your potential.'
                  }
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/add">
                    <Button className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25 px-8 py-3">
                      <Plus className="h-5 w-5 mr-2" />
                      Add Your First Word
                    </Button>
                  </Link>
                  <Link href="/upload">
                    <Button className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white shadow-lg shadow-purple-500/25 px-8 py-3">
                      <Upload className="h-5 w-5 mr-2" />
                      Import from JSON
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredWords.map((word, index) => (
                <Card key={word.id} className="group bg-white/10 backdrop-blur-xl border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/20">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl text-white capitalize group-hover:text-purple-300 transition-colors">
                        {word.word}
                      </CardTitle>
                      <div className="flex items-center space-x-2">
                        <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                          #{index + 1}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(word.id)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/20 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-300 leading-relaxed mb-4">{word.definition}</p>
                    <div className="flex items-center justify-between">
                      <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                        <Sparkles className="h-3 w-3 mr-1" />
                        GRE Vocabulary
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {word.createdAt?.toDate?.()?.toLocaleDateString() || 'Recently added'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}