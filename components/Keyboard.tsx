import { StyleSheet, View } from 'react-native';

import { KeyboardKey } from '@/components/KeyboardKey';
import { spacing } from '@/constants/spacing';
import { KeyboardState } from '@/types/game';

const rows = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

export function Keyboard({
  states,
  onLetter,
  onEnter,
  onBackspace,
}: {
  states: KeyboardState;
  onLetter: (letter: string) => void;
  onEnter: () => void;
  onBackspace: () => void;
}) {
  return (
    <View style={styles.keyboard}>
      <View style={styles.row}>
        {rows[0].split('').map((letter) => (
          <KeyboardKey key={letter} label={letter} state={states[letter]} onPress={() => onLetter(letter)} />
        ))}
      </View>
      <View style={[styles.row, styles.middleRow]}>
        {rows[1].split('').map((letter) => (
          <KeyboardKey key={letter} label={letter} state={states[letter]} onPress={() => onLetter(letter)} />
        ))}
      </View>
      <View style={styles.row}>
        <KeyboardKey label="ENTER" wide onPress={onEnter} />
        {rows[2].split('').map((letter) => (
          <KeyboardKey key={letter} label={letter} state={states[letter]} onPress={() => onLetter(letter)} />
        ))}
        <KeyboardKey label="BACK" wide onPress={onBackspace} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  keyboard: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 4,
  },
  middleRow: {
    paddingHorizontal: spacing.md,
  },
});
