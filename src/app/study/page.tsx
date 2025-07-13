"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import Link from "next/link";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Interfaces remain the same
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

const initialSessionState: StudySession = {
  words: [],
  currentIndex: 0,
  timePerWord: 30,
  totalTime: 0,
  isActive: false,
  isPaused: false,
  showDefinition: true,
  wordsStudied: 0,
  sessionStartTime: 0,
};

export default function StudyPage() {
  const { user } = useAuth();
  const [allWords, setAllWords] = useState<Word[]>([]);
  const [availableWords, setAvailableWords] = useState<Word[]>([]);

  // State for persistent progress tracking
  const [studiedWords, setStudiedWords] = useState<Set<string>>(new Set());

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(true);
  const [timeLeft, setTimeLeft] = useState(0);

  const [settings, setSettings] = useState<StudySettings>({
    wordsPerSession: 25,
    timePerWord: 30,
    autoAdvance: true,
    shuffleWords: true,
    uniqueWordsMode: true,
  });

  const [session, setSession] = useState<StudySession>(initialSessionState);

  // Load all words from Firebase and studied words from localStorage
  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Load studied words from localStorage
        const storageKey = `gre_studied_words_${user.uid}`;
        const storedIds = localStorage.getItem(storageKey);
        if (storedIds) {
          setStudiedWords(new Set(JSON.parse(storedIds)));
        }

        // 2. Load all words from Firebase
        const q = query(
          collection(db, "gre_words"),
          where("userId", "==", user.uid)
        );
        const querySnapshot = await getDocs(q);
        const wordsData: Word[] = querySnapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as Word)
        );
        wordsData.sort((a, b) => a.word.localeCompare(b.word));
        setAllWords(wordsData);
      } catch (e) {
        console.error("Error loading data:", e);
        setError("Failed to load study data. Please refresh the page.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  // Update available words whenever the full list or studied list changes
  useEffect(() => {
    if (settings.uniqueWordsMode) {
      const remaining = allWords.filter((word) => !studiedWords.has(word.id));
      setAvailableWords(remaining);
    } else {
      setAvailableWords(allWords);
    }
  }, [allWords, studiedWords, settings.uniqueWordsMode]);

  // Save studied words to localStorage whenever the set changes
  useEffect(() => {
    if (!user || loading) return;
    const storageKey = `gre_studied_words_${user.uid}`;
    localStorage.setItem(storageKey, JSON.stringify(Array.from(studiedWords)));
  }, [studiedWords, user, loading]);

  // Timer effect
  useEffect(() => {
    if (!session.isActive || session.isPaused) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (settings.autoAdvance) handleNextWord();
          return settings.timePerWord;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [session.isActive, session.isPaused, settings.autoAdvance]);

  const shuffleArray = (array: Word[]): Word[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const startTimedSession = () => {
    if (availableWords.length === 0) {
      setError(
        settings.uniqueWordsMode
          ? "All words studied! Reset progress to study again."
          : "No words available."
      );
      return;
    }

    const wordPool = settings.shuffleWords
      ? shuffleArray(availableWords)
      : availableWords;
    const sessionWords = wordPool.slice(0, settings.wordsPerSession);

    setSession({
      ...initialSessionState,
      words: sessionWords,
      timePerWord: settings.timePerWord,
      isActive: true,
      sessionStartTime: Date.now(),
    });

    setTimeLeft(settings.timePerWord);
    setShowSettings(false);
    setError(null);
  };

  const handleNextWord = useCallback(() => {
    const currentWordId = session.words[session.currentIndex]?.id;

    if (settings.uniqueWordsMode && currentWordId) {
      setStudiedWords((prev) => {
        const newSet = new Set(prev);
        newSet.add(currentWordId);
        return newSet;
      });
    }

    setSession((prev) => {
      if (prev.currentIndex + 1 >= prev.words.length) {
        return {
          ...prev,
          isActive: false,
          wordsStudied: prev.wordsStudied + 1,
          totalTime: Math.floor((Date.now() - prev.sessionStartTime) / 1000),
        };
      }
      return {
        ...prev,
        currentIndex: prev.currentIndex + 1,
        wordsStudied: prev.wordsStudied + 1,
        showDefinition: true,
      };
    });
    setTimeLeft(settings.timePerWord);
  }, [
    session.words,
    session.currentIndex,
    settings.timePerWord,
    settings.uniqueWordsMode,
  ]);

  const returnToSettings = () => {
    setSession(initialSessionState);
    setShowSettings(true);
    setTimeLeft(0);
  };

  const resetStudiedWords = () => {
    if (!user) return;
    setStudiedWords(new Set());
    localStorage.removeItem(`gre_studied_words_${user.uid}`);
    alert("Your study progress has been reset.");
  };

  const currentWord = session.words[session.currentIndex];
  const isSessionComplete = !session.isActive && session.wordsStudied > 0;
  const getProgressPercentage = () =>
    session.words.length === 0
      ? 0
      : ((session.currentIndex + 1) / session.words.length) * 100;
  const formatTime = (seconds: number) =>
    `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")}`;

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
          <p>Loading Study Session...</p>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        <header className="glass border-b border-white/5 sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
            <Link href="/">
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white hover:bg-gray-800"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Back</span>
              </Button>
            </Link>
            {session.isActive && (
              <div className="flex items-center space-x-4">
                <p className="text-lg sm:text-2xl font-bold text-blue-400">
                  {formatTime(timeLeft)}
                </p>
                <p className="text-sm sm:text-lg font-semibold">
                  {session.currentIndex + 1}/{session.words.length}
                </p>
              </div>
            )}
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {showSettings && (
            <div className="space-y-8">
              <div className="text-center">
                <Clock className="h-12 w-12 text-blue-400 mx-auto mb-4" />
                <h1 className="text-3xl font-bold gradient-text">
                  Study Session
                </h1>
                <p className="text-gray-400 mt-2">
                  Configure your settings and start learning.
                </p>
              </div>
              <Card className="glass border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Settings className="h-5 w-5 mr-2" />
                    Session Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Words per Session
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[10, 25, 50, 100].map((num) => (
                        <Button
                          key={num}
                          variant={
                            settings.wordsPerSession === num
                              ? "default"
                              : "outline"
                          }
                          onClick={() =>
                            setSettings((p) => ({ ...p, wordsPerSession: num }))
                          }
                        >
                          {num}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Time per Word (seconds)
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[15, 30, 45, 60].map((time) => (
                        <Button
                          key={time}
                          variant={
                            settings.timePerWord === time
                              ? "default"
                              : "outline"
                          }
                          onClick={() =>
                            setSettings((p) => ({ ...p, timePerWord: time }))
                          }
                        >
                          {time}s
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-3">
                    <Button
                      variant={settings.autoAdvance ? "default" : "outline"}
                      onClick={() =>
                        setSettings((p) => ({
                          ...p,
                          autoAdvance: !p.autoAdvance,
                        }))
                      }
                      className="justify-start"
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      Auto Advance: {settings.autoAdvance ? "ON" : "OFF"}
                    </Button>
                    <Button
                      variant={settings.shuffleWords ? "default" : "outline"}
                      onClick={() =>
                        setSettings((p) => ({
                          ...p,
                          shuffleWords: !p.shuffleWords,
                        }))
                      }
                      className="justify-start"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Shuffle: {settings.shuffleWords ? "ON" : "OFF"}
                    </Button>
                    <Button
                      variant={settings.uniqueWordsMode ? "default" : "outline"}
                      onClick={() =>
                        setSettings((p) => ({
                          ...p,
                          uniqueWordsMode: !p.uniqueWordsMode,
                        }))
                      }
                      className="justify-start"
                    >
                      <Target className="h-4 w-4 mr-2" />
                      Unique Words: {settings.uniqueWordsMode ? "ON" : "OFF"}
                    </Button>
                  </div>
                  {settings.uniqueWordsMode && (
                    <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-orange-400">
                          Total Progress
                        </p>
                        <p className="text-sm text-orange-300">
                          {studiedWords.size} of {allWords.length} words
                          studied.
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={resetStudiedWords}
                        className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
                      >
                        Reset
                      </Button>
                    </div>
                  )}
                  <div className="pt-4 border-t border-gray-700">
                    <Button
                      onClick={startTimedSession}
                      disabled={availableWords.length === 0}
                      className="w-full bg-gradient-to-r from-green-600 to-blue-600"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      {availableWords.length === 0 && settings.uniqueWordsMode
                        ? "All Words Studied"
                        : `Start Session (${Math.min(
                            settings.wordsPerSession,
                            availableWords.length
                          )} words)`}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {session.isActive && currentWord && (
            <div className="space-y-6">
              <div className="w-full bg-gray-800 h-2 rounded-full">
                <div
                  className="bg-gradient-to-r from-green-500 to-blue-600 h-2 rounded-full"
                  style={{ width: `${getProgressPercentage()}%` }}
                ></div>
              </div>
              <Card className="glass border-gray-700">
                <CardContent className="p-8 text-center">
                  <h2 className="text-4xl font-bold mb-4 gradient-text">
                    {currentWord.word}
                  </h2>
                  <p className="text-lg text-gray-300 leading-relaxed">
                    {session.showDefinition && currentWord.definition}
                  </p>
                </CardContent>
              </Card>
              <div className="flex gap-4 justify-center">
                <Button
                  onClick={() =>
                    setSession((p) => ({
                      ...p,
                      showDefinition: !p.showDefinition,
                    }))
                  }
                  variant="outline"
                >
                  {session.showDefinition ? <EyeOff /> : <Eye />}
                </Button>
                <Button
                  onClick={() =>
                    setSession((p) => ({ ...p, isPaused: !p.isPaused }))
                  }
                  variant="outline"
                >
                  {session.isPaused ? <Play /> : <Pause />}
                </Button>
                <Button
                  onClick={handleNextWord}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <SkipForward />
                </Button>
              </div>
            </div>
          )}

          {isSessionComplete && (
            <div className="text-center space-y-6">
              <CheckCircle className="h-20 w-20 text-green-500 mx-auto" />
              <h2 className="text-3xl font-bold gradient-text">
                Session Complete!
              </h2>
              <Card className="glass border-gray-700 max-w-md mx-auto">
                <CardContent className="p-6 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-2xl font-bold text-green-400">
                      {session.wordsStudied}
                    </p>
                    <p className="text-xs text-gray-400">Words Studied</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-400">
                      {formatTime(session.totalTime)}
                    </p>
                    <p className="text-xs text-gray-400">Total Time</p>
                  </div>
                </CardContent>
              </Card>
              <div className="flex gap-4 justify-center">
                <Button
                  onClick={returnToSettings}
                  className="bg-gradient-to-r from-green-600 to-blue-600"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  New Session
                </Button>
                <Link href="/">
                  <Button variant="outline">
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
