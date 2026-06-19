import React from 'react';

interface IconProps extends React.HTMLAttributes<HTMLElement> {
    className?: string;
    title?: string;
}

interface MainIconProps extends IconProps {
    name: string;
}

// --- Icons Map (Lucide to FontAwesome) ---
export const Icon: React.FC<MainIconProps> = ({ name, className = "", title, ...props }) => (
    <i className={`fa-solid fa-${name} ${className}`} title={title} {...props}></i>
);

export const Plus: React.FC<IconProps> = (p) => <Icon name="plus" {...p} />;
export const Trash2: React.FC<IconProps> = (p) => <Icon name="trash-can" {...p} />;
export const Database: React.FC<IconProps> = (p) => <Icon name="database" {...p} />;
export const Code: React.FC<IconProps> = (p) => <Icon name="code" {...p} />;
export const X: React.FC<IconProps> = (p) => <Icon name="xmark" {...p} />;
export const Key: React.FC<IconProps> = (p) => <Icon name="key" {...p} />;
export const LinkIcon: React.FC<IconProps> = (p) => <Icon name="link" {...p} />;
export const Download: React.FC<IconProps> = (p) => <Icon name="download" {...p} />;
export const Settings: React.FC<IconProps> = (p) => <Icon name="gear" {...p} />;
export const GripHorizontal: React.FC<IconProps> = (p) => <Icon name="grip-lines" {...p} />;
export const Workflow: React.FC<IconProps> = (p) => <Icon name="diagram-project" {...p} />;
export const ChevronDown: React.FC<IconProps> = (p) => <Icon name="chevron-down" {...p} />;
export const ChevronUp: React.FC<IconProps> = (p) => <Icon name="chevron-up" {...p} />;
export const FunctionSquare: React.FC<IconProps> = (p) => <Icon name="square-root-variable" {...p} />;
export const HelpCircle: React.FC<IconProps> = (p) => <Icon name="circle-question" {...p} />;
export const BookOpen: React.FC<IconProps> = (p) => <Icon name="book-open" {...p} />;
export const KeyRound: React.FC<IconProps> = (p) => <Icon name="key" {...p} />; 
export const Save: React.FC<IconProps> = (p) => <Icon name="floppy-disk" {...p} />;
export const Cloud: React.FC<IconProps> = (p) => <Icon name="cloud" {...p} />;
export const Loader2: React.FC<IconProps> = ({className, ...p}) => <Icon name="spinner" className={`${className || ''} fa-spin`} {...p} />;
export const FolderOpen: React.FC<IconProps> = (p) => <Icon name="folder-open" {...p} />;
export const FilePlus: React.FC<IconProps> = (p) => <Icon name="file-circle-plus" {...p} />;
export const FileUp: React.FC<IconProps> = (p) => <Icon name="file-arrow-up" {...p} />;
export const FileDown: React.FC<IconProps> = (p) => <Icon name="file-arrow-down" {...p} />;
export const ArrowRightCircle: React.FC<IconProps> = (p) => <Icon name="circle-arrow-right" {...p} />;
export const Grid: React.FC<IconProps> = (p) => <Icon name="table-cells" {...p} />;
export const AlertTriangle: React.FC<IconProps> = (p) => <Icon name="triangle-exclamation" {...p} />;
export const FileText: React.FC<IconProps> = (p) => <Icon name="file-lines" {...p} />;
export const Eye: React.FC<IconProps> = (p) => <Icon name="eye" {...p} />;
export const EyeOff: React.FC<IconProps> = (p) => <Icon name="eye-slash" {...p} />;
export const Move: React.FC<IconProps> = (p) => <Icon name="arrows-up-down-left-right" {...p} />;
