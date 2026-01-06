import React, { createContext, ReactNode, useContext, useState } from 'react';

interface AlarmContextType {
  isAlarmPlaying: boolean;
  setIsAlarmPlaying: (playing: boolean) => void;
}

const AlarmContext = createContext<AlarmContextType | undefined>(undefined);

export const AlarmProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [isAlarmPlaying, setIsAlarmPlaying] = useState(false);

  return (
    <AlarmContext.Provider value={{ isAlarmPlaying, setIsAlarmPlaying }}>
      {children}
    </AlarmContext.Provider>
  );
};

export const useAlarm = () => {
  const context = useContext(AlarmContext);
  if (context === undefined) {
    throw new Error('useAlarm must be used within an AlarmProvider');
  }
  return context;
};

