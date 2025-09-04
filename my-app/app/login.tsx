import React, { useState, useCallback } from 'react';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, TextInput, View, KeyboardAvoidingView, Platform } from 'react-native';
import { Link, router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/AuthContext';
import { IconSymbol } from '@/components/ui/IconSymbol';

export default function LoginScreen() {
  const { login, error } = useAuth();
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isValid = userName.trim().length > 0 && password.length > 0;

  const onSubmit = useCallback(async () => {
    if (isSubmitting || !isValid) return;
    setIsSubmitting(true);
    try {
      await login(userName.trim(), password);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Navigate to home after successful login
      router.replace('/');
    } catch {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, isValid, userName, password, login]);

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
      <View style={styles.logoWrap}>
        <Image source={require('@/assets/images/icon.png')} style={styles.logo} contentFit="contain" />
        <Text style={styles.appName}>Daily</Text>
      </View>
      <View style={styles.form}>
        <View style={styles.inputWrap}>
          <IconSymbol name="person" size={18} color="#6b7280" />
          <TextInput
            value={userName}
            onChangeText={setUserName}
            placeholder="Username or Email"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
            returnKeyType="next"
            blurOnSubmit={false}
          />
        </View>
        <View style={styles.inputWrap}>
          <IconSymbol name="lock" size={18} color="#6b7280" />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            secureTextEntry
            style={styles.input}
            returnKeyType="done"
            onSubmitEditing={handlePasswordSubmit}
            blurOnSubmit={true}
          />
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable 
          style={({ pressed }) => [
            styles.loginBtn, 
            !isValid && styles.loginBtnDisabled,
            pressed && isValid && styles.pressed
          ]} 
          onPress={onSubmit}
          disabled={!isValid || isSubmitting}
        >
          <Text style={[styles.loginText, !isValid && styles.loginTextDisabled]}>
            {isSubmitting ? 'Logging in…' : 'Login'}
          </Text>
        </Pressable>
        <View style={styles.linksRow}>
          <Link href="/signup" asChild>
            <Pressable><Text style={styles.link}>Sign Up</Text></Pressable>
          </Link>
          <Pressable><Text style={styles.link}>Forgot Password?</Text></Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: 'center' },
  logoWrap: { alignItems: 'center', marginBottom: 24 },
  logo: { width: 72, height: 72, borderRadius: 16 },
  appName: { marginTop: 12, fontSize: 24, fontWeight: '600' },
  form: { gap: 8 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#ccc', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  input: { flex: 1, fontSize: 16 },
  loginBtn: { backgroundColor: '#3b82f6', paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  loginBtnDisabled: { backgroundColor: '#9ca3af' },
  loginText: { color: 'white', fontSize: 16, fontWeight: '600' },
  loginTextDisabled: { color: '#e5e7eb' },
  pressed: { opacity: 0.85 },
  linksRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  link: { color: '#3b82f6' },
  error: { color: '#ef4444', textAlign: 'center' },
});


