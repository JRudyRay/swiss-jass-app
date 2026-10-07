import React from 'react';
import Icon from '../Icon';
import { useDialog } from './useDialog';

type Props = {
  title: string;
  closeLabel: string;
  onClose: () => void;
  returnFocusRef: React.RefObject<HTMLElement>;
  className?: string;
  children: React.ReactNode;
};

// Modal sheet (overlay + panel + title + close button). Mount it only while it is open.
const Sheet: React.FC<Props> = ({
  title,
  closeLabel,
  onClose,
  returnFocusRef,
  className,
  children,
}) => {
  const { sheetRef, closeRef, titleId, close, onKeyDown } = useDialog(onClose, returnFocusRef);
  return (
    <div className="sheet-overlay" onClick={close}>
      <div
        ref={sheetRef}
        className={`sheet${className ? ` ${className}` : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <div className="sheet__head">
          <h2 id={titleId} className="sheet__title">
            {title}
          </h2>
          <button
            ref={closeRef}
            type="button"
            className="sheet__close"
            aria-label={closeLabel}
            onClick={close}
          >
            <Icon name="close" size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

export default Sheet;
