/**
 * Mock permissions hook — returns can() that always grants all inventory actions.
 * Replace with a real store-backed implementation when the auth module is built.
 */
export function useCan() {
  return (_permission: string): boolean => true;
}
