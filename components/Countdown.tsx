import { useEffect, useState } from 'react';
import { Text, TextStyle } from 'react-native';

import { useTheme } from '@/contexts/ThemeContext';
import { formatCountdown, getNextMidnight } from '@/utils/date';

export function Countdown({ style }: { style?: TextStyle }) {
  const { colors } = useTheme();
  const [remaining, setRemaining] = useState(() => getNextMidnight().getTime() - Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(getNextMidnight().getTime() - Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return <Text style={[{ color: colors.secondaryText }, style]}>Next word in {formatCountdown(remaining)}</Text>;
}
