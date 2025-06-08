import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Theme } from '../constants/Theme';

interface EmptyStateProps {
    icon: string;
    title: string;
    description: string;
}

const EmptyState = ({ icon, title, description }: EmptyStateProps) => (
    <View style={styles.container}>
        <View style={styles.iconContainer}>
            <LinearGradient
                colors={[Theme.colors.primaryAlpha, Theme.colors.backgroundSecondary]}
                style={styles.iconBackground}
            >
                <Ionicons name={icon as any} size={48} color={Theme.colors.primary} />
            </LinearGradient>
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: Theme.spacing.xxxl,
    },
    iconContainer: {
        marginBottom: Theme.spacing.xl,
    },
    iconBackground: {
        width: 96,
        height: 96,
        borderRadius: 48,
        alignItems: 'center',
        justifyContent: 'center',
        ...Theme.shadows.small,
    },
    title: {
        fontSize: Theme.typography.fontSize.xxl,
        fontWeight: Theme.typography.fontWeight.semibold,
        color: Theme.colors.textPrimary,
        marginBottom: Theme.spacing.sm,
        textAlign: 'center',
    },
    description: {
        fontSize: Theme.typography.fontSize.lg,
        color: Theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: Theme.typography.lineHeight.relaxed * Theme.typography.fontSize.lg,
    },
});

export default EmptyState; 