'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Search, Plus, LogOut, Trash2, Upload, Target, TrendingUp, Brain, Zap } from 'lucide-react';
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
    const target = 1000;
    return Math.min((words.length / target) * 100, 100);
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
          
          {/* Floating minimal elements */}
          <div className="absolute top-1/4 right-1/4 w-2 h-2 bg-white/30 rotate-45 animate-pulse"></div>
          <div className="absolute bottom-1/3 left-1/5 w-1 h-1 bg-white/40 rounded-full animate-pulse delay-1000"></div>
          <div className="absolute top-2/3 right-1/3 w-1.5 h-1.5 bg-white/20 rotate-45 animate-pulse delay-2000"></div>
        </div>

        {/* Header */}
        <div className="relative z-10 border-b border-white/10 bg-black/80 backdrop-blur-sm sticky top-0">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-8 h-8 bg-white rounded-sm flex items-center justify-center">
                  <Brain className="h-5 w-5 text-black" />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight">GRE MASTERY</h1>
                  <p className="text-xs text-white/60 uppercase tracking-wider">
                    {user?.email?.split('@')[0]}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Link href="/add">
                  <Button className="bg-white text-black hover:bg-white/90 font-medium">
                    <Plus className="h-4 w-4 mr-2" />
                    ADD
                  </Button>
                </Link>
                <Link href="/upload">
                  <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                    <Upload className="h-4 w-4 mr-2" />
                    BULK
                  </Button>
                </Link>
                <Button 
                  variant="outline" 
                  onClick={handleSignOut}
                  className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
          {/* Error Message */}
          {error && (
            <div className="mb-8 p-4 border border-red-500/30 bg-red-500/10 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="border border-white/10 p-4 bg-white/5">
              <div className="flex items-center justify-between mb-2">
                <BookOpen className="h-4 w-4 text-white/60" />
                <span className="text-xs text-white/40 uppercase tracking-wider">TOTAL</span>
              </div>
              <p className="text-2xl font-bold">{words.length}</p>
            </div>
            
            <div className="border border-white/10 p-4 bg-white/5">
              <div className="flex items-center justify-between mb-2">
                <Search className="h-4 w-4 text-white/60" />
                <span className="text-xs text-white/40 uppercase tracking-wider">FOUND</span>
              </div>
              <p className="text-2xl font-bold">{filteredWords.length}</p>
            </div>
            
            <div className="border border-white/10 p-4 bg-white/5">
              <div className="flex items-center justify-between mb-2">
                <Target className="h-4 w-4 text-white/60" />
                <span className="text-xs text-white/40 uppercase tracking-wider">PROGRESS</span>
              </div>
              <p className="text-2xl font-bold">{getProgressPercentage().toFixed(0)}%</p>
              <div className="mt-2 w-full bg-white/10 h-1">
                <div 
                  className="bg-white h-1 transition-all duration-500"
                  style={{ width: `${getProgressPercentage()}%` }}
                ></div>
              </div>
            </div>

            <div className="border border-white/10 p-4 bg-white/5">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="h-4 w-4 text-white/60" />
                <span className="text-xs text-white/40 uppercase tracking-wider">STREAK</span>
              </div>
              <p className="text-2xl font-bold">7</p>
            </div>
          </div>

          {/* Search */}
          <div className="mb-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
              <Input
                placeholder="SEARCH VOCABULARY..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 bg-white/5 border-white/10 text-white placeholder-white/40 focus:border-white/30 focus:bg-white/10 uppercase tracking-wider text-sm"
              />
              {searchTerm && (
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                  <Badge className="bg-white/10 text-white/80 border-white/20 text-xs">
                    {filteredWords.length}
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* Words List */}
          {loading ? (
            <div className="text-center py-20">
              <div className="w-8 h-8 bg-white rounded-sm mx-auto mb-4 animate-pulse"></div>
              <p className="text-white/60 uppercase tracking-wider text-sm">LOADING</p>
            </div>
          ) : filteredWords.length === 0 ? (
            <div className="border border-white/10 p-16 text-center bg-white/5">
              <div className="w-12 h-12 bg-white/10 rounded-sm mx-auto mb-6 flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-white/60" />
              </div>
              <h3 className="text-xl font-bold mb-3 uppercase tracking-wider">
                {searchTerm ? 'NO MATCHES' : 'START BUILDING'}
              </h3>
              <p className="text-white/60 mb-8 max-w-md mx-auto">
                {searchTerm 
                  ? `No words match "${searchTerm}"`
                  : 'Begin your GRE vocabulary journey'
                }
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/add">
                  <Button className="bg-white text-black hover:bg-white/90 font-medium">
                    <Plus className="h-4 w-4 mr-2" />
                    ADD FIRST WORD
                  </Button>
                </Link>
                <Link href="/upload">
                  <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                    <Upload className="h-4 w-4 mr-2" />
                    IMPORT JSON
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredWords.map((word, index) => (
                <div key={word.id} className="group border border-white/10 p-6 bg-white/5 hover:bg-white/10 transition-all duration-200">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold uppercase tracking-wider mb-1">
                        {word.word}
                      </h3>
                      <Badge className="bg-white/10 text-white/60 border-white/20 text-xs">
                        #{index + 1}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(word.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <p className="text-white/80 leading-relaxed mb-4 text-sm">
                    {word.definition}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <Badge className="bg-white/5 text-white/50 border-white/10 text-xs">
                      <Zap className="h-3 w-3 mr-1" />
                      GRE
                    </Badge>
                    <span className="text-xs text-white/30 uppercase tracking-wider">
                      {word.createdAt?.toDate?.()?.toLocaleDateString() || 'RECENT'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}