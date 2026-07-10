import { useEffect, useMemo, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, formatDistanceToNow } from 'date-fns';
import { Send, MessageCircle, Search, RefreshCw, Mail } from 'lucide-react';
import { toast } from 'sonner';

interface Convo {
  id: string;
  user_id: string;
  last_message: string | null;
  last_message_at: string | null;
  admin_unread_count: number;
  user_unread_count?: number;
  profile?: { display_name: string | null; avatar_url: string | null; email?: string | null } | null;
}

interface Msg {
  id: string;
  content: string;
  is_admin: boolean;
  sender_id: string;
  created_at: string;
  conversation_id: string;
}

type FilterMode = 'all' | 'unread' | 'today';

export const AdminSupportChat = () => {
  const { user } = useAuth();
  const [convos, setConvos] = useState<Convo[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterMode>('all');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadConvos = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('support_conversations')
      .select('*')
      .order('last_message_at', { ascending: false, nullsFirst: false });
    if (!data) { setLoading(false); return; }
    const ids = data.map((c) => c.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, display_name, avatar_url, email')
      .in('user_id', ids);
    const map = new Map(profiles?.map((p) => [p.user_id, p]) || []);
    setConvos(data.map((c) => ({ ...c, profile: map.get(c.user_id) || null })));
    setLoading(false);
  };

  useEffect(() => { loadConvos(); }, []);

  useEffect(() => {
    const ch = supabase.channel('admin-support-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_conversations' }, loadConvos)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages' }, () => {
        loadConvos();
        if (activeId) loadMessages(activeId);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [activeId]);

  const loadMessages = async (id: string) => {
    const { data } = await supabase.from('support_messages').select('*').eq('conversation_id', id).order('created_at');
    setMessages((data as unknown as Msg[]) || []);
    await supabase.from('support_conversations').update({ admin_unread_count: 0 }).eq('id', id);
  };

  const openConvo = (id: string) => { setActiveId(id); loadMessages(id); };

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }, [messages]);

  const send = async () => {
    if (!user || !activeId || !text.trim()) return;
    const content = text.trim();
    const { error } = await supabase.from('support_messages').insert({
      conversation_id: activeId, sender_id: user.id, is_admin: true, content,
    });
    if (error) { toast.error(error.message); return; }
    const convo = convos.find((c) => c.id === activeId);
    await supabase.from('support_conversations').update({
      last_message: content,
      last_message_at: new Date().toISOString(),
      user_unread_count: ((convo as any)?.user_unread_count || 0) + 1,
    }).eq('id', activeId);
    setText('');
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
    return convos.filter((c) => {
      if (filter === 'unread' && (c.admin_unread_count ?? 0) === 0) return false;
      if (filter === 'today' && (!c.last_message_at || new Date(c.last_message_at) < startOfToday)) return false;
      if (!q) return true;
      const name = c.profile?.display_name?.toLowerCase() ?? '';
      const email = (c.profile as any)?.email?.toLowerCase() ?? '';
      const last = c.last_message?.toLowerCase() ?? '';
      return name.includes(q) || email.includes(q) || last.includes(q) || c.user_id.includes(q);
    });
  }, [convos, query, filter]);

  const unreadTotal = convos.reduce((a, c) => a + (c.admin_unread_count ?? 0), 0);
  const active = convos.find((c) => c.id === activeId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[640px]">
      <Card className="flex flex-col">
        <div className="p-3 border-b space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle size={16} />
              <span className="font-semibold">Conversations</span>
              {unreadTotal > 0 && <Badge variant="destructive" className="h-5">{unreadTotal}</Badge>}
            </div>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={loadConvos} disabled={loading} title="Refresh">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </Button>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, email, message…"
              className="pl-7 h-8 text-sm"
            />
          </div>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterMode)}>
            <TabsList className="grid grid-cols-3 h-8">
              <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
              <TabsTrigger value="unread" className="text-xs">Unread</TabsTrigger>
              <TabsTrigger value="today" className="text-xs">Today</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <ScrollArea className="flex-1">
          {filtered.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">No conversations match.</p>
          )}
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => openConvo(c.id)}
              className={`w-full text-left p-3 border-b hover:bg-muted/50 ${activeId === c.id ? 'bg-primary/10' : ''}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-sm truncate">{c.profile?.display_name || 'User'}</span>
                {c.admin_unread_count > 0 && (
                  <Badge variant="destructive" className="text-[10px] h-5">{c.admin_unread_count}</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">{c.last_message || 'No messages'}</p>
              {c.last_message_at && (
                <p className="text-[10px] text-muted-foreground">
                  {formatDistanceToNow(new Date(c.last_message_at), { addSuffix: true })}
                </p>
              )}
            </button>
          ))}
        </ScrollArea>
      </Card>

      <Card className="lg:col-span-2 flex flex-col">
        {!activeId ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            Select a conversation
          </div>
        ) : (
          <>
            <div className="p-3 border-b flex items-center justify-between">
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{active?.profile?.display_name || 'User'}</p>
                {(active?.profile as any)?.email && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                    <Mail size={12} /> {(active?.profile as any).email}
                  </p>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground shrink-0">ID: {active?.user_id.slice(0, 8)}…</p>
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.is_admin ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] px-3 py-2 rounded-2xl text-sm ${m.is_admin ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                    <p className="whitespace-pre-wrap break-words">{m.content}</p>
                    <p className={`text-[10px] mt-1 ${m.is_admin ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                      {format(new Date(m.created_at), 'PPp')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); send(); }} className="p-2 border-t flex gap-2">
              <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Reply…" />
              <Button size="icon" type="submit" disabled={!text.trim()}><Send size={16} /></Button>
            </form>
          </>
        )}
      </Card>
    </div>
  );
};
