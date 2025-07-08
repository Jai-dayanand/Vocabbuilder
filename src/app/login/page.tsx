'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, Mail, Lock } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signIn, signUp } = useAuth();
  const router = useRouter();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await signIn(email, password);
      router.push('/');
    } catch (error) {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await signUp(email, password);
      router.push('/');
    } catch (error) {
      setError('Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white p-6">
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

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-12">
          <div className="w-12 h-12 bg-white rounded-sm mx-auto mb-6 flex items-center justify-center">
            <Brain className="h-6 w-6 text-black" />
          </div>
          <h1 className="text-3xl font-bold uppercase tracking-wider mb-4">
            GRE MASTERY
          </h1>
          <p className="text-white/60">
            Master your GRE vocabulary with precision
          </p>
        </div>

        <Card className="border-white/10 bg-white/5">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl text-white uppercase tracking-wider">WELCOME</CardTitle>
            <CardDescription className="text-white/60">
              Sign in to your account or create a new one
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-8 bg-white/10">
                <TabsTrigger 
                  value="signin" 
                  className="text-white/60 data-[state=active]:bg-white data-[state=active]:text-black uppercase tracking-wider text-sm"
                >
                  SIGN IN
                </TabsTrigger>
                <TabsTrigger 
                  value="signup"
                  className="text-white/60 data-[state=active]:bg-white data-[state=active]:text-black uppercase tracking-wider text-sm"
                >
                  SIGN UP
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-6">
                  <div className="space-y-3">
                    <Label htmlFor="email" className="text-sm font-medium text-white/80 uppercase tracking-wider">EMAIL</Label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-12 bg-white/5 border-white/10 text-white placeholder-white/40 focus:border-white/30 focus:bg-white/10"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <Label htmlFor="password" className="text-sm font-medium text-white/80 uppercase tracking-wider">PASSWORD</Label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-12 bg-white/5 border-white/10 text-white placeholder-white/40 focus:border-white/30 focus:bg-white/10"
                        required
                      />
                    </div>
                  </div>
                  
                  {error && (
                    <div className="p-4 border border-red-500/30 bg-red-500/10 text-red-400 text-sm">
                      {error}
                    </div>
                  )}
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-white text-black hover:bg-white/90 font-medium uppercase tracking-wider"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
                        SIGNING IN...
                      </>
                    ) : (
                      'SIGN IN'
                    )}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-6">
                  <div className="space-y-3">
                    <Label htmlFor="signup-email" className="text-sm font-medium text-white/80 uppercase tracking-wider">EMAIL</Label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-12 bg-white/5 border-white/10 text-white placeholder-white/40 focus:border-white/30 focus:bg-white/10"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <Label htmlFor="signup-password" className="text-sm font-medium text-white/80 uppercase tracking-wider">PASSWORD</Label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="Create a password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-12 bg-white/5 border-white/10 text-white placeholder-white/40 focus:border-white/30 focus:bg-white/10"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>
                  
                  {error && (
                    <div className="p-4 border border-red-500/30 bg-red-500/10 text-red-400 text-sm">
                      {error}
                    </div>
                  )}
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-white text-black hover:bg-white/90 font-medium uppercase tracking-wider"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
                        CREATING...
                      </>
                    ) : (
                      'CREATE ACCOUNT'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}