// app/(auth)/dietitians.tsx
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { MainLayout } from '@/layouts/MainLayout';
import { UserService } from '@/services/userService';
import { User } from '@/types/user';

// Define expertise areas and diet approaches
const EXPERTISE_AREAS = [
  "Clinical Nutrition",
  "Sports Nutrition",
  "Pediatric Nutrition",
  "Renal Diets",
  "Weight Management",
  "Eating Disorders",
  "Diabetic Nutrition",
  "Geriatric Nutrition",
  "Oncology Nutrition"
];

const DIET_APPROACHES = [
  "Ketogenic",
  "Mediterranean",
  "Vegan / Plant-Based",
  "Low FODMAP",
  "Intermittent Fasting",
  "Gluten-Free"
];

export default function Dietitians() {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dietitians, setDietitians] = useState<User[]>([]);
  const { theme } = useTheme();
  const [showChatModal, setShowChatModal] = useState(false);
  const [selectedDietitian, setSelectedDietitian] = useState<User | null>(null);
  const [message, setMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<{text: string, sender: 'user' | 'dietitian', timestamp: Date}[]>([]);
  const [waitingForDietitian, setWaitingForDietitian] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      loadDietitians();
    }
  }, [user?.uid]);

  const loadDietitians = async () => {
    try {
      setLoading(true);
      console.log('👨‍⚕️ Loading dietitians...');
      const dietitiansData = await UserService.getDietitians();
      console.log('✅ Loaded dietitians:', dietitiansData.length);
      
      // Add random expertise and diet approaches for demo purposes
      // In a real app, these would come from the database
      const enhancedDietitians = dietitiansData.map(dietitian => {
        // Random selection of expertise areas (2-5 items)
        const expertiseCount = 2 + Math.floor(Math.random() * 4);
        const shuffledExpertise = [...EXPERTISE_AREAS].sort(() => 0.5 - Math.random());
        const expertise = shuffledExpertise.slice(0, expertiseCount);
        
        // Random selection of diet approaches (1-4 items)
        const approachesCount = 1 + Math.floor(Math.random() * 4);
        const shuffledApproaches = [...DIET_APPROACHES].sort(() => 0.5 - Math.random());
        const dietApproaches = shuffledApproaches.slice(0, approachesCount);
        
        return {
          ...dietitian,
          expertise,
          dietApproaches
        };
      });
      
      setDietitians(enhancedDietitians);
    } catch (error) {
      console.error('❌ Error loading dietitians:', error);
      Alert.alert('Error', 'Failed to load dietitians');
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (route: string) => {
    console.log('Navigating to:', route);
    switch (route) {
      case 'dashboard':
        router.push('/(auth)/dashboard');
        break;
      case 'nutrition':
        router.push('/(auth)/nutrition');
        break;
      case 'workouts':
        router.push('/(auth)/workouts');
        break;
      case 'sleep':
        router.push('/(auth)/sleep');
        break;
      case 'hydration':
        router.push('/(auth)/hydration');
        break;
      case 'dietitians':
        // Already on dietitians page
        break;
      case 'settings':
        router.push('/(auth)/settings');
        break;
      default:
        console.log('Unknown route:', route);
        Alert.alert('Navigation Error', `Route "${route}" not found`);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    }
  };

  const openChat = (dietitian: User) => {
    setSelectedDietitian(dietitian);
    setChatMessages([]);
    setShowChatModal(true);
    // Simulate waiting for dietitian to join
    setWaitingForDietitian(true);
    
    // In a real app, this would create a chat session in Firebase
    // and listen for the dietitian to join
    console.log(`Starting chat with dietitian: ${dietitian.id}`);
    
    // For demo purposes, simulate dietitian joining after 3 seconds
    setTimeout(() => {
      setWaitingForDietitian(false);
      // Add welcome message from dietitian
      const dietitianName = dietitian.displayName || dietitian.profile?.name || 'Dietitian';
      setChatMessages([
        {
          text: `Hello! I'm ${dietitianName}. How can I help you today?`,
          sender: 'dietitian',
          timestamp: new Date()
        }
      ]);
    }, 3000);
  };

  const sendMessage = () => {
    if (!message.trim()) return;
    
    // Add user message to chat
    const newMessage = {
      text: message.trim(),
      sender: 'user' as const,
      timestamp: new Date()
    };
    
    setChatMessages(prev => [...prev, newMessage]);
    setMessage('');
    
    // In a real app, this would send the message to Firebase
    console.log('Sending message:', newMessage);
    
    // For demo purposes, simulate dietitian response after 1-2 seconds
    setTimeout(() => {
      const dietitianResponses = [
        "That's a great question. Let me help you with that.",
        "I understand your concern. Here's what I recommend...",
        "Based on your health goals, I would suggest focusing on...",
        "Let's work together to create a nutrition plan that works for you.",
        "I'd be happy to provide more information about that."
      ];
      
      const randomResponse = dietitianResponses[Math.floor(Math.random() * dietitianResponses.length)];
      
      setChatMessages(prev => [
        ...prev, 
        {
          text: randomResponse,
          sender: 'dietitian',
          timestamp: new Date()
        }
      ]);
    }, 1000 + Math.random() * 1000);
  };

  const closeChat = () => {
    setShowChatModal(false);
    setSelectedDietitian(null);
    setMessage('');
    setChatMessages([]);
    
    // In a real app, this would update the chat session status in Firebase
    console.log('Closing chat session');
  };

  const renderTag = (text: string, type: 'expertise' | 'diet') => {
    const colors = {
      expertise: {
        bg: theme.mode === 'dark' ? '#1E3A8A' : '#DBEAFE',
        text: theme.mode === 'dark' ? '#93C5FD' : '#1E40AF'
      },
      diet: {
        bg: theme.mode === 'dark' ? '#064E3B' : '#DCFCE7',
        text: theme.mode === 'dark' ? '#6EE7B7' : '#047857'
      }
    };
    
    return (
      <View key={text} style={[styles.tag, { backgroundColor: colors[type].bg }]}>
        <ThemedText style={[styles.tagText, { color: colors[type].text }]}>{text}</ThemedText>
      </View>
    );
  };

  const getProfilePhoto = (item: User) => {
    // First check if there's a profile_photo in the profile
    if (item.profile && item.profile.profile_photo) {
      return item.profile.profile_photo;
    }
    
    // Fall back to photoURL if profile_photo doesn't exist
    if (item.photoURL) {
      return item.photoURL;
    }
    
    // Return null if no photo is available
    return null;
  };

  const renderDietitian = ({ item }: { item: User }) => {
    const profilePhoto = getProfilePhoto(item);
    const areasOfExpertise = item.profile?.areasOfExpertise || [];
    const dietApproaches = item.profile?.dietApproaches || [];
    
    return (
      <ThemedView style={[styles.card, { backgroundColor: theme.mode === 'dark' ? '#1F2937' : '#FFFFFF' }]}>
        <View style={styles.cardHeader}>
          {profilePhoto ? (
            <Image source={{ uri: profilePhoto }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: theme.mode === 'dark' ? '#4B5563' : '#D1D5DB' }]}>
              <IconSymbol name="person.fill" size={24} color={theme.mode === 'dark' ? '#E5E7EB' : '#6B7280'} />
            </View>
          )}
          <View style={styles.cardHeaderText}>
            <ThemedText type="subtitle" style={{ color: theme.text }}>
              {item.displayName || item.profile?.name || 'Dietitian'}
            </ThemedText>
            <ThemedText style={[styles.email, { color: theme.mode === 'dark' ? '#D1D5DB' : '#6B7280' }]}>
              {item.email}
            </ThemedText>
          </View>
        </View>
        
        <ThemedView style={[styles.divider, { backgroundColor: theme.mode === 'dark' ? '#374151' : '#E5E7EB' }]} />
        
        <View style={styles.cardDetails}>
          <View style={styles.sectionContainer}>
            <ThemedText type="defaultSemiBold" style={[styles.sectionTitle, { color: theme.mode === 'dark' ? '#93C5FD' : '#2563EB' }]}>
              Areas of Expertise
            </ThemedText>
            {areasOfExpertise.length > 0 ? (
              <View style={styles.tagsContainer}>
                {areasOfExpertise.map(area => renderTag(area, 'expertise'))}
              </View>
            ) : (
              <ThemedText style={[styles.noDataText, { color: theme.mode === 'dark' ? '#9CA3AF' : '#6B7280' }]}>
                No expertise areas specified
              </ThemedText>
            )}
          </View>
          
          <View style={styles.sectionContainer}>
            <ThemedText type="defaultSemiBold" style={[styles.sectionTitle, { color: theme.mode === 'dark' ? '#6EE7B7' : '#059669' }]}>
              Diet Approaches
            </ThemedText>
            {dietApproaches.length > 0 ? (
              <View style={styles.tagsContainer}>
                {dietApproaches.map(approach => renderTag(approach, 'diet'))}
              </View>
            ) : (
              <ThemedText style={[styles.noDataText, { color: theme.mode === 'dark' ? '#9CA3AF' : '#6B7280' }]}>
                No diet approaches specified
              </ThemedText>
            )}
          </View>
          
          <TouchableOpacity 
            style={[styles.chatButton, { backgroundColor: theme.mode === 'dark' ? '#047857' : '#10B981' }]}
            onPress={() => openChat(item)}
          >
            <IconSymbol name="chat.bubble.text.fill" size={18} color="#FFFFFF" />
            <ThemedText style={styles.chatButtonText}>Chat Now</ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    );
  };

  const renderChatMessage = (message: {text: string, sender: 'user' | 'dietitian', timestamp: Date}, index: number) => {
    const isUser = message.sender === 'user';
    return (
      <View 
        key={index} 
        style={[
          styles.messageContainer, 
          isUser ? styles.userMessageContainer : styles.dietitianMessageContainer
        ]}
      >
        <View 
          style={[
            styles.messageBubble, 
            isUser 
              ? { backgroundColor: theme.mode === 'dark' ? '#075985' : '#3B82F6' } 
              : { backgroundColor: theme.mode === 'dark' ? '#065F46' : '#10B981' }
          ]}
        >
          <ThemedText style={styles.messageText}>{message.text}</ThemedText>
        </View>
        <ThemedText style={styles.messageTime}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </ThemedText>
      </View>
    );
  };

  const renderChatModal = () => (
    <Modal
      visible={showChatModal}
      animationType="slide"
      transparent={true}
      onRequestClose={closeChat}
    >
      <View style={[styles.modalContainer, { backgroundColor: theme.mode === 'dark' ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.5)' }]}>
        <View style={[styles.chatContainer, { backgroundColor: theme.mode === 'dark' ? '#111827' : '#FFFFFF' }]}>
          {/* Chat Header */}
          <View style={[styles.chatHeader, { backgroundColor: theme.mode === 'dark' ? '#1F2937' : '#F3F4F6' }]}>
            {selectedDietitian && (
              <View style={styles.chatHeaderContent}>
                <View style={styles.chatHeaderLeft}>
                  {getProfilePhoto(selectedDietitian) ? (
                    <Image source={{ uri: getProfilePhoto(selectedDietitian) }} style={styles.chatAvatar} />
                  ) : (
                    <View style={[styles.chatAvatarPlaceholder, { backgroundColor: theme.mode === 'dark' ? '#4B5563' : '#D1D5DB' }]}>
                      <IconSymbol name="person.fill" size={16} color={theme.mode === 'dark' ? '#E5E7EB' : '#6B7280'} />
                    </View>
                  )}
                  <View>
                    <ThemedText style={[styles.chatHeaderName, { color: theme.text }]}>
                      {selectedDietitian.displayName || selectedDietitian.profile?.name || 'Dietitian'}
                    </ThemedText>
                    <ThemedText style={[styles.chatHeaderStatus, { color: waitingForDietitian ? '#F59E0B' : '#10B981' }]}>
                      {waitingForDietitian ? 'Waiting to join...' : 'Online'}
                    </ThemedText>
                  </View>
                </View>
                <TouchableOpacity onPress={closeChat} style={styles.closeButton}>
                  <IconSymbol name="xmark" size={20} color={theme.mode === 'dark' ? '#D1D5DB' : '#6B7280'} />
                </TouchableOpacity>
              </View>
            )}
          </View>
          
          {/* Chat Messages */}
          <View style={styles.chatMessages}>
            {waitingForDietitian ? (
              <View style={styles.waitingContainer}>
                <ActivityIndicator size="large" color="#10B981" />
                <ThemedText style={[styles.waitingText, { color: theme.text }]}>
                  Waiting for dietitian to join...
                </ThemedText>
              </View>
            ) : chatMessages.length === 0 ? (
              <View style={styles.emptyChatContainer}>
                <IconSymbol name="chat.bubble.text" size={48} color={theme.mode === 'dark' ? '#4B5563' : '#D1D5DB'} />
                <ThemedText style={[styles.emptyChatText, { color: theme.mode === 'dark' ? '#9CA3AF' : '#6B7280' }]}>
                  Start the conversation by sending a message
                </ThemedText>
              </View>
            ) : (
              chatMessages.map((msg, index) => renderChatMessage(msg, index))
            )}
          </View>
          
          {/* Chat Input */}
          <View style={[styles.chatInputContainer, { backgroundColor: theme.mode === 'dark' ? '#1F2937' : '#F3F4F6' }]}>
            <TextInput
              style={[
                styles.chatInput,
                { 
                  backgroundColor: theme.mode === 'dark' ? '#374151' : '#FFFFFF',
                  color: theme.text,
                  borderColor: theme.mode === 'dark' ? '#4B5563' : '#E5E7EB'
                }
              ]}
              placeholder="Type your message..."
              placeholderTextColor={theme.mode === 'dark' ? '#9CA3AF' : '#9CA3AF'}
              value={message}
              onChangeText={setMessage}
              multiline
              maxLength={500}
              editable={!waitingForDietitian}
            />
            <TouchableOpacity 
              style={[
                styles.sendButton, 
                { 
                  backgroundColor: theme.mode === 'dark' ? '#047857' : '#10B981',
                  opacity: waitingForDietitian || !message.trim() ? 0.5 : 1
                }
              ]}
              onPress={sendMessage}
              disabled={waitingForDietitian || !message.trim()}
            >
              <IconSymbol name="paperplane.fill" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <ProtectedRoute>
      <MainLayout 
        title="Dietitians" 
        activeRoute="dietitians"
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        user={{
          name: user?.displayName || '',
          email: user?.email || '',
          photoURL: user?.photoURL || '',
        }}
      >
        <View style={[styles.container, { backgroundColor: theme.background }]}>
          <ThemedText type="title" style={[styles.pageTitle, { color: theme.text }]}>
            Dietitians
          </ThemedText>
          <ThemedText style={[styles.description, { color: theme.mode === 'dark' ? '#D1D5DB' : '#6B7280' }]}>
            All registered dietitians in the system
          </ThemedText>
          
          {loading ? (
            <ActivityIndicator size="large" color={theme.mode === 'dark' ? '#93C5FD' : '#3B82F6'} style={styles.loader} />
          ) : dietitians.length > 0 ? (
            <FlatList
              data={dietitians}
              renderItem={renderDietitian}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <ThemedView style={[styles.emptyState, { backgroundColor: theme.mode === 'dark' ? '#1F2937' : '#F9FAFB' }]}>
              <IconSymbol name="person.slash" size={48} color={theme.mode === 'dark' ? '#9CA3AF' : '#6B7280'} />
              <ThemedText style={[styles.emptyText, { color: theme.mode === 'dark' ? '#D1D5DB' : '#6B7280' }]}>
                No dietitians found
              </ThemedText>
              <TouchableOpacity 
                style={[styles.refreshButton, { backgroundColor: theme.mode === 'dark' ? '#2563EB' : '#3B82F6' }]} 
                onPress={loadDietitians}
              >
                <ThemedText style={styles.refreshText}>Refresh</ThemedText>
              </TouchableOpacity>
            </ThemedView>
          )}
          
          {renderChatModal()}
        </View>
      </MainLayout>
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  pageTitle: {
    marginBottom: 8,
    fontSize: 24,
    fontWeight: '700',
  },
  description: {
    marginBottom: 16,
    fontSize: 16,
  },
  loader: {
    marginVertical: 32,
  },
  listContainer: {
    paddingBottom: 20,
    gap: 16,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: '#10B981',
  },
  avatarPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#10B981',
  },
  cardHeaderText: {
    marginLeft: 16,
    flex: 1,
  },
  email: {
    fontSize: 14,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  cardDetails: {
    gap: 20,
  },
  sectionContainer: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '500',
  },
  noDataText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  emptyText: {
    fontSize: 16,
  },
  refreshButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  refreshText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  chatButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatContainer: {
    width: '90%',
    height: '80%',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  chatHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  chatHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chatHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  chatAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#10B981',
  },
  chatAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#10B981',
  },
  chatHeaderName: {
    fontSize: 16,
    fontWeight: '600',
  },
  chatHeaderStatus: {
    fontSize: 12,
  },
  closeButton: {
    padding: 8,
  },
  chatMessages: {
    flex: 1,
    padding: 16,
  },
  waitingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  waitingText: {
    fontSize: 16,
  },
  emptyChatContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  emptyChatText: {
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  messageContainer: {
    marginBottom: 16,
    maxWidth: '80%',
  },
  userMessageContainer: {
    alignSelf: 'flex-end',
  },
  dietitianMessageContainer: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
  },
  messageText: {
    color: '#FFFFFF',
    fontSize: 15,
  },
  messageTime: {
    fontSize: 12,
    marginTop: 4,
    opacity: 0.7,
    alignSelf: 'flex-end',
  },
  chatInputContainer: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'center',
    gap: 8,
  },
  chatInput: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    padding: 12,
    maxHeight: 100,
    fontSize: 15,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
});