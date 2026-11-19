import { create } from 'zustand'

interface UiState { pickerOpen: boolean; openPicker: () => void; closePicker: () => void }
export const useUi = create<UiState>((set) => ({ pickerOpen: false, openPicker: () => set({ pickerOpen: true }), closePicker: () => set({ pickerOpen: false }) }))
