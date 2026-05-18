import React from 'react';
import { View, TextInput, StyleSheet, Text, ViewStyle, TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface InputProps extends TextInputProps {
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  containerStyle?: ViewStyle;
}

export const Input: React.FC<InputProps> = ({ label, icon, containerStyle, style, ...props }) => {
  return (
    <View style={[styles.section, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputContainer, props.multiline ? styles.textAreaContainer : null]}>
        {icon && <Ionicons name={icon} size={20} color="#767575" style={{ marginRight: 10 }} />}
        <TextInput
          style={[styles.input, props.multiline ? styles.textArea : null, style]}
          placeholderTextColor="#767575"
          {...props}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  label: {
    color: '#adaaaa',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#484847',
    paddingHorizontal: 16,
    minHeight: 56,
  },
  textAreaContainer: {
    alignItems: 'flex-start',
    paddingVertical: 16,
  },
  input: {
    flex: 1,
    color: '#ffffff',
    fontSize: 16,
  },
  textArea: {
    height: 100,
  },
});
