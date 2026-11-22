import React from 'react';
import { CheckCircle, Clock } from 'lucide-react';
import { Badge, type BadgeSize, type BadgeVariant } from './Badge';

export type QualityStatusState = 'ready' | 'waiting';
export type QualityStatusFormat = 'short' | 'full';

export interface QualityStatusConfig {
  variant: BadgeVariant;
  label: Record<QualityStatusFormat, string>;
  icon: React.ComponentType<{ size: number; className?: string }>;
}

export const QUALITY_STATUS_CONFIG: Record<QualityStatusState, QualityStatusConfig> = {
  ready: {
    variant: 'emerald',
    label: {
      short: 'Ready',
      full: 'Ready',
    },
    icon: CheckCircle,
  },
  waiting: {
    variant: 'amber',
    label: {
      short: 'Waiting',
      full: 'Waiting for Release',
    },
    icon: Clock,
  },
};

export interface QualityStatusBadgeProps {
  status?: QualityStatusState;
  isReady?: boolean;
  size?: BadgeSize;
  className?: string;
  format?: QualityStatusFormat;
}

export const QualityStatusBadge: React.FC<QualityStatusBadgeProps> = ({
  status,
  isReady,
  size = 'xs',
  className,
  format = 'full',
}) => {
  const resolvedStatus: QualityStatusState = status ?? (isReady ? 'ready' : 'waiting');
  const config = QUALITY_STATUS_CONFIG[resolvedStatus];
  const IconComponent = config.icon;
  const iconSize = size === 'xs' ? 11 : 12;

  return (
    <Badge
      variant={config.variant}
      size={size}
      icon={<IconComponent size={iconSize} className="shrink-0" />}
      className={className}
    >
      {config.label[format]}
    </Badge>
  );
};
