import React, { useState, useCallback } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, KeyboardAvoidingView, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Link, router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function SignupScreen() {
  const { signup, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isValid = email.trim().length > 0 && password.length >= 6;

  const onSubmit = useCallback(async () => {
    if (isSubmitting || !isValid) return;
    setIsSubmitting(true);
    try {
      await signup(email.trim(), password);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // After successful sign up, go to login screen
      router.replace('/login');
    } catch {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, isValid, email, password, signup]);

  const handlePasswordSubmit = useCallback(() => {
    if (isValid) {
      onSubmit();
    }
  }, [isValid, onSubmit]);

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Text style={styles.title}>Create an account</Text>
      <View style={styles.form}>
        <TextInput 
          value={email} 
          onChangeText={setEmail} 
          placeholder="Email" 
          autoCapitalize="none" 
          autoCorrect={false}
          keyboardType="email-address"
          style={styles.input}
          returnKeyType="next"
          blurOnSubmit={false}
        />
        <TextInput 
          value={password} 
          onChangeText={setPassword} 
          placeholder="Password (min 6 characters)" 
          secureTextEntry 
          style={styles.input}
          returnKeyType="done"
          onSubmitEditing={handlePasswordSubmit}
          blurOnSubmit={true}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable 
          style={({ pressed }) => [
            styles.btn, 
            !isValid && styles.btnDisabled,
            pressed && isValid && styles.pressed
          ]} 
          onPress={onSubmit}
          disabled={!isValid || isSubmitting}
        >
          <Text style={[styles.btnText, !isValid && styles.btnTextDisabled]}>
            {isSubmitting ? 'Signing up…' : 'Sign Up'}
          </Text>
        </Pressable>
        <View style={styles.row}>
          <Text>Already have an account? </Text>
          <Link href="/login" asChild>
            <Pressable><Text style={styles.link}>Log In</Text></Pressable>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  form: { gap: 12 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  btn: { backgroundColor: '#10b981', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 4 },
  btnDisabled: { backgroundColor: '#9ca3af' },
  btnText: { color: 'white', fontSize: 16, fontWeight: '600' },
  btnTextDisabled: { color: '#e5e7eb' },
  pressed: { opacity: 0.85 },
  row: { flexDirection: 'row', justifyContent: 'center', marginTop: 12 },
  link: { color: '#3b82f6' },
  error: { color: '#ef4444', textAlign: 'center' },
});


