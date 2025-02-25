import React, { createContext, useContext, useState, useEffect } from 'react';
import { getSetting } from '../constants/Storage';

interface SettingsContextType {
    currency: string;
    refreshSettings: () => void;
}

const SettingsContext = createContext<SettingsContextType>({
    currency: '¥',
    refreshSettings: () => { },
});

export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
    const [currency, setCurrency] = useState('¥');
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    useEffect(() => {
        const loadCurrency = async () => {
            const savedCurrency = await getSetting('currency');
            if (savedCurrency) {
                setCurrency(savedCurrency);
            }
        };

        loadCurrency();
    }, [refreshTrigger]);

    const refreshSettings = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    return (
        <SettingsContext.Provider value={{ currency, refreshSettings }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => useContext(SettingsContext); 