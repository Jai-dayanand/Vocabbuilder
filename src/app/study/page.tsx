'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Play, 
  Pause, 
  SkipForward, 
  RotateCcw, 
  Settings, 
  Clock, 
  BookOpen,
  CheckCircle,
  Target,
  Zap,
  Eye,
  EyeOff
} from 'lucide-react';
import Link from 'next/link';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Word {
  id: string;
  word: string;
  definition: string;
  createdAt: any;
  userId: string;
}

interface StudySession {
  words: Word[];
  currentIndex: number;
  timePerWord: number;
  totalTime: number;
  isActive: boolean;
  isPaused: boolean;
  showDefinition: boolean;
  wordsStudied: number;
  sessionStartTime: number;
}

interface StudySettings {
  wordsPerSession: number;
  timePerWord: number;
  autoAdvance: boolean;
  shuffleWords: boolean;
}

export default function StudyPage() {
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(true);
  const [timeLeft, setTimeLeft] = useState(0);
  const { user } = useAuth();
  const router = useRouter();

  const [settings, setSettings] = useState<StudySettings>({
    wordsPerSession: 10,
    timePerWord: 30,
    autoAdvance: true,
    shuffleWords: true
  });

  const [session, setSession] = useState<StudySession>({
    words: [],
    currentIndex: 0,
    timePerWord: 30,
    totalTime: 0,
    isActive: false,
    isPaused: false,
    showDefinition: false,
    wordsStudied: 0,
    sessionStartTime: 0
  });

  // Load words from Firebase
  useEffect(() => {
    if (!user) return;

    const loadWords = async () => {
      setLoading(true);
      setError(null);

      try {
        const q = query(
          collection(db, 'gre_words'),
          where('userId', '==', user.uid),
          limit(100)
        );

        const querySnapshot = await getDocs(q);
        const wordsData: Word[] = [];
        querySnapshot.forEach((doc) => {
          wordsData.push({ id: doc.id, ...doc.data() } as Word);
        });

        // Simple sort by word name if createdAt sorting fails
        wordsData.sort((a, b) => a.word.localeCompare(b.word));

        setWords(wordsData);
      } catch (error) {
        console.error('Error loading words:', error);
        setError('Failed to load vocabulary. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    };

    loadWords();
  }, [user]);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (session.isActive && !session.isPaused && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (settings.autoAdvance) {
              handleNextWord();
            }
            return session.timePerWord;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [session.isActive, session.isPaused, timeLeft, settings.autoAdvance]);

  const shuffleArray = (array: Word[]) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const startSession = () => {
    if (words.length === 0) {
      setError('No words available for study session.');
      return;
    }

    let sessionWords = words.slice(0, settings.wordsPerSession);
    if (settings.shuffleWords) {
      sessionWords = shuffleArray(sessionWords);
    }

    setSession({
      words: sessionWords,
      currentIndex: 0,
      timePerWord: settings.timePerWord,
      totalTime: 0,
      isActive: true,
      isPaused: false,
      showDefinition: false,
      wordsStudied: 0,
      sessionStartTime: Date.now()
    });

    setTimeLeft(settings.timePerWord);
    setShowSettings(false);
  };

  const pauseSession = () => {
    setSession(prev => ({ ...prev, isPaused: !prev.isPaused }));
  };

  const handleNextWord = useCallback(() => {
    setSession(prev => {
      const nextIndex = prev.currentIndex + 1;
      const wordsStudied = prev.wordsStudied + 1;
      
      if (nextIndex >= prev.words.length) {
        // Session complete
        return {
          ...prev,
          isActive: false,
          wordsStudied,
          totalTime: Math.floor((Date.now() - prev.sessionStartTime) / 1000)
        };
      }

      return {
        ...prev,
        currentIndex: nextIndex,
        showDefinition: false,
        wordsStudied
      };
    });
    
    setTimeLeft(settings.timePerWord);
  }, [settings.timePerWord]);

  const toggleDefinition = () => {
    setSession(prev => ({ ...prev, showDefinition: !prev.showDefinition }));
  };

  const resetSession = () => {
    setSession({
      words: [],
      currentIndex: 0,
      timePerWord: 30,
      totalTime: 0,
      isActive: false,
      isPaused: false,
      showDefinition: false,
      wordsStudied: 0,
      sessionStartTime: 0
    });
    setShowSettings(true);
    setTimeLeft(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    if (session.words.length === 0) return 0;
    return (session.currentIndex / session.words.length) * 100;
  };

  const currentWord = session.words[session.currentIndex];
  const isSessionComplete = session.isActive === false && session.wordsStudied > 0;

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg mx-auto mb-4 animate-pulse"></div>
            <p className="text-gray-400">Loading study session...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        {/* Header */}
        <header className="glass border-b border-white/5">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <Link href="/">
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-gray-800">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              
              {session.isActive && (
                <div className="flex items-center space-x-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-400">{formatTime(timeLeft)}</p>
                    <p className="text-xs text-gray-400">Time Left</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold">{session.currentIndex + 1}/{session.words.length}</p>
                    <p className="text-xs text-gray-400">Progress</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Settings Panel */}
          {showSettings && (
            <div className="space-y-8">
              {/* Header */}
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-blue-600 rounded-2xl mx-auto mb-6 flex items-center justify-center">
                  <Clock className="h-8 w-8 text-white" />
                </div>
                <h1 className="text-3xl font-bold mb-4 gradient-text">
                  Timed Study Session
                </h1>
                <p className="text-gray-400 max-w-2xl mx-auto">
                  Review vocabulary words in focused, timed chunks for better retention
                </p>
              </div>

              {/* Settings */}
              <Card className="glass border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Settings className="h-5 w-5" />
                    <span>Session Settings</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-3">
                        Words per Session
                      </label>
                      <div className="flex space-x-2">
                        {[5, 10, 15, 20].map((num) => (
                          <Button
                            key={num}
                            variant={settings.wordsPerSession === num ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSettings(prev => ({ ...prev, wordsPerSession: num }))}
                            className={settings.wordsPerSession === num 
                              ? "bg-blue-600 hover:bg-blue-700" 
                              : "border-gray-700 text-gray-300 hover:bg-gray-800"
                            }
                          >
                            {num}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-3">
                        Time per Word (seconds)
                      </label>
                      <div className="flex space-x-2">
                        {[15, 30, 45, 60].map((time) => (
                          <Button
                            key={time}
                            variant={settings.timePerWord === time ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSettings(prev => ({ ...prev, timePerWord: time }))}
                            className={settings.timePerWord === time 
                              ? "bg-blue-600 hover:bg-blue-700" 
                              : "border-gray-700 text-gray-300 hover:bg-gray-800"
                            }
                          >
                            {time}s
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button
                      variant={settings.autoAdvance ? "default" : "outline"}
                      onClick={() => setSettings(prev => ({ ...prev, autoAdvance: !prev.autoAdvance }))}
                      className={settings.autoAdvance 
                        ? "bg-green-600 hover:bg-green-700" 
                        : "border-gray-700 text-gray-300 hover:bg-gray-800"
                      }
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      Auto Advance: {settings.autoAdvance ? 'ON' : 'OFF'}
                    </Button>

                    <Button
                      variant={settings.shuffleWords ? "default" : "outline"}
                      onClick={() => setSettings(prev => ({ ...prev, shuffleWords: !prev.shuffleWords }))}
                      className={settings.shuffleWords 
                        ? "bg-purple-600 hover:bg-purple-700" 
                        : "border-gray-700 text-gray-300 hover:bg-gray-800"
                      }
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Shuffle: {settings.shuffleWords ? 'ON' : 'OFF'}
                    </Button>
                  </div>

                  <div className="pt-4 border-t border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="font-semibold">Ready to Start</p>
                        <p className="text-sm text-gray-400">
                          {Math.min(settings.wordsPerSession, words.length)} words • {formatTime(settings.wordsPerSession * settings.timePerWord)} estimated
                        </p>
                      </div>
                      <Badge className="bg-blue-600/20 text-blue-400 border-blue-600/30">
                        {words.length} words available
                      </Badge>
                    </div>
                    
                    <Button 
                      onClick={startSession}
                      disabled={words.length === 0}
                      className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-medium"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Start Study Session
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Active Session */}
          {session.isActive && currentWord && (
            <div className="space-y-6">
              {/* Progress Bar */}
              <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-green-500 to-blue-600 h-2 transition-all duration-300 rounded-full"
                  style={{ width: `${getProgressPercentage()}%` }}
                ></div>
              </div>

              {/* Word Card */}
              <Card className="glass border-gray-700">
                <CardContent className="p-8 text-center">
                  <div className="mb-6">
                    <Badge className="bg-blue-600/20 text-blue-400 border-blue-600/30 mb-4">
                      Word #{session.currentIndex + 1}
                    </Badge>
                    <h2 className="text-4xl font-bold mb-4 gradient-text">
                      {currentWord.word}
                    </h2>
                  </div>

                  {session.showDefinition && (
                    <div className="mb-6 p-6 bg-gray-900/50 border border-gray-700 rounded-lg animate-fade-in">
                      <p className="text-lg text-gray-300 leading-relaxed">
                        {currentWord.definition}
                      </p>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button
                      onClick={toggleDefinition}
                      variant="outline"
                      className="border-gray-700 text-gray-300 hover:bg-gray-800"
                    >
                      {session.showDefinition ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                      {session.showDefinition ? 'Hide' : 'Show'} Definition
                    </Button>

                    <Button
                      onClick={pauseSession}
                      variant="outline"
                      className="border-gray-700 text-gray-300 hover:bg-gray-800"
                    >
                      {session.isPaused ? <Play className="h-4 w-4 mr-2" /> : <Pause className="h-4 w-4 mr-2" />}
                      {session.isPaused ? 'Resume' : 'Pause'}
                    </Button>

                    <Button
                      onClick={handleNextWord}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <SkipForward className="h-4 w-4 mr-2" />
                      Next Word
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Session Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass p-4 rounded-lg text-center">
                  <Clock className="h-5 w-5 text-blue-400 mx-auto mb-2" />
                  <p className="text-lg font-bold">{formatTime(timeLeft)}</p>
                  <p className="text-xs text-gray-400">Time Left</p>
                </div>
                <div className="glass p-4 rounded-lg text-center">
                  <Target className="h-5 w-5 text-green-400 mx-auto mb-2" />
                  <p className="text-lg font-bold">{session.wordsStudied}</p>
                  <p className="text-xs text-gray-400">Studied</p>
                </div>
                <div className="glass p-4 rounded-lg text-center">
                  <BookOpen className="h-5 w-5 text-purple-400 mx-auto mb-2" />
                  <p className="text-lg font-bold">{session.words.length - session.currentIndex}</p>
                  <p className="text-xs text-gray-400">Remaining</p>
                </div>
                <div className="glass p-4 rounded-lg text-center">
                  <Zap className="h-5 w-5 text-yellow-400 mx-auto mb-2" />
                  <p className="text-lg font-bold">{Math.round(getProgressPercentage())}%</p>
                  <p className="text-xs text-gray-400">Progress</p>
                </div>
              </div>
            </div>
          )}

          {/* Session Complete */}
          {isSessionComplete && (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-blue-600 rounded-2xl mx-auto mb-6 flex items-center justify-center">
                <CheckCircle className="h-10 w-10 text-white" />
              </div>
              
              <div>
                <h2 className="text-3xl font-bold mb-4 gradient-text">
                  Session Complete!
                </h2>
                <p className="text-gray-400 mb-6">
                  Great job! You've completed your study session.
                </p>
              </div>

              <Card className="glass border-gray-700 max-w-md mx-auto">
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-green-400">{session.wordsStudied}</p>
                      <p className="text-xs text-gray-400">Words Studied</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-blue-400">{formatTime(session.totalTime)}</p>
                      <p className="text-xs text-gray-400">Total Time</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  onClick={resetSession}
                  className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  New Session
                </Button>
                <Link href="/">
                  <Button variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800">
                    <BookOpen className="h-4 w-4 mr-2" />
                    Back to Vocabulary
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}