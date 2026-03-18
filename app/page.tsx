'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { Play, Users, Zap } from 'lucide-react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import { useMutation } from '@tanstack/react-query';
import Image from 'next/image';

const createSchema = z.object({
  username: z.string().min(1),
  name: z.string().min(1),
});

const joinSchema = z.object({
  username: z.string().min(1),
  partyCode: z.string().min(1),
});

type CreateSchema = z.infer<typeof createSchema>;
type JoinSchema = z.infer<typeof joinSchema>;

export default function Home() {
  const router = useRouter();
  const [mode, setMode] = useState<'home' | 'create' | 'join'>('home');
  const [loading, setLoading] = useState(false);


  const generateUserId = () => `user_${Math.random().toString(36).slice(2, 9)}`;

  const createParty = useMutation({
    mutationFn: async (data: CreateSchema) => {
      const { data: responseData } = await axios.post('/api/parties', {
        ...data,
        createdBy: generateUserId(),
      });
      return responseData;
    },
  });
  const joinParty = useMutation({
    mutationFn: async (data: JoinSchema) => {
      const { data: responseData } = await axios.post(`/api/parties/${data.partyCode}/join`, {
        ...data,
        userId: generateUserId(),
      });
      return responseData;
    },
  });

  const createForm = useForm<CreateSchema>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      username: '',
      name: '',
    },
  });

  const joinForm = useForm<JoinSchema>({
    resolver: zodResolver(joinSchema),
    defaultValues: {
      username: '',
      partyCode: '',
    },
  });

  const handleCreateParty = async (data: CreateSchema) => {
    setLoading(true);
    await createParty.mutateAsync(data, {
      onSuccess: (data) => {
        sessionStorage.setItem('userId', data.createdBy);
        sessionStorage.setItem('username', data.username);
        router.push(`/party/${data.id}`);
      },
      onError: (error) => {
        console.error('Error creating party:', error);
        const message = error instanceof Error ? error.message : 'Failed to create party. Please try again.';
        alert(message);
      },
    });
  };

  const handleJoinParty = async (data: JoinSchema) => {
    await joinParty.mutateAsync(data, {
      onSuccess: (data) => {
        sessionStorage.setItem('userId', data.username);
        sessionStorage.setItem('username', data.username);
        router.push(`/party/${data.id}`);
      },
      onError: (error) => {
        console.error('Error joining party:', error);
        const message = error instanceof Error ? error.message : 'Failed to join party. Please try again.';
        alert(message);
      },
    });
  };



  return (
    <div className="relative min-h-screen bg-background text-foreground flex flex-col overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/backdrop.PNG')" }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-black/35" aria-hidden="true" />
      <Image
        src="/logo.PNG"
        width={100}
        height={100}
        alt="WatchParty logo"
        className="absolute top-6 left-6 z-20 h-12 w-auto"
      />

      {/* Hero Section */}
      {mode === 'home' && (
        <>
          <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-20">
            <div className="max-w-4xl w-full">
              <div className="text-center mb-16">
                <h1 className="text-5xl md:text-7xl font-bold mb-6 text-balance">
                  Watch Together, Stay Connected
                </h1>
                <p className="text-xl text-muted-foreground mb-8 text-balance max-w-2xl mx-auto">
                  Stream movies in real-time with friends. When you play, pause, or skip—everyone experiences it together
                  just like a real watch party.
                </p>
              </div>

              {/* Feature Cards */}
              <div className="grid md:grid-cols-3 gap-6 mb-16">
                <Card className="p-6 bg-card border border-border hover:border-primary transition-colors">
                  <Play className="w-8 h-8 text-primary mb-4" />
                  <h3 className="font-semibold mb-2 text-lg">Synchronized Playback</h3>
                  <p className="text-sm text-muted-foreground">
                    Play, pause, and skip together. All playback is synchronized in real-time.
                  </p>
                </Card>
                <Card className="p-6 bg-card border border-border hover:border-primary transition-colors">
                  <Users className="w-8 h-8 text-primary mb-4" />
                  <h3 className="font-semibold mb-2 text-lg">Invite Friends</h3>
                  <p className="text-sm text-muted-foreground">
                    Create a party and share the code with friends. Watch together instantly.
                  </p>
                </Card>
                <Card className="p-6 bg-card border border-border hover:border-primary transition-colors">
                  <Zap className="w-8 h-8 text-primary mb-4" />
                  <h3 className="font-semibold mb-2 text-lg">Instant Setup</h3>
                  <p className="text-sm text-muted-foreground">
                    No accounts needed. Create a party and start watching in seconds.
                  </p>
                </Card>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  className="px-8"
                  onClick={() => setMode('create')}
                >
                  Create Party
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="px-8"
                  onClick={() => setMode('join')}
                >
                  Join Party
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Create Party Mode */}
      {mode === 'create' && (
        <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-20">
          <Card className="w-full max-w-md p-8 bg-card border border-border">
            <h2 className="text-3xl font-bold mb-2">Create Party</h2>
            <p className="text-muted-foreground mb-8">Start watching with friends</p>

            <form onSubmit={createForm.handleSubmit(handleCreateParty)} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Your Name</label>
                <Input
                  placeholder="Enter your name"
                  {...createForm.register('username')}
                  className="bg-background border-border"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Party Name</label>
                <Input
                  placeholder="e.g., Movie Night"
                  {...createForm.register('name')}
                  className="bg-background border-border"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setMode('home');
                    createForm.reset();
                  }}
                >
                  Back
                </Button>
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? 'Creating...' : 'Create'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Join Party Mode */}
      {mode === 'join' && (
        <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-20">
          <Card className="w-full max-w-md p-8 bg-card border border-border">
            <h2 className="text-3xl font-bold mb-2">Join Party</h2>
            <p className="text-muted-foreground mb-8">Join an existing watch party</p>

            <form onSubmit={joinForm.handleSubmit(handleJoinParty)} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Your Name</label>
                <Input
                  placeholder="Enter your name"
                  {...joinForm.register('username')}
                  className="bg-background border-border"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Party Code</label>
                <Input
                  placeholder="Enter party code"
                  {...joinForm.register('partyCode')}
                  className="bg-background border-border font-mono"
                  maxLength={24}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setMode('home');
                    joinForm.reset();
                  }}
                >
                  Back
                </Button>
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? 'Joining...' : 'Join'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
