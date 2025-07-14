"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BookOpen,
  Search,
  Plus,
  LogOut,
  Trash2,
  Upload,
  Brain,
  Grid,
  List,
  Clock,
  ArrowUpDown,
  PlusCircle,
  Wind,
} from "lucide-react";
import Link from "next/link";
import {
  collection,
  query,
  onSnapshot,
  deleteDoc,
  doc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { formatDistanceToNow, startOfToday } from "date-fns";

// The data structure for words in your Firestore
interface Word {
  id: string;
  word: string;
  definition: string;
  createdAt: any; // Firebase Timestamp
  userId: string;
}

type SortOrder = "newest" | "oldest" | "alphabetical";

export default function HomePage() {
  const [words, setWords] = useState<Word[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const { user, signOut } = useAuth();

  // Effect to fetch words from Firestore
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "gre_words"),
      where("userId", "==", user.uid)
    );
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const wordsData: Word[] = [];
        querySnapshot.forEach((doc) => {
          wordsData.push({ id: doc.id, ...doc.data() } as Word);
        });
        setWords(wordsData);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching words:", err);
        setError("Failed to load vocabulary. Please refresh the page.");
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [user]);

  // Calculate the simplified dashboard stats
  const stats = useMemo(() => {
    if (words.length === 0) {
      return {
        totalWords: 0,
        wordsAddedToday: 0,
        lastAddition: "Never",
      };
    }

    const todayStart = startOfToday();
    const wordsAddedToday = words.filter(
      (word) => word.createdAt?.toDate() >= todayStart
    ).length;

    const sortedByNewest = [...words].sort(
      (a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0)
    );
    const lastAddition = formatDistanceToNow(
      sortedByNewest[0].createdAt.toDate(),
      { addSuffix: true }
    );

    return {
      totalWords: words.length,
      wordsAddedToday,
      lastAddition,
    };
  }, [words]);

  // Memoized logic for filtering and sorting the main word list
  const sortedAndFilteredWords = useMemo(() => {
    let processedWords = words.filter(
      (word) =>
        word.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
        word.definition.toLowerCase().includes(searchTerm.toLowerCase())
    );
    switch (sortOrder) {
      case "newest":
        processedWords.sort(
          (a, b) =>
            (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0)
        );
        break;
      case "oldest":
        processedWords.sort(
          (a, b) =>
            (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0)
        );
        break;
      case "alphabetical":
        processedWords.sort((a, b) => a.word.localeCompare(b.word));
        break;
    }
    return processedWords;
  }, [words, searchTerm, sortOrder]);

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "gre_words", id));
    } catch (err) {
      console.error("Error deleting word:", err);
      setError("Failed to delete word.");
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error("Error signing out:", err);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        <header className="sticky top-0 z-50 glass border-b border-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Brain className="h-4 w-4 text-white" />
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-lg font-semibold">VOCAB BUILDER</h1>
                  <p className="text-xs text-gray-400">
                    {user?.email?.split("@")[0]}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Link href="/study">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-gray-700 text-gray-300 hover:bg-gray-800"
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Study
                  </Button>
                </Link>
                <Link href="/add">
                  <Button
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </Link>
                <Link href="/upload">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-gray-700 text-gray-300 hover:bg-gray-800"
                  >
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
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm animate-fade-in">
              {error}
            </div>
          )}

          {/* Simplified Stats Dashboard */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <StatCard
              icon={<BookOpen className="text-blue-400 w-5 h-5" />}
              title="Total Words"
              value={stats.totalWords}
            />
            <StatCard
              icon={<PlusCircle className="text-green-400 w-5 h-5" />}
              title="Words Added Today"
              value={stats.wordsAddedToday}
            />
            <StatCard
              icon={<Wind className="text-cyan-400 w-5 h-5" />}
              title="Last Addition"
              value={stats.lastAddition}
            />
          </div>

          {/* Controls: Search, Sort, and ViewMode */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
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
                    {sortedAndFilteredWords.length}
                  </Badge>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto border-gray-700 text-gray-300 hover:bg-gray-800"
                  >
                    <ArrowUpDown className="h-4 w-4 mr-2" />
                    Sort By
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="bg-gray-900 border-gray-700 text-white"
                >
                  <DropdownMenuRadioGroup
                    value={sortOrder}
                    onValueChange={(value) => setSortOrder(value as SortOrder)}
                  >
                    <DropdownMenuRadioItem value="newest">
                      Newest First
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="oldest">
                      Oldest First
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="alphabetical">
                      Alphabetical (A-Z)
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="inline-flex items-center p-1 rounded-lg bg-gray-900/50 border border-gray-700">
                {(["grid", "list"] as const).map((mode) => (
                  <button
                    key={mode}
                    aria-pressed={viewMode === mode}
                    onClick={() => setViewMode(mode)}
                    className={`flex items-center p-2 rounded-md text-sm transition-colors ${
                      viewMode === mode
                        ? "bg-blue-600 text-white shadow"
                        : "text-gray-300 hover:bg-gray-800"
                    }`}
                  >
                    {mode === "grid" ? (
                      <Grid className="h-4 w-4" />
                    ) : (
                      <List className="h-4 w-4" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">My Vocabulary</h2>
            <span className="text-sm text-gray-400">
              Showing {sortedAndFilteredWords.length} of {words.length} words
            </span>
          </div>

          {/* Word List */}
          {loading ? (
            <div className="text-center py-20 text-gray-500">
              Loading vocabulary...
            </div>
          ) : (
            <div
              className={`${
                viewMode === "grid"
                  ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
                  : "space-y-3"
              }`}
            >
              {sortedAndFilteredWords.map((word, index) => (
                <div
                  key={word.id}
                  className={`group glass hover:bg-white/5 transition-all duration-200 animate-fade-in ${
                    viewMode === "grid"
                      ? "p-6 rounded-lg"
                      : "p-4 rounded-lg flex items-center justify-between"
                  }`}
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  {viewMode === "grid" ? (
                    <>
                      <div className="flex items-start justify-between mb-4">
                        <h3 className="flex-1 text-lg font-semibold group-hover:text-blue-400 transition-colors">
                          {word.word}
                        </h3>
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
                        <span className="text-gray-500">
                          {word.createdAt?.toDate?.()?.toLocaleDateString() ||
                            "Recent"}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex-1">
                        <h3 className="font-semibold group-hover:text-blue-400 transition-colors">
                          {word.word}
                        </h3>
                        <p className="text-gray-400 text-sm line-clamp-1">
                          {word.definition}
                        </p>
                      </div>
                      <span className="text-gray-500 text-sm hidden sm:block mx-4">
                        {word.createdAt?.toDate?.()?.toLocaleDateString() ||
                          "Recent"}
                      </span>
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

// Reusable StatCard component
function StatCard({
  icon,
  title,
  value,
}: {
  icon: React.ReactNode;
  title: string;
  value: React.ReactNode;
}) {
  return (
    <div className="glass p-5 rounded-xl shadow-sm hover:shadow-md transition">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {icon}
          <h4 className="text-sm text-gray-400 font-semibold">{title}</h4>
        </div>
      </div>
      <p className="text-2xl font-bold text-white truncate">{value}</p>
    </div>
  );
}
