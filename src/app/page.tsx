'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Search, Plus, LogOut, Trash2, Upload, Target, Brain, Zap, Filter, Grid, List, FileText, Clock } from 'lucide-react';
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
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
    const target = 1000;
    return Math.min((words.length / target) * 100, 100);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        {/* Header */}
        <header className="sticky top-0 z-50 glass border-b border-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Brain className="h-4 w-4 text-white" />
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-lg font-semibold">GRE Mastery</h1>
                  <p className="text-xs text-gray-400">{user?.email?.split('@')[0]}</p>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex items-center space-x-2">
                <Link href="/study" className="hidden sm:block">
                  <Button variant="outline" size="sm" className="border-gray-700 text-gray-300 hover:bg-gray-800">
                    <Clock className="h-4 w-4 mr-2" />
                    Study
                  </Button>
                </Link>
                <Link href="/add" className="hidden sm:block">
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </Link>
                <Link href="/upload" className="hidden sm:block">
                  <Button variant="outline" size="sm" className="border-gray-700 text-gray-300 hover:bg-gray-800">
                    <Upload className="h-4 w-4 mr-2" />
                    Import
                  </Button>
                </Link>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={handleSignOut}
                  className="text-gray-400 hover:text-white hover:bg-gray-800"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm animate-fade-in">
              {error}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="glass p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <BookOpen className="h-4 w-4 text-blue-400" />
                <span className="text-xs text-gray-400 uppercase tracking-wider">Total</span>
              </div>
              <p className="text-2xl font-bold">{words.length}</p>
            </div>
            
            <div className="glass p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <Search className="h-4 w-4 text-green-400" />
                <span className="text-xs text-gray-400 uppercase tracking-wider">Found</span>
              </div>
              <p className="text-2xl font-bold">{filteredWords.length}</p>
            </div>
            
            <div className="glass p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <Target className="h-4 w-4 text-purple-400" />
                <span className="text-xs text-gray-400 uppercase tracking-wider">Progress</span>
              </div>
              <p className="text-2xl font-bold">{getProgressPercentage().toFixed(0)}%</p>
              <div className="mt-2 w-full bg-gray-800 h-1 rounded-full overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-purple-600 h-1 transition-all duration-500 rounded-full"
                  style={{ width: `${getProgressPercentage()}%` }}
                ></div>
              </div>
            </div>

            <div className="glass p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <Zap className="h-4 w-4 text-yellow-400" />
                <span className="text-xs text-gray-400 uppercase tracking-wider">Streak</span>
              </div>
              <p className="text-2xl font-bold">7</p>
            </div>
          </div>

          {/* Search and Controls */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search vocabulary..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-900/50 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500 focus:bg-gray-900"
              />
              {searchTerm && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <Badge className="bg-blue-600/20 text-blue-400 border-blue-600/30">
                    {filteredWords.length}
                  </Badge>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className={viewMode === 'grid' ? 'bg-blue-600 hover:bg-blue-700' : 'border-gray-700 text-gray-300 hover:bg-gray-800'}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
                className={viewMode === 'list' ? 'bg-blue-600 hover:bg-blue-700' : 'border-gray-700 text-gray-300 hover:bg-gray-800'}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Mobile Action Buttons */}
          <div className="flex sm:hidden gap-2 mb-6">
            <Link href="/study" className="flex-1">
              <Button variant="outline" className="w-full border-gray-700 text-gray-300 hover:bg-gray-800">
                <Clock className="h-4 w-4 mr-2" />
                Study
              </Button>
            </Link>
            <Link href="/add" className="flex-1">
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Add Word
              </Button>
            </Link>
            <Link href="/upload" className="flex-1">
              <Button variant="outline" className="w-full border-gray-700 text-gray-300 hover:bg-gray-800">
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
            </Link>
          </div>

          {/* Words List */}
          {loading ? (
            <div className="text-center py-20">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg mx-auto mb-4 animate-pulse-custom"></div>
              <p className="text-gray-400">Loading vocabulary...</p>
            </div>
          ) : filteredWords.length === 0 ? (
            <div className="glass p-12 text-center rounded-lg">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-lg mx-auto mb-6 flex items-center justify-center">
                <BookOpen className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">
                {searchTerm ? 'No matches found' : 'Start building your vocabulary'}
              </h3>
              <p className="text-gray-400 mb-8 max-w-md mx-auto">
                {searchTerm 
                  ? `No words match "${searchTerm}". Try a different search term.`
                  : 'Add your first GRE word to begin your vocabulary journey.'
                }
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/study">
                  <Button variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800">
                    <Clock className="h-4 w-4 mr-2" />
                    Start Study Session
                  </Button>
                </Link>
                <Link href="/add">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Word
                  </Button>
                </Link>
                <Link href="/upload">
                  <Button variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800 mr-4">
                    <Upload className="h-4 w-4 mr-2" />
                    JSON
                  </Button>
                </Link>
                <Link href="/extract">
                  <Button variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800">
                    <FileText className="h-4 w-4 mr-2" />
                    Extract
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className={`${
              viewMode === 'grid' 
                ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4' 
                : 'space-y-3'
            }`}>
              {filteredWords.map((word, index) => (
                <div 
                  key={word.id} 
                  className={`group glass hover:bg-white/5 transition-all duration-200 animate-fade-in ${
                    viewMode === 'grid' ? 'p-6 rounded-lg' : 'p-4 rounded-lg flex items-center justify-between'
                  }`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {viewMode === 'grid' ? (
                    <>
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold mb-1 group-hover:text-blue-400 transition-colors">
                            {word.word}
                          </h3>
                          <Badge className="bg-blue-600/20 text-blue-400 border-blue-600/30 text-xs">
                            #{index + 1}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(word.id)}
                          className="text-gray-400 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <p className="text-gray-300 leading-relaxed mb-4 text-sm">
                        {word.definition}
                      </p>
                      
                      <div className="flex items-center justify-between text-xs">
                        <Badge className="bg-gray-800 text-gray-400 border-gray-700">
                          <Zap className="h-3 w-3 mr-1" />
                          GRE
                        </Badge>
                        <span className="text-gray-500">
                          {word.createdAt?.toDate?.()?.toLocaleDateString() || 'Recent'}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-1">
                          <h3 className="font-semibold group-hover:text-blue-400 transition-colors">
                            {word.word}
                          </h3>
                          <Badge className="bg-blue-600/20 text-blue-400 border-blue-600/30 text-xs">
                            #{index + 1}
                          </Badge>
                        </div>
                        <p className="text-gray-400 text-sm line-clamp-2">
                          {word.definition}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(word.id)}
                        className="text-gray-400 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}