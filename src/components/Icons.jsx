import React from 'react';

// --- Icons Map (Lucide to FontAwesome) ---
    const IconComponent = ({ name, className = "", title }) => <i className={`fa-solid fa-${name} ${className}`} title={title}></i>;
    const Plus = (p) => <IconComponent name="plus" {...p} />;
    const Trash2 = (p) => <IconComponent name="trash-can" {...p} />;
    const Database = (p) => <IconComponent name="database" {...p} />;
    const Code = (p) => <IconComponent name="code" {...p} />;
    const X = (p) => <IconComponent name="xmark" {...p} />;
    const Key = (p) => <IconComponent name="key" {...p} />;
    const LinkIcon = (p) => <IconComponent name="link" {...p} />;
    const Download = (p) => <IconComponent name="download" {...p} />;
    const Settings = (p) => <IconComponent name="gear" {...p} />;
    const GripHorizontal = (p) => <IconComponent name="grip-lines" {...p} />;
    const Workflow = (p) => <IconComponent name="diagram-project" {...p} />;
    const ChevronDown = (p) => <IconComponent name="chevron-down" {...p} />;
    const ChevronUp = (p) => <IconComponent name="chevron-up" {...p} />;
    const FunctionSquare = (p) => <IconComponent name="square-root-variable" {...p} />;
    const HelpCircle = (p) => <IconComponent name="circle-question" {...p} />;
    const BookOpen = (p) => <IconComponent name="book-open" {...p} />;
    const KeyRound = (p) => <IconComponent name="key" {...p} />; 
    const Save = (p) => <IconComponent name="floppy-disk" {...p} />;
    const Cloud = (p) => <IconComponent name="cloud" {...p} />;
    const Loader2 = ({className, ...p}) => <IconComponent name="spinner" className={`${className || ''} fa-spin`} {...p} />;
    const FolderOpen = (p) => <IconComponent name="folder-open" {...p} />;
    const FilePlus = (p) => <IconComponent name="file-circle-plus" {...p} />;
    const FileUp = (p) => <IconComponent name="file-arrow-up" {...p} />;
    const FileDown = (p) => <IconComponent name="file-arrow-down" {...p} />;
    const ArrowRightCircle = (p) => <IconComponent name="circle-arrow-right" {...p} />;
    const Grid = (p) => <IconComponent name="table-cells" {...p} />;
    const AlertTriangle = (p) => <IconComponent name="triangle-exclamation" {...p} />;
    const FileText = (p) => <IconComponent name="file-lines" {...p} />;
    const Eye = (p) => <IconComponent name="eye" {...p} />;
    const EyeOff = (p) => <IconComponent name="eye-slash" {...p} />;
    const Move = (p) => <IconComponent name="arrows-up-down-left-right" {...p} />;

export {
  IconComponent as Icon,
  Plus,
  Trash2,
  Database,
  Code,
  X,
  Key,
  LinkIcon,
  Download,
  Settings,
  GripHorizontal,
  Workflow,
  ChevronDown,
  ChevronUp,
  FunctionSquare,
  HelpCircle,
  BookOpen,
  KeyRound,
  Save,
  Cloud,
  Loader2,
  FolderOpen,
  FilePlus,
  FileUp,
  FileDown,
  ArrowRightCircle,
  Grid,
  AlertTriangle,
  FileText,
  Eye,
  EyeOff,
  Move
};
