import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { useEffect } from 'react';

import { spacing } from '@/constants/spacing';
import { GameTile } from '@/components/GameTile';
import { TileState } from '@/types/game';

type Row = { letter: string; state: TileState }[];

export function GameBoard({
  rows,
  activeRowIndex,
  invalidSignal = 0,
  successRowIndex,
  successSignal = 0,
}: {
  rows: Row[];
  activeRowIndex: number;
  invalidSignal?: number;
  successRowIndex?: number;
  successSignal?: number;
}) {
  const { width } = useWindowDimensions();
  const tileSize = Math.min(58, Math.floor((width - 76) / 5));
  const shake = useSharedValue(0);

  useEffect(() => {
    if (invalidSignal > 0) {
      shake.value = withSequence(
        withTiming(-8, { duration: 45 }),
        withTiming(8, { duration: 70 }),
        withTiming(-5, { duration: 60 }),
        withTiming(0, { duration: 45 })
      );
    }
  }, [invalidSignal, shake]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }],
  }));

  return (
    <View style={styles.board}>
      {rows.map((row, rowIndex) => {
        const content = (
          <View style={styles.row}>
            {row.map((tile, colIndex) => (
              <GameTile
                key={`${rowIndex}-${colIndex}`}
                letter={tile.letter}
                state={tile.state}
                size={tileSize}
                revealDelay={colIndex * 90}
                active={rowIndex === activeRowIndex}
                successDelay={successRowIndex === rowIndex ? 470 + colIndex * 24 : undefined}
                successSignal={successRowIndex === rowIndex ? successSignal : 0}
              />
            ))}
          </View>
        );
        return rowIndex === activeRowIndex ? (
          <Animated.View key={rowIndex} style={animatedStyle}>
            {content}
          </Animated.View>
        ) : (
          <View key={rowIndex}>{content}</View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    gap: 7,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.xs + 1,
  },
});
