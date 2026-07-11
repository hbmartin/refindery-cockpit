import {
  ActivityIcon,
  BoxesIcon,
  CpuIcon,
  FileTextIcon,
  FlaskConicalIcon,
  KeyRoundIcon,
  ListChecksIcon,
  type LucideIcon,
  NetworkIcon,
  SlidersHorizontalIcon,
} from 'lucide-react';

export type NavItem = {
  /** Alert-lens id, matches `Alert.lens`. */
  id: string;
  label: string;
  to: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: NavItem[] = [
  { id: 'pulse', label: 'Pulse', to: '/', icon: ActivityIcon },
  { id: 'jobs', label: 'Jobs', to: '/jobs', icon: ListChecksIcon },
  { id: 'search', label: 'Search Lab', to: '/search', icon: FlaskConicalIcon },
  { id: 'clusters', label: 'Clusters', to: '/clusters', icon: BoxesIcon },
  { id: 'entities', label: 'Entities', to: '/entities', icon: NetworkIcon },
  { id: 'models', label: 'Models', to: '/models', icon: CpuIcon },
  { id: 'pages', label: 'Pages', to: '/pages', icon: FileTextIcon },
  { id: 'system', label: 'System', to: '/system', icon: SlidersHorizontalIcon },
  { id: 'settings', label: 'Settings', to: '/settings', icon: KeyRoundIcon },
];
