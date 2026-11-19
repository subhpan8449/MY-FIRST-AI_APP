import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  increment
} from 'firebase/firestore';
import { db } from '../firebase';
import { GroundingSource, SupportConversation, SupportMessage, SupportTopic, UserProfile } from '../types';
import { sanitizeForFirestore } from './db';
import { getLiveHomestayContextSnapshot, getGuestContextSnapshot } from './aiContextService';

export const MessagingService = {
  // Find or create customer support conversation (single-field query avoids missing composite index errors)
  async getOrCreateConversation(
    user: { uid: string; fullName: string; email: string; phone?: string },
    topic: SupportTopic,
    bookingReference?: string,
    roomNumber?: string
  ): Promise<string> {
    try {
      const q = query(
        collection(db, 'conversations'),
        where('customerId', '==', user.uid)
      );
      const snap = await getDocs(q);

      const activeDocs = snap.docs
        .filter((d) => {
          const st = d.data()?.status;
          return st === 'unread' || st === 'pending';
        })
        .sort((a, b) => {
          const ta = new Date(a.data()?.lastMessageAt || a.data()?.createdAt || 0).getTime();
          const tb = new Date(b.data()?.lastMessageAt || b.data()?.createdAt || 0).getTime();
          return tb - ta;
        });

      if (activeDocs.length > 0) {
        const existingDoc = activeDocs[0];
        if (topic && topic !== existingDoc.data().topic) {
          await updateDoc(existingDoc.ref, { topic, updatedAt: new Date().toISOString() }).catch(() => {});
        }
        return existingDoc.id;
      }

      // Create new conversation
      const convRef = doc(collection(db, 'conversations'));
      const nowIso = new Date().toISOString();
      const newConv: Omit<SupportConversation, 'id'> = {
        customerId: user.uid,
        customerName: user.fullName || 'Guest',
        customerEmail: user.email || '',
        customerPhone: user.phone || '',
        topic: topic || 'General Query',
        status: 'unread',
        priority: 'normal',
        bookingReference: bookingReference || '',
        roomNumber: roomNumber || '',
        lastMessage: 'Conversation started',
        lastMessageAt: nowIso,
        unreadCountAdmin: 0,
        unreadCountCustomer: 0,
        createdAt: nowIso,
        updatedAt: nowIso
      };

      await setDoc(convRef, sanitizeForFirestore(newConv));
      return convRef.id;
    } catch (err) {
      console.error('getOrCreateConversation error:', err);
      throw err;
    }
  },

  // Update topic in-place without re-creating or re-subscribing to the conversation
  async updateConversationTopic(conversationId: string, topic: SupportTopic): Promise<void> {
    try {
      await updateDoc(doc(db, 'conversations', conversationId), {
        topic,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.warn('updateConversationTopic notice:', err);
    }
  },

  // Send message in conversation
  async sendMessage(
    conversationId: string,
    sender: { id: string; name: string; role: 'guest' | 'admin' | 'system' },
    text: string,
    options?: {
      suggestedByAI?: boolean;
      sources?: GroundingSource[];
      isAutoReply?: boolean;
    }
  ): Promise<string> {
    try {
      const messagesRef = collection(db, 'conversations', conversationId, 'messages');
      const nowIso = new Date().toISOString();

      const newMsg: Record<string, any> = {
        conversationId,
        senderId: sender.id,
        senderName: sender.name,
        senderRole: sender.role,
        text: text.trim(),
        timestamp: nowIso,
        isRead: false
      };

      if (options?.suggestedByAI) {
        newMsg.suggestedByAI = true;
      }
      if (options?.sources && options.sources.length > 0) {
        newMsg.sources = options.sources;
      }

      const docRef = await addDoc(messagesRef, sanitizeForFirestore(newMsg));

      // Update parent conversation summary
      const convRef = doc(db, 'conversations', conversationId);
      const updates: Record<string, any> = {
        lastMessage: text.trim(),
        lastMessageAt: nowIso,
        updatedAt: nowIso
      };

      if (sender.role === 'guest') {
        updates.status = 'unread';
        updates.unreadCountAdmin = increment(1);
      } else {
        updates.status = 'pending';
        if (!options?.isAutoReply) {
          updates.unreadCountCustomer = increment(1);
        }
      }

      await updateDoc(convRef, updates);
      return docRef.id;
    } catch (err) {
      console.error('sendMessage error:', err);
      throw err;
    }
  },

  // Automatic Smart Host Desk reply when a guest messages Admin
  async triggerAdminAutoReply(params: {
    conversationId: string;
    topic: SupportTopic;
    customerName: string;
    lastMessage: string;
    history: SupportMessage[];
    userId?: string | null;
    userProfile?: UserProfile | null;
    bookingReference?: string;
    roomNumber?: string;
    activeThemeName?: string;
  }): Promise<{ reply: string | null; engine?: string; aiNotice?: string | null }> {
    try {
      const [homestayContext, guestContext] = await Promise.all([
        getLiveHomestayContextSnapshot(params.activeThemeName),
        getGuestContextSnapshot(
          params.userId,
          params.userProfile,
          params.bookingReference,
          params.roomNumber
        )
      ]);

      const res = await fetch('/api/ai/admin-auto-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: params.topic,
          customerName: params.customerName,
          lastMessage: params.lastMessage,
          bookingReference: params.bookingReference,
          roomNumber: params.roomNumber,
          history: params.history.slice(-10).map(m => ({
            senderRole: m.senderRole,
            text: m.text
          })),
          homestayContext,
          guestContext
        })
      });

      const data = await res.json().catch(() => ({}));
      const replyText = String(data?.reply || '').trim();
      if (!replyText) {
        return { reply: null, aiNotice: data?.error || 'Auto-reply temporarily unavailable.' };
      }

      await this.sendMessage(
        params.conversationId,
        {
          id: 'devashish-smart-host',
          name: data?.senderName || 'Subhashish Pandey · Host Desk',
          role: 'admin'
        },
        replyText,
        {
          suggestedByAI: true,
          sources: Array.isArray(data?.sources) ? data.sources : [],
          isAutoReply: true
        }
      );

      return {
        reply: replyText,
        engine: data?.engine || 'gemini',
        aiNotice: data?.aiNotice || null
      };
    } catch (err: any) {
      console.error('triggerAdminAutoReply error:', err);
      return { reply: null, aiNotice: err?.message || 'Could not deliver instant desk reply.' };
    }
  },

  // Subscribe to real-time messages in a conversation (with error callback so UI never hangs)
  subscribeMessages(
    conversationId: string,
    callback: (messages: SupportMessage[]) => void,
    onError?: (err: Error) => void
  ) {
    const q = query(
      collection(db, 'conversations', conversationId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const msgs = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<SupportMessage, 'id'>)
        }));
        callback(msgs);
      },
      (err) => {
        console.warn('subscribeMessages listener error:', err);
        if (onError) onError(err);
        callback([]);
      }
    );
  },

  // Subscribe to a specific conversation document
  subscribeConversation(
    conversationId: string,
    callback: (conv: SupportConversation | null) => void,
    onError?: (err: Error) => void
  ) {
    const ref = doc(db, 'conversations', conversationId);
    return onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          callback({ id: snap.id, ...(snap.data() as Omit<SupportConversation, 'id'>) });
        } else {
          callback(null);
        }
      },
      (err) => {
        console.warn('subscribeConversation listener error:', err);
        if (onError) onError(err);
      }
    );
  },

  // Admin: Subscribe to all conversations
  subscribeAllConversations(
    callback: (conversations: SupportConversation[]) => void,
    onError?: (err: Error) => void
  ) {
    const q = query(
      collection(db, 'conversations'),
      orderBy('lastMessageAt', 'desc')
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const convs = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<SupportConversation, 'id'>)
        }));
        callback(convs);
      },
      (err) => {
        console.warn('subscribeAllConversations listener error:', err);
        if (onError) onError(err);
        callback([]);
      }
    );
  },

  // Admin: Update status (clean without undefined fields)
  async updateStatus(conversationId: string, status: 'unread' | 'pending' | 'resolved') {
    const ref = doc(db, 'conversations', conversationId);
    const updates: Record<string, any> = {
      status,
      updatedAt: new Date().toISOString()
    };
    if (status === 'resolved') {
      updates.unreadCountAdmin = 0;
    }
    await updateDoc(ref, updates);
  },

  // Admin: Mark read for admin
  async markReadByAdmin(conversationId: string) {
    const ref = doc(db, 'conversations', conversationId);
    await updateDoc(ref, {
      unreadCountAdmin: 0
    });
  },

  // Customer: Mark read for customer
  async markReadByCustomer(conversationId: string) {
    const ref = doc(db, 'conversations', conversationId);
    await updateDoc(ref, {
      unreadCountCustomer: 0
    });
  },

  // Admin: Assign staff
  async assignStaff(conversationId: string, staffId: string, staffName: string) {
    const ref = doc(db, 'conversations', conversationId);
    await updateDoc(ref, {
      assignedStaffId: staffId,
      assignedStaffName: staffName,
      updatedAt: new Date().toISOString()
    });
  },

  // Admin: Update internal notes
  async updateInternalNotes(conversationId: string, notes: string) {
    const ref = doc(db, 'conversations', conversationId);
    await updateDoc(ref, {
      internalNotes: notes,
      updatedAt: new Date().toISOString()
    });
  },

  // AI draft request to server endpoint (uses live homestay + world data)
  async fetchAIDraftReply(params: {
    topic: string;
    customerName: string;
    lastMessage: string;
    bookingReference?: string;
    roomNumber?: string;
    history?: SupportMessage[];
  }): Promise<string> {
    try {
      const homestayContext = await getLiveHomestayContextSnapshot();
      const res = await fetch('/api/ai/suggest-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...params,
          history: (params.history || []).slice(-10).map(m => ({
            senderRole: m.senderRole,
            text: m.text
          })),
          homestayContext
        })
      });
      const data = await res.json();
      return data.suggestedDraft || '';
    } catch (err) {
      console.warn('AI draft fetch failed:', err);
      return '';
    }
  }
};
