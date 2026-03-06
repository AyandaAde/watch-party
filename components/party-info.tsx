'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface PartyMember {
  id: string;
  username: string;
  isActive: boolean;
}

interface WatchParty {
  id: string;
  name: string;
  currentMovieId: string | null;
  currentTime: number;
  isPlaying: boolean;
  members: PartyMember[];
}

interface PartyInfoProps {
  party: WatchParty;
}

export default function PartyInfo({ party }: PartyInfoProps) {
  const [copied, setCopied] = useState(false);

  const copyPartyId = async () => {
    try {
      await navigator.clipboard.writeText(party.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = party.id;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  useEffect(() => {
    if (copied) toast.success("Copied", {
      description: "Party ID successfully copied to clipboard"
    });
  }, [copied])



  return (
    <div className="space-y-4">
      {/* Party Details */}
      <Card className="p-4 bg-card border border-border">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Users className="w-4 h-4" />
          Party Details
        </h3>

        <div className="space-y-3 text-sm">
          <div>
            <p className="text-muted-foreground mb-1">Party Name</p>
            <p className="font-medium">{party.name}</p>
          </div>

          <div>
            <p className="text-muted-foreground mb-1">Party ID</p>
            <p className="font-mono text-xs bg-background p-2 rounded break-all">{party.id}</p>
          </div>

          <div>
            <p className="text-muted-foreground mb-1">Status</p>
            <p className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${party.isPlaying ? 'bg-primary' : 'bg-muted'}`} />
              {party.isPlaying ? 'Playing' : 'Paused'}
            </p>
          </div>
        </div>
      </Card>

      {/* Members */}
      <Card className="p-4 bg-card border border-border">
        <h3 className="font-semibold mb-4">
          Members ({party.members.filter((m) => m.isActive).length})
        </h3>

        <div className="space-y-2">
          {party.members.filter((m) => m.isActive).length > 0 ? (
            party.members
              .filter((m) => m.isActive)
              .map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-2 p-2 rounded bg-background"
                >
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  <span className="text-sm font-medium">{member.username}</span>
                </div>
              ))
          ) : (
            <p className="text-sm text-muted-foreground">No members in party</p>
          )}
        </div>
      </Card>

      {/* Instructions */}
      <Card className="p-4 bg-background border border-border">
        <h3 className="font-semibold mb-3 text-sm">How to Share</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Share your party ID with friends so they can join your watch party.
        </p>

        <div className="flex items-center gap-2">
          <div className="p-2 bg-card rounded text-xs font-mono text-foreground break-all flex-1">
            {party.id}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={copyPartyId}
            className="h-8 w-8 p-0"
            title="Copy Party ID"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
