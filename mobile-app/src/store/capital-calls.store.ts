import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CapitalCall {
  id: string;
  fund: string;
  amount: number;
  dueDate: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXTENSION_REQUESTED';
  documentUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface CapitalCallsState {
  capitalCalls: CapitalCall[];
  addCapitalCall: (call: CapitalCall) => void;
  updateCapitalCall: (id: string, updates: Partial<CapitalCall>) => void;
  setCapitalCalls: (calls: CapitalCall[]) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
}

export const useCapitalCallsStore = create<CapitalCallsState>()(
  persist(
    (set) => ({
      capitalCalls: [],
      addCapitalCall: (call) =>
        set((state) => ({
          capitalCalls: [call, ...state.capitalCalls],
        })),
      updateCapitalCall: (id, updates) =>
        set((state) => ({
          capitalCalls: state.capitalCalls.map((call) =>
            call.id === id ? { ...call, ...updates } : call
          ),
        })),
      setCapitalCalls: (capitalCalls) => set({ capitalCalls }),
      loading: false,
      setLoading: (loading) => set({ loading }),
      error: null,
      setError: (error) => set({ error }),
    }),
    {
      name: 'capital-calls-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
