'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  BoardSizeLabel,
  DEFAULT_BOARD_SIZE,
  isBoardSizeLabel,
  layoutUuidForSize,
} from '@/lib/board-sizes';

const STORAGE_KEY = 'kilter-board-size';

interface BoardContextType {
  /** The physical board the user owns / has selected. */
  boardSize: BoardSizeLabel;
  /** product_layout_uuid for the selected board, used for LED resolution. */
  layoutUuid: string;
  setBoardSize: (size: BoardSizeLabel) => void;
}

const BoardContext = createContext<BoardContextType | undefined>(undefined);

export function BoardProvider({ children }: { children: ReactNode }) {
  const [boardSize, setBoardSizeState] = useState<BoardSizeLabel>(DEFAULT_BOARD_SIZE);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored && isBoardSizeLabel(stored)) {
        setBoardSizeState(stored);
      }
    } catch {
      // localStorage unavailable (e.g. private mode) — keep default.
    }
  }, []);

  const setBoardSize = useCallback((size: BoardSizeLabel) => {
    setBoardSizeState(size);
    try {
      window.localStorage.setItem(STORAGE_KEY, size);
    } catch {
      // ignore persistence failure
    }
  }, []);

  return (
    <BoardContext.Provider
      value={{ boardSize, layoutUuid: layoutUuidForSize(boardSize), setBoardSize }}
    >
      {children}
    </BoardContext.Provider>
  );
}

export function useBoard(): BoardContextType {
  const context = useContext(BoardContext);
  if (!context) {
    throw new Error('useBoard must be used within BoardProvider');
  }
  return context;
}
