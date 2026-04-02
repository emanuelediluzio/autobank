// mobile/app/chat.tsx
import { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { aiChat } from '../services/api';
import { theme } from '../theme';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const SUGGESTIONS = [
  'Come posso risparmiare questo mese?',
  'Fai un report delle mie spese',
  'Dove sto spendendo troppo?',
  'Consigli per il mio budget',
];

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: 'Ciao! Sono il tuo assistente finanziario. Posso analizzare le tue spese, darti consigli personalizzati e aiutarti a risparmiare. Come posso aiutarti?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const { reply } = await aiChat(text.trim());
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: reply,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (e: any) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Errore: ${e.message}. Verifica che il server AI sia attivo.`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.aiBubble]}>
        {!isUser && (
          <View style={styles.aiAvatar}>
            <Ionicons name="sparkles" size={14} color={theme.colors.accent} />
          </View>
        )}
        <View style={[styles.messageContent, isUser ? styles.userContent : styles.aiContent]}>
          <Text style={[styles.messageText, isUser && styles.userText]}>{item.content}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListHeaderComponent={
            messages.length <= 1 ? (
              <View style={styles.suggestions}>
                <Text style={styles.suggestionsTitle}>Prova a chiedere:</Text>
                {SUGGESTIONS.map((s, i) => (
                  <TouchableOpacity key={i} style={styles.suggestionBtn} onPress={() => sendMessage(s)}>
                    <Text style={styles.suggestionText}>{s}</Text>
                    <Ionicons name="arrow-forward" size={14} color={theme.colors.accent} />
                  </TouchableOpacity>
                ))}
              </View>
            ) : null
          }
        />

        {loading && (
          <View style={styles.typingIndicator}>
            <ActivityIndicator size="small" color={theme.colors.accent} />
            <Text style={styles.typingText}>Sto analizzando...</Text>
          </View>
        )}

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Chiedi qualcosa..."
            placeholderTextColor={theme.colors.textMuted}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
            onSubmitEditing={() => sendMessage(input)}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
            onPress={() => sendMessage(input)}
            disabled={!input.trim() || loading}
          >
            <Ionicons name="send" size={18} color={input.trim() && !loading ? '#ffffff' : theme.colors.textMuted} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  messageList: { padding: 16, paddingBottom: 8 },
  messageBubble: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
  userBubble: { justifyContent: 'flex-end' },
  aiBubble: { justifyContent: 'flex-start' },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.accentGlow,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 2,
  },
  messageContent: { maxWidth: '78%', borderRadius: 16, padding: 12, paddingHorizontal: 16 },
  userContent: { backgroundColor: theme.colors.accent, borderBottomRightRadius: 4, marginLeft: 'auto' },
  aiContent: { backgroundColor: theme.colors.surface, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: theme.colors.border },
  messageText: { color: theme.colors.text, fontSize: 15, lineHeight: 22 },
  userText: { color: '#ffffff' },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  typingText: { color: theme.colors.textMuted, fontSize: 13 },
  suggestions: { marginBottom: 16 },
  suggestionsTitle: { color: theme.colors.textMuted, fontSize: 13, fontWeight: '600', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  suggestionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  suggestionText: { color: theme.colors.textSecondary, fontSize: 14, flex: 1 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    paddingBottom: 8,
    gap: 8,
    borderTopWidth: 0.5,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.bg,
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: theme.colors.text,
    fontSize: 15,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: theme.colors.surface },
});
