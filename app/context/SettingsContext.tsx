import React, { createContext, useContext, useState, useEffect } from 'react';
import { getSetting } from '../constants/Storage';

interface SettingsContextType {
    theme: string;
    language: string;
    refreshSettings: () => void;
}

const SettingsContext = createContext<SettingsContextType>({
    theme: 'light',
    language: 'zh',
    refreshSettings: () => { },
});

export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
    const [theme, setTheme] = useState('light');
    const [language, setLanguage] = useState('zh');
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    useEffect(() => {
        const loadSettings = async () => {
            const savedTheme = await getSetting('theme');
            if (savedTheme) {
                setTheme(savedTheme);
            }

            const savedLanguage = await getSetting('language');
            if (savedLanguage) {
                setLanguage(savedLanguage);
            }
        };

        loadSettings();
    }, [refreshTrigger]);

    const refreshSettings = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    return (
        <SettingsContext.Provider value={{ theme, language, refreshSettings }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => useContext(SettingsContext); 