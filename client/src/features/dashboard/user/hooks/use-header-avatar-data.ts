import { useMemo } from 'react';
import { useAuthStore } from '@/stores/auth.store';

interface HeaderAvatarData {
  avatarUrl: string | null;
  displayName: string;
  initials: string;
}

const getInitials = (value: string): string => {
  const words = value
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return 'U';
  }

  if (words.length === 1) {
    return words[0].slice(0, 1).toUpperCase();
  }

  return `${words[0].slice(0, 1)}${words[1].slice(0, 1)}`.toUpperCase();
};

const useHeaderAvatarData = (): HeaderAvatarData => {
  const fullName = useAuthStore((state) => state.user?.fullName ?? '');
  const email = useAuthStore((state) => state.user?.email ?? '');
  const avatarUrl = useAuthStore((state) => state.user?.avatarUrl ?? null);

  return useMemo(() => {
    const displayName = fullName.trim() || email.trim() || 'User';

    return {
      avatarUrl,
      displayName,
      initials: getInitials(displayName),
    };
  }, [avatarUrl, email, fullName]);
};

export { useHeaderAvatarData };
export default useHeaderAvatarData;
