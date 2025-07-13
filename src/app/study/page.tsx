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
  EyeOff,
  List,
  Check,
  X,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import { collection, query, where, getDocs } from 'firebase/firestore';
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
  uniqueWordsMode: boolean;
}

interface ChecklistItem {
  wordId: string;
  word: string;
  definition: string;
  isRead: boolean;
  readAt?: number;
}

export default function StudyPage() {
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(true);
  const [timeLeft, setTimeLeft] = useState(0);
  const [studyMode, setStudyMode] = useState<'timed' | 'checklist'>('timed');
  const { user } = useAuth();
  const router = useRouter();

  const [settings, setSettings] = useState<StudySettings>({
    wordsPerSession: 25,
    timePerWord: 30,
    autoAdvance: true,
    shuffleWords: true,
    uniqueWordsMode: true
  });

  const [session, setSession] = useState<StudySession>({
    words: [],
    currentIndex: 0,
    timePerWord: 30,
    totalTime: 0,
    isActive: false,
    isPaused: false,
    showDefinition: true,
    wordsStudied: 0,
    sessionStartTime: 0
  });

  // Checklist mode state
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [checklistProgress, setChecklistProgress] = useState(0);

  // Track studied words across sessions
  const [studiedWordsInSession, setStudiedWordsInSession] = useState<Set<string>>(new Set());
  const [availableWords, setAvailableWords] = useState<Word[]>([]);

  // Load words from Firebase
  useEffect(() => {
    if (!user) return;

    const loadWords = async () => {
      setLoading(true);
      setError(null);

      try {
        const q = query(
          collection(db, 'gre_words'),
          where('userId', '==', user.uid)
        );

        const querySnapshot = await getDocs(q);
        const wordsData: Word[] = [];
        querySnapshot.forEach((doc) => {
          wordsData.push({ id: doc.id, ...doc.data() } as Word);
        });

        // Sort by word name for consistency
        wordsData.sort((a, b) => a.word.localeCompare(b.word));

        setWords(wordsData);
        setAvailableWords(wordsData);
      } catch (error) {
        console.error('Error loading words:', error);
        setError('Failed to load vocabulary. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    };

    loadWords();
  }, [user]);

  // Update available words when settings or studied words change
  useEffect(() => {
    if (settings.uniqueWordsMode) {
      const remaining = words.filter(word => !studiedWordsInSession.has(word.id));
      setAvailableWords(remaining);
    } else {
      setAvailableWords(words);
    }
  }, [words, studiedWordsInSession, settings.uniqueWordsMode]);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (session.isActive && !session.isPaused && timeLeft > 0 && studyMode === 'timed') {
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
  }, [session.isActive, session.isPaused, timeLeft, settings.autoAdvance, studyMode]);

  // Improved Fisher-Yates shuffle algorithm
  const shuffleArray = (array: Word[]): Word[] => {
    const shuffled = [...array];
    
    // Use crypto.getRandomValues for better randomness if available
    const getRandomValue = () => {
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        const array = new Uint32Array(1);
        crypto.getRandomValues(array);
        return array[0] / (0xffffffff + 1);
      }
      return Math.random();
    };

    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(getRandomValue() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    return shuffled;
  };

  const startTimedSession = () => {
    if (availableWords.length === 0) {
      setError(settings.uniqueWordsMode ? 'No new words available. Reset sessions to study all words again.' : 'No words available for study session.');
      return;
    }

    let sessionWords = availableWords.slice(0, settings.wordsPerSession);
    if (settings.shuffleWords) {
      // Apply shuffle multiple times for better randomization
      sessionWords = shuffleArray(shuffleArray(sessionWords));
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
    setStudyMode('timed');
  };

  const startChecklistSession = () => {
    if (availableWords.length === 0) {
      setError('No words available for checklist reading.');
      return;
    }

    let sessionWords = availableWords.slice(0, settings.wordsPerSession);
    if (settings.shuffleWords) {
      sessionWords = shuffleArray(shuffleArray(sessionWords));
    }

    const checklistItems: ChecklistItem[] = sessionWords.map(word => ({
      wordId: word.id,
      word: word.word,
      definition: word.definition,
      isRead: false
    }));

    setChecklist(checklistItems);
    setChecklistProgress(0);
    setShowSettings(false);
    setStudyMode('checklist');
  };

  const pauseSession = () => {
    setSession(prev => ({ ...prev, isPaused: !prev.isPaused }));
  };

  const handleNextWord = useCallback(() => {
    setSession(prev => {
      const nextIndex = prev.currentIndex + 1;
      const wordsStudied = prev.wordsStudied + 1;
      
      // Mark current word as studied if in unique mode
      if (settings.uniqueWordsMode && prev.words[prev.currentIndex]) {
        setStudiedWordsInSession(prevStudied => 
          new Set([...prevStudied, prev.words[prev.currentIndex].id])
        );
      }
      
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
        showDefinition: true,
        wordsStudied
      };
    });
    
    setTimeLeft(settings.timePerWord);
  }, [settings.timePerWord, settings.uniqueWordsMode]);

  const toggleDefinition = () => {
    setSession(prev => ({ ...prev, showDefinition: !prev.showDefinition }));
  };

  const toggleChecklistItem = (index: number) => {
    setChecklist(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        isRead: !updated[index].isRead,
        readAt: !updated[index].isRead ? Date.now() : undefined
      };
      
      const readCount = updated.filter(item => item.isRead).length;
      setChecklistProgress(readCount);
      
      return updated;
    });
  };

  const resetSession = () => {
    setStudiedWordsInSession(new Set());
    setSession({
      words: [],
      currentIndex: 0,
      timePerWord: 30,
      totalTime: 0,
      isActive: false,
      isPaused: false,
      showDefinition: true,
      wordsStudied: 0,
      sessionStartTime: 0
    });
    setChecklist([]);
    setChecklistProgress(0);
    setShowSettings(true);
    setTimeLeft(0);
  };

  const resetStudiedWords = () => {
    setStudiedWordsInSession(new Set());
  };

  const resetChecklist = () => {
    setChecklist(prev => prev.map(item => ({ ...item, isRead: false, readAt: undefined })));
    setChecklistProgress(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    if (studyMode === 'checklist') {
      return checklist.length > 0 ? (checklistProgress / checklist.length) * 100 : 0;
    }
    if (session.words.length === 0) return 0;
    return (session.currentIndex / session.words.length) * 100;
  };

  const currentWord = session.words[session.currentIndex];
  const isSessionComplete = studyMode === 'timed' ? (session.isActive === false && session.wordsStudied > 0) : (checklistProgress === checklist.length && checklist.length > 0);

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
        <header className="glass border-b border-white/5 sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
            <div className="flex items-center justify-between">
              <Link href="/">
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-gray-800">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Back</span>
                </Button>
              </Link>
              
              {/* Mobile Progress */}
              {(session.isActive || checklist.length > 0) && (
                <div className="flex items-center space-x-2 sm:space-x-4">
                  {studyMode === 'timed' && (
                    <div className="text-center">
                      <p className="text-lg sm:text-2xl font-bold text-blue-400">{formatTime(timeLeft)}</p>
                      <p className="text-xs text-gray-400 hidden sm:block">Time Left</p>
                    </div>
                  )}
                  <div className="text-center">
                    <p className="text-sm sm:text-lg font-semibold">
                      {studyMode === 'timed' 
                        ? `${session.currentIndex + 1}/${session.words.length}`
                        : `${checklistProgress}/${checklist.length}`
                      }
                    </p>
                    <p className="text-xs text-gray-400 hidden sm:block">Progress</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Settings Panel */}
          {showSettings && (
            <div className="space-y-6 sm:space-y-8">
              {/* Header */}
              <div className="text-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-green-500 to-blue-600 rounded-2xl mx-auto mb-4 sm:mb-6 flex items-center justify-center">
                  <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold mb-2 sm:mb-4 gradient-text">
                  Study Session
                </h1>
                <p className="text-gray-400 max-w-2xl mx-auto text-sm sm:text-base">
                  Choose your study mode and review vocabulary effectively
                </p>
              </div>

              {/* Study Mode Selection */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <Button
                  variant={studyMode === 'timed' ? "default" : "outline"}
                  onClick={() => setStudyMode('timed')}
                  className={`flex-1 h-auto p-4 ${studyMode === 'timed' 
                    ? "bg-blue-600 hover:bg-blue-700" 
                    : "border-gray-700 text-gray-300 hover:bg-gray-800"
                  }`}
                >
                  <div className="text-center">
                    <Clock className="h-6 w-6 mx-auto mb-2" />
                    <div className="font-semibold">Timed Study</div>
                    <div className="text-xs opacity-80">Auto-advance with timer</div>
                  </div>
                </Button>
                
                <Button
                  variant={studyMode === 'checklist' ? "default" : "outline"}
                  onClick={() => setStudyMode('checklist')}
                  className={`flex-1 h-auto p-4 ${studyMode === 'checklist' 
                    ? "bg-green-600 hover:bg-green-700" 
                    : "border-gray-700 text-gray-300 hover:bg-gray-800"
                  }`}
                >
                  <div className="text-center">
                    <List className="h-6 w-6 mx-auto mb-2" />
                    <div className="font-semibold">Checklist Reading</div>
                    <div className="text-xs opacity-80">Track reading progress</div>
                  </div>
                </Button>
              </div>

              {/* Settings */}
              <Card className="glass border-gray-700">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center space-x-2 text-lg">
                    <Settings className="h-5 w-5" />
                    <span>Session Settings</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 sm:space-y-6">
                  <div className="grid grid-cols-1 gap-4 sm:gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-3">
                        Words per Session
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        {[10, 25, 50, 100].map((num) => (
                          <Button
                            key={num}
                            variant={settings.wordsPerSession === num ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSettings(prev => ({ ...prev, wordsPerSession: num }))}
                            className={`text-xs sm:text-sm ${settings.wordsPerSession === num 
                              ? "bg-blue-600 hover:bg-blue-700" 
                              : "border-gray-700 text-gray-300 hover:bg-gray-800"
                            }`}
                          >
                            {num}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {studyMode === 'timed' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-3">
                          Time per Word (seconds)
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                          {[15, 30, 45, 60].map((time) => (
                            <Button
                              key={time}
                              variant={settings.timePerWord === time ? "default" : "outline"}
                              size="sm"
                              onClick={() => setSettings(prev => ({ ...prev, timePerWord: time }))}
                              className={`text-xs sm:text-sm ${settings.timePerWord === time 
                                ? "bg-blue-600 hover:bg-blue-700" 
                                : "border-gray-700 text-gray-300 hover:bg-gray-800"
                              }`}
                            >
                              {time}s
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-3">
                    {studyMode === 'timed' && (
                      <Button
                        variant={settings.autoAdvance ? "default" : "outline"}
                        onClick={() => setSettings(prev => ({ ...prev, autoAdvance: !prev.autoAdvance }))}
                        className={`justify-start text-sm ${settings.autoAdvance 
                          ? "bg-green-600 hover:bg-green-700" 
                          : "border-gray-700 text-gray-300 hover:bg-gray-800"
                        }`}
                      >
                        <Zap className="h-4 w-4 mr-2" />
                        Auto Advance: {settings.autoAdvance ? 'ON' : 'OFF'}
                      </Button>
                    )}

                    <Button
                      variant={settings.shuffleWords ? "default" : "outline"}
                      onClick={() => setSettings(prev => ({ ...prev, shuffleWords: !prev.shuffleWords }))}
                      className={`justify-start text-sm ${settings.shuffleWords 
                        ? "bg-purple-600 hover:bg-purple-700" 
                        : "border-gray-700 text-gray-300 hover:bg-gray-800"
                      }`}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Shuffle: {settings.shuffleWords ? 'ON' : 'OFF'}
                    </Button>

                    <Button
                      variant={settings.uniqueWordsMode ? "default" : "outline"}
                      onClick={() => setSettings(prev => ({ ...prev, uniqueWordsMode: !prev.uniqueWordsMode }))}
                      className={`justify-start text-sm ${settings.uniqueWordsMode 
                        ? "bg-orange-600 hover:bg-orange-700" 
                        : "border-gray-700 text-gray-300 hover:bg-gray-800"
                      }`}
                    >
                      <Target className="h-4 w-4 mr-2" />
                      Unique Words: {settings.uniqueWordsMode ? 'ON' : 'OFF'}
                    </Button>
                  </div>

                  {settings.uniqueWordsMode && studiedWordsInSession.size > 0 && (
                    <div className="p-3 sm:p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-orange-400 text-sm">Session Progress</p>
                          <p className="text-xs sm:text-sm text-orange-300">
                            {studiedWordsInSession.size} studied • {availableWords.length} remaining
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={resetStudiedWords}
                          className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10 text-xs"
                        >
                          Reset
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="font-semibold text-sm sm:text-base">Ready to Start</p>
                        <p className="text-xs sm:text-sm text-gray-400">
                          {Math.min(settings.wordsPerSession, availableWords.length)} words
                          {studyMode === 'timed' && ` • ${formatTime(Math.min(settings.wordsPerSession, availableWords.length) * settings.timePerWord)} estimated`}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge className="bg-blue-600/20 text-blue-400 border-blue-600/30 mb-1 text-xs">
                          {availableWords.length} available
                        </Badge>
                        {settings.uniqueWordsMode && studiedWordsInSession.size > 0 && (
                          <Badge className="bg-orange-600/20 text-orange-400 border-orange-600/30 block text-xs">
                            {studiedWordsInSession.size} studied
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <Button 
                      onClick={studyMode === 'timed' ? startTimedSession : startChecklistSession}
                      disabled={availableWords.length === 0}
                      className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-medium"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      {availableWords.length === 0 && settings.uniqueWordsMode 
                        ? 'All Words Studied - Reset to Continue' 
                        : `Start ${studyMode === 'timed' ? 'Timed' : 'Checklist'} Session`
                      }
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Timed Session */}
          {studyMode === 'timed' && session.isActive && currentWord && (
            <div className="space-y-4 sm:space-y-6">
              {/* Progress Bar */}
              <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-green-500 to-blue-600 h-2 transition-all duration-300 rounded-full"
                  style={{ width: `${getProgressPercentage()}%` }}
                ></div>
              </div>

              {/* Word Card */}
              <Card className="glass border-gray-700">
                <CardContent className="p-4 sm:p-8 text-center">
                  <div className="mb-4 sm:mb-6">
                    <Badge className="bg-blue-600/20 text-blue-400 border-blue-600/30 mb-2 sm:mb-4 text-xs">
                      Word #{session.currentIndex + 1}
                    </Badge>
                    <h2 className="text-2xl sm:text-4xl font-bold mb-3 sm:mb-4 gradient-text">
                      {currentWord.word}
                    </h2>
                    <div className="mb-4 sm:mb-6 p-4 sm:p-6 bg-gray-900/50 border border-gray-700 rounded-lg animate-fade-in">
                      <p className="text-sm sm:text-lg text-gray-300 leading-relaxed">
                        {currentWord.definition}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                    <Button
                      onClick={toggleDefinition}
                      variant="outline"
                      className="border-gray-700 text-gray-300 hover:bg-gray-800 text-sm"
                    >
                      {session.showDefinition ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                      {session.showDefinition ? 'Hide' : 'Show'}
                    </Button>

                    <Button
                      onClick={pauseSession}
                      variant="outline"
                      className="border-gray-700 text-gray-300 hover:bg-gray-800 text-sm"
                    >
                      {session.isPaused ? <Play className="h-4 w-4 mr-2" /> : <Pause className="h-4 w-4 mr-2" />}
                      {session.isPaused ? 'Resume' : 'Pause'}
                    </Button>

                    <Button
                      onClick={handleNextWord}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-sm"
                    >
                      <SkipForward className="h-4 w-4 mr-2" />
                      Next
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Session Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="glass p-3 sm:p-4 rounded-lg text-center">
                  <Clock className="h-4 sm:h-5 w-4 sm:w-5 text-blue-400 mx-auto mb-1 sm:mb-2" />
                  <p className="text-sm sm:text-lg font-bold">{formatTime(timeLeft)}</p>
                  <p className="text-xs text-gray-400">Time Left</p>
                </div>
                <div className="glass p-3 sm:p-4 rounded-lg text-center">
                  <Target className="h-4 sm:h-5 w-4 sm:w-5 text-green-400 mx-auto mb-1 sm:mb-2" />
                  <p className="text-sm sm:text-lg font-bold">{session.wordsStudied}</p>
                  <p className="text-xs text-gray-400">Studied</p>
                </div>
                <div className="glass p-3 sm:p-4 rounded-lg text-center">
                  <BookOpen className="h-4 sm:h-5 w-4 sm:w-5 text-purple-400 mx-auto mb-1 sm:mb-2" />
                  <p className="text-sm sm:text-lg font-bold">{session.words.length - session.currentIndex}</p>
                  <p className="text-xs text-gray-400">Remaining</p>
                </div>
                <div className="glass p-3 sm:p-4 rounded-lg text-center">
                  <Zap className="h-4 sm:h-5 w-4 sm:w-5 text-yellow-400 mx-auto mb-1 sm:mb-2" />
                  <p className="text-sm sm:text-lg font-bold">{Math.round(getProgressPercentage())}%</p>
                  <p className="text-xs text-gray-400">Progress</p>
                </div>
              </div>
            </div>
          )}

          {/* Checklist Session */}
          {studyMode === 'checklist' && checklist.length > 0 && !isSessionComplete && (
            <div className="space-y-4 sm:space-y-6">
              {/* Progress Bar */}
              <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-green-500 to-blue-600 h-2 transition-all duration-300 rounded-full"
                  style={{ width: `${getProgressPercentage()}%` }}
                ></div>
              </div>

              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-xl sm:text-2xl font-bold">Reading Checklist</h2>
                <div className="flex items-center space-x-2">
                  <Badge className="bg-green-600/20 text-green-400 border-green-600/30 text-xs">
                    {checklistProgress}/{checklist.length}
                  </Badge>
                  <Button
                    onClick={resetChecklist}
                    variant="outline"
                    size="sm"
                    className="border-gray-700 text-gray-300 hover:bg-gray-800 text-xs"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Reset
                  </Button>
                </div>
              </div>

              {/* Checklist Items */}
              <div className="space-y-3">
                {checklist.map((item, index) => (
                  <Card 
                    key={item.wordId} 
                    className={`glass border-gray-700 transition-all cursor-pointer ${
                      item.isRead ? 'bg-green-500/10 border-green-500/30' : 'hover:bg-gray-800/50'
                    }`}
                    onClick={() => toggleChecklistItem(index)}
                  >
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-start space-x-3">
                        <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center mt-1 flex-shrink-0 ${
                          item.isRead 
                            ? 'bg-green-500 border-green-500' 
                            : 'border-gray-600 hover:border-gray-500'
                        }`}>
                          {item.isRead && <Check className="h-3 w-3 sm:h-4 sm:w-4 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className={`font-semibold text-sm sm:text-lg ${
                              item.isRead ? 'text-green-400 line-through' : 'text-white'
                            }`}>
                              {item.word}
                            </h3>
                            <Badge className="bg-blue-600/20 text-blue-400 border-blue-600/30 text-xs ml-2">
                              #{index + 1}
                            </Badge>
                          </div>
                          <p className={`text-xs sm:text-sm leading-relaxed ${
                            item.isRead ? 'text-gray-500' : 'text-gray-300'
                          }`}>
                            {item.definition}
                          </p>
                          {item.readAt && (
                            <p className="text-xs text-green-400 mt-1">
                              Read at {new Date(item.readAt).toLocaleTimeString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Session Complete */}
          {isSessionComplete && (
            <div className="text-center space-y-4 sm:space-y-6">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-green-500 to-blue-600 rounded-2xl mx-auto mb-4 sm:mb-6 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
              </div>
              
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold mb-2 sm:mb-4 gradient-text">
                  Session Complete!
                </h2>
                <p className="text-gray-400 mb-4 sm:mb-6 text-sm sm:text-base">
                  {studyMode === 'timed' 
                    ? "Great job! You've completed your timed study session."
                    : "Excellent! You've read through all the words in your checklist."
                  }
                </p>
              </div>

              <Card className="glass border-gray-700 max-w-md mx-auto">
                <CardContent className="p-4 sm:p-6">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <p className="text-xl sm:text-2xl font-bold text-green-400">
                        {studyMode === 'timed' ? session.wordsStudied : checklistProgress}
                      </p>
                      <p className="text-xs text-gray-400">Words {studyMode === 'timed' ? 'Studied' : 'Read'}</p>
                    </div>
                    <div>
                      <p className="text-xl sm:text-2xl font-bold text-blue-400">
                        {studyMode === 'timed' 
                          ? formatTime(session.totalTime) 
                          : `${Math.round(getProgressPercentage())}%`
                        }
                      </p>
                      <p className="text-xs text-gray-400">
                        {studyMode === 'timed' ? 'Total Time' : 'Complete'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                <Button
                  onClick={resetSession}
                  className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white text-sm"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  New Session
                </Button>
                {settings.uniqueWordsMode && (
                  <Button
                    onClick={resetStudiedWords}
                    variant="outline"
                    className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10 text-sm"
                  >
                    <Target className="h-4 w-4 mr-2" />
                    Reset Progress
                  </Button>
                )}
                <Link href="/">
                  <Button variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800 text-sm w-full sm:w-auto">
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