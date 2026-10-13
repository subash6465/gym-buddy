import { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '@/lib/theme';
import { useReduceMotion } from '@/lib/motion';

export default function PickerDialog({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const reduced = useReduceMotion();
  return <Modal transparent visible animationType={reduced === false ? 'fade' : 'none'} onRequestClose={onClose}>
    <SafeAreaView style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.78)' }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 16 }}>
          <View accessibilityViewIsModal style={{ width: '100%', maxWidth: 420, borderRadius: 26, padding: 20, gap: 18, backgroundColor: '#131519', borderWidth: 1, borderColor: theme.heroLine, overflow: 'hidden' }}>
            <LinearGradient pointerEvents="none" colors={[theme.glow, 'transparent']} style={StyleSheet.absoluteFill} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><Text accessibilityRole="header" style={{ flex: 1, color: theme.accent, fontFamily: theme.font, fontSize: 18 }}>{title}</Text><Pressable accessibilityRole="button" accessibilityLabel="Cancel picker" onPress={onClose} style={{ minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: theme.muted, fontSize: 14 }}>Cancel</Text></Pressable></View>
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </Modal>;
}
