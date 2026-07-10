import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { MessageCircle, X, Send, Minus } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';

const DRAFT_KEY = 'support_chat_draft';

interface SupportMsg {
  id: string;
  content: string;
  is_admin: boolean;
  sender_id: string;
  created_at: string;
}

const SupportChatWidget = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMsg[]>([]);
  const [text, setText] = useState('');
  const [unread, setUnread] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Hide on admin/auth
  const hide = location.pathname.startsWith('/admin') || location.pathname.startsWith('/auth');

  // Restore draft after login and auto-send it
  useEffect(() => {
    if (!user) return;
    const draft = localStorage.getItem(DRAFT_KEY);
    if (draft) {
      setText(draft);
      setOpen(true);
      toast.success('Welcome back! Your draft message was restored.');
    }
  }, [user]);

  // Load / create conversation for logged-in user
  useEffect(() => {
    if (!user) { setConversationId(null); setMessages([]); return; }
    (async () => {
      let { data: convo } = await supabase.from('support_conversations').select('*').eq('user_id', user.id).maybeSingle();
      if (!convo) {
        const { data: created } = await supabase.from('support_conversations').insert({ user_id: user.id }).select().maybeSingle();
        convo = created;
      }
      if (convo) {
        setConversationId(convo.id);
        setUnread(convo.user_unread_count || 0);
        const { data: msgs } = await supabase.from('support_messages').select('*').eq('conversation_id', convo.id).order('created_at');
        setMessages((msgs as unknown as SupportMsg[]) || []);
      }
    })();
  }, [user]);

  // Realtime
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`support-${conversationId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `conversation_id=eq.${conversationId}` }, (payload) => {
        const m = payload.new as SupportMsg;
        setMessages(prev => prev.some(x => x.id === m.id) ? prev : [...prev, m]);
        if (m.is_admin && (!open || minimized)) setUnread(u => u + 1);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId, open, minimized]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open]);

  useEffect(() => {
    if (open && !minimized && user && conversationId && unread > 0) {
      supabase.from('support_conversations').update({ user_unread_count: 0 }).eq('id', conversationId).then(() => setUnread(0));
    }
  }, [open, minimized, unread, conversationId, user]);

  const saveDraftAndSignup = () => {
    const content = text.trim();
    if (content) {
      localStorage.setItem(DRAFT_KEY, content);
      toast.info("We've saved your message. Create an account to send it.");
    }
    navigate('/auth');
  };

  const send = async () => {
    const content = text.trim();
    if (!content) return;
    if (!user) { saveDraftAndSignup(); return; }
    if (!conversationId) return;
    const { error } = await supabase.from('support_messages').insert({
      conversation_id: conversationId, sender_id: user.id, is_admin: false, content,
    });
    if (error) { toast.error(error.message); return; }
    await supabase.from('support_conversations').update({
      last_message: content, last_message_at: new Date().toISOString(),
      admin_unread_count: (await supabase.from('support_conversations').select('admin_unread_count').eq('id', conversationId).maybeSingle()).data?.admin_unread_count! + 1 || 1,
    }).eq('id', conversationId);
    setText('');
    localStorage.removeItem(DRAFT_KEY);
  };

  if (hide) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!open ? (
        <Button onClick={() => setOpen(true)} size="lg" className="rounded-full h-14 w-14 shadow-lg relative">
          <MessageCircle className="w-6 h-6" />
          {unread > 0 && <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center">{unread}</span>}
        </Button>
      ) : (
        <Card className={`w-[350px] max-w-[calc(100vw-2rem)] flex flex-col shadow-2xl ${minimized ? 'h-14' : 'h-[500px] max-h-[calc(100vh-2rem)]'}`}>
          <div className="flex items-center justify-between p-3 border-b bg-primary/10 rounded-t-lg">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="font-semibold text-sm">Support</span>
            </div>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setMinimized(m => !m)}><Minus size={14} /></Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setOpen(false)}><X size={14} /></Button>
            </div>
          </div>
          {!minimized && (
            <>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 text-sm">
                {messages.length === 0 && (
                  <div className="bg-muted rounded-lg p-3 text-muted-foreground">
                    <p className="font-semibold text-foreground mb-1">Need help?</p>
                    <p>Want to play? Want to build? Want to advertise or promote your server?</p>
                    <p className="mt-2">Send us your questions—we're here to help!</p>
                  </div>
                )}
                {messages.map(m => (
                  <div key={m.id} className={`flex ${m.is_admin ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[80%] px-3 py-2 rounded-2xl ${m.is_admin ? 'bg-muted' : 'bg-primary text-primary-foreground'}`}>
                      <p className="whitespace-pre-wrap break-words">{m.content}</p>
                      <p className={`text-[10px] mt-1 ${m.is_admin ? 'text-muted-foreground' : 'text-primary-foreground/70'}`}>{format(new Date(m.created_at), 'HH:mm')}</p>
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={(e) => { e.preventDefault(); send(); }} className="p-2 border-t flex gap-2">
                <Input value={text} onChange={e => setText(e.target.value)} placeholder={user ? 'Type a message...' : 'Sign in to send messages'} className="text-sm" />
                <Button type="submit" size="icon" disabled={!user || !text.trim()} title={!user ? 'Sign in to send' : 'Send'}>
                  <Send size={16} />
                </Button>
              </form>
              {!user && <p className="text-[10px] text-muted-foreground px-3 pb-2">Please <button className="underline" onClick={() => navigate('/auth')}>sign in</button> to send messages.</p>}
            </>
          )}
        </Card>
      )}
    </div>
  );
};

export default SupportChatWidget;
