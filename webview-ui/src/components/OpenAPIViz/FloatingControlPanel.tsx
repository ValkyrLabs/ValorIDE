import React from 'react';

interface FloatingControlPanelProps {
  description?: string;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

const FloatingControlPanel: React.FC<FloatingControlPanelProps> = ({
  description,
  className,
  style,
  children,
}) => {
  return (
    <div className={className} style={style} role="region" aria-label={description}>
      {children}
    </div>
  );
};

export default FloatingControlPanel;