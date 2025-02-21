import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface EmptyStateProps {
    icon: string;
    title: string;
    description: string;
}

const EmptyState = ({ icon, title, description }: EmptyStateProps) => (
    <View style={styles.container}>
        <Ionicons name={icon as any} size={64} color="#ccc" />
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: '#666',
        marginTop: 16,
        marginBottom: 8,
    },
    description: {
        fontSize: 14,
        color: '#999',
        textAlign: 'center',
    },
});

export default EmptyState; 